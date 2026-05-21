export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import SessionEditor from '../../session-editor'

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <Nav />
      <SessionEditor mode="edit" sessionId={id} />
    </div>
  )
}
