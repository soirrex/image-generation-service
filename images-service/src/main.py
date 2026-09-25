import asyncio
from dotenv import load_dotenv

from .services.logger import LoggerService
from .kafka.kafka_producer import KafkaProducerService
from .services.s3 import S3Service
from .services.image_generation import ImageGeneration
from .kafka.kafka_consumer import KafkaConsumerService

load_dotenv()


async def main():
    logger = LoggerService()
    image_generation = ImageGeneration(logger)
    s3 = S3Service(logger)
    kafka_producer = KafkaProducerService(logger)
    kafka_consumer = KafkaConsumerService(logger, image_generation, s3, kafka_producer)

    logger.info("All services initialized, starting Kafka consumer")
    kafka_consumer.listen()


if __name__ == "__main__":
    asyncio.run(main())
