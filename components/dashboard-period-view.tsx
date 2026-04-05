'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Activity } from '@/lib/types'
import { formatPace, formatDistance, formatTime, getActivityIcon, formatDate } from '@/lib/utils'

type Period = '7d' | '14d' | '30d' | '1y'

const PERIODS: { key: Period; label: string; days: number; future: number }[] = [
  { key: '7d',  label: 'Últimos 7 días',  days: 7,   future: 3 },
  { key: '14d', label: 'Últimos 14 días', days: 14,  future: 0 },
  { key: '30d', label: 'Últimos 30 días', days: 30,  future: 0 },
  { key: '1y',  label: 'Último año',      days: 365, future: 0 },
]

function todaySantiago(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDayLabel(dateStr: string, todayStr: string): string {
  const diff = Math.round(
    (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
  )
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  if (diff === 2) return 'Pasado'
  if (diff === 3) return 'En 3 días'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 shadow-2xl text-sm">
      <p className="text-white font-medium mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

interface TrainingPlan {
  date: string
  planned_activity: string
  distance_km?: number
  session_type?: string
  notes?: string
}

export default function DashboardPeriodView({
  activities,
  trainingPlans = [],
}: {
  activities: Activity[]
  trainingPlans?: TrainingPlan[]
}) {
  const [period, setPeriod] = useState<Period>('7d')
  const [open, setOpen] = useState(false)

  const selected = PERIODS.find(p => p.key === period)!
  const today = todaySantiago()
  const fromDate = addDays(today, -selected.days)
  const toDate = addDays(today, selected.future)

  // Activities in range (past only — Strava only has completed activities)
  const inRange = activities
    .filter(a => a.date >= fromDate && a.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Training plans indexed by date
  const planByDate = new Map(trainingPlans.map(p => [p.date, p]))

  // Chart data
  const chartData = [...inRange]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(a => ({
      date: a.date.slice(5),
      fatigue: a.fatigue_score,
      km: a.distance_km,
    }))

  // For 7d: build day-by-day grid (past 7 + next 3)
  const activitiesByDate = new Map<string, Activity[]>()
  inRange.forEach(a => {
    if (!activitiesByDate.has(a.date)) activitiesByDate.set(a.date, [])
    activitiesByDate.get(a.date)!.push(a)
  })

  const dayGrid: string[] = []
  for (let i = selected.days; i >= 1; i--) dayGrid.push(addDays(today, -i))
  dayGrid.push(today)
  for (let i = 1; i <= selected.future; i++) dayGrid.push(addDays(today, i))

  return (
    <div className="space-y-5">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Actividades</h2>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors text-sm text-gray-300 hover:text-white"
          >
            <span>{selected.label}</span>
            <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-2xl z-20 overflow-hidden"
              >
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setPeriod(p.key); setOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      p.key === period
                        ? 'text-violet-400 bg-violet-500/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 7-day view: day-by-day grid */}
      {period === '7d' && (
        <div className="space-y-2">
          {dayGrid.map(dateStr => {
            const acts = activitiesByDate.get(dateStr) || []
            const isFuture = dateStr > today
            const isToday = dateStr === today
            const label = formatDayLabel(dateStr, today)

            return (
              <div
                key={dateStr}
                className={`rounded-xl border transition-colors ${
                  isToday
                    ? 'border-violet-500/40 bg-violet-500/5'
                    : isFuture
                    ? 'border-white/5 bg-white/2'
                    : acts.length > 0
                    ? 'border-white/10 bg-white/5'
                    : 'border-white/5 bg-transparent'
                }`}
              >
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-2">
                  <span className={`text-xs font-semibold w-20 shrink-0 ${isToday ? 'text-violet-400' : isFuture ? 'text-gray-500' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-600">
                    {new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                  {isFuture && !planByDate.has(dateStr) && (
                    <span className="ml-auto text-xs text-gray-700 italic">Sin plan</span>
                  )}
                  {!isFuture && acts.length === 0 && !isToday && (
                    <span className="ml-auto text-xs text-gray-700">—</span>
                  )}
                </div>

                {/* Planned activity (future days from Claude) */}
                {isFuture && planByDate.has(dateStr) && (() => {
                  const plan = planByDate.get(dateStr)!
                  return (
                    <div className="flex items-center gap-3 px-4 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-base shrink-0">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cyan-300 truncate">{plan.planned_activity}</p>
                        {plan.notes && <p className="text-xs text-gray-500">{plan.notes}</p>}
                      </div>
                      {plan.distance_km && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono text-cyan-400">{plan.distance_km}km</p>
                          {plan.session_type && <p className="text-xs text-gray-500">{plan.session_type}</p>}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Activities for this day */}
                {acts.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3 px-4 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-base shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{activity.name}</p>
                      <p className="text-xs text-gray-500">{activity.session_type}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-mono text-white">{formatDistance(activity.distance_km)}</p>
                      <p className="text-xs text-gray-400">{formatPace(activity.pace_min_km)}</p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0 space-y-0.5">
                      <p className="text-sm text-gray-300">{formatTime(activity.moving_time_min)}</p>
                      <p className="text-xs text-gray-500">Fatiga: {activity.fatigue_score}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* 14d / 30d / 1y: activity list */}
      {period !== '7d' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
          {inRange.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No hay actividades en este período.</p>
          )}
          {inRange.map(activity => (
            <div key={activity.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{activity.name}</p>
                <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-white">{formatDistance(activity.distance_km)}</p>
                <p className="text-xs text-gray-400">{formatPace(activity.pace_min_km)}</p>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <p className="text-sm text-gray-300">{formatTime(activity.moving_time_min)}</p>
                <p className="text-xs text-gray-500">Fatiga: {activity.fatigue_score}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fatigue & volume chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Fatiga & volumen</h2>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit=" km" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar yAxisId="right" dataKey="km" name="Distancia km" fill="#8b5cf6" opacity={0.4} radius={[3, 3, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="fatigue" name="Fatiga" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}
