import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOtp, verifyOtp } from '@/lib/server/otp-service'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  record.count += 1
  return { allowed: true }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'send' | 'verify'
      phone?: string
      otp?: string
      sessionId?: string
    }

    const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(-10) : ''
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip'

    if (body.action === 'send') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      // Rate limit OTP send requests: max 5 per minute per IP, max 3 per minute per phone
      const ipLimit = checkRateLimit(`send_ip_${clientIp}`, 5, 60 * 1000)
      if (!ipLimit.allowed) {
        return NextResponse.json(
          { error: `Too many OTP requests from this connection. Please wait ${ipLimit.retryAfter} seconds.` },
          { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfter) } }
        )
      }

      const phoneLimit = checkRateLimit(`send_phone_${phone}`, 3, 60 * 1000)
      if (!phoneLimit.allowed) {
        return NextResponse.json(
          { error: `Too many OTP requests for this phone number. Please wait ${phoneLimit.retryAfter} seconds.` },
          { status: 429, headers: { 'Retry-After': String(phoneLimit.retryAfter) } }
        )
      }

      const result = await sendOtp(phone)
      return NextResponse.json(result)
    }

    if (body.action === 'verify') {
      if (!phone || !body.otp) {
        return NextResponse.json({ error: 'Phone number and verification code are required.' }, { status: 400 })
      }

      // Rate limit verification attempts: max 10 per minute per phone
      const verifyLimit = checkRateLimit(`verify_phone_${phone}`, 10, 60 * 1000)
      if (!verifyLimit.allowed) {
        return NextResponse.json(
          { error: `Too many verification attempts. Please wait ${verifyLimit.retryAfter} seconds.` },
          { status: 429, headers: { 'Retry-After': String(verifyLimit.retryAfter) } }
        )
      }

      const verificationResult = await verifyOtp(phone, body.otp, body.sessionId)
      if (!verificationResult.ok) {
        return NextResponse.json({ error: verificationResult.error || 'Invalid verification code.' }, { status: 400 })
      }

      // A phone-verified browser session is required outside local development.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Authentication backend is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Vercel.' }, { status: 503 })
        }
        return NextResponse.json({
          ok: true,
          isMock: true,
          user: { id: `mock-${phone}`, phone: `+91${phone}` },
        })
      }
      const supabaseAdmin = requireSupabaseAdmin()

      // Provision user deterministically in Supabase Auth
      const email = `phone_${phone}@agrilink.internal`
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'agrilink_secret'
      const password = createHmac('sha256', serviceKey).update(`pwd_${phone}`).digest('hex')

      let userId: string | null = null

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: `+91${phone}`,
        phone_confirm: true,
        user_metadata: { mobile: phone },
      })

      if (created?.user) {
        userId = created.user.id
      } else if (createError) {
        // Look up existing user
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
        const existing = usersData?.users?.find(u => u.email === email || u.phone === `+91${phone}`)
        if (existing) {
          userId = existing.id
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password })
        }
      }

      // Ensure profile row exists
      if (userId) {
        const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, onboarding_complete, role, verification_status')
          .eq('id', userId)
          .maybeSingle()
        if (profileLookupError) throw new Error(`Unable to read user profile: ${profileLookupError.message}`)

        if (!existingProfile) {
          const { error: profileInsertError } = await supabaseAdmin.from('user_profiles').insert({
            id: userId,
            mobile_number: phone,
            onboarding_complete: false,
            verification_status: 'pending',
          })
          if (profileInsertError) throw new Error(`Unable to create user profile: ${profileInsertError.message}`)
        }
      }

      // Generate full client session
      const anon = createClient(supabaseUrl, anonKey)
      const { data: authData, error: signInError } = await anon.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !authData?.session) {
        throw signInError || new Error('Failed to generate session for verified phone.')
      }

      if (userId) {
        const now = new Date().toISOString()
        const { error: activityError } = await supabaseAdmin.from('auth_activity').insert({
          user_id: userId, event_type: 'login', metadata: {},
        })
        if (activityError) console.error('[auth/otp] Failed to log login:', activityError.message)
        const { error: loginUpdateError } = await supabaseAdmin.from('user_profiles').update({ last_login_at: now }).eq('id', userId)
        if (loginUpdateError) console.error('[auth/otp] Failed to update login time:', loginUpdateError.message)
      }

      // Check onboarding status
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('id', authData.user.id)
        .maybeSingle()

      return NextResponse.json({
        ok: true,
        session: authData.session,
        user: authData.user,
        onboardingComplete: profile?.onboarding_complete ?? false,
      })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err) {
    console.error('[auth/otp] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Authentication service encountered an error.' },
      { status: 500 }
    )
  }
}
