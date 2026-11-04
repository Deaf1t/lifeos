import { createClient } from '@supabase/supabase-js'
 
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 
if (!url || !key) {
  throw new Error('Не заданы NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local')
}
 
// Клиент для браузера (client components). Права ограничены RLS.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})
 
// Серверный клиент, действующий от имени пользователя (для API routes).
export function supabaseForToken(accessToken: string) {
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })
}