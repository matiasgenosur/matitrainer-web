export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import SessionEditor from '../session-editor'

export default function NewSessionPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <SessionEditor mode="new" />
    </div>
  )
}
