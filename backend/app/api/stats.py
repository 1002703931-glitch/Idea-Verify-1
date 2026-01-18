"""
统计API路由
提供数据统计和分析功能
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Demand
from app.schemas import (
    PlatformStats,
    TrendStats,
    StatsResponse
)

router = APIRouter(prefix="/stats", tags=["统计"])


@router.get("/", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    获取总体统计信息

    返回：
    - 总需求数
    - 各平台统计
    - 近期趋势
    - 热门产品
    - 热门标签
    """
    # 获取总需求数
    total_query = select(func.count()).select_from(
        select(Demand).where(Demand.is_deleted == False).subquery()
    )
    total_result = await db.execute(total_query)
    total_demands = total_result.scalar() or 0

    # 获取各平台统计
    platforms = await _get_platform_stats(db)

    # 获取近期趋势
    recent_trends = await _get_recent_trends(db)

    # 获取热门产品
    top_products = await _get_top_products(db, limit=10)

    # 获取热门标签
    top_tags = await _get_top_tags(db, limit=10)

    return StatsResponse(
        total_demands=total_demands,
        platforms=platforms,
        recent_trends=recent_trends,
        top_products=top_products,
        top_tags=top_tags
    )


@router.get("/platforms", response_model=List[PlatformStats])
async def get_platform_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    获取各平台统计信息
    """
    return await _get_platform_stats(db)


@router.get("/trends", response_model=List[TrendStats])
async def get_trends(
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    获取趋势数据

    参数：
    - days: 获取最近多少天的数据
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # 使用SQL查询获取每日统计数据
    query = text("""
        SELECT
            DATE(timestamp) as date,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE platform = 'reddit') as reddit,
            COUNT(*) FILTER (WHERE platform = 'github') as github,
            COUNT(*) FILTER (WHERE platform = 'twitter') as twitter
        FROM demands
        WHERE is_deleted = FALSE
            AND timestamp >= :cutoff_date
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    """)

    result = await db.execute(query, {"cutoff_date": cutoff_date})
    trends = []
    for row in result:
        platform_breakdown = {
            "reddit": row.reddit,
            "github": row.github,
            "twitter": row.twitter
        }
        trends.append(TrendStats(
            date=row.date,
            total_count=row.total_count,
            platform_breakdown=platform_breakdown
        ))

    return trends


@router.get("/products")
async def get_popular_products(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """
    获取热门产品列表
    """
    return await _get_top_products(db, limit)


@router.get("/tags")
async def get_popular_tags(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """
    获取热门标签列表
    """
    return await _get_top_tags(db, limit)


@router.get("/sentiment")
async def get_sentiment_distribution(
    db: AsyncSession = Depends(get_db)
):
    """
    获取情感分布
    """
    query = select(
        Demand.sentiment,
        func.count(Demand.id).label("count")
    ).where(
        Demand.is_deleted == False
    ).group_by(Demand.sentiment)

    result = await db.execute(query)
    distribution = {row.sentiment: row.count for row in result.all()}

    return distribution


@router.get("/categories")
async def get_category_distribution(
    db: AsyncSession = Depends(get_db)
):
    """
    获取分类分布
    """
    query = select(
        Demand.category,
        func.count(Demand.id).label("count")
    ).where(
        Demand.is_deleted == False,
        Demand.category.isnot(None)
    ).group_by(Demand.category)

    result = await db.execute(query)
    distribution = {row.category: row.count for row in result.all()}

    return distribution


@router.get("/charts")
async def get_charts_data(
    days: int = Query(30, ge=7, le=365, description="获取最近多少天的数据"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取图表所需的完整数据格式

    返回数据格式：
    {
      "trends": {
        "dates": ["2025-01-01", "2025-01-02", ...],
        "series": [
          { "name": "Reddit", "data": [10, 15, ...] },
          { "name": "GitHub", "data": [5, 8, ...] },
          { "name": "Twitter", "data": [3, 4, ...] }
        ]
      },
      "sentiment": {
        "positive": 45,
        "negative": 20,
        "neutral": 35
      },
      "categories": {
        "feature-request": 30,
        "bug-report": 25,
        "complaint": 20,
        "praise": 15,
        "discussion": 10
      },
      "platforms": {
        "reddit": 40,
        "github": 35,
        "twitter": 25
      }
    }
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # 1. 获取趋势数据（折线图）
    trend_query = text("""
        SELECT
            DATE(timestamp) as date,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE platform = 'reddit') as reddit,
            COUNT(*) FILTER (WHERE platform = 'github') as github,
            COUNT(*) FILTER (WHERE platform = 'twitter') as twitter
        FROM demands
        WHERE is_deleted = FALSE
            AND timestamp >= :cutoff_date
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    """)

    trend_result = await db.execute(trend_query, {"cutoff_date": cutoff_date})
    trend_rows = trend_result.all()

    dates = [str(row.date) for row in trend_rows]
    reddit_data = [row.reddit for row in trend_rows]
    github_data = [row.github for row in trend_rows]
    twitter_data = [row.twitter for row in trend_rows]

    trends = {
        "dates": dates,
        "series": [
            {"name": "Reddit", "data": reddit_data},
            {"name": "GitHub", "data": github_data},
            {"name": "Twitter", "data": twitter_data}
        ]
    }

    # 2. 获取情感分布（饼图）
    sentiment_query = select(
        Demand.sentiment,
        func.count(Demand.id).label("count")
    ).where(
        Demand.is_deleted == False
    ).group_by(Demand.sentiment)

    sentiment_result = await db.execute(sentiment_query)
    sentiment_rows = sentiment_result.all()

    sentiment_dict = {"positive": 0, "negative": 0, "neutral": 0}
    for row in sentiment_rows:
        if row.sentiment in sentiment_dict:
            sentiment_dict[row.sentiment] = row.count

    # 3. 获取分类分布（饼图）
    category_query = select(
        Demand.category,
        func.count(Demand.id).label("count")
    ).where(
        Demand.is_deleted == False,
        Demand.category.isnot(None)
    ).group_by(Demand.category)

    category_result = await db.execute(category_query)
    category_rows = category_result.all()

    categories = {row.category: row.count for row in category_rows}

    # 4. 获取平台分布（柱状图）
    platform_query = select(
        Demand.platform,
        func.count(Demand.id).label("count")
    ).where(
        Demand.is_deleted == False
    ).group_by(Demand.platform)

    platform_result = await db.execute(platform_query)
    platform_rows = platform_result.all()

    platforms = {row.platform: row.count for row in platform_rows}

    return {
        "trends": trends,
        "sentiment": sentiment_dict,
        "categories": categories,
        "platforms": platforms
    }


@router.get("/platforms-comparison")
async def get_platforms_comparison(
    days: int = Query(30, ge=7, le=365, description="获取最近多少天的数据"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取平台对比数据（柱状图）

    返回各平台在指定时间范围内的详细统计
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # 使用SQL查询获取平台统计
    query = text("""
        SELECT
            platform,
            COUNT(*) as total_count,
            AVG(interaction_score) as avg_score,
            AVG(upvotes) as avg_upvotes,
            AVG(comments) as avg_comments,
            COUNT(*) FILTER (WHERE sentiment = 'positive') as positive,
            COUNT(*) FILTER (WHERE sentiment = 'negative') as negative,
            COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral
        FROM demands
        WHERE is_deleted = FALSE
            AND timestamp >= :cutoff_date
        GROUP BY platform
        ORDER BY total_count DESC
    """)

    result = await db.execute(query, {"cutoff_date": cutoff_date})

    comparison = []
    for row in result:
        comparison.append({
            "platform": row.platform,
            "total_count": row.total_count,
            "avg_score": float(row.avg_score or 0),
            "avg_upvotes": float(row.avg_upvotes or 0),
            "avg_comments": float(row.avg_comments or 0),
            "sentiment": {
                "positive": row.positive,
                "negative": row.negative,
                "neutral": row.neutral
            }
        })

    return comparison


@router.get("/top-products-chart")
async def get_top_products_chart(
    limit: int = Query(10, ge=5, le=20, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热门产品数据（柱状图）

    返回热门产品及其相关统计
    """
    query = text("""
        SELECT
            UNNEST(product_mentioned) as product,
            COUNT(*) as count,
            AVG(interaction_score) as avg_score,
            AVG(upvotes) as avg_upvotes,
            COUNT(DISTINCT platform) as platforms
        FROM demands
        WHERE is_deleted = FALSE
            AND array_length(product_mentioned, 1) > 0
        GROUP BY product
        ORDER BY count DESC
        LIMIT :limit
    """)

    result = await db.execute(query, {"limit": limit})

    products = []
    for row in result:
        products.append({
            "name": row.product,
            "count": row.count,
            "avg_score": float(row.avg_score or 0),
            "avg_upvotes": float(row.avg_upvotes or 0),
            "platforms": row.platforms
        })

    return products


# ============================================================================
# 辅助函数
# ============================================================================

async def _get_platform_stats(db: AsyncSession) -> List[PlatformStats]:
    """获取各平台统计"""
    platforms = ["reddit", "github", "twitter"]
    stats = []

    for platform in platforms:
        # 总数
        total_query = select(func.count()).select_from(
            select(Demand).where(
                and_(
                    Demand.platform == platform,
                    Demand.is_deleted == False
                )
            ).subquery()
        )
        total_result = await db.execute(total_query)
        total = total_result.scalar() or 0

        # 各分类计数
        category_query = select(
            Demand.category,
            func.count(Demand.id).label("count")
        ).where(
            and_(
                Demand.platform == platform,
                Demand.is_deleted == False,
                Demand.category.isnot(None)
            )
        ).group_by(Demand.category)

        category_result = await db.execute(category_query)
        categories = {row.category: row.count for row in category_result.all()}

        # 平均互动分数
        avg_score_query = select(
            func.avg(Demand.interaction_score)
        ).where(
            and_(
                Demand.platform == platform,
                Demand.is_deleted == False
            )
        )
        avg_score_result = await db.execute(avg_score_query)
        avg_score = float(avg_score_result.scalar() or 0)

        stats.append(PlatformStats(
            platform=platform,
            total_demands=total,
            feature_requests=categories.get("feature-request", 0),
            bug_reports=categories.get("bug-report", 0),
            complaints=categories.get("complaint", 0),
            praises=categories.get("praise", 0),
            discussions=categories.get("discussion", 0),
            avg_interaction_score=avg_score
        ))

    return stats


async def _get_recent_trends(db: AsyncSession, days: int = 7) -> List[TrendStats]:
    """获取近期趋势"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    query = text("""
        SELECT
            DATE(timestamp) as date,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE platform = 'reddit') as reddit,
            COUNT(*) FILTER (WHERE platform = 'github') as github,
            COUNT(*) FILTER (WHERE platform = 'twitter') as twitter
        FROM demands
        WHERE is_deleted = FALSE
            AND timestamp >= :cutoff_date
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    """)

    result = await db.execute(query, {"cutoff_date": cutoff_date})
    trends = []
    for row in result:
        platform_breakdown = {
            "reddit": row.reddit,
            "github": row.github,
            "twitter": row.twitter
        }
        trends.append(TrendStats(
            date=row.date,
            total_count=row.total_count,
            platform_breakdown=platform_breakdown
        ))

    return trends


async def _get_top_products(db: AsyncSession, limit: int) -> List[Dict[str, Any]]:
    """获取热门产品"""
    query = text("""
        SELECT
            UNNEST(product_mentioned) as product,
            COUNT(*) as count,
            AVG(interaction_score) as avg_score
        FROM demands
        WHERE is_deleted = FALSE
            AND array_length(product_mentioned, 1) > 0
        GROUP BY product
        ORDER BY count DESC
        LIMIT :limit
    """)

    result = await db.execute(query, {"limit": limit})
    products = [
        {"name": row.product, "count": row.count, "avg_score": float(row.avg_score or 0)}
        for row in result
    ]

    return products


async def _get_top_tags(db: AsyncSession, limit: int) -> List[Dict[str, Any]]:
    """获取热门标签"""
    query = text("""
        SELECT
            UNNEST(tags) as tag,
            COUNT(*) as count,
            AVG(interaction_score) as avg_score
        FROM demands
        WHERE is_deleted = FALSE
            AND array_length(tags, 1) > 0
        GROUP BY tag
        ORDER BY count DESC
        LIMIT :limit
    """)

    result = await db.execute(query, {"limit": limit})
    tags = [
        {"name": row.tag, "count": row.count, "avg_score": float(row.avg_score or 0)}
        for row in result
    ]

    return tags


from sqlalchemy import and_
