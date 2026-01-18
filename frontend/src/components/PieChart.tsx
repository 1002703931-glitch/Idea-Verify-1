import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PieChartProps {
  data: Record<string, number>
  height?: number
  title?: string
  showLegend?: boolean
  colors?: string[]
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',   // green
  negative: '#ef4444',   // red
  neutral: '#9ca3af',    // gray
}

const CATEGORY_COLORS: Record<string, string> = {
  'feature-request': '#3b82f6',  // blue
  'bug-report': '#ef4444',       // red
  'complaint': '#f59e0b',        // amber
  'praise': '#22c55e',           // green
  'discussion': '#8b5cf6',       // purple
}

export function PieChart({
  data,
  height = 300,
  title,
  showLegend = true,
  colors,
}: PieChartProps) {
  // 将数据转换为 Recharts 格式
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: formatLabel(name),
    value: value as number,
    originalName: name,
  }))

  // 确定使用的颜色
  const getColors = () => {
    if (colors) return colors

    // 检查是否是情感数据
    if (Object.keys(data).some(key => ['positive', 'negative', 'neutral'].includes(key))) {
      return chartData.map(item => SENTIMENT_COLORS[item.originalName] || DEFAULT_COLORS[0])
    }

    // 检查是否是分类数据
    if (Object.keys(data).some(key => ['feature-request', 'bug-report', 'complaint', 'praise', 'discussion'].includes(key))) {
      return chartData.map(item => CATEGORY_COLORS[item.originalName] || DEFAULT_COLORS[0])
    }

    return DEFAULT_COLORS
  }

  const pieColors = getColors()

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
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
              formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

// 格式化标签
function formatLabel(key: string): string {
  const labelMap: Record<string, string> = {
    positive: '积极',
    negative: '消极',
    neutral: '中性',
    'feature-request': '功能请求',
    'bug-report': 'Bug 报告',
    complaint: '抱怨',
    praise: '表扬',
    discussion: '讨论',
    reddit: 'Reddit',
    github: 'GitHub',
    twitter: 'Twitter',
  }
  return labelMap[key] || key
}
