import { create } from 'zustand'
import {
  SearchRequest,
  SearchResponse,
  DemandResponse,
  SearchFilters,
  SortByEnum,
  PlatformEnum,
  SentimentEnum,
  TimeFilterEnum,
} from '@/types'

interface SearchState {
  // 搜索请求
  query: string
  filters: SearchFilters
  sortBy: SortByEnum
  page: number
  pageSize: number

  // 搜索结果
  results: DemandResponse[]
  total: number
  totalPages: number
  isLoading: boolean
  error: string | null

  // 操作
  setQuery: (query: string) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  setSortBy: (sortBy: SortByEnum) => void
  setPage: (page: number) => void
  setSearch: (search: Partial<SearchRequest>) => void
  setResults: (results: DemandResponse[], total: number, totalPages: number) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const defaultFilters: SearchFilters = {
  platforms: [PlatformEnum.ALL],
  sentiments: [],
  categories: [],
  products: [],
  tags: [],
  time_range: null,
  min_upvotes: 0,
  min_interaction_score: 0,
}

const useSearchStore = create<SearchState>((set) => ({
  // 初始状态
  query: '',
  filters: defaultFilters,
  sortBy: SortByEnum.RELEVANCE,
  page: 1,
  pageSize: 20,

  results: [],
  total: 0,
  totalPages: 0,
  isLoading: false,
  error: null,

  // 设置查询
  setQuery: (query) => set({ query, page: 1 }),

  // 设置筛选器（合并现有筛选器）
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1, // 重置到第一页
    })),

  // 设置排序
  setSortBy: (sortBy) => set({ sortBy }),

  // 设置页码
  setPage: (page) => set({ page }),

  // 设置完整搜索状态
  setSearch: (search) => set((state) => ({ ...state, ...search })),

  // 设置搜索结果
  setResults: (results, total, totalPages) =>
    set({ results, total, totalPages }),

  // 设置加载状态
  setLoading: (isLoading) => set({ isLoading }),

  // 重置搜索
  reset: () =>
    set({
      query: '',
      filters: defaultFilters,
      sortBy: SortByEnum.RELEVANCE,
      page: 1,
      results: [],
      total: 0,
      totalPages: 0,
      isLoading: false,
      error: null,
    }),
}))

export default useSearchStore
