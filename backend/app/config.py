"""
应用配置模块
从环境变量加载配置
"""

from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """应用设置"""

    # 应用基本信息
    app_name: str = "Idea Verify API"
    app_version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"

    # 数据库配置
    database_url: str
    database_url_sync: str

    # Redis配置
    redis_url: str = "redis://localhost:6379/0"

    # Reddit API配置
    reddit_client_id: str
    reddit_client_secret: str
    reddit_user_agent: str

    # GitHub API配置
    github_token: str

    # Twitter API配置
    twitter_bearer_token: str = ""
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""

    # JWT配置
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS配置
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # 数据收集配置
    collection_interval_minutes: int = 60
    max_results_per_request: int = 50

    # API请求超时
    request_timeout: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()


# 导出配置实例
settings = get_settings()
