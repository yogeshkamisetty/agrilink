'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Info, Loader2, ShieldCheck, Sprout } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'

const input = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)

  const normalPhone = phone.replace(/\D/g, '').slice(-10)

  async function sendOtp(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setDemoOtp(null)

    try {
      if (!/^[6-9]\d{9}$/.test(normalPhone)) {
        throw new Error('Enter a valid 10-digit Indian mobile number.')
      }

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: normalPhone }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to send verification code.')
      }

      setSessionId(data.sessionId || '')
      setStep('otp')

      if (data.isDemo && data.demoOtp) {
        setDemoOtp(data.demoOtp)
        setOtp(data.demoOtp)
        setNotice(`Demo Mode active. OTP ${data.demoOtp} has been auto-filled for testing.`)
      } else {
        setNotice(data.message || `A six-digit code was sent to +91 ${normalPhone}.`)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the code.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          phone: normalPhone,
          otp,
          sessionId,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'The verification code is invalid.')
      }

      if (data.session) {
        try {
          const auth = getAuthClient()
          await auth.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
        } catch (e) {
          console.warn('Could not initialize client session:', e)
        }
      }

      router.replace(data.onboardingComplete ? '/portal' : '/onboarding')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify the code.')
    } finally {
      setBusy(false)
    }
  }

  const newUser = mode === 'signup'

  return (
    <main className='grid min-h-screen place-items-center bg-background p-5'>
      <section className='w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm'>
        <Link href='/' className='flex items-center gap-2 font-serif text-2xl font-bold'>
          <span className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'>
            <Sprout className='size-5' />
          </span>
          AgriLink
        </Link>

        <p className='mt-7 text-xs font-semibold uppercase tracking-[.2em] text-primary'>
          {newUser ? 'Create account' : 'Welcome back'}
        </p>
        <h1 className='mt-2 font-serif text-3xl'>
          {step === 'mobile' ? 'Verify your mobile number' : 'Enter your OTP'}
        </h1>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
          {step === 'mobile'
            ? 'Demo login is enabled. Enter any valid Indian mobile number and use OTP 123456. Aadhaar verification can be completed from your workspace anytime.'
            : 'Enter the 6-digit code sent to your phone.'}
        </p>

        {step === 'mobile' ? (
          <form onSubmit={sendOtp} className='mt-6 space-y-4'>
            <label className='block text-sm font-medium'>
              Mobile number
              <div className='mt-2 flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'>
                <span className='border-r border-border px-4 py-3 text-sm text-muted-foreground'>+91</span>
                <input
                  className='min-w-0 flex-1 rounded-r-xl bg-transparent px-4 py-3 text-sm outline-none'
                  inputMode='numeric'
                  autoComplete='tel'
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder='98765 43210'
                />
              </div>
            </label>
            <button
              disabled={busy}
              className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'
            >
              {busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}
              Continue with demo OTP
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className='mt-6 space-y-4'>
            <div className='rounded-2xl bg-muted p-4 text-sm'>
              <div className='flex items-center justify-between'>
                <p className='font-semibold'>Code sent to +91 {normalPhone}</p>
                <button
                  type='button'
                  onClick={() => {
                    setStep('mobile')
                    setOtp('')
                    setDemoOtp(null)
                  }}
                  className='text-xs font-semibold text-primary hover:underline'
                >
                  Change number
                </button>
              </div>
            </div>

            {demoOtp && (
              <div className='flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-200'>
                <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
                <div>
                  <p className='font-semibold'>Free Tier / Demo Mode Active</p>
                  <p className='mt-0.5'>
                    Use code <span className='font-mono font-bold tracking-wider'>{demoOtp}</span> (auto-filled below).
                  </p>
                </div>
              </div>
            )}

            <label className='block text-sm font-medium'>
              One-time password
              <input
                className={input + ' text-center text-2xl tracking-[.35em]'}
                inputMode='numeric'
                autoComplete='one-time-code'
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder='123456'
              />
            </label>

            <button
              disabled={busy || otp.length !== 6}
              className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'
            >
              {busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}
              Verify and continue
            </button>
          </form>
        )}

        {error && <p className='mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive'>{error}</p>}
        {notice && !demoOtp && (
          <div className='mt-4 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs leading-5 text-primary'>
            <Info className='mt-0.5 size-4 shrink-0' />
            <span>{notice}</span>
          </div>
        )}

        <div className='mt-6 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground'>
          <ShieldCheck className='mt-0.5 size-4 shrink-0 text-primary' />
          Mobile verification grants immediate workspace access. Aadhaar trust verification is optional and available inside the portal.
        </div>

        <p className='mt-5 text-center text-sm text-muted-foreground'>
          {newUser ? 'Already registered?' : 'New to AgriLink?'}{' '}
          <Link className='font-semibold text-primary' href={newUser ? '/login' : '/signup'}>
            {newUser ? 'Sign in' : 'Start with mobile OTP'}
          </Link>
        </p>
      </section>
    </main>
  )
}
