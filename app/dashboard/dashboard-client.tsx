'use client'

import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Activity } from '@/lib/types'

interface DashboardClientProps {
  activities: Activity[]
}

export default function DashboardClient({ activities }: DashboardClientProps) {
  // Build fatigue chart data — last 10 activities
  const recent = [...activities]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)
    .map((a) => ({
      date: a.date.slice(5), // MM-DD
      fatigue: a.fatigue_score,
      km: a.distance_km,
      name: a.name,
    }))

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl text-sm">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: <span className="font-mono">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
    >
      <h2 className="text-sm font-semibold text-white mb-4">Fatiga & volumen — últimas actividades</h2>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={recent} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" km"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
          <Bar yAxisId="right" dataKey="km" name="Distancia km" fill="#8b5cf6" opacity={0.4} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="fatigue"
            name="Fatiga"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
