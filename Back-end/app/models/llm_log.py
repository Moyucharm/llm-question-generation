"""
LLM Log Model

Defines the LLMLog table for tracking LLM API calls
"""

import enum
from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class LLMScene(str, enum.Enum):
    """LLM usage scene enumeration"""
    GENERATE = "generate"     # Question generation
    REVIEW = "review"         # Question review/validation
    GRADE = "grade"           # Answer grading
    OTHER = "other"           # Other uses


class LLMStatus(str, enum.Enum):
    """LLM call status enumeration"""
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"


class LLMLog(Base, TimestampMixin):
    """
    LLMLog model

    Tracks all LLM API calls for monitoring and debugging

    Attributes:
        id: Primary key
        user_id: Foreign key to user who initiated the call
        scene: Usage scene (generate/review/grade)
        model: Model name used
        provider: Provider name (deepseek/qwen/glm)
        prompt_tokens: Number of prompt tokens
        completion_tokens: Number of completion tokens
        latency_ms: Response latency in milliseconds
        status: Call status
        error_message: Error message if failed
        request_summary: Brief summary of the request
    """

    __tablename__ = "llm_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    scene: Mapped[LLMScene] = mapped_column(
        Enum(LLMScene),
        nullable=False,
        index=True,
    )
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[LLMStatus] = mapped_column(
        Enum(LLMStatus),
        nullable=False,
        index=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<LLMLog(id={self.id}, scene={self.scene}, status={self.status})>"
