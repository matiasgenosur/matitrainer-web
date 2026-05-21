export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import AthleteDetail from './athlete-detail'

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <Nav />
      <AthleteDetail traineeId={id} />
    </div>
  )
}
