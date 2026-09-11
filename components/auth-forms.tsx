'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sprout } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
const input = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter(), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const auth = getAuthClient()
      if (mode === 'signup') { const { data, error } = await auth.auth.signUp({ email, password }); if (error) throw error; if (!data.session) { setNotice('Check your email to confirm your account, then sign in.'); return }; await fetch('/api/account/activity', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'signup' }) }); router.replace('/onboarding') }
      else { const { data, error } = await auth.auth.signInWithPassword({ email, password }); if (error) throw error; await fetch('/api/account/activity', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'login' }) }); router.replace('/portal') }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to continue.') } finally { setBusy(false) }
  }
  const isLogin = mode === 'login'
  return <main className='grid min-h-screen place-items-center bg-background p-5'><section className='w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm'><Link href='/' className='flex items-center gap-2 font-serif text-2xl font-bold'><span className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'><Sprout className='size-5' /></span>AgriLink</Link><p className='mt-7 text-xs font-semibold uppercase tracking-[.2em] text-primary'>{isLogin ? 'Welcome back' : 'Create your account'}</p><h1 className='mt-2 font-serif text-3xl'>{isLogin ? 'Sign in to your workspace' : 'Join the trusted produce network'}</h1><form onSubmit={submit} className='mt-6 space-y-4'><label className='block text-sm font-medium'>Email<input className={input} type='email' required value={email} onChange={e => setEmail(e.target.value)} /></label><label className='block text-sm font-medium'>Password<input className={input} type='password' minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'>{error}</p>}{notice && <p className='rounded-xl bg-primary/10 p-3 text-sm text-primary'>{notice}</p>}<button disabled={busy} className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'>{busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}{isLogin ? 'Sign in' : 'Create account'}</button></form><p className='mt-5 text-center text-sm text-muted-foreground'>{isLogin ? 'New to AgriLink?' : 'Already have an account?'} <Link className='font-semibold text-primary' href={isLogin ? '/signup' : '/login'}>{isLogin ? 'Sign up' : 'Sign in'}</Link></p></section></main>
}
