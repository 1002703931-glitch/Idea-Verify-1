"""
数据库连接和会话管理
使用 SQLAlchemy 和 AsyncPG 实现 PostgreSQL 异步连接
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# 创建异步数据库引擎
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,  # 开发模式下打印SQL
    pool_size=10,         # 连接池大小
    max_overflow=20,      # 最大溢出连接数
    pool_pre_ping=True,   # 连接前检查连接是否有效
)

# 创建异步会话工厂
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 提交后不过期，便于访问对象属性
    autocommit=False,
    autoflush=False,
)

# 创建基础模型类
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    数据库会话依赖
    用于FastAPI的依赖注入
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    初始化数据库
    创建所有表结构
    """
    async with engine.begin() as conn:
        # 导入所有模型以确保它们被注册
        from app.models import User, Demand, Bookmark, SearchHistory

        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """
    关闭数据库连接
    用于应用关闭时清理资源
    """
    await engine.dispose()
