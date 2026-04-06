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
