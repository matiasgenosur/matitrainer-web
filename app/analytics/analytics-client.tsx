'use client'

import { motion } from 'framer-motion'
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import ZoneChart from '@/components/zone-chart'
import { Activity, WeeklyStats } from '@/lib/types'
import { formatPace } from '@/lib/utils'

interface AnalyticsClientProps {
  activities: Activity[]
  weeklyStats: WeeklyStats[]
}

const PHASES = [
  { week: '2026-02-10', label: 'Base', color: '#3b82f6' },
  { week: '2026-03-10', label: 'Build', color: '#8b5cf6' },
  { week: '2026-04-01', label: 'Peak', color: '#f97316' },
]

const CHART_TOOLTIP_STYLE = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
}

export default function AnalyticsClient({ activities, weeklyStats }: AnalyticsClientProps) {
  const runs = activities.filter(
    (a) => a.type === 'Run' && a.pace_min_km > 0 && a.pace_min_km < 15
  )

  // Pace trend data
  const paceTrend = [...runs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a, i) => ({
      x: i,
      y: a.pace_min_km,
      date: a.date.slice(5),
      name: a.name,
      km: a.distance_km,
    }))

  // HR over time
  const hrTrend = [...activities]
    .filter((a) => a.avg_hr && a.avg_hr > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      date: a.date.slice(5),
      hr: Math.round(a.avg_hr!),
      fcPct: a.fc_pct,
      name: a.name,
    }))

  // Cumulative elevation
  let cumElevation = 0
  const elevData = [...activities]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => {
      cumElevation += a.elevation_m
      return {
        date: a.date.slice(5),
        elevation: Math.round(cumElevation),
        activity: a.elevation_m,
      }
    })

  // Weekly km with phase annotations
  const weeklyKmData = weeklyStats.map((w) => ({
    week: w.weekLabel,
    km: Math.round(w.totalKm * 10) / 10,
    runKm: w.runKm,
  }))

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div style={CHART_TOOLTIP_STYLE} className="p-3 text-sm shadow-2xl">
          {label && <p className="text-gray-400 mb-1">{label}</p>}
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color || '#fff' }}>
              {p.name}: <span className="font-mono">{p.name.toLowerCase().includes('ritmo') ? formatPace(p.value) : p.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PaceTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { date: string; name: string; km: number; y: number } }[] }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div style={CHART_TOOLTIP_STYLE} className="p-3 text-sm shadow-2xl">
          <p className="text-white font-medium">{d.name}</p>
          <p className="text-gray-400">{d.date}</p>
          <p className="text-violet-400">Ritmo: {formatPace(d.y)}</p>
          <p className="text-gray-300">{d.km.toFixed(1)} km</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Pace trend + Zone dist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Tendencia de ritmo — Runs</h2>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="x"
                type="number"
                name="Run #"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Run nro.', fill: '#6b7280', fontSize: 11, position: 'insideBottom', offset: -2 }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="Ritmo"
                domain={['auto', 'auto']}
                reversed
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatPace(v)}
              />
              <Tooltip content={<PaceTooltip />} />
              <Scatter data={paceTrend} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Distribución de zonas HR</h2>
          <ZoneChart activities={activities} />
        </motion.div>
      </div>

      {/* Row 2: HR% trend + Elevation cumulative */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">FC% a lo largo del tiempo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hrTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[50, 95]} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v) => [`${v}%`, 'FC%']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Z4', fill: '#ef4444', fontSize: 10 }} />
              <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Z3', fill: '#f59e0b', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="fcPct"
                name="FC%"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Desnivel acumulado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={elevData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v) => [`${Number(v).toLocaleString()}m`, 'Desnivel acum.']}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="elevation" name="Desnivel acum." stroke="#22c55e" strokeWidth={2} fill="url(#elevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 3: Weekly km with phase annotations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Km semanales con fases de entrenamiento</h2>
          <div className="flex gap-3">
            {PHASES.map((p) => (
              <span key={p.label} className="text-xs font-medium" style={{ color: p.color }}>
                ● {p.label}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyKmData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit=" km" />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v) => [`${v} km`, 'Total']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area type="monotone" dataKey="km" name="Total km" stroke="#8b5cf6" strokeWidth={2} fill="url(#kmGrad)" dot={{ fill: '#8b5cf6', r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
