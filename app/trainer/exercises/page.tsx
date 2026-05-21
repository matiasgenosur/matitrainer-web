export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import ExercisesClient from './exercises-client'

export default function ExercisesPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <ExercisesClient />
    </div>
  )
}
