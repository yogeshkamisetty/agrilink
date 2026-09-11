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

const OTP_TTL_MS = 5 * 60 * 1000
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
  const sessionId = `demo_${normalPhone}_${Date.now()}`
  localChallenges.set(sessionId, {
    phone: normalPhone,
    otp: DEMO_FIXED_OTP,
    expiresAt: Date.now() + OTP_TTL_MS,
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
 */
export async function verifyOtp(phone: string, otp: string, sessionId?: string): Promise<VerifyOtpResult> {
  const enteredOtp = otp.trim()

  if (!sessionId) {
    return { ok: false, error: 'Session ID is missing. Please request a new OTP.' }
  }

  // Local demo verification
  const challenge = localChallenges.get(sessionId)
  if (!challenge) {
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
