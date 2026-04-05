'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'
import { getActivityIcon, formatDistance, formatPace, formatTime } from '@/lib/utils'

interface TrainingPlan {
  date: string
  planned_activity: string
  distance_km?: number
  session_type?: string
  notes?: string
}

interface TrainingClientProps {
  activities: Activity[]
  trainingPlans: TrainingPlan[]
}

function todaySantiago(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatDayFull(dateStr: string, todayStr: string): { label: string; sub: string } {
  const diff = Math.round(
    (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
  )
  const d = new Date(dateStr + 'T12:00:00')
  const weekday = d.toLocaleDateString('es-CL', { weekday: 'long' })
  const dateLabel = d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })

  if (diff === 0) return { label: 'Hoy', sub: dateLabel }
  if (diff === -1) return { label: 'Ayer', sub: dateLabel }
  if (diff === 1) return { label: 'Mañana', sub: dateLabel }
  return { label: weekday.charAt(0).toUpperCase() + weekday.slice(1), sub: dateLabel }
}

const SESSION_COLORS: Record<string, string> = {
  'Recuperación': '#22c55e',
  'Fácil': '#3b82f6',
  'Medio': '#8b5cf6',
  'Largo': '#f59e0b',
  'Largo+': '#f97316',
  'Trail': '#10b981',
  'Descanso': '#6b7280',
  'Intervalos': '#ec4899',
}

export default function TrainingClient({ activities, trainingPlans }: TrainingClientProps) {
  const today = todaySantiago()
  const [weeksAhead, setWeeksAhead] = useState(4)

  // Index activities and plans by date
  const actByDate = new Map<string, Activity[]>()
  activities.forEach(a => {
    if (!actByDate.has(a.date)) actByDate.set(a.date, [])
    actByDate.get(a.date)!.push(a)
  })

  const planByDate = new Map<string, TrainingPlan>()
  trainingPlans.forEach(p => planByDate.set(p.date, p))

  // Build weeks: from current week to weeksAhead weeks ahead
  const startDate = getWeekStart(today)
  const endDate = addDays(startDate, weeksAhead * 7 - 1)

  // Group days by week
  const weeks: { weekStart: string; days: string[] }[] = []
  let cur = startDate
  while (cur <= endDate) {
    const weekStart = cur
    const days: string[] = []
    for (let i = 0; i < 7; i++) days.push(addDays(cur, i))
    weeks.push({ weekStart, days })
    cur = addDays(cur, 7)
  }

  // Stats
  const planDates = trainingPlans.map(p => p.date)
  const completedCount = planDates.filter(d => d <= today && actByDate.has(d)).length
  const pendingCount = planDates.filter(d => d > today).length
  const adherence = planDates.filter(d => d <= today).length > 0
    ? Math.round(completedCount / planDates.filter(d => d <= today).length * 100)
    : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Main: week list */}
      <div className="lg:col-span-2 space-y-6">
        {weeks.map(({ weekStart, days }) => {
          const weekLabel = new Date(weekStart + 'T12:00:00').toLocaleDateString('es-CL', {
            day: 'numeric', month: 'long'
          })
          const hasContent = days.some(d => actByDate.has(d) || planByDate.has(d))

          return (
            <motion.div
              key={weekStart}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm"
            >
              {/* Week header */}
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Semana del {weekLabel}
                </p>
                <p className="text-xs text-gray-600">
                  {days.filter(d => actByDate.has(d)).length} completadas ·{' '}
                  {days.filter(d => planByDate.has(d) && d > today).length} planificadas
                </p>
              </div>

              {/* Days */}
              <div className="divide-y divide-white/5">
                {days.map(dateStr => {
                  const acts = actByDate.get(dateStr) || []
                  const plan = planByDate.get(dateStr)
                  const isFuture = dateStr > today
                  const isToday = dateStr === today
                  const isPast = dateStr < today
                  const { label, sub } = formatDayFull(dateStr, today)
                  const isEmpty = acts.length === 0 && !plan

                  if (isPast && isEmpty) {
                    // Collapse empty past days
                    return (
                      <div key={dateStr} className="flex items-center gap-4 px-5 py-2 opacity-30">
                        <div className="w-20 shrink-0">
                          <p className="text-xs font-medium text-gray-500">{label}</p>
                          <p className="text-xs text-gray-600">{sub}</p>
                        </div>
                        <p className="text-xs text-gray-700">—</p>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={dateStr}
                      className={`px-5 py-4 transition-colors ${isToday ? 'bg-violet-500/5' : ''}`}
                    >
                      <div className="flex gap-4">
                        {/* Date column */}
                        <div className="w-20 shrink-0 pt-0.5">
                          <p className={`text-sm font-semibold ${isToday ? 'text-violet-400' : isFuture ? 'text-gray-300' : 'text-gray-400'}`}>
                            {label}
                            {isToday && <span className="ml-1 text-xs">●</span>}
                          </p>
                          <p className="text-xs text-gray-600">{sub}</p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          {/* Completed activities */}
                          {acts.map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-lg shrink-0">
                                {getActivityIcon(a.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-white truncate">{a.name}</p>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 shrink-0">
                                    ✓ completado
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatDistance(a.distance_km)}
                                  {a.pace_min_km > 0 && ` · ${formatPace(a.pace_min_km)}`}
                                  {a.moving_time_min > 0 && ` · ${formatTime(a.moving_time_min)}`}
                                  {a.avg_hr && ` · FC ${a.avg_hr}bpm`}
                                </p>
                                {a.trainer_notes && (
                                  <p className="text-xs text-violet-300 mt-1 italic">"{a.trainer_notes}"</p>
                                )}
                              </div>
                              {a.fatigue_score > 0 && (
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-gray-500">Fatiga</p>
                                  <p className="text-sm font-mono text-gray-300">{a.fatigue_score}</p>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Planned activity */}
                          {plan && (
                            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isFuture
                                ? 'bg-cyan-500/5 border-cyan-500/20'
                                : acts.length === 0
                                ? 'bg-red-500/5 border-red-500/20 opacity-60'
                                : 'bg-white/3 border-white/5 opacity-50'
                            }`}>
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                                style={{ background: `${SESSION_COLORS[plan.session_type || ''] || '#8b5cf6'}15` }}
                              >
                                {plan.session_type === 'Descanso' ? '😴' : '📋'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-sm font-medium ${isFuture ? 'text-cyan-200' : 'text-gray-400'}`}>
                                    {plan.planned_activity}
                                  </p>
                                  {plan.session_type && (
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                                      style={{
                                        background: `${SESSION_COLORS[plan.session_type] || '#8b5cf6'}20`,
                                        color: SESSION_COLORS[plan.session_type] || '#8b5cf6',
                                      }}
                                    >
                                      {plan.session_type}
                                    </span>
                                  )}
                                  {!isFuture && acts.length === 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                                      no completado
                                    </span>
                                  )}
                                </div>
                                {(plan.distance_km || plan.notes) && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {plan.distance_km && `${plan.distance_km}km`}
                                    {plan.distance_km && plan.notes && ' · '}
                                    {plan.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Future with no plan */}
                          {!isToday && isFuture && !plan && (
                            <p className="text-xs text-gray-700 italic py-1">Sin actividad planificada</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}

        {/* Load more */}
        <button
          onClick={() => setWeeksAhead(w => w + 2)}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10 rounded-2xl transition-colors"
        >
          Ver 2 semanas más →
        </button>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Resumen del plan</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Adherencia</p>
              <p className="text-sm font-bold text-violet-400">{adherence}%</p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${adherence}%` }} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500">Completadas</p>
              <p className="text-sm font-mono text-green-400">{completedCount}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-sm font-mono text-cyan-400">{pendingCount}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Total planificadas</p>
              <p className="text-sm font-mono text-gray-300">{trainingPlans.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Próximas sesiones */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Próximas sesiones</h2>
          {trainingPlans.filter(p => p.date >= today).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Sin plan aún.<br />
              <span className="text-xs text-gray-600">Pídele a Claude que cree uno.</span>
            </p>
          ) : (
            <div className="space-y-3">
              {trainingPlans.filter(p => p.date >= today).slice(0, 7).map(p => {
                const d = new Date(p.date + 'T12:00:00')
                const label = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
                const color = SESSION_COLORS[p.session_type || ''] || '#8b5cf6'
                return (
                  <div key={p.date} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                      style={{ background: `${color}20` }}
                    >
                      {p.session_type === 'Descanso' ? '😴' : '🏃'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 capitalize">{label}</p>
                      <p className="text-sm text-white font-medium leading-tight">{p.planned_activity}</p>
                      {(p.distance_km || p.notes) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.distance_km && `${p.distance_km}km`}
                          {p.distance_km && p.notes && ' · '}
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Tip */}
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-xs text-violet-300 leading-relaxed">
            💡 Usa el chat <strong>🤖</strong> para pedirle a Claude que cree o modifique tu plan de entrenamiento.
          </p>
        </div>
      </div>
    </div>
  )
}
