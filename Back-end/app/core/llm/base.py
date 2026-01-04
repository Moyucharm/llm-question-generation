"""
LLM Provider Base Class

Abstract base class for all LLM providers
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Optional, List, Dict, Any


@dataclass
class Message:
    """Chat message structure"""
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    """LLM response structure"""
    content: str
    model: str
    provider: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    finish_reason: Optional[str] = None


@dataclass
class StreamChunk:
    """Streaming response chunk"""
    content: str
    is_final: bool = False
    finish_reason: Optional[str] = None


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers

    All LLM providers must implement this interface
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        timeout: int = 60,
    ):
        """
        Initialize LLM provider

        Args:
            api_key: API key for authentication
            base_url: Base URL for API calls
            model: Model name to use
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name (e.g., 'deepseek', 'qwen', 'glm')"""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Send chat completion request

        Args:
            messages: List of chat messages
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            **kwargs: Additional provider-specific parameters

        Returns:
            LLMResponse with generated content
        """
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> AsyncIterator[StreamChunk]:
        """
        Send streaming chat completion request

        Args:
            messages: List of chat messages
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            **kwargs: Additional provider-specific parameters

        Yields:
            StreamChunk with content fragments
        """
        pass

    def _build_messages(self, messages: List[Message]) -> List[Dict[str, str]]:
        """Convert Message objects to API format"""
        return [{"role": m.role, "content": m.content} for m in messages]

    async def simple_chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Simple chat interface for single prompts

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Returns:
            Generated text content
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))

        response = await self.chat(messages)
        return response.content

    async def simple_chat_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """
        Simple streaming chat interface

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Yields:
            Content fragments as strings
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))

        async for chunk in self.chat_stream(messages):
            yield chunk.content
