import { supabaseAdmin } from './supabase-admin'
import type {
  PlannedSession,
  ProposedChange,
  ReadinessAlert,
  ReadinessAlertSeverity,
  ReadinessAlertType,
  ReadinessSurvey,
  SessionType,
} from './types'

// ============================================================
// Readiness alerts engine — 7 deterministic rules.
//
// Rules operate on the last N completed readiness_surveys for a
// trainee and (when relevant) the next 7 days of planned_sessions.
// Each rule yields zero or more AlertCandidate objects that we
// persist into readiness_alerts. We never apply changes here —
// proposed_changes is a recommendation the trainer accepts later
// via /api/readiness/alerts/[id]/accept.
// ============================================================

const LOW_SCORE = 2.8
const VERY_LOW_SCORE = 2.2
const LOW_DIM = 2 // dimension 1-5 considered low at <= 2
const HISTORY_DAYS = 14
const PLAN_HORIZON_DAYS = 7

type SurveyRow = ReadinessSurvey & { trainee_id: string }

interface AlertCandidate {
  alert_type: ReadinessAlertType
  severity: ReadinessAlertSeverity
  data: Record<string, unknown>
  suggested_action: string
  proposed_changes: ProposedChange[]
  affected_session_ids: string[]
}

// ============================================================
// Data loaders
// ============================================================

async function loadRecentSurveys(
  traineeId: string,
  days: number
): Promise<SurveyRow[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  // readiness_surveys.trainee_id may not be populated on legacy rows,
  // so we resolve trainee via the matitrainer_session join.
  const { data, error } = await supabaseAdmin
    .from('readiness_surveys')
    .select('*, matitrainer_sessions!session_id(trainee_id, trainer_id)')
    .gte('created_at', since.toISOString())
    .eq('completed', true)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  type SessionRef = { trainee_id: string; trainer_id: string }
  return data
    .map((row) => {
      const s = row as ReadinessSurvey & {
        matitrainer_sessions?: SessionRef | SessionRef[] | null
      }
      const ms = s.matitrainer_sessions
      const joined: SessionRef | null = Array.isArray(ms)
        ? ms[0] ?? null
        : ms ?? null
      const tid = s.trainee_id ?? joined?.trainee_id
      if (!tid) return null
      return { ...s, trainee_id: tid } as SurveyRow
    })
    .filter((s): s is SurveyRow => s !== null && s.trainee_id === traineeId)
}

async function loadUpcomingPlannedSessions(
  traineeId: string,
  days: number
): Promise<PlannedSession[]> {
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date()
  end.setDate(end.getDate() + days)
  const endStr = end.toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('planned_sessions')
    .select('*')
    .eq('trainee_id', traineeId)
    .gte('date', today)
    .lte('date', endStr)
    .order('date', { ascending: true })

  if (error || !data) return []
  return data as PlannedSession[]
}

// ============================================================
// Rule helpers
// ============================================================

function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function isHighIntensity(s: PlannedSession): boolean {
  const hard: SessionType[] = ['intervals', 'tempo', 'long_run', 'crossfit', 'fartlek']
  return hard.includes(s.session_type)
}

function isStrength(s: PlannedSession): boolean {
  return s.session_type === 'strength' || s.session_type === 'crossfit'
}

function downgradeChanges(sessions: PlannedSession[]): ProposedChange[] {
  return sessions.flatMap((s) => {
    if (s.session_type === 'rest') return []
    return [
      {
        session_id: s.id,
        field: 'session_type',
        from: s.session_type,
        to: 'recovery',
      } as ProposedChange,
    ]
  })
}

function reduceVolumeChanges(
  sessions: PlannedSession[],
  ratio = 0.7
): ProposedChange[] {
  return sessions
    .filter((s) => s.estimated_duration_min && s.estimated_duration_min > 0)
    .map(
      (s): ProposedChange => ({
        session_id: s.id,
        field: 'estimated_duration_min',
        from: s.estimated_duration_min,
        to: Math.round((s.estimated_duration_min as number) * ratio),
      })
    )
}

// ============================================================
// Rule engine — produces 0..N candidates
// ============================================================

function runRules(
  surveys: SurveyRow[],
  upcoming: PlannedSession[]
): AlertCandidate[] {
  const out: AlertCandidate[] = []
  if (surveys.length === 0) return out

  // surveys are sorted desc by created_at
  const latest = surveys[0]
  const last3 = surveys.slice(0, 3)
  const last7 = surveys.slice(0, 7)

  const next7HighIntensity = upcoming.filter(isHighIntensity)
  const next7Strength = upcoming.filter(isStrength)

  // Rule 1 — low_score_streak: avg(last3) <= LOW_SCORE
  if (last3.length === 3) {
    const scores = last3
      .map((s) => s.readiness_score ?? null)
      .filter((v): v is number => v !== null)
    if (scores.length === 3) {
      const a = avg(scores)
      if (a <= LOW_SCORE) {
        out.push({
          alert_type: 'low_score_streak',
          severity: a <= VERY_LOW_SCORE ? 'high' : 'medium',
          data: { avg: Math.round(a * 100) / 100, scores },
          suggested_action:
            'Reducir volumen e intensidad de las próximas sesiones.',
          proposed_changes: reduceVolumeChanges(upcoming.slice(0, 3)),
          affected_session_ids: upcoming.slice(0, 3).map((s) => s.id),
        })
      }
    }
  }

  // Rule 2 — acute_drop: latest score drops > 1.0 vs avg of previous 5
  if (last7.length >= 6 && latest.readiness_score != null) {
    const prev = last7
      .slice(1, 6)
      .map((s) => s.readiness_score)
      .filter((v): v is number => v != null)
    if (prev.length >= 3) {
      const base = avg(prev)
      const drop = base - latest.readiness_score
      if (drop >= 1.0) {
        out.push({
          alert_type: 'acute_drop',
          severity: drop >= 1.5 ? 'high' : 'medium',
          data: {
            current: latest.readiness_score,
            previous_avg: Math.round(base * 100) / 100,
            drop: Math.round(drop * 100) / 100,
          },
          suggested_action:
            'Caída aguda de readiness. Sugerir descanso o sesión de recuperación hoy.',
          proposed_changes: downgradeChanges(upcoming.slice(0, 1)),
          affected_session_ids: upcoming.slice(0, 1).map((s) => s.id),
        })
      }
    }
  }

  // Rule 3 — sleep_chronic: sleep_quality <= 2 in 4+ of last 7 surveys
  if (last7.length >= 5) {
    const lowSleep = last7.filter(
      (s) => (s.sleep_quality ?? 5) <= LOW_DIM
    ).length
    if (lowSleep >= 4) {
      out.push({
        alert_type: 'sleep_chronic',
        severity: lowSleep >= 6 ? 'high' : 'medium',
        data: { low_sleep_days: lowSleep, window: last7.length },
        suggested_action:
          'Sueño bajo recurrente. Reducir intensidad y priorizar recuperación.',
        proposed_changes: reduceVolumeChanges(next7HighIntensity, 0.7),
        affected_session_ids: next7HighIntensity.map((s) => s.id),
      })
    }
  }

  // Rule 4 — muscular_persistent: muscle_state <= 2 in last 2 surveys
  if (last3.length >= 2) {
    const muscBad = last3
      .slice(0, 2)
      .every((s) => (s.muscle_state ?? 5) <= LOW_DIM)
    if (muscBad) {
      out.push({
        alert_type: 'muscular_persistent',
        severity: 'medium',
        data: {
          muscle_states: last3.slice(0, 2).map((s) => s.muscle_state),
        },
        suggested_action:
          'Dolor/tensión muscular persistente. Sustituir fuerza por movilidad.',
        proposed_changes: next7Strength.map(
          (s): ProposedChange => ({
            session_id: s.id,
            field: 'session_type',
            from: s.session_type,
            to: 'mobility',
          })
        ),
        affected_session_ids: next7Strength.map((s) => s.id),
      })
    }
  }

  // Rule 5 — stress_high: stress_level <= 2 in latest survey
  if (latest.stress_level != null && latest.stress_level <= LOW_DIM) {
    out.push({
      alert_type: 'stress_high',
      severity: latest.stress_level === 1 ? 'high' : 'medium',
      data: { stress_level: latest.stress_level },
      suggested_action:
        'Estrés elevado. Considera una sesión más fácil hoy.',
      proposed_changes: reduceVolumeChanges(upcoming.slice(0, 1), 0.6),
      affected_session_ids: upcoming.slice(0, 1).map((s) => s.id),
    })
  }

  // Rule 6 — motivation_low: mood <= 2 in 3+ of last 5 surveys
  const last5 = surveys.slice(0, 5)
  if (last5.length >= 3) {
    const lowMood = last5.filter((s) => (s.mood ?? 5) <= LOW_DIM).length
    if (lowMood >= 3) {
      out.push({
        alert_type: 'motivation_low',
        severity: lowMood >= 4 ? 'high' : 'medium',
        data: { low_mood_days: lowMood, window: last5.length },
        suggested_action:
          'Ánimo bajo recurrente. Sugerir variar la sesión o agregar descanso.',
        proposed_changes: [],
        affected_session_ids: [],
      })
    }
  }

  // Rule 7 — combo_red: latest survey has ≥3 dimensions at <=2
  if (latest) {
    const dims = [
      latest.sleep_quality,
      latest.energy_level,
      latest.muscle_state,
      latest.stress_level,
      latest.mood,
    ].filter((v): v is number => v != null)
    const flagged = dims.filter((v) => v <= LOW_DIM).length
    if (flagged >= 3) {
      out.push({
        alert_type: 'combo_red',
        severity: 'high',
        data: { flagged_dims: flagged, total_dims: dims.length },
        suggested_action:
          'Múltiples métricas en rojo. Descanso o recuperación activa.',
        proposed_changes: downgradeChanges(upcoming.slice(0, 1)),
        affected_session_ids: upcoming.slice(0, 1).map((s) => s.id),
      })
    }
  }

  return out
}

// ============================================================
// Persistence — dedupe pending alerts of same type for trainee
// ============================================================

async function persistAlerts(
  candidates: AlertCandidate[],
  traineeId: string,
  trainerId: string
): Promise<ReadinessAlert[]> {
  if (candidates.length === 0) return []

  // Find existing pending alerts for this trainee
  const { data: existing } = await supabaseAdmin
    .from('readiness_alerts')
    .select('id, alert_type')
    .eq('trainee_id', traineeId)
    .eq('status', 'pending')

  const existingTypes = new Set(
    (existing ?? []).map((r) => (r as { alert_type: string }).alert_type)
  )

  const toInsert = candidates
    .filter((c) => !existingTypes.has(c.alert_type))
    .map((c) => ({
      trainee_id: traineeId,
      trainer_id: trainerId,
      alert_type: c.alert_type,
      severity: c.severity,
      data: c.data,
      suggested_action: c.suggested_action,
      proposed_changes: c.proposed_changes,
      affected_session_ids: c.affected_session_ids,
      status: 'pending',
    }))

  if (toInsert.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('readiness_alerts')
    .insert(toInsert)
    .select('*')

  if (error) throw error
  return (data ?? []) as ReadinessAlert[]
}

// ============================================================
// Public API
// ============================================================

export async function detectAlertsForTrainee(
  traineeId: string,
  trainerId: string
): Promise<ReadinessAlert[]> {
  const [surveys, upcoming] = await Promise.all([
    loadRecentSurveys(traineeId, HISTORY_DAYS),
    loadUpcomingPlannedSessions(traineeId, PLAN_HORIZON_DAYS),
  ])

  const candidates = runRules(surveys, upcoming)
  return persistAlerts(candidates, traineeId, trainerId)
}

export async function listReadinessAlerts(opts: {
  trainerId?: string
  traineeId?: string
  status?: ReadinessAlert['status']
}): Promise<ReadinessAlert[]> {
  let q = supabaseAdmin
    .from('readiness_alerts')
    .select('*')
    .order('triggered_at', { ascending: false })

  if (opts.trainerId) q = q.eq('trainer_id', opts.trainerId)
  if (opts.traineeId) q = q.eq('trainee_id', opts.traineeId)
  if (opts.status) q = q.eq('status', opts.status)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ReadinessAlert[]
}

export async function dismissAlert(
  id: string,
  trainerId: string,
  notes?: string
): Promise<ReadinessAlert | null> {
  const { data, error } = await supabaseAdmin
    .from('readiness_alerts')
    .update({
      status: 'dismissed',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: trainerId,
      trainer_notes: notes ?? null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return (data ?? null) as ReadinessAlert | null
}

export async function applyAlertChanges(
  id: string,
  trainerId: string,
  notes?: string
): Promise<ReadinessAlert | null> {
  // Load the alert
  const { data: alert, error: loadErr } = await supabaseAdmin
    .from('readiness_alerts')
    .select('*')
    .eq('id', id)
    .single()
  if (loadErr || !alert) return null
  const a = alert as ReadinessAlert

  // Apply each proposed change. We only touch fields on planned_sessions
  // that ProposedChange explicitly enumerates.
  const applied: ProposedChange[] = []
  for (const change of a.proposed_changes ?? []) {
    if (!change.session_id) continue
    const update: Record<string, unknown> = {}
    update[change.field] = change.to
    const { error: updErr } = await supabaseAdmin
      .from('planned_sessions')
      .update(update)
      .eq('id', change.session_id)
    if (!updErr) applied.push(change)
  }

  const { data, error } = await supabaseAdmin
    .from('readiness_alerts')
    .update({
      status: 'applied',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: trainerId,
      trainer_notes: notes ?? null,
      applied_changes: applied,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return (data ?? null) as ReadinessAlert | null
}

export async function expireOldAlerts(): Promise<number> {
  // Delegates to the SQL function created in migration.
  const { error } = await supabaseAdmin.rpc('expire_old_readiness_alerts')
  if (error) {
    // Fallback in case the function doesn't exist yet
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const { count } = await supabaseAdmin
      .from('readiness_alerts')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('triggered_at', cutoff.toISOString())
    return count ?? 0
  }
  return -1 // SQL function doesn't return count
}
