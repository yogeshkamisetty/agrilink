import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase.types'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = url && serviceRoleKey
  ? createClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error('Supabase server credentials are not configured.')
  return supabaseAdmin
}
