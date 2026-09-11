import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getAadhaarValidation, getMobileValidation } from '@/lib/identity'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

const OTP_TTL_MS = 5 * 60 * 1000
const allowedTypes = new Set(['farmer', 'buyer'])
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v)
const secret = () => process.env.IDENTITY_OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV !== 'production' ? 'local-development-secret' : '')
const hashOtp = (otp: string, id: string) => createHmac('sha256', secret()).update(`${id}:${otp}`).digest('hex')
async function deliverOtp(mobile: string, otp: string) {
  const webhook = process.env.IDENTITY_OTP_WEBHOOK_URL
  const apiKey = process.env.TWOFACTOR_API_KEY_2 || process.env.TWOFACTOR_API_KEY
  const twoFactorBase = process.env.TWOFACTOR_API_URL || 'https://2factor.in/API/V1'
  const endpoint = webhook || (apiKey ? `${twoFactorBase}/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(mobile)}/${encodeURIComponent(otp)}/AgriLink` : '')
  if (!endpoint) throw new Error('Identity OTP delivery is not configured.')

  const response = await fetch(endpoint, {
    method: webhook ? 'POST' : 'GET',
    ...(webhook ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, otp, purpose: 'agrilink_identity_verification' }) } : {}),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error('Unable to send the verification code. Please try again.')
  if (!webhook) {
    const result = await response.json().catch(() => null) as { Status?: string } | null
    if (result?.Status && result.Status.toLowerCase() !== 'success') throw new Error('Unable to send the verification code. Please try again.')
  }
}
function protectAadhaar(value: string) {
  // A non-reversible keyed digest means this service never persists a readable Aadhaar value.
  return `sha256:${createHmac('sha256', secret()).update(value).digest('hex')}`
}
function safe(row: Record<string, unknown>) {
  return { id: row.id, user_type: row.user_type, user_id: row.user_id, aadhaar_last4: row.aadhaar_last4, mobile_verified: row.mobile_verified, aadhaar_format_valid: row.aadhaar_format_valid, verhoeff_valid: row.verhoeff_valid, aadhaar_consent: row.aadhaar_consent, aadhaar_document_url: row.aadhaar_document_url, identity_confidence: row.identity_confidence, verification_status: row.verification_status, verified_at: row.verified_at }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: 'start' | 'verify' | 'resend'; user_type?: string; user_id?: string; aadhaar?: string; mobile?: string; consent_owner?: boolean; consent_storage?: boolean; otp?: string; document_path?: string }
    if (!body.action || !allowedTypes.has(body.user_type ?? '') || !isUuid(body.user_id)) return NextResponse.json({ error: 'A valid user type and user ID are required.' }, { status: 400 })
    if (!secret()) return NextResponse.json({ error: 'Identity service is not configured.' }, { status: 503 })
    const db = requireSupabaseAdmin()
    if (body.action === 'start') {
      const aadhaar = getAadhaarValidation(body.aadhaar ?? ''), mobile = getMobileValidation(body.mobile ?? '')
      if (!aadhaar.formatValid || !aadhaar.verhoeffValid) return NextResponse.json({ error: 'Enter a valid 12-digit Aadhaar number.' }, { status: 400 })
      if (!mobile.valid) return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      if (!body.consent_owner || !body.consent_storage) return NextResponse.json({ error: 'Both Aadhaar consent confirmations are required.' }, { status: 400 })
      const { data: verification, error } = await db.from('identity_verifications').upsert({
        user_id: body.user_id, user_type: body.user_type as 'farmer' | 'buyer', aadhaar_number: protectAadhaar(aadhaar.normalized), aadhaar_last4: aadhaar.normalized.slice(-4),
        aadhaar_consent: true, mobile_number: mobile.normalized, mobile_verified: false, aadhaar_format_valid: true, verhoeff_valid: true,
        aadhaar_document_url: body.document_path || null, verification_status: 'pending', verified_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,user_type' }).select().single()
      if (error) throw error
      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const { error: otpError } = await db.from('identity_otp_challenges').insert({ verification_id: verification.id, otp_hash: hashOtp(otp, verification.id), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() })
      if (otpError) throw otpError
      await deliverOtp(mobile.normalized, otp)
      return NextResponse.json({ verification: safe(verification), expires_in_seconds: OTP_TTL_MS / 1000, ...(process.env.NODE_ENV !== 'production' ? { development_otp: otp } : {}) })
    }
    const { data: verification, error: lookupError } = await db.from('identity_verifications').select().eq('user_id', body.user_id).eq('user_type', body.user_type as 'farmer' | 'buyer').maybeSingle()
    if (lookupError) throw lookupError
    if (!verification) return NextResponse.json({ error: 'Start verification before requesting a code.' }, { status: 404 })
    if (body.action === 'resend') {
      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const { error } = await db.from('identity_otp_challenges').insert({ verification_id: verification.id, otp_hash: hashOtp(otp, verification.id), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() })
      if (error) throw error
      await deliverOtp(verification.mobile_number, otp)
      return NextResponse.json({ expires_in_seconds: OTP_TTL_MS / 1000, ...(process.env.NODE_ENV !== 'production' ? { development_otp: otp } : {}) })
    }
    const { data: challenge, error: challengeError } = await db.from('identity_otp_challenges').select().eq('verification_id', verification.id).is('consumed_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (challengeError) throw challengeError
    if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 })
    if (challenge.attempts >= 5) return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 })
    const candidate = hashOtp(String(body.otp ?? ''), verification.id)
    const valid = candidate.length === challenge.otp_hash.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(challenge.otp_hash))
    if (!valid) { await db.from('identity_otp_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id); return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 }) }
    const now = new Date().toISOString()
    await db.from('identity_otp_challenges').update({ consumed_at: now }).eq('id', challenge.id)
    const { data, error } = await db.from('identity_verifications').update({ mobile_verified: true, verification_status: 'verified', verified_at: now, updated_at: now }).eq('id', verification.id).select().single()
    if (error) throw error
    await db.from('user_profiles').update({ verification_status: 'verified', updated_at: now }).eq('id', verification.user_id)
    return NextResponse.json({ verification: safe(data) })
  } catch (error) { console.error('[identity] request failed', error); return NextResponse.json({ error: error instanceof Error ? error.message : 'Identity verification is unavailable.' }, { status: 503 }) }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), userId = url.searchParams.get('user_id'), userType = url.searchParams.get('user_type')
    if (!isUuid(userId) || !allowedTypes.has(userType ?? '')) return NextResponse.json({ error: 'A valid user is required.' }, { status: 400 })
    const { data, error } = await requireSupabaseAdmin().from('identity_verifications').select().eq('user_id', userId).eq('user_type', userType as 'farmer' | 'buyer').maybeSingle()
    if (error) throw error
    return NextResponse.json({ verification: data ? safe(data) : null })
  } catch { return NextResponse.json({ error: 'Identity lookup is unavailable.' }, { status: 503 }) }
}
