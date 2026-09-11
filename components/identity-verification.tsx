'use client'

import { FormEvent, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { formatAadhaar, getAadhaarValidation, getMobileValidation, normalizeMobile } from '@/lib/identity'

const inputClass = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
type Props = { subjectType?: 'farmer' | 'buyer'; subjectId?: string }
type Verification = { aadhaar_last4: string; mobile_verified: boolean; aadhaar_format_valid: boolean; verhoeff_valid: boolean; aadhaar_consent: boolean; aadhaar_document_url: string | null; verification_status: 'pending' | 'verified' | 'rejected'; verified_at: string | null }

export function IdentityVerification({ subjectType = 'farmer', subjectId = '00000000-0000-0000-0000-000000000001' }: Props) {
  const [phase, setPhase] = useState<'details' | 'otp' | 'complete'>('details')
  const [aadhaar, setAadhaar] = useState(''), [mobile, setMobile] = useState('')
  const [ownerConsent, setOwnerConsent] = useState(false), [storageConsent, setStorageConsent] = useState(false)
  const [document, setDocument] = useState<File | null>(null), [otp, setOtp] = useState(''), [devOtp, setDevOtp] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [verification, setVerification] = useState<Verification | null>(null)
  const aadhaarState = useMemo(() => getAadhaarValidation(aadhaar), [aadhaar])
  const mobileState = useMemo(() => getMobileValidation(mobile), [mobile])
  const progress = phase === 'details' ? 35 : phase === 'otp' ? 70 : 100
  async function uploadDocument() {
    if (!document) return undefined
    const payload = new FormData(); payload.set('file', document); payload.set('user_id', subjectId); payload.set('user_type', subjectType)
    const response = await fetch('/api/identity/document', { method: 'POST', body: payload }), data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data.path as string
  }
  async function start(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const documentPath = await uploadDocument()
      const response = await fetch('/api/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', user_type: subjectType, user_id: subjectId, aadhaar, mobile, consent_owner: ownerConsent, consent_storage: storageConsent, document_path: documentPath }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setVerification(data.verification); setDevOtp(data.development_otp || ''); setPhase('otp')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to start verification.') } finally { setBusy(false) }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', user_type: subjectType, user_id: subjectId, otp }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setVerification(data.verification); setPhase('complete')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to verify code.') } finally { setBusy(false) }
  }
  async function resend() {
    setBusy(true); setError('')
    try { const response = await fetch('/api/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resend', user_type: subjectType, user_id: subjectId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setDevOtp(data.development_otp || '') } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not resend code.') } finally { setBusy(false) }
  }
  const valid = aadhaarState.formatValid && aadhaarState.verhoeffValid && mobileState.valid && ownerConsent && storageConsent
  return <section className='rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7'>
    <div className='flex flex-wrap items-start justify-between gap-4'><div><p className='text-xs font-semibold uppercase tracking-[.2em] text-primary'>Trust & safety</p><h2 className='mt-2 font-serif text-3xl'>Identity verification</h2><p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>A practical identity check for {subjectType}s. This validates format and consent only; it is not Aadhaar or government authentication.</p></div><span className='rounded-full bg-muted px-3 py-2 text-xs font-medium'>{phase === 'complete' ? 'Verified' : `Step ${phase === 'details' ? '1' : '2'} of 2`}</span></div>
    <div className='mt-6 h-2 overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full bg-primary transition-all' style={{ width: `${progress}%` }} /></div>
    {phase === 'details' && <form onSubmit={start} className='mt-7 grid gap-5 md:grid-cols-2'>
      <label className='text-sm font-medium'>Aadhaar number<input required inputMode='numeric' value={formatAadhaar(aadhaar)} onChange={e => setAadhaar(e.target.value)} className={inputClass} placeholder='XXXX XXXX XXXX' aria-describedby='aadhaar-help' /><span id='aadhaar-help' className={`mt-2 flex items-center gap-1 text-xs font-normal ${aadhaar.length ? aadhaarState.verhoeffValid ? 'text-primary' : 'text-destructive' : 'text-muted-foreground'}`}>{aadhaar.length ? aadhaarState.verhoeffValid ? <CheckCircle2 className='size-3.5' /> : <CircleAlert className='size-3.5' /> : null}{aadhaar.length ? aadhaarState.verhoeffValid ? 'Aadhaar format and checksum valid' : aadhaarState.formatValid ? 'Invalid Aadhaar checksum' : 'Enter exactly 12 digits' : 'Spaces are removed automatically.'}</span></label>
      <label className='text-sm font-medium'>Mobile number<input required inputMode='numeric' value={mobile} onChange={e => setMobile(normalizeMobile(e.target.value))} className={inputClass} placeholder='98765 43210' /><span className={`mt-2 block text-xs font-normal ${mobile.length ? mobileState.valid ? 'text-primary' : 'text-destructive' : 'text-muted-foreground'}`}>{mobile.length ? mobileState.valid ? 'Mobile number ready for OTP' : 'Enter a valid 10-digit Indian mobile number' : 'We will send a one-time verification code.'}</span></label>
      <label className='md:col-span-2 flex cursor-pointer gap-3 rounded-2xl border border-border p-4 text-sm leading-6'><input type='checkbox' checked={ownerConsent} onChange={e => setOwnerConsent(e.target.checked)} className='mt-1 size-4 accent-primary' />I confirm that this Aadhaar number belongs to me.</label>
      <label className='md:col-span-2 flex cursor-pointer gap-3 rounded-2xl border border-border p-4 text-sm leading-6'><input type='checkbox' checked={storageConsent} onChange={e => setStorageConsent(e.target.checked)} className='mt-1 size-4 accent-primary' />I consent to AgriLink storing my identity-verification information securely.</label>
      <label className='md:col-span-2 rounded-2xl border border-dashed border-border p-4 text-sm'><span className='flex items-center gap-2 font-medium'><FileUp className='size-4 text-primary' />Optional Aadhaar card front</span><input type='file' accept='image/jpeg,image/png,application/pdf' onChange={e => setDocument(e.target.files?.[0] ?? null)} className='mt-3 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary' /><span className='mt-2 block text-xs text-muted-foreground'>JPG, PNG or PDF · up to 5 MB · stored in a private Supabase bucket.</span></label>
      {error && <p className='md:col-span-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'>{error}</p>}
      <button disabled={busy || !valid} className='md:col-span-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60'>{busy && <Loader2 className='mr-2 inline size-4 animate-spin' />}{busy ? 'Preparing verification…' : 'Send OTP'}</button>
    </form>}
    {phase === 'otp' && <><form onSubmit={verify} className='mx-auto mt-7 max-w-md space-y-4'><div className='rounded-2xl bg-muted p-4 text-sm'><p className='font-semibold'>Code sent to {mobile}</p><p className='mt-1 text-muted-foreground'>The code expires after 5 minutes.</p>{devOtp && <p className='mt-2 text-xs text-primary'>Local development code: {devOtp}</p>}</div><label className='text-sm font-medium'>One-time code<input required inputMode='numeric' value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} text-center text-2xl tracking-[.4em]`} placeholder='123456' /></label>{error && <p className='rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'>{error}</p>}<button disabled={busy || otp.length !== 6} className='w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60'>{busy ? 'Verifying…' : 'Verify mobile'}</button><button type='button' disabled={busy} onClick={resend} className='w-full text-sm font-semibold text-primary disabled:opacity-60'>Resend OTP</button></form>{verification && <VerificationCard verification={verification} />}</>}
    {phase === 'complete' && verification && <VerificationCard verification={verification} />}
  </section>
}
function VerificationCard({ verification }: { verification: Verification }) {
  const rows = [['Mobile verification', verification.mobile_verified], ['Aadhaar validation', verification.aadhaar_format_valid && verification.verhoeff_valid], ['Document upload', Boolean(verification.aadhaar_document_url)]]
  const verified = verification.verification_status === 'verified'
  return <div className='mt-7 rounded-2xl bg-primary/10 p-5'><div className='flex items-center gap-3'><ShieldCheck className='size-7 text-primary' /><div><p className='font-semibold text-primary'>{verified ? 'Identity verified' : 'Verification pending'}</p><p className='text-sm text-muted-foreground'>Aadhaar ending in {verification.aadhaar_last4} is linked to this profile.</p></div></div><div className='mt-5 grid gap-3 sm:grid-cols-3'>{rows.map(([label, ok]) => <div key={String(label)} className='rounded-xl bg-card p-3 text-sm'><p className='text-muted-foreground'>{label}</p><p className={`mt-1 font-semibold ${ok ? 'text-primary' : 'text-muted-foreground'}`}>{ok ? 'Complete' : 'Not provided'}</p></div>)}</div><p className='mt-4 text-xs text-muted-foreground'>{verified && verification.verified_at ? `Verified ${new Date(verification.verified_at).toLocaleDateString()}` : 'Complete mobile OTP verification to activate the badge.'}</p></div>
}
