import { inject, injectable } from "inversify";
import Joi from "joi";
import { BadRequestError, NotFoundError } from "../../common/classes/error.class.js";
import { ImagesRepository } from "../../repositories/images.repository.js";
import { KafkaProducerService } from "../../services/kafka.producer.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { S3ImagesRepository } from "../../repositories/s3.images.repository.js";

const GenerateImageSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).trim(),
  prompt: Joi.string().required().min(1).max(1000).trim(),
});

const GetAllImagesSchema = Joi.object({
  page: Joi.number().integer().min(1).empty(null).default(1),
  limit: Joi.number().integer().min(1).max(100).empty(null).default(25),
});

@injectable()
export class ImagesService {
  constructor(
    @inject(ImagesRepository) private imagesRepository: ImagesRepository,
    @inject(KafkaProducerService) private kafkaProducer: KafkaProducerService,
    @inject(LoggerService) private logger: LoggerService,
    @inject(S3ImagesRepository) private s3ImageRespository: S3ImagesRepository,
  ) {}

  async generate(userId: string, body: object): Promise<object> {
    const { error, value } = GenerateImageSchema.validate(body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) throw new BadRequestError(error.message);

    const image = await this.imagesRepository.create(userId, value.name, value.prompt);

    try {
      await this.kafkaProducer.sendImageGenerationRequest(
        image.id.toString(),
        image.name,
        image.prompt,
      );

      await this.imagesRepository.removeFromOutbox(image.id);
    } catch (err: unknown) {
      this.logger.error("Failed to send to Kafka", {
        error: (err as Error).message || "Unknown error",
      });
    }

    return {
      message: "Image generation started",
    };
  }

  async getAll(userId: string, query: object): Promise<object> {
    const { error, value } = GetAllImagesSchema.validate(query, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) throw new BadRequestError(error.message);

    const images = await this.imagesRepository.getAllByUserId(userId, value.limit, value.page);

    const result = {
      totalPages: images.totalPages,
      curentPage: images.currentPage,
      images: images.images.map((el) => ({
        ...el,
        id: el.id.toString(),
      })),
    };

    return result;
  }

  async deleteById(userId: string, imageId: string) {
    if (imageId.length < 1) throw new BadRequestError('"imageId" must be a valid integer string');

    let imageIdBigint: bigint;

    try {
      imageIdBigint = BigInt(imageId);
    } catch {
      throw new BadRequestError('"imageId" must be a valid integer string');
    }

    const image = await this.imagesRepository.getById(userId, imageIdBigint);

    if (!image) throw new NotFoundError("Image not found");

    if (image.imageUrl) {
      const imageUrlSplit = image.imageUrl.split("/");
      const imageKey = imageUrlSplit[imageUrlSplit.length - 1];

      await this.s3ImageRespository.deleteImage(imageKey!);
    }

    await this.imagesRepository.deleteById(userId, imageIdBigint);

    return {
      message: "Image was deleted successfully",
    };
  }
}
