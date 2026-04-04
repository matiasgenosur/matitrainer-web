'use client'

import { motion } from 'framer-motion'
import { Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  recommendation: Recommendation
}

export default function RecommendationCard({ recommendation: rec }: RecommendationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
      style={{
        background: `linear-gradient(135deg, ${rec.color}10 0%, rgba(10,10,15,0.8) 100%)`,
        borderColor: `${rec.color}30`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: `${rec.color}20` }}
        >
          {rec.icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: rec.color }}>
            Hoy te recomendamos
          </p>
          <h3 className="text-lg font-bold text-white">{rec.title}</h3>
          <p className="text-sm text-gray-400">{rec.description}</p>
          {rec.suggestedActivity && (
            <div
              className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: `${rec.color}15`, color: rec.color }}
            >
              {rec.suggestedActivity}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
