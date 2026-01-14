"""
Database Initialization

Create all tables and initial data
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.session import engine


async def init_db() -> None:
    """
    Initialize the database

    Creates all tables defined in the models
    """
    async with engine.begin() as conn:
        # Import all models here to ensure they are registered
        from app.models import user, course, question, exam, llm_log  # noqa: F401

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

        print("[启动] 数据库初始化完成")


async def create_initial_data(db: AsyncSession) -> None:
    """
    Create initial data for the application

    This can be used to seed the database with:
    - Default admin user
    - Sample courses
    - etc.
    """
    # TODO: Add initial data creation logic
    pass
