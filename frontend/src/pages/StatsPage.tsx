import { useState, useEffect } from 'react'
import { Loader2, Calendar } from 'lucide-react'
import { LineChart } from '../components/LineChart'
import { PieChart } from '../components/PieChart'
import { BarChart } from '../components/BarChart'
import { getChartsData, getPlatformsComparison, getTopProductsChart } from '../lib/api'

interface ChartsData {
  trends: {
    dates: string[]
    series: Array<{ name: string; data: number[] }>
  }
  sentiment: Record<string, number>
  categories: Record<string, number>
  platforms: Record<string, number>
}

interface PlatformComparison {
  platform: string
  total_count: number
  avg_score: number
  avg_upvotes: number
  avg_comments: number
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
}

interface TopProduct {
  name: string
  count: number
  avg_score: number
  avg_upvotes: number
  platforms: number
}

export function StatsPage() {
  const [days, setDays] = useState(30)
  const [chartsData, setChartsData] = useState<ChartsData | null>(null)
  const [platformComparison, setPlatformComparison] = useState<PlatformComparison[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [charts, comparison, products] = await Promise.all([
          getChartsData(days),
          getPlatformsComparison(days),
          getTopProductsChart(10),
        ])
        setChartsData(charts)
        setPlatformComparison(comparison)
        setTopProducts(products)
      } catch (error) {
        console.error('加载统计数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [days])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">加载统计数据...</span>
      </div>
    )
  }

  if (!chartsData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">暂无统计数据</p>
      </div>
    )
  }

  // 将平台数据转换为柱状图格式
  const platformChartData = Object.entries(chartsData.platforms).map(([name, count]) => ({
    name,
    count: count as number,
  }))

  // 转换分类数据
  const categoryChartData = Object.entries(chartsData.categories).map(([name, count]) => ({
    name,
    count: count as number,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* 页面头部 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数据统计</h1>
            <p className="mt-2 text-gray-600">查看需求趋势和平台数据分布</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value={7}>最近 7 天</option>
              <option value={14}>最近 14 天</option>
              <option value={30}>最近 30 天</option>
              <option value={90}>最近 90 天</option>
              <option value={180}>最近 180 天</option>
              <option value={365}>最近 1 年</option>
            </select>
          </div>
        </div>

        {/* 趋势图 */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <LineChart data={chartsData.trends} height={400} title="需求趋势（按平台）" />
        </div>

        {/* 饼图区域 */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* 情感分布 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <PieChart data={chartsData.sentiment} height={350} title="情感分布" />
          </div>

          {/* 分类分布 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <PieChart data={chartsData.categories} height={350} title="分类分布" />
          </div>
        </div>

        {/* 平台分布柱状图 */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <BarChart data={platformChartData} height={300} title="平台分布" />
        </div>

        {/* 热门产品柱状图 */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <BarChart data={topProducts} dataKey="count" height={350} title="热门产品排行" horizontal />
        </div>

        {/* 平台对比详情 */}
        {platformComparison.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              平台对比详情
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">平台</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">需求总数</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">平均互动分</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">平均点赞</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">平均评论</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">积极</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">消极</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">中性</th>
                  </tr>
                </thead>
                <tbody>
                  {platformComparison.map((item) => (
                    <tr key={item.platform} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {item.platform === 'reddit' && 'Reddit'}
                        {item.platform === 'github' && 'GitHub'}
                        {item.platform === 'twitter' && 'Twitter'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.total_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.avg_score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.avg_upvotes.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.avg_comments.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">{item.sentiment.positive}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">{item.sentiment.negative}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.sentiment.neutral}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
