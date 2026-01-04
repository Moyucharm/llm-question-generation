"""
LLM Service

Unified service for managing LLM providers with logging and error handling
"""

import time
from typing import AsyncIterator, Optional, List, Dict, Any, Type
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.llm.base import (
    BaseLLMProvider,
    Message,
    LLMResponse,
    StreamChunk,
)
from app.core.llm.deepseek import DeepSeekProvider
from app.core.llm.qwen import QwenProvider
from app.core.llm.glm import GLMProvider
from app.models.llm_log import LLMLog, LLMScene, LLMStatus


class ProviderType(str, Enum):
    """Available LLM provider types"""
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    GLM = "glm"


# Provider class mapping
PROVIDER_MAP: Dict[str, Type[BaseLLMProvider]] = {
    ProviderType.DEEPSEEK: DeepSeekProvider,
    ProviderType.QWEN: QwenProvider,
    ProviderType.GLM: GLMProvider,
}


class LLMService:
    """
    LLM Service for unified model access

    Features:
    - Multi-provider support (DeepSeek, Qwen, GLM)
    - Automatic logging to database
    - Error handling and retry logic
    - Streaming support
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        """
        Initialize LLM service

        Args:
            db: Optional database session for logging
        """
        self.db = db
        self._providers: Dict[str, BaseLLMProvider] = {}

    def _get_provider_config(self, provider_type: str) -> Dict[str, Any]:
        """Get configuration for a specific provider"""
        configs = {
            ProviderType.DEEPSEEK: {
                "api_key": settings.DEEPSEEK_API_KEY,
                "base_url": settings.DEEPSEEK_BASE_URL,
                "model": settings.DEEPSEEK_MODEL,
            },
            ProviderType.QWEN: {
                "api_key": settings.QWEN_API_KEY,
                "base_url": settings.QWEN_BASE_URL,
                "model": settings.QWEN_MODEL,
            },
            ProviderType.GLM: {
                "api_key": settings.GLM_API_KEY,
                "base_url": settings.GLM_BASE_URL,
                "model": settings.GLM_MODEL,
            },
        }
        return configs.get(provider_type, {})

    def get_provider(
        self,
        provider_type: Optional[str] = None,
        **override_kwargs,
    ) -> BaseLLMProvider:
        """
        Get or create a provider instance

        Args:
            provider_type: Provider type (defaults to settings.LLM_PROVIDER)
            **override_kwargs: Override default configuration

        Returns:
            Provider instance
        """
        provider_type = provider_type or settings.LLM_PROVIDER

        # Check if provider is already created
        cache_key = f"{provider_type}_{hash(frozenset(override_kwargs.items()))}"
        if cache_key in self._providers:
            return self._providers[cache_key]

        # Get provider class
        provider_class = PROVIDER_MAP.get(provider_type)
        if not provider_class:
            raise ValueError(f"Unknown provider type: {provider_type}")

        # Get configuration
        config = self._get_provider_config(provider_type)
        if not config.get("api_key"):
            raise ValueError(f"API key not configured for provider: {provider_type}")

        # Merge with overrides and common settings
        config.update({
            "temperature": settings.LLM_TEMPERATURE,
            "max_tokens": settings.LLM_MAX_TOKENS,
            "timeout": settings.LLM_TIMEOUT,
        })
        config.update(override_kwargs)

        # Create provider
        provider = provider_class(**config)
        self._providers[cache_key] = provider

        return provider

    async def _log_call(
        self,
        scene: LLMScene,
        provider: BaseLLMProvider,
        status: LLMStatus,
        latency_ms: int,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        error_message: Optional[str] = None,
        request_summary: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> None:
        """Log LLM call to database"""
        if not self.db:
            return

        log = LLMLog(
            user_id=user_id,
            scene=scene,
            model=provider.model,
            provider=provider.provider_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=latency_ms,
            status=status,
            error_message=error_message,
            request_summary=request_summary,
        )

        self.db.add(log)
        await self.db.commit()

    async def chat(
        self,
        messages: List[Message],
        scene: LLMScene = LLMScene.OTHER,
        provider_type: Optional[str] = None,
        user_id: Optional[int] = None,
        request_summary: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Send chat completion request

        Args:
            messages: List of chat messages
            scene: Usage scene for logging
            provider_type: Override default provider
            user_id: User ID for logging
            request_summary: Brief description for logging
            **kwargs: Additional provider parameters

        Returns:
            LLMResponse with generated content
        """
        provider = self.get_provider(provider_type)
        start_time = time.time()

        try:
            response = await provider.chat(messages, **kwargs)
            latency_ms = int((time.time() - start_time) * 1000)

            await self._log_call(
                scene=scene,
                provider=provider,
                status=LLMStatus.SUCCESS,
                latency_ms=latency_ms,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                request_summary=request_summary,
                user_id=user_id,
            )

            return response

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)

            await self._log_call(
                scene=scene,
                provider=provider,
                status=LLMStatus.FAILED,
                latency_ms=latency_ms,
                error_message=str(e),
                request_summary=request_summary,
                user_id=user_id,
            )

            raise

    async def chat_stream(
        self,
        messages: List[Message],
        scene: LLMScene = LLMScene.OTHER,
        provider_type: Optional[str] = None,
        user_id: Optional[int] = None,
        request_summary: Optional[str] = None,
        **kwargs,
    ) -> AsyncIterator[StreamChunk]:
        """
        Send streaming chat completion request

        Args:
            messages: List of chat messages
            scene: Usage scene for logging
            provider_type: Override default provider
            user_id: User ID for logging
            request_summary: Brief description for logging
            **kwargs: Additional provider parameters

        Yields:
            StreamChunk with content fragments
        """
        provider = self.get_provider(provider_type)
        start_time = time.time()
        total_content = ""

        try:
            async for chunk in provider.chat_stream(messages, **kwargs):
                total_content += chunk.content
                yield chunk

            latency_ms = int((time.time() - start_time) * 1000)

            # Log after stream completes
            await self._log_call(
                scene=scene,
                provider=provider,
                status=LLMStatus.SUCCESS,
                latency_ms=latency_ms,
                request_summary=request_summary,
                user_id=user_id,
            )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)

            await self._log_call(
                scene=scene,
                provider=provider,
                status=LLMStatus.FAILED,
                latency_ms=latency_ms,
                error_message=str(e),
                request_summary=request_summary,
                user_id=user_id,
            )

            raise

    async def simple_chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        scene: LLMScene = LLMScene.OTHER,
        provider_type: Optional[str] = None,
        user_id: Optional[int] = None,
        **kwargs,
    ) -> str:
        """
        Simple chat interface

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            scene: Usage scene for logging
            provider_type: Override default provider
            user_id: User ID for logging
            **kwargs: Additional parameters

        Returns:
            Generated text content
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))

        response = await self.chat(
            messages=messages,
            scene=scene,
            provider_type=provider_type,
            user_id=user_id,
            request_summary=prompt[:100] if prompt else None,
            **kwargs,
        )

        return response.content

    async def simple_chat_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        scene: LLMScene = LLMScene.OTHER,
        provider_type: Optional[str] = None,
        user_id: Optional[int] = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        """
        Simple streaming chat interface

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            scene: Usage scene for logging
            provider_type: Override default provider
            user_id: User ID for logging
            **kwargs: Additional parameters

        Yields:
            Content fragments as strings
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))

        async for chunk in self.chat_stream(
            messages=messages,
            scene=scene,
            provider_type=provider_type,
            user_id=user_id,
            request_summary=prompt[:100] if prompt else None,
            **kwargs,
        ):
            yield chunk.content


def get_llm_service(db: Optional[AsyncSession] = None) -> LLMService:
    """
    Factory function to create LLM service

    Args:
        db: Optional database session for logging

    Returns:
        LLMService instance
    """
    return LLMService(db=db)
