'use client'

import { createClient } from '@supabase/supabase-js'

export interface AuthSessionData {
  access_token: string
  refresh_token: string
  user: {
    id: string
    phone?: string
    email?: string
    user_metadata?: Record<string, any>
  }
}

export interface AuthClientInstance {
  auth: {
    getSession: () => Promise<{ data: { session: AuthSessionData | null }; error: any }>
    setSession: (params: { access_token: string; refresh_token?: string }) => Promise<{ data: { session: AuthSessionData | null }; error: any }>
    getUser: () => Promise<{ data: { user: AuthSessionData['user'] | null }; error: any }>
    signOut: () => Promise<{ error: any }>
  }
  from: (table: string) => any
}

/** Headers for an API call, with the stored AgriLink session's bearer token when there is one. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  if (typeof window === 'undefined') return extra
  try {
    const token = JSON.parse(localStorage.getItem('agrilink_session') || 'null')?.access_token
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
  } catch {
    return extra
  }
}

export function getAuthClient(): AuthClientInstance {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY

  const rawClient = url && key ? (createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) as unknown as AuthClientInstance) : null

  return {
    auth: {
      getSession: async () => {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('agrilink_session')
            if (raw) {
              const session = JSON.parse(raw)
              return { data: { session }, error: null }
            }
          } catch {}
        }
        if (rawClient) {
          try {
            return await rawClient.auth.getSession()
          } catch {}
        }
        return { data: { session: null }, error: null }
      },
      setSession: async ({ access_token, refresh_token }: { access_token: string; refresh_token?: string }) => {
        if (typeof window !== 'undefined') {
          const userPhone = localStorage.getItem('agrilink_user_phone') || '9825144102'
          const userName = localStorage.getItem('agrilink_user_name') || 'AgriLink User'
          const userRole = (localStorage.getItem('agrilink_user_role') || 'Farmer').toLowerCase()
          const session: AuthSessionData = {
            access_token,
            refresh_token: refresh_token || access_token,
            user: {
              id: `usr_${userPhone}`,
              phone: `+91${userPhone}`,
              user_metadata: { mobile: userPhone, name: userName, role: userRole },
            },
          }
          try {
            localStorage.setItem('agrilink_session', JSON.stringify(session))
          } catch {}

          if (rawClient && !access_token.startsWith('agl_')) {
            try {
              await rawClient.auth.setSession({ access_token, refresh_token: refresh_token || access_token })
            } catch {}
          }
          return { data: { session }, error: null }
        }
        return { data: { session: null }, error: null }
      },
      getUser: async () => {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('agrilink_session')
            if (raw) {
              const session = JSON.parse(raw)
              return { data: { user: session.user }, error: null }
            }
          } catch {}
        }
        if (rawClient) {
          try {
            return await rawClient.auth.getUser()
          } catch {}
        }
        return { data: { user: null }, error: null }
      },
      signOut: async () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('agrilink_session')
          localStorage.removeItem('agrilink_user_name')
          localStorage.removeItem('agrilink_user_role')
          localStorage.removeItem('agrilink_user_phone')
        }
        if (rawClient) {
          try {
            await rawClient.auth.signOut()
          } catch {}
        }
        return { error: null }
      },
    },
    from: (table: string) => {
      if (rawClient) return rawClient.from(table)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              const userName = typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_name') : null
              const userRole = typeof window !== 'undefined' ? (localStorage.getItem('agrilink_user_role') || 'Farmer').toLowerCase() : 'farmer'
              return {
                data: {
                  full_name: userName || 'AgriLink User',
                  role: userRole,
                  onboarding_complete: true,
                  verification_status: 'verified',
                },
                error: null,
              }
            },
            single: async () => {
              const userName = typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_name') : null
              const userRole = typeof window !== 'undefined' ? (localStorage.getItem('agrilink_user_role') || 'Farmer').toLowerCase() : 'farmer'
              return {
                data: {
                  full_name: userName || 'AgriLink User',
                  role: userRole,
                  onboarding_complete: true,
                  verification_status: 'verified',
                },
                error: null,
              }
            },
          }),
        }),
      }
    },
  }
}

