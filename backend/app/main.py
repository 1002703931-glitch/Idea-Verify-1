"""
FastAPI 主应用
Idea Verify 需求验证平台 API
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db, close_db
from app.api import search_router, collect_router, stats_router, export_router, auth_router, bookmarks_router

# 配置日志
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时初始化数据库，关闭时清理资源
    """
    # 启动时的操作
    logger.info(f"启动 {settings.app_name} v{settings.app_version}")
    logger.info(f"环境: {settings.environment}")

    # 初始化数据库
    try:
        await init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")

    yield

    # 关闭时的操作
    logger.info("关闭应用...")
    await close_db()
    logger.info("应用已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.app_name,
    description="聚合Reddit、GitHub和Twitter上的真实用户需求，帮助发现市场需求",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# 异常处理
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    请求验证异常处理
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation Error",
            "detail": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    通用异常处理
    """
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


# ============================================================================
# 路由注册
# ============================================================================

app.include_router(search_router)
app.include_router(collect_router)
app.include_router(stats_router)
app.include_router(export_router)
app.include_router(auth_router)
app.include_router(bookmarks_router)


# ============================================================================
# 健康检查端点
# ============================================================================

@app.get("/health")
async def health_check():
    """
    健康检查端点
    """
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment
    }


# ============================================================================
# 根路径
# ============================================================================

@app.get("/")
async def root():
    """
    根路径 - API 信息
    """
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "description": "Idea Verify 需求验证平台 API",
        "docs": "/docs",
        "endpoints": {
            "search": "/search/",
            "collect": "/collect/",
            "stats": "/stats/"
        }
    }


# ============================================================================
# 启动说明
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )
