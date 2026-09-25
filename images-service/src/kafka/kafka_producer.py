from kafka import KafkaProducer
import json
import os


class KafkaProducerService:
    def __init__(self):
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

    def send_image_result(self, key: str, value: dict):
        future = self._producer.send(
            str(self._topic),
            key=key.encode("utf-8"),
            value=json.dumps(value).encode("utf-8"),
        )

        metadata = future.get(timeout=10)
