import { NextResponse } from 'next/server'
import { expireOldAlerts } from '@/lib/readiness-alerts'

// Vercel cron — expires pending alerts older than 14 days.
// Schedule via vercel.json or call manually with the CRON_SECRET.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const count = await expireOldAlerts()
    return NextResponse.json({ ok: true, expired: count })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
