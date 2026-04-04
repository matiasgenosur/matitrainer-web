import { getActivities, getWeeklyStats, calculateACWR, getTodayRecommendation } from '@/lib/data'
import { formatPace, formatDistance, formatTime, getActivityIcon, formatDate } from '@/lib/utils'
import Nav from '@/components/nav'
import MetricCard from '@/components/metric-card'
import WeeklyChart from '@/components/weekly-chart'
import ACWRGauge from '@/components/acwr-gauge'
import RecommendationCard from '@/components/recommendation-card'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const activities = await getActivities()
  const weeklyStats = getWeeklyStats(activities)
  const acwr = calculateACWR(activities)
  const recommendation = getTodayRecommendation(activities)

  // KPI calculations
  const totalKm = activities.reduce((s, a) => s + a.distance_km, 0)
  const totalHours = activities.reduce((s, a) => s + a.moving_time_min, 0) / 60
  const totalElevation = activities.reduce((s, a) => s + a.elevation_m, 0)
  const totalCalories = activities.reduce((s, a) => s + a.calories, 0)
  const avgFatigue = activities.length > 0
    ? activities.reduce((s, a) => s + a.fatigue_score, 0) / activities.length
    : 0

  // This week
  const today = new Date('2026-04-04T00:00:00')
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const mondayStr = monday.toISOString().split('T')[0]
  const thisWeekActivities = activities.filter((a) => a.date >= mondayStr)
  const thisWeekKm = thisWeekActivities.reduce((s, a) => s + a.distance_km, 0)

  const recent = activities.slice(0, 5)

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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Total km" value={totalKm.toFixed(0)} unit="km" icon="🏃" delay={0} color="#8b5cf6" />
          <MetricCard label="Esta semana" value={thisWeekKm.toFixed(1)} unit="km" icon="📅" delay={0.05} color="#06b6d4" />
          <MetricCard label="Horas" value={totalHours.toFixed(1)} unit="h" icon="⏱" delay={0.1} color="#22c55e" />
          <MetricCard label="Desnivel" value={Math.round(totalElevation / 1000).toString()} unit="km↑" icon="⛰" delay={0.15} color="#f59e0b" />
          <MetricCard label="Calorías" value={(totalCalories / 1000).toFixed(1)} unit="kcal" icon="🔥" delay={0.2} color="#f97316" />
          <MetricCard label="Fatiga avg" value={Math.round(avgFatigue).toString()} icon="💪" delay={0.25} color="#ec4899" />
        </div>

        {/* Today recommendation */}
        <RecommendationCard recommendation={recommendation} />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Volumen semanal (km)</h2>
            <WeeklyChart data={weeklyStats} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-4">ACWR — Riesgo de lesión</h2>
            <ACWRGauge result={acwr} />
          </div>
        </div>

        {/* Fatigue chart + recent activities */}
        <DashboardClient activities={activities} />

        {/* Recent activities list */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Últimas actividades</h2>
            <a href="/activities" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Ver todas →
            </a>
          </div>
          <div className="space-y-3">
            {recent.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{activity.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono text-white">{formatDistance(activity.distance_km)}</p>
                  <p className="text-xs text-gray-400">{formatPace(activity.pace_min_km)}</p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-sm text-gray-300">{formatTime(activity.moving_time_min)}</p>
                  <p className="text-xs text-gray-500">Fatiga: {activity.fatigue_score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
