import { injectable, inject } from "inversify";
import { LoggerService } from "./logger.service.js";
import { KafkaConsumerConfig } from "../config/kafka.consumer.config.js";
import { ImagesRepository } from "../repositories/images.repository.js";
import { S3ImagesRepository } from "../repositories/s3.images.repository.js";

@injectable()
export class KafkaConsumerService {
  constructor(
    @inject(KafkaConsumerConfig) private readonly consumerConfig: KafkaConsumerConfig,
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(ImagesRepository) private readonly imagesRepository: ImagesRepository,
    @inject(S3ImagesRepository) private readonly s3ImageRespository: S3ImagesRepository,
  ) {}

  async consumeImageResults(): Promise<void> {
    await this.consumerConfig.connectAndSubscribe();

    const consumer = this.consumerConfig.getConsumer();

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const key = message.key?.toString() ?? null;
          const value = message.value?.toString() ?? null;

          this.logger.info("Kafka message received", {
            topic,
            partition,
            offset: message.offset,
            key,
          });

          if (!key || key.trim() === "") {
            this.logger.error("Missing key in Kafka message", {
              key,
            });
            return;
          }

          let imageId: bigint;
          try {
            imageId = BigInt(key);
          } catch {
            this.logger.error("Key is not a valid bigint", { key });
            return;
          }

          const image = await this.imagesRepository.getByIdWithoutUserId(imageId);

          let json: { image_url?: unknown; error?: unknown };
          try {
            if (!value) throw "error";
            json = JSON.parse(value) as { image_url?: unknown; error?: unknown };
            if (Array.isArray(json)) throw "error";
          } catch {
            if (!image) {
              this.logger.error("Image not found in DB by key", { key });
              return;
            }

            await this.imagesRepository.updateToGeneratedById(
              imageId,
              null,
              "Failed to generate image (Internal server error)",
            );
            this.logger.error("Invalid or empty JSON in kafka consumer payload", { key, value });
            return;
          }

          if (!image) {
            const imageKey = this.extractS3Key(json.image_url);
            if (imageKey) {
              await this.s3ImageRespository.deleteImage(imageKey);
            } else {
              this.logger.warn(
                "Image not found in DB and image_url is missing/invalid in payload",
                { imageId },
              );
            }
            return;
          }

          if (json.error) {
            await this.imagesRepository.updateToGeneratedById(imageId, null, String(json.error));
          } else if (typeof json.image_url === "string" && json.image_url.trim().length > 0) {
            await this.imagesRepository.updateToGeneratedById(imageId, json.image_url);
          } else {
            await this.imagesRepository.updateToGeneratedById(
              imageId,
              null,
              "Failed to generate image (Internal server error)",
            );
            this.logger.error("Successful payload missing valid 'image_url'", { imageId, json });
          }
        } catch (messageError) {
          this.logger.error("Failed to process individual Kafka message", {
            topic,
            partition,
            offset: message.offset,
            error: messageError instanceof Error ? messageError.message : String(messageError),
          });
        }
      },
    });
  }

  private extractS3Key(url?: unknown): string | null {
    if (typeof url !== "string" || !url.trim()) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);
      const key = parsedUrl.pathname.split("/").filter(Boolean).pop();
      return key ?? null;
    } catch {
      const parts = url.split("/").filter(Boolean);
      return parts.pop() ?? null;
    }
  }
}
