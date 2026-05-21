import { NextRequest, NextResponse } from 'next/server'
import { requireTrainer } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('matitrainer_users')
    .select('id, display_name, whatsapp_number')
    .eq('role', 'trainee')
    .order('display_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'server_error', message: error.message },
      { status: 500 }
    )
  }
  return NextResponse.json(data ?? [])
}
