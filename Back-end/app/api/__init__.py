"""
API module exports
"""

from app.api.auth import router as auth_router
from app.api.llm import router as llm_router
from app.api.questions import router as questions_router
from app.api.courses import router as courses_router
from app.api.deps import (
    get_current_user,
    get_current_active_user,
    require_roles,
    require_teacher,
    require_admin,
    require_student,
    CurrentUser,
    CurrentActiveUser,
    DbSession,
)

__all__ = [
    "auth_router",
    "llm_router",
    "questions_router",
    "courses_router",
    "get_current_user",
    "get_current_active_user",
    "require_roles",
    "require_teacher",
    "require_admin",
    "require_student",
    "CurrentUser",
    "CurrentActiveUser",
    "DbSession",
]
