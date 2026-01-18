"""
API路由模块
"""

from app.api.search import router as search_router
from app.api.collect import router as collect_router
from app.api.stats import router as stats_router
from app.api.export import router as export_router
from app.api.auth import router as auth_router
from app.api.bookmarks import router as bookmarks_router

__all__ = [
    "search_router",
    "collect_router",
    "stats_router",
    "export_router",
    "auth_router",
    "bookmarks_router",
]
