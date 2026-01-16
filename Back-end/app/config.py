"""
应用配置模块

使用Pydantic Settings管理环境变量和配置
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""

    # ===================================
    # 应用基础配置
    # ===================================
    APP_NAME: str = "LLM智能出题考试系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # API配置
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ===================================
    # 数据库配置
    # ===================================
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # ===================================
    # JWT认证配置
    # ===================================
    SECRET_KEY: str = "your-secret-key-here-please-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7天

    # ===================================
    # CORS配置
    # ===================================
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # ===================================
    # LLM配置
    # ===================================
    LLM_PROVIDER: str = "deepseek"

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Qwen
    QWEN_API_KEY: str = ""
    QWEN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL: str = "qwen-plus"

    # GLM
    GLM_API_KEY: str = ""
    GLM_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4"
    GLM_MODEL: str = "glm-4-flash"

    # LLM通用配置
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 4000
    LLM_TIMEOUT: int = 60

    # ===================================
    # 日志配置
    # ===================================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    SQL_ECHO: bool = False  # 是否输出 SQL 查询日志（开发时可开启调试）

    # Pydantic配置
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# 创建全局配置实例
settings = Settings()
