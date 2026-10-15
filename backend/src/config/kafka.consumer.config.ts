import { inject, injectable } from "inversify";
import { Consumer } from "kafkajs";
import { EnvConfig } from "./env.config.js";
import { KafkaConfig } from "./kafka.config.js";
import { LoggerService } from "../services/logger.service.js";

@injectable()
export class KafkaConsumerConfig {
  private readonly consumer: Consumer;
  private readonly topic: string;
  private started = false;

  constructor(
    @inject(KafkaConfig) kafkaConfig: KafkaConfig,
    @inject(EnvConfig) envConfig: EnvConfig,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.consumer = kafkaConfig.getKafka().consumer({
      groupId: envConfig.getOrThrow("KAFKA_GROUP_ID"),
    });
    this.topic = envConfig.getOrThrow("KAFKA_CONSUMER_TOPIC");

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

  async connectAndSubscribe(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      this.logger.info(`Kafka consumer subscribed to topic: ${this.topic}`);
    } catch (error) {
      this.started = false;
      this.logger.error("Kafka consumer failed during start", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  getTopic(): string {
    return this.topic;
  }
}
