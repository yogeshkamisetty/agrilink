'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { AgriLinkDashboard } from '@/components/agri-link-dashboard'
import Link from 'next/link'

export function ProtectedPortal() {
  const router = useRouter(), [ready, setReady] = useState(false), [verified, setVerified] = useState(false)
  useEffect(() => { let live = true; getAuthClient().auth.getSession().then(async ({ data }) => { if (!live) return; if (!data.session) return router.replace('/login'); const { data: profile } = await getAuthClient().from('user_profiles').select('onboarding_complete,verification_status').eq('id', data.session.user.id).maybeSingle(); if (!profile?.onboarding_complete) return router.replace('/onboarding'); setVerified(profile.verification_status === 'verified'); setReady(true) }).catch(() => router.replace('/login')); return () => { live = false } }, [router])
  async function signOut() { const auth = getAuthClient(), { data } = await auth.auth.getSession(); if (data.session) await fetch('/api/account/activity', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'logout' }) }); await auth.auth.signOut(); router.replace('/') }
  if (!ready) return <main className='grid min-h-screen place-items-center'><Loader2 className='size-7 animate-spin text-primary' /></main>
  return <>{!verified && <Link href='/verify' className='fixed bottom-5 left-5 z-50 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm'>Complete Aadhaar trust verification</Link>}<button onClick={signOut} className='fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted'><LogOut className='size-4' />Sign out</button><AgriLinkDashboard /></>
}
