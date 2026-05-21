import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using the service role key.
// Bypasses RLS — only import from server contexts (route handlers,
// server actions, cron jobs, webhook handlers). NEVER from client code.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceRoleKey) {
  // Keep this loud — silently falling back to the anon key would
  // hide RLS-related bugs during development.
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
      fetch(url, { ...options, cache: 'no-store' }),
  },
})
