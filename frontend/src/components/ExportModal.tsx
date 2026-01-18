import { useState } from 'react'
import { X, Download, FileText, FileSpreadsheet, FileCode } from 'lucide-react'
import { PlatformEnum, SentimentEnum, TimeFilterEnum } from '@/types'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  resultCount?: number
  exportOptions: ExportOptions
  onExport: (options: ExportOptions, format: 'csv' | 'json' | 'pdf') => void
}

export interface ExportOptions {
  query?: string
  platforms?: string
  sentiments?: string
  categories?: string
  timeRange?: TimeFilterEnum
  minUpvotes?: number
  minInteractionScore?: number
}

export function ExportModal({
  isOpen,
  onClose,
  resultCount,
  exportOptions,
  onExport
}: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv')
  const [limit, setLimit] = useState(1000)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            导出数据
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 导出格式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出格式
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  format === 'csv'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">CSV</span>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <FileCode className="h-6 w-6 text-yellow-600" />
                <span className="text-sm font-medium">JSON</span>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <FileText className="h-6 w-6 text-red-600" />
                <span className="text-sm font-medium">PDF</span>
              </button>
            </div>
          </div>

          {/* 导出数量限制 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出数量限制: <span className="text-blue-600 font-semibold">{limit}</span>
            </label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100</span>
              <span>10000</span>
            </div>
          </div>

          {/* 导出条件摘要 */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">当前筛选条件:</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {exportOptions.query && <li>• 关键词: {exportOptions.query}</li>}
              {exportOptions.platforms && <li>• 平台: {exportOptions.platforms}</li>}
              {exportOptions.sentiments && <li>• 情感: {exportOptions.sentiments}</li>}
              {exportOptions.categories && <li>• 分类: {exportOptions.categories}</li>}
              {exportOptions.timeRange && <li>• 时间范围: {exportOptions.timeRange}</li>}
              {exportOptions.minUpvotes && exportOptions.minUpvotes > 0 && (
                <li>• 最小点赞数: {exportOptions.minUpvotes}</li>
              )}
              {exportOptions.minInteractionScore && exportOptions.minInteractionScore > 0 && (
                <li>• 最小互动分数: {exportOptions.minInteractionScore}</li>
              )}
            </ul>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={() => onExport({ ...exportOptions, limit }, format)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Download className="h-5 w-5" />
            导出 {format.toUpperCase()} 文件
          </button>
        </div>
      </div>
    </div>
  )
}
