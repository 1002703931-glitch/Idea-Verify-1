import { Search, X } from 'lucide-react'
import { useState, FormEvent, useEffect, useRef } from 'react'
import useSearchStore from '@/store/searchStore'

interface SearchBarProps {
  onSearch: () => void
  suggestions?: string[]
  isLoading?: boolean
}

export function SearchBar({ onSearch, suggestions = [], isLoading }: SearchBarProps) {
  const { query, setQuery } = useSearchStore()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // 过滤建议
  useEffect(() => {
    if (query.length > 1) {
      const filtered = suggestions
        .filter(s => s.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
      setLocalSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setLocalSuggestions([])
      setShowSuggestions(false)
    }
  }, [query, suggestions])

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < localSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectSuggestion(localSuggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      onSearch()
    }
  }

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setTimeout(() => onSearch(), 100)
  }

  const clearQuery = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (localSuggestions.length > 0) setShowSuggestions(true)
            }}
            onBlur={() => {
              // 延迟隐藏以允许点击建议
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            placeholder="搜索产品需求，例如：'Notion 离线模式' 或 'Notion missing features'"
            className="w-full rounded-full border border-gray-300 bg-white px-12 py-4 text-lg shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-20 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 rounded-full bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '搜索中...' : '搜索'}
          </button>
        </div>
      </form>

      {/* 搜索建议 */}
      {showSuggestions && localSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {localSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Search className="mr-2 inline h-4 w-4 text-gray-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 热门搜索提示 */}
      {!query && suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">热门搜索:</span>
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
