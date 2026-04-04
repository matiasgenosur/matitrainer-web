'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon: string
  trend?: number
  trendLabel?: string
  delay?: number
  color?: string
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  delay = 0,
  color = '#8b5cf6',
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/8 hover:border-white/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          {unit && <span className="text-sm text-gray-400">{unit}</span>}
        </div>
        <p className="text-sm text-gray-400">{label}</p>
        {trendLabel && (
          <p className="text-xs text-gray-500">{trendLabel}</p>
        )}
      </div>
    </motion.div>
  )
}
