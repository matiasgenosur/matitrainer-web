'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'
import { getActivityIcon, formatDistance, formatPace, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TrainingClientProps {
  activities: Activity[]
}

// Build April 2026 calendar
const YEAR = 2026
const MONTH = 3 // April (0-indexed)

// Planned sessions for April 2026
const plannedSessions: Record<string, { type: string; desc: string; target: string }> = {
  '2026-04-05': { type: 'Run', desc: 'Run Fácil Z1-Z2', target: '8-10 km @ 6:30-7:00' },
  '2026-04-07': { type: 'Run', desc: 'Tempo Run', target: '12-14 km @ Z3-Z4' },
  '2026-04-08': { type: 'Hike', desc: 'Hike Recuperación', target: '8-10 km' },
  '2026-04-10': { type: 'Run', desc: 'Long Run', target: '18-20 km @ Z2-Z3' },
  '2026-04-12': { type: 'Run', desc: 'Intervalos', target: '6x1km @ Z5' },
  '2026-04-14': { type: 'Run', desc: 'Run Progresivo', target: '14 km progresivo' },
  '2026-04-16': { type: 'Hike', desc: 'Hike Activo', target: '10 km' },
  '2026-04-17': { type: 'Run', desc: 'Long Run Final', target: '22-24 km @ Z2' },
  '2026-04-19': { type: 'Rest', desc: 'Descanso', target: 'Recuperación total' },
  '2026-04-21': { type: 'Run', desc: 'Run Suave', target: '10 km @ Z1-Z2' },
  '2026-04-24': { type: 'Run', desc: 'Race Prep', target: '14 km @ ritmo carrera' },
  '2026-04-26': { type: 'Run', desc: 'Taper Run', target: '8 km fácil' },
  '2026-04-28': { type: 'Rest', desc: 'Descanso Pre-Carrera', target: 'Descanso + prep' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday first
}

const typeColors: Record<string, string> = {
  Run: '#8b5cf6',
  Hike: '#22c55e',
  Soccer: '#3b82f6',
  Rest: '#374151',
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function TrainingClient({ activities }: TrainingClientProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const activityByDate = new Map<string, Activity[]>()
  activities.forEach((a) => {
    if (!activityByDate.has(a.date)) activityByDate.set(a.date, [])
    activityByDate.get(a.date)!.push(a)
  })

  const daysInMonth = getDaysInMonth(YEAR, MONTH)
  const firstDay = getFirstDayOfMonth(YEAR, MONTH)
  const today = 4 // April 4

  // Calculate adherence
  const completedPlanned = Object.keys(plannedSessions).filter((dateStr) => {
    const dayNum = parseInt(dateStr.split('-')[2])
    return dayNum <= today && activityByDate.has(dateStr)
  })
  const totalPlanned = Object.keys(plannedSessions).filter((dateStr) => {
    const dayNum = parseInt(dateStr.split('-')[2])
    return dayNum <= today
  })
  const adherence = totalPlanned.length > 0
    ? Math.round((completedPlanned.length / totalPlanned.length) * 100)
    : 100

  // Upcoming sessions
  const upcoming = Object.entries(plannedSessions)
    .filter(([date]) => {
      const dayNum = parseInt(date.split('-')[2])
      return dayNum > today
    })
    .slice(0, 5)

  const selectedDateStr = selectedDay
    ? `${YEAR}-04-${selectedDay.toString().padStart(2, '0')}`
    : null
  const selectedActivities = selectedDateStr ? activityByDate.get(selectedDateStr) || [] : []
  const selectedPlan = selectedDateStr ? plannedSessions[selectedDateStr] : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-400">{adherence}%</p>
            <p className="text-xs text-gray-400 mt-1">Adherencia al plan</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{completedPlanned.length}</p>
            <p className="text-xs text-gray-400 mt-1">Sesiones completadas</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{Object.keys(plannedSessions).length - completedPlanned.length}</p>
            <p className="text-xs text-gray-400 mt-1">Sesiones pendientes</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500/30 border border-violet-500/50 inline-block" />Planificado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block" />Completado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/10 inline-block" />Descanso</span>
        </div>

        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Abril 2026</h2>

          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for first week */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${YEAR}-04-${day.toString().padStart(2, '0')}`
              const completed = activityByDate.get(dateStr) || []
              const planned = plannedSessions[dateStr]
              const isPast = day <= today
              const isToday = day === today
              const isSelected = day === selectedDay

              const hasActivity = completed.length > 0
              const actType = hasActivity ? completed[0].type : planned?.type

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all relative',
                    isSelected ? 'ring-2 ring-violet-400' : '',
                    isToday ? 'ring-2 ring-cyan-400' : '',
                    hasActivity
                      ? 'text-white'
                      : planned
                      ? 'border border-white/20 text-gray-400 hover:border-violet-500/40'
                      : isPast
                      ? 'text-gray-600'
                      : 'text-gray-500'
                  )}
                  style={
                    hasActivity
                      ? {
                          background: `${typeColors[actType || 'Run']}30`,
                          borderColor: `${typeColors[actType || 'Run']}50`,
                          border: `1px solid ${typeColors[actType || 'Run']}50`,
                        }
                      : planned && !isPast
                      ? { background: 'rgba(139,92,246,0.05)' }
                      : {}
                  }
                >
                  <span className={cn('font-medium', isToday && 'text-cyan-400')}>{day}</span>
                  {(hasActivity || planned) && (
                    <span className="text-[10px] mt-0.5 opacity-70">
                      {hasActivity
                        ? getActivityIcon(actType || 'Run')
                        : planned?.type === 'Rest'
                        ? '😴'
                        : '📋'}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Selected day detail */}
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
          >
            <h3 className="text-sm font-semibold text-white mb-3">
              {selectedDay} de Abril 2026
            </h3>
            {selectedActivities.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-400 font-medium mb-2">✅ Actividad completada</p>
                {selectedActivities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <span className="text-xl">{getActivityIcon(a.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{a.name}</p>
                      <p className="text-xs text-gray-400">{formatDistance(a.distance_km)} · {formatPace(a.pace_min_km)}</p>
                    </div>
                    <span className="text-xs text-gray-500">Fatiga: {a.fatigue_score}</span>
                  </div>
                ))}
              </div>
            ) : selectedPlan ? (
              <div>
                <p className="text-xs text-amber-400 font-medium mb-2">📋 Sesión planificada</p>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-sm text-white font-medium">{selectedPlan.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">{selectedPlan.target}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sin actividad planificada este día.</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Sidebar: Upcoming sessions */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Próximas sesiones</h2>
          <div className="space-y-3">
            {upcoming.map(([date, session]) => {
              const d = new Date(date + 'T00:00:00')
              const label = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <div key={date} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                    style={{ background: `${typeColors[session.type] || '#8b5cf6'}20` }}
                  >
                    {session.type === 'Rest' ? '😴' : getActivityIcon(session.type)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 capitalize">{label}</p>
                    <p className="text-sm text-white font-medium">{session.desc}</p>
                    <p className="text-xs text-gray-400">{session.target}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent completed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Recientes completadas</h2>
          <div className="space-y-3">
            {activities.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-lg">{getActivityIcon(a.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{a.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(a.date)}</p>
                </div>
                <span className="text-xs text-gray-400 font-mono shrink-0">{formatDistance(a.distance_km)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
