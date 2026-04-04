'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { WeeklyStats } from '@/lib/types'

interface WeeklyChartProps {
  data: WeeklyStats[]
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-sm" style={{ color: p.color }}>
            {p.name}: <span className="font-mono">{p.value.toFixed(1)} km</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const chartData = data.map((w) => ({
    week: w.weekLabel,
    Run: w.runKm,
    Hike: w.hikeKm,
    Soccer: w.soccerKm,
    Otro: w.otherKm,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit=" km"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: '#9ca3af', fontSize: 12 }}
          formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
        />
        <Bar dataKey="Run" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Hike" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Soccer" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Otro" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
