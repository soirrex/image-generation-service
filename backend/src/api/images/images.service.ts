import { inject, injectable } from "inversify";
import Joi from "joi";
import { BadRequestError } from "../../common/classes/error.class.js";
import { ImagesRepository } from "../../repositories/images.repository.js";
import { KafkaProducerService } from "../../services/kafka.producer.service.js";

const GenerateImageSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).trim(),
  promt: Joi.string().required().min(10).max(1000).trim(),
  width: Joi.number().required().integer().min(100).max(1920),
  height: Joi.number().required().integer().min(100).max(1920),
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
  ) {}

  async generate(userId: string, body: object): Promise<object> {
    const { error, value } = GenerateImageSchema.validate(body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      throw new BadRequestError(error.message);
    }

    const image = await this.imagesRepository.create(userId, value.name, value.promt);

    await this.kafkaProducer.sendImageGenerationRequest(
      image.id.toString(),
      image.name,
      image.promt,
      value.width,
      value.height,
    );

    return {
      message: "Image generation started",
    };
  }

  async getAll(userId: string, query: object): Promise<object> {
    const { error, value } = GetAllImagesSchema.validate(query, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      throw new BadRequestError(error.message);
    }

    return {
      message: "zxc",
    };
  }
}
