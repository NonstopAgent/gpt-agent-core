import os
from openai import AsyncOpenAI


class ImageGeneratorTool:
    """Generate images using OpenAI's DALL·E API."""

    name = "image"

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        self.client = AsyncOpenAI(api_key=api_key)

    async def __call__(self, prompt: str) -> str:
        """Return an image URL for the given prompt."""
        resp = await self.client.images.generate(prompt=prompt, n=1, size="1024x1024")
        # Response schema: {"data": [{"url": ...}]}
        return resp.data[0].url
