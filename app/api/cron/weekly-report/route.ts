import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

function formatMin(min: number): string {
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`
}

function formatPace(paceMinKm: number | null): string {
  if (!paceMinKm) return '—'
  const mins = Math.floor(paceMinKm)
  const secs = Math.round((paceMinKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')} /km`
}

function getWeekRange(): { start: Date; end: Date } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6
  const start = new Date(today)
  start.setDate(today.getDate() - daysToLastMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHtml(acts: any[], start: Date, end: Date): string {
  const totalKm = acts.reduce((s, a) => s + (a.distance_km || 0), 0)
  const totalMin = acts.reduce((s, a) => s + (a.moving_time_min || 0), 0)
  const numRuns = acts.filter(a => a.type === 'Run').length
  const numHikes = acts.filter(a => a.type === 'Hike').length

  const dateLabel = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })

  const sessionRows = acts.map(a => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${new Date(a.date + 'T12:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit' })}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${a.name}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${a.type}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${(a.distance_km || 0).toFixed(1)} km</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${Math.round(a.moving_time_min || 0)} min</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatPace(a.pace_min_km)}</td>
    </tr>`).join('')

  const noActs = `<p style="color:#6b7280;">Sin actividades registradas esta semana.</p>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:32px;color:white;">
    <div style="font-size:1.8rem;font-weight:700;">🏃 MatiTrainer</div>
    <div style="opacity:0.85;margin-top:4px;">Reporte semanal — ${dateLabel(start)} al ${dateLabel(end)} ${end.getFullYear()}</div>
  </div>
  <div style="padding:24px;">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#7c3aed;">${totalKm.toFixed(1)}</div>
        <div style="color:#6b7280;font-size:0.85rem;">km totales</div>
      </div>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#2563eb;">${formatMin(totalMin)}</div>
        <div style="color:#6b7280;font-size:0.85rem;">tiempo activo</div>
      </div>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#16a34a;">${numRuns} runs / ${numHikes} hikes</div>
        <div style="color:#6b7280;font-size:0.85rem;">actividades</div>
      </div>
    </div>

    <h3 style="color:#111827;margin-bottom:12px;">Sesiones de la semana</h3>
    ${acts.length === 0 ? noActs : `
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;color:#6b7280;">Día</th>
          <th style="padding:8px;text-align:left;color:#6b7280;">Actividad</th>
          <th style="padding:8px;text-align:left;color:#6b7280;">Tipo</th>
          <th style="padding:8px;text-align:left;color:#6b7280;">Distancia</th>
          <th style="padding:8px;text-align:left;color:#6b7280;">Tiempo</th>
          <th style="padding:8px;text-align:left;color:#6b7280;">Ritmo</th>
        </tr>
      </thead>
      <tbody>${sessionRows}</tbody>
    </table>`}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:0.8rem;text-align:center;">
      Generado por MatiTrainer · ${new Date().toLocaleDateString('es-CL')}<br>
      <a href="https://matitrainer-web.vercel.app/dashboard" style="color:#7c3aed;">Ver dashboard completo →</a>
    </div>
  </div>
</div>
</body></html>`
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { start, end } = getWeekRange()
  const { data: acts } = await supabase
    .from('activities')
    .select('*')
    .gte('date', start.toISOString().slice(0, 10))
    .lte('date', end.toISOString().slice(0, 10))
    .order('date')

  const html = buildHtml(acts || [], start, end)
  const dateLabel = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  const subject = `MatiTrainer — Semana ${dateLabel(start)} al ${dateLabel(end)} ${end.getFullYear()}`

  const { error } = await getResend().emails.send({
    from: 'MatiTrainer <onboarding@resend.dev>',
    to: ['matias.gutierrez@genosur.com', 'Dparaudb@outlook.com'],
    subject,
    html,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ sent: true, activities: (acts || []).length })
}
