import { getActivities, getWeeklyStats, calculateACWR, getTodayRecommendation } from '@/lib/data'
import { formatPace } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/nav'
import MetricCard from '@/components/metric-card'
import WeeklyChart from '@/components/weekly-chart'
import ACWRGauge from '@/components/acwr-gauge'
import RecommendationCard from '@/components/recommendation-card'
import DashboardPeriodView from '@/components/dashboard-period-view'
import RecoveryClock from '@/components/recovery-clock'

async function getTrainingPlans() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const until = new Date(today + 'T00:00:00')
    until.setDate(until.getDate() + 30)
    const untilStr = until.toISOString().split('T')[0]
    const { data } = await supabase
      .from('training_plans')
      .select('*')
      .gte('date', today)
      .lte('date', untilStr)
      .order('date')
    return data || []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const [activities, trainingPlans] = await Promise.all([getActivities(), getTrainingPlans()])
  const weeklyStats = getWeeklyStats(activities)
  const acwr = calculateACWR(activities)
  const recommendation = getTodayRecommendation(activities)

  // Last 7 days (Santiago timezone)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const sevenDaysAgo = (() => {
    const d = new Date(todayStr + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })()

  const last7 = activities.filter(a => a.date >= sevenDaysAgo && a.date <= todayStr)
  const km7d = last7.reduce((s, a) => s + a.distance_km, 0)
  const hours7d = last7.reduce((s, a) => s + a.moving_time_min, 0) / 60
  const elevation7d = last7.reduce((s, a) => s + a.elevation_m, 0)
  const avgFatigue7d = last7.length > 0
    ? last7.reduce((s, a) => s + a.fatigue_score, 0) / last7.length
    : 0
  const runActs7d = last7.filter(a => a.pace_min_km > 0)
  const avgPace7d = runActs7d.length > 0
    ? runActs7d.reduce((s, a) => s + a.pace_min_km, 0) / runActs7d.length
    : 0

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Bienvenido de vuelta, Matias 👋</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Última sincronización</p>
            <p className="text-sm text-violet-400">3 Abr 2026</p>
          </div>
        </div>

        {/* KPI Cards — últimos 7 días */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Km" value={km7d.toFixed(1)} unit="km" icon="🏃" delay={0} color="#8b5cf6"
            trendLabel={`${last7.length} actividad${last7.length !== 1 ? 'es' : ''} · 7 días`}
          />
          <MetricCard
            label="Horas" value={hours7d.toFixed(1)} unit="h" icon="⏱" delay={0.05} color="#22c55e"
            trendLabel="tiempo en movimiento"
          />
          <MetricCard
            label="Ritmo avg" value={avgPace7d > 0 ? formatPace(avgPace7d) : '—'} icon="⚡" delay={0.1} color="#06b6d4"
            trendLabel="min/km · carrera"
          />
          <MetricCard
            label="Desnivel" value={Math.round(elevation7d).toString()} unit="m↑" icon="⛰" delay={0.15} color="#f59e0b"
            trendLabel="elevación acumulada"
          />
          <MetricCard
            label="Fatiga avg" value={Math.round(avgFatigue7d).toString()} unit="/ 100" icon="💪" delay={0.2} color="#ec4899"
            trendLabel="0 reposo · 100 agotado"
          />
          <MetricCard
            label="Actividades" value={last7.length.toString()} icon="📅" delay={0.25} color="#f97316"
            trendLabel="últimos 7 días"
          />
        </div>

        {/* Today recommendation */}
        <RecommendationCard recommendation={recommendation} />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Volumen semanal (km)</h2>
            <WeeklyChart data={weeklyStats} />
          </div>

          <div className="space-y-4">
            {/* Recovery clock */}
            {activities.length > 0 && (() => {
              const last = [...activities].sort((a, b) => b.date.localeCompare(a.date))[0]
              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                  <h2 className="text-sm font-semibold text-white mb-4">⏱ Recuperación</h2>
                  <RecoveryClock lastActivity={last} acwrLevel={acwr.level} />
                </div>
              )
            })()}

            {/* ACWR gauge */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-white mb-4">ACWR — Riesgo de lesión</h2>
              <ACWRGauge result={acwr} />
            </div>
          </div>
        </div>

        {/* Period-filtered activities + fatigue chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <DashboardPeriodView activities={activities} trainingPlans={trainingPlans} />
        </div>
      </main>
    </div>
  )
}
