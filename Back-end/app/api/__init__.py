"""
API module exports
"""

from app.api.auth import router as auth_router
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
