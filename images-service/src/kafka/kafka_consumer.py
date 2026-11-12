from kafka import KafkaConsumer
import os
import json
from pydantic import BaseModel, ValidationError
import time

from ..services.redis import RedisService

from ..services.logger import LoggerService
from ..kafka.kafka_producer import KafkaProducerService
from ..services.s3 import S3Service
from ..services.image_generation import ImageGeneration


class MessageData(BaseModel):
    name: str
    prompt: str


class KafkaConsumerService:
    def __init__(
        self,
        logger: LoggerService,
        image_generation: ImageGeneration,
        s3: S3Service,
        kafka_producer: KafkaProducerService,
        redis: RedisService,
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

        self._logger = logger
        self._image_generation = image_generation
        self._s3 = s3
        self._kafka_producer = kafka_producer
        self._redis = redis

        self._logger.info(
            "Kafka consumer created",
            brokers=self._brokers,
            topic=topic,
            group_id=group_id,
        )

    def listen(self):
        self._logger.info("Started listening for messages")
        for message in self._consumer:
            started_at = time.perf_counter()
            self._logger.info(
                "Message received",
                topic=message.topic,
                partition=message.partition,
                offset=message.offset,
                key=message.key,
            )

            raw_value = message.value
            key = message.key

            if not key:
                self._logger.error(
                    "Key is NONE",
                    topic=message.topic,
                    partition=message.partition,
                    offset=message.offset,
                )
                continue

            exist = self._redis.get_idempotency(key)
            if exist == True:
                self._logger.info("This message in kafka already processed", key=key)
                continue

            self._redis.mark_idempotency(key)

            try:
                data = MessageData.model_validate_json(raw_value)

                image = self._image_generation.generate(data.prompt)
                image_url = self._s3.upload(image, f"{key}.png")

                self._kafka_producer.send_image_result(
                    key,
                    {
                        "id": key,
                        "image_url": image_url,
                        "message": "successfully",
                    },
                )
            except ValidationError as e:
                self._logger.error(
                    "Invalid message value",
                    error=e.errors()[0]["msg"],
                    key=message.key,
                    topic=message.topic,
                    partition=message.partition,
                    offset=message.offset,
                    value=raw_value,
                )
                self._kafka_producer.send_image_result(
                    key, {"id": key, "error": "Invalid value"}
                )
                self._redis.delete_idempotency(key)
                continue
            except Exception:
                self._logger.error(
                    "Message processing failed",
                    topic=message.topic,
                    partition=message.partition,
                    offset=message.offset,
                    key=message.key,
                )
                self._kafka_producer.send_image_result(
                    key, {"id": key, "error": "Failed processing"}
                )
                self._redis.delete_idempotency(key)
                continue

            try:
                self._consumer.commit()
            except Exception:
                self._logger.error(
                    "Failed to commit offsets",
                    topic=message.topic,
                    partition=message.partition,
                    offset=message.offset,
                )
                continue

            self._logger.info(
                "Message processed and committed",
                ky=message.key,
                duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
            )
