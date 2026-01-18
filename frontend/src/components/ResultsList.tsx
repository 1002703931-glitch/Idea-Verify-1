import { DemandCard, DemandCardCompact } from './DemandCard'
import { DemandResponse } from '@/types'

interface ResultsListProps {
  results: DemandResponse[]
  viewMode: 'grid' | 'list'
}

export function ResultsList({ results, viewMode }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-6">
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">未找到相关结果</h3>
        <p className="max-w-md text-gray-500">
          尝试调整搜索关键词或筛选条件，或者尝试收集更多数据。
        </p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {results.map((demand) => (
          <DemandCard key={demand.id} demand={demand} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((demand) => (
        <DemandCardCompact key={demand.id} demand={demand} />
      ))}
  </div>
  )
}
