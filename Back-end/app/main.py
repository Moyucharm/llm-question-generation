"""
FastAPI Application Entry Point

High-performance FastAPI backend service for LLM-powered quiz system
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import init_db
from app.api import auth_router, llm_router, questions_router, courses_router, exams_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Startup
    print(f"[START] {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"[ENV] Environment: {settings.ENVIRONMENT}")
    print(f"[DEBUG] Debug mode: {settings.DEBUG}")

    # Initialize database
    print("[DB] Initializing database...")
    await init_db()
    print("[DB] Database initialized successfully")

    yield

    # Shutdown
    print(f"[STOP] {settings.APP_NAME} shutting down...")


# 创建FastAPI应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="基于LLM的智能出题与在线考试系统",
    docs_url=f"{settings.API_PREFIX}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_PREFIX}/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ===================================
# CORS中间件配置
# ===================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================================
# API Routers
# ===================================
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(llm_router, prefix=settings.API_PREFIX)
app.include_router(questions_router, prefix=settings.API_PREFIX)
app.include_router(courses_router, prefix=settings.API_PREFIX)
app.include_router(exams_router, prefix=settings.API_PREFIX)


# ===================================
# 健康检查接口
# ===================================
@app.get("/health", tags=["系统"])
async def health_check():
    """
    健康检查接口

    用于监控服务状态,前端可通过此接口验证后端连接
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "message": "哼,本小姐的服务运行得很完美呢!(￣▽￣)／",
        }
    )


@app.get(f"{settings.API_PREFIX}/health", tags=["系统"])
async def api_health_check():
    """
    API健康检查接口

    带API前缀的健康检查,用于测试API路由
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "api_prefix": settings.API_PREFIX,
            "message": "API路由工作正常!",
        }
    )


# ===================================
# 根路由
# ===================================
@app.get("/", tags=["系统"])
async def root():
    """根路由 - 欢迎页面"""
    return JSONResponse(
        content={
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "message": "欢迎使用LLM智能出题考试系统!后端服务已就绪～",
            "docs": f"{settings.API_PREFIX}/docs" if settings.DEBUG else "文档已禁用",
            "health_check": "/health",
        }
    )


# ===================================
# 异常处理
# ===================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理器"""
    if settings.DEBUG:
        # 开发环境返回详细错误
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__,
            },
        )
    else:
        # 生产环境返回通用错误
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "哎呀,服务器出了点小问题,本小姐马上去修复!(￣_￣;)",
            },
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
