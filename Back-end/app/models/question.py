"""
Question and Paper Models

Defines the Question, Paper, and PaperQuestion tables
"""

import enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course import Course, KnowledgePoint
    from app.models.user import User
    from app.models.exam import Exam


class QuestionType(str, enum.Enum):
    """Question type enumeration"""
    SINGLE_CHOICE = "single"      # Single choice
    MULTIPLE_CHOICE = "multiple"  # Multiple choice
    FILL_BLANK = "blank"          # Fill in the blank
    SHORT_ANSWER = "short"        # Short answer


class QuestionStatus(str, enum.Enum):
    """Question status enumeration"""
    DRAFT = "draft"               # Draft, not reviewed
    APPROVED = "approved"         # Approved for use
    NEEDS_REVIEW = "needs_review" # Needs manual review
    REJECTED = "rejected"         # Rejected


class Question(Base, TimestampMixin):
    """
    Question model

    Represents a single question in the question bank

    Attributes:
        id: Primary key
        type: Question type (single/multiple/blank/short)
        stem: Question text/prompt
        options: JSON array of options (for choice questions)
        answer: JSON - correct answer(s)
        explanation: Answer explanation
        difficulty: Difficulty level (1-5)
        score: Default score for this question
        course_id: Foreign key to course
        knowledge_point_id: Foreign key to knowledge point
        created_by: Foreign key to the creator (teacher)
        status: Question status
    """

    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType),
        nullable=False,
        index=True,
    )
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    answer: Mapped[dict] = mapped_column(JSON, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    course_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,  # 允许进行组卷时不关联课程
    )
    knowledge_point_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("knowledge_points.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[QuestionStatus] = mapped_column(
        Enum(QuestionStatus),
        default=QuestionStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="questions")
    knowledge_point: Mapped[Optional["KnowledgePoint"]] = relationship(
        "KnowledgePoint",
        back_populates="questions",
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    paper_questions: Mapped[List["PaperQuestion"]] = relationship(
        "PaperQuestion",
        back_populates="question",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Question(id={self.id}, type={self.type}, status={self.status})>"


class Paper(Base, TimestampMixin):
    """
    Paper model

    Represents a paper/quiz template that contains multiple questions

    Attributes:
        id: Primary key
        title: Paper title
        description: Paper description
        total_score: Total score of the paper
        course_id: Foreign key to course
        created_by: Foreign key to the creator (teacher)
    """

    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    course_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,  # 允许直接创建试卷不关联课程
    )
    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    course: Mapped["Course"] = relationship("Course")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    paper_questions: Mapped[List["PaperQuestion"]] = relationship(
        "PaperQuestion",
        back_populates="paper",
        cascade="all, delete-orphan",
        order_by="PaperQuestion.order",
    )
    exams: Mapped[List["Exam"]] = relationship(
        "Exam",
        back_populates="paper",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Paper(id={self.id}, title='{self.title}')>"


class PaperQuestion(Base):
    """
    PaperQuestion model

    Association table between Paper and Question with additional fields

    Attributes:
        paper_id: Foreign key to paper
        question_id: Foreign key to question
        score: Score for this question in this paper
        order: Display order in the paper
    """

    __tablename__ = "paper_questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    paper_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    paper: Mapped["Paper"] = relationship("Paper", back_populates="paper_questions")
    question: Mapped["Question"] = relationship("Question", back_populates="paper_questions")

    def __repr__(self) -> str:
        return f"<PaperQuestion(paper_id={self.paper_id}, question_id={self.question_id})>"
