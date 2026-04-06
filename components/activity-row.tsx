'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Activity, Split } from '@/lib/types'
import { cn, formatPace, formatDistance, formatTime, getActivityIcon, formatDate } from '@/lib/utils'

interface ActivityRowProps {
  activity: Activity
  index: number
}

const ZONE_COLORS: Record<number, string> = {
  1: '#3b82f6',
  2: '#22c55e',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function SplitsChart({ splits }: { splits: Split[] }) {
  if (!splits || splits.length === 0) return null

  const data = splits
    .filter((s) => s.pace_s_km && s.pace_s_km > 0 && s.pace_s_km < 1200)
    .map((s) => ({
      km: s.km,
      pace: s.pace_s_km,
      gap: s.gap_s_km,
      hr: s.hr,
      elev: s.elev_m,
      zone: s.pace_zone ?? 0,
    }))

  if (data.length === 0) return null

  const paceMin = Math.min(...data.map((d) => d.pace ?? 999))
  const paceMax = Math.max(...data.map((d) => d.pace ?? 0))
  const domainPad = Math.max(20, (paceMax - paceMin) * 0.15)

  return (
    <div className="col-span-2 sm:col-span-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-500 text-xs">Splits por km</p>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-orange-400 inline-block"/> GAP</span>
          {data.some((d) => d.hr) && <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400 inline-block"/> FC</span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="km"
            tick={{ fill: '#6b7280', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            yAxisId="pace"
            orientation="left"
            domain={[paceMax + domainPad, paceMin - domainPad]}
            tick={{ fill: '#6b7280', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtSec}
            width={32}
          />
          {data.some((d) => d.hr) && (
            <YAxis
              yAxisId="hr"
              orientation="right"
              domain={['auto', 'auto']}
              tick={{ fill: '#6b7280', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
          )}
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            labelFormatter={(v) => `Km ${v}`}
            formatter={(value: number, name: string) => {
              if (name === 'pace' || name === 'gap') return [fmtSec(value) + ' /km', name === 'pace' ? 'Ritmo' : 'GAP']
              if (name === 'hr') return [Math.round(value) + ' bpm', 'FC']
              return [value, name]
            }}
          />
          <Bar yAxisId="pace" dataKey="pace" radius={[2, 2, 0, 0]} maxBarSize={24}>
            {data.map((d, i) => (
              <Cell key={i} fill={ZONE_COLORS[d.zone] ?? '#8b5cf6'} fillOpacity={0.7} />
            ))}
          </Bar>
          {data.some((d) => d.gap) && (
            <Line
              yAxisId="pace"
              type="monotone"
              dataKey="gap"
              stroke="#f97316"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 3"
            />
          )}
          {data.some((d) => d.hr) && (
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="hr"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ActivityRow({ activity, index }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false)

  const isTrail = activity.sport_type === 'TrailRun'
  const isRace = activity.workout_type === 1
  const hasPR = (activity.pr_count ?? 0) > 0

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
        transition={{ delay: index * 0.03 }}
        onClick={() => setExpanded(!expanded)}
        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
      >
        <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap">
          {formatDate(activity.date)}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', typeColor)}>
              {getActivityIcon(activity.type)} {isTrail ? 'Trail' : activity.type}
            </span>
            <span className="text-sm text-white font-medium truncate max-w-[160px]">
              {activity.name}
            </span>
            {isRace && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">🏁 Carrera</span>
            )}
            {hasPR && !isRace && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">PR</span>
            )}
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

                {/* Row 1: Stats */}
                <div>
                  <p className="text-gray-500 text-xs mb-1">Avg HR</p>
                  <p className="text-white">{activity.avg_hr ? `${Math.round(activity.avg_hr)} bpm` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">FC %</p>
                  <p className="text-white">{activity.fc_pct ? `${activity.fc_pct}%` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Tipo de sesión</p>
                  <p className="text-white">{activity.session_type || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">RPE</p>
                  <p className="text-white">
                    {activity.perceived_exertion
                      ? `${activity.perceived_exertion}/10`
                      : activity.rpe
                      ? `${activity.rpe}/10`
                      : '—'}
                  </p>
                </div>

                {/* Row 2: New fields */}
                <div>
                  <p className="text-gray-500 text-xs mb-1">Cadencia</p>
                  <p className="text-white">{activity.avg_cadence ? `${Math.round(activity.avg_cadence)} spm` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Vel. máx</p>
                  <p className="text-white">
                    {activity.max_speed_ms
                      ? `${fmtSec(1000 / activity.max_speed_ms)} /km`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Altitud (max/min)</p>
                  <p className="text-white">
                    {activity.elev_high != null
                      ? `${Math.round(activity.elev_high)}m / ${Math.round(activity.elev_low ?? 0)}m`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Zapatillas</p>
                  <p className="text-white truncate" title={activity.gear_name ?? ''}>
                    {activity.gear_name ?? '—'}
                  </p>
                </div>

                {/* Zone distribution */}
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-gray-500 text-xs mb-2">Distribución de zonas HR</p>
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

                {/* Splits chart */}
                {activity.splits_metric && activity.splits_metric.length > 0 && (
                  <SplitsChart splits={activity.splits_metric} />
                )}

                {/* Trainer notes */}
                {activity.trainer_notes && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-gray-500 text-xs mb-1">Nota del entrenador</p>
                    <p className="text-violet-300 italic">&ldquo;{activity.trainer_notes}&rdquo;</p>
                  </div>
                )}

                {/* Description */}
                {activity.description && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-gray-500 text-xs mb-1">Descripción</p>
                    <p className="text-gray-300 text-xs">{activity.description}</p>
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
