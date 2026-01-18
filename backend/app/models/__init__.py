"""
数据库模型模块
包含所有数据表的SQLAlchemy模型
"""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ARRAY, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base
import uuid


class User(Base):
    """
    用户模型
    存储用户账户信息
    """

    __tablename__ = "users"

    # 主键
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 基本信息
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # 状态
    is_active = Column(Boolean, default=True, index=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


class Demand(Base):
    """
    需求数据模型
    存储从Reddit、GitHub、Twitter收集的用户需求
    """

    __tablename__ = "demands"

    # 主键
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 核心内容
    content = Column(Text, nullable=False, index=True)
    title = Column(Text, nullable=True)
    platform = Column(String(20), nullable=False, index=True)  # reddit, github, twitter
    source_url = Column(Text, nullable=False)
    author = Column(String(255), nullable=True)
    author_url = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())

    # 互动数据
    upvotes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    interaction_score = Column(Integer, default=0, index=True)

    # 内容分析
    sentiment = Column(String(20), default="neutral", index=True)  # positive, negative, neutral
    sentiment_score = Column(Numeric(5, 4), nullable=True)

    # 分类信息
    tags = Column(ARRAY(String), nullable=True)
    product_mentioned = Column(ARRAY(String), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    language = Column(String(10), default="en")

    # 平台特定字段
    subreddit = Column(String(100), nullable=True)
    repository = Column(String(255), nullable=True)
    issue_number = Column(Integer, nullable=True)

    # 状态标记
    is_processed = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 索引
    __table_args__ = (
        Index("idx_demands_platform_time", platform, timestamp),
        Index("idx_demands_tags", tags, postgresql_using="gin"),
        Index("idx_demands_product_mentioned", product_mentioned, postgresql_using="gin"),
        Index("idx_demands_content_fts", content, postgresql_using="gin"),
    )

    def __repr__(self):
        return f"<Demand(id={self.id}, platform={self.platform}, category={self.category})>"


class Bookmark(Base):
    """
    用户收藏模型
    存储用户收藏的需求数据
    """

    __tablename__ = "user_bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    demand_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # 自定义信息
    custom_notes = Column(Text, nullable=True)
    custom_tags = Column(ARRAY(String), nullable=True)
    custom_category = Column(String(100), nullable=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Bookmark(id={self.id}, user_id={self.user_id}, demand_id={self.demand_id})>"


class SearchHistory(Base):
    """
    搜索历史模型
    用于统计热门搜索词
    """

    __tablename__ = "search_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(Text, nullable=False, index=True)
    user_id = Column(String(255), nullable=True)
    filters = Column(JSONB, nullable=True)

    # 统计信息
    result_count = Column(Integer, nullable=True)
    has_results = Column(Boolean, default=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self):
        return f"<SearchHistory(id={self.id}, query={self.query})>"
