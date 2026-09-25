import torch
from PIL import Image
from typing import cast
from diffusers.pipelines.stable_diffusion.pipeline_stable_diffusion import (
    StableDiffusionPipeline,
)
from diffusers.pipelines.stable_diffusion.pipeline_output import (
    StableDiffusionPipelineOutput,
)
import os
import time

from .logger import LoggerService


class ImageGeneration:
    def __init__(self, logger: LoggerService):
        self._logger = logger

        if os.getenv("USE_AI") == "true":
            self._negative_prompt = "painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, skinny, glitchy, double torso, extra arms, extra hands, mangled fingers, missing lips, ugly face, distorted face, extra legs"

            self._logger.info(
                "Loading image generation model",
            )

            started_at = time.perf_counter()

            self._pipeline = StableDiffusionPipeline.from_pretrained(
                "stablediffusionapi/anything-v5",
                torch_dtype=torch.float16,
                use_safetensors=True,
            ).to("cuda")

            self._logger.info(
                "Image generation model loaded",
                duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
            )
        else:
            self._pipeline = None
            self._negative_prompt = None
            self._logger.info("AI disabled, default image will be used")

    def generate(self, prompt: str) -> Image.Image:
        started_at = time.perf_counter()
        self._logger.info("Generating image", prompt=prompt)
        try:
            if os.getenv("USE_AI") == "true" and self._pipeline:
                raw_result = self._pipeline(
                    prompt=prompt,
                    negative_prompt=self._negative_prompt,
                    width=512,
                    height=512,
                    num_inference_steps=25,
                    guidance_scale=5,
                    return_dict=True,
                )

                result = cast(StableDiffusionPipelineOutput, raw_result)
                image = result.images[0]
            else:
                image = Image.open("default_image.png")
        except Exception:
            self._logger.exception("Image generation failed", prompt=prompt)
            raise RuntimeError("Image generation error")

        self._logger.info(
            "Image generated",
            prompt=prompt,
            duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )
        return image
