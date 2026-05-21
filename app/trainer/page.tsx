export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getActivities, getWeeklyStats, calculateACWR } from '@/lib/data'
import Nav from '@/components/nav'
import TrainerClient from './trainer-client'
import { AlertsPanel } from '@/components/readiness/AlertsPanel'
import { AthletesOverview } from '@/components/trainer/AthletesOverview'

export default async function TrainerPage() {
  const activities = await getActivities()
  const weeklyStats = getWeeklyStats(activities)
  const acwr = calculateACWR(activities)

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            Alertas de readiness
          </h2>
          <AlertsPanel />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Atletas</h2>
          <AthletesOverview />
        </section>
      </main>

      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <TrainerClient
          activities={activities}
          weeklyStats={weeklyStats}
          acwr={acwr}
        />
      </Suspense>
    </div>
  )
}
