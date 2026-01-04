"""
DeepSeek LLM Provider

Implementation for DeepSeek API (OpenAI-compatible)
"""

import json
from typing import AsyncIterator, Optional, List

import httpx

from app.core.llm.base import (
    BaseLLMProvider,
    Message,
    LLMResponse,
    StreamChunk,
)


class DeepSeekProvider(BaseLLMProvider):
    """
    DeepSeek API provider

    Uses OpenAI-compatible API format
    """

    @property
    def provider_name(self) -> str:
        return "deepseek"

    async def chat(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """Send chat completion request to DeepSeek"""

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": self._build_messages(messages),
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
            "stream": False,
            **kwargs,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]
        usage = data.get("usage", {})

        return LLMResponse(
            content=choice["message"]["content"],
            model=data.get("model", self.model),
            provider=self.provider_name,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            finish_reason=choice.get("finish_reason"),
        )

    async def chat_stream(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> AsyncIterator[StreamChunk]:
        """Send streaming chat completion request to DeepSeek"""

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": self._build_messages(messages),
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
            "stream": True,
            **kwargs,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST", url, headers=headers, json=payload
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data_str = line[6:]  # Remove "data: " prefix

                    if data_str == "[DONE]":
                        yield StreamChunk(content="", is_final=True)
                        break

                    try:
                        data = json.loads(data_str)
                        choice = data["choices"][0]
                        delta = choice.get("delta", {})
                        content = delta.get("content", "")
                        finish_reason = choice.get("finish_reason")

                        if content:
                            yield StreamChunk(
                                content=content,
                                is_final=finish_reason is not None,
                                finish_reason=finish_reason,
                            )
                    except json.JSONDecodeError:
                        continue
