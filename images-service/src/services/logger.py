import logging
import os
import sys
from typing import Any


class LoggerService:
    def __init__(self):
        self._logger = logging.getLogger("images-service")
        self._logger.setLevel(logging.DEBUG)

        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)

            formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

            handler.setFormatter(formatter)
            self._logger.addHandler(handler)

        self._logger.propagate = False

    def _prepare_message(
        self,
        message: str,
        fields: dict[str, Any],
    ) -> str:
        if not fields:
            return message

        details = " ".join(f"{key}={value!r}" for key, value in fields.items())

        return f"{message} | {details}"

    def debug(self, message: str, **fields: Any) -> None:
        self._logger.debug(self._prepare_message(message, fields))

    def info(self, message: str, **fields: Any) -> None:
        self._logger.info(self._prepare_message(message, fields))

    def warn(self, message: str, **fields: Any) -> None:
        self._logger.warning(self._prepare_message(message, fields))

    def error(self, message: str, **fields: Any) -> None:
        self._logger.error(self._prepare_message(message, fields))
