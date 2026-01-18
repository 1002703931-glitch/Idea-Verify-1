import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  PlatformEnum,
  SentimentEnum,
  TimeFilterEnum,
  SortByEnum,
} from '@/types'
import useSearchStore from '@/store/searchStore'

interface FilterPanelProps {
  popularProducts?: Array<{ name: string; count: number }>
  popularTags?: Array<{ name: string; count: number }>
}

export function FilterPanel({ popularProducts = [], popularTags = [] }: FilterPanelProps) {
  const { filters, sortBy, setFilters, setSortBy } = useSearchStore()
  const [expandedSections, setExpandedSections] = useState({
    platforms: true,
    sentiments: true,
    products: false,
    tags: false,
    timeRange: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const togglePlatform = (platform: PlatformEnum) => {
    const isAllSelected = filters.platforms.includes(PlatformEnum.ALL)
    if (isAllSelected) {
      // 如果之前是全选，现在取消全选，只选当前点击的
      setFilters({ platforms: [platform] })
    } else {
      if (filters.platforms.includes(platform)) {
        // 取消选择
        const newPlatforms = filters.platforms.filter(p => p !== platform)
        setFilters({ platforms: newPlatforms.length ? newPlatforms : [PlatformEnum.ALL] })
      } else {
        // 添加选择
        setFilters({ platforms: [...filters.platforms, platform] })
      }
    }
  }

  const toggleSentiment = (sentiment: SentimentEnum) => {
    const newSentiments = filters.sentiments.includes(sentiment)
      ? filters.sentiments.filter(s => s !== sentiment)
      : [...filters.sentiments, sentiment]
    setFilters({ sentiments: newSentiments })
  }

  const toggleProduct = (product: string) => {
    const newProducts = filters.products.includes(product)
      ? filters.products.filter(p => p !== product)
      : [...filters.products, product]
    setFilters({ products: newProducts })
  }

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    setFilters({ tags: newTags })
  }

  const clearFilters = () => {
    setFilters({
      platforms: [PlatformEnum.ALL],
      sentiments: [],
      categories: [],
      products: [],
      tags: [],
      time_range: null,
      min_upvotes: 0,
      min_interaction_score: 0,
    })
  }

  const hasActiveFilters = !(
    filters.platforms.includes(PlatformEnum.ALL) &&
    filters.sentiments.length === 0 &&
    filters.products.length === 0 &&
    filters.tags.length === 0 &&
    !filters.time_range &&
    filters.min_upvotes === 0 &&
    filters.min_interaction_score === 0
  )

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold">筛选条件</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            清除
          </button>
        )}
      </div>

      {/* 平台筛选 */}
      <FilterSection
        title="平台"
        expanded={expandedSections.platforms}
        onToggle={() => toggleSection('platforms')}
      >
        <div className="flex flex-wrap gap-2">
          <PlatformButton
            label="全部"
            active={filters.platforms.includes(PlatformEnum.ALL)}
            onClick={() => setFilters({ platforms: [PlatformEnum.ALL] })}
          />
          <PlatformButton
            label="Reddit"
            platform="reddit"
            active={filters.platforms.includes(PlatformEnum.REDDIT)}
            onClick={() => togglePlatform(PlatformEnum.REDDIT)}
          />
          <PlatformButton
            label="GitHub"
            platform="github"
            active={filters.platforms.includes(PlatformEnum.GITHUB)}
            onClick={() => togglePlatform(PlatformEnum.GITHUB)}
          />
          <PlatformButton
            label="Twitter"
            platform="twitter"
            active={filters.platforms.includes(PlatformEnum.TWITTER)}
            onClick={() => togglePlatform(PlatformEnum.TWITTER)}
          />
        </div>
      </FilterSection>

      {/* 情感筛选 */}
      <FilterSection
        title="情感"
        expanded={expandedSections.sentiments}
        onToggle={() => toggleSection('sentiments')}
      >
        <div className="flex flex-wrap gap-2">
          <SentimentButton
            label="积极"
            active={filters.sentiments.includes(SentimentEnum.POSITIVE)}
            onClick={() => toggleSentiment(SentimentEnum.POSITIVE)}
            color="bg-green-100 text-green-800 hover:bg-green-200"
          />
          <SentimentButton
            label="消极"
            active={filters.sentiments.includes(SentimentEnum.NEGATIVE)}
            onClick={() => toggleSentiment(SentimentEnum.NEGATIVE)}
            color="bg-red-100 text-red-800 hover:bg-red-200"
          />
          <SentimentButton
            label="中性"
            active={filters.sentiments.includes(SentimentEnum.NEUTRAL)}
            onClick={() => toggleSentiment(SentimentEnum.NEUTRAL)}
            color="bg-gray-100 text-gray-800 hover:bg-gray-200"
          />
        </div>
      </FilterSection>

      {/* 时间范围 */}
      <FilterSection
        title="时间范围"
        expanded={expandedSections.timeRange}
        onToggle={() => toggleSection('timeRange')}
      >
        <select
          value={filters.time_range || ''}
          onChange={(e) => setFilters({ time_range: e.target.value as TimeFilterEnum | null })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">不限</option>
          <option value="hour">最近1小时</option>
          <option value="day">最近1天</option>
          <option value="week">最近1周</option>
          <option value="month">最近1月</option>
          <option value="year">最近1年</option>
        </select>
      </FilterSection>

      {/* 产品筛选 */}
      {popularProducts.length > 0 && (
        <FilterSection
          title={`热门产品 (${popularProducts.length})`}
          expanded={expandedSections.products}
          onToggle={() => toggleSection('products')}
        >
          <div className="flex flex-wrap gap-2">
            {popularProducts.slice(0, 10).map(product => (
              <TagButton
                key={product.name}
                label={`${product.name} (${product.count})`}
                active={filters.products.includes(product.name)}
                onClick={() => toggleProduct(product.name)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* 标签筛选 */}
      {popularTags.length > 0 && (
        <FilterSection
          title={`热门标签 (${popularTags.length})`}
          expanded={expandedSections.tags}
          onToggle={() => toggleSection('tags')}
        >
          <div className="flex flex-wrap gap-2">
            {popularTags.slice(0, 15).map(tag => (
              <TagButton
                key={tag.name}
                label={tag.name}
                active={filters.tags.includes(tag.name)}
                onClick={() => toggleTag(tag.name)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* 排序 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">排序方式</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortByEnum)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value={SortByEnum.RELEVANCE}>相关性</option>
          <option value={SortByEnum.NEWEST}>最新</option>
          <option value={SortByEnum.OLDEST}>最早</option>
          <option value={SortByEnum.POPULAR}>最热门</option>
        </select>
      </div>
    </div>
  )
}

// 子组件：筛选区域
function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}

// 子组件：平台按钮
function PlatformButton({
  label,
  platform,
  active,
  onClick,
}: {
  label: string
  platform?: string
  active: boolean
  onClick: () => void
}) {
  const colors: Record<string, string> = {
    reddit: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    github: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
    twitter: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? platform
            ? colors[platform]
            : 'bg-primary-600 text-white border-primary-600'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      } border`}
    >
      {label}
    </button>
  )
}

// 子组件：情感按钮
function SentimentButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? color : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

// 子组件：标签按钮
function TagButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active
          ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}
