'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { AgriLinkDashboard } from '@/components/agri-link-dashboard'
import Link from 'next/link'

export function ProtectedPortal() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [verified, setVerified] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'Coordinator' | 'Buyer' | 'Farmer' | null>(null)

  useEffect(() => {
    let live = true

    async function init() {
      try {
        const { data } = await getAuthClient().auth.getSession()
        if (!live) return
        if (!data.session) return router.replace('/login')

        // Fetch user profile via server API (bypasses any client RLS restrictions)
        let profile: { onboarding_complete?: boolean; verification_status?: string; full_name?: string; role?: string } | null = null
        try {
          const res = await fetch('/api/account/profile', {
            headers: { Authorization: 'Bearer ' + data.session.access_token },
          })
          if (res.ok) {
            const json = await res.json()
            profile = json.profile
          }
        } catch {
          // Fallback to client SDK if API call fails
          const { data: p } = await getAuthClient()
            .from('user_profiles')
            .select('onboarding_complete,verification_status,full_name,role')
            .eq('id', data.session.user.id)
            .maybeSingle()
          profile = p
        }

        if (!live) return
        if (!profile?.onboarding_complete) return router.replace('/onboarding')
        setVerified(profile.verification_status === 'verified')

        // Resolve user display name and role
        const resolvedName = profile.full_name || (typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_name') : null)
        if (resolvedName) {
          setUserName(resolvedName)
          try { localStorage.setItem('agrilink_user_name', resolvedName) } catch {}
        }
        if (profile.role) {
          if (profile.role === 'admin') {
            router.replace('/admin')
            return
          }
          const mappedRole = profile.role === 'farmer' ? 'Farmer' : 'Buyer'
          setUserRole(mappedRole)
          try { localStorage.setItem('agrilink_user_role', mappedRole) } catch {}
        }

        setReady(true)
      } catch {
        if (live) router.replace('/login')
      }
    }

    init()
    return () => {
      live = false
    }
  }, [router])

  async function signOut() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('agrilink_user_name')
        localStorage.removeItem('agrilink_user_role')
        localStorage.removeItem('agrilink_user_phone')
        localStorage.removeItem('agrilink_session')
      } catch {}
    }
    const auth = getAuthClient()
    const { data } = await auth.auth.getSession()
    if (data.session) {
      await fetch('/api/account/activity', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + data.session.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'logout' }),
      }).catch(() => {})
    }
    await auth.auth.signOut()
    router.replace('/')
  }

  if (!ready) {
    return (
      <main className='grid min-h-screen place-items-center'>
        <Loader2 className='size-7 animate-spin text-primary' />
      </main>
    )
  }

  return (
    <AgriLinkDashboard onSignOut={signOut} verified={verified} userName={userName} userRole={userRole} />
  )
}
