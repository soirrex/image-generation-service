import { inject, injectable } from "inversify";
import { Kafka, logLevel } from "kafkajs";
import { EnvConfig } from "./env.config.js";
import { LoggerService } from "../services/logger.service.js";

export const KAFKA_TOPICS = {
  IMAGE_GENERATION: "image.generation.requested",
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

@injectable()
export class KafkaConfig {
  public readonly kafka: Kafka;
  public readonly brokers: string[];
  public readonly clientId: string;

  constructor(
    @inject(EnvConfig) private envConfig: EnvConfig,
    @inject(LoggerService) private logger: LoggerService,
  ) {
    this.brokers = this.envConfig
      .getOrThrow("KAFKA_BROKERS")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    this.clientId = this.envConfig.getOrThrow("KAFKA_CLIENT_ID");

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      logLevel: logLevel.INFO,
      logCreator: this.createLogCreator(),
    });

    this.logger.info(
      `Kafka configured: clientId=${this.clientId}, brokers=${this.brokers.join(",")}`,
    );
  }

  private createLogCreator() {
    return () =>
      ({
        namespace,
        level,
        label,
        log,
      }: {
        namespace: string;
        level: number;
        label: string;
        log: Record<string, unknown>;
      }) => {
        const { message, ...extra } = log as { message?: string; [key: string]: unknown };
        const meta = { namespace, label, ...extra };
        const msg = `[${namespace}] ${message ?? label}`;

        switch (level) {
          case logLevel.ERROR:
            this.logger.error(msg, meta);
            break;
          case logLevel.WARN:
            this.logger.warn(msg, meta);
            break;
          case logLevel.INFO:
            this.logger.info(msg, meta);
            break;
          case logLevel.DEBUG:
            this.logger.debug(msg, meta);
            break;
          default:
            this.logger.info(msg, meta);
            break;
        }
      };
  }

  getKafka(): Kafka {
    return this.kafka;
  }

  getBrokers(): string[] {
    return this.brokers;
  }

  getClientId(): string {
    return this.clientId;
  }
}
