"""
User Model

Defines the User table for authentication and authorization
"""

import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Boolean, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.exam import Attempt


class UserRole(str, enum.Enum):
    """User role enumeration"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class User(Base, TimestampMixin):
    """
    User model for authentication and authorization

    Attributes:
        id: Primary key
        email: Unique email address
        name: Display name
        password_hash: Hashed password
        role: User role (student/teacher/admin)
        is_active: Whether the user is active
        avatar: Avatar URL (optional)
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.STUDENT,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    avatar: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    courses: Mapped[List["Course"]] = relationship(
        "Course",
        back_populates="teacher",
        foreign_keys="Course.teacher_id",
    )
    attempts: Mapped[List["Attempt"]] = relationship(
        "Attempt",
        back_populates="student",
        foreign_keys="Attempt.student_id",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role={self.role})>"
