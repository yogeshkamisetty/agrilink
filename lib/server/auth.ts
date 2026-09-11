import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('AUTH_REQUIRED')
  const { data, error } = await requireSupabaseAdmin().auth.getUser(token)
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user
}
export async function requireRole(request: Request, role: 'admin' | 'buyer' | 'farmer') {
  const user = await requireUser(request)
  const { data, error } = await requireSupabaseAdmin().from('user_profiles').select('role').eq('id', user.id).single()
  if (error || data.role !== role) throw new Error('FORBIDDEN')
  return user
}
