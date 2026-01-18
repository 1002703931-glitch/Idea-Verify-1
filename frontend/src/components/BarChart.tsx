import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface BarChartProps {
  data: Array<{
    name: string
    count: number
    [key: string]: any
  }>
  dataKey?: string
  height?: number
  title?: string
  showLegend?: boolean
  horizontal?: boolean
  colors?: string[]
}

const PLATFORM_COLORS: Record<string, string> = {
  reddit: '#ff4500',    // Reddit orange-red
  github: '#24292e',   // GitHub dark
  twitter: '#1da1f2',  // Twitter blue
}

export function BarChart({
  data,
  dataKey = 'count',
  height = 300,
  title,
  showLegend = true,
  horizontal = false,
  colors,
}: BarChartProps) {
  // 格式化数据标签
  const formatLabel = (name: string): string => {
    const labelMap: Record<string, string> = {
      reddit: 'Reddit',
      github: 'GitHub',
      twitter: 'Twitter',
    }
    return labelMap[name] || name
  }

  // 格式化数据以供 Recharts 使用
  const chartData = data.map(item => ({
    name: formatLabel(item.name),
    count: item.count,
    avg_score: item.avg_score,
    avg_upvotes: item.avg_upvotes,
    avg_comments: item.avg_comments,
    platforms: item.platforms,
    originalName: item.name,
  }))

  // 获取填充颜色
  const getFill = (name: string): string => {
    if (colors && colors.length > 0) {
      const index = chartData.findIndex(item => item.name === name)
      return colors[index % colors.length]
    }
    return PLATFORM_COLORS[name] || '#3b82f6'
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          {horizontal ? (
            <>
              <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={60} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#f9fafb',
            }}
            formatter={(value: number, name: string) => [value, formatLabel(name)]}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
            />
          )}
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
