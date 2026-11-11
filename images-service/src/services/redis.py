import json
import os
from typing import Any, Optional

from redis import Redis

from .logger import LoggerService

DEFAULT_IDEMPOTENCY_TTL = 24 * 60 * 60


class RedisService:
    def __init__(self, logger: LoggerService):
        self._logger = logger

        REDIS_HOST = os.getenv("REDIS_HOST")
        REDIS_PORT = os.getenv("REDIS_PORT")

        if not REDIS_HOST:
            raise ValueError("REDIS_HOST is required in .env")
        if not REDIS_PORT:
            raise ValueError("REDIS_PORT is required in .env")

        self._redis = Redis(host=str(REDIS_HOST), port=int(REDIS_PORT))

        self._logger.info("Redis client connected")

    def _idempotency_key(self, key: str) -> str:
        return f"images:idempotency:{key}"

    def get_idempotency(self, key: str) -> bool:
        redis_key = self._idempotency_key(key)

        try:
            processed = bool(self._redis.exists(redis_key))
        except Exception:
            self._logger.error("Failed to check idempotency key", key=key)
            raise

        self._logger.debug(
            "Checked idempotency key",
            key=key,
            redis_key=redis_key,
            processed=processed,
        )

        return processed

    def mark_idempotency(self, key: str) -> bool:
        redis_key = self._idempotency_key(key)

        try:
            acquired = bool(self._redis.set(redis_key, "true", ex=86400, nx=True))
        except Exception:
            self._logger.error("Failed to mark idempotency key", key=key)
            raise

        self._logger.debug(
            "Tried to mark idempotency key",
            key=key,
            redis_key=redis_key,
            acquired=acquired,
        )

        return acquired

    def delete_idempotency(self, key: str) -> None:
        redis_key = self._idempotency_key(key)

        try:
            deleted = bool(self._redis.delete(redis_key))
        except Exception:
            self._logger.error("Failed to delete idempotency key", key=key)
            raise

        self._logger.debug(
            "Delete idempotency key",
            key=key,
            redis_key=redis_key,
            deleted=deleted,
        )
