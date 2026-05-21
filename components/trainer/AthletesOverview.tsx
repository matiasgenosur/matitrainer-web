'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ReadinessGauge } from '@/components/readiness/ReadinessGauge'
import { ReadinessTrend } from '@/components/readiness/ReadinessTrend'

type Trainee = { id: string; display_name: string }

type Survey = {
  trainee_id: string | null
  readiness_score: number | null
  created_at: string
}

type AlertSummary = { trainee_id: string; pending: number }

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

export function AthletesOverview() {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [surveysByTrainee, setSurveysByTrainee] = useState<
    Record<string, Survey[]>
  >({})
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const tr = await fetch(`/api/trainees?key=${trainerKey()}`)
      const traineeList = tr.ok ? ((await tr.json()) as Trainee[]) : []
      setTrainees(traineeList)

      const [surveysR, alertsR] = await Promise.all([
        fetch('/api/readiness/surveys?days=30'),
        fetch('/api/readiness/alerts?status=pending'),
      ])
      const allSurveys = surveysR.ok ? ((await surveysR.json()) as Survey[]) : []
      const alerts = alertsR.ok
        ? ((await alertsR.json()) as Array<{ trainee_id: string }>)
        : []

      const byTrainee: Record<string, Survey[]> = {}
      for (const s of allSurveys) {
        if (!s.trainee_id) continue
        ;(byTrainee[s.trainee_id] ??= []).push(s)
      }
      setSurveysByTrainee(byTrainee)

      const counts: Record<string, number> = {}
      for (const a of alerts) {
        counts[a.trainee_id] = (counts[a.trainee_id] ?? 0) + 1
      }
      setAlertCounts(counts)

      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando atletas...</p>
  }

  if (trainees.length === 0) {
    return <p className="text-sm text-gray-500">Sin atletas todavía.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {trainees.map((t) => {
        const surveys = surveysByTrainee[t.id] ?? []
        const latest = surveys[0]?.readiness_score ?? null
        const pending = alertCounts[t.id] ?? 0
        return (
          <Link
            key={t.id}
            href={`/trainer/athletes/${t.id}?key=${trainerKey()}`}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors flex items-center gap-4"
          >
            <ReadinessGauge score={latest} size={72} showLabel={false} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {t.display_name}
              </p>
              <p className="text-xs text-gray-400 mb-2">
                {surveys.length} encuestas (30d)
              </p>
              <ReadinessTrend surveys={surveys} width={160} height={32} />
              {pending > 0 && (
                <p className="text-xs mt-2 text-red-400">
                  {pending} alerta{pending === 1 ? '' : 's'} pendiente
                  {pending === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
