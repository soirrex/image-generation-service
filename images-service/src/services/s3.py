from PIL import Image
import boto3
from io import BytesIO
import os


class S3Service:
    def __init__(self):
        self._endpoint_url = os.getenv("ENDPOINT_URL")
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")

        self._bucket_name = os.getenv("S3_BUCKET_NAME")

        if not self._endpoint_url:
            raise ValueError("ENDPOINT_URL is required in .env")
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

    def upload(self, image: Image.Image, name: str) -> str:
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

        return f"{self._endpoint_url}/{self._bucket_name}/{name}"
