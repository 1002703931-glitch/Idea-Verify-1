import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark as BookmarkIcon, Loader2, Trash2, Edit, LogOut } from 'lucide-react'
import { getBookmarks, deleteBookmark, type BookmarkResponse } from '../lib/auth'
import { useAuthStore } from '../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function BookmarksPage() {
  const { user, token, logout } = useAuthStore()
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadBookmarks = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const data = await getBookmarks(token)
      setBookmarks(data)
    } catch (error) {
      console.error('加载收藏失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBookmarks()
  }, [token])

  const handleDelete = async (bookmarkId: string) => {
    if (!token) return

    if (!confirm('确定要删除这个收藏吗？')) return

    try {
      await deleteBookmark(bookmarkId, token)
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId))
    } catch (error) {
      console.error('删除收藏失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookmarkIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">需要登录</h2>
          <p className="mt-2 text-gray-600">请登录后查看您的收藏</p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            去登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">我的收藏</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.username}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookmarkIcon className="h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">还没有收藏</h3>
            <p className="mt-2 text-gray-500">
              收集的需求会显示在这里
            </p>
            <Link
              to="/"
              className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              去搜索
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              共 {bookmarks.length} 个收藏
            </p>
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {/* 需求内容 */}
                <div className="mb-4">
                  <p className="text-gray-900 dark:text-white">
                    {bookmark.demand.content}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700">
                      {bookmark.demand.platform}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(bookmark.demand.timestamp), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </div>

                {/* 自定义信息 */}
                {(bookmark.custom_notes ||
                  (bookmark.custom_tags && bookmark.custom_tags.length > 0) ||
                  bookmark.custom_category) && (
                  <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                    {bookmark.custom_notes && (
                      <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">备注：</span>
                        {bookmark.custom_notes}
                      </p>
                    )}
                    {bookmark.custom_tags && bookmark.custom_tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          标签：
                        </span>
                        {bookmark.custom_tags.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {bookmark.custom_category && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">分类：</span>
                        {bookmark.custom_category}
                      </p>
                    )}
                  </div>
                )}

                {/* 底部操作 */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <a
                    href={bookmark.demand.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    查看原文 &rarr;
                  </a>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
