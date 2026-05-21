export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import WeekAgenda from './week-agenda'

export default function AgendaPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <WeekAgenda />
    </div>
  )
}
