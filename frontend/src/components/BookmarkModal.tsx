import { useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { updateBookmark, type BookmarkUpdateData } from '../lib/auth'

interface BookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  bookmark: {
    id: string
    custom_notes: string | null
    custom_tags: string[]
    custom_category: string | null
  } | null
  onSave?: (updatedBookmark: any) => void
}

export function BookmarkModal({ isOpen, onClose, bookmark, onSave }: BookmarkModalProps) {
  const [notes, setNotes] = useState(bookmark?.custom_notes || '')
  const [tags, setTags] = useState(bookmark?.custom_tags?.join(', ') || '')
  const [category, setCategory] = useState(bookmark?.custom_category || '')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen || !bookmark) return null

  const handleSave = async () => {
    setIsLoading(true)

    try {
      const updateData: BookmarkUpdateData = {
        custom_notes: notes || undefined,
        custom_tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
        custom_category: category || undefined,
      }

      const updated = await updateBookmark(bookmark.id, updateData, localStorage.getItem('token') || '')
      onSave?.(updated)
      onClose()
    } catch (error) {
      console.error('更新收藏失败:', error)
      alert('更新失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            编辑收藏
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 备注输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              备注说明
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加关于这个需求的备注..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* 标签输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义标签
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用逗号分隔多个标签，例如：重要,待处理"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              用逗号分隔多个标签
            </p>
          </div>

          {/* 分类输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义分类
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：功能请求、Bug反馈"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                保存修改
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
