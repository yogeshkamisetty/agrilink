'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, Sprout } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
const input = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter(), [phone, setPhone] = useState(''), [otp, setOtp] = useState(''), [step, setStep] = useState<'mobile' | 'otp'>('mobile'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  async function sendOtp(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { if (!/^[6-9]\d{9}$/.test(normalPhone)) throw new Error('Enter a valid 10-digit Indian mobile number.'); const { error } = await getAuthClient().auth.signInWithOtp({ phone: '+91' + normalPhone }); if (error) throw error; setStep('otp'); setNotice('A six-digit code was sent to +91 ' + normalPhone + '.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to send the code.') } finally { setBusy(false) }
  }
  async function verifyOtp(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const auth = getAuthClient(), { data, error } = await auth.auth.verifyOtp({ phone: '+91' + normalPhone, token: otp, type: 'sms' })
      if (error || !data.session) throw error || new Error('The verification code is invalid.')
      await fetch('/api/account/activity', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'login' }) })
      const { data: profile } = await auth.from('user_profiles').select('onboarding_complete').eq('id', data.session.user.id).maybeSingle()
      router.replace(profile?.onboarding_complete ? '/portal' : '/onboarding')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to verify the code.') } finally { setBusy(false) }
  }
  const newUser = mode === 'signup'
  return <main className='grid min-h-screen place-items-center bg-background p-5'><section className='w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm'><Link href='/' className='flex items-center gap-2 font-serif text-2xl font-bold'><span className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'><Sprout className='size-5' /></span>AgriLink</Link><p className='mt-7 text-xs font-semibold uppercase tracking-[.2em] text-primary'>{newUser ? 'Create account' : 'Welcome back'}</p><h1 className='mt-2 font-serif text-3xl'>{step === 'mobile' ? 'Verify your mobile number' : 'Enter your OTP'}</h1><p className='mt-2 text-sm leading-6 text-muted-foreground'>{step === 'mobile' ? 'Your mobile OTP gives you secure access. Aadhaar consent verification can be completed after you enter the workspace.' : 'The code expires shortly. Never share it with anyone.'}</p>{step === 'mobile' ? <form onSubmit={sendOtp} className='mt-6 space-y-4'><label className='block text-sm font-medium'>Mobile number<div className='mt-2 flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'><span className='border-r border-border px-4 py-3 text-sm text-muted-foreground'>+91</span><input className='min-w-0 flex-1 rounded-r-xl bg-transparent px-4 py-3 text-sm outline-none' inputMode='numeric' autoComplete='tel' required value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder='98765 43210' /></div></label><button disabled={busy} className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'>{busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}Send OTP</button></form> : <form onSubmit={verifyOtp} className='mt-6 space-y-4'><div className='rounded-2xl bg-muted p-4 text-sm'><p className='font-semibold'>Code sent to +91 {normalPhone}</p><button type='button' onClick={() => setStep('mobile')} className='mt-1 font-semibold text-primary'>Change number</button></div><label className='block text-sm font-medium'>One-time password<input className={input + ' text-center text-2xl tracking-[.35em]'} inputMode='numeric' autoComplete='one-time-code' required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder='123456' /></label><button disabled={busy || otp.length !== 6} className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'>{busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}Verify and continue</button></form>}{error && <p className='mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive'>{error}</p>}{notice && <p className='mt-4 rounded-xl bg-primary/10 p-3 text-sm text-primary'>{notice}</p>}<div className='mt-6 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground'><ShieldCheck className='mt-0.5 size-4 shrink-0 text-primary' />Mobile verification gives access to the platform. Aadhaar validation is a separate trust badge and does not block basic access.</div><p className='mt-5 text-center text-sm text-muted-foreground'>{newUser ? 'Already registered?' : 'New to AgriLink?'} <Link className='font-semibold text-primary' href={newUser ? '/login' : '/signup'}>{newUser ? 'Sign in' : 'Start with mobile OTP'}</Link></p></section></main>
}
