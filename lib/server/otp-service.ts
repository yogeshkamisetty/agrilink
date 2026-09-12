/**
 * AgriLink OTP Service
 *
 * Supports:
 * 1. 2Factor.in SMS Gateway (when TWOFACTOR_API_KEY is configured)
 * 2. Cryptographic Stateless Challenge Mode (Serverless-safe HMAC signature in sessionId)
 * 3. Fallback demo verification for automated testing & development
 */

import { createHmac } from 'crypto'

export interface SendOtpResult {
  ok: boolean
  sessionId: string
  isDemo: boolean
  demoOtp?: string
  message: string
}

export interface VerifyOtpResult {
  ok: boolean
  error?: string
}

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const DEMO_FIXED_OTP = '123456'

function getHmacSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'agrilink-stateless-otp-secret-key-32chars'
  )
}

function signChallenge(phone: string, otp: string, expiresAt: number): string {
  const secret = getHmacSecret()
  const payload = `${phone}:${otp}:${expiresAt}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// In-memory challenge store maintained for legacy/local attempts count
interface LocalChallenge {
  phone: string
  otp: string
  expiresAt: number
  attempts: number
}
const localChallenges = new Map<string, LocalChallenge>()

function cleanExpiredChallenges() {
  const now = Date.now()
  for (const [key, val] of localChallenges.entries()) {
    if (val.expiresAt < now) localChallenges.delete(key)
  }
}

/**
 * Sends an OTP to the given 10-digit Indian mobile number.
 * Uses 2Factor.in API if TWOFACTOR_API_KEY is configured.
 * Otherwise, falls back to stateless challenge mode with demo code.
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  if (!/^[6-9]\d{9}$/.test(normalPhone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.')
  }

  cleanExpiredChallenges()

  const twoFactorKey = (process.env.TWOFACTOR_API_KEY || process.env.TWOFACTOR_API_KEY_2 || '').trim()
  const expiresAt = Date.now() + OTP_TTL_MS

  if (twoFactorKey) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const signature = signChallenge(normalPhone, otp, expiresAt)
    const sessionId = `live_${normalPhone}_${expiresAt}_${signature}`

    try {
      const smsRes = await fetch(
        `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${normalPhone}/${encodeURIComponent(otp)}/AUTOGEN`,
        { method: 'POST', signal: AbortSignal.timeout(10000) }
      )
      if (!smsRes.ok) {
        throw new Error(`SMS gateway error: ${smsRes.status}`)
      }
      return {
        ok: true,
        sessionId,
        isDemo: false,
        message: `A verification code has been dispatched via SMS to +91 ${normalPhone}.`,
      }
    } catch (smsErr) {
      console.error('[sendOtp] Failed to deliver SMS via 2Factor, falling back to demo mode:', smsErr)
    }
  }

  // Stateless challenge mode with demo OTP (or test mode)
  const otp = DEMO_FIXED_OTP
  const signature = signChallenge(normalPhone, otp, expiresAt)
  const sessionId = `demo_${normalPhone}_${expiresAt}_${signature}`

  localChallenges.set(sessionId, {
    phone: normalPhone,
    otp,
    expiresAt,
    attempts: 0,
  })

  return {
    ok: true,
    sessionId,
    isDemo: true,
    demoOtp: DEMO_FIXED_OTP,
    message: 'Demo mode active. Use OTP 123456 to continue.',
  }
}

/**
 * Verifies the OTP entered by the user.
 * Verified statelessly using HMAC signature in sessionId, ensuring immunity to
 * serverless lambda cold starts and cross-instance drops.
 */
export async function verifyOtp(phone: string, otp: string, sessionId?: string): Promise<VerifyOtpResult> {
  const enteredOtp = otp.trim()
  const normalPhone = phone.replace(/\D/g, '').slice(-10)

  if (!sessionId) {
    return { ok: false, error: 'Session ID is missing. Please request a new OTP.' }
  }

  // Check attempt limit in local memory if available
  const local = localChallenges.get(sessionId)
  if (local) {
    if (local.attempts >= 5) {
      localChallenges.delete(sessionId)
      return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
    }
  }

  // Stateless HMAC validation: prefix_phone_expiresAt_signature
  const parts = sessionId.split('_')
  if (parts.length >= 4 && (parts[0] === 'demo' || parts[0] === 'live')) {
    const sessionPhone = parts[1]
    const expiresAt = parseInt(parts[2], 10)
    const signature = parts.slice(3).join('_')

    if (sessionPhone !== normalPhone) {
      return { ok: false, error: 'Phone number does not match this verification session.' }
    }

    if (isNaN(expiresAt) || expiresAt < Date.now()) {
      localChallenges.delete(sessionId)
      return { ok: false, error: 'The verification code has expired. Please request a new one.' }
    }

    const expectedSig = signChallenge(normalPhone, enteredOtp, expiresAt)
    if (signature !== expectedSig) {
      if (local) local.attempts += 1
      return { ok: false, error: 'Incorrect verification code.' }
    }

    // Success!
    localChallenges.delete(sessionId)
    return { ok: true }
  }

  // Backward compatibility with legacy sessionId format (demo_phone_timestamp)
  if (local) {
    if (local.expiresAt < Date.now()) {
      localChallenges.delete(sessionId)
      return { ok: false, error: 'The verification code has expired. Please request a new one.' }
    }
    if (local.otp !== enteredOtp) {
      local.attempts += 1
      return { ok: false, error: 'Incorrect verification code.' }
    }
    localChallenges.delete(sessionId)
    return { ok: true }
  }

  return { ok: false, error: 'The verification code has expired. Please request a new one.' }
}
