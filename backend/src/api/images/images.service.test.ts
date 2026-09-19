import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { ImagesService } from "./images.service.js";
import { ImagesRepository, Image } from "../../repositories/images.repository.js";
import { KafkaProducerService } from "../../services/kafka.producer.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { BadRequestError, NotFoundError } from "../../common/classes/error.class.js";

describe("ImagesService", () => {
  let service: ImagesService;

  let mockImagesRepository: jest.Mocked<ImagesRepository>;
  let mockKafkaProducer: jest.Mocked<KafkaProducerService>;
  let mockLogger: jest.Mocked<LoggerService>;

  const userId = "user-1";

  const validGenerateBody = {
    name: "Test image",
    prompt: "A beautiful landscape with mountains and a lake",
    width: 512,
    height: 512,
  };

  const mockImage: Image = {
    id: BigInt(1),
    name: "Test image",
    prompt: "A beautiful landscape with mountains and a lake",
    status: "generation",
    width: 512,
    height: 512,
    completedAt: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockImagesRepository = {
      create: jest.fn(),
      removeFromOutbox: jest.fn(),
      getById: jest.fn(),
      getAllByUserId: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<ImagesRepository>;

    mockKafkaProducer = {
      sendImageGenerationRequest: jest.fn(),
    } as unknown as jest.Mocked<KafkaProducerService>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = new ImagesService(
      mockImagesRepository as ImagesRepository,
      mockKafkaProducer as KafkaProducerService,
      mockLogger as LoggerService,
    );
  });

  describe("generate", () => {
    it.each([
      [{}, '"name" is required'],
      [{ prompt: "A beautiful landscape", width: 512, height: 512 }, '"name" is required'],
      [
        { name: "", prompt: "A beautiful landscape", width: 512, height: 512 },
        '"name" is not allowed to be empty',
      ],
      [
        { name: "a".repeat(101), prompt: "A beautiful landscape", width: 512, height: 512 },
        '"name" length must be less than or equal to 100 characters long',
      ],
      [{ name: "Test", width: 512, height: 512 }, '"prompt" is required'],
      [
        { name: "Test", prompt: "short", width: 512, height: 512 },
        '"prompt" length must be at least 10 characters long',
      ],
      [
        { name: "Test", prompt: "a".repeat(1001), width: 512, height: 512 },
        '"prompt" length must be less than or equal to 1000 characters long',
      ],
      [{ name: "Test", prompt: "A beautiful landscape", height: 512 }, '"width" is required'],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 99, height: 512 },
        '"width" must be greater than or equal to 100',
      ],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 1921, height: 512 },
        '"width" must be less than or equal to 1920',
      ],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 512.5, height: 512 },
        '"width" must be an integer',
      ],
      [{ name: "Test", prompt: "A beautiful landscape", width: 512 }, '"height" is required'],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 512, height: 99 },
        '"height" must be greater than or equal to 100',
      ],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 512, height: 1921 },
        '"height" must be less than or equal to 1920',
      ],
      [
        { name: "Test", prompt: "A beautiful landscape", width: 512, height: 512.5 },
        '"height" must be an integer',
      ],
    ])("should throw BadRequestError for invalid body: %s", async (body, message) => {
      await expect(service.generate(userId, body)).rejects.toThrow(new BadRequestError(message));

      expect(mockImagesRepository.create).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendImageGenerationRequest).not.toHaveBeenCalled();
      expect(mockImagesRepository.removeFromOutbox).not.toHaveBeenCalled();
    });

    it("should create image, send kafka message and remove outbox record", async () => {
      mockImagesRepository.create.mockResolvedValue(mockImage);
      mockKafkaProducer.sendImageGenerationRequest.mockResolvedValue(undefined);
      mockImagesRepository.removeFromOutbox.mockResolvedValue(undefined);

      const result = await service.generate(userId, validGenerateBody);

      expect(mockImagesRepository.create).toHaveBeenCalledWith(
        userId,
        validGenerateBody.name,
        validGenerateBody.prompt,
        validGenerateBody.width,
        validGenerateBody.height,
      );
      expect(mockKafkaProducer.sendImageGenerationRequest).toHaveBeenCalledWith(
        mockImage.id.toString(),
        mockImage.name,
        mockImage.prompt,
        validGenerateBody.width,
        validGenerateBody.height,
      );
      expect(mockImagesRepository.removeFromOutbox).toHaveBeenCalledWith(mockImage.id);
      expect(mockLogger.error).not.toHaveBeenCalled();

      expect(result).toEqual({ message: "Image generation started" });
    });

    it("should return success and log error if kafka send fails", async () => {
      mockImagesRepository.create.mockResolvedValue(mockImage);
      mockKafkaProducer.sendImageGenerationRequest.mockRejectedValue(new Error("Kafka is down"));
      mockImagesRepository.removeFromOutbox.mockResolvedValue(undefined);

      const result = await service.generate(userId, validGenerateBody);

      expect(mockImagesRepository.create).toHaveBeenCalled();
      expect(mockKafkaProducer.sendImageGenerationRequest).toHaveBeenCalled();
      expect(mockImagesRepository.removeFromOutbox).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith("Failed to send to Kafka", {
        error: "Kafka is down",
      });

      expect(result).toEqual({ message: "Image generation started" });
    });
  });

  describe("getAll", () => {
    it.each([
      [{ page: 0 }, '"page" must be greater than or equal to 1'],
      [{ limit: 0 }, '"limit" must be greater than or equal to 1'],
      [{ limit: 101 }, '"limit" must be less than or equal to 100'],
      [{ page: 1.5 }, '"page" must be an integer'],
      [{ limit: 10.5 }, '"limit" must be an integer'],
    ])("should throw BadRequestError for invalid query: %s", async (query, message) => {
      await expect(service.getAll(userId, query)).rejects.toThrow(new BadRequestError(message));

      expect(mockImagesRepository.getAllByUserId).not.toHaveBeenCalled();
    });

    it("should apply default pagination for empty query", async () => {
      mockImagesRepository.getAllByUserId.mockResolvedValue({
        images: [],
        currentPage: 1,
        totalPages: 0,
      });

      const result = await service.getAll(userId, {});

      expect(mockImagesRepository.getAllByUserId).toHaveBeenCalledWith(userId, 25, 1);
      expect(result).toEqual({ totalPages: 0, curentPage: 1, images: [] });
    });

    it("should return paginated images with string ids", async () => {
      const images: Image[] = [
        { ...mockImage, id: BigInt(1) },
        { ...mockImage, id: BigInt(2), name: "Second image" },
      ];
      mockImagesRepository.getAllByUserId.mockResolvedValue({
        images,
        currentPage: 2,
        totalPages: 5,
      });

      const result = await service.getAll(userId, { page: 2, limit: 10 });

      expect(mockImagesRepository.getAllByUserId).toHaveBeenCalledWith(userId, 10, 2);
      expect(result).toEqual({
        totalPages: 5,
        curentPage: 2,
        images: [
          { ...images[0], id: "1" },
          { ...images[1], id: "2" },
        ],
      });
    });

    it("should pass through null page/limit as defaults", async () => {
      mockImagesRepository.getAllByUserId.mockResolvedValue({
        images: [],
        currentPage: 1,
        totalPages: 1,
      });

      await service.getAll(userId, { page: null, limit: null });

      expect(mockImagesRepository.getAllByUserId).toHaveBeenCalledWith(userId, 25, 1);
    });
  });

  describe("deleteById", () => {
    it.each(["abc", "", "1.5", "NaN", "--1", "0x11G"])(
      'should throw BadRequestError for invalid imageId "%s"',
      async (imageId) => {
        await expect(service.deleteById(userId, imageId)).rejects.toThrow(
          new BadRequestError('"imageId" must be a valid integer string'),
        );

        expect(mockImagesRepository.getById).not.toHaveBeenCalled();
        expect(mockImagesRepository.deleteById).not.toHaveBeenCalled();
      },
    );

    it("should throw NotFoundError if image does not exist", async () => {
      mockImagesRepository.getById.mockResolvedValue(null);

      await expect(service.deleteById(userId, "1")).rejects.toThrow(
        new NotFoundError("Image not found"),
      );

      expect(mockImagesRepository.getById).toHaveBeenCalledWith(userId, BigInt(1));
      expect(mockImagesRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should delete image and return success message", async () => {
      mockImagesRepository.getById.mockResolvedValue(mockImage);
      mockImagesRepository.deleteById.mockResolvedValue(undefined);

      const result = await service.deleteById(userId, "1");

      expect(mockImagesRepository.getById).toHaveBeenCalledWith(userId, BigInt(1));
      expect(mockImagesRepository.deleteById).toHaveBeenCalledWith(userId, BigInt(1));
      expect(result).toEqual({ message: "Image was deleted successfully" });
    });

    it("should support large bigint ids", async () => {
      const bigId = "9007199254740993123456789";
      mockImagesRepository.getById.mockResolvedValue({ ...mockImage, id: BigInt(bigId) });
      mockImagesRepository.deleteById.mockResolvedValue(undefined);

      const result = await service.deleteById(userId, bigId);

      expect(mockImagesRepository.getById).toHaveBeenCalledWith(userId, BigInt(bigId));
      expect(mockImagesRepository.deleteById).toHaveBeenCalledWith(userId, BigInt(bigId));
      expect(result).toEqual({ message: "Image was deleted successfully" });
    });
  });
});
