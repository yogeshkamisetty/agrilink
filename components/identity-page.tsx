'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { IdentityVerification } from '@/components/identity-verification'

export function IdentityPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ id: string; role: 'farmer' | 'buyer' } | null>(null)

  useEffect(() => {
    let live = true

    async function checkUser() {
      try {
        const auth = getAuthClient()
        const { data } = await auth.auth.getSession()
        if (!live) return
        if (!data.session) return router.replace('/login')

        let userRole: 'farmer' | 'buyer' | null = null
        try {
          const res = await fetch('/api/account/profile', {
            headers: { Authorization: 'Bearer ' + data.session.access_token },
          })
          if (res.ok) {
            const json = await res.json()
            if (json.profile?.role === 'farmer' || json.profile?.role === 'buyer') {
              userRole = json.profile.role
            }
          }
        } catch {
          // Fallback to client SDK
          const { data: p } = await auth
            .from('user_profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .maybeSingle()
          if (p?.role === 'farmer' || p?.role === 'buyer') {
            userRole = p.role
          }
        }

        if (!live) return
        if (!userRole) return router.replace('/onboarding')
        setProfile({ id: data.session.user.id, role: userRole })
      } catch {
        if (live) router.replace('/login')
      }
    }

    checkUser()
    return () => {
      live = false
    }
  }, [router])

  if (!profile) {
    return (
      <main className='grid min-h-screen place-items-center'>
        <Loader2 className='animate-spin text-primary' />
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-4xl p-5 py-12'>
      <IdentityVerification subjectType={profile.role} subjectId={profile.id} />
    </main>
  )
}
