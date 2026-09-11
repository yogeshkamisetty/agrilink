'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { AgriLinkDashboard } from '@/components/agri-link-dashboard'
import Link from 'next/link'
import { CropAvailability } from '@/components/crop-availability'

export function ProtectedPortal() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    let live = true

    async function init() {
      try {
        const { data } = await getAuthClient().auth.getSession()
        if (!live) return
        if (!data.session) return router.replace('/login')

        // Fetch user profile via server API (bypasses any client RLS restrictions)
        let profile: { onboarding_complete?: boolean; verification_status?: string } | null = null
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
            .select('onboarding_complete,verification_status')
            .eq('id', data.session.user.id)
            .maybeSingle()
          profile = p
        }

        if (!live) return
        if (!profile?.onboarding_complete) return router.replace('/onboarding')
        setVerified(profile.verification_status === 'verified')
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
    <>
      {!verified && (
        <Link
          href='/verify'
          className='fixed bottom-5 left-5 z-50 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity'
        >
          Complete Aadhaar trust verification
        </Link>
      )}
      <button
        onClick={signOut}
        className='fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted'
      >
        <LogOut className='size-4' />
        Sign out
      </button>
      <AgriLinkDashboard />
      <main className="mx-auto max-w-[1500px] px-5 pb-10 sm:px-8 lg:pl-[21rem] lg:pr-10">
        <CropAvailability />
      </main>
    </>
  )
}
