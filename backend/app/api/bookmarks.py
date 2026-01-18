"""
收藏 API 路由
提供用户收藏功能
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User, Bookmark, Demand
from app.schemas import BookmarkCreate, BookmarkResponse, BookmarkUpdate, MessageResponse
from app.auth.dependencies import get_current_user, get_current_user_optional

router = APIRouter(prefix="/bookmarks", tags=["收藏"])


@router.post("/", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    bookmark_data: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建收藏

    将指定的需求添加到当前用户的收藏列表
    """
    # 检查需求数据是否存在
    demand_query = select(Demand).where(Demand.id == bookmark_data.demand_id)
    demand_result = await db.execute(demand_query)
    demand = demand_result.scalar_one_or_none()

    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="需求不存在"
        )

    # 检查是否已收藏
    existing_query = select(Bookmark).where(
        and_(
            Bookmark.user_id == str(current_user.id),
            Bookmark.demand_id == bookmark_data.demand_id
        )
    )
    existing_result = await db.execute(existing_query)
    existing_bookmark = existing_result.scalar_one_or_none()

    if existing_bookmark:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已收藏该需求"
        )

    # 创建新收藏
    new_bookmark = Bookmark(
        user_id=str(current_user.id),
        demand_id=bookmark_data.demand_id,
        custom_notes=bookmark_data.custom_notes,
        custom_tags=bookmark_data.custom_tags,
        custom_category=bookmark_data.custom_category
    )
    db.add(new_bookmark)
    await db.commit()
    await db.refresh(new_bookmark)

    # 重新查询以获取关联的 Demand 数据
    bookmark_query = (
        select(Bookmark)
        .options(selectinload(Bookmark.demand))
        .where(Bookmark.id == new_bookmark.id)
    )
    bookmark_result = await db.execute(bookmark_query)
    bookmark = bookmark_result.scalar_one()

    return BookmarkResponse.model_validate(bookmark)


@router.get("/", response_model=List[BookmarkResponse])
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户的收藏列表

    返回用户所有收藏的需求
    """
    query = (
        select(Bookmark)
        .options(selectinload(Bookmark.demand))
        .where(Bookmark.user_id == str(current_user.id))
        .order_by(Bookmark.created_at.desc())
    )

    result = await db.execute(query)
    bookmarks = result.scalars().all()

    return [BookmarkResponse.model_validate(b) for b in bookmarks]


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
async def get_bookmark(
    bookmark_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定收藏的详细信息

    只能访问自己的收藏
    """
    query = (
        select(Bookmark)
        .options(selectinload(Bookmark.demand))
        .where(
            and_(
                Bookmark.id == bookmark_id,
                Bookmark.user_id == str(current_user.id)
            )
        )
    )

    result = await db.execute(query)
    bookmark = result.scalar_one_or_none()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="收藏不存在"
        )

    return BookmarkResponse.model_validate(bookmark)


@router.put("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: UUID,
    update_data: BookmarkUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    更新收藏

    更新收藏的备注、标签或分类
    """
    query = select(Bookmark).where(
        and_(
            Bookmark.id == bookmark_id,
            Bookmark.user_id == str(current_user.id)
        )
    )

    result = await db.execute(query)
    bookmark = result.scalar_one_or_none()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="收藏不存在"
        )

    # 更新字段
    if update_data.custom_notes is not None:
        bookmark.custom_notes = update_data.custom_notes
    if update_data.custom_tags is not None:
        bookmark.custom_tags = update_data.custom_tags
    if update_data.custom_category is not None:
        bookmark.custom_category = update_data.custom_category

    await db.commit()
    await db.refresh(bookmark)

    # 重新查询以获取关联的 Demand 数据
    bookmark_query = (
        select(Bookmark)
        .options(selectinload(Bookmark.demand))
        .where(Bookmark.id == bookmark.id)
    )
    bookmark_result = await db.execute(bookmark_query)
    updated_bookmark = bookmark_result.scalar_one()

    return BookmarkResponse.model_validate(updated_bookmark)


@router.delete("/{bookmark_id}", response_model=MessageResponse)
async def delete_bookmark(
    bookmark_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    删除收藏

    从用户的收藏列表中移除指定需求
    """
    query = select(Bookmark).where(
        and_(
            Bookmark.id == bookmark_id,
            Bookmark.user_id == str(current_user.id)
        )
    )

    result = await db.execute(query)
    bookmark = result.scalar_one_or_none()

    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="收藏不存在"
        )

    await db.delete(bookmark)
    await db.commit()

    return MessageResponse(
        success=True,
        message="收藏已删除"
    )


@router.get("/check/{demand_id}", response_model=dict)
async def check_bookmarked(
    demand_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    检查需求是否已被收藏

    返回当前用户是否已收藏指定需求
    """
    if not current_user:
        return {"bookmarked": False}

    query = select(Bookmark).where(
        and_(
            Bookmark.user_id == str(current_user.id),
            Bookmark.demand_id == demand_id
        )
    )

    result = await db.execute(query)
    bookmark = result.scalar_one_or_none()

    return {
        "bookmarked": bookmark is not None,
        "bookmark_id": str(bookmark.id) if bookmark else None
    }
