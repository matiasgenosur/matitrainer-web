'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PlannedSessionHydrated } from '@/lib/types'
import { SESSION_TYPE_COLORS, SESSION_TYPE_LABELS } from '@/lib/session-types-ui'
import { DayDetailDrawer } from './day-detail-drawer'

function startOfWeekMonday(d: Date): Date {
  const day = (d.getDay() + 6) % 7 // Monday = 0
  const r = new Date(d)
  r.setDate(d.getDate() - day)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}

function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const WEEKDAYS_FULL = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

export default function WeekAgenda() {
  const [cursor, setCursor] = useState(() => startOfWeekMonday(new Date()))
  const [sessions, setSessions] = useState<PlannedSessionHydrated[]>([])
  const [loading, setLoading] = useState(true)
  const [openDate, setOpenDate] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const from = fmtISO(cursor)
      const to = fmtISO(addDays(cursor, 6))
      const r = await fetch(
        `/api/planned-sessions?from=${from}&to=${to}&hydrate=true`
      )
      setSessions(r.ok ? ((await r.json()) as PlannedSessionHydrated[]) : [])
      setLoading(false)
    })()
  }, [cursor])

  const byDate = useMemo(() => {
    const m = new Map<string, PlannedSessionHydrated[]>()
    for (const s of sessions) {
      const arr = m.get(s.date) ?? []
      arr.push(s)
      m.set(s.date, arr)
    }
    return m
  }, [sessions])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(cursor, i)
    return { date: fmtISO(d), dow: i, dayNum: d.getDate() }
  })

  const todayIso = fmtISO(new Date())

  // Weekly summary
  const totalKm =
    sessions.reduce((acc, s) => {
      const m = (s.blocks ?? []).reduce(
        (sb, b) =>
          sb + (b.items ?? []).reduce((si, it) => si + (it.distance_m ?? 0), 0),
        0
      )
      return acc + m
    }, 0) / 1000

  const totalMin = sessions.reduce(
    (acc, s) => acc + (s.estimated_duration_min ?? 0),
    0
  )

  const detail = openDate ? byDate.get(openDate) ?? [] : []

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Tu semana</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(addDays(cursor, -7))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            ← Semana anterior
          </button>
          <button
            onClick={() => setCursor(startOfWeekMonday(new Date()))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            Esta semana
          </button>
          <button
            onClick={() => setCursor(addDays(cursor, 7))}
            className="px-3 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5"
          >
            Semana siguiente →
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 mb-4">
            {days.map((d) => {
              const list = byDate.get(d.date) ?? []
              const isToday = d.date === todayIso
              return (
                <button
                  key={d.date}
                  onClick={() => setOpenDate(d.date)}
                  className={`text-left rounded-2xl border p-3 transition-colors ${
                    isToday
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className="text-xs text-gray-400 uppercase">
                    {WEEKDAYS_FULL[d.dow].slice(0, 3)}
                  </p>
                  <p className="text-lg font-semibold text-white">{d.dayNum}</p>
                  <div className="mt-2 space-y-1">
                    {list.length === 0 ? (
                      <p className="text-[10px] text-gray-500">Sin sesión</p>
                    ) : (
                      list.map((s) => {
                        const distM = (s.blocks ?? []).reduce(
                          (acc, b) =>
                            acc +
                            (b.items ?? []).reduce(
                              (si, it) => si + (it.distance_m ?? 0),
                              0
                            ),
                          0
                        )
                        return (
                          <div
                            key={s.id}
                            className="text-[11px] px-2 py-1 rounded-md text-white truncate"
                            style={{
                              backgroundColor:
                                SESSION_TYPE_COLORS[s.session_type],
                            }}
                            title={s.name}
                          >
                            <span className="font-medium">
                              {SESSION_TYPE_LABELS[s.session_type]}
                            </span>
                            {distM > 0 && (
                              <span className="ml-1 opacity-80">
                                · {(distM / 1000).toFixed(1)} km
                              </span>
                            )}
                            {s.estimated_duration_min && (
                              <span className="ml-1 opacity-80">
                                · {s.estimated_duration_min}m
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <footer className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-around text-center">
            <div>
              <p className="text-xs text-gray-400">Sesiones</p>
              <p className="text-lg font-semibold text-white">
                {sessions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Distancia</p>
              <p className="text-lg font-semibold text-white">
                {totalKm.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Duración estimada</p>
              <p className="text-lg font-semibold text-white">
                {Math.floor(totalMin / 60)}h {totalMin % 60}m
              </p>
            </div>
          </footer>
        </>
      )}

      {openDate && (
        <DayDetailDrawer
          date={openDate}
          sessions={detail}
          onClose={() => setOpenDate(null)}
        />
      )}
    </main>
  )
}
