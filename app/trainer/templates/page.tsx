export const dynamic = 'force-dynamic'

import Nav from '@/components/nav'
import TemplatesClient from './templates-client'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <TemplatesClient />
    </div>
  )
}
