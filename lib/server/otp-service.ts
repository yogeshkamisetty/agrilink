/**
 * AgriLink OTP Service
 *
 * Supports:
 * 1. 2Factor.in Free Tier / Trial API (SMS delivery to Indian +91 numbers)
 * 2. In-memory / Demo Challenge Mode (Free fallback when API key is not configured or for test numbers)
 */

interface LocalChallenge {
  phone: string
  otp: string
  expiresAt: number
  attempts: number
}

// In-memory challenge store for demo / fallback mode (5-minute expiry)
const localChallenges = new Map<string, LocalChallenge>()

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const DEMO_PHONE_NUMBERS = new Set(['9876543210', '9999999999', '9812345678', '9123456780'])
const DEMO_FIXED_OTP = '123456'

function cleanExpiredChallenges() {
  const now = Date.now()
  for (const [key, val] of localChallenges.entries()) {
    if (val.expiresAt < now) localChallenges.delete(key)
  }
}

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

/**
 * Sends an OTP to the given 10-digit Indian mobile number.
 * Uses 2Factor.in API if TWOFACTOR_API_KEY is configured.
 * Otherwise, falls back to local demo challenge mode.
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  if (!/^[6-9]\d{9}$/.test(normalPhone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.')
  }

  cleanExpiredChallenges()

  const apiKey = (process.env.TWOFACTOR_API_KEY_2 || process.env.TWOFACTOR_API_KEY || '').trim()
  const isDemoNumber = DEMO_PHONE_NUMBERS.has(normalPhone)
  const allowDemo = process.env.NODE_ENV !== 'production' && !apiKey

  if (apiKey) {
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${normalPhone}/AUTOGEN`
    let data: { Status?: string; Details?: string } = {}
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) })
      data = (await res.json().catch(() => ({}))) as { Status?: string; Details?: string }
    } catch {
      throw new Error('SMS provider is unavailable. Please try again.')
    }
    if (data.Status === 'Success' && data.Details) {
      return { ok: true, sessionId: data.Details, isDemo: false, message: `SMS OTP dispatched to +91 ${normalPhone} via 2Factor.` }
    }
    throw new Error(data.Details || 'SMS provider rejected this phone number.')
  }

  if (!allowDemo) throw new Error('SMS OTP delivery is not configured.')

  const demoOtp = isDemoNumber ? DEMO_FIXED_OTP : String(Math.floor(100000 + Math.random() * 900000))
  const sessionId = `demo_${normalPhone}_${Date.now()}`

  localChallenges.set(sessionId, {
    phone: normalPhone,
    otp: demoOtp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  })

  return {
    ok: true,
    sessionId,
    isDemo: true,
    demoOtp,
    message: apiKey
      ? `SMS delivery fallback active. Use verification code: ${demoOtp}`
      : `[Demo Mode] Verification code: ${demoOtp}`,
  }
}

/**
 * Verifies the OTP entered by the user.
 */
export async function verifyOtp(phone: string, otp: string, sessionId?: string): Promise<VerifyOtpResult> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  const enteredOtp = otp.trim()
  const apiKey = (process.env.TWOFACTOR_API_KEY_2 || process.env.TWOFACTOR_API_KEY || '').trim()

  if (!sessionId) {
    return { ok: false, error: 'Session ID is missing. Please request a new OTP.' }
  }

  // If this is a 2Factor session (not starting with 'demo_')
  if (!sessionId.startsWith('demo_') && apiKey) {
    try {
      const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(enteredOtp)}`
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) })
      const data = (await res.json().catch(() => ({}))) as { Status?: string; Details?: string }

      if (data.Status === 'Success' && data.Details === 'OTP Matched') {
        return { ok: true }
      }

      return { ok: false, error: data.Details || 'Invalid verification code.' }
    } catch (err) {
      console.error('[2Factor.in] Verification error:', err)
      return { ok: false, error: 'Unable to verify code with SMS service. Please try again.' }
    }
  }

  // Local demo verification
  const challenge = localChallenges.get(sessionId)
  if (!challenge) {
    // Check if entered OTP matches fixed demo OTP for known demo numbers
    if (DEMO_PHONE_NUMBERS.has(normalPhone) && enteredOtp === DEMO_FIXED_OTP) {
      return { ok: true }
    }
    return { ok: false, error: 'The verification code has expired. Please request a new one.' }
  }

  if (challenge.expiresAt < Date.now()) {
    localChallenges.delete(sessionId)
    return { ok: false, error: 'The verification code has expired. Please request a new one.' }
  }

  if (challenge.attempts >= 5) {
    localChallenges.delete(sessionId)
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  if (challenge.otp !== enteredOtp) {
    challenge.attempts += 1
    return { ok: false, error: 'Incorrect verification code.' }
  }

  // Successfully matched
  localChallenges.delete(sessionId)
  return { ok: true }
}
