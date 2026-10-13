from PIL import Image
import boto3
from io import BytesIO
import os

from .logger import LoggerService


class S3Service:
    def __init__(self, logger: LoggerService):
        self._endpoint_url = os.getenv("AWS_ENDPOINT_URL")
        self._bucket_endpoint_url = os.getenv("BUCKET_ENDPOINT_URL")
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")

        self._bucket_name = os.getenv("S3_BUCKET_NAME")

        if not self._endpoint_url:
            raise ValueError("AWS_ENDPOINT_URL is required in .env")
        if not self._bucket_endpoint_url:
            raise ValueError("BUCKET_ENDPOINT_URL is required in .env")
        if not aws_access_key_id:
            raise ValueError("AWS_ACCESS_KEY_ID is required in .env")
        if not aws_secret_access_key:
            raise ValueError("AWS_SECRET_ACCESS_KEY is required in .env")
        if not self._bucket_name:
            raise ValueError("S3_BUCKET_NAME is required in .env")

        self._s3 = boto3.client(
            "s3",
            endpoint_url=self._endpoint_url,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name="us-east-1",
        )

        self._logger = logger

        self._logger.info(
            "S3 client created", endpoint=self._endpoint_url, bucket=self._bucket_name
        )

    def upload(self, image: Image.Image, name: str) -> str:
        self._logger.debug("Uploading image to S3", name=name, bucket=self._bucket_name)
        try:
            with BytesIO() as buffer:
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA")

                image.save(buffer, format="PNG")
                buffer.seek(0)

                self._s3.upload_fileobj(
                    buffer,
                    self._bucket_name,
                    name,
                    ExtraArgs={
                        "ContentType": "image/png",
                    },
                )
        except Exception:
            message = "Failed to upload image to S3"
            self._logger.error(message, name=name, bucket=self._bucket_name)
            raise Exception(message)

        url = f"{self._bucket_endpoint_url}/{self._bucket_name}/{name}"
        self._logger.info("Image uploaded to S3", name=name, url=url)
        return url
