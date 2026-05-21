'use client'

import { readinessColor } from './utils'

type SurveyPoint = {
  created_at: string
  readiness_score: number | null
}

// Compact sparkline of the last N readiness scores.
export function ReadinessTrend({
  surveys,
  width = 240,
  height = 60,
}: {
  surveys: SurveyPoint[]
  width?: number
  height?: number
}) {
  const points = [...surveys]
    .filter((s) => s.readiness_score != null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  if (points.length === 0) {
    return (
      <p className="text-xs text-gray-500 text-center py-4">
        Sin datos de readiness
      </p>
    )
  }

  const n = points.length
  const xs = points.map((_, i) => (n === 1 ? width / 2 : (i / (n - 1)) * width))
  const ys = points.map((p) => {
    const v = Math.max(0, Math.min(5, p.readiness_score ?? 0))
    return height - (v / 5) * height
  })

  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')

  const lastScore = points[points.length - 1].readiness_score
  const lastColor = readinessColor(lastScore)

  return (
    <svg width={width} height={height} className="overflow-visible">
      {[1, 2, 3, 4].map((v) => (
        <line
          key={v}
          x1={0}
          x2={width}
          y1={height - (v / 5) * height}
          y2={height - (v / 5) * height}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={path} fill="none" stroke={lastColor} strokeWidth={2} />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r={2.5}
          fill={readinessColor(points[i].readiness_score)}
        />
      ))}
    </svg>
  )
}
