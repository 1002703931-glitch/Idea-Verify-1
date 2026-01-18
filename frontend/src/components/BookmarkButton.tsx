import { useState, useEffect } from 'react'
import { Bookmark, Bookmark as BookmarkIcon, Loader2 } from 'lucide-react'
import { createBookmark, deleteBookmark, checkBookmarked } from '../lib/auth'
import { useAuthStore } from '../store/authStore'

interface BookmarkButtonProps {
  demandId: string
  onToggle?: (bookmarked: boolean) => void
}

export function BookmarkButton({ demandId, onToggle }: BookmarkButtonProps) {
  const { token, isAuthenticated } = useAuthStore()
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 检查是否已收藏
    const checkBookmarkStatus = async () => {
      if (!isAuthenticated) return

      try {
        const result = await checkBookmarked(demandId, token)
        setBookmarked(result.bookmarked)
        setBookmarkId(result.bookmark_id)
      } catch (error) {
        console.error('检查收藏状态失败:', error)
      }
    }

    checkBookmarkStatus()
  }, [demandId, isAuthenticated, token])

  const handleToggle = async () => {
    if (!isAuthenticated) {
      // 未登录用户，跳转到登录页
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }

    setIsLoading(true)

    try {
      if (bookmarked && bookmarkId) {
        // 取消收藏
        await deleteBookmark(bookmarkId, token)
        setBookmarked(false)
        setBookmarkId(null)
        onToggle?.(false)
      } else {
        // 添加收藏
        const result = await createBookmark({ demand_id: demandId }, token)
        setBookmarked(true)
        setBookmarkId(result.id)
        onToggle?.(true)
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        bookmarked
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : bookmarked ? (
        <BookmarkIcon className="h-4 w-4 fill-current" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {bookmarked ? '已收藏' : '收藏'}
    </button>
  )
}
