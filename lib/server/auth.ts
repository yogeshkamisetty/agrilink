import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifySessionToken } from './pin-auth'

export interface AppUser {
  id: string
  email?: string
  phone?: string
  user_metadata: Record<string, unknown>
  app_metadata?: Record<string, unknown>
  role?: string
}

export type Role = 'admin' | 'buyer' | 'farmer'

export async function requireUser(request: Request): Promise<AppUser> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('AUTH_REQUIRED')

  // 1. AgriLink HMAC-signed session token
  if (token.startsWith('agl_')) {
    const payload = verifySessionToken(token)
    if (!payload) throw new Error('AUTH_REQUIRED')
    const normalizedRole = (payload.role as string) === 'coordinator' ? 'admin' : payload.role
    return {
      id: payload.sub,
      email: `phone_${payload.phone}@agrilink.internal`,
      phone: `+91${payload.phone}`,
      user_metadata: { mobile: payload.phone, role: normalizedRole, name: payload.name },
      app_metadata: { role: normalizedRole },
      role: normalizedRole,
    }
  }

  // 2. Supabase access token, when Supabase is configured
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && data.user) {
        const rawRole = (data.user.user_metadata?.role as string) || undefined
        return { ...data.user, role: rawRole === 'coordinator' ? 'admin' : rawRole }
      }
    } catch {}
  }

  throw new Error('AUTH_REQUIRED')
}

/** The signed-in user, or null for anonymous requests and tokens that no longer verify. */
export async function optionalUser(request: Request): Promise<AppUser | null> {
  if (!request.headers.get('authorization')) return null
  try {
    return await requireUser(request)
  } catch {
    return null
  }
}

export async function requireRole(request: Request, role: Role | Role[]) {
  const user = await requireUser(request)
  const allowed = Array.isArray(role) ? role : [role]

  let current = (user.role || (user.user_metadata?.role as string) || '').toLowerCase()
  if (!current && supabaseAdmin) {
    const { data } = await supabaseAdmin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    current = (data?.role || '').toLowerCase()
  }
  if (current === 'coordinator') current = 'admin'

  if (!allowed.includes(current as Role)) throw new Error('FORBIDDEN')
  return { ...user, role: current as Role }
}

/** HTTP status for an authentication failure, or null when the error is something else. */
export function authStatus(error: unknown): 401 | 403 | null {
  const message = error instanceof Error ? error.message : ''
  if (message === 'AUTH_REQUIRED') return 401
  if (message === 'FORBIDDEN') return 403
  return null
}
