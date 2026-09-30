import { injectable, inject } from "inversify";
import { KafkaConfig } from "../config/kafka.config.js";
import { LoggerService } from "./logger.service.js";
import { EnvConfig } from "../config/env.config.js";
import { Consumer } from "kafkajs";

@injectable()
export class KafkaConsumerService {
  private consumer: Consumer;

  constructor(
    @inject(KafkaConfig) private kafkaConfig: KafkaConfig,
    @inject(LoggerService) private logger: LoggerService,
    @inject(EnvConfig) private envConfig: EnvConfig,
  ) {
    this.consumer = this.kafkaConfig
      .getKafka()
      .consumer({ groupId: this.envConfig.getOrThrow("KAFKA_GROUP_ID") });

    this.connect();

    this.consumer.on("consumer.connect", () => {
      this.logger.info("Kafka producer connected");
    });

    this.consumer.on("consumer.disconnect", () => {
      this.logger.info("Kafka producer disconnected");
    });
  }

  async consumeImageResults() {
    await this.consumer.subscribe({ topic: this.envConfig.getOrThrow("KAFKA_CONSUMER_TOPIC") });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const value = message.value?.toString();
        console.log(key, value);
      },
    });
  }

  private async connect() {
    this.consumer
      .connect()
      .then(() => {
        this.logger.info("Kafka consumer successfully connected");
      })
      .catch((err) => {
        this.logger.error("Kafka consumer connection failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
  }
}
