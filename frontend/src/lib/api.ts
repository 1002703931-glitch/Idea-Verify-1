import axios from 'axios'
import type {
  SearchRequest,
  SearchResponse,
  CollectRequest,
  CollectResponse,
  StatsResponse,
  DemandResponse,
  PlatformEnum,
  SentimentEnum,
  SortByEnum,
} from '@/types'

// API 基础URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================================
// 搜索 API
// ============================================================================

/**
 * 搜索需求数据
 */
export async function searchDemands(request: SearchRequest): Promise<SearchResponse> {
  const response = await api.post<SearchResponse>('/search/', request)
  return response.data
}

/**
 * 获取搜索建议
 */
export async function getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
  const response = await api.get<string[]>('/search/suggest', {
    params: { query, limit },
  })
  return response.data
}

/**
 * 获取热门产品
 */
export async function getPopularProducts(limit: number = 20) {
  const response = await api.get('/search/products', { params: { limit } })
  return response.data
}

/**
 * 获取热门标签
 */
export async function getPopularTags(limit: number = 20) {
  const response = await api.get('/search/tags', { params: { limit } })
  return response.data
}

// ============================================================================
// 数据收集 API
// ============================================================================

/**
 * 从指定平台收集数据
 */
export async function collectData(request: CollectRequest): Promise<CollectResponse> {
  const response = await api.post<CollectResponse>('/collect/', request)
  return response.data
}

/**
 * 从 Reddit 收集数据
 */
export async function collectFromReddit(
  query?: string,
  subreddit?: string,
  timeFilter: string = 'month',
  limit: number = 50
): Promise<CollectResponse> {
  const response = await api.post<CollectResponse>('/collect/reddit', null, {
    params: { query, subreddit, time_filter: timeFilter, limit },
  })
  return response.data
}

/**
 * 从 GitHub 收集数据
 */
export async function collectFromGitHub(
  query?: string,
  repo?: string,
  limit: number = 50
): Promise<CollectResponse> {
  const response = await api.post<CollectResponse>('/collect/github', null, {
    params: { query, repo, limit },
  })
  return response.data
}

/**
 * 从 Twitter 收集数据
 */
export async function collectFromTwitter(
  query?: string,
  user?: string,
  limit: number = 50
): Promise<CollectResponse> {
  const response = await api.post<CollectResponse>('/collect/twitter', null, {
    params: { query, user, limit },
  })
  return response.data
}

// ============================================================================
// 统计 API
// ============================================================================

/**
 * 获取总体统计
 */
export async function getStats(): Promise<StatsResponse> {
  const response = await api.get<StatsResponse>('/stats/')
  return response.data
}

/**
 * 获取平台统计
 */
export async function getPlatformStats() {
  const response = await api.get('/stats/platforms')
  return response.data
}

/**
 * 获取趋势数据
 */
export async function getTrends(days: number = 30) {
  const response = await api.get('/stats/trends', { params: { days } })
  return response.data
}

/**
 * 获取热门产品
 */
export async function getTopProducts(limit: number = 20) {
  const response = await api.get('/stats/products', { params: { limit } })
  return response.data
}

/**
 * 获取热门标签
 */
export async function getTopTags(limit: number = 20) {
  const response = await api.get('/stats/tags', { params: { limit } })
  return response.data
}

/**
 * 获取情感分布
 */
export async function getSentimentDistribution() {
  const response = await api.get('/stats/sentiment')
  return response.data
}

/**
 * 获取分类分布
 */
export async function getCategoryDistribution() {
  const response = await api.get('/stats/categories')
  return response.data
}

/**
 * 获取图表数据
 */
export async function getChartsData(days: number = 30) {
  const response = await api.get('/stats/charts', { params: { days } })
  return response.data
}

/**
 * 获取平台对比数据
 */
export async function getPlatformsComparison(days: number = 30) {
  const response = await api.get('/stats/platforms-comparison', { params: { days } })
  return response.data
}

/**
 * 获取热门产品图表数据
 */
export async function getTopProductsChart(limit: number = 10) {
  const response = await api.get('/stats/top-products-chart', { params: { limit } })
  return response.data
}

// ============================================================================
// 导出 API
// ============================================================================

/**
 * 导出 CSV
 */
export async function exportCSV(params: {
  query?: string
  platforms?: string
  sentiments?: string
  categories?: string
  time_range?: string
  min_upvotes?: number
  min_interaction_score?: number
  limit?: number
}) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
  const queryString = new URLSearchParams(params as any).toString()
  const url = `${API_BASE_URL}/export/csv?${queryString}`
  window.open(url, '_blank')
}

/**
 * 导出报告（JSON/PDF）
 */
export async function exportReport(
  format: 'json' | 'pdf',
  params: {
    query?: string
    platforms?: string
    sentiments?: string
    categories?: string
    time_range?: string
    min_upvotes?: number
    min_interaction_score?: number
    limit?: number
  }
) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
  const queryString = new URLSearchParams({ ...params, format }).toString()
  const url = `${API_BASE_URL}/export/report?${queryString}`
  window.open(url, '_blank')
}

// ============================================================================
// 健康检查
// ============================================================================

/**
 * 检查 API 健康状态
 */
export async function healthCheck() {
  const response = await api.get('/health')
  return response.data
}

// 导出 axios 实例以便使用拦截器
export default api
