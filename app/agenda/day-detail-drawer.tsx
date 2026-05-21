'use client'

import type { PlannedSessionHydrated } from '@/lib/types'
import {
  SESSION_TYPE_COLORS,
  SESSION_TYPE_LABELS,
  BLOCK_TYPE_LABELS,
} from '@/lib/session-types-ui'

export function DayDetailDrawer({
  date,
  sessions,
  onClose,
}: {
  date: string
  sessions: PlannedSessionHydrated[]
  onClose: () => void
}) {
  const d = new Date(date + 'T12:00:00')
  const title = d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <aside
        className="bg-neutral-900 border-l border-white/10 w-full max-w-md h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <h2 className="text-lg font-semibold text-white capitalize">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="p-6 space-y-6">
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400">Sin sesión planificada.</p>
          ) : (
            sessions.map((s) => (
              <article
                key={s.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {s.name}
                    </h3>
                    {s.estimated_duration_min && (
                      <p className="text-xs text-gray-400">
                        ~{s.estimated_duration_min} min
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0"
                    style={{
                      backgroundColor: SESSION_TYPE_COLORS[s.session_type],
                    }}
                  >
                    {SESSION_TYPE_LABELS[s.session_type]}
                  </span>
                </div>

                {s.notes && (
                  <p className="text-xs text-gray-400 italic mb-3">{s.notes}</p>
                )}

                <ul className="space-y-3">
                  {(s.blocks ?? []).map((b) => (
                    <li key={b.id} className="bg-white/[0.03] rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-2">
                        {BLOCK_TYPE_LABELS[b.block_type]}
                        {b.rounds > 1 && ` · ${b.rounds} rondas`}
                        {b.rest_between_rounds_sec
                          ? ` · rest ${b.rest_between_rounds_sec}s`
                          : ''}
                      </p>
                      <ul className="space-y-1.5">
                        {(b.items ?? []).map((it) => (
                          <li key={it.id} className="text-sm text-white">
                            <span className="font-medium">
                              {it.exercise?.name ?? it.exercise_id}
                            </span>
                            {it.variation && (
                              <span className="text-gray-400">
                                {' '}
                                · {it.variation.name}
                              </span>
                            )}
                            <p className="text-xs text-gray-400">
                              {[
                                it.sets && it.sets !== 1
                                  ? `${it.sets} sets`
                                  : null,
                                it.reps ? `${it.reps} reps` : null,
                                it.weight_kg ? `${it.weight_kg} kg` : null,
                                it.duration_sec ? `${it.duration_sec}s` : null,
                                it.distance_m
                                  ? `${(it.distance_m / 1000).toFixed(2)} km`
                                  : null,
                                it.rpe ? `RPE ${it.rpe}` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            {it.notes && (
                              <p className="text-xs text-gray-500 italic">
                                {it.notes}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
