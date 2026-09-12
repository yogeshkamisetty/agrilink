'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles, Sprout, User, Users } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const newUser = mode === 'signup'

  // Form states
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'buyer' | 'admin'>('farmer')
  const [adminPasscode, setAdminPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState('')

  // UX & async states
  const [busy, setBusy] = useState(false)
  const [quickBusyRole, setQuickBusyRole] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recognizedUser, setRecognizedUser] = useState<{ fullName: string | null; role: string | null; verificationStatus: string } | null>(null)
  const [checkingPhone, setCheckingPhone] = useState(false)

  const normalPhone = phone.replace(/\D/g, '').slice(-10)

  // Real-time phone lookup
  const handlePhoneChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setPhone(clean)
    setRecognizedUser(null)
    setError('')

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

  // Handle successful session storage and redirection
  const handleAuthSuccess = async (data: any, fallbackRole: string, phoneUsed: string) => {
    const userRole = data.profile?.role || data.user?.role || fallbackRole || 'farmer'
    const mappedRole = userRole === 'farmer' ? 'Farmer' : userRole === 'buyer' ? 'Buyer' : 'Coordinator'
    const userName = data.profile?.full_name || data.user?.fullName || data.user?.name || (mappedRole === 'Farmer' ? 'Ramesh Kumar' : mappedRole === 'Buyer' ? 'Meera Patel' : 'Anita Sharma')

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('agrilink_user_name', userName)
        localStorage.setItem('agrilink_user_role', mappedRole)
        localStorage.setItem('agrilink_user_phone', phoneUsed)
        if (data.session) {
          localStorage.setItem('agrilink_session', JSON.stringify(data.session))
        }
      } catch {}
    }

    if (data.session) {
      try {
        const auth = getAuthClient()
        await auth.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      } catch (e) {
        console.warn('Could not initialize auth client session:', e)
      }
    }

    const destination = data.redirectUrl || (userRole === 'admin' ? '/admin' : '/portal')
    router.replace(destination)
  }

  // 1-Click Quick Demo Login for Evaluators and Jury
  async function handleQuickDemo(role: 'farmer' | 'buyer' | 'admin') {
    setQuickBusyRole(role)
    setError('')
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quick_demo', role }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to sign in to demo persona.')
      }
      const demoPhone = role === 'farmer' ? '9825144102' : role === 'buyer' ? '9825277103' : '9825000000'
      await handleAuthSuccess(data, role, demoPhone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick login failed.')
      setQuickBusyRole(null)
    }
  }

  // Handle standard MPIN Login
  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (!/^[6-9]\d{9}$/.test(normalPhone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.')
      }

      if (pin.trim().length < 4) {
        throw new Error('Please enter your 4-digit security MPIN.')
      }

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: normalPhone,
          pin: pin.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Login failed. Please check your details.')
      }

      await handleAuthSuccess(data, recognizedUser?.role || 'farmer', normalPhone)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to log in.')
      setBusy(false)
    }
  }

  // Handle new user registration
  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setPasscodeError('')

    try {
      if (!fullName.trim() || fullName.trim().length < 2) {
        throw new Error('Please enter your full name.')
      }

      if (!/^[6-9]\d{9}$/.test(normalPhone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.')
      }

      if (selectedRole === 'admin') {
        if (adminPasscode.trim() !== 'AGRILINK-FPO-2025') {
          setPasscodeError('Invalid FPO Coordinator authorization passcode.')
          setBusy(false)
          return
        }
      }

      if (!/^\d{4,6}$/.test(pin.trim())) {
        throw new Error('Please choose a 4-digit numeric security MPIN.')
      }

      if (pin.trim() !== confirmPin.trim()) {
        throw new Error('The confirmation MPIN does not match. Please re-enter.')
      }

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          phone: normalPhone,
          fullName: fullName.trim(),
          role: selectedRole,
          adminPasscode: adminPasscode.trim(),
          pin: pin.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Account creation failed.')
      }

      await handleAuthSuccess(data, selectedRole, normalPhone)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create account.')
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 sm:p-6">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-serif text-2xl font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="size-5" />
            </span>
            AgriLink
          </Link>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            Zero-API Instant Login
          </span>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-primary">
          {newUser ? 'New Registration' : 'Welcome back'}
        </p>
        <h1 className="mt-1 font-serif text-2xl sm:text-3xl">
          {newUser ? 'Create your AgriLink account' : 'Sign in with Mobile & MPIN'}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
          {newUser
            ? 'Free self-hosted registration. Set your 4-digit security PIN to access your workspace.'
            : 'Enter your 10-digit mobile number and 4-digit PIN. No external SMS APIs needed.'}
        </p>

        {/* 1-Click Quick Demo Access Bar (Prominent for Hackathons / Reviewers) */}
        {!newUser && (
          <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                1-Click Quick Demo Access
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">For Evaluators</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Instant login into pre-configured role workspaces with zero typing:
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={Boolean(quickBusyRole) || busy}
                onClick={() => handleQuickDemo('farmer')}
                className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-center hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {quickBusyRole === 'farmer' ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : '🌾 Farmer'}
                </span>
                <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 truncate w-full">Ramesh</span>
              </button>

              <button
                type="button"
                disabled={Boolean(quickBusyRole) || busy}
                onClick={() => handleQuickDemo('buyer')}
                className="flex flex-col items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 p-2 text-center hover:bg-sky-500/20 transition-all disabled:opacity-50"
              >
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                  {quickBusyRole === 'buyer' ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : '🛒 Buyer'}
                </span>
                <span className="text-[10px] text-sky-800/80 dark:text-sky-300/80 truncate w-full">Meera</span>
              </button>

              <button
                type="button"
                disabled={Boolean(quickBusyRole) || busy}
                onClick={() => handleQuickDemo('admin')}
                className="flex flex-col items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 p-2 text-center hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {quickBusyRole === 'admin' ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : '🏢 FPO Admin'}
                </span>
                <span className="text-[10px] text-purple-800/80 dark:text-purple-300/80 truncate w-full">Anita</span>
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        {!newUser && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">Or sign in with your phone</span>
            </div>
          </div>
        )}

        {/* Form: Login or Signup */}
        <form onSubmit={newUser ? handleSignup : handleLogin} className="space-y-4">
          {/* Signup specific: Full Name */}
          {newUser && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="mt-1.5 flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span className="flex items-center pl-3.5 text-muted-foreground">
                  <User className="size-4" />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Patel"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </div>
            </div>
          )}

          {/* Signup specific: Role Selector */}
          {newUser && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('farmer')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
                    selectedRole === 'farmer'
                      ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs font-bold">Farmer</span>
                  <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Crops & Payouts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('buyer')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
                    selectedRole === 'buyer'
                      ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs font-bold">Buyer</span>
                  <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Procurement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
                    selectedRole === 'admin'
                      ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs font-bold">FPO Admin</span>
                  <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Coordinator</span>
                </button>
              </div>

              {selectedRole === 'admin' && (
                <div className="mt-2.5 rounded-2xl border border-border bg-secondary/50 p-3 space-y-2">
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
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                      required
                    />
                  </label>
                  {passcodeError && <p className="text-[11px] text-destructive font-medium">{passcodeError}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    Coordinator access is restricted to authorized FPO federation staff.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mobile Number
            </label>
            <div className="mt-1.5 flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <span className="border-r border-border px-3.5 py-2.5 text-sm text-muted-foreground font-mono">+91</span>
              <input
                className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 py-2.5 text-sm outline-none font-mono"
                inputMode="numeric"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="98251 44102"
              />
            </div>
          </div>

          {/* Real-time Phone Recognition Card */}
          {checkingPhone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
              <Loader2 className="size-3 animate-spin" /> Verifying account in database…
            </p>
          )}

          {recognizedUser && !newUser && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs">
                {recognizedUser.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-emerald-950 dark:text-emerald-100 truncate">
                    {recognizedUser.fullName || 'Registered User'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-2 py-0.2 text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    {recognizedUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
                  Recognized · Enter your 4-digit MPIN below
                </p>
              </div>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            </div>
          )}

          {/* 4-Digit MPIN Field */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {newUser ? 'Set 4-Digit MPIN' : 'Security MPIN'}
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showPin ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="mt-1.5 relative flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <span className="flex items-center pl-3.5 text-muted-foreground">
                <Lock className="size-4" />
              </span>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={newUser ? 'Enter 4-digit PIN (e.g. 1234)' : '4-digit MPIN (Default: 1234)'}
                className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm font-mono tracking-widest outline-none"
              />
            </div>
            {!newUser && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tip: Default MPIN for pre-seeded accounts is <span className="font-mono font-bold text-foreground">1234</span>.
              </p>
            )}
          </div>

          {/* Signup specific: Confirm MPIN */}
          {newUser && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm 4-Digit MPIN
              </label>
              <div className="mt-1.5 relative flex rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span className="flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="size-4" />
                </span>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Re-enter 4-digit MPIN"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm font-mono tracking-widest outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={busy || Boolean(quickBusyRole)}
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60 shadow-xs hover:bg-primary/95 transition-colors"
          >
            {busy && <Loader2 className="mr-2 inline size-4 animate-spin" />}
            {newUser ? 'Create Account & Enter Portal' : 'Sign in to Workspace'}
          </button>
        </form>

        {/* Error message box */}
        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium leading-relaxed">
            {error}
          </p>
        )}

        {/* Security badge */}
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Self-hosted authentication with PBKDF2 encryption. Zero external SMS API dependencies.
          </span>
        </div>

        {/* Navigation link */}
        <p className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
          {newUser ? 'Already registered?' : 'New to AgriLink?'}{' '}
          <Link className="font-semibold text-primary hover:underline" href={newUser ? '/login' : '/signup'}>
            {newUser ? 'Sign in with MPIN' : 'Create new account'}
          </Link>
        </p>
      </section>
    </main>
  )
}
