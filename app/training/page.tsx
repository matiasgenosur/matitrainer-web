import { getActivities } from '@/lib/data'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/nav'
import TrainingClient from './training-client'

async function getTrainingPlans() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const from = today
    const until = new Date(today + 'T00:00:00')
    until.setDate(until.getDate() + 56) // 8 semanas adelante

    const { data } = await supabase
      .from('training_plans')
      .select('*')
      .gte('date', from)
      .lte('date', until.toISOString().split('T')[0])
      .order('date')
    return data || []
  } catch {
    return []
  }
}

export default async function TrainingPage() {
  const [activities, trainingPlans] = await Promise.all([getActivities(), getTrainingPlans()])

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan de Entrenamiento</h1>
          <p className="text-gray-400 text-sm mt-0.5">Generado por Claude · se actualiza desde el chat</p>
        </div>
        <TrainingClient activities={activities} trainingPlans={trainingPlans} />
      </main>
    </div>
  )
}
