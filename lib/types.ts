export interface Activity {
  id: number
  name: string
  type: string
  date: string
  distance_km: number
  moving_time_min: number
  elevation_m: number
  calories: number
  avg_hr?: number
  pace_min_km: number
  z1_min: number
  z2_min: number
  z3_min: number
  z4_min: number
  z5_min: number
  fatigue_score: number
  strava_link: string
  session_type: string
  fc_pct: number
  weekly_km: number
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
