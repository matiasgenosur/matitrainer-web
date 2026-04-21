'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, RacePrediction } from '@/lib/types'
import RacePredictionCard from '@/components/race-prediction-card'
import { formatPace, formatDistance, formatDate, getActivityIcon } from '@/lib/utils'

interface PredictorClientProps {
  initialPredictions: RacePrediction[]
  vo2max: number
  refRun: Activity | null
  activities: Activity[]
}

const CHART_TOOLTIP_STYLE = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
}

const DISTANCES = [
  { label: '5K', km: 5, color: '#8b5cf6' },
  { label: '10K', km: 10, color: '#3b82f6' },
  { label: '21K', km: 21.0975, color: '#06b6d4' },
  { label: '42K', km: 42.195, color: '#ec4899' },
]

// Strava best_efforts key names for key distances
const EFFORT_KEYS: Record<string, string> = {
  '1K':  '1K',
  '5K':  '5K',
  '10K': '10K',
  '21K': '1/2 Marathon',
  '42K': 'Marathon',
}

function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.round(totalSec % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtPaceFromSec(totalSec: number, distKm: number): string {
  const paceSecPerKm = totalSec / distKm
  const m = Math.floor(paceSecPerKm / 60)
  const s = Math.round(paceSecPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')} /km`
}

function riegelPredict(refTimeMins: number, refDistKm: number, targetKm: number): { time: string; pace: string } {
  const predictedMins = refTimeMins * Math.pow(targetKm / refDistKm, 1.06)
  const paceMinKm = predictedMins / targetKm
  const hrs = Math.floor(predictedMins / 60)
  const mins = Math.floor(predictedMins % 60)
  const secs = Math.round((predictedMins - Math.floor(predictedMins)) * 60)
  const timeStr = hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins}:${secs.toString().padStart(2, '0')}`
  const paceMins = Math.floor(paceMinKm)
  const paceSecs = Math.round((paceMinKm - paceMins) * 60)
  return { time: timeStr, pace: `${paceMins}:${paceSecs.toString().padStart(2, '0')} /km` }
}

export default function PredictorClient({
  initialPredictions,
  vo2max,
  refRun,
  activities,
}: PredictorClientProps) {
  const runs = activities
    .filter((a) => (a.type === 'Run' || a.sport_type === 'TrailRun') && a.distance_km >= 10 && a.pace_min_km > 0 && a.pace_min_km < 15)
    .sort((a, b) => b.date.localeCompare(a.date))

  const [sliderPace, setSliderPace] = useState<number>(
    refRun ? Math.round(refRun.pace_min_km * 100) : 596
  )
  const [sliderDist, setSliderDist] = useState<number>(
    refRun ? Math.round(refRun.distance_km * 10) : 214
  )

  const simulatedPredictions = useMemo(() => {
    const refPaceMin = sliderPace / 100
    const refDistKm = sliderDist / 10
    const refTimeMins = refPaceMin * refDistKm
    return DISTANCES.map(({ label, km, color }) => {
      const { time, pace } = riegelPredict(refTimeMins, refDistKm, km)
      return { distance: label, distanceKm: km, time, pace, color }
    })
  }, [sliderPace, sliderDist])

  const paceDisplay = (() => {
    const p = sliderPace / 100
    const m = Math.floor(p)
    const s = Math.round((p - m) * 60)
    return `${m}:${s.toString().padStart(2, '0')} /km`
  })()

  // ── PR Tracker ─────────────────────────────────────────────────────────────
  // Find best effort per distance across all activities
  const prByDistance = useMemo(() => {
    const bestMap: Record<string, { sec: number; activity: Activity }> = {}
    activities.forEach((a) => {
      if (!a.best_efforts) return
      Object.entries(EFFORT_KEYS).forEach(([label, stravaKey]) => {
        const sec = a.best_efforts![stravaKey]
        if (!sec) return
        if (!bestMap[label] || sec < bestMap[label].sec) {
          bestMap[label] = { sec, activity: a }
        }
      })
    })
    return bestMap
  }, [activities])

  // Build trend data for 5K and 10K over time
  const effortTrend = useMemo(() => {
    const byDate: Record<string, { date: string; '5K'?: number; '10K'?: number }> = {}
    activities.forEach((a) => {
      if (!a.best_efforts) return
      const sec5k = a.best_efforts[EFFORT_KEYS['5K']]
      const sec10k = a.best_efforts[EFFORT_KEYS['10K']]
      if (!sec5k && !sec10k) return
      if (!byDate[a.date]) byDate[a.date] = { date: a.date.slice(5) }
      if (sec5k) byDate[a.date]['5K'] = Math.round(sec5k / 60 * 10) / 10  // minutes
      if (sec10k) byDate[a.date]['10K'] = Math.round(sec10k / 60 * 10) / 10
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [activities])

  const PR_DISTANCES = ['1K', '5K', '10K', '21K', '42K']
  const PR_COLORS: Record<string, string> = {
    '1K': '#f59e0b', '5K': '#8b5cf6', '10K': '#3b82f6', '21K': '#06b6d4', '42K': '#ec4899',
  }
  const PR_KM: Record<string, number> = {
    '1K': 1, '5K': 5, '10K': 10, '21K': 21.0975, '42K': 42.195,
  }

  return (
    <div className="space-y-8">

      {/* VO2max badge */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/20"
        >
          <span className="text-2xl">🧬</span>
          <div>
            <p className="text-xs text-gray-400">VO2max estimado</p>
            <p className="text-2xl font-bold text-white">{vo2max} <span className="text-sm text-gray-400">ml/kg/min</span></p>
          </div>
        </motion.div>
        {refRun && (
          <div className="text-sm text-gray-400">
            <p>Basado en: <span className="text-white">{refRun.name}</span></p>
            <p className="text-xs">{formatDate(refRun.date)} · {formatDistance(refRun.distance_km)} · {formatPace(refRun.pace_min_km)}</p>
          </div>
        )}
      </div>

      {/* PR Tracker */}
      {Object.keys(prByDistance).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
        >
          <h2 className="text-sm font-semibold text-white mb-4">🏆 Records Personales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            {PR_DISTANCES.map((dist) => {
              const pr = prByDistance[dist]
              if (!pr) return null
              return (
                <div
                  key={dist}
                  className="rounded-xl p-3 border"
                  style={{ borderColor: PR_COLORS[dist] + '30', background: PR_COLORS[dist] + '10' }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: PR_COLORS[dist] }}>{dist}</p>
                  <p className="text-lg font-mono font-bold text-white">{fmtTime(pr.sec)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtPaceFromSec(pr.sec, PR_KM[dist])}</p>
                  <p className="text-xs text-gray-600 mt-1 truncate" title={pr.activity.name}>
                    {formatDate(pr.activity.date)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* PR trend chart (5K & 10K over time) */}
          {effortTrend.length > 2 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Evolución de tiempos</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={effortTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                    reversed domain={['auto', 'auto']}
                    tickFormatter={(v) => `${Math.floor(v)}:${Math.round((v % 1) * 60).toString().padStart(2, '0')}`}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v, name) => {
                      const n = Number(v) || 0
                      const m = Math.floor(n); const s = Math.round((n - m) * 60)
                      return [`${m}:${s.toString().padStart(2, '0')}`, name]
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  {effortTrend.some((d) => d['5K']) && (
                    <Line type="monotone" dataKey="5K" name="5K" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} connectNulls />
                  )}
                  {effortTrend.some((d) => d['10K']) && (
                    <Line type="monotone" dataKey="10K" name="10K" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {/* Prediction cards from actual data */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Predicciones actuales (Riegel)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {initialPredictions.map((pred, i) => (
            <RacePredictionCard key={pred.distance} prediction={pred} index={i} />
          ))}
        </div>
      </div>

      {/* Interactive simulator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
      >
        <h2 className="text-sm font-semibold text-white mb-6">Simulador interactivo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Ritmo de referencia</label>
              <span className="text-sm font-mono text-violet-400">{paceDisplay}</span>
            </div>
            <input
              type="range" min={450} max={900} step={5} value={sliderPace}
              onChange={(e) => setSliderPace(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>4:30</span><span>9:00</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Distancia de referencia</label>
              <span className="text-sm font-mono text-violet-400">{(sliderDist / 10).toFixed(1)} km</span>
            </div>
            <input
              type="range" min={50} max={320} step={5} value={sliderDist}
              onChange={(e) => setSliderDist(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5 km</span><span>32 km</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {simulatedPredictions.map((pred, i) => (
            <RacePredictionCard key={pred.distance} prediction={pred} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Reference runs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
      >
        <h2 className="text-sm font-semibold text-white mb-4">Runs de referencia</h2>
        <div className="space-y-2">
          {runs.slice(0, 6).map((run) => (
            <div key={run.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <span className="text-lg">{getActivityIcon(run.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{run.name}</p>
                <p className="text-xs text-gray-500">{formatDate(run.date)} · {run.sport_type === 'TrailRun' ? '🏔 Trail' : '🛣 Ruta'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-white">{formatDistance(run.distance_km)}</p>
                <p className="text-xs text-violet-400">{formatPace(run.pace_min_km)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
