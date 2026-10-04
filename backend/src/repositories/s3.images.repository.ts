import { inject, injectable } from "inversify";
import { S3Config } from "../config/s3.config.js";
import { EnvConfig } from "../config/env.config.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { LoggerService } from "../services/logger.service.js";

@injectable()
export class S3ImagesRepository {
  private bucket: string;

  constructor(
    @inject(EnvConfig) private envConfig: EnvConfig,
    @inject(S3Config) private s3: S3Config,
    @inject(LoggerService) private logger: LoggerService,
  ) {
    this.bucket = this.envConfig.getOrThrow("S3_BUCKET_NAME");
  }

  async deleteImage(imageKey: string) {
    await this.s3.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: imageKey,
      }),
    );

    this.logger.info(`Delete element from s3 successfully. Key: ${imageKey}`);
  }
}
