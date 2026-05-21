import { supabaseAdmin } from './supabase-admin'
import { supabase } from './supabase'
import type {
  PlannedSession,
  PlannedSessionHydrated,
  PlannedSessionInput,
  PlannedSessionSummary,
  WorkoutBlockHydrated,
  BlockItemHydrated,
} from './types'

interface ListOpts {
  traineeId?: string
  trainerId?: string
  from?: string
  to?: string
}

const HYDRATED_SELECT =
  '*, blocks:workout_blocks(*, items:block_items(*, exercise:exercises(*), variation:exercise_variations(*)))'

export async function listPlannedSessions(
  opts: ListOpts = {}
): Promise<PlannedSessionSummary[]> {
  let q = supabase
    .from('planned_sessions_summary')
    .select('*')
    .order('date', { ascending: true })

  if (opts.traineeId) q = q.eq('trainee_id', opts.traineeId)
  if (opts.trainerId) q = q.eq('trainer_id', opts.trainerId)
  if (opts.from) q = q.gte('date', opts.from)
  if (opts.to) q = q.lte('date', opts.to)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as PlannedSessionSummary[]
}

export async function listPlannedSessionsHydrated(
  opts: ListOpts = {}
): Promise<PlannedSessionHydrated[]> {
  let q = supabase
    .from('planned_sessions')
    .select(HYDRATED_SELECT)
    .order('date', { ascending: true })

  if (opts.traineeId) q = q.eq('trainee_id', opts.traineeId)
  if (opts.trainerId) q = q.eq('trainer_id', opts.trainerId)
  if (opts.from) q = q.gte('date', opts.from)
  if (opts.to) q = q.lte('date', opts.to)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(normalizeHydrated)
}

export async function getPlannedSession(
  id: string
): Promise<PlannedSessionHydrated | null> {
  const { data, error } = await supabase
    .from('planned_sessions')
    .select(HYDRATED_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return normalizeHydrated(data)
}

function normalizeHydrated(row: unknown): PlannedSessionHydrated {
  const r = row as PlannedSession & {
    blocks?: Array<WorkoutBlockHydrated & { items?: BlockItemHydrated[] }>
  }
  const blocks = (r.blocks ?? [])
    .map((b) => ({
      ...b,
      items: (b.items ?? []).sort((x, y) => x.order_index - y.order_index),
    }))
    .sort((x, y) => x.order_index - y.order_index)
  return { ...r, blocks }
}

export async function createPlannedSession(
  input: PlannedSessionInput
): Promise<PlannedSessionHydrated> {
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('planned_sessions')
    .insert({
      trainer_id: input.trainer_id,
      trainee_id: input.trainee_id,
      date: input.date,
      name: input.name,
      session_type: input.session_type,
      estimated_duration_min: input.estimated_duration_min ?? null,
      notes: input.notes ?? null,
      template_id: input.template_id ?? null,
    })
    .select('*')
    .single()
  if (sessErr) throw sessErr

  await insertBlocksAndItems(session.id, input.blocks)

  const hydrated = await getPlannedSession(session.id)
  if (!hydrated) throw new Error('Failed to load created session')
  return hydrated
}

export async function updatePlannedSession(
  id: string,
  input: PlannedSessionInput
): Promise<PlannedSessionHydrated> {
  // Replace-strategy: caller sends the full session shape.
  // Not truly transactional without an RPC, but blocks cascade-delete
  // items so the window of inconsistency is short.
  const { error: upErr } = await supabaseAdmin
    .from('planned_sessions')
    .update({
      trainer_id: input.trainer_id,
      trainee_id: input.trainee_id,
      date: input.date,
      name: input.name,
      session_type: input.session_type,
      estimated_duration_min: input.estimated_duration_min ?? null,
      notes: input.notes ?? null,
      template_id: input.template_id ?? null,
    })
    .eq('id', id)
  if (upErr) throw upErr

  const { error: delErr } = await supabaseAdmin
    .from('workout_blocks')
    .delete()
    .eq('session_id', id)
  if (delErr) throw delErr

  await insertBlocksAndItems(id, input.blocks)

  const hydrated = await getPlannedSession(id)
  if (!hydrated) throw new Error('Failed to reload session')
  return hydrated
}

export async function deletePlannedSession(id: string) {
  const { error } = await supabaseAdmin
    .from('planned_sessions')
    .delete()
    .eq('id', id)
  if (error) throw error
  return { ok: true as const }
}

export async function duplicatePlannedSession(
  id: string,
  newDate: string,
  newTraineeId?: string
): Promise<PlannedSessionHydrated> {
  const original = await getPlannedSession(id)
  if (!original) throw new Error('Session not found')

  const input: PlannedSessionInput = {
    trainer_id: original.trainer_id,
    trainee_id: newTraineeId ?? original.trainee_id,
    date: newDate,
    name: original.name,
    session_type: original.session_type,
    estimated_duration_min: original.estimated_duration_min,
    notes: original.notes,
    template_id: original.template_id,
    blocks: original.blocks.map((b) => ({
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
  return createPlannedSession(input)
}

// ---- internal ----

async function insertBlocksAndItems(
  sessionId: string,
  blocks: PlannedSessionInput['blocks']
) {
  for (const block of blocks) {
    const { data: blockRow, error: bErr } = await supabaseAdmin
      .from('workout_blocks')
      .insert({
        session_id: sessionId,
        order_index: block.order_index,
        block_type: block.block_type,
        name: block.name ?? null,
        rounds: block.rounds,
        rest_between_rounds_sec: block.rest_between_rounds_sec ?? null,
        duration_cap_sec: block.duration_cap_sec ?? null,
        notes: block.notes ?? null,
      })
      .select('id')
      .single()
    if (bErr) throw bErr

    if (block.items.length === 0) continue

    const itemsPayload = block.items.map((i) => ({
      block_id: blockRow.id,
      exercise_id: i.exercise_id,
      variation_id: i.variation_id ?? null,
      order_index: i.order_index,
      sets: i.sets,
      reps: i.reps ?? null,
      weight_kg: i.weight_kg ?? null,
      duration_sec: i.duration_sec ?? null,
      distance_m: i.distance_m ?? null,
      rest_after_sec: i.rest_after_sec ?? null,
      rpe: i.rpe ?? null,
      notes: i.notes ?? null,
    }))

    const { error: iErr } = await supabaseAdmin
      .from('block_items')
      .insert(itemsPayload)
    if (iErr) throw iErr
  }
}
