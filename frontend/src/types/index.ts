// ============================================================================
// 枚举类型
// ============================================================================

export enum PlatformEnum {
  REDDIT = 'reddit',
  GITHUB = 'github',
  TWITTER = 'twitter',
  ALL = 'all',
}

export enum SentimentEnum {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export enum CategoryEnum {
  FEATURE_REQUEST = 'feature-request',
  BUG_REPORT = 'bug-report',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
  DISCUSSION = 'discussion',
}

export enum TimeFilterEnum {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum SortByEnum {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  POPULAR = 'popular',
}

// ============================================================================
// 基础类型
// ============================================================================

export interface DemandResponse {
  id: string
  content: string
  title: string | null
  platform: string
  source_url: string
  author: string | null
  author_url: string | null
  timestamp: string
  upvotes: number
  comments: number
  shares: number
  interaction_score: number
  sentiment: string
  sentiment_score: number | null
  tags: string[]
  product_mentioned: string[]
  category: string | null
  language: string
}

export interface SearchFilters {
  platforms: PlatformEnum[]
  sentiments: SentimentEnum[]
  categories: string[]
  products: string[]
  tags: string[]
  time_range: TimeFilterEnum | null
  min_upvotes: number
  min_interaction_score: number
}

export interface SearchRequest {
  query: string
  filters?: SearchFilters
  sort_by: SortByEnum
  page: number
  page_size: number
}

export interface SearchResponse {
  results: DemandResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
  query: string
  filters_applied: Record<string, any> | null
}

// ============================================================================
// 数据收集类型
// ============================================================================

export interface CollectRequest {
  platform: PlatformEnum
  query?: string
  subreddit?: string
  repo?: string
  user?: string
  time_filter: TimeFilterEnum
  limit: number
}

export interface CollectResponse {
  success: boolean
  message: string
  collected_count: number
  platform: PlatformEnum
}

// ============================================================================
// 统计类型
// ============================================================================

export interface PlatformStats {
  platform: string
  total_demands: number
  feature_requests: number
  bug_reports: number
  complaints: number
  praises: number
  discussions: number
  avg_interaction_score: number
}

export interface TrendStats {
  date: string
  total_count: number
  platform_breakdown: {
    reddit: number
    github: number
    twitter: number
  }
}

export interface StatsResponse {
  total_demands: number
  platforms: PlatformStats[]
  recent_trends: TrendStats[]
  top_products: Array<{ name: string; count: number; avg_score: number }>
  top_tags: Array<{ name: string; count: number; avg_score: number }>
}

// ============================================================================
// 用户和认证类型
// ============================================================================

export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LoginData {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

// ============================================================================
// 收藏类型
// ============================================================================

export interface Bookmark {
  id: string
  user_id: string
  demand: DemandResponse
  custom_notes: string | null
  custom_tags: string[]
  custom_category: string | null
  created_at: string
  updated_at: string
}

export interface BookmarkCreateData {
  demand_id: string
  custom_notes?: string
  custom_tags?: string[]
  custom_category?: string
}

export interface BookmarkUpdateData {
  custom_notes?: string
  custom_tags?: string[]
  custom_category?: string
}

export interface BookmarkCheckResponse {
  bookmarked: boolean
  bookmark_id: string | null
}

// ============================================================================
// 图表类型
// ============================================================================

export interface ChartsData {
  trends: {
    dates: string[]
    series: Array<{
      name: string
      data: number[]
    }>
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
  categories: Record<string, number>
  platforms: Record<string, number>
}

export interface PlatformComparison {
  platform: string
  total_count: number
  avg_score: number
  avg_upvotes: number
  avg_comments: number
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface TopProductChart {
  name: string
  count: number
  avg_score: number
  avg_upvotes: number
  platforms: number
}
