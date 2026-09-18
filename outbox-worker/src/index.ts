import cron from "node-cron";
import pg from "pg";
import "dotenv/config";
import { LoggerService } from "./logger.js";
import { KafkaProducer } from "./kafka.js";
import { processOutbox } from "./outbox/outbox.js";

if (!process.env.DATABASE_URL) throw new Error('"DATABASE_URL" is required');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const logger = new LoggerService();
const kafka = new KafkaProducer(logger);

logger.info("Outbox worker started");

cron.schedule("*/30 * * * * *", async () => {
  logger.info("start job");
  try {
    const { total, sent } = await processOutbox(pool, kafka);
    if (total > 0) logger.info(`Outbox: sent ${sent}/${total}`);
  } catch (err) {
    logger.error("Outbox batch failed", { error: String(err) });
  }
});
