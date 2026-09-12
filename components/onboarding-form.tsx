'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'

const input = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function OnboardingForm() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    mobile_number: '',
    village: '',
    district: '',
    state: '',
    fpo_name: '',
    organization_name: '',
    organization_type: 'Restaurant',
  })

  useEffect(() => {
    getAuthClient().auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      } else {
        setUserId(data.session.user.id)
        if (data.session.user.phone) {
          const ph = data.session.user.phone.replace(/\D/g, '').slice(-10)
          setForm(prev => ({ ...prev, mobile_number: prev.mobile_number || ph }))
        }
      }
    })
  }, [router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!userId) return
    setBusy(true)
    setError('')

    try {
      const { data } = await getAuthClient().auth.getSession()
      if (!data.session) {
        throw new Error('Your session expired. Please sign in again.')
      }

      const res = await fetch('/api/account/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
        },
        body: JSON.stringify({ ...form, role }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save profile.')
      }

      setSaved(true)
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to save profile.')
    } finally {
      setBusy(false)
    }
  }

  if (!userId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fcfbf7] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">AgriLink Onboarding</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verifying authenticated session…</p>
          </div>
        </div>
      </main>
    )
  }

  if (saved) {
    router.replace('/portal')
    return (
      <main className='grid min-h-screen place-items-center text-sm text-muted-foreground'>
        <Loader2 className='mr-2 inline size-4 animate-spin text-primary' />
        Opening your workspace…
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-2xl p-5 py-12'>
      <section className='rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm'>
        <p className='text-xs font-semibold uppercase tracking-[.2em] text-primary'>Profile setup</p>
        <h1 className='mt-2 font-serif text-4xl'>Tell us about your work</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Your mobile number is already verified. Aadhaar trust verification can be completed from the workspace at any time.
        </p>

        <div
          role="radiogroup"
          aria-label="Select your role in the supply network"
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            role="radio"
            aria-checked={role === 'farmer'}
            onClick={() => setRole('farmer')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              role === 'farmer' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:bg-muted'
            }`}
          >
            <b className="text-base font-semibold">Farmer</b>
            <span className="mt-1 block text-xs text-muted-foreground">Crops, location and FPO details</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={role === 'buyer'}
            onClick={() => setRole('buyer')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              role === 'buyer' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:bg-muted'
            }`}
          >
            <b className="text-base font-semibold">Buyer</b>
            <span className="mt-1 block text-xs text-muted-foreground">Organization and purchase profile</span>
          </button>
        </div>

        <form onSubmit={submit} className='mt-6 grid gap-4 sm:grid-cols-2'>
          <label className='text-sm font-medium sm:col-span-2'>
            Full name
            <input
              required
              className={input}
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder='e.g. Ramesh Patel or Sruthi Katru'
            />
          </label>

          <label className='text-sm font-medium sm:col-span-2'>
            Mobile number
            <input
              required
              inputMode='numeric'
              className={input}
              value={form.mobile_number}
              onChange={e => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder='10-digit mobile number'
            />
          </label>

          {role === 'farmer' ? (
            <>
              <label className='text-sm font-medium'>
                Village
                <input
                  required
                  className={input}
                  value={form.village}
                  onChange={e => setForm({ ...form, village: e.target.value })}
                  placeholder='Village name'
                />
              </label>
              <label className='text-sm font-medium'>
                District
                <input
                  required
                  className={input}
                  value={form.district}
                  onChange={e => setForm({ ...form, district: e.target.value })}
                  placeholder='District name'
                />
              </label>
              <label className='text-sm font-medium'>
                State
                <input
                  required
                  className={input}
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  placeholder='State name'
                />
              </label>
              <label className='text-sm font-medium'>
                FPO membership <span className='font-normal text-muted-foreground'>(optional)</span>
                <input
                  className={input}
                  value={form.fpo_name}
                  onChange={e => setForm({ ...form, fpo_name: e.target.value })}
                  placeholder='FPO name if affiliated'
                />
              </label>
            </>
          ) : (
            <>
              <label className='text-sm font-medium'>
                Organization name
                <input
                  required
                  className={input}
                  value={form.organization_name}
                  onChange={e => setForm({ ...form, organization_name: e.target.value })}
                  placeholder='Company, hotel, or store name'
                />
              </label>
              <label className='text-sm font-medium'>
                Business type
                <select
                  className={input}
                  value={form.organization_type}
                  onChange={e => setForm({ ...form, organization_type: e.target.value })}
                >
                  <option>Restaurant</option>
                  <option>Retail shop</option>
                  <option>Hotel</option>
                  <option>School / Hostel</option>
                  <option>Processor</option>
                  <option>Individual consumer</option>
                </select>
              </label>
            </>
          )}

          {error && (
            <div role="alert" aria-live="assertive" className='sm:col-span-2 flex items-start gap-2 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive'>
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={busy}
            className='sm:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60 hover:opacity-95 transition-opacity'
          >
            {busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}
            {busy ? 'Saving profile…' : 'Open workspace'}
          </button>
        </form>
      </section>
    </main>
  )
}
