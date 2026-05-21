'use client'

import { useEffect, useState } from 'react'
import type { ReadinessAlert } from '@/lib/types'
import { ALERT_TYPE_LABEL, SEVERITY_COLOR } from './utils'

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

type AlertWithName = ReadinessAlert & { trainee_name?: string }

export function AlertsPanel({
  traineeId,
  traineeNames,
}: {
  traineeId?: string
  traineeNames?: Record<string, string>
}) {
  const [alerts, setAlerts] = useState<AlertWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const params = new URLSearchParams({ status: 'pending' })
    if (traineeId) params.set('trainee_id', traineeId)
    const r = await fetch(`/api/readiness/alerts?${params.toString()}`)
    const list = (r.ok ? await r.json() : []) as ReadinessAlert[]
    setAlerts(
      list.map((a) => ({
        ...a,
        trainee_name: traineeNames?.[a.trainee_id],
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function act(id: string, action: 'accept' | 'dismiss') {
    setActingOn(id)
    await fetch(`/api/readiness/alerts/${id}/${action}?key=${trainerKey()}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    setActingOn(null)
    void refresh()
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando alertas...</p>
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No hay alertas pendientes. Todo en orden ✨
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => {
        const color = SEVERITY_COLOR[a.severity] ?? '#6b7280'
        const label = ALERT_TYPE_LABEL[a.alert_type] ?? a.alert_type
        return (
          <li
            key={a.id}
            className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {a.severity.toUpperCase()}
                  </span>
                  {a.trainee_name && (
                    <span className="text-xs text-gray-300">{a.trainee_name}</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(a.triggered_at).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <p className="text-sm text-white font-medium">{label}</p>
                {a.suggested_action && (
                  <p className="text-xs text-gray-400 mt-1">{a.suggested_action}</p>
                )}
                {a.affected_session_ids.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Sesiones afectadas: {a.affected_session_ids.length}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                disabled={actingOn === a.id}
                onClick={() => void act(a.id, 'dismiss')}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10"
              >
                Descartar
              </button>
              <button
                disabled={actingOn === a.id || a.proposed_changes.length === 0}
                onClick={() => void act(a.id, 'accept')}
                className="text-xs text-white px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
              >
                {a.proposed_changes.length === 0
                  ? 'Sin cambios'
                  : `Aplicar (${a.proposed_changes.length})`}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
