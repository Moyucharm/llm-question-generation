"""
Authentication API Routes

Endpoints for user registration, login, and profile management
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, Token
from app.services.auth import AuthService
from app.api.deps import CurrentUser, DbSession


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: DbSession,
):
    """
    Register a new user account

    - **email**: Valid email address (must be unique)
    - **name**: Display name (2-100 characters)
    - **password**: Password (6-100 characters)
    - **role**: User role (student/teacher/admin), defaults to student
    """
    auth_service = AuthService(db)

    try:
        user = await auth_service.register(user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Auto-login after registration
    login_result = await auth_service.login(
        UserLogin(email=user_data.email, password=user_data.password)
    )

    if not login_result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration successful but auto-login failed",
        )

    return login_result


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: DbSession,
):
    """
    Authenticate user and get access token

    - **email**: User email address
    - **password**: User password
    """
    auth_service = AuthService(db)
    result = await auth_service.login(login_data)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
):
    """
    OAuth2 compatible login endpoint (form data)

    This endpoint accepts form data for OAuth2 compatibility.
    Use this with OAuth2PasswordBearer in Swagger UI.
    """
    auth_service = AuthService(db)
    result = await auth_service.login(
        UserLogin(email=form_data.username, password=form_data.password)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser,
):
    """
    Get current authenticated user's profile

    Requires valid JWT token in Authorization header
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update current user's profile

    - **name**: New display name (optional)
    - **avatar**: New avatar URL (optional)
    - **bio**: New bio text (optional)
    """
    # Update user fields
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.avatar is not None:
        current_user.avatar = user_update.avatar
    if user_update.bio is not None:
        current_user.bio = user_update.bio

    await db.commit()
    await db.refresh(current_user)

    return current_user
