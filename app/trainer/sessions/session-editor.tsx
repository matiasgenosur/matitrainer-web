'use client'

import { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  BlockType,
  Exercise,
  ExerciseWithVariations,
  PlannedSessionHydrated,
  PlannedSessionInput,
  SessionType,
  WorkoutBlockInput,
  BlockItemInput,
} from '@/lib/types'
import {
  BLOCK_TYPES,
  BLOCK_TYPE_LABELS,
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
} from '@/lib/session-types-ui'

// ============================================================
// Editor state — reducer
// ============================================================

type EditorState = {
  trainer_id: string
  trainee_id: string
  date: string
  name: string
  session_type: SessionType
  estimated_duration_min: number | null
  notes: string | null
  template_id: string | null
  blocks: Array<WorkoutBlockInput & { _localId: string }>
}

type Action =
  | { type: 'SET_META'; patch: Partial<EditorState> }
  | { type: 'ADD_BLOCK'; block: WorkoutBlockInput & { _localId: string } }
  | { type: 'UPDATE_BLOCK'; localId: string; patch: Partial<WorkoutBlockInput> }
  | { type: 'REMOVE_BLOCK'; localId: string }
  | { type: 'MOVE_BLOCK'; localId: string; dir: -1 | 1 }
  | { type: 'DUPLICATE_BLOCK'; localId: string }
  | { type: 'ADD_ITEM'; blockId: string; item: BlockItemInput }
  | {
      type: 'UPDATE_ITEM'
      blockId: string
      itemIndex: number
      patch: Partial<BlockItemInput>
    }
  | { type: 'REMOVE_ITEM'; blockId: string; itemIndex: number }
  | { type: 'MOVE_ITEM'; blockId: string; itemIndex: number; dir: -1 | 1 }
  | { type: 'REORDER_BLOCKS'; from: number; to: number }
  | { type: 'REORDER_ITEMS'; blockId: string; from: number; to: number }
  | { type: 'HYDRATE'; data: EditorState }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_META':
      return { ...state, ...action.patch }
    case 'ADD_BLOCK':
      return {
        ...state,
        blocks: [...state.blocks, { ...action.block, order_index: state.blocks.length }],
      }
    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b._localId === action.localId ? { ...b, ...action.patch } : b
        ),
      }
    case 'REMOVE_BLOCK':
      return {
        ...state,
        blocks: state.blocks
          .filter((b) => b._localId !== action.localId)
          .map((b, i) => ({ ...b, order_index: i })),
      }
    case 'MOVE_BLOCK': {
      const i = state.blocks.findIndex((b) => b._localId === action.localId)
      const j = i + action.dir
      if (i < 0 || j < 0 || j >= state.blocks.length) return state
      const next = [...state.blocks]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...state, blocks: next.map((b, k) => ({ ...b, order_index: k })) }
    }
    case 'DUPLICATE_BLOCK': {
      const orig = state.blocks.find((b) => b._localId === action.localId)
      if (!orig) return state
      const copy = {
        ...orig,
        _localId: localId(),
        items: orig.items.map((i) => ({ ...i })),
      }
      const idx = state.blocks.findIndex((b) => b._localId === action.localId)
      const next = [...state.blocks]
      next.splice(idx + 1, 0, copy)
      return { ...state, blocks: next.map((b, k) => ({ ...b, order_index: k })) }
    }
    case 'ADD_ITEM':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b._localId === action.blockId
            ? {
                ...b,
                items: [
                  ...b.items,
                  { ...action.item, order_index: b.items.length },
                ],
              }
            : b
        ),
      }
    case 'UPDATE_ITEM':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b._localId === action.blockId
            ? {
                ...b,
                items: b.items.map((it, k) =>
                  k === action.itemIndex ? { ...it, ...action.patch } : it
                ),
              }
            : b
        ),
      }
    case 'REMOVE_ITEM':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b._localId === action.blockId
            ? {
                ...b,
                items: b.items
                  .filter((_, k) => k !== action.itemIndex)
                  .map((it, k) => ({ ...it, order_index: k })),
              }
            : b
        ),
      }
    case 'MOVE_ITEM': {
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b._localId !== action.blockId) return b
          const i = action.itemIndex
          const j = i + action.dir
          if (j < 0 || j >= b.items.length) return b
          const next = [...b.items]
          ;[next[i], next[j]] = [next[j], next[i]]
          return { ...b, items: next.map((it, k) => ({ ...it, order_index: k })) }
        }),
      }
    }
    case 'REORDER_BLOCKS': {
      if (action.from === action.to) return state
      const next = arrayMoveLocal(state.blocks, action.from, action.to)
      return { ...state, blocks: next.map((b, k) => ({ ...b, order_index: k })) }
    }
    case 'REORDER_ITEMS': {
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b._localId !== action.blockId) return b
          if (action.from === action.to) return b
          const next = arrayMoveLocal(b.items, action.from, action.to)
          return { ...b, items: next.map((it, k) => ({ ...it, order_index: k })) }
        }),
      }
    }
    case 'HYDRATE':
      return action.data
    default:
      return state
  }
}

function arrayMoveLocal<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

let _id = 0
function localId() {
  _id++
  return `local-${Date.now()}-${_id}`
}

function trainerKey() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('key') ?? 'diego2026'
}

const emptyState: EditorState = {
  trainer_id: '',
  trainee_id: '',
  date: new Date().toISOString().slice(0, 10),
  name: '',
  session_type: 'easy_run',
  estimated_duration_min: null,
  notes: null,
  template_id: null,
  blocks: [],
}

// ============================================================
// Main component
// ============================================================

export default function SessionEditor({
  mode,
  sessionId,
}: {
  mode: 'new' | 'edit'
  sessionId?: string
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, emptyState)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseWithVariations[]>([])
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const [pickerEdit, setPickerEdit] = useState<{
    blockId: string
    index: number
  } | null>(null)
  const [trainees, setTrainees] = useState<
    Array<{ id: string; display_name: string }>
  >([])
  const [templateOpen, setTemplateOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    void (async () => {
      // Load library once
      const [exList, traineeList] = await Promise.all([
        fetch('/api/exercises').then((r) => r.json()),
        fetch(`/api/trainees?key=${trainerKey()}`).then((r) =>
          r.ok ? r.json() : []
        ),
      ])

      // Hydrate variations per exercise
      const hydrated = await Promise.all(
        (exList as Exercise[]).map((e) =>
          fetch(`/api/exercises/${e.id}`).then((r) => r.json())
        )
      )
      setExercises(hydrated)
      setTrainees(
        (traineeList as Array<{ id: string; display_name: string }>).map((u) => ({
          id: u.id,
          display_name: u.display_name,
        }))
      )

      if (mode === 'edit' && sessionId) {
        const r = await fetch(`/api/planned-sessions/${sessionId}`)
        if (r.ok) {
          const data = (await r.json()) as PlannedSessionHydrated
          dispatch({
            type: 'HYDRATE',
            data: hydratedToState(data),
          })
        }
      }
      setLoading(false)
    })()
  }, [mode, sessionId])

  async function save() {
    setSaving(true)
    setError(null)
    const payload: PlannedSessionInput = {
      trainer_id: state.trainer_id,
      trainee_id: state.trainee_id,
      date: state.date,
      name: state.name,
      session_type: state.session_type,
      estimated_duration_min: state.estimated_duration_min,
      notes: state.notes,
      template_id: state.template_id,
      blocks: state.blocks.map((b) => ({
        order_index: b.order_index,
        block_type: b.block_type,
        name: b.name,
        rounds: b.rounds,
        rest_between_rounds_sec: b.rest_between_rounds_sec,
        duration_cap_sec: b.duration_cap_sec,
        notes: b.notes,
        items: b.items,
      })),
    }
    const url =
      mode === 'edit'
        ? `/api/planned-sessions/${sessionId}?key=${trainerKey()}`
        : `/api/planned-sessions?key=${trainerKey()}`
    const r = await fetch(url, {
      method: mode === 'edit' ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      setError(err.message ?? 'Error al guardar')
      return
    }
    const saved = (await r.json()) as PlannedSessionHydrated
    router.push(`/trainer/sessions/${saved.id}/edit?key=${trainerKey()}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">
          {mode === 'edit' ? 'Editar sesión' : 'Nueva sesión'}
        </h1>
        <div className="flex items-center gap-2">
          {mode === 'edit' && sessionId && (
            <>
              <button
                onClick={async () => {
                  const r = await fetch(
                    `/api/planned-sessions/${sessionId}/duplicate?key=${trainerKey()}`,
                    { method: 'POST' }
                  )
                  if (r.ok) {
                    const dup = (await r.json()) as { id: string }
                    router.push(`/trainer/sessions/${dup.id}/edit?key=${trainerKey()}`)
                  }
                }}
                className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl border border-white/10"
              >
                Duplicar
              </button>
              <button
                onClick={() => setTemplateOpen(true)}
                className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl border border-white/10"
              >
                Guardar como plantilla
              </button>
            </>
          )}
          <button
            onClick={save}
            disabled={saving || !state.name || !state.trainee_id || state.blocks.length === 0}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Session metadata */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
        <Field label="Nombre">
          <input
            type="text"
            value={state.name}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { name: e.target.value } })}
            placeholder="ej: Long run domingo"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
          />
        </Field>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              value={state.date}
              onChange={(e) => dispatch({ type: 'SET_META', patch: { date: e.target.value } })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            />
          </Field>
          <Field label="Tipo de sesión">
            <select
              value={state.session_type}
              onChange={(e) =>
                dispatch({ type: 'SET_META', patch: { session_type: e.target.value as SessionType } })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            >
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duración estimada (min)">
            <input
              type="number"
              min={0}
              value={state.estimated_duration_min ?? ''}
              onChange={(e) =>
                dispatch({
                  type: 'SET_META',
                  patch: {
                    estimated_duration_min: e.target.value ? parseInt(e.target.value, 10) : null,
                  },
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            />
          </Field>
          <Field label="Atleta">
            <select
              value={state.trainee_id}
              onChange={(e) =>
                dispatch({ type: 'SET_META', patch: { trainee_id: e.target.value } })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">Seleccionar...</option>
              {trainees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notas">
          <textarea
            value={state.notes ?? ''}
            onChange={(e) => dispatch({ type: 'SET_META', patch: { notes: e.target.value || null } })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white resize-none focus:outline-none focus:border-violet-500"
          />
        </Field>
      </section>

      {/* Blocks */}
      <section className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            const from = state.blocks.findIndex((b) => b._localId === active.id)
            const to = state.blocks.findIndex((b) => b._localId === over.id)
            if (from < 0 || to < 0) return
            dispatch({ type: 'REORDER_BLOCKS', from, to })
          }}
        >
          <SortableContext
            items={state.blocks.map((b) => b._localId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {state.blocks.map((b, idx) => (
                <BlockCard
                  key={b._localId}
                  block={b}
                  index={idx}
                  total={state.blocks.length}
                  exercises={exercises}
                  dispatch={dispatch}
                  onAddItem={() => setPickerOpen(b._localId)}
                  onEditItem={(i) => setPickerEdit({ blockId: b._localId, index: i })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          onClick={() =>
            dispatch({
              type: 'ADD_BLOCK',
              block: {
                _localId: localId(),
                order_index: state.blocks.length,
                block_type: 'single',
                name: null,
                rounds: 1,
                rest_between_rounds_sec: null,
                duration_cap_sec: null,
                notes: null,
                items: [],
              },
            })
          }
          className="w-full bg-white/5 hover:bg-white/8 border border-dashed border-white/20 rounded-2xl py-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          + Agregar bloque
        </button>
      </section>

      {pickerOpen && (
        <ItemPickerDialog
          exercises={exercises}
          onClose={() => setPickerOpen(null)}
          onSelect={(item) => {
            dispatch({ type: 'ADD_ITEM', blockId: pickerOpen, item })
            setPickerOpen(null)
          }}
        />
      )}

      {pickerEdit && (
        <ItemPickerDialog
          exercises={exercises}
          initial={
            state.blocks.find((b) => b._localId === pickerEdit.blockId)?.items[
              pickerEdit.index
            ]
          }
          onClose={() => setPickerEdit(null)}
          onSelect={(item) => {
            dispatch({
              type: 'UPDATE_ITEM',
              blockId: pickerEdit.blockId,
              itemIndex: pickerEdit.index,
              patch: item,
            })
            setPickerEdit(null)
          }}
        />
      )}

      {templateOpen && sessionId && (
        <SaveAsTemplateDialog
          sessionId={sessionId}
          defaultName={state.name}
          onClose={() => setTemplateOpen(false)}
        />
      )}
    </div>
  )
}

function SaveAsTemplateDialog({
  sessionId,
  defaultName,
  onClose,
}: {
  sessionId: string
  defaultName: string
  onClose: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    const r = await fetch(
      `/api/planned-sessions/${sessionId}/save-as-template?key=${trainerKey()}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      }
    )
    setSaving(false)
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      setError(err.message ?? 'Error')
      return
    }
    onClose()
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
        <h2 className="text-lg font-semibold text-white mb-4">Guardar como plantilla</h2>
        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        <Field label="Nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
          />
        </Field>
        <Field label="Descripción">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
          />
        </Field>
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            disabled={saving || !name.trim()}
            onClick={submit}
            className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Block card
// ============================================================

function BlockCard({
  block,
  index,
  total,
  exercises,
  dispatch,
  onAddItem,
  onEditItem,
}: {
  block: WorkoutBlockInput & { _localId: string }
  index: number
  total: number
  exercises: ExerciseWithVariations[]
  dispatch: React.Dispatch<Action>
  onAddItem: () => void
  onEditItem: (i: number) => void
}) {
  const sortable = useSortable({ id: block._localId })
  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="bg-white/5 border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            className="cursor-grab text-gray-500 hover:text-white px-1 text-sm select-none"
            aria-label="Arrastrar"
            type="button"
          >
            ⋮⋮
          </button>
          <select
            value={block.block_type}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_BLOCK',
                localId: block._localId,
                patch: { block_type: e.target.value as BlockType },
              })
            }
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {BLOCK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={block.rounds}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_BLOCK',
                localId: block._localId,
                patch: { rounds: parseInt(e.target.value, 10) || 1 },
              })
            }
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white w-16"
          />
          <span className="text-xs text-gray-400">rondas</span>
          <input
            type="number"
            min={0}
            value={block.rest_between_rounds_sec ?? ''}
            placeholder="rest seg"
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_BLOCK',
                localId: block._localId,
                patch: {
                  rest_between_rounds_sec: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                },
              })
            }
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white w-20"
          />
        </div>
        <div className="flex gap-1">
          <button
            disabled={index === 0}
            onClick={() => dispatch({ type: 'MOVE_BLOCK', localId: block._localId, dir: -1 })}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-2"
          >
            ↑
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => dispatch({ type: 'MOVE_BLOCK', localId: block._localId, dir: 1 })}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-2"
          >
            ↓
          </button>
          <button
            onClick={() => dispatch({ type: 'DUPLICATE_BLOCK', localId: block._localId })}
            className="text-xs text-violet-400 hover:text-violet-300 px-2"
          >
            Duplicar
          </button>
          <button
            onClick={() => dispatch({ type: 'REMOVE_BLOCK', localId: block._localId })}
            className="text-xs text-red-400 hover:text-red-300 px-2"
          >
            Eliminar
          </button>
        </div>
      </div>

      <DndContext
        sensors={itemSensors}
        collisionDetection={closestCenter}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e
          if (!over || active.id === over.id) return
          const from = block.items.findIndex(
            (it, k) => itemKey(block._localId, it, k) === active.id
          )
          const to = block.items.findIndex(
            (it, k) => itemKey(block._localId, it, k) === over.id
          )
          if (from < 0 || to < 0) return
          dispatch({ type: 'REORDER_ITEMS', blockId: block._localId, from, to })
        }}
      >
        <SortableContext
          items={block.items.map((it, k) => itemKey(block._localId, it, k))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2 mb-3">
            {block.items.map((item, i) => {
              const ex = exercises.find((e) => e.id === item.exercise_id) ?? null
              const variation =
                ex?.variations.find((v) => v.id === item.variation_id) ?? null
              return (
                <SortableItemRow
                  key={itemKey(block._localId, item, i)}
                  rowId={itemKey(block._localId, item, i)}
                  item={item}
                  index={i}
                  exerciseName={ex?.name ?? item.exercise_id}
                  variationName={variation?.name ?? null}
                  onEdit={() => onEditItem(i)}
                  onRemove={() =>
                    dispatch({ type: 'REMOVE_ITEM', blockId: block._localId, itemIndex: i })
                  }
                />
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        onClick={onAddItem}
        className="w-full bg-white/5 hover:bg-white/8 border border-dashed border-white/15 rounded-xl py-2 text-xs text-violet-400 hover:text-violet-300"
      >
        + Agregar ejercicio
      </button>
    </div>
  )
}

function itemKey(blockLocalId: string, _it: BlockItemInput, idx: number): string {
  return `${blockLocalId}:item:${idx}`
}

function SortableItemRow({
  rowId,
  item,
  exerciseName,
  variationName,
  onEdit,
  onRemove,
}: {
  rowId: string
  item: BlockItemInput
  index: number
  exerciseName: string
  variationName: string | null
  onEdit: () => void
  onRemove: () => void
}) {
  const sortable = useSortable({ id: rowId })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  }
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className="bg-white/5 rounded-xl p-3 flex items-start justify-between gap-3"
    >
      <button
        {...sortable.attributes}
        {...sortable.listeners}
        type="button"
        className="cursor-grab text-gray-500 hover:text-white text-sm select-none mt-0.5"
        aria-label="Arrastrar ejercicio"
      >
        ⋮⋮
      </button>
      <button onClick={onEdit} className="flex-1 text-left">
        <p className="text-sm text-white font-medium">
          {exerciseName}
          {variationName && (
            <span className="text-gray-400 font-normal"> · {variationName}</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">{formatItemMetrics(item)}</p>
        {item.notes && (
          <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
        )}
      </button>
      <button
        onClick={onRemove}
        className="text-xs text-red-400 hover:text-red-300 px-1 shrink-0"
      >
        ✕
      </button>
    </li>
  )
}

function formatItemMetrics(item: BlockItemInput): string {
  const parts: string[] = []
  if (item.sets && item.sets !== 1) parts.push(`${item.sets} sets`)
  if (item.reps) parts.push(`${item.reps} reps`)
  if (item.weight_kg) parts.push(`${item.weight_kg} kg`)
  if (item.duration_sec) parts.push(`${item.duration_sec} seg`)
  if (item.distance_m) parts.push(`${(item.distance_m / 1000).toFixed(2)} km`)
  if (item.rest_after_sec) parts.push(`rest ${item.rest_after_sec}s`)
  if (item.rpe) parts.push(`RPE ${item.rpe}`)
  return parts.join(' · ') || '—'
}

// ============================================================
// Item picker dialog
// ============================================================

function ItemPickerDialog({
  exercises,
  initial,
  onClose,
  onSelect,
}: {
  exercises: ExerciseWithVariations[]
  initial?: BlockItemInput
  onClose: () => void
  onSelect: (item: BlockItemInput) => void
}) {
  const [exerciseId, setExerciseId] = useState(initial?.exercise_id ?? '')
  const [variationId, setVariationId] = useState<string | null>(
    initial?.variation_id ?? null
  )
  const [sets, setSets] = useState(initial?.sets ?? 1)
  const [reps, setReps] = useState<number | null>(initial?.reps ?? null)
  const [weight, setWeight] = useState<number | null>(initial?.weight_kg ?? null)
  const [duration, setDuration] = useState<number | null>(
    initial?.duration_sec ?? null
  )
  const [distance, setDistance] = useState<number | null>(
    initial?.distance_m ?? null
  )
  const [rest, setRest] = useState<number | null>(initial?.rest_after_sec ?? null)
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [search, setSearch] = useState('')

  const ex = exercises.find((e) => e.id === exerciseId) ?? null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          {initial ? 'Editar ejercicio' : 'Agregar ejercicio'}
        </h2>

        {!exerciseId ? (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white mb-3"
            />
            <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
              {exercises
                .filter((e) =>
                  e.name.toLowerCase().includes(search.toLowerCase())
                )
                .slice(0, 50)
                .map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => setExerciseId(e.id)}
                      className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {e.name}
                      <span className="text-xs text-gray-500 ml-2">
                        {e.category}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm text-white mb-1">{ex?.name}</p>
            <button
              onClick={() => {
                setExerciseId('')
                setVariationId(null)
              }}
              className="text-xs text-violet-400 mb-3"
            >
              ← Elegir otro ejercicio
            </button>

            {ex && ex.variations.length > 0 && (
              <Field label="Variación (opcional)">
                <select
                  value={variationId ?? ''}
                  onChange={(e) => setVariationId(e.target.value || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Sin variación específica</option>
                  {ex.variations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sets">
                <input
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="Reps">
                <input
                  type="number"
                  min={0}
                  value={reps ?? ''}
                  onChange={(e) =>
                    setReps(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="Peso (kg)">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={weight ?? ''}
                  onChange={(e) =>
                    setWeight(e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="Duración (seg)">
                <input
                  type="number"
                  min={0}
                  value={duration ?? ''}
                  onChange={(e) =>
                    setDuration(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="Distancia (m)">
                <input
                  type="number"
                  min={0}
                  value={distance ?? ''}
                  onChange={(e) =>
                    setDistance(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="Descanso post (seg)">
                <input
                  type="number"
                  min={0}
                  value={rest ?? ''}
                  onChange={(e) =>
                    setRest(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
              <Field label="RPE (1-10)">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rpe ?? ''}
                  onChange={(e) =>
                    setRpe(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </Field>
            </div>
            <Field label="Notas">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </Field>
          </>
        )}

        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          {exerciseId && (
            <button
              onClick={() =>
                onSelect({
                  exercise_id: exerciseId,
                  variation_id: variationId,
                  order_index: initial?.order_index ?? 0,
                  sets,
                  reps,
                  weight_kg: weight,
                  duration_sec: duration,
                  distance_m: distance,
                  rest_after_sec: rest,
                  rpe,
                  notes: notes || null,
                })
              }
              className="px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white"
            >
              {initial ? 'Actualizar' : 'Agregar'}
            </button>
          )}
        </div>
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
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

// ============================================================
// Hydration helpers
// ============================================================

function hydratedToState(data: PlannedSessionHydrated): EditorState {
  return {
    trainer_id: data.trainer_id,
    trainee_id: data.trainee_id,
    date: data.date,
    name: data.name,
    session_type: data.session_type,
    estimated_duration_min: data.estimated_duration_min,
    notes: data.notes,
    template_id: data.template_id,
    blocks: data.blocks.map((b) => ({
      _localId: localId(),
      order_index: b.order_index,
      block_type: b.block_type,
      name: b.name,
      rounds: b.rounds,
      rest_between_rounds_sec: b.rest_between_rounds_sec,
      duration_cap_sec: b.duration_cap_sec,
      notes: b.notes,
      items: b.items.map((i) => ({
        exercise_id: i.exercise_id,
        variation_id: i.variation_id,
        order_index: i.order_index,
        sets: i.sets,
        reps: i.reps,
        weight_kg: i.weight_kg,
        duration_sec: i.duration_sec,
        distance_m: i.distance_m,
        rest_after_sec: i.rest_after_sec,
        rpe: i.rpe,
        notes: i.notes,
      })),
    })),
  }
}
