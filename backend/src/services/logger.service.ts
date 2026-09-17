import { injectable } from "inversify";
import pino, { Logger } from "pino";

@injectable()
export class LoggerService {
  public readonly logger: Logger;

  constructor() {
    const transport = pino.transport({
      targets: [
        {
          target: "pino-pretty",
          options: { colorize: true },
        },
      ],
    });

    this.logger = pino(transport);
  }

  info(msg: string, meta?: Record<string, unknown>) {
    this.logger.info(meta, msg);
  }

  warn(msg: string, meta?: Record<string, unknown>) {
    this.logger.warn(meta, msg);
  }

  error(msg: string, meta?: Record<string, unknown>) {
    this.logger.error(meta, msg);
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    this.logger.debug(meta, msg);
  }
}
