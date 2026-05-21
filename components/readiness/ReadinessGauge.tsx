'use client'

import { readinessColor, readinessLabel } from './utils'

export function ReadinessGauge({
  score,
  size = 96,
  showLabel = true,
}: {
  score: number | null | undefined
  size?: number
  showLabel?: boolean
}) {
  const v = score ?? 0
  const pct = Math.max(0, Math.min(1, v / 5))
  const color = readinessColor(score)
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          fill="white"
          fontSize={size * 0.28}
          fontWeight="600"
        >
          {score != null ? score.toFixed(1) : '–'}
        </text>
      </svg>
      {showLabel && (
        <p className="text-xs text-gray-400 mt-1">{readinessLabel(score)}</p>
      )}
    </div>
  )
}
