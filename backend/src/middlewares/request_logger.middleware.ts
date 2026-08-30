import { inject, injectable } from "inversify";
import { BaseMiddleware } from "../common/classes/middleware.class.js";
import { Request, Response, NextFunction } from "express";
import { LoggerService } from "../services/logger.service.js";

@injectable()
export class RequestLoggerMiddleware extends BaseMiddleware {
  constructor(@inject(LoggerService) private logger: LoggerService) {
    super();
    this.handle = this.handle.bind(this);
  }

  handle(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on("finish", () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      const meta = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        userId: req.userId,
      };

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message, meta);
      } else if (statusCode >= 400) {
        this.logger.info(message, meta);
      } else {
        this.logger.info(message, meta);
      }
    });

    next();
  }
}
