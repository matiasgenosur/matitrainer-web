'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type {
  Exercise,
  ExerciseCategory,
  ExerciseDefaultUnit,
  ExerciseVariation,
  ExerciseWithVariations,
} from '@/lib/types'

const CATEGORIES: ExerciseCategory[] = [
  'running',
  'strength',
  'mobility',
  'cardio',
  'crossfit',
  'other',
]

const UNITS: ExerciseDefaultUnit[] = [
  'reps',
  'time_sec',
  'distance_m',
  'rounds',
  'weight_reps',
]

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  running: 'Running',
  strength: 'Fuerza',
  mobility: 'Movilidad',
  cardio: 'Cardio',
  crossfit: 'CrossFit',
  other: 'Otro',
}

const UNIT_LABELS: Record<ExerciseDefaultUnit, string> = {
  reps: 'Repeticiones',
  time_sec: 'Tiempo (seg)',
  distance_m: 'Distancia (m)',
  rounds: 'Rondas',
  weight_reps: 'Peso + reps',
}

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

export default function ExercisesClient() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<ExerciseWithVariations | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/exercises')
    const data = (await res.json()) as Exercise[]
    setExercises(data)
    setLoading(false)
  }

  async function openDetail(id: string) {
    const res = await fetch(`/api/exercises/${id}`)
    if (res.ok) setSelected((await res.json()) as ExerciseWithVariations)
  }

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (category !== 'all' && e.category !== category) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()))
        return false
      return true
    })
  }, [exercises, category, search])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Biblioteca de ejercicios</h1>
          <p className="text-sm text-gray-400 mt-1">
            {exercises.length} ejercicios · compartidos entre todos los trainers
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Crear ejercicio
        </button>
      </header>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 flex-1 min-w-[200px]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExerciseCategory | 'all')}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.02 }}
              onClick={() => openDetail(ex.id)}
              className="text-left bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-white/8 rounded-2xl p-4 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-violet-400">
                  {CATEGORY_LABELS[ex.category]}
                </span>
                <span className="text-xs text-gray-500">
                  {UNIT_LABELS[ex.default_unit]}
                </span>
              </div>
              <h3 className="text-white font-semibold mb-1">{ex.name}</h3>
              {ex.description && (
                <p className="text-xs text-gray-400 line-clamp-2">
                  {ex.description}
                </p>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ExerciseFormDialog
          exercise={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            void refresh()
          }}
        />
      )}

      {selected && (
        <ExerciseDetailDialog
          exercise={selected}
          onClose={() => setSelected(null)}
          onEdit={(e) => {
            setSelected(null)
            setEditing(e)
          }}
          onRefresh={async () => {
            const res = await fetch(`/api/exercises/${selected.id}`)
            if (res.ok) setSelected((await res.json()) as ExerciseWithVariations)
            void refresh()
          }}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Form dialog (create/edit)
// ----------------------------------------------------------------

function ExerciseFormDialog({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [category, setCategory] = useState<ExerciseCategory>(
    exercise?.category ?? 'strength'
  )
  const [unit, setUnit] = useState<ExerciseDefaultUnit>(
    exercise?.default_unit ?? 'reps'
  )
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url ?? '')
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const body = {
      name,
      category,
      default_unit: unit,
      video_url: videoUrl || null,
      description: description || null,
    }
    const url = exercise
      ? `/api/exercises/${exercise.id}?key=${trainerKey()}`
      : `/api/exercises?key=${trainerKey()}`
    const method = exercise ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.message ?? 'Error')
      return
    }
    onSaved()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-white mb-4">
        {exercise ? 'Editar ejercicio' : 'Crear ejercicio'}
      </h2>
      <Field label="Nombre">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Categoría">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidad primaria">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as ExerciseDefaultUnit)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="URL del video (opcional)">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
      </Field>
      <Field label="Descripción (opcional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500 resize-none"
        />
      </Field>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving || !name}
          className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

// ----------------------------------------------------------------
// Detail dialog with variations
// ----------------------------------------------------------------

function ExerciseDetailDialog({
  exercise,
  onClose,
  onEdit,
  onRefresh,
}: {
  exercise: ExerciseWithVariations
  onClose: () => void
  onEdit: (e: Exercise) => void
  onRefresh: () => Promise<void>
}) {
  const [addingVar, setAddingVar] = useState(false)
  const [editingVar, setEditingVar] = useState<ExerciseVariation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function deleteExercise() {
    if (!confirm(`Eliminar "${exercise.name}"?`)) return
    const res = await fetch(`/api/exercises/${exercise.id}?key=${trainerKey()}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      onClose()
      await onRefresh()
    } else {
      const err = await res.json().catch(() => ({}))
      setDeleteError(
        err.message
          ? `${err.message} (sesiones: ${err.usedInSessions ?? 0}, plantillas: ${err.usedInTemplates ?? 0})`
          : 'No se pudo eliminar'
      )
    }
  }

  async function deleteVariation(id: string) {
    if (!confirm('Eliminar variación?')) return
    const res = await fetch(`/api/variations/${id}?key=${trainerKey()}`, {
      method: 'DELETE',
    })
    if (res.ok) await onRefresh()
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-violet-400">
            {CATEGORY_LABELS[exercise.category]}
          </span>
          <h2 className="text-lg font-semibold text-white">{exercise.name}</h2>
          <p className="text-xs text-gray-500">
            Unidad: {UNIT_LABELS[exercise.default_unit]}
          </p>
        </div>
      </div>

      {exercise.description && (
        <p className="text-sm text-gray-300 mb-3">{exercise.description}</p>
      )}

      {exercise.video_url && (
        <a
          href={exercise.video_url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-violet-400 hover:text-violet-300 mb-4 underline"
        >
          Ver video ↗
        </a>
      )}

      <div className="border-t border-white/10 pt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">
            Variaciones ({exercise.variations.length})
          </h3>
          <button
            onClick={() => setAddingVar(true)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            + Agregar
          </button>
        </div>
        {exercise.variations.length === 0 ? (
          <p className="text-xs text-gray-500">Sin variaciones.</p>
        ) : (
          <ul className="space-y-1">
            {exercise.variations.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{v.name}</p>
                  {v.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {v.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <button
                    onClick={() => setEditingVar(v)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteVariation(v.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteError && (
        <p className="text-sm text-red-400 mb-3">{deleteError}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={deleteExercise}
          className="px-4 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Eliminar
        </button>
        <button
          onClick={() => onEdit(exercise)}
          className="px-4 py-2 rounded-xl text-sm text-white bg-white/10 hover:bg-white/15 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          Cerrar
        </button>
      </div>

      {(addingVar || editingVar) && (
        <VariationFormDialog
          exerciseId={exercise.id}
          variation={editingVar}
          onClose={() => {
            setAddingVar(false)
            setEditingVar(null)
          }}
          onSaved={async () => {
            setAddingVar(false)
            setEditingVar(null)
            await onRefresh()
          }}
        />
      )}
    </Modal>
  )
}

function VariationFormDialog({
  exerciseId,
  variation,
  onClose,
  onSaved,
}: {
  exerciseId: string
  variation: ExerciseVariation | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(variation?.name ?? '')
  const [videoUrl, setVideoUrl] = useState(variation?.video_url ?? '')
  const [description, setDescription] = useState(variation?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const body = {
      name,
      video_url: videoUrl || null,
      description: description || null,
    }
    const url = variation
      ? `/api/variations/${variation.id}?key=${trainerKey()}`
      : `/api/exercises/${exerciseId}/variations?key=${trainerKey()}`
    const method = variation ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) onSaved()
  }

  return (
    <Modal onClose={onClose} z={60}>
      <h2 className="text-lg font-semibold text-white mb-4">
        {variation ? 'Editar variación' : 'Nueva variación'}
      </h2>
      <Field label="Nombre">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
        />
      </Field>
      <Field label="URL del video (opcional)">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
        />
      </Field>
      <Field label="Descripción (opcional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500 resize-none"
        />
      </Field>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving || !name}
          className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

// ----------------------------------------------------------------
// Shared modal + field
// ----------------------------------------------------------------

function Modal({
  children,
  onClose,
  z = 50,
}: {
  children: React.ReactNode
  onClose: () => void
  z?: number
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: z }}
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
