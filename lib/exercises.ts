import { supabaseAdmin } from './supabase-admin'
import { supabase } from './supabase'
import type {
  Exercise,
  ExerciseVariation,
  ExerciseWithVariations,
} from './types'

interface ListExercisesOpts {
  category?: string
  search?: string
  limit?: number
}

export async function listExercises(
  opts: ListExercisesOpts = {}
): Promise<Exercise[]> {
  let q = supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })
    .limit(opts.limit ?? 200)

  if (opts.category) q = q.eq('category', opts.category)
  if (opts.search && opts.search.length >= 2) {
    q = q.ilike('name', `%${opts.search}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Exercise[]
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Exercise) ?? null
}

export async function getExerciseWithVariations(
  id: string
): Promise<ExerciseWithVariations | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*, variations:exercise_variations(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const e = data as Exercise & { variations: ExerciseVariation[] }
  return { ...e, variations: e.variations ?? [] }
}

export async function createExercise(
  input: Partial<Exercise> & { name: string },
  createdBy?: string | null
): Promise<Exercise> {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .insert({ ...input, created_by: createdBy ?? null })
    .select('*')
    .single()
  if (error) throw error
  return data as Exercise
}

export async function updateExercise(
  id: string,
  patch: Partial<Exercise>
): Promise<Exercise> {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Exercise
}

/**
 * Tries to delete an exercise. Returns counts if it is in use so the
 * caller can prompt for a replacement.
 */
export async function deleteExercise(id: string): Promise<
  | { ok: true }
  | { ok: false; usedInBlockItems: number; usedInTemplateItems: number }
> {
  const [{ count: inBlocks }, { count: inTemplates }] = await Promise.all([
    supabaseAdmin
      .from('block_items')
      .select('id', { count: 'exact', head: true })
      .eq('exercise_id', id),
    supabaseAdmin
      .from('template_items')
      .select('id', { count: 'exact', head: true })
      .eq('exercise_id', id),
  ])

  const a = inBlocks ?? 0
  const b = inTemplates ?? 0
  if (a + b > 0) {
    return { ok: false, usedInBlockItems: a, usedInTemplateItems: b }
  }

  const { error } = await supabaseAdmin.from('exercises').delete().eq('id', id)
  if (error) throw error
  return { ok: true }
}

// ---- Variations ----

export async function listVariations(
  exerciseId: string
): Promise<ExerciseVariation[]> {
  const { data, error } = await supabase
    .from('exercise_variations')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('name')
  if (error) throw error
  return (data ?? []) as ExerciseVariation[]
}

export async function createVariation(
  exerciseId: string,
  input: { name: string; video_url?: string | null; description?: string | null },
  createdBy?: string | null
): Promise<ExerciseVariation> {
  const { data, error } = await supabaseAdmin
    .from('exercise_variations')
    .insert({ ...input, exercise_id: exerciseId, created_by: createdBy ?? null })
    .select('*')
    .single()
  if (error) throw error
  return data as ExerciseVariation
}

export async function updateVariation(
  id: string,
  patch: Partial<ExerciseVariation>
): Promise<ExerciseVariation> {
  const { data, error } = await supabaseAdmin
    .from('exercise_variations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ExerciseVariation
}

export async function deleteVariation(id: string): Promise<{ ok: true }> {
  const { error } = await supabaseAdmin
    .from('exercise_variations')
    .delete()
    .eq('id', id)
  if (error) throw error
  return { ok: true }
}
