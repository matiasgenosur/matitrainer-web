'use client'

import { motion } from 'framer-motion'
import { RacePrediction } from '@/lib/types'

interface RacePredictionCardProps {
  prediction: RacePrediction
  index: number
}

export default function RacePredictionCard({ prediction, index }: RacePredictionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 p-6 bg-white/5 backdrop-blur-sm hover:bg-white/8 transition-all"
    >
      {/* Glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: prediction.color }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: `${prediction.color}20`, color: prediction.color }}
          >
            {prediction.distance}
          </span>
          <span className="text-xs text-gray-500">{prediction.distanceKm.toFixed(1)} km</span>
        </div>

        <p className="text-3xl font-bold text-white mb-1 font-mono">{prediction.time}</p>
        <p className="text-sm" style={{ color: prediction.color }}>{prediction.pace}</p>
      </div>
    </motion.div>
  )
}
