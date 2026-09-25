from kafka import KafkaProducer
import json
import os

from ..services.logger import LoggerService


class KafkaProducerService:
    def __init__(self, logger: LoggerService):
        self._logger = logger

        brokers = os.getenv("KAFKA_BROKERS")
        self._topic = os.getenv("KAFKA_PRODUCER_TOPIC")

        if not brokers:
            raise ValueError("KAFKA_BROKERS is required in .env")
        if not self._topic:
            raise ValueError("KAFKA_PRODUCER_TOPIC is required in .env")

        self._brokers = [
            broker.strip() for broker in brokers.split(",") if broker.strip()
        ]

        self._producer = KafkaProducer(
            bootstrap_servers=self._brokers,
        )
        self._logger.info("Kafka producer created")

    def send_image_result(self, key: str, value: dict):
        self._logger.debug(
            "Sending image result", key=key, topic=self._topic, value=value
        )

        try:
            future = self._producer.send(
                str(self._topic),
                key=key.encode("utf-8"),
                value=json.dumps(value).encode("utf-8"),
            )

            metadata = future.get(timeout=10)
        except Exception:
            self._logger.error(
                "Failed to send image result", key=key, topic=self._topic
            )
            raise

        self._logger.info(
            "Image result sent",
            key=key,
            topic=metadata.topic,
            partition=metadata.partition,
            offset=metadata.offset,
            value=json.dumps(value).encode("utf-8"),
        )
