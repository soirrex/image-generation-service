from kafka import KafkaConsumer
import os
import json
from pydantic import BaseModel, ValidationError
import uuid

from ..kafka.kafka_producer import KafkaProducerService
from ..services.s3 import S3Service
from ..services.image_generation import ImageGeneration


class MessageData(BaseModel):
    id: str
    name: str
    prompt: str


class KafkaConsumerService:
    def __init__(
        self,
        image_generation: ImageGeneration,
        s3: S3Service,
        kafka_producer: KafkaProducerService,
    ):
        brokers = os.getenv("KAFKA_BROKERS")
        topic = os.getenv("KAFKA_CONSUMER_TOPIC")
        group_id = os.getenv("KAFKA_GROUP_ID")

        if not brokers:
            raise ValueError("KAFKA_BROKERS is required in .env")
        if not topic:
            raise ValueError("KAFKA_CONSUMER_TOPIC is required in .env")
        if not group_id:
            raise ValueError("KAFKA_GROUP_ID is required in .env")

        self._brokers = [
            broker.strip() for broker in brokers.split(",") if broker.strip()
        ]

        self._consumer = KafkaConsumer(
            topic,
            bootstrap_servers=self._brokers,
            group_id=group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            key_deserializer=lambda x: x.decode("utf-8") if x else None,
            value_deserializer=lambda x: x.decode("utf-8") if x else None,
        )

        self._image_generation = image_generation
        self._s3 = s3
        self._kafka_producer = kafka_producer

    def listen(self):
        for message in self._consumer:
            try:
                raw_value = message.value
                data = MessageData.model_validate_json(raw_value)

                image = self._image_generation.generate(data.prompt)
                image_url = self._s3.upload(image, f"{uuid.uuid4()}.png")
                self._kafka_producer.send_image_result(
                    message.key,
                    {"id": data.id, "image_url": image_url, "message": "successfully"},
                )
            except ValidationError as e:
                print(e.errors()[0]["msg"])
                continue
            except Exception as e:
                print(e)
                continue

            self._consumer.commit()
