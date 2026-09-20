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


class ImageGeneration:
    def __init__(self):
        if os.getenv("USE_AI") == "true":
            self._negative_prompt = "painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, skinny, glitchy, double torso, extra arms, extra hands, mangled fingers, missing lips, ugly face, distorted face, extra legs"

            self._pipeline = StableDiffusionPipeline.from_pretrained(
                "stablediffusionapi/anything-v5",
                torch_dtype=torch.float16,
                use_safetensors=True,
                add_watermarker=False,
            ).to("cuda")
        else:
            pass

    def generate(self, prompt: str) -> Image.Image:
        try:
            if os.getenv("USE_AI") == "true":
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
                return result.images[0]
            else:
                return Image.open("default_image.png")
        except Exception as e:
            raise RuntimeError("Image generation error")
