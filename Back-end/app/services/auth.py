"""
Authentication Service

Business logic for user authentication
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token


class AuthService:
    """
    Authentication service class

    Handles user registration, login, and token management
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize auth service with database session

        Args:
            db: Async database session
        """
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address

        Args:
            email: User email to search

        Returns:
            User object if found, None otherwise
        """
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID

        Args:
            user_id: User ID to search

        Returns:
            User object if found, None otherwise
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def register(self, user_data: UserCreate) -> User:
        """
        Register a new user

        Args:
            user_data: User registration data

        Returns:
            Created user object

        Raises:
            ValueError: If email already exists
        """
        # Check if email already exists
        existing_user = await self.get_user_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")

        # Create new user with hashed password
        user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=hash_password(user_data.password),
            role=user_data.role,
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def login(self, login_data: UserLogin) -> Optional[Token]:
        """
        Authenticate user and generate token

        Args:
            login_data: User login credentials

        Returns:
            Token object if authentication successful, None otherwise
        """
        # Find user by email
        user = await self.get_user_by_email(login_data.email)
        if not user:
            return None

        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            return None

        # Check if user is active
        if not user.is_active:
            return None

        # Generate access token
        access_token = create_access_token(data={"sub": str(user.id)})

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password

        Args:
            email: User email
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        user = await self.get_user_by_email(email)
        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user
