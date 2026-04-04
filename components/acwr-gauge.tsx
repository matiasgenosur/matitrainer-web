'use client'

import { motion } from 'framer-motion'
import { ACWRResult } from '@/lib/types'

interface ACWRGaugeProps {
  result: ACWRResult
}

export default function ACWRGauge({ result }: ACWRGaugeProps) {
  // ACWR typically ranges 0-2, optimal zone 0.8-1.3
  const pct = Math.min(100, Math.max(0, (result.acwr / 2) * 100))

  const levelLabels = {
    low: 'Carga Baja',
    optimal: 'Zona Óptima',
    caution: 'Precaución',
    high: 'Riesgo Alto',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{result.acwr.toFixed(2)}</p>
          <p className="text-sm" style={{ color: result.color }}>{levelLabels[result.level]}</p>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-1">
          <p>Carga aguda: <span className="text-white">{result.acuteLoad}</span></p>
          <p>Carga crónica: <span className="text-white">{result.chronicLoad}</span></p>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden bg-white/10 relative">
          {/* Color zones */}
          <div className="absolute inset-0 flex">
            <div className="h-full bg-blue-500/40" style={{ width: '40%' }} />
            <div className="h-full bg-emerald-500/40" style={{ width: '25%' }} />
            <div className="h-full bg-amber-500/40" style={{ width: '10%' }} />
            <div className="h-full bg-red-500/40" style={{ width: '25%' }} />
          </div>
          {/* Indicator */}
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: result.color }}
          />
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0.0</span>
          <span className="text-blue-400">0.8</span>
          <span className="text-emerald-400">1.3</span>
          <span className="text-amber-400">1.5</span>
          <span className="text-red-400">2.0</span>
        </div>
      </div>

      <p className="text-xs text-gray-400">{result.message}</p>
    </div>
  )
}
