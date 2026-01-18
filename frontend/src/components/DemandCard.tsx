import {
  ThumbsUp,
  MessageCircle,
  Share2,
  ExternalLink,
  Heart,
  MapPin,
  Star,
} from 'lucide-react'
import { DemandResponse } from '@/types'
import { BookmarkButton } from './BookmarkButton'
import {
  formatDate,
  formatNumber,
  getPlatformColor,
  getSentimentColor,
  getSentimentEmoji,
  getCategoryLabel,
  cn,
} from '@/lib/utils'

interface DemandCardProps {
  demand: DemandResponse
}

export function DemandCard({ demand }: DemandCardProps) {
  const platformIcon = () => {
    switch (demand.platform) {
      case 'reddit':
        return <span className="font-bold text-orange-500">Reddit</span>
      case 'github':
        return <span className="font-bold text-gray-800">GitHub</span>
      case 'twitter':
        return <span className="font-bold text-blue-400">Twitter</span>
      default:
        return <span>{demand.platform}</span>
    }
  }

  return (
    <article className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      {/* 头部信息 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-white text-xs',
              getPlatformColor(demand.platform)
            )}
          >
            {demand.platform.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {platformIcon()}
              {demand.subreddit && (
                <span className="text-sm text-gray-500">r/{demand.subreddit}</span>
              )}
              {demand.repository && (
                <span className="text-sm text-gray-500">{demand.repository}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{demand.author || '匿名用户'}</span>
              <span>•</span>
              <span>{formatDate(demand.timestamp)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 情感标签 */}
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              getSentimentColor(demand.sentiment)
            )}
          >
            {getSentimentEmoji(demand.sentiment)}
            {demand.sentiment === 'positive' && '积极'}
            {demand.sentiment === 'negative' && '消极'}
            {demand.sentiment === 'neutral' && '中性'}
          </span>
        </div>
      </div>

      {/* 标题 */}
      {demand.title && (
        <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-primary-600">
          {demand.title}
        </h3>
      )}

      {/* 内容 */}
      <p className="mb-4 text-gray-700 line-clamp-3">{demand.content}</p>

      {/* 标签 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {demand.category && (
          <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
            {getCategoryLabel(demand.category)}
          </span>
        )}
        {demand.tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
          >
            #{tag}
          </span>
        ))}
        {demand.product_mentioned.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
            {demand.product_mentioned[0]}
          </span>
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        {/* 互动数据 */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" />
            <span>{formatNumber(demand.upvotes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            <span>{formatNumber(demand.comments)}</span>
          </div>
          {demand.shares > 0 && (
            <div className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span>{formatNumber(demand.shares)}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <BookmarkButton demandId={demand.id} />
          <a
            href={demand.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            查看原文
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  )
}

interface DemandCardCompactProps {
  demand: DemandResponse
}

export function DemandCardCompact({ demand }: DemandCardCompactProps) {
  return (
    <article className="group flex gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      {/* 平台图标 */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${getPlatformColor(
          demand.platform
        )}`}
      >
        {demand.platform.charAt(0).toUpperCase()}
      </div>

      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <h4 className="mb-1 truncate text-sm font-semibold text-gray-900 group-hover:text-primary-600">
          {demand.title || demand.content.slice(0, 60)}
        </h4>
        <p className="mb-2 line-clamp-2 text-sm text-gray-600">{demand.content}</p>

        {/* 元数据 */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{formatDate(demand.timestamp)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {formatNumber(demand.upvotes)}
          </span>
          {demand.category && (
            <>
              <span>•</span>
              <span>{getCategoryLabel(demand.category)}</span>
            </>
          )}
        </div>
      </div>

      {/* 情感 */}
      <div
        className={`shrink-0 rounded-full px-2 py-1 text-xs ${getSentimentColor(demand.sentiment)}`}
      >
        {getSentimentEmoji(demand.sentiment)}
      </div>
    </article>
  )
}
