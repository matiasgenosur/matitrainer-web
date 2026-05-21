'use client'

import { useEffect, useState } from 'react'
import { ReadinessGauge } from '@/components/readiness/ReadinessGauge'
import { ReadinessHeatmap } from '@/components/readiness/ReadinessHeatmap'
import { ReadinessTrend } from '@/components/readiness/ReadinessTrend'
import { AlertsPanel } from '@/components/readiness/AlertsPanel'

type Survey = {
  id: string
  created_at: string
  readiness_score: number | null
  sleep_quality: number | null
  energy_level: number | null
  muscle_state: number | null
  stress_level: number | null
  mood: number | null
}

type Trainee = { id: string; display_name: string }

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

export default function AthleteDetail({ traineeId }: { traineeId: string }) {
  const [trainee, setTrainee] = useState<Trainee | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [traineesR, surveysR] = await Promise.all([
        fetch(`/api/trainees?key=${trainerKey()}`),
        fetch(`/api/readiness/surveys?trainee_id=${traineeId}&days=60`),
      ])
      const trainees = traineesR.ok ? ((await traineesR.json()) as Trainee[]) : []
      setTrainee(trainees.find((t) => t.id === traineeId) ?? null)
      setSurveys(surveysR.ok ? ((await surveysR.json()) as Survey[]) : [])
      setLoading(false)
    })()
  }, [traineeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const latest = surveys[0] ?? null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {trainee?.display_name ?? 'Atleta'}
        </h1>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <ReadinessGauge score={latest?.readiness_score ?? null} size={96} />
          <div>
            <p className="text-xs text-gray-400">Readiness actual</p>
            {latest && (
              <p className="text-[10px] text-gray-500 mt-1">
                {new Date(latest.created_at).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:col-span-2">
          <p className="text-xs text-gray-400 mb-2">Tendencia (30d)</p>
          <ReadinessTrend
            surveys={surveys.slice(0, 30)}
            width={400}
            height={80}
          />
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-xs text-gray-400 mb-2">Heatmap de readiness (6 semanas)</p>
        <ReadinessHeatmap surveys={surveys} weeks={6} />
      </section>

      {latest && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Última encuesta</p>
          <div className="grid grid-cols-5 gap-3 text-center">
            <Dim label="Sueño" v={latest.sleep_quality} />
            <Dim label="Energía" v={latest.energy_level} />
            <Dim label="Muscular" v={latest.muscle_state} />
            <Dim label="Estrés" v={latest.stress_level} />
            <Dim label="Ánimo" v={latest.mood} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Alertas</h2>
        <AlertsPanel traineeId={traineeId} />
      </section>
    </div>
  )
}

function Dim({ label, v }: { label: string; v: number | null }) {
  const color =
    v == null
      ? '#374151'
      : v >= 4
      ? '#22c55e'
      : v >= 3
      ? '#84cc16'
      : v >= 2
      ? '#f59e0b'
      : '#ef4444'
  return (
    <div>
      <div
        className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-semibold"
        style={{ backgroundColor: color }}
      >
        {v ?? '–'}
      </div>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}
