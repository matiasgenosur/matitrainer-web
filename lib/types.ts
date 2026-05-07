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
}
