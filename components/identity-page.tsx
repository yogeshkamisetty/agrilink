'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { IdentityVerification } from '@/components/identity-verification'
export function IdentityPage() {
  const router = useRouter(), [profile, setProfile] = useState<{ id: string; role: 'farmer' | 'buyer' } | null>(null)
  useEffect(() => { getAuthClient().auth.getSession().then(async ({ data }) => { if (!data.session) return router.replace('/login'); const { data: p } = await getAuthClient().from('user_profiles').select('role').eq('id', data.session.user.id).maybeSingle(); if (!p || (p.role !== 'farmer' && p.role !== 'buyer')) return router.replace('/onboarding'); setProfile({ id: data.session.user.id, role: p.role }) }) }, [router])
  if (!profile) return <main className='grid min-h-screen place-items-center'><Loader2 className='animate-spin text-primary' /></main>
  return <main className='mx-auto max-w-4xl p-5 py-12'><IdentityVerification subjectType={profile.role} subjectId={profile.id} /></main>
}
