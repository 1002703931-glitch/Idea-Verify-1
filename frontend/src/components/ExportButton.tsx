import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { ExportModal, ExportOptions } from './ExportModal'

interface ExportButtonProps {
  exportOptions: ExportOptions
  resultCount?: number
}

export function ExportButton({ exportOptions, resultCount }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (options: ExportOptions, format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      // 构建 URL 参数
      const params = new URLSearchParams()

      if (options.query) params.append('query', options.query)
      if (options.platforms) params.append('platforms', options.platforms)
      if (options.sentiments) params.append('sentiments', options.sentiments)
      if (options.categories) params.append('categories', options.categories)
      if (options.timeRange) params.append('time_range', options.timeRange)
      if (options.minUpvotes && options.minUpvotes > 0) {
        params.append('min_upvotes', options.minUpvotes.toString())
      }
      if (options.minInteractionScore && options.minInteractionScore > 0) {
        params.append('min_interaction_score', options.minInteractionScore.toString())
      }
      if (options.limit) params.append('limit', options.limit.toString())
      params.append('format', format)

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const url = `${API_BASE_URL}/export/${format === 'csv' ? 'csv' : 'report'}?${params.toString()}`

      // 直接下载文件
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`导出失败: ${response.statusText}`)
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `export.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }

      // 获取内容并创建下载链接
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

    } catch (error) {
      console.error('导出失败:', error)
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            导出中...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            导出数据
          </>
        )}
      </button>

      <ExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        resultCount={resultCount}
        exportOptions={exportOptions}
        onExport={handleExport}
      />
    </>
  )
}
