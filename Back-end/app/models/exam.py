"""
Exam and Attempt Models

Defines the Exam, Attempt, and AttemptAnswer tables
"""

import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, Enum, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.question import Paper, Question
    from app.models.user import User


class ExamStatus(str, enum.Enum):
    """Exam status enumeration"""
    DRAFT = "draft"           # Draft, not published
    PUBLISHED = "published"   # Published, accepting attempts
    CLOSED = "closed"         # Closed, no more attempts


class AttemptStatus(str, enum.Enum):
    """Attempt status enumeration"""
    IN_PROGRESS = "in_progress"  # Currently taking the exam
    SUBMITTED = "submitted"      # Submitted, waiting for grading
    AI_GRADED = "ai_graded"      # AI graded, waiting for teacher review
    GRADED = "graded"            # Final graded by teacher


class Exam(Base, TimestampMixin):
    """
    Exam model

    Represents a published exam instance

    Attributes:
        id: Primary key
        title: Exam title
        paper_id: Foreign key to paper template
        start_time: Exam start time
        end_time: Exam end time
        duration_minutes: Time limit in minutes
        published_by: Foreign key to the teacher who published
        status: Exam status
    """

    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    paper_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("papers.id", ondelete="SET NULL"),
        nullable=True,
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    published_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[ExamStatus] = mapped_column(
        Enum(ExamStatus),
        default=ExamStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Relationships
    paper: Mapped["Paper"] = relationship("Paper", back_populates="exams")
    publisher: Mapped["User"] = relationship("User", foreign_keys=[published_by])
    attempts: Mapped[List["Attempt"]] = relationship(
        "Attempt",
        back_populates="exam",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Exam(id={self.id}, title='{self.title}', status={self.status})>"


class Attempt(Base, TimestampMixin):
    """
    Attempt model

    Represents a student's attempt at an exam

    Attributes:
        id: Primary key
        exam_id: Foreign key to exam
        student_id: Foreign key to student
        started_at: When the attempt started
        submitted_at: When the attempt was submitted
        total_score: Total score achieved (auto-calculated)
        final_score: Final score confirmed by teacher
        status: Attempt status
        is_graded_by_teacher: Whether teacher has reviewed
        graded_at: When teacher graded
        graded_by: Teacher who graded
    """

    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # New fields for grade management
    final_score: Mapped[Optional[float]] = mapped_column(nullable=True)  # Teacher confirmed score
    is_graded_by_teacher: Mapped[bool] = mapped_column(default=False, nullable=False)
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    graded_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
        index=True,
    )

    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="attempts")
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id], back_populates="attempts")
    grader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[graded_by])
    answers: Mapped[List["AttemptAnswer"]] = relationship(
        "AttemptAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Attempt(id={self.id}, student_id={self.student_id}, status={self.status})>"


class AttemptAnswer(Base, TimestampMixin):
    """
    AttemptAnswer model

    Represents a student's answer to a single question

    Attributes:
        id: Primary key
        attempt_id: Foreign key to attempt
        question_id: Foreign key to question
        student_answer: JSON - student's answer
        is_correct: Whether the answer is correct (for objective questions)
        score: Final score (teacher_score if set, else ai_score)
        ai_score: AI grading score
        teacher_score: Teacher grading score (overrides AI)
        feedback: Legacy feedback field
        ai_feedback: AI grading feedback
        teacher_feedback: Teacher grading feedback
        time_spent_seconds: Time spent on this question
    """

    __tablename__ = "attempt_answers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_answer: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Final score
    # AI grading fields
    ai_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Teacher grading fields
    teacher_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    teacher_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Legacy field (kept for compatibility)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_spent_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="answers")
    question: Mapped["Question"] = relationship("Question")

    def __repr__(self) -> str:
        return f"<AttemptAnswer(attempt_id={self.attempt_id}, question_id={self.question_id})>"
