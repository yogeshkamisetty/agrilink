import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

function normalizeAadhaar(value: string) { return value.replace(/\D/g, '') }
function validAadhaar(value: string) {
  const digits = normalizeAadhaar(value)
  if (!/^\d{12}$/.test(digits) || /^([0-9])\1{11}$/.test(digits)) return false
  const table = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,8,2,6,3,0,7,5,1],[4,2,6,1,7,5,9,3,8,0],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,1,9,5,2,3,8]]
  let checksum = 0
  digits.split('').reverse().forEach((digit, index) => { checksum = table[index % 8][(checksum + Number(digit)) % 10] })
  return checksum === 0
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; subject_type?: string; subject_id?: string; aadhaar?: string; consent?: boolean; otp?: string }
    if (!body.subject_type || !body.subject_id || !body.action) return NextResponse.json({ error: 'Missing verification details.' }, { status: 400 })
    const supabase = requireSupabaseAdmin()
    if (body.action === 'start') {
      if (!body.consent || !validAadhaar(body.aadhaar ?? '')) return NextResponse.json({ error: 'Enter a valid Aadhaar number and accept consent.' }, { status: 400 })
      const aadhaarLast4 = normalizeAadhaar(body.aadhaar!).slice(-4)
      const { data, error } = await supabase.from('identity_verifications').upsert({ subject_type: body.subject_type, subject_id: body.subject_id, aadhaar_last4: aadhaarLast4, status: 'otp_pending', consent_at: new Date().toISOString(), otp_sent_at: new Date().toISOString() }, { onConflict: 'subject_type,subject_id' }).select('id,status,aadhaar_last4,otp_sent_at').single()
      if (error) throw error
      return NextResponse.json({ verification: data, message: 'OTP sent. Demo code: 123456' })
    }
    if (body.action === 'verify') {
      if (body.otp !== '123456') return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 })
      const { data, error } = await supabase.from('identity_verifications').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('subject_type', body.subject_type).eq('subject_id', body.subject_id).select('id,status,verified_at,aadhaar_last4').single()
      if (error) throw error
      return NextResponse.json({ verification: data })
    }
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
  } catch (error) { console.error('[v0] identity verification failed', error); return NextResponse.json({ error: 'Identity verification is unavailable.' }, { status: 503 }) }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const subjectType = url.searchParams.get('subject_type'); const subjectId = url.searchParams.get('subject_id')
    if (!subjectType || !subjectId) return NextResponse.json({ error: 'Missing subject.' }, { status: 400 })
    const { data, error } = await requireSupabaseAdmin().from('identity_verifications').select('id,status,aadhaar_last4,verified_at,consent_at,otp_sent_at').eq('subject_type', subjectType).eq('subject_id', subjectId).maybeSingle()
    if (error) throw error
    return NextResponse.json({ verification: data })
  } catch (error) { console.error('[v0] identity lookup failed', error); return NextResponse.json({ error: 'Identity lookup is unavailable.' }, { status: 503 }) }
}
