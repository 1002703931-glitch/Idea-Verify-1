"""
数据收集API路由
提供从各平台收集数据的功能
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.collectors import RedditCollector, GitHubCollector, TwitterCollector
from app.models import Demand
from app.schemas import (
    CollectRequest,
    CollectResponse,
    PlatformEnum,
    TimeFilterEnum
)

router = APIRouter(prefix="/collect", tags=["数据收集"])


@router.post("/", response_model=CollectResponse)
async def collect_data(
    request: CollectRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    从指定平台收集数据

    支持的平台：
    - reddit: 从Reddit收集帖子
    - github: 从GitHub收集issues
    - twitter: 从Twitter收集推文

    参数说明：
    - query: 搜索关键词
    - subreddit: Reddit子版块（仅reddit平台）
    - repo: GitHub仓库（仅github平台）
    - user: Twitter用户名（仅twitter平台）
    - time_filter: 时间筛选
    - limit: 收集数量限制
    """
    collected_data = []
    collector = None

    # 根据平台选择收集器
    if request.platform == PlatformEnum.reddit:
        collector = RedditCollector()
    elif request.platform == PlatformEnum.github:
        collector = GitHubCollector()
    elif request.platform == PlatformEnum.twitter:
        collector = TwitterCollector()
    else:
        raise HTTPException(status_code=400, detail="不支持的平台")

    # 检查Twitter是否配置
    if request.platform == PlatformEnum.twitter and not collector.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Twitter API未配置，请在.env文件中设置Twitter API密钥"
        )

    try:
        # 收集数据
        collected_data = await collector.collect(
            query=request.query,
            subreddit=request.subreddit,
            repo=request.repo,
            user=request.user,
            time_filter=request.time_filter.value,
            limit=request.limit
        )

        # 存储到数据库
        saved_count = 0
        for data in collected_data:
            # 检查是否已存在（根据source_url去重）
            existing = await db.execute(
                select(Demand).where(Demand.source_url == data["source_url"])
            )
            if existing.scalar_one_or_none():
                continue

            # 创建新记录
            demand = Demand(**data)
            db.add(demand)
            saved_count += 1

        await db.commit()

        return CollectResponse(
            success=True,
            message=f"成功从 {request.platform.value} 收集 {saved_count} 条数据",
            collected_count=saved_count,
            platform=request.platform
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"数据收集失败: {str(e)}")


@router.post("/reddit", response_model=CollectResponse)
async def collect_from_reddit(
    query: str = None,
    subreddit: str = None,
    time_filter: TimeFilterEnum = TimeFilterEnum.month,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    从Reddit收集数据的便捷端点

    示例：
    - 收集特定关键词: /collect/reddit?query="Notion+offline"
    - 收集特定子版块: /collect/reddit?subreddit=webdev
    """
    request = CollectRequest(
        platform=PlatformEnum.reddit,
        query=query,
        subreddit=subreddit,
        time_filter=time_filter,
        limit=limit
    )
    return await collect_data(request, db)


@router.post("/github", response_model=CollectResponse)
async def collect_from_github(
    query: str = None,
    repo: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    从GitHub收集数据的便捷端点

    示例：
    - 搜索功能请求: /collect/github?query="feature+request"
    - 收集特定仓库: /collect/github?repo=facebook/react
    """
    request = CollectRequest(
        platform=PlatformEnum.github,
        query=query,
        repo=repo,
        limit=limit
    )
    return await collect_data(request, db)


@router.post("/twitter", response_model=CollectResponse)
async def collect_from_twitter(
    query: str = None,
    user: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    从Twitter收集数据的便捷端点

    示例：
    - 搜索功能请求: /collect/twitter?query="Notion+feature"
    - 收集特定用户: /collect/twitter?user=notion
    """
    request = CollectRequest(
        platform=PlatformEnum.twitter,
        query=query,
        user=user,
        limit=limit
    )
    return await collect_data(request, db)


from sqlalchemy import select
