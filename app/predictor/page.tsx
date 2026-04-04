import { getActivities, predictRaces, calculateVO2Max } from '@/lib/data'
import Nav from '@/components/nav'
import PredictorClient from './predictor-client'

export default async function PredictorPage() {
  const activities = await getActivities()
  const predictions = predictRaces(activities)
  const vo2max = calculateVO2Max(activities)

  const runs = activities
    .filter((a) => a.type === 'Run' && a.distance_km >= 15)
    .sort((a, b) => b.date.localeCompare(a.date))

  const refRun = runs[0] || null

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Predictor de Carrera</h1>
          <p className="text-gray-400 text-sm mt-0.5">Basado en actividades recientes con fórmula de Riegel</p>
        </div>
        <PredictorClient
          initialPredictions={predictions}
          vo2max={vo2max}
          refRun={refRun}
          activities={activities}
        />
      </main>
    </div>
  )
}
