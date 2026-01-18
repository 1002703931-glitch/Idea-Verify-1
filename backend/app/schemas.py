"""
Pydantic 模型定义
用于API请求和响应的数据验证
"""

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# 枚举类型
# ============================================================================

class PlatformEnum(str, Enum):
    """平台枚举"""
    reddit = "reddit"
    github = "github"
    twitter = "twitter"
    all = "all"


class SentimentEnum(str, Enum):
    """情感枚举"""
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


class CategoryEnum(str, Enum):
    """分类枚举"""
    feature_request = "feature-request"
    bug_report = "bug-report"
    complaint = "complaint"
    praise = "praise"
    discussion = "discussion"


class TimeFilterEnum(str, Enum):
    """时间筛选枚举"""
    hour = "hour"
    day = "day"
    week = "week"
    month = "month"
    year = "year"


class SortByEnum(str, Enum):
    """排序枚举"""
    relevance = "relevance"
    newest = "newest"
    oldest = "oldest"
    popular = "popular"


# ============================================================================
# 基础模型
# ============================================================================

class DemandResponse(BaseModel):
    """需求响应模型"""
    id: str
    content: str
    title: Optional[str] = None
    platform: PlatformEnum
    source_url: str
    author: Optional[str] = None
    author_url: Optional[str] = None
    timestamp: datetime
    upvotes: int = 0
    comments: int = 0
    shares: int = 0
    interaction_score: int = 0
    sentiment: SentimentEnum
    sentiment_score: Optional[float] = None
    tags: List[str] = []
    product_mentioned: List[str] = []
    category: Optional[str] = None
    language: str = "en"

    class Config:
        from_attributes = True


class SearchFilters(BaseModel):
    """搜索筛选器"""
    platforms: List[PlatformEnum] = [PlatformEnum.all]
    sentiments: List[SentimentEnum] = []
    categories: List[str] = []
    products: List[str] = []
    tags: List[str] = []
    time_range: Optional[TimeFilterEnum] = None
    min_upvotes: int = 0
    min_interaction_score: int = 0


class SearchRequest(BaseModel):
    """搜索请求模型"""
    query: str = Field(..., min_length=1, max_length=500, description="搜索关键词")
    filters: Optional[SearchFilters] = Field(default=None, description="筛选条件")
    sort_by: SortByEnum = Field(default=SortByEnum.relevance, description="排序方式")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


class SearchResponse(BaseModel):
    """搜索响应模型"""
    results: List[DemandResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    query: str
    filters_applied: Optional[Dict[str, Any]] = None


# ============================================================================
# 数据收集模型
# ============================================================================

class CollectRequest(BaseModel):
    """数据收集请求模型"""
    platform: PlatformEnum = Field(..., description="数据来源平台")
    query: Optional[str] = Field(default=None, description="搜索关键词")
    subreddit: Optional[str] = Field(default=None, description="Reddit子版块")
    repo: Optional[str] = Field(default=None, description="GitHub仓库")
    user: Optional[str] = Field(default=None, description="Twitter用户名")
    time_filter: TimeFilterEnum = Field(default=TimeFilterEnum.month, description="时间筛选")
    limit: int = Field(default=50, ge=1, le=200, description="收集数量")


class CollectResponse(BaseModel):
    """数据收集响应模型"""
    success: bool
    message: str
    collected_count: int
    platform: PlatformEnum


# ============================================================================
# 统计模型
# ============================================================================

class PlatformStats(BaseModel):
    """平台统计模型"""
    platform: PlatformEnum
    total_demands: int
    feature_requests: int
    bug_reports: int
    complaints: int
    praises: int
    discussions: int
    avg_interaction_score: float


class TrendStats(BaseModel):
    """趋势统计模型"""
    date: datetime
    total_count: int
    platform_breakdown: Dict[str, int]


class StatsResponse(BaseModel):
    """统计响应模型"""
    total_demands: int
    platforms: List[PlatformStats]
    recent_trends: List[TrendStats]
    top_products: List[Dict[str, Any]]
    top_tags: List[Dict[str, Any]]


# ============================================================================
# 收藏模型
# ============================================================================

class BookmarkCreate(BaseModel):
    """创建收藏请求模型"""
    demand_id: str
    custom_notes: Optional[str] = None
    custom_tags: List[str] = []
    custom_category: Optional[str] = None


class BookmarkResponse(BaseModel):
    """收藏响应模型"""
    id: str
    user_id: str
    demand: DemandResponse
    custom_notes: Optional[str] = None
    custom_tags: List[str] = []
    custom_category: Optional[str] = None
    created_at: datetime


# ============================================================================
# 用户认证模型
# ============================================================================

class UserRegister(BaseModel):
    """用户注册请求模型"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, max_length=100, description="密码")

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        # 用户名只能包含字母、数字、下划线和中划线
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('用户名只能包含字母、数字、下划线和中划线')
        return v


class UserLogin(BaseModel):
    """用户登录请求模型"""
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")


class UserResponse(BaseModel):
    """用户响应模型"""
    id: str
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token 响应模型"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class BookmarkUpdate(BaseModel):
    """更新收藏请求模型"""
    custom_notes: Optional[str] = None
    custom_tags: Optional[List[str]] = None
    custom_category: Optional[str] = None


# ============================================================================
# 通用响应模型
# ============================================================================

class MessageResponse(BaseModel):
    """通用消息响应模型"""
    success: bool
    message: str


class ErrorResponse(BaseModel):
    """错误响应模型"""
    success: bool = False
    error: str
    detail: Optional[str] = None
