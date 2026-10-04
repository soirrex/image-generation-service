import { S3Client } from "@aws-sdk/client-s3";
import { inject, injectable } from "inversify";
import { EnvConfig } from "./env.config.js";
import { LoggerService } from "../services/logger.service.js";

@injectable()
export class S3Config {
  s3: S3Client;

  constructor(
    @inject(EnvConfig) private envConfig: EnvConfig,
    @inject(LoggerService) private logger: LoggerService,
  ) {
    this.s3 = new S3Client({
      region: "us-east-1",
      endpoint: this.envConfig.getOrThrow("AWS_ENDPOINT_URL"),
      credentials: {
        accessKeyId: this.envConfig.getOrThrow("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.envConfig.getOrThrow("AWS_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
    });

    this.logger.info("S3 was conected successfully");
  }
}
