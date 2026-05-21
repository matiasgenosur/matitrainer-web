'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionTemplate, SessionTemplateHydrated } from '@/lib/types'
import { SESSION_TYPE_LABELS, SESSION_TYPE_COLORS } from '@/lib/session-types-ui'

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

export default function TemplatesClient() {
  const router = useRouter()
  const [templates, setTemplates] = useState<SessionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<SessionTemplateHydrated | null>(null)
  const [instantiating, setInstantiating] = useState<SessionTemplate | null>(null)

  async function refresh() {
    setLoading(true)
    const r = await fetch('/api/templates')
    const list = r.ok ? ((await r.json()) as SessionTemplate[]) : []
    setTemplates(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  async function openDetail(id: string) {
    const r = await fetch(`/api/templates/${id}`)
    if (r.ok) setDetail((await r.json()) as SessionTemplateHydrated)
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar plantilla?')) return
    const r = await fetch(`/api/templates/${id}?key=${trainerKey()}`, {
      method: 'DELETE',
    })
    if (r.ok) {
      setDetail(null)
      void refresh()
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Plantillas de sesión</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white w-64 focus:outline-none focus:border-violet-500"
        />
      </header>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">
          No hay plantillas todavía. Guarda una desde el editor de sesiones.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0"
                  style={{ backgroundColor: SESSION_TYPE_COLORS[t.session_type] }}
                >
                  {SESSION_TYPE_LABELS[t.session_type]}
                </span>
              </div>
              {t.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{t.description}</p>
              )}
              {t.estimated_duration_min && (
                <p className="text-xs text-gray-500">
                  ~{t.estimated_duration_min} min
                </p>
              )}
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => void openDetail(t.id)}
                  className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1"
                >
                  Ver
                </button>
                <button
                  onClick={() => setInstantiating(t)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1"
                >
                  Asignar
                </button>
                <button
                  onClick={() => void remove(t.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 ml-auto"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <TemplateDetailDialog
          template={detail}
          onClose={() => setDetail(null)}
        />
      )}

      {instantiating && (
        <InstantiateDialog
          template={instantiating}
          onClose={() => setInstantiating(null)}
          onCreated={(sessionId) =>
            router.push(`/trainer/sessions/${sessionId}/edit?key=${trainerKey()}`)
          }
        />
      )}
    </div>
  )
}

function TemplateDetailDialog({
  template,
  onClose,
}: {
  template: SessionTemplateHydrated
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-1">{template.name}</h2>
        {template.description && (
          <p className="text-sm text-gray-400 mb-4">{template.description}</p>
        )}
        <ul className="space-y-3">
          {template.blocks.map((b) => (
            <li key={b.id} className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">
                {b.block_type} · {b.rounds} rondas
              </p>
              <ul className="space-y-1">
                {b.items.map((it) => (
                  <li key={it.id} className="text-sm text-white">
                    {it.exercise?.name ?? it.exercise_id}
                    {it.variation && (
                      <span className="text-gray-400"> · {it.variation.name}</span>
                    )}
                    <span className="text-xs text-gray-500 ml-2">
                      {[
                        it.sets && it.sets !== 1 ? `${it.sets} sets` : null,
                        it.reps ? `${it.reps} reps` : null,
                        it.weight_kg ? `${it.weight_kg} kg` : null,
                        it.duration_sec ? `${it.duration_sec}s` : null,
                        it.distance_m
                          ? `${(it.distance_m / 1000).toFixed(2)} km`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-300 hover:text-white px-3 py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function InstantiateDialog({
  template,
  onClose,
  onCreated,
}: {
  template: SessionTemplate
  onClose: () => void
  onCreated: (sessionId: string) => void
}) {
  const [trainees, setTrainees] = useState<
    Array<{ id: string; display_name: string }>
  >([])
  const [traineeId, setTraineeId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/trainees?key=${trainerKey()}`)
      if (r.ok) setTrainees(await r.json())
    })()
  }, [])

  async function submit() {
    setSaving(true)
    setError(null)
    const r = await fetch(
      `/api/templates/${template.id}/instantiate?key=${trainerKey()}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trainee_id: traineeId, date }),
      }
    )
    setSaving(false)
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      setError(err.message ?? 'Error')
      return
    }
    const created = (await r.json()) as { id: string }
    onCreated(created.id)
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-1">Asignar plantilla</h2>
        <p className="text-sm text-gray-400 mb-4">{template.name}</p>

        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

        <label className="block text-xs font-medium text-gray-400 mb-1">
          Atleta
        </label>
        <select
          value={traineeId}
          onChange={(e) => setTraineeId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white mb-3"
        >
          <option value="">Seleccionar...</option>
          {trainees.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-gray-400 mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white mb-4"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            disabled={!traineeId || !date || saving}
            onClick={submit}
            className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
