import { useState, useEffect, useCallback } from 'react'
import { LayoutGrid, List, Database, BarChart3, Loader2, Bookmark as BookmarkIcon, User } from 'lucide-react'
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import { ResultsList } from './components/ResultsList'
import { Pagination } from './components/Pagination'
import { ExportButton } from './components/ExportButton'
import { TimeFilterEnum } from './types'
import {
  searchDemands,
  getPopularProducts,
  getPopularTags,
  getSearchSuggestions,
} from './lib/api'
import useSearchStore from './store/searchStore'
import { DemandResponse } from './types'
import { StatsPage } from './pages/StatsPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { BookmarksPage } from './pages/BookmarksPage'
import { useAuthStore } from './store/authStore'

type ViewMode = 'grid' | 'list'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [popularProducts, setPopularProducts] = useState<Array<{ name: string; count: number }>>([])
  const [popularTags, setPopularTags] = useState<Array<{ name: string; count: number }>>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const {
    query,
    filters,
    sortBy,
    page,
    pageSize,
    results,
    total,
    totalPages,
    isLoading,
    setResults,
    setPage,
    reset,
  } = useSearchStore()

  // 加载热门数据
  useEffect(() => {
    const loadPopularData = async () => {
      try {
        const [products, tags] = await Promise.all([
          getPopularProducts(20),
          getPopularTags(20),
        ])
        setPopularProducts(products)
        setPopularTags(tags)
      } catch (error) {
        console.error('加载热门数据失败:', error)
      }
    }
    loadPopularData()
  }, [])

  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    try {
      const response = await searchDemands({
        query,
        filters,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      })
      setResults(response.results, response.total, response.total_pages)
      navigate(`?q=${encodeURIComponent(query)}`, { replace: true })
    } catch (error) {
      console.error('搜索失败:', error)
    }
  }, [query, filters, sortBy, page, pageSize, setResults, navigate])

  // 获取搜索建议
  const loadSuggestions = async (q: string) => {
    if (q.length > 1) {
      try {
        const sugs = await getSearchSuggestions(q, 8)
        setSuggestions(sugs)
      } catch (error) {
        console.error('获取搜索建议失败:', error)
      }
    }
  }

  // 监听查询变化获取建议
  useEffect(() => {
    loadSuggestions(query)
  }, [query])

  // 初始加载（从URL参数）
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (q) {
      reset()
      // 这里需要通过 store 设置 query，然后执行搜索
      // 简化处理，手动触发
      handleSearch()
    }
  }, [])

  // 页码变化时重新搜索
  useEffect(() => {
    if (query && page > 1) {
      handleSearch()
    }
  }, [page])

  // 准备传递给 SearchPage 的 props
  const searchPageProps = {
    navigate,
    viewMode,
    setViewMode,
    popularProducts,
    popularTags,
    suggestions,
    isLoading,
    query,
    total,
    results,
    page,
    totalPages,
    pageSize,
    setPage,
    reset,
    filters,
    handleSearch,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <Header />

      <Routes>
        {/* 首页 - 搜索页面 */}
        <Route path="/" element={<SearchPage {...searchPageProps} />} />

        {/* 登录页面 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 注册页面 */}
        <Route path="/register" element={<RegisterPage />} />

        {/* 收藏页面 */}
        <Route path="/bookmarks" element={<BookmarksPage />} />

        {/* 统计页面 */}
        <Route path="/stats" element={<StatsPage />} />

        {/* 收集页面（占位） */}
        <Route path="/collect" element={<CollectPagePlaceholder />} />
      </Routes>

      {/* 页脚 */}
      <Footer />
    </div>
  )
}

// 搜索页面组件
function SearchPage({
  navigate,
  viewMode,
  setViewMode,
  popularProducts,
  popularTags,
  suggestions,
  isLoading,
  query,
  total,
  results,
  page,
  totalPages,
  pageSize,
  setPage,
  reset,
  filters,
  handleSearch,
}: any) {
  const getExportOptions = () => {
    const platforms = filters?.platforms?.length
      ? filters.platforms.map((p: any) => p).join(',')
      : undefined

    const sentiments = filters?.sentiments?.length
      ? filters.sentiments.map((s: any) => s).join(',')
      : undefined

    const categories = filters?.categories?.length
      ? filters.categories.join(',')
      : undefined

    return {
      query: query || undefined,
      platforms,
      sentiments,
      categories,
      timeRange: filters?.time_range,
      minUpvotes: filters?.min_upvotes || 0,
      minInteractionScore: filters?.min_interaction_score || 0,
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 搜索区域 */}
      <section className="mb-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            发现真实用户需求
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            聚合 Reddit、GitHub 和 Twitter 上的用户讨论，帮助产品决策
          </p>
          <SearchBar onSearch={handleSearch} suggestions={suggestions} isLoading={isLoading} />
        </div>
      </section>

      {/* 搜索结果区域 */}
      {query && (
        <div className="flex gap-6">
          {/* 左侧筛选面板 */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <FilterPanel popularProducts={popularProducts} popularTags={popularTags} />
          </aside>

          {/* 右侧结果列表 */}
          <div className="flex-1">
            {/* 结果头部 */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  搜索结果
                </h3>
                <p className="text-sm text-gray-500">
                  找到 {total} 条关于 "{query}" 的结果
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* 导出按钮 */}
                <ExportButton exportOptions={getExportOptions()} resultCount={total} />

                {/* 视图切换 */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              </div>
            </div>

            {/* 加载状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-500">搜索中...</span>
              </div>
            )}

            {/* 结果列表 */}
            {!isLoading && (
              <>
                <ResultsList results={results} viewMode={viewMode} />

                {/* 分页 */}
                <div className="mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 首页欢迎内容 */}
      {!query && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 快速搜索卡片 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">热门搜索</h3>
            <div className="space-y-2">
              {['Notion 离线模式', 'GitHub 协作功能', 'Notion API'].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    reset()
                    window.location.href = `/?q=${encodeURIComponent(q)}`
                  }}
                  className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 热门产品卡片 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">热门产品</h3>
            <div className="space-y-2">
              {popularProducts.slice(0, 5).map((product: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    reset()
                    window.location.href = `/?q=${encodeURIComponent(product.name)}`
                  }}
                  className="flex items-center justify-between w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-700">{product.name}</span>
                  <span className="text-xs text-gray-500">{product.count} 条</span>
                </button>
              ))}
            </div>
          </div>

          {/* 热门标签卡片 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">热门标签</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.slice(0, 10).map((tag: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    reset()
                    window.location.href = `/?q=${encodeURIComponent('#' + tag.name)}`
                  }}
                  className="rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// 头部导航
function Header() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">Idea Verify</h1>
        </div>
        <nav className="hidden sm:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            首页
          </Link>
          <Link
            to="/collect"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Database className="h-4 w-4" />
            数据收集
          </Link>
          <Link
            to="/stats"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <BarChart3 className="h-4 w-4" />
            数据统计
          </Link>
          {isAuthenticated ? (
            <Link
              to="/bookmarks"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <BookmarkIcon className="h-4 w-4" />
              我的收藏
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <User className="h-4 w-4" />
              登录
            </Link>
          )}
          {isAuthenticated && (
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-600">{user?.username}</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

// 页脚
function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          Idea Verify © 2025. 聚合真实用户需求，助力产品决策。
        </p>
      </div>
    </footer>
  )
}

// 收集页面占位符
function CollectPagePlaceholder() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center">
        <Database className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">数据收集</h2>
        <p className="mt-2 text-gray-600">
          此功能正在开发中，敬请期待...
        </p>
      </div>
    </main>
  )
}

export default App
