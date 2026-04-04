'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity } from '@/lib/types'

interface ZoneChartProps {
  activities: Activity[]
}

const ZONES = [
  { key: 'z1_min', label: 'Zona 1', color: '#3b82f6' },
  { key: 'z2_min', label: 'Zona 2', color: '#22c55e' },
  { key: 'z3_min', label: 'Zona 3', color: '#f59e0b' },
  { key: 'z4_min', label: 'Zona 4', color: '#f97316' },
  { key: 'z5_min', label: 'Zona 5', color: '#ef4444' },
]

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
  if (active && payload && payload.length) {
    const hours = Math.floor(payload[0].value / 60)
    const mins = Math.round(payload[0].value % 60)
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-medium">{payload[0].name}</p>
        <p className="text-sm text-gray-300">{timeStr}</p>
      </div>
    )
  }
  return null
}

export default function ZoneChart({ activities }: ZoneChartProps) {
  const totals = ZONES.map((z) => ({
    name: z.label,
    value: Math.round(activities.reduce((sum, a) => sum + (a[z.key as keyof Activity] as number || 0), 0)),
    color: z.color,
  })).filter((z) => z.value > 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={totals}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {totals.map((entry, index) => (
            <Cell key={index} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
