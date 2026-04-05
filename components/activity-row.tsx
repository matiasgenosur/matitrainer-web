'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from '@/lib/types'
import { cn, formatPace, formatDistance, formatTime, getActivityIcon, formatDate } from '@/lib/utils'

interface ActivityRowProps {
  activity: Activity
  index: number
}

export default function ActivityRow({ activity, index }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false)

  const typeColors: Record<string, string> = {
    run: 'text-violet-400 bg-violet-500/10',
    hike: 'text-emerald-400 bg-emerald-500/10',
    soccer: 'text-blue-400 bg-blue-500/10',
    walk: 'text-amber-400 bg-amber-500/10',
    workout: 'text-pink-400 bg-pink-500/10',
  }
  const typeColor = typeColors[activity.type.toLowerCase()] || 'text-gray-400 bg-gray-500/10'

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setExpanded(!expanded)}
        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
      >
        <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap">
          {formatDate(activity.date)}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColor)}>
              {getActivityIcon(activity.type)} {activity.type}
            </span>
            <span className="text-sm text-white font-medium truncate max-w-[180px]">
              {activity.name}
            </span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-white font-mono">
          {formatDistance(activity.distance_km)}
        </td>
        <td className="py-3 px-4 text-sm text-gray-300 font-mono">
          {formatPace(activity.pace_min_km)}
        </td>
        <td className="py-3 px-4 text-sm text-gray-300">
          {formatTime(activity.moving_time_min)}
        </td>
        <td className="py-3 px-4 text-sm text-gray-300">
          {activity.elevation_m > 0 ? `${Math.round(activity.elevation_m)}m` : '—'}
        </td>
        <td className="py-3 px-4 text-sm text-gray-300">
          {activity.calories > 0 ? `${activity.calories} kcal` : '—'}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, activity.fatigue_score)}%`,
                  background: activity.fatigue_score >= 80 ? '#ef4444' : activity.fatigue_score >= 50 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
            <span className="text-xs text-gray-400">{activity.fatigue_score}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          {activity.strava_link && (
            <a
              href={activity.strava_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Strava ↗
            </a>
          )}
        </td>
      </motion.tr>

      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={9} className="px-4 py-4 bg-white/3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Avg HR</p>
                  <p className="text-white">{activity.avg_hr ? `${Math.round(activity.avg_hr)} bpm` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">FC %</p>
                  <p className="text-white">{activity.fc_pct}%</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Tipo de sesión</p>
                  <p className="text-white">{activity.session_type || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">RPE</p>
                  <p className="text-white">{activity.rpe ? `${activity.rpe}/10` : '—'}</p>
                </div>
                {/* Zone distribution */}
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-gray-500 text-xs mb-2">Distribución de zonas</p>
                  <div className="flex gap-1 h-4 rounded overflow-hidden">
                    {[
                      { z: activity.z1_min, color: '#3b82f6', label: 'Z1' },
                      { z: activity.z2_min, color: '#22c55e', label: 'Z2' },
                      { z: activity.z3_min, color: '#f59e0b', label: 'Z3' },
                      { z: activity.z4_min, color: '#f97316', label: 'Z4' },
                      { z: activity.z5_min, color: '#ef4444', label: 'Z5' },
                    ].map(({ z, color, label }) => {
                      const total = activity.z1_min + activity.z2_min + activity.z3_min + activity.z4_min + activity.z5_min
                      const pct = total > 0 ? (z / total) * 100 : 0
                      return pct > 0 ? (
                        <div
                          key={label}
                          title={`${label}: ${Math.round(z)}min`}
                          style={{ width: `${pct}%`, background: color }}
                          className="flex items-center justify-center text-xs text-white font-bold"
                        >
                          {pct > 10 ? label : ''}
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
                {activity.trainer_notes && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-gray-500 text-xs mb-1">Nota del entrenador</p>
                    <p className="text-violet-300 italic">&ldquo;{activity.trainer_notes}&rdquo;</p>
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}
