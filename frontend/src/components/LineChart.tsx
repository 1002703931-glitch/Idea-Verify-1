import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface LineChartProps {
  data: {
    dates: string[]
    series: Array<{
      name: string
      data: number[]
    }>
  }
  height?: number
  showLegend?: boolean
  title?: string
}

export function LineChart({ data, height = 300, showLegend = true, title }: LineChartProps) {
  // 将数据转换为 Recharts 格式
  const chartData = data.dates.map((date, i) => {
    const point: any = { date }
    data.series.forEach(series => {
      point[series.name] = series.data[i] || 0
    })
    return point
  })

  const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6']

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#f9fafb',
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
            />
          )}
          {data.series.map((series, i) => (
            <Line
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
