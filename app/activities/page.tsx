export const dynamic = 'force-dynamic'

import { getActivities } from '@/lib/data'
import Nav from '@/components/nav'
import ActivitiesClient from './activities-client'

export default async function ActivitiesPage() {
  const activities = await getActivities()

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Actividades</h1>
          <p className="text-gray-400 text-sm mt-0.5">{activities.length} actividades registradas</p>
        </div>
        <ActivitiesClient activities={activities} />
      </main>
    </div>
  )
}
