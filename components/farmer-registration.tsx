'use client'

import { FormEvent, useState } from 'react'

const inputClass = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

type Farmer = { id: string; name: string; village: string; mobile_number: string; crop_name: string; quantity: number; verified: boolean }

export function FarmerRegistration() {
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form')
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', mobile_number: '', village: '', crop_name: 'Paddy', quantity: '25', consent: false })

  async function register(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await fetch('/api/farmers/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, quantity: Number(form.quantity) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setFarmer(data.farmer); setStep('otp')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') } finally { setBusy(false) }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    const otp = new FormData(event.currentTarget as HTMLFormElement).get('otp')
    try {
      const response = await fetch('/api/farmers/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ farmer_id: farmer?.id, otp }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setFarmer(data.farmer); setStep('done')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') } finally { setBusy(false) }
  }

  return <section className='mx-auto max-w-5xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8'>
    <div className='mb-8 flex flex-wrap items-start justify-between gap-4'>
      <div><p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Farmer onboarding</p><h1 className='mt-2 font-serif text-3xl text-foreground sm:text-4xl'>Join the AgriLink network</h1><p className='mt-2 max-w-xl text-sm leading-6 text-muted-foreground'>Register once, get verified, and receive direct buyer commitments without middlemen.</p></div>
      <div className='rounded-full bg-muted px-3 py-2 text-xs font-medium text-muted-foreground'>{step === 'form' ? 'Step 1 of 2' : step === 'otp' ? 'Step 2 of 2' : 'Verified profile'}</div>
    </div>
    {step === 'form' && <form onSubmit={register} className='grid gap-5 md:grid-cols-2'>
      <label className='text-sm font-medium'>Full name<input required className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='e.g. Lakshmi Devi' /></label>
      <label className='text-sm font-medium'>Mobile number<input required className={inputClass} value={form.mobile_number} onChange={e => setForm({ ...form, mobile_number: e.target.value })} placeholder='+91 98765 43210' /></label>
      <label className='text-sm font-medium'>Village / mandal<input required className={inputClass} value={form.village} onChange={e => setForm({ ...form, village: e.target.value })} placeholder='e.g. Kallur, Guntur' /></label>
      <label className='text-sm font-medium'>Primary crop<select className={inputClass} value={form.crop_name} onChange={e => setForm({ ...form, crop_name: e.target.value })}><option>Paddy</option><option>Maize</option><option>Tomato</option><option>Chilli</option><option>Groundnut</option></select></label>
      <label className='text-sm font-medium'>Available quantity (quintals)<input required min='1' type='number' className={inputClass} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
      <div className='flex items-end'><label className='flex gap-3 text-sm leading-6 text-muted-foreground'><input type='checkbox' className='mt-1 size-4 accent-primary' checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} />I agree to receive buyer offers and operational calls from AgriLink.</label></div>
      {error && <p className='md:col-span-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'>{error}</p>}
      <button disabled={busy} className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 md:col-span-2'>{busy ? 'Saving registration…' : 'Continue to verification'}</button>
    </form>}
    {step === 'otp' && <form onSubmit={verify} className='mx-auto max-w-md space-y-5'><div className='rounded-2xl bg-muted p-5'><p className='text-sm font-semibold'>Code sent to {farmer?.mobile_number}</p><p className='mt-1 text-sm text-muted-foreground'>Enter the six-digit code to verify your farmer profile.</p></div><label className='text-sm font-medium'>Verification code<input required name='otp' inputMode='numeric' pattern='[0-9]{6}' maxLength={6} className={`${inputClass} text-center text-2xl tracking-[0.4em]`} placeholder='123456' /></label>{error && <p className='rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'>{error}</p>}<button disabled={busy} className='w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60'>{busy ? 'Verifying…' : 'Verify farmer profile'}</button><p className='text-center text-xs text-muted-foreground'>Demo code: 123456</p></form>}
    {step === 'done' && <div className='grid gap-5 md:grid-cols-[1fr_auto] md:items-center'><div><div className='mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary'>Verified farmer</div><h2 className='font-serif text-3xl'>You are ready for direct commitments.</h2><p className='mt-2 text-sm leading-6 text-muted-foreground'>AgriLink will notify you when a buyer order matches {farmer?.crop_name} near {farmer?.village}.</p></div><div className='rounded-2xl border border-border p-5 text-sm'><p className='font-semibold'>{farmer?.name}</p><p className='mt-2 text-muted-foreground'>{farmer?.crop_name} · {farmer?.quantity} quintals</p><p className='text-muted-foreground'>{farmer?.village}</p></div></div>}
  </section>
}
