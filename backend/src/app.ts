import cookieParser from "cookie-parser";
import express, { Application } from "express";
import { inject, injectable, multiInject } from "inversify";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { LoggerService } from "./services/logger.service.js";
import { swaggerSpec } from "./config/swagger.config.js";
import { ErrorMiddleware } from "./middlewares/error.middleware.js";
import { EnvConfig } from "./config/env.config.js";
import { RequestLoggerMiddleware } from "./middlewares/request_logger.middleware.js";
import { ApiControllerBase } from "./common/classes/api_controller.class.js";
import { KafkaConsumerService } from "./services/kafka.consumer.service.js";

@injectable()
export class App {
  private app: Application;

  constructor(
    @inject(EnvConfig) private envConfig: EnvConfig,
    @inject(LoggerService) private logger: LoggerService,
    @inject(ErrorMiddleware) private errorMiddleware: ErrorMiddleware,
    @inject(RequestLoggerMiddleware) private requestLogger: RequestLoggerMiddleware,
    @inject(KafkaConsumerService) private kafkaConsumer: KafkaConsumerService,
    @multiInject(ApiControllerBase) private apiControllers: ApiControllerBase[],
  ) {
    this.app = express();
    this.initMiddlewaresAndRoutes();
  }

  getApp() {
    return this.app;
  }

  private async initMiddlewaresAndRoutes() {
    this.app.use(express.json());
    this.app.use(cookieParser());

    const allowedUrls =
      this.envConfig
        .get("ALLOWED_URLS")
        ?.split(",")
        .map((url) => url.trim())
        .filter(Boolean) ?? [];

    const corsOptions = {
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) return callback(null, true);
        if (allowedUrls.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error("CORS policy: origin not allowed"), false);
      },
      credentials: true,
    };
    this.app.use(cors(corsOptions));
    this.app.use(this.requestLogger.handle);

    if (this.envConfig.get("DEV_MODE") && this.envConfig.get("DEV_MODE") === "true") {
      this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }

    for (const controller of this.apiControllers) {
      this.app.use(controller.baseEndpoint, controller.router);
    }

    this.app.use(this.errorMiddleware.handle);

    await this.kafkaConsumer.consumeImageResults();
  }

  async start(port: number) {
    this.app.listen(port, () => {
      this.logger.info(`Server was running on port: ${port}`);
    });
  }
}
