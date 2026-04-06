export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getActivities, getWeeklyStats, calculateACWR } from '@/lib/data'
import Nav from '@/components/nav'
import TrainerClient from './trainer-client'

export default async function TrainerPage() {
  const activities = await getActivities()
  const weeklyStats = getWeeklyStats(activities)
  const acwr = calculateACWR(activities)

  return (
    <div className="min-h-screen">
      <Nav />
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
