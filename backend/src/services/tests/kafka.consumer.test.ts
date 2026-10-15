import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { KafkaConsumerService } from "../kafka.consumer.service.js";
import { KafkaConsumerConfig } from "../../config/kafka.consumer.config.js";
import { ImagesRepository, Image } from "../../repositories/images.repository.js";
import { S3ImagesRepository } from "../../repositories/s3.images.repository.js";
import { LoggerService } from "../logger.service.js";

describe("KafkaConsumerService", () => {
  let service: KafkaConsumerService;

  let mockConsumerConfig: jest.Mocked<KafkaConsumerConfig>;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockImagesRepository: jest.Mocked<ImagesRepository>;
  let mockS3ImageRepository: jest.Mocked<S3ImagesRepository>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConsumer: { run: jest.MockedFunction<any> };

  const mockImage: Image = {
    id: BigInt(1),
    name: "Test image",
    prompt: "A beautiful landscape",
    status: "generation",
    completedAt: null,
    imageUrl: null,
    error: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const internalErrorMessage = "Failed to generate image (Internal server error)";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeMessage = (key: string | null, value: string | null): any => ({
    key: key === null ? null : Buffer.from(key),
    value: value === null ? null : Buffer.from(value),
    offset: "0",
  });

  const triggerMessage = async (key: string | null, value: string | null): Promise<void> => {
    await service.consumeImageResults();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eachMessage = (mockConsumer.run as any).mock.calls[0][0].eachMessage;

    await eachMessage({ topic: "test-topic", partition: 0, message: makeMessage(key, value) });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConsumer = {
      run: jest.fn(),
    };

    mockConsumerConfig = {
      connectAndSubscribe: jest.fn(),
      getConsumer: jest.fn(),
    } as unknown as jest.Mocked<KafkaConsumerConfig>;
    mockConsumerConfig.connectAndSubscribe.mockResolvedValue(undefined);
    mockConsumerConfig.getConsumer.mockReturnValue(mockConsumer as never);

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockImagesRepository = {
      getByIdWithoutUserId: jest.fn(),
      updateToGeneratedById: jest.fn(),
    } as unknown as jest.Mocked<ImagesRepository>;

    mockS3ImageRepository = {
      deleteImage: jest.fn(),
    } as unknown as jest.Mocked<S3ImagesRepository>;

    service = new KafkaConsumerService(
      mockConsumerConfig as KafkaConsumerConfig,
      mockLogger as LoggerService,
      mockImagesRepository as ImagesRepository,
      mockS3ImageRepository as S3ImagesRepository,
    );
  });

  describe("consumeImageResults", () => {
    it("should connect, subscribe and run consumer", async () => {
      await service.consumeImageResults();

      expect(mockConsumerConfig.connectAndSubscribe).toHaveBeenCalledTimes(1);
      expect(mockConsumerConfig.getConsumer).toHaveBeenCalledTimes(1);
      expect(mockConsumer.run).toHaveBeenCalledTimes(1);
      expect(mockConsumer.run).toHaveBeenCalledWith({ eachMessage: expect.any(Function) });
    });

    it.each([[null], ["  "], [""]])(
      "should log error and skip if key=%s  is missing",
      async (key) => {
        await triggerMessage(key, JSON.stringify({ id: "1" }));

        expect(mockLogger.error).toHaveBeenCalledWith("Missing key in Kafka message", {
          key,
        });
        expect(mockImagesRepository.getByIdWithoutUserId).not.toHaveBeenCalled();
        expect(mockImagesRepository.updateToGeneratedById).not.toHaveBeenCalled();
        expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
      },
    );

    it.each(["abc", "1.5", "--1", "0x11G"])(
      'should log error and skip if key "%s" is not a valid bigint',
      async (key) => {
        await triggerMessage(key, JSON.stringify({ id: "1" }));

        expect(mockLogger.error).toHaveBeenCalledWith("Key is not a valid bigint", { key });
        expect(mockImagesRepository.getByIdWithoutUserId).not.toHaveBeenCalled();
        expect(mockImagesRepository.updateToGeneratedById).not.toHaveBeenCalled();
        expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
      },
    );

    it.each(["not-json", "[]", ""])(
      'should mark image as failed if payload is not valid JSON: "%s"',
      async (json) => {
        mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(mockImage);

        await triggerMessage("1", json);

        expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));
        expect(mockImagesRepository.updateToGeneratedById).toHaveBeenCalledWith(
          BigInt(1),
          null,
          internalErrorMessage,
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Invalid or empty JSON in kafka consumer payload",
          {
            key: "1",
            value: json,
          },
        );
        expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
      },
    );

    it("should log error and skip if image not found in DB by key and payload is not valid JSON", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(null);

      await triggerMessage("1", "not-json");

      expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));

      expect(mockLogger.error).toHaveBeenCalledWith("Image not found in DB by key", {
        key: "1",
      });
      expect(mockImagesRepository.updateToGeneratedById).not.toHaveBeenCalled();
      expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
    });

    it("should delete S3 object if image not found in DB but payload has image_url", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(null);

      await triggerMessage(
        "1",
        JSON.stringify({ image_url: "https://s3.bucket/folder/subfolder/key.jpg" }),
      );

      expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));
      expect(mockS3ImageRepository.deleteImage).toHaveBeenCalledWith("key.jpg");
      expect(mockImagesRepository.updateToGeneratedById).not.toHaveBeenCalled();
    });

    it.each([[{}], [{ image_url: "" }], [{ image_url: 123 }]])(
      "should log warning and skip S3 delete if image not found and image_url missing/invalid: %s",
      async (payload) => {
        mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(null);

        await triggerMessage("1", JSON.stringify(payload));

        expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));
        expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
        expect(mockImagesRepository.updateToGeneratedById).not.toHaveBeenCalled();
      },
    );

    it("should mark image as failed with payload have error", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(mockImage);
      mockImagesRepository.updateToGeneratedById.mockResolvedValue(undefined);

      await triggerMessage("1", JSON.stringify({ error: "GPU out of memory" }));

      expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));
      expect(mockImagesRepository.updateToGeneratedById).toHaveBeenCalledWith(
        BigInt(1),
        null,
        "GPU out of memory",
      );
      expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
    });

    it("should stringify non-string error from payload", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(mockImage);
      mockImagesRepository.updateToGeneratedById.mockResolvedValue(undefined);

      await triggerMessage("1", JSON.stringify({ id: "1", error: 500 }));

      expect(mockImagesRepository.updateToGeneratedById).toHaveBeenCalledWith(
        BigInt(1),
        null,
        "500",
      );
      expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
    });

    it("should mark image as completed if image_url", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(mockImage);
      mockImagesRepository.updateToGeneratedById.mockResolvedValue(undefined);

      const imageUrl = "https://s3.bucket/key.jpg";
      await triggerMessage("1", JSON.stringify({ id: "1", image_url: imageUrl }));

      expect(mockImagesRepository.getByIdWithoutUserId).toHaveBeenCalledWith(BigInt(1));
      expect(mockImagesRepository.updateToGeneratedById).toHaveBeenCalledWith(BigInt(1), imageUrl);
      expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it.each([[{}], [{ image_url: "" }], [{ image_url: "   " }]])(
      "should mark image as failed if successful payload missing valid image_url: %s",
      async (payload) => {
        mockImagesRepository.getByIdWithoutUserId.mockResolvedValue(mockImage);
        mockImagesRepository.updateToGeneratedById.mockResolvedValue(undefined);

        await triggerMessage("9007199254740993123456789", JSON.stringify(payload));

        expect(mockImagesRepository.updateToGeneratedById).toHaveBeenCalledWith(
          BigInt("9007199254740993123456789"),
          null,
          internalErrorMessage,
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Successful payload missing valid 'image_url'",
          { imageId: BigInt("9007199254740993123456789"), json: payload },
        );
        expect(mockS3ImageRepository.deleteImage).not.toHaveBeenCalled();
      },
    );

    it("should log error if repository throws inside message handler", async () => {
      mockImagesRepository.getByIdWithoutUserId.mockRejectedValue(new Error("DB is down"));

      await triggerMessage("1", JSON.stringify({ id: "1", image_url: "https://s3.bucket/k.jpg" }));

      expect(mockLogger.error).toHaveBeenCalledWith("Failed to process individual Kafka message", {
        topic: "test-topic",
        partition: 0,
        offset: "0",
        error: "DB is down",
      });
    });
  });
});
