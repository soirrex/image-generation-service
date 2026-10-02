import { injectable, inject } from "inversify";
import { KafkaConfig } from "../config/kafka.config.js";
import { LoggerService } from "./logger.service.js";
import { EnvConfig } from "../config/env.config.js";
import { Consumer } from "kafkajs";
import { ImagesRepository } from "../repositories/images.repository.js";

@injectable()
export class KafkaConsumerService {
  private readonly consumer: Consumer;
  private started = false;

  constructor(
    @inject(KafkaConfig) private readonly kafkaConfig: KafkaConfig,
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(EnvConfig) private readonly envConfig: EnvConfig,
    @inject(ImagesRepository) private imagesRepository: ImagesRepository,
  ) {
    this.consumer = this.kafkaConfig.getKafka().consumer({
      groupId: this.envConfig.getOrThrow("KAFKA_GROUP_ID"),
    });

    this.consumer.on("consumer.connect", () => {
      this.logger.info("Kafka consumer connected");
    });

    this.consumer.on("consumer.disconnect", () => {
      this.logger.info("Kafka consumer disconnected");
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
          const key = message.key?.toString() ?? null;
          const value = message.value?.toString() ?? null;

          this.logger.info("Kafka message received", {
            topic,
            partition,
            offset: message.offset,
            key,
            value,
          });

          if (!key) {
            this.logger.error("No key");
            return;
          }

          let bigintKey: bigint;

          try {
            bigintKey = BigInt(key);
          } catch {
            this.logger.error("Key is not a valid bigint");
            return;
          }

          let json;

          try {
            json = JSON.parse(value!);
          } catch {
            await this.imagesRepository.updateToGeneratedById(
              bigintKey,
              null,
              "Failed to generation image",
            );
            this.logger.error("Invalid json in kafka consumer");
            return;
          }

          if (json.error) {
            await this.imagesRepository.updateToGeneratedById(BigInt(json.id), null, json.error);
          } else {
            await this.imagesRepository.updateToGeneratedById(BigInt(json.id), json.image_url);
          }
        },
      });
    } catch (error) {
      this.started = false;

      this.logger.error("Kafka consumer failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
