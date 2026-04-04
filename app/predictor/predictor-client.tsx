'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, RacePrediction } from '@/lib/types'
import RacePredictionCard from '@/components/race-prediction-card'
import { formatPace, formatDistance, formatDate, getActivityIcon } from '@/lib/utils'

interface PredictorClientProps {
  initialPredictions: RacePrediction[]
  vo2max: number
  refRun: Activity | null
  activities: Activity[]
}

// Riegel formula
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

  return {
    time: timeStr,
    pace: `${paceMins}:${paceSecs.toString().padStart(2, '0')} /km`,
  }
}

const DISTANCES = [
  { label: '5K', km: 5, color: '#8b5cf6' },
  { label: '10K', km: 10, color: '#3b82f6' },
  { label: '21K', km: 21.0975, color: '#06b6d4' },
  { label: '42K', km: 42.195, color: '#ec4899' },
]

export default function PredictorClient({
  initialPredictions,
  vo2max,
  refRun,
  activities,
}: PredictorClientProps) {
  const runs = activities
    .filter((a) => a.type === 'Run' && a.distance_km >= 10 && a.pace_min_km > 0 && a.pace_min_km < 15)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Slider: reference pace in min/km * 100 (to use integer slider)
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

      {/* Prediction cards from actual data */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Predicciones actuales</h2>
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
          {/* Pace slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Ritmo de referencia</label>
              <span className="text-sm font-mono text-violet-400">{paceDisplay}</span>
            </div>
            <input
              type="range"
              min={450}
              max={900}
              step={5}
              value={sliderPace}
              onChange={(e) => setSliderPace(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>4:30</span>
              <span>9:00</span>
            </div>
          </div>

          {/* Distance slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Distancia de referencia</label>
              <span className="text-sm font-mono text-violet-400">{(sliderDist / 10).toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min={50}
              max={320}
              step={5}
              value={sliderDist}
              onChange={(e) => setSliderDist(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5 km</span>
              <span>32 km</span>
            </div>
          </div>
        </div>

        {/* Simulated predictions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {simulatedPredictions.map((pred, i) => (
            <RacePredictionCard key={pred.distance} prediction={pred} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Reference runs list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
      >
        <h2 className="text-sm font-semibold text-white mb-4">Runs de referencia disponibles</h2>
        <div className="space-y-2">
          {runs.slice(0, 6).map((run) => (
            <div
              key={run.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span className="text-lg">{getActivityIcon(run.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{run.name}</p>
                <p className="text-xs text-gray-500">{formatDate(run.date)}</p>
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
