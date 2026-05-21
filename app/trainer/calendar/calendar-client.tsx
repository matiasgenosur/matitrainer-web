'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlannedSessionSummary } from '@/lib/types'
import { SESSION_TYPE_COLORS, SESSION_TYPE_LABELS } from '@/lib/session-types-ui'

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function fmtISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function CalendarClient() {
  const router = useRouter()
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [sessions, setSessions] = useState<PlannedSessionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [trainees, setTrainees] = useState<
    Array<{ id: string; display_name: string }>
  >([])
  const [traineeFilter, setTraineeFilter] = useState<string>('')

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/trainees?key=${trainerKey()}`)
      if (r.ok) setTrainees(await r.json())
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const from = fmtISO(cursor)
      const to = fmtISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
      const params = new URLSearchParams({ from, to })
      if (traineeFilter) params.set('trainee_id', traineeFilter)
      const r = await fetch(`/api/planned-sessions?${params.toString()}`)
      const list = r.ok ? ((await r.json()) as PlannedSessionSummary[]) : []
      setSessions(list)
      setLoading(false)
    })()
  }, [cursor, traineeFilter])

  // Map of date -> sessions
  const byDate = useMemo(() => {
    const m = new Map<string, PlannedSessionSummary[]>()
    for (const s of sessions) {
      const arr = m.get(s.date) ?? []
      arr.push(s)
      m.set(s.date, arr)
    }
    return m
  }, [sessions])

  // Build grid: lead empty cells for Mon..weekday
  const firstWeekday = (cursor.getDay() + 6) % 7 // make Monday = 0
  const total = daysInMonth(cursor)
  const cells: Array<{ date: string | null; day: number | null }> = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= total; d++) {
    cells.push({
      date: fmtISO(new Date(cursor.getFullYear(), cursor.getMonth(), d)),
      day: d,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })

  const traineeName = (id: string) =>
    trainees.find((t) => t.id === id)?.display_name ?? id.slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={traineeFilter}
            onChange={(e) => setTraineeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los atletas</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            ←
          </button>
          <span className="text-sm font-medium text-white min-w-[10rem] text-center">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            →
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            Hoy
          </button>
          <button
            onClick={() =>
              router.push(`/trainer/sessions/new?key=${trainerKey()}`)
            }
            className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white"
          >
            + Sesión
          </button>
        </div>
      </header>

      {loading && <p className="text-xs text-gray-400 mb-2">Cargando...</p>}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-xs text-gray-400 font-semibold text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c.date) {
            return <div key={i} className="aspect-square bg-white/[0.02] rounded-lg" />
          }
          const list = byDate.get(c.date) ?? []
          const today = c.date === fmtISO(new Date())
          return (
            <div
              key={i}
              className={`min-h-[90px] aspect-auto p-1.5 rounded-lg border ${
                today
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-white/5 bg-white/5'
              }`}
            >
              <p className="text-[10px] text-gray-400 mb-1">{c.day}</p>
              <div className="flex flex-col gap-0.5">
                {list.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      router.push(
                        `/trainer/sessions/${s.id}/edit?key=${trainerKey()}`
                      )
                    }
                    className="text-left text-[10px] px-1.5 py-0.5 rounded text-white truncate hover:opacity-80"
                    style={{
                      backgroundColor: SESSION_TYPE_COLORS[s.session_type],
                    }}
                    title={`${s.name} · ${SESSION_TYPE_LABELS[s.session_type]} · ${traineeName(
                      s.trainee_id
                    )}`}
                  >
                    {traineeName(s.trainee_id)} · {s.name}
                  </button>
                ))}
                {list.length > 3 && (
                  <span className="text-[10px] text-gray-500">
                    +{list.length - 3} más
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
