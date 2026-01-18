"""
搜索API路由
提供需求搜索功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Demand, SearchHistory
from app.schemas import (
    SearchRequest,
    SearchResponse,
    DemandResponse,
    PlatformEnum,
    SentimentEnum,
    TimeFilterEnum,
    SortByEnum
)

router = APIRouter(prefix="/search", tags=["搜索"])


@router.post("/", response_model=SearchResponse)
async def search_demands(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    搜索需求数据

    支持的功能：
    - 全文搜索（自然语言查询）
    - 布尔搜索（AND/OR/NOT）
    - 按平台筛选
    - 按情感筛选
    - 按分类筛选
    - 按时间范围筛选
    - 按互动分数筛选
    - 多种排序方式
    """
    # 记录搜索历史
    await _record_search_history(db, request)

    # 构建查询
    query = select(Demand).where(Demand.is_deleted == False)

    # 应用筛选条件
    query = _apply_filters(query, request)

    # 应用排序
    query = _apply_sorting(query, request)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页
    offset = (request.page - 1) * request.page_size
    query = query.offset(offset).limit(request.page_size)

    # 执行查询
    result = await db.execute(query)
    demands = result.scalars().all()

    # 转换为响应格式
    results = [DemandResponse.model_validate(demand) for demand in demands]

    return SearchResponse(
        results=results,
        total=total,
        page=request.page,
        page_size=request.page_size,
        total_pages=(total + request.page_size - 1) // request.page_size,
        query=request.query,
        filters_applied=request.filters.model_dump() if request.filters else None
    )


@router.get("/suggest", response_model=List[str])
async def get_search_suggestions(
    query: str = Query(..., min_length=2, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=20, description="建议数量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取搜索建议（基于热门搜索词）
    """
    # 简化版本：从搜索历史中获取热门词
    # 在实际应用中，可以使用更复杂的算法

    query_str = f"%{query}%"

    # 查询匹配的搜索历史
    history_query = (
        select(SearchHistory.query)
        .where(SearchHistory.query.ilike(query_str))
        .group_by(SearchHistory.query)
        .order_by(func.count(SearchHistory.id).desc())
        .limit(limit)
    )

    result = await db.execute(history_query)
    suggestions = [row[0] for row in result.all()]

    return suggestions


@router.get("/products", response_model=List[Dict[str, Any]])
async def get_popular_products(
    limit: int = Query(20, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热门产品列表
    """
    # 使用PostgreSQL的unnest函数展开数组并计数
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


@router.get("/tags", response_model=List[Dict[str, Any]])
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热门标签列表
    """
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


def _apply_filters(query, request: SearchRequest):
    """应用筛选条件"""
    filters = request.filters or SearchFilters()

    # 全文搜索
    if request.query:
        # 使用PostgreSQL的全文搜索
        search_vector = text("plainto_tsquery('english', :query)")
        query = query.where(text("to_tsvector('english', content) @@ " + str(search_vector)))

    # 平台筛选
    if PlatformEnum.all not in filters.platforms:
        platform_values = [p.value for p in filters.platforms]
        query = query.where(Demand.platform.in_(platform_values))

    # 情感筛选
    if filters.sentiments:
        sentiment_values = [s.value for s in filters.sentiments]
        query = query.where(Demand.sentiment.in_(sentiment_values))

    # 分类筛选
    if filters.categories:
        query = query.where(Demand.category.in_(filters.categories))

    # 产品筛选
    if filters.products:
        product_conditions = []
        for product in filters.products:
            product_conditions.append(product == any_(Demand.product_mentioned))
        query = query.where(or_(*product_conditions))

    # 标签筛选
    if filters.tags:
        tag_conditions = []
        for tag in filters.tags:
            tag_conditions.append(tag == any_(Demand.tags))
        query = query.where(or_(*tag_conditions))

    # 时间范围筛选
    if filters.time_range:
        time_map = {
            TimeFilterEnum.hour: timedelta(hours=1),
            TimeFilterEnum.day: timedelta(days=1),
            TimeFilterEnum.week: timedelta(weeks=1),
            TimeFilterEnum.month: timedelta(days=30),
            TimeFilterEnum.year: timedelta(days=365),
        }
        time_delta = time_map.get(filters.time_range, timedelta(days=30))
        cutoff_time = datetime.utcnow() - time_delta
        query = query.where(Demand.timestamp >= cutoff_time)

    # 最小点赞数筛选
    if filters.min_upvotes > 0:
        query = query.where(Demand.upvotes >= filters.min_upvotes)

    # 最小互动分数筛选
    if filters.min_interaction_score > 0:
        query = query.where(Demand.interaction_score >= filters.min_interaction_score)

    return query


def _apply_sorting(query, request: SearchRequest):
    """应用排序"""
    sort_map = {
        SortByEnum.newest: Demand.timestamp.desc(),
        SortByEnum.oldest: Demand.timestamp.asc(),
        SortByEnum.popular: Demand.interaction_score.desc(),
        SortByEnum.relevance: Demand.interaction_score.desc(),  # 简化版本
    }

    order_by = sort_map.get(request.sort_by, Demand.interaction_score.desc())
    return query.order_by(order_by)


async def _record_search_history(db: AsyncSession, request: SearchRequest):
    """记录搜索历史（异步）"""
    try:
        history = SearchHistory(
            query=request.query,
            filters=request.filters.model_dump() if request.filters else None,
            result_count=None,  # 稍后更新
            has_results=True
        )
        db.add(history)
        await db.commit()
    except Exception as e:
        # 记录失败不影响搜索
        print(f"记录搜索历史失败: {e}")


# Postgres any_ 函数导入
from sqlalchemy import any_
