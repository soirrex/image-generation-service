import { injectable, inject } from "inversify";
import { KafkaConfig } from "../config/kafka.config.js";
import { LoggerService } from "./logger.service.js";
import { EnvConfig } from "../config/env.config.js";
import { Consumer } from "kafkajs";
import { ImagesRepository } from "../repositories/images.repository.js";
import { S3ImagesRepository } from "../repositories/s3.images.repository.js";

@injectable()
export class KafkaConsumerService {
  private readonly consumer: Consumer;
  private started = false;

  constructor(
    @inject(KafkaConfig) private readonly kafkaConfig: KafkaConfig,
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(EnvConfig) private readonly envConfig: EnvConfig,
    @inject(ImagesRepository) private readonly imagesRepository: ImagesRepository,
    @inject(S3ImagesRepository) private readonly s3ImageRespository: S3ImagesRepository,
  ) {
    this.consumer = this.kafkaConfig.getKafka().consumer({
      groupId: this.envConfig.getOrThrow("KAFKA_GROUP_ID"),
    });

    this.consumer.on(this.consumer.events.CONNECT, () => {
      this.logger.info("Kafka consumer connected");
    });

    this.consumer.on(this.consumer.events.DISCONNECT, () => {
      this.started = false;
      this.logger.warn("Kafka consumer disconnected");
    });

    this.consumer.on(this.consumer.events.CRASH, (event) => {
      this.started = false;
      this.logger.error("Kafka consumer crashed", {
        error: event.payload.error,
      });
    });
  }

  async consumeImageResults(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    try {
      const topic = this.envConfig.getOrThrow("KAFKA_CONSUMER_TOPIC");

      await this.consumer.connect();
      await this.consumer.subscribe({
        topic,
        fromBeginning: false,
      });

      this.logger.info(`Kafka consumer subscribed to topic: ${topic}`);

      await this.consumer.run({
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

            if (!key || !value) {
              this.logger.error("Missing key or value in Kafka message", {
                key,
                hasValue: !!value,
              });
              return;
            }

            let bigintKey: bigint;
            try {
              bigintKey = BigInt(key);
            } catch {
              this.logger.error("Key is not a valid bigint", { key });
              return;
            }

            let json;
            try {
              json = JSON.parse(value);
            } catch {
              await this.imagesRepository.updateToGeneratedById(
                bigintKey,
                null,
                "Failed to generate image (Internal server error)",
              );
              this.logger.error("Invalid JSON in kafka consumer payload", { key });
              return;
            }

            if (json.id === undefined || json.id === null) {
              await this.imagesRepository.updateToGeneratedById(
                bigintKey,
                null,
                "Failed to generate image (Internal server error)",
              );
              this.logger.error("Payload missing 'id' field", { key, json });
              return;
            }

            let imageId: bigint;
            try {
              imageId = BigInt(json.id);
            } catch {
              await this.imagesRepository.updateToGeneratedById(
                bigintKey,
                null,
                "Failed to generate image (Internal server error)",
              );
              this.logger.error("json.id is not a valid bigint", { id: json.id, key });
              return;
            }

            const image = await this.imagesRepository.getByIdWithoutUserId(imageId);

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
                bigintKey,
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
    } catch (error) {
      this.started = false;
      this.logger.error("Kafka consumer failed during start", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
