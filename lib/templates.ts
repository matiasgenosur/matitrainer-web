import { supabaseAdmin } from './supabase-admin'
import { supabase } from './supabase'
import { createPlannedSession, getPlannedSession } from './planned-sessions'
import type {
  PlannedSessionHydrated,
  PlannedSessionInput,
  SessionTemplate,
  SessionTemplateHydrated,
  SessionTemplateInput,
} from './types'

const HYDRATED_TEMPLATE_SELECT =
  '*, blocks:template_blocks(*, items:template_items(*, exercise:exercises(*), variation:exercise_variations(*)))'

interface ListTemplatesOpts {
  createdBy?: string
  search?: string
}

export async function listTemplates(
  opts: ListTemplatesOpts = {}
): Promise<SessionTemplate[]> {
  let q = supabase
    .from('session_templates')
    .select('*')
    .order('updated_at', { ascending: false })

  if (opts.createdBy) q = q.eq('created_by', opts.createdBy)
  if (opts.search && opts.search.length >= 2) {
    q = q.ilike('name', `%${opts.search}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as SessionTemplate[]
}

export async function getTemplate(
  id: string
): Promise<SessionTemplateHydrated | null> {
  const { data, error } = await supabase
    .from('session_templates')
    .select(HYDRATED_TEMPLATE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return normalizeTemplate(data)
}

function normalizeTemplate(row: unknown): SessionTemplateHydrated {
  const r = row as SessionTemplateHydrated
  const blocks = (r.blocks ?? [])
    .map((b) => ({
      ...b,
      items: (b.items ?? []).sort((x, y) => x.order_index - y.order_index),
    }))
    .sort((x, y) => x.order_index - y.order_index)
  return { ...r, blocks }
}

export async function createTemplate(
  input: SessionTemplateInput
): Promise<SessionTemplateHydrated> {
  const { data: tpl, error: tErr } = await supabaseAdmin
    .from('session_templates')
    .insert({
      created_by: input.created_by,
      name: input.name,
      description: input.description ?? null,
      session_type: input.session_type,
      estimated_duration_min: input.estimated_duration_min ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (tErr) throw tErr

  await insertTemplateBlocksAndItems(tpl.id, input.blocks)

  const hydrated = await getTemplate(tpl.id)
  if (!hydrated) throw new Error('Failed to load created template')
  return hydrated
}

export async function updateTemplate(
  id: string,
  input: SessionTemplateInput
): Promise<SessionTemplateHydrated> {
  const { error: upErr } = await supabaseAdmin
    .from('session_templates')
    .update({
      created_by: input.created_by,
      name: input.name,
      description: input.description ?? null,
      session_type: input.session_type,
      estimated_duration_min: input.estimated_duration_min ?? null,
      notes: input.notes ?? null,
    })
    .eq('id', id)
  if (upErr) throw upErr

  const { error: delErr } = await supabaseAdmin
    .from('template_blocks')
    .delete()
    .eq('template_id', id)
  if (delErr) throw delErr

  await insertTemplateBlocksAndItems(id, input.blocks)

  const hydrated = await getTemplate(id)
  if (!hydrated) throw new Error('Failed to reload template')
  return hydrated
}

export async function deleteTemplate(id: string) {
  const { error } = await supabaseAdmin
    .from('session_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
  return { ok: true as const }
}

export async function instantiateTemplate(
  templateId: string,
  args: { trainerId: string; traineeId: string; date: string }
): Promise<PlannedSessionHydrated> {
  const tpl = await getTemplate(templateId)
  if (!tpl) throw new Error('Template not found')

  const input: PlannedSessionInput = {
    trainer_id: args.trainerId,
    trainee_id: args.traineeId,
    date: args.date,
    name: tpl.name,
    session_type: tpl.session_type,
    estimated_duration_min: tpl.estimated_duration_min,
    notes: tpl.notes,
    template_id: tpl.id,
    blocks: tpl.blocks.map((b) => ({
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

export async function saveSessionAsTemplate(
  sessionId: string,
  args: { name: string; description?: string | null }
): Promise<SessionTemplateHydrated> {
  const session = await getPlannedSession(sessionId)
  if (!session) throw new Error('Session not found')

  const input: SessionTemplateInput = {
    created_by: session.trainer_id,
    name: args.name,
    description: args.description ?? null,
    session_type: session.session_type,
    estimated_duration_min: session.estimated_duration_min,
    notes: session.notes,
    blocks: session.blocks.map((b) => ({
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
  return createTemplate(input)
}

// ---- internal ----

async function insertTemplateBlocksAndItems(
  templateId: string,
  blocks: SessionTemplateInput['blocks']
) {
  for (const block of blocks) {
    const { data: blockRow, error: bErr } = await supabaseAdmin
      .from('template_blocks')
      .insert({
        template_id: templateId,
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
      .from('template_items')
      .insert(itemsPayload)
    if (iErr) throw iErr
  }
}
