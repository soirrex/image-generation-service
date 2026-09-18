import { Kafka, logLevel, type Producer } from "kafkajs";
import type { LoggerService } from "./logger.js";

export class KafkaProducer {
  private producer: Producer;
  private TOPIC = "image-generation";

  public readonly kafka: Kafka;
  public readonly brokers: string[];
  public readonly clientId: string;

  private logger: LoggerService;

  constructor(logger: LoggerService) {
    if (!process.env.KAFKA_BROKERS) throw new Error('"KAFKA_BROKERS" is required');
    if (!process.env.KAFKA_CLIENT_ID) throw new Error('"KAFKA_CLIENT_ID" is required');

    this.logger = logger;

    this.brokers = process.env.KAFKA_BROKERS.split(",").map((b) => b.trim());
    this.clientId = process.env.KAFKA_CLIENT_ID;

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      logLevel: logLevel.INFO,
      logCreator: this.createLogCreator(),
    });

    this.logger.info(
      `Kafka configured: clientId=${this.clientId}, brokers=${this.brokers.join(",")}`,
    );

    this.producer = this.kafka.producer({
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

  async send(id: string, value: Record<string, unknown>): Promise<void> {
    await this.producer.send({
      topic: "image-generation",
      messages: [
        {
          key: id,
          value: JSON.stringify(value),
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
        }
      };
  }
}
