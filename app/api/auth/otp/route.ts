import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOtp, verifyOtp } from '@/lib/server/otp-service'
import { requireSupabaseAdmin, supabaseAdmin } from '@/lib/supabase-admin'
import {
  checkBruteForce,
  createSessionToken,
  findUserByPhone,
  recordFailedAttempt,
  recordUserLogin,
  registerUser,
  resetFailedAttempts,
  verifyPin,
} from '@/lib/server/pin-auth'

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
    const body = (await request.json()) as {
      action?: 'login' | 'signup' | 'quick_demo' | 'lookup' | 'send' | 'verify'
      phone?: string
      pin?: string
      fullName?: string
      role?: 'farmer' | 'buyer' | 'admin'
      adminPasscode?: string
      otp?: string
      sessionId?: string
    }

    const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(-10) : ''
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip'

    // -----------------------------------------------------------------
    // 1. QUICK 1-CLICK DEMO ACCESS (Farmer, Buyer, Admin)
    // -----------------------------------------------------------------
    if (body.action === 'quick_demo') {
      const role = body.role || 'farmer'
      const demoPhones = {
        farmer: '9825144102',
        buyer: '9825277103',
        admin: '9825000000',
      }
      const targetPhone = demoPhones[role] || demoPhones.farmer
      const user = await findUserByPhone(targetPhone)

      if (!user) {
        return NextResponse.json({ error: 'Demo account not available.' }, { status: 404 })
      }

      await recordUserLogin(targetPhone)

      const sessionToken = createSessionToken(user)
      const redirectUrl = user.role === 'admin' ? '/admin' : '/'

      return NextResponse.json({
        ok: true,
        session: {
          access_token: sessionToken.token,
          refresh_token: sessionToken.token,
          user: {
            id: user.id,
            phone: `+91${user.phone}`,
            user_metadata: { mobile: user.phone, name: user.fullName, role: user.role },
          },
        },
        profile: {
          id: user.id,
          full_name: user.fullName,
          role: user.role,
          mobile_number: user.phone,
          verification_status: user.verificationStatus,
          onboarding_complete: user.onboardingComplete,
        },
        redirectUrl,
        onboardingComplete: user.onboardingComplete,
      })
    }

    // -----------------------------------------------------------------
    // 2. REAL-TIME USER PHONE RECOGNITION (LOOKUP)
    // -----------------------------------------------------------------
    if (body.action === 'lookup') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      const user = await findUserByPhone(phone)
      if (user) {
        return NextResponse.json({
          ok: true,
          exists: true,
          user: {
            fullName: user.fullName,
            role: user.role,
            verificationStatus: user.verificationStatus,
            onboardingComplete: user.onboardingComplete,
          },
        })
      }

      return NextResponse.json({ ok: true, exists: false })
    }

    // -----------------------------------------------------------------
    // 3. ZERO-API PHONE + 4-DIGIT MPIN LOGIN
    // -----------------------------------------------------------------
    if (body.action === 'login') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      if (!body.pin || body.pin.trim().length < 4) {
        return NextResponse.json({ error: 'Please enter your 4-digit MPIN.' }, { status: 400 })
      }

      const bruteCheck = checkBruteForce(phone)
      if (!bruteCheck.allowed) {
        return NextResponse.json(
          { error: `Too many failed attempts. Please wait ${bruteCheck.waitSeconds} seconds before trying again.` },
          { status: 429 }
        )
      }

      let user = await findUserByPhone(phone)
      if (!user) {
        // Seamlessly register new farmer/buyer if not already in registry
        user = await registerUser({
          phone,
          fullName: body.fullName || `Farmer (${phone.slice(-4)})`,
          role: body.role || 'farmer',
          pin: body.pin.trim(),
        })
      } else {
        const valid = verifyPin(body.pin.trim(), user.pinHash, user.salt)
        if (!valid) {
          recordFailedAttempt(phone)
          return NextResponse.json(
            { error: 'Incorrect 4-digit MPIN. Please verify and try again.' },
            { status: 401 }
          )
        }
      }

      resetFailedAttempts(phone)
      await recordUserLogin(phone)

      const sessionToken = createSessionToken(user)
      const redirectUrl = user.role === 'admin' ? '/admin' : '/'

      return NextResponse.json({
        ok: true,
        session: {
          access_token: sessionToken.token,
          refresh_token: sessionToken.token,
          user: {
            id: user.id,
            phone: `+91${user.phone}`,
            user_metadata: { mobile: user.phone, name: user.fullName, role: user.role },
          },
        },
        profile: {
          id: user.id,
          full_name: user.fullName,
          role: user.role,
          mobile_number: user.phone,
          verification_status: user.verificationStatus,
          onboarding_complete: user.onboardingComplete,
        },
        redirectUrl,
        onboardingComplete: user.onboardingComplete,
      })
    }

    // -----------------------------------------------------------------
    // 4. ZERO-API NEW USER REGISTRATION (SIGNUP)
    // -----------------------------------------------------------------
    if (body.action === 'signup') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      const fullName = (body.fullName || '').trim()
      if (!fullName || fullName.length < 2) {
        return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
      }

      const role = body.role || 'farmer'
      if (role === 'admin') {
        const passcode = (body.adminPasscode || '').trim()
        if (passcode !== 'AGRILINK-FPO-2025') {
          return NextResponse.json({ error: 'Invalid FPO Coordinator authorization passcode.' }, { status: 403 })
        }
      }

      const pin = (body.pin || '').trim()
      if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: 'Please set a 4 to 6 digit security MPIN.' }, { status: 400 })
      }

      const existing = await findUserByPhone(phone)
      if (existing) {
        return NextResponse.json(
          { error: 'An account is already registered with this mobile number. Please log in.' },
          { status: 409 }
        )
      }

      const newUser = await registerUser({
        phone,
        fullName,
        role,
        pin,
      })

      const sessionToken = createSessionToken(newUser)
      const redirectUrl = newUser.role === 'admin' ? '/admin' : '/'

      return NextResponse.json({
        ok: true,
        session: {
          access_token: sessionToken.token,
          refresh_token: sessionToken.token,
          user: {
            id: newUser.id,
            phone: `+91${newUser.phone}`,
            user_metadata: { mobile: newUser.phone, name: newUser.fullName, role: newUser.role },
          },
        },
        profile: {
          id: newUser.id,
          full_name: newUser.fullName,
          role: newUser.role,
          mobile_number: newUser.phone,
          verification_status: newUser.verificationStatus,
          onboarding_complete: newUser.onboardingComplete,
        },
        redirectUrl,
        onboardingComplete: newUser.onboardingComplete,
      })
    }

    // -----------------------------------------------------------------
    // 5. LEGACY FALLBACK: SEND OTP (for backward compatibility with tests)
    // -----------------------------------------------------------------
    if (body.action === 'send') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      const ipLimit = checkRateLimit(`send_ip_${clientIp}`, 10, 60 * 1000)
      if (!ipLimit.allowed) {
        return NextResponse.json(
          { error: `Too many requests from this connection. Please wait ${ipLimit.retryAfter} seconds.` },
          { status: 429 }
        )
      }

      const result = await sendOtp(phone)
      const existing = await findUserByPhone(phone)

      return NextResponse.json({
        ...result,
        existingUser: existing ? { fullName: existing.fullName, role: existing.role } : null,
      })
    }

    // -----------------------------------------------------------------
    // 6. LEGACY FALLBACK: VERIFY OTP
    // -----------------------------------------------------------------
    if (body.action === 'verify') {
      if (!phone || !body.otp) {
        return NextResponse.json({ error: 'Phone number and verification code are required.' }, { status: 400 })
      }

      const verificationResult = await verifyOtp(phone, body.otp, body.sessionId)
      if (!verificationResult.ok) {
        return NextResponse.json({ error: verificationResult.error || 'Invalid verification code.' }, { status: 400 })
      }

      let user = await findUserByPhone(phone)
      if (!user) {
        user = await registerUser({
          phone,
          fullName: phone === '9825277103' ? 'Meera Patel' : phone === '9825000000' ? 'Anita Sharma' : 'Ramesh Kumar',
          role: body.role || 'farmer',
          pin: '1234',
        })
      }

      const sessionToken = createSessionToken(user)
      const redirectUrl = user.role === 'admin' ? '/admin' : '/'

      return NextResponse.json({
        ok: true,
        session: {
          access_token: sessionToken.token,
          refresh_token: sessionToken.token,
          user: {
            id: user.id,
            phone: `+91${user.phone}`,
            user_metadata: { mobile: user.phone, name: user.fullName, role: user.role },
          },
        },
        profile: {
          id: user.id,
          full_name: user.fullName,
          role: user.role,
          mobile_number: user.phone,
          verification_status: user.verificationStatus,
          onboarding_complete: user.onboardingComplete,
        },
        redirectUrl,
        onboardingComplete: user.onboardingComplete,
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
