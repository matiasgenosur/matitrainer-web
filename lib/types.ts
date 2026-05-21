export interface Split {
  km: number
  time_s: number
  pace_s_km: number | null
  gap_s_km: number | null
  hr: number | null
  elev_m: number
  pace_zone: number | null
}

export interface Activity {
  id: number
  name: string
  type: string
  sport_type?: string
  workout_type?: number
  date: string
  started_at?: string
  ended_at?: string
  start_lat?: number
  start_lng?: number
  city?: string
  country?: string
  distance_km: number
  moving_time_min: number
  elevation_m: number
  elev_high?: number
  elev_low?: number
  calories: number
  avg_hr?: number
  max_hr?: number
  pace_min_km: number
  avg_cadence?: number
  max_speed_ms?: number
  z1_min: number
  z2_min: number
  z3_min: number
  z4_min: number
  z5_min: number
  fatigue_score: number
  suffer_score?: number
  perceived_exertion?: number
  strava_link: string
  session_type: string
  fc_pct: number
  weekly_km: number
  achievement_count?: number
  pr_count?: number
  gear_name?: string
  gear_distance_km?: number
  device_name?: string
  description?: string
  splits_metric?: Split[]
  best_efforts?: Record<string, number>
  rpe?: number
  trainer_notes?: string
  planned_activity?: string
  comparison_vs_plan?: string
}

export interface WeeklyStats {
  week: string
  weekLabel: string
  totalKm: number
  runKm: number
  hikeKm: number
  soccerKm: number
  otherKm: number
  totalTime: number
  elevation: number
  calories: number
  avgFatigue: number
  activities: number
}

export interface ACWRResult {
  acwr: number
  acuteLoad: number
  chronicLoad: number
  level: 'low' | 'optimal' | 'caution' | 'high'
  message: string
  color: string
}

export interface RacePrediction {
  distance: string
  distanceKm: number
  time: string
  pace: string
  color: string
}

export interface Recommendation {
  type: 'rest' | 'easy' | 'moderate' | 'hard'
  title: string
  description: string
  icon: string
  color: string
  suggestedActivity?: string
}

export interface MatitrainerUser {
  id: string
  role: 'trainer' | 'trainee'
  display_name: string
  whatsapp_number: string | null
  strava_athlete_id: number | null
  created_at: string
}

export interface MatitrainerSession {
  id: string
  trainer_id: string
  trainee_id: string
  whatsapp_group_id: string | null
  status: 'pending' | 'active' | 'revoked'
  created_at: string
  activated_at: string | null
  revoked_at: string | null
  // Joined fields
  trainer?: MatitrainerUser
  trainee?: MatitrainerUser
}

export interface ReadinessSurvey {
  id: string
  session_id: string
  activity_id: number | null
  survey_date: string
  sleep_quality: number | null
  energy_level: number | null
  muscle_state: number | null
  stress_level: number | null
  mood: number | null
  readiness_score: number | null
  completed: boolean
  created_at: string
  // Phase 8 additions
  trainee_id?: string
  notes?: string | null
}

// ============================================================
// Planned Sessions v2 — exercise library, blocks, items, templates
// ============================================================

export type ExerciseCategory =
  | 'running'
  | 'strength'
  | 'mobility'
  | 'cardio'
  | 'crossfit'
  | 'other'

export type ExerciseDefaultUnit =
  | 'reps'         // e.g. push-ups, squats
  | 'time_sec'     // e.g. plank, mountain climbers
  | 'distance_m'   // e.g. long run, 400m repeats
  | 'rounds'       // e.g. generic block
  | 'weight_reps'  // e.g. deadlift, barbell squat

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  default_unit: ExerciseDefaultUnit
  video_url: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseVariation {
  id: string
  exercise_id: string
  name: string
  video_url: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseWithVariations extends Exercise {
  variations: ExerciseVariation[]
}

// Backend enum — keep in English for storage. UI maps to Spanish labels.
export type SessionType =
  | 'easy_run'
  | 'long_run'
  | 'tempo'
  | 'intervals'
  | 'fartlek'
  | 'recovery'
  | 'trail'
  | 'strength'
  | 'crossfit'
  | 'mobility'
  | 'cross_training'
  | 'rest'
  | 'other'

export type BlockType =
  | 'single'         // one exercise = the whole session (long run, bike)
  | 'straight_sets'  // linear sets (4x A rest, 4x B rest)
  | 'circuit'        // circuit (rounds rotating A->B->C->rest)
  | 'superset'       // A+B no rest, rest, repeat
  | 'warmup'
  | 'cooldown'
  // Phase 2: 'amrap' | 'emom' | 'for_time'

export interface PlannedSession {
  id: string
  trainer_id: string
  trainee_id: string
  date: string // ISO YYYY-MM-DD
  name: string
  session_type: SessionType
  estimated_duration_min: number | null
  notes: string | null
  template_id: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutBlock {
  id: string
  session_id: string
  order_index: number
  block_type: BlockType
  name: string | null
  rounds: number
  rest_between_rounds_sec: number | null
  duration_cap_sec: number | null
  notes: string | null
  created_at: string
}

export interface BlockItem {
  id: string
  block_id: string
  exercise_id: string
  variation_id: string | null
  order_index: number
  sets: number
  reps: number | null
  weight_kg: number | null
  duration_sec: number | null
  distance_m: number | null
  rest_after_sec: number | null
  rpe: number | null
  notes: string | null
  created_at: string
}

export interface BlockItemHydrated extends BlockItem {
  exercise: Exercise
  variation: ExerciseVariation | null
}

export interface WorkoutBlockHydrated extends WorkoutBlock {
  items: BlockItemHydrated[]
}

export interface PlannedSessionHydrated extends PlannedSession {
  blocks: WorkoutBlockHydrated[]
  trainee_name?: string
  trainer_name?: string
}

export interface PlannedSessionSummary {
  id: string
  trainer_id: string
  trainee_id: string
  date: string
  name: string
  session_type: SessionType
  estimated_duration_min: number | null
  block_count: number
  item_count: number
}

export interface SessionTemplate {
  id: string
  created_by: string
  name: string
  description: string | null
  session_type: SessionType
  estimated_duration_min: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TemplateBlock {
  id: string
  template_id: string
  order_index: number
  block_type: BlockType
  name: string | null
  rounds: number
  rest_between_rounds_sec: number | null
  duration_cap_sec: number | null
  notes: string | null
}

export interface TemplateItem {
  id: string
  block_id: string
  exercise_id: string
  variation_id: string | null
  order_index: number
  sets: number
  reps: number | null
  weight_kg: number | null
  duration_sec: number | null
  distance_m: number | null
  rest_after_sec: number | null
  rpe: number | null
  notes: string | null
}

export interface SessionTemplateHydrated extends SessionTemplate {
  blocks: Array<TemplateBlock & {
    items: Array<TemplateItem & {
      exercise: Exercise
      variation: ExerciseVariation | null
    }>
  }>
}

// ---- API input payloads ----

export interface BlockItemInput {
  exercise_id: string
  variation_id?: string | null
  order_index: number
  sets: number
  reps?: number | null
  weight_kg?: number | null
  duration_sec?: number | null
  distance_m?: number | null
  rest_after_sec?: number | null
  rpe?: number | null
  notes?: string | null
}

export interface WorkoutBlockInput {
  order_index: number
  block_type: BlockType
  name?: string | null
  rounds: number
  rest_between_rounds_sec?: number | null
  duration_cap_sec?: number | null
  notes?: string | null
  items: BlockItemInput[]
}

export interface PlannedSessionInput {
  trainer_id: string
  trainee_id: string
  date: string
  name: string
  session_type: SessionType
  estimated_duration_min?: number | null
  notes?: string | null
  template_id?: string | null
  blocks: WorkoutBlockInput[]
}

export interface SessionTemplateInput {
  created_by: string
  name: string
  description?: string | null
  session_type: SessionType
  estimated_duration_min?: number | null
  notes?: string | null
  blocks: WorkoutBlockInput[]
}

// ============================================================
// Phase 8 — Readiness alerts
// ============================================================

export type ReadinessAlertType =
  | 'low_score_streak'
  | 'acute_drop'
  | 'sleep_chronic'
  | 'muscular_persistent'
  | 'stress_high'
  | 'motivation_low'
  | 'combo_red'

export type ReadinessAlertSeverity = 'low' | 'medium' | 'high'

export type ReadinessAlertStatus =
  | 'pending'
  | 'acknowledged'
  | 'applied'
  | 'dismissed'
  | 'expired'

export interface ProposedChange {
  session_id: string
  field: 'distance_m' | 'session_type' | 'name' | 'estimated_duration_min' | 'notes'
  from: unknown
  to: unknown
}

export interface ReadinessAlert {
  id: string
  trainee_id: string
  trainer_id: string
  alert_type: ReadinessAlertType
  severity: ReadinessAlertSeverity
  triggered_at: string
  data: Record<string, unknown>
  suggested_action: string | null
  proposed_changes: ProposedChange[]
  affected_session_ids: string[]
  status: ReadinessAlertStatus
  acknowledged_at: string | null
  acknowledged_by: string | null
  trainer_notes: string | null
  applied_changes: ProposedChange[] | null
  created_at: string
}
