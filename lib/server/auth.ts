import { requireSupabaseAdmin, supabaseAdmin } from '@/lib/supabase-admin'
import { verifySessionToken } from './pin-auth'

export interface AppUser {
  id: string
  email?: string
  phone?: string
  user_metadata: Record<string, unknown>
  app_metadata?: Record<string, unknown>
  role?: string
}

export async function requireUser(request: Request): Promise<AppUser> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('AUTH_REQUIRED')

  // 1. Check if token is an AgriLink signed session token
  if (token.startsWith('agl_')) {
    const payload = verifySessionToken(token)
    if (!payload) throw new Error('AUTH_REQUIRED')
    return {
      id: payload.sub,
      email: `phone_${payload.phone}@agrilink.internal`,
      phone: `+91${payload.phone}`,
      user_metadata: { mobile: payload.phone, role: payload.role, name: payload.name },
      app_metadata: { role: payload.role },
      role: payload.role,
    }
  }

  // 2. Check Supabase token if Supabase is configured
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && data.user) {
        return {
          ...data.user,
          role: (data.user.user_metadata?.role as string) || undefined,
        }
      }
    } catch {}
  }

  throw new Error('AUTH_REQUIRED')
}

export async function requireRole(request: Request, role: 'admin' | 'buyer' | 'farmer') {
  const user = await requireUser(request)

  if (user.role) {
    if (user.role !== role) throw new Error('FORBIDDEN')
    return user
  }

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('user_profiles').select('role').eq('id', user.id).single()
    if (error || data.role !== role) throw new Error('FORBIDDEN')
  }

  return user
}

