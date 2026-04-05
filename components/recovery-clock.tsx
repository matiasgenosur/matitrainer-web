'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'

interface RecoveryClockProps {
  lastActivity: Activity
  acwrLevel: 'low' | 'optimal' | 'caution' | 'high'
}

function getRecoveryHours(fatigue: number, acwrLevel: string): number {
  // Base recovery by fatigue score (0–100 scale)
  let base: number
  if (fatigue < 20) base = 16
  else if (fatigue < 40) base = 24
  else if (fatigue < 60) base = 36
  else if (fatigue < 80) base = 48
  else base = 60

  // Adjust for systemic fatigue (ACWR)
  if (acwrLevel === 'high') base *= 1.25
  else if (acwrLevel === 'caution') base *= 1.12

  return Math.round(base)
}

function getElapsedHours(activity: Activity): number {
  // Use exact ended_at if available, otherwise noon of activity date
  const endStr = activity.ended_at || `${activity.date}T12:00:00`
  const activityEnd = new Date(endStr)
  const now = new Date()
  return Math.max(0, (now.getTime() - activityEnd.getTime()) / (1000 * 60 * 60))
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RecoveryClock({ lastActivity, acwrLevel }: RecoveryClockProps) {
  const [now, setNow] = useState(new Date())

  // Tick every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const totalHours = getRecoveryHours(lastActivity.fatigue_score, acwrLevel)
  const elapsed = getElapsedHours(lastActivity)
  const remaining = Math.max(0, totalHours - elapsed)
  const pctRecovered = Math.min(1, elapsed / totalHours)
  const isReady = remaining === 0

  const hoursLeft = Math.floor(remaining)
  const minsLeft = Math.round((remaining - hoursLeft) * 60)

  // Ring: fills clockwise as recovery progresses
  const strokeOffset = CIRCUMFERENCE * (1 - pctRecovered)

  const ringColor = isReady
    ? '#22c55e'
    : pctRecovered > 0.66
    ? '#22c55e'
    : pctRecovered > 0.33
    ? '#f59e0b'
    : '#ef4444'

  const fatigueLabel =
    lastActivity.fatigue_score < 20 ? 'muy baja'
    : lastActivity.fatigue_score < 40 ? 'baja'
    : lastActivity.fatigue_score < 60 ? 'moderada'
    : lastActivity.fatigue_score < 80 ? 'alta'
    : 'muy alta'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Clock ring */}
      <div className="relative">
        <svg width={130} height={130} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={65} cy={65} r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={10}
          />
          {/* Progress ring */}
          <motion.circle
            cx={65} cy={65} r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {isReady ? (
            <>
              <span className="text-2xl">✓</span>
              <p className="text-xs font-bold text-green-400 leading-tight">Listo</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-white leading-none">
                {hoursLeft}h{minsLeft > 0 ? ` ${minsLeft}m` : ''}
              </p>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">restantes</p>
            </>
          )}
        </div>
      </div>

      {/* Stats below clock */}
      <div className="w-full space-y-2 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>Última actividad</span>
          <span className="text-white font-medium truncate max-w-[120px] text-right">{lastActivity.name}</span>
        </div>
        {(lastActivity.city || lastActivity.country) && (
          <div className="flex justify-between text-gray-400">
            <span>Ubicación</span>
            <span className="text-gray-300 text-right">
              {[lastActivity.city, lastActivity.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {lastActivity.ended_at && (
          <div className="flex justify-between text-gray-400">
            <span>Hora de término</span>
            <span className="text-gray-300">
              {new Date(lastActivity.ended_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Fatiga ({lastActivity.fatigue_score}/100)</span>
          <span className="text-white font-medium capitalize">{fatigueLabel}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Recuperación total</span>
          <span className="text-white font-medium">{totalHours}h</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Transcurridas</span>
          <span className="text-white font-medium">{Math.floor(elapsed)}h {Math.round((elapsed % 1) * 60)}m</span>
        </div>

        {/* Progress bar */}
        <div className="pt-1">
          <div className="flex justify-between text-gray-500 mb-1">
            <span>{Math.round(pctRecovered * 100)}% recuperado</span>
            <span className="text-gray-600 text-xs">estimado al mediodía del {lastActivity.date}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: ringColor }}
              initial={{ width: '0%' }}
              animate={{ width: `${pctRecovered * 100}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {isReady && (
          <p className="text-center text-xs text-green-400 font-medium pt-1">
            ¡Estás recuperado! Puedes entrenar hoy.
          </p>
        )}
        {!isReady && remaining < 6 && (
          <p className="text-center text-xs text-amber-400 pt-1">
            Casi listo — en menos de {Math.ceil(remaining)}h
          </p>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center leading-relaxed">
        {lastActivity.ended_at
          ? `Basado en hora exacta de término · fatiga ${lastActivity.fatigue_score}/100`
          : `Sin hora exacta — estimado al mediodía del ${lastActivity.date}`}
      </p>
    </div>
  )
}
