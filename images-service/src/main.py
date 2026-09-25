import asyncio
from dotenv import load_dotenv


from .kafka.kafka_producer import KafkaProducerService
from .services.s3 import S3Service
from .services.image_generation import ImageGeneration
from .kafka.kafka_consumer import KafkaConsumerService

load_dotenv()


async def main():
    image_generation = ImageGeneration()
    s3 = S3Service()
    kafka_producer = KafkaProducerService()
    kafka_consumer = KafkaConsumerService(image_generation, s3, kafka_producer)

    kafka_consumer.listen()


if __name__ == "__main__":
    asyncio.run(main())
