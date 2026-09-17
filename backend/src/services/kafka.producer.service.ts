import { inject, injectable } from "inversify";
import { Producer } from "kafkajs";
import { KafkaConfig } from "../config/kafka.config.js";
import { LoggerService } from "./logger.service.js";

export interface ProducerMessage<T = unknown> {
  key?: string;
  value: T;
  headers?: Record<string, string>;
  partition?: number;
}

@injectable()
export class KafkaProducerService {
  private producer: Producer;

  constructor(
    @inject(KafkaConfig) private kafkaConfig: KafkaConfig,
    @inject(LoggerService) private logger: LoggerService,
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

  async sendImageGenerationRequest(
    id: string,
    name: string,
    promt: string,
    width: number,
    height: number,
  ): Promise<void> {
    await this.producer.send({
      topic: "image-generation",
      messages: [
        {
          key: id,
          value: JSON.stringify({ id, name, promt, width, height }),
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
