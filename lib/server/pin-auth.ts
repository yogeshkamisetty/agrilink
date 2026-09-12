import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { requireSupabaseAdmin, supabaseAdmin } from '@/lib/supabase-admin'

export interface UserAccount {
  id: string
  phone: string
  fullName: string
  role: 'farmer' | 'buyer' | 'admin'
  salt: string
  pinHash: string
  verificationStatus: 'verified' | 'pending'
  onboardingComplete: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface SessionPayload {
  sub: string
  phone: string
  role: 'farmer' | 'buyer' | 'admin'
  name: string
  exp: number
  iat: number
}

const ITERATIONS = 10000
const KEY_LEN = 32
const DIGEST = 'sha256'

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'agrilink-zero-api-secure-session-secret-2026'
  )
}

/**
 * Hash a 4-6 digit MPIN using PBKDF2 with a salt
 */
export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(pin, chosenSalt, ITERATIONS, KEY_LEN, DIGEST).toString('hex')
  return { hash, salt: chosenSalt }
}

/**
 * Constant-time PIN verification
 */
export function verifyPin(pin: string, storedHash: string, salt: string): boolean {
  const computed = pbkdf2Sync(pin, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'))
  } catch {
    return false
  }
}

// In-memory registry to guarantee instant zero-setup operation
const inMemoryUsers = new Map<string, UserAccount>()

// Seed pre-defined demo accounts
function seedDemoUsers() {
  const defaultPin = '1234'
  const demos = [
    {
      id: 'demo-farmer-ramesh',
      phone: '9825144102',
      fullName: 'Ramesh Kumar',
      role: 'farmer' as const,
      verificationStatus: 'verified' as const,
      onboardingComplete: true,
    },
    {
      id: 'demo-buyer-meera',
      phone: '9825277103',
      fullName: 'Meera Patel',
      role: 'buyer' as const,
      verificationStatus: 'verified' as const,
      onboardingComplete: true,
    },
    {
      id: 'demo-admin-anita',
      phone: '9825000000',
      fullName: 'Anita Sharma',
      role: 'admin' as const,
      verificationStatus: 'verified' as const,
      onboardingComplete: true,
    },
  ]

  for (const demo of demos) {
    if (!inMemoryUsers.has(demo.phone)) {
      const { hash, salt } = hashPin(defaultPin, `salt_${demo.phone}`)
      inMemoryUsers.set(demo.phone, {
        ...demo,
        salt,
        pinHash: hash,
        createdAt: new Date().toISOString(),
      })
    }
  }
}

seedDemoUsers()

// Rate limiting map for failed login attempts
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function checkBruteForce(phone: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now()
  const rec = failedAttempts.get(phone)
  if (!rec) return { allowed: true }

  if (rec.lockedUntil > now) {
    const waitSeconds = Math.ceil((rec.lockedUntil - now) / 1000)
    return { allowed: false, waitSeconds }
  }

  if (rec.lockedUntil <= now && rec.lockedUntil > 0) {
    failedAttempts.delete(phone)
  }

  return { allowed: true }
}

export function recordFailedAttempt(phone: string) {
  const now = Date.now()
  const rec = failedAttempts.get(phone) || { count: 0, lockedUntil: 0 }
  rec.count += 1
  if (rec.count >= 5) {
    // 60-second lockout after 5 consecutive failures
    rec.lockedUntil = now + 60 * 1000
    rec.count = 0
  }
  failedAttempts.set(phone, rec)
}

export function resetFailedAttempts(phone: string) {
  failedAttempts.delete(phone)
}

/**
 * Retrieve user by phone number
 */
export async function findUserByPhone(phone: string): Promise<UserAccount | null> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  seedDemoUsers()

  const cached = inMemoryUsers.get(normalPhone)
  if (cached) return cached

  // Check Supabase if configured
  if (supabaseAdmin) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, verification_status, onboarding_complete, created_at')
        .eq('mobile_number', normalPhone)
        .maybeSingle()

      if (profile) {
        // Build user with fallback demo PIN if not in local cache
        const { hash, salt } = hashPin('1234', `salt_${normalPhone}`)
        const user: UserAccount = {
          id: profile.id,
          phone: normalPhone,
          fullName: profile.full_name || 'AgriLink User',
          role: (profile.role as any) || 'farmer',
          salt,
          pinHash: hash,
          verificationStatus: (profile.verification_status as any) || 'verified',
          onboardingComplete: profile.onboarding_complete ?? true,
          createdAt: profile.created_at || new Date().toISOString(),
        }
        inMemoryUsers.set(normalPhone, user)
        return user
      }
    } catch {}
  }

  return null
}

/**
 * Register a new user
 */
export async function registerUser(params: {
  phone: string
  fullName: string
  role: 'farmer' | 'buyer' | 'admin'
  pin: string
}): Promise<UserAccount> {
  const normalPhone = params.phone.replace(/\D/g, '').slice(-10)
  const { hash, salt } = hashPin(params.pin)

  const userId = `usr_${normalPhone}_${Date.now()}`
  const user: UserAccount = {
    id: userId,
    phone: normalPhone,
    fullName: params.fullName.trim(),
    role: params.role,
    salt,
    pinHash: hash,
    verificationStatus: 'verified',
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  }

  inMemoryUsers.set(normalPhone, user)

  // Try to sync with Supabase if configured
  if (supabaseAdmin) {
    try {
      const email = `phone_${normalPhone}@agrilink.internal`
      const secret = getSecret()
      const pwd = createHmac('sha256', secret).update(`pwd_${normalPhone}`).digest('hex')

      const { data: created } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pwd,
        email_confirm: true,
        phone: `+91${normalPhone}`,
        phone_confirm: true,
        user_metadata: { mobile: normalPhone, name: user.fullName, role: user.role },
      })

      const targetId = created?.user?.id || user.id
      user.id = targetId

      await supabaseAdmin.from('user_profiles').upsert({
        id: targetId,
        mobile_number: normalPhone,
        full_name: user.fullName,
        role: user.role,
        verification_status: 'verified',
        onboarding_complete: true,
      })
    } catch (e) {
      console.warn('[pin-auth] Could not sync user to Supabase:', e)
    }
  }

  return user
}

/**
 * Create an HMAC-signed session token
 */
export function createSessionToken(user: UserAccount): { token: string; exp: number } {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 7 * 24 * 60 * 60 // 7 days expiration

  const payload: SessionPayload = {
    sub: user.id,
    phone: user.phone,
    role: user.role,
    name: user.fullName,
    exp,
    iat: now,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')

  const token = `agl_${payloadB64}.${signature}`
  return { token, exp }
}

/**
 * Verify an HMAC-signed session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token.startsWith('agl_')) return null

  const raw = token.slice(4)
  const dotIdx = raw.lastIndexOf('.')
  if (dotIdx === -1) return null

  const payloadB64 = raw.slice(0, dotIdx)
  const signature = raw.slice(dotIdx + 1)

  const expectedSig = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null
    }
  } catch {
    return null
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}
