import { inject, injectable } from "inversify";
import { Producer } from "kafkajs";
import { KafkaConfig } from "../config/kafka.config.js";
import { LoggerService } from "./logger.service.js";
import { EnvConfig } from "../config/env.config.js";

@injectable()
export class KafkaProducerService {
  private producer: Producer;

  constructor(
    @inject(KafkaConfig) private kafkaConfig: KafkaConfig,
    @inject(LoggerService) private logger: LoggerService,
    @inject(EnvConfig) private envConfig: EnvConfig,
  ) {
    this.producer = this.kafkaConfig.getKafka().producer({
      idempotent: true,
      maxInFlightRequests: 5,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 10,
      },
    });

    this.connect();

    this.producer.on("producer.connect", () => {
      this.logger.info("Kafka producer connected");
    });

    this.producer.on("producer.disconnect", () => {
      this.logger.info("Kafka producer disconnected");
    });
  }

  async sendImageGenerationRequest(id: string, name: string, prompt: string): Promise<void> {
    await this.producer.send({
      topic: this.envConfig.getOrThrow("KAFKA_PRODUCER_TOPIC"),
      messages: [
        {
          key: id,
          value: JSON.stringify({ id, name, prompt }),
        },
      ],
    });
  }

  private async connect() {
    this.producer
      .connect()
      .then(() => {
        this.logger.info("Kafka producer successfully connected");
      })
      .catch((err) => {
        this.logger.error("Kafka producer connection failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
  }
}
