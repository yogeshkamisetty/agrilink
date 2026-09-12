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

  const [selectedRole, setSelectedRole] = useState<'farmer' | 'buyer' | 'admin'>('farmer')
  const [adminPasscode, setAdminPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [recognizedUser, setRecognizedUser] = useState<{ fullName: string | null; role: string | null; verificationStatus: string } | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)

  const normalPhone = phone.replace(/\D/g, '').slice(-10)

  // Real-time user recognition lookup when phone number reaches 10 digits
  const handlePhoneChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setPhone(clean)
    setRecognizedUser(null)

    if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) {
      setCheckingPhone(true)
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'lookup', phone: clean }),
        })
        const data = await res.json()
        if (data.ok && data.exists && data.user) {
          setRecognizedUser(data.user)
        }
      } catch {} finally {
        setCheckingPhone(false)
      }
    }
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setDemoOtp(null)
    setPasscodeError('')

    if (mode === 'signup' && selectedRole === 'admin') {
      if (adminPasscode.trim() !== 'AGRILINK-FPO-2025') {
        setPasscodeError('Invalid FPO Coordinator authorization passcode.')
        setBusy(false)
        return
      }
    }

    try {
      if (!/^[6-9]\d{9}$/.test(normalPhone)) {
        throw new Error('Enter a valid 10-digit Indian mobile number.')
      }

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: normalPhone, role: selectedRole }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to send verification code.')
      }

      if (data.existingUser) {
        setRecognizedUser(data.existingUser)
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
          role: selectedRole,
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

      const userRole = data.profile?.role || (mode === 'signup' ? selectedRole : recognizedUser?.role) || 'farmer'
      const mappedRole = userRole === 'farmer' ? 'Farmer' : userRole === 'buyer' ? 'Buyer' : 'Coordinator'

      if (typeof window !== 'undefined') {
        try {
          if (data.profile?.full_name || recognizedUser?.fullName) {
            localStorage.setItem('agrilink_user_name', data.profile?.full_name || recognizedUser?.fullName || '')
          }
          localStorage.setItem('agrilink_user_role', mappedRole)
          if (normalPhone) {
            localStorage.setItem('agrilink_user_phone', normalPhone)
          }
          if (mode === 'signup') {
            localStorage.setItem('agrilink_signup_role', selectedRole)
          }
        } catch {}
      }

      const destination = data.redirectUrl || (userRole === 'admin' ? '/admin' : data.onboardingComplete ? '/portal' : '/onboarding')
      router.replace(destination)
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
            {newUser && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Your Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('farmer')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                      selectedRole === 'farmer'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="text-xs font-bold">Farmer</span>
                    <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Crops & Payouts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('buyer')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                      selectedRole === 'buyer'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="text-xs font-bold">Buyer</span>
                    <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Procurement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                      selectedRole === 'admin'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="text-xs font-bold">FPO Admin</span>
                    <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Coordinator</span>
                  </button>
                </div>

                {selectedRole === 'admin' && (
                  <div className="mt-3 rounded-2xl border border-border bg-secondary/50 p-3.5 space-y-2">
                    <label className="block text-xs font-medium">
                      FPO Coordinator Passcode
                      <input
                        type="password"
                        value={adminPasscode}
                        onChange={(e) => {
                          setAdminPasscode(e.target.value)
                          setPasscodeError('')
                        }}
                        placeholder="Passcode (Demo: AGRILINK-FPO-2025)"
                        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                        required
                      />
                    </label>
                    {passcodeError && <p className="text-[11px] text-destructive font-medium">{passcodeError}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      Coordinator access is restricted to verified FPO federation leads.
                    </p>
                  </div>
                )}
              </div>
            )}

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
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder='98765 43210'
                />
              </div>
            </label>

            {checkingPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                <Loader2 className="size-3 animate-spin" /> Verifying account in database…
              </p>
            )}

            {recognizedUser && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
                  {recognizedUser.fullName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-emerald-950 dark:text-emerald-100 truncate">
                      {recognizedUser.fullName || 'Registered Member'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                      {recognizedUser.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                    Recognized from database · Auto-routing to your {recognizedUser.role} workspace
                  </p>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              </div>
            )}

            <button
              disabled={busy}
              className='w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60 shadow-xs'
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
