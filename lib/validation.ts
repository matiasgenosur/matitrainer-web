import { z } from 'zod'

// ============================================================
// Exercise library
// ============================================================

export const exerciseCategory = z.enum([
  'running',
  'strength',
  'mobility',
  'cardio',
  'crossfit',
  'other',
])

export const exerciseDefaultUnit = z.enum([
  'reps',
  'time_sec',
  'distance_m',
  'rounds',
  'weight_reps',
])

export const exerciseInputSchema = z.object({
  name: z.string().min(1).max(120),
  category: exerciseCategory.default('other'),
  default_unit: exerciseDefaultUnit.default('reps'),
  video_url: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
})

export const exercisePatchSchema = exerciseInputSchema.partial()

export const variationInputSchema = z.object({
  name: z.string().min(1).max(120),
  video_url: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
})

export const variationPatchSchema = variationInputSchema.partial()

// ============================================================
// Planned sessions
// ============================================================

export const sessionType = z.enum([
  'easy_run',
  'long_run',
  'tempo',
  'intervals',
  'fartlek',
  'recovery',
  'trail',
  'strength',
  'crossfit',
  'mobility',
  'cross_training',
  'rest',
  'other',
])

export const blockType = z.enum([
  'single',
  'straight_sets',
  'circuit',
  'superset',
  'warmup',
  'cooldown',
])

export const blockItemInputSchema = z.object({
  exercise_id: z.string().uuid(),
  variation_id: z.string().uuid().nullable().optional(),
  order_index: z.number().int().min(0),
  sets: z.number().int().min(1),
  reps: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).nullable().optional(),
  duration_sec: z.number().int().min(0).nullable().optional(),
  distance_m: z.number().int().min(0).nullable().optional(),
  rest_after_sec: z.number().int().min(0).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const workoutBlockInputSchema = z.object({
  order_index: z.number().int().min(0),
  block_type: blockType,
  name: z.string().max(120).nullable().optional(),
  rounds: z.number().int().min(1),
  rest_between_rounds_sec: z.number().int().min(0).nullable().optional(),
  duration_cap_sec: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(blockItemInputSchema),
})

export const plannedSessionInputSchema = z.object({
  // trainer_id is injected server-side from the authenticated trainer; the
  // client may omit it (and forging it has no effect).
  trainer_id: z.string().uuid().optional(),
  trainee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(200),
  session_type: sessionType,
  estimated_duration_min: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  blocks: z.array(workoutBlockInputSchema),
})

// ============================================================
// Templates
// ============================================================

export const templateInputSchema = z.object({
  created_by: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  session_type: sessionType,
  estimated_duration_min: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  blocks: z.array(workoutBlockInputSchema),
})

export const duplicateSessionBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trainee_id: z.string().uuid().optional(),
})

export const saveAsTemplateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
})

export const instantiateTemplateBody = z.object({
  trainee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// ============================================================
// Helpers
// ============================================================

export function badRequest(message: string, details?: unknown) {
  return Response.json(
    { error: 'invalid_input', message, details },
    { status: 400 }
  )
}
