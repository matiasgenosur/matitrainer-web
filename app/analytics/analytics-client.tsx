'use client'

import { motion } from 'framer-motion'
import {
  ScatterChart, Scatter, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Bar,
} from 'recharts'
import ZoneChart from '@/components/zone-chart'
import { Activity, WeeklyStats } from '@/lib/types'
import { formatPace } from '@/lib/utils'

interface AnalyticsClientProps {
  activities: Activity[]
  weeklyStats: WeeklyStats[]
}

const CHART_TOOLTIP_STYLE = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
}

const PHASES = [
  { week: '2026-02-10', label: 'Base', color: '#3b82f6' },
  { week: '2026-03-10', label: 'Build', color: '#8b5cf6' },
  { week: '2026-04-01', label: 'Peak', color: '#f97316' },
]

export default function AnalyticsClient({ activities, weeklyStats }: AnalyticsClientProps) {
  const runs = activities.filter(
    (a) => (a.type === 'Run' || a.sport_type === 'TrailRun') && a.pace_min_km > 0 && a.pace_min_km < 15
  )
  const roadRuns = runs.filter((a) => a.sport_type !== 'TrailRun')
  const trailRuns = runs.filter((a) => a.sport_type === 'TrailRun')

  // Pace trend data split by type
  const makePaceData = (list: Activity[]) =>
    [...list]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((a, i) => ({
        x: i,
        y: a.pace_min_km,
        date: a.date.slice(5),
        name: a.name,
        km: a.distance_km,
      }))

  const roadPaceTrend = makePaceData(roadRuns)
  const trailPaceTrend = makePaceData(trailRuns)

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
      return { date: a.date.slice(5), elevation: Math.round(cumElevation), activity: a.elevation_m }
    })

  // Weekly km with phase annotations
  const weeklyKmData = weeklyStats.map((w) => ({
    week: w.weekLabel,
    km: Math.round(w.totalKm * 10) / 10,
    runKm: w.runKm,
  }))

  // Cadence trend (runs with avg_cadence)
  const cadenceTrend = [...runs]
    .filter((a) => a.avg_cadence && a.avg_cadence > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      date: a.date.slice(5),
      cadence: Math.round(a.avg_cadence!),
      pace: a.pace_min_km,
      name: a.name,
      isTrail: a.sport_type === 'TrailRun',
    }))

  // Shoe tracker
  const shoeMap = new Map<string, { km: number; count: number; lastDate: string }>()
  activities.forEach((a) => {
    if (!a.gear_name) return
    const existing = shoeMap.get(a.gear_name) ?? { km: 0, count: 0, lastDate: '' }
    shoeMap.set(a.gear_name, {
      km: existing.km + a.distance_km,
      count: existing.count + 1,
      lastDate: a.date > existing.lastDate ? a.date : existing.lastDate,
    })
  })
  const shoes = Array.from(shoeMap.entries())
    .map(([name, data]) => ({ name, ...data, km: Math.round(data.km) }))
    .sort((a, b) => b.km - a.km)
  const SHOE_MAX_KM = 700

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

  const CadenceTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { date: string; name: string; cadence: number; pace: number; isTrail: boolean } }[] }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div style={CHART_TOOLTIP_STYLE} className="p-3 text-sm shadow-2xl">
          <p className="text-white font-medium">{d.name}</p>
          <p className="text-gray-400">{d.date}</p>
          <p className="text-cyan-400">{d.cadence} spm</p>
          <p className="text-gray-300">{formatPace(d.pace)}</p>
          {d.isTrail && <p className="text-emerald-400 text-xs">Trail</p>}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">

      {/* Row 1: Pace trend (Road vs Trail) + Zone distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Tendencia de ritmo</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              <span><span className="text-violet-400">●</span> Ruta ({roadRuns.length})</span>
              <span><span className="text-emerald-400">●</span> Trail ({trailRuns.length})</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="x" type="number" name="Run #"
                tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: 'Run nro.', fill: '#6b7280', fontSize: 11, position: 'insideBottom', offset: -2 }}
              />
              <YAxis
                dataKey="y" type="number" name="Ritmo"
                domain={['auto', 'auto']} reversed
                tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => formatPace(v)}
              />
              <Tooltip content={<PaceTooltip />} />
              <Scatter data={roadPaceTrend} fill="#8b5cf6" name="Ruta" />
              <Scatter data={trailPaceTrend} fill="#22c55e" name="Trail" shape="triangle" />
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

      {/* Row 2: HR% trend + Cadence trend */}
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
              <Line type="monotone" dataKey="fcPct" name="FC%" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Cadencia</h2>
            <span className="text-xs text-gray-500">Óptimo: 170–180 spm</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cadenceTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit=" spm" domain={['auto', 'auto']} />
              <Tooltip content={<CadenceTooltip />} />
              <ReferenceLine y={180} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: '180', fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={170} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: '170', fill: '#22c55e', fontSize: 10 }} />
              <Bar dataKey="cadence" fill="#8b5cf6" fillOpacity={0.6} radius={[2, 2, 0, 0]} maxBarSize={16} />
              <Line type="monotone" dataKey="cadence" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 3: Weekly km + Cumulative elevation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Km semanales</h2>
            <div className="flex gap-3">
              {PHASES.map((p) => (
                <span key={p.label} className="text-xs font-medium" style={{ color: p.color }}>● {p.label}</span>
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
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v} km`, 'Total']} labelStyle={{ color: '#9ca3af' }} />
              <Area type="monotone" dataKey="km" name="Total km" stroke="#8b5cf6" strokeWidth={2} fill="url(#kmGrad)" dot={{ fill: '#8b5cf6', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Desnivel acumulado</h2>
          <ResponsiveContainer width="100%" height={200}>
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

      {/* Row 4: Shoe tracker */}
      {shoes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Zapatillas</h2>
            <span className="text-xs text-gray-500">Vida útil estimada: {SHOE_MAX_KM} km</span>
          </div>
          <div className="space-y-3">
            {shoes.map((shoe) => {
              const pct = Math.min(100, (shoe.km / SHOE_MAX_KM) * 100)
              const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'
              const remaining = SHOE_MAX_KM - shoe.km
              return (
                <div key={shoe.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate max-w-[60%]" title={shoe.name}>
                      👟 {shoe.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      <span>{shoe.count} actividades</span>
                      <span className="font-mono text-white">{shoe.km} km</span>
                      {remaining > 0
                        ? <span style={{ color }} className="font-medium">{remaining} km restantes</span>
                        : <span className="text-red-400 font-medium">¡Reemplazar!</span>
                      }
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
