'use client'

import { FormEvent, useState } from 'react'

const inputClass = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

type Props = { subjectType?: 'farmer' | 'buyer'; subjectId?: string }
export function IdentityVerification({ subjectType = 'farmer', subjectId = '00000000-0000-0000-0000-000000000001' }: Props) {
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form')
  const [aadhaar, setAadhaar] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: step === 'form' ? 'start' : 'verify', subject_type: subjectType, subject_id: subjectId, aadhaar, consent, otp: new FormData(event.currentTarget as HTMLFormElement).get('otp') }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setStep(step === 'form' ? 'otp' : 'done')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to verify identity.') } finally { setBusy(false) }
  }
  return <section className='rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7'><div className='flex flex-wrap items-start justify-between gap-4'><div><p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Trust layer</p><h2 className='mt-2 font-serif text-3xl'>Verify identity</h2><p className='mt-2 max-w-xl text-sm leading-6 text-muted-foreground'>Keep sensitive identity data protected while giving buyers confidence in every farmer and supplier profile.</p></div><span className='rounded-full bg-muted px-3 py-2 text-xs font-medium text-muted-foreground'>{step === 'form' ? '1 of 2' : step === 'otp' ? '2 of 2' : 'Complete'}</span></div>
    {step === 'form' && <form onSubmit={submit} className='mt-7 grid gap-5 md:grid-cols-[1fr_auto] md:items-end'><label className='text-sm font-medium'>Aadhaar number<input required inputMode='numeric' minLength={12} maxLength={14} value={aadhaar} onChange={e => setAadhaar(e.target.value)} className={inputClass} placeholder='XXXX XXXX XXXX' /><span className='mt-2 block text-xs font-normal text-muted-foreground'>Only the last four digits are stored after verification.</span></label><label className='flex max-w-sm gap-3 text-sm leading-6 text-muted-foreground'><input type='checkbox' checked={consent} onChange={e => setConsent(e.target.checked)} className='mt-1 size-4 accent-primary' />I consent to identity verification for marketplace participation.</label><div className='md:col-span-2 flex flex-wrap items-center gap-4'>{error && <p className='text-sm text-destructive'>{error}</p>}<button disabled={busy} className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60'>{busy ? 'Sending code…' : 'Send verification code'}</button></div></form>}
    {step === 'otp' && <form onSubmit={submit} className='mt-7 max-w-md space-y-4'><label className='text-sm font-medium'>One-time code<input required name='otp' inputMode='numeric' pattern='[0-9]{6}' maxLength={6} className={`${inputClass} text-center text-2xl tracking-[0.4em]`} placeholder='123456' /></label>{error && <p className='text-sm text-destructive'>{error}</p>}<button disabled={busy} className='w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60'>{busy ? 'Verifying…' : 'Verify identity'}</button><p className='text-xs text-muted-foreground'>Demo code: 123456. Replace the provider in the server route for production OTP delivery.</p></form>}
    {step === 'done' && <div className='mt-7 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-primary/10 p-5'><div><p className='font-semibold text-primary'>Identity verified</p><p className='mt-1 text-sm text-muted-foreground'>Aadhaar ending in {aadhaar.replace(/\D/g, '').slice(-4)} is linked to this {subjectType} profile.</p></div><div className='rounded-full bg-card px-3 py-2 text-xs font-semibold text-primary'>Verified</div></div>}
  </section>
}
