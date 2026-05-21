export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import CalendarClient from './calendar-client'

export default function CalendarPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <CalendarClient />
    </div>
  )
}
