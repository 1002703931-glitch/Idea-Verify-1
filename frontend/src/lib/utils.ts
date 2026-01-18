import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * 获取平台图标颜色
 */
export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    reddit: 'bg-orange-500',
    github: 'bg-gray-800',
    twitter: 'bg-blue-400',
  }
  return colors[platform] || 'bg-gray-500'
}

/**
 * 获取情感颜色
 */
export function getSentimentColor(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: 'bg-green-100 text-green-800',
    negative: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800',
  }
  return colors[sentiment] || 'bg-gray-100 text-gray-800'
}

/**
 * 获取情感图标
 */
export function getSentimentEmoji(sentiment: string): string {
  const emojis: Record<string, string> = {
    positive: '👍',
    negative: '👎',
    neutral: '😐',
  }
  return emojis[sentiment] || '😐'
}

/**
 * 获取分类标签
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'feature-request': '功能请求',
    'bug-report': '错误报告',
    complaint: '抱怨',
    praise: '赞美',
    discussion: '讨论',
  }
  return labels[category] || category
}
