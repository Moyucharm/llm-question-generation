"""
LLM API Routes

Endpoints for direct LLM interaction (testing and simple use cases)
"""

import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.api.deps import CurrentUser, DbSession
from app.services.llm_service import LLMService, get_llm_service
from app.core.llm.base import Message
from app.models.llm_log import LLMScene


router = APIRouter(prefix="/llm", tags=["LLM"])


# ===================================
# Request/Response Schemas
# ===================================

class ChatMessage(BaseModel):
    """Chat message schema"""
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat completion request"""
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    provider: Optional[str] = Field(None, description="LLM provider (deepseek/qwen/glm)")
    temperature: Optional[float] = Field(None, ge=0, le=2, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, ge=1, le=8000, description="Maximum tokens")
    stream: bool = Field(False, description="Enable streaming response")


class SimpleChatRequest(BaseModel):
    """Simple chat request with single prompt"""
    prompt: str = Field(..., description="User prompt")
    system_prompt: Optional[str] = Field(None, description="System prompt")
    provider: Optional[str] = Field(None, description="LLM provider")
    stream: bool = Field(False, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Chat completion response"""
    content: str
    model: str
    provider: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


# ===================================
# API Endpoints
# ===================================

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Send chat completion request to LLM

    Requires authentication. Supports multiple providers.
    """
    if request.stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /llm/chat/stream endpoint for streaming",
        )

    llm_service = get_llm_service(db)

    # Convert to Message objects
    messages = [Message(role=m.role, content=m.content) for m in request.messages]

    # Build kwargs
    kwargs = {}
    if request.temperature is not None:
        kwargs["temperature"] = request.temperature
    if request.max_tokens is not None:
        kwargs["max_tokens"] = request.max_tokens

    try:
        response = await llm_service.chat(
            messages=messages,
            scene=LLMScene.OTHER,
            provider_type=request.provider,
            user_id=current_user.id,
            request_summary=messages[-1].content[:100] if messages else None,
            **kwargs,
        )

        return ChatResponse(
            content=response.content,
            model=response.model,
            provider=response.provider,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            total_tokens=response.total_tokens,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM request failed: {str(e)}",
        )


@router.post("/chat/stream")
async def chat_completion_stream(
    request: ChatRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Send streaming chat completion request to LLM

    Returns Server-Sent Events (SSE) stream.
    Requires authentication.
    """
    llm_service = get_llm_service(db)

    # Convert to Message objects
    messages = [Message(role=m.role, content=m.content) for m in request.messages]

    # Build kwargs
    kwargs = {}
    if request.temperature is not None:
        kwargs["temperature"] = request.temperature
    if request.max_tokens is not None:
        kwargs["max_tokens"] = request.max_tokens

    async def generate():
        try:
            async for chunk in llm_service.chat_stream(
                messages=messages,
                scene=LLMScene.OTHER,
                provider_type=request.provider,
                user_id=current_user.id,
                request_summary=messages[-1].content[:100] if messages else None,
                **kwargs,
            ):
                if chunk.content:
                    data = json.dumps({"content": chunk.content, "done": chunk.is_final})
                    yield f"data: {data}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/simple")
async def simple_chat(
    request: SimpleChatRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Simple chat with single prompt

    Convenience endpoint for simple prompts without message history.
    """
    if request.stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /llm/simple/stream endpoint for streaming",
        )

    llm_service = get_llm_service(db)

    try:
        content = await llm_service.simple_chat(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            scene=LLMScene.OTHER,
            provider_type=request.provider,
            user_id=current_user.id,
        )

        return {"content": content}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM request failed: {str(e)}",
        )


@router.post("/simple/stream")
async def simple_chat_stream(
    request: SimpleChatRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Simple streaming chat with single prompt

    Returns Server-Sent Events (SSE) stream.
    """
    llm_service = get_llm_service(db)

    async def generate():
        try:
            async for content in llm_service.simple_chat_stream(
                prompt=request.prompt,
                system_prompt=request.system_prompt,
                scene=LLMScene.OTHER,
                provider_type=request.provider,
                user_id=current_user.id,
            ):
                if content:
                    data = json.dumps({"content": content})
                    yield f"data: {data}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/providers")
async def list_providers(current_user: CurrentUser):
    """
    List available LLM providers and their configuration status

    Shows which providers have API keys configured.
    """
    from app.config import settings

    providers = {
        "deepseek": {
            "configured": bool(settings.DEEPSEEK_API_KEY),
            "model": settings.DEEPSEEK_MODEL,
            "is_default": settings.LLM_PROVIDER == "deepseek",
        },
        "qwen": {
            "configured": bool(settings.QWEN_API_KEY),
            "model": settings.QWEN_MODEL,
            "is_default": settings.LLM_PROVIDER == "qwen",
        },
        "glm": {
            "configured": bool(settings.GLM_API_KEY),
            "model": settings.GLM_MODEL,
            "is_default": settings.LLM_PROVIDER == "glm",
        },
    }

    return {
        "default_provider": settings.LLM_PROVIDER,
        "providers": providers,
    }
