'use client'

import { readinessColor } from './utils'

type SurveyPoint = {
  created_at: string
  readiness_score: number | null
}

function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Heatmap of the last `weeks` weeks (rows = weeks, cols = Mon..Sun).
// Each cell colored by readiness score for that day.
export function ReadinessHeatmap({
  surveys,
  weeks = 6,
}: {
  surveys: SurveyPoint[]
  weeks?: number
}) {
  // Bucket scores by date (last score per day)
  const byDate = new Map<string, number | null>()
  for (const s of surveys) {
    const d = fmtISO(new Date(s.created_at))
    if (!byDate.has(d)) byDate.set(d, s.readiness_score)
  }

  // Build grid: starting Monday `weeks-1` weeks ago
  const today = new Date()
  const todayDow = (today.getDay() + 6) % 7 // Mon=0
  const start = new Date(today)
  start.setDate(today.getDate() - todayDow - (weeks - 1) * 7)

  const rows: Array<Array<{ date: string; score: number | null | undefined }>> = []
  for (let w = 0; w < weeks; w++) {
    const row: Array<{ date: string; score: number | null | undefined }> = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start)
      dt.setDate(start.getDate() + w * 7 + d)
      const iso = fmtISO(dt)
      row.push({ date: iso, score: byDate.get(iso) })
    }
    rows.push(row)
  }

  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {labels.map((l) => (
          <div key={l} className="text-[10px] text-gray-500 text-center">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-rows-6 gap-1">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {row.map((cell) => (
              <div
                key={cell.date}
                className="aspect-square rounded-sm"
                style={{ backgroundColor: readinessColor(cell.score) }}
                title={`${cell.date}: ${
                  cell.score != null ? cell.score.toFixed(1) : 'sin datos'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
