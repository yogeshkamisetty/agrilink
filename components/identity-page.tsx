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
      <main className="grid min-h-screen place-items-center bg-[#fcfbf7] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-emerald-800/20 bg-emerald-800/10 text-emerald-800 shadow-sm">
            <Loader2 className="size-7 animate-spin text-emerald-800" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#173b2b]">AgriLink Trust Registry</h2>
            <p className="mt-1 text-sm text-[#5f675f]">Verifying participant session and credentials…</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-4xl p-3.5 py-6 sm:p-5 sm:py-12'>
      <IdentityVerification subjectType={profile.role} subjectId={profile.id} />
    </main>
  )
}
