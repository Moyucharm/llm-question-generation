"""
Course and KnowledgePoint Models

Defines the Course and KnowledgePoint tables for organizing content
"""

from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.question import Question


class Course(Base, TimestampMixin):
    """
    Course model

    Represents a course/subject that contains knowledge points and questions

    Attributes:
        id: Primary key
        name: Course name
        description: Course description
        teacher_id: Foreign key to the teacher who created the course
    """

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    teacher: Mapped["User"] = relationship(
        "User",
        back_populates="courses",
        foreign_keys=[teacher_id],
    )
    knowledge_points: Mapped[List["KnowledgePoint"]] = relationship(
        "KnowledgePoint",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    questions: Mapped[List["Question"]] = relationship(
        "Question",
        back_populates="course",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Course(id={self.id}, name='{self.name}')>"


class KnowledgePoint(Base, TimestampMixin):
    """
    KnowledgePoint model

    Represents a knowledge point within a course
    Supports hierarchical structure with parent_id

    Attributes:
        id: Primary key
        name: Knowledge point name
        description: Detailed description
        chapter: Chapter name/number
        course_id: Foreign key to the course
        parent_id: Foreign key to parent knowledge point (for hierarchy)
        order: Display order
    """

    __tablename__ = "knowledge_points"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chapter: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    course_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("knowledge_points.id", ondelete="SET NULL"),
        nullable=True,
    )
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="knowledge_points",
    )
    parent: Mapped[Optional["KnowledgePoint"]] = relationship(
        "KnowledgePoint",
        remote_side="KnowledgePoint.id",
        back_populates="children",
    )
    children: Mapped[List["KnowledgePoint"]] = relationship(
        "KnowledgePoint",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    questions: Mapped[List["Question"]] = relationship(
        "Question",
        back_populates="knowledge_point",
    )

    def __repr__(self) -> str:
        return f"<KnowledgePoint(id={self.id}, name='{self.name}')>"
