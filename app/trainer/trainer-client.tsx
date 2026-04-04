'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, WeeklyStats, ACWRResult } from '@/lib/types'
import { getActivityIcon, formatDate, formatDistance, formatPace, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TrainerClientProps {
  activities: Activity[]
  weeklyStats: WeeklyStats[]
  acwr: ACWRResult
}

const TRAINER_KEY = 'diego2026'

export default function TrainerClient({ activities, weeklyStats, acwr }: TrainerClientProps) {
  const searchParams = useSearchParams()
  const [authenticated, setAuthenticated] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [savedNotes, setSavedNotes] = useState<Record<number, boolean>>({})
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    const keyParam = searchParams.get('key')
    if (keyParam === TRAINER_KEY) {
      setAuthenticated(true)
    }
  }, [searchParams])

  const handleLogin = () => {
    if (keyInput === TRAINER_KEY) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Clave incorrecta. Intenta de nuevo.')
    }
  }

  const handleSaveNote = (actId: number) => {
    setSavedNotes((prev) => ({ ...prev, [actId]: true }))
    setTimeout(() => {
      setSavedNotes((prev) => ({ ...prev, [actId]: false }))
    }, 2000)
  }

  if (!authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-violet-500/25">
              🎯
            </div>
            <h1 className="text-2xl font-bold text-white">Portal del Entrenador</h1>
            <p className="text-gray-400 text-sm mt-1">Acceso exclusivo para Diego</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Clave de acceso</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Ingresa tu clave..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-sm hover:opacity-90 transition-all"
            >
              Acceder al portal
            </button>
          </div>
          <p className="text-xs text-gray-600 text-center mt-4">Acceso directo con ?key=diego2026</p>
        </motion.div>
      </main>
    )
  }

  const lastActivity = activities[0]
  const acwrLevelColors = {
    low: 'text-blue-400 bg-blue-500/10',
    optimal: 'text-emerald-400 bg-emerald-500/10',
    caution: 'text-amber-400 bg-amber-500/10',
    high: 'text-red-400 bg-red-500/10',
  }
  const acwrLabels = {
    low: 'Carga Baja',
    optimal: 'Zona Óptima',
    caution: 'Precaución',
    high: 'Riesgo Alto',
  }

  // Find spikes in weekly load
  const spikesDetected = weeklyStats
    .filter((w, i, arr) => {
      if (i === 0) return false
      const prev = arr[i - 1]
      return prev.totalKm > 0 && w.totalKm / prev.totalKm > 1.3
    })
    .map((w) => w.weekLabel)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">Portal del Entrenador</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">Diego</span>
          </div>
          <p className="text-gray-400 text-sm">Vista privada — Atleta: Matias Gutierrez</p>
        </div>
        <button
          onClick={() => {
            setFeedbackSent(true)
            setTimeout(() => setFeedbackSent(false), 3000)
          }}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
            feedbackSent
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30'
          )}
        >
          {feedbackSent ? '✅ Enviado!' : '📧 Enviar feedback'}
        </button>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Última actividad</p>
          <p className="text-sm font-medium text-white">{lastActivity ? formatDate(lastActivity.date) : '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{lastActivity?.name}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">ACWR</p>
          <p className="text-xl font-bold text-white">{acwr.acwr.toFixed(2)}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', acwrLevelColors[acwr.level])}>
            {acwrLabels[acwr.level]}
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total actividades</p>
          <p className="text-xl font-bold text-white">{activities.length}</p>
          <p className="text-xs text-gray-500">registradas</p>
        </div>
        <div className={cn(
          'border rounded-2xl p-4',
          spikesDetected.length > 0
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-white/5 border-white/10'
        )}>
          <p className="text-xs text-gray-400 mb-1">Picos de carga</p>
          <p className={cn('text-xl font-bold', spikesDetected.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
            {spikesDetected.length}
          </p>
          <p className="text-xs text-gray-500">semanas detectadas</p>
        </div>
      </div>

      {/* Load spike warning */}
      {spikesDetected.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30"
        >
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-400">Pico de carga detectado</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Semanas con aumento {'>'} 30% de volumen: {spikesDetected.join(', ')}. Considera ajustar el plan.
            </p>
          </div>
        </motion.div>
      )}

      {/* Weekly summary table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Resumen semanal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Semana</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Total km</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Run km</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Tiempo</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Desnivel</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Actividades</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Fatiga avg</th>
              </tr>
            </thead>
            <tbody>
              {[...weeklyStats].reverse().map((week, i) => {
                const isSpike = spikesDetected.includes(week.weekLabel)
                return (
                  <motion.tr
                    key={week.week}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'border-b border-white/5 hover:bg-white/3 transition-colors',
                      isSpike && 'bg-red-500/5'
                    )}
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      {week.weekLabel}
                      {isSpike && <span className="ml-2 text-xs text-red-400">⚠️ spike</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">{week.totalKm.toFixed(1)}</td>
                    <td className="py-3 px-4 font-mono text-violet-400">{week.runKm.toFixed(1)}</td>
                    <td className="py-3 px-4 text-gray-300">{formatTime(week.totalTime)}</td>
                    <td className="py-3 px-4 text-gray-300">{Math.round(week.elevation)}m</td>
                    <td className="py-3 px-4 text-gray-300">{week.activities}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        week.avgFatigue > 200 ? 'bg-red-500/10 text-red-400' :
                        week.avgFatigue > 100 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      )}>
                        {week.avgFatigue}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activities with notes */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white mb-4">Actividades recientes — Notas del entrenador</h2>
        <div className="space-y-4">
          {activities.slice(0, 8).map((activity) => (
            <div key={activity.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-white/3 rounded-xl border border-white/5">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{activity.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatDistance(activity.distance_km)}</span>
                    <span>{formatPace(activity.pace_min_km)}</span>
                    <span>{formatTime(activity.moving_time_min)}</span>
                    <span>Fatiga: {activity.fatigue_score}</span>
                  </div>
                  {activity.trainer_notes && (
                    <p className="text-xs text-violet-300 italic mt-1">&ldquo;{activity.trainer_notes}&rdquo;</p>
                  )}
                </div>
              </div>
              <div className="sm:w-72 space-y-2">
                <textarea
                  rows={2}
                  placeholder="Agregar nota para esta sesión..."
                  defaultValue={activity.trainer_notes || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [activity.id]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-xs resize-none focus:outline-none focus:border-violet-500/40 transition-all"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">RPE target:</label>
                    <select className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n} style={{ background: '#1a1a2e' }}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => handleSaveNote(activity.id)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                      savedNotes[activity.id]
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                    )}
                  >
                    {savedNotes[activity.id] ? '✅ Guardado' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
