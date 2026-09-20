import asyncio
from dotenv import load_dotenv

from .services.image_generation import ImageGeneration
from .kafka.kafka_consumer import KafkaConsumerService

load_dotenv()


async def main():
    image_generation = ImageGeneration()
    kafka_consumer = KafkaConsumerService(image_generation)

    kafka_consumer.listen()


if __name__ == "__main__":
    asyncio.run(main())
