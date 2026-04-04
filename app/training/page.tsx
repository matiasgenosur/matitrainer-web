import { getActivities } from '@/lib/data'
import Nav from '@/components/nav'
import TrainingClient from './training-client'

export default async function TrainingPage() {
  const activities = await getActivities()

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan de Entrenamiento</h1>
          <p className="text-gray-400 text-sm mt-0.5">Abril 2026 — Fase Peak</p>
        </div>
        <TrainingClient activities={activities} />
      </main>
    </div>
  )
}
