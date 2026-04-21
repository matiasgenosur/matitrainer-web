import { Activity, WeeklyStats, ACWRResult, RacePrediction, Recommendation } from './types'
import { mockActivities } from './mock-data'

export async function getActivities(): Promise<Activity[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'placeholder') {
      return mockActivities
    }
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: false })
    if (error || !data || data.length === 0) return mockActivities
    return data as Activity[]
  } catch {
    return mockActivities
  }
}

export function getWeeklyStats(activities: Activity[]): WeeklyStats[] {
  const weekMap = new Map<string, WeeklyStats>()

  activities.forEach((a) => {
    const date = new Date(a.date + 'T00:00:00')
    // Get Monday of that week
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)
    const weekKey = monday.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      const label = monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
      weekMap.set(weekKey, {
        week: weekKey,
        weekLabel: label,
        totalKm: 0,
        runKm: 0,
        hikeKm: 0,
        soccerKm: 0,
        otherKm: 0,
        totalTime: 0,
        elevation: 0,
        calories: 0,
        avgFatigue: 0,
        activities: 0,
      })
    }

    const w = weekMap.get(weekKey)!
    w.totalKm += a.distance_km
    w.totalTime += a.moving_time_min
    w.elevation += a.elevation_m
    w.calories += a.calories
    w.avgFatigue += a.fatigue_score
    w.activities += 1

    const t = a.type.toLowerCase()
    if (t === 'run') w.runKm += a.distance_km
    else if (t === 'hike') w.hikeKm += a.distance_km
    else if (t === 'soccer') w.soccerKm += a.distance_km
    else w.otherKm += a.distance_km
  })

  weekMap.forEach((w) => {
    if (w.activities > 0) w.avgFatigue = Math.round(w.avgFatigue / w.activities)
    w.totalKm = Math.round(w.totalKm * 10) / 10
    w.runKm = Math.round(w.runKm * 10) / 10
    w.hikeKm = Math.round(w.hikeKm * 10) / 10
    w.soccerKm = Math.round(w.soccerKm * 10) / 10
    w.otherKm = Math.round(w.otherKm * 10) / 10
  })

  return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week))
}

export function calculateACWR(activities: Activity[]): ACWRResult {
  const now = new Date('2026-04-04T00:00:00')
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date))

  // Daily load by date
  const loadByDay = new Map<string, number>()
  sorted.forEach((a) => {
    const key = a.date
    loadByDay.set(key, (loadByDay.get(key) || 0) + a.fatigue_score)
  })

  // Acute load: last 7 days
  let acuteLoad = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().split('T')[0]
    acuteLoad += loadByDay.get(key) || 0
  }

  // Chronic load: last 28 days average weekly
  let chronicLoad = 0
  for (let i = 0; i < 28; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().split('T')[0]
    chronicLoad += loadByDay.get(key) || 0
  }
  chronicLoad = chronicLoad / 4 // weekly average

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0

  let level: ACWRResult['level']
  let message: string
  let color: string

  if (acwr < 0.8) {
    level = 'low'
    message = 'Carga baja. Considera aumentar el volumen gradualmente.'
    color = '#3b82f6'
  } else if (acwr <= 1.3) {
    level = 'optimal'
    message = 'Zona óptima. Sigue con el plan actual.'
    color = '#22c55e'
  } else if (acwr <= 1.5) {
    level = 'caution'
    message = 'Precaución. Considera un día de recuperación.'
    color = '#f59e0b'
  } else {
    level = 'high'
    message = 'Riesgo alto de lesión. Descansa y recupera.'
    color = '#ef4444'
  }

  return {
    acwr: Math.round(acwr * 100) / 100,
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    level,
    message,
    color,
  }
}

// Riegel formula: T2 = T1 * (D2/D1)^1.06
export function predictRaces(activities: Activity[]): RacePrediction[] {
  const runs = activities
    .filter((a) => a.type === 'Run' && a.distance_km >= 10 && a.pace_min_km > 0 && a.pace_min_km < 15)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (runs.length === 0) {
    return defaultPredictions()
  }

  // Use the run with the best (lowest) pace as reference — most likely a race effort
  const recent = runs.slice(0, 20)
  const refRun = recent.reduce((best, r) => r.pace_min_km < best.pace_min_km ? r : best, recent[0])

  const refTimeMins = refRun.moving_time_min
  const refDistKm = refRun.distance_km

  const distances = [
    { label: '5K', km: 5, color: '#8b5cf6' },
    { label: '10K', km: 10, color: '#3b82f6' },
    { label: '21K', km: 21.0975, color: '#06b6d4' },
    { label: '42K', km: 42.195, color: '#ec4899' },
  ]

  return distances.map(({ label, km, color }) => {
    const predictedMins = refTimeMins * Math.pow(km / refDistKm, 1.06)
    const paceMinKm = predictedMins / km
    const hrs = Math.floor(predictedMins / 60)
    const mins = Math.floor(predictedMins % 60)
    const secs = Math.round((predictedMins - Math.floor(predictedMins)) * 60)

    const timeStr =
      hrs > 0
        ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins}:${secs.toString().padStart(2, '0')}`

    const paceMins = Math.floor(paceMinKm)
    const paceSecs = Math.round((paceMinKm - paceMins) * 60)
    const paceStr = `${paceMins}:${paceSecs.toString().padStart(2, '0')} /km`

    return { distance: label, distanceKm: km, time: timeStr, pace: paceStr, color }
  })
}

function defaultPredictions(): RacePrediction[] {
  return [
    { distance: '5K', distanceKm: 5, time: '27:30', pace: '5:30 /km', color: '#8b5cf6' },
    { distance: '10K', distanceKm: 10, time: '57:00', pace: '5:42 /km', color: '#3b82f6' },
    { distance: '21K', distanceKm: 21.0975, time: '2:02:00', pace: '5:47 /km', color: '#06b6d4' },
    { distance: '42K', distanceKm: 42.195, time: '4:18:00', pace: '6:07 /km', color: '#ec4899' },
  ]
}

export function getTodayRecommendation(activities: Activity[]): Recommendation {
  if (activities.length === 0) {
    return {
      type: 'easy',
      title: 'Comienza tu entrenamiento',
      description: 'No hay actividades registradas. ¡Es hora de empezar!',
      icon: '🏃',
      color: '#8b5cf6',
    }
  }

  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date))
  const lastActivity = sorted[0]
  const lastDate = new Date(lastActivity.date + 'T00:00:00')
  const today = new Date('2026-04-04T00:00:00')
  const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  const acwr = calculateACWR(activities)

  if (daysSince === 0) {
    if (lastActivity.fatigue_score > 200) {
      return {
        type: 'rest',
        title: 'Recuperación activa',
        description: `Entrenaste hoy (${lastActivity.name}). Descansa o haz movilidad ligera.`,
        icon: '😴',
        color: '#6b7280',
      }
    }
    return {
      type: 'rest',
      title: 'Ya entrenaste hoy',
      description: `${lastActivity.name} completado. Recupera bien para mañana.`,
      icon: '✅',
      color: '#22c55e',
    }
  }

  if (acwr.level === 'high') {
    return {
      type: 'rest',
      title: 'Día de descanso',
      description: acwr.message,
      icon: '🛌',
      color: '#ef4444',
    }
  }

  if (daysSince >= 3) {
    return {
      type: 'moderate',
      title: 'Retoma el ritmo',
      description: `Llevas ${daysSince} días sin entrenar. Un run tranquilo de 10-12km sería ideal.`,
      icon: '🏃',
      color: '#8b5cf6',
      suggestedActivity: 'Run fácil 10-12km @ Z2',
    }
  }

  if (lastActivity.fatigue_score > 250) {
    return {
      type: 'easy',
      title: 'Recuperación prioritaria',
      description: `Alta fatiga acumulada (${lastActivity.fatigue_score}). Hike o run muy suave.`,
      icon: '🏔',
      color: '#22c55e',
      suggestedActivity: 'Hike o Run Z1-Z2 < 10km',
    }
  }

  if (daysSince === 1 && lastActivity.type === 'Run') {
    return {
      type: 'easy',
      title: 'Día fácil',
      description: 'Ayer corriste bien. Hoy recupera con un hike o un run suave en Z1-Z2.',
      icon: '🏔',
      color: '#22c55e',
      suggestedActivity: 'Hike o Run Z1 < 8km',
    }
  }

  return {
    type: 'hard',
    title: 'Listo para entrenar',
    description: 'Tu carga es óptima. ¡Puedes hacer un entrenamiento de calidad hoy!',
    icon: '🔥',
    color: '#f59e0b',
    suggestedActivity: 'Run tempo 12-16km @ Z3-Z4',
  }
}

export function calculateVO2Max(activities: Activity[]): number {
  const runs = activities
    .filter((a) => a.type === 'Run' && a.distance_km >= 10 && a.avg_hr && a.avg_hr > 100)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (runs.length === 0) return 52

  const r = runs[0]
  const speedMs = (r.distance_km * 1000) / (r.moving_time_min * 60)
  const vo2 = 210.0 / r.fc_pct * speedMs * 0.2 + 3.5
  return Math.min(70, Math.max(35, Math.round(vo2)))
}
