export const dynamic = 'force-dynamic'

import { getActivities, getWeeklyStats } from '@/lib/data'
import Nav from '@/components/nav'
import AnalyticsClient from './analytics-client'

export default async function AnalyticsPage() {
  const activities = await getActivities()
  const weeklyStats = getWeeklyStats(activities)

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Análisis</h1>
          <p className="text-gray-400 text-sm mt-0.5">Métricas avanzadas de rendimiento</p>
        </div>
        <AnalyticsClient activities={activities} weeklyStats={weeklyStats} />
      </main>
    </div>
  )
}
