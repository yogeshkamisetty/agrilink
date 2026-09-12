import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { getDb } from './db'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface UserAccount {
  id: string
  phone: string
  fullName: string
  role: 'farmer' | 'buyer' | 'admin'
  salt: string
  pinHash: string
  verificationStatus: 'verified' | 'pending'
  onboardingComplete: boolean
  metadata?: Record<string, unknown>
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

// In-memory cache for ultra-fast lookups
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
      metadata: { village: 'Boriavi', state: 'Gujarat' },
    },
    {
      id: 'demo-buyer-meera',
      phone: '9825277103',
      fullName: 'Meera Patel',
      role: 'buyer' as const,
      verificationStatus: 'verified' as const,
      onboardingComplete: true,
      metadata: { company: 'PM POSHAN Central Kitchen', city: 'Anand' },
    },
    {
      id: 'demo-admin-anita',
      phone: '9825000000',
      fullName: 'Anita Sharma',
      role: 'admin' as const,
      verificationStatus: 'verified' as const,
      onboardingComplete: true,
      metadata: { role: 'Lead FPO Federation Coordinator' },
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

// Rate limiting map for failed login attempts (brute force protection)
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
 * Ensure database table exists before querying
 */
async function ensureTable() {
  try {
    const db = await getDb()
    await db.exec(`
      create table if not exists agrilink.user_accounts (
        id uuid primary key default gen_random_uuid(),
        phone text not null unique,
        full_name text not null,
        role text not null check (role in ('farmer', 'buyer', 'admin')),
        pin_hash text not null,
        salt text not null,
        verification_status text not null default 'verified',
        onboarding_complete boolean not null default true,
        metadata jsonb not null default '{}'::jsonb,
        last_login_at timestamptz,
        created_at timestamptz not null default now()
      );
      create index if not exists user_accounts_phone on agrilink.user_accounts (phone);
    `)
  } catch (e) {
    console.warn('[pin-auth] ensureTable notice:', e)
  }
}

/**
 * Retrieve user by phone number from persistent PostgreSQL database
 */
export async function findUserByPhone(phone: string): Promise<UserAccount | null> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  seedDemoUsers()

  // 1. Check in-memory fast cache
  const cached = inMemoryUsers.get(normalPhone)
  if (cached) return cached

  // 2. Query persistent SQL database (agrilink.user_accounts)
  try {
    await ensureTable()
    const db = await getDb()
    const rows = await db.query<{
      id: string
      phone: string
      full_name: string
      role: 'farmer' | 'buyer' | 'admin'
      pin_hash: string
      salt: string
      verification_status: string
      onboarding_complete: boolean
      metadata: Record<string, unknown>
      created_at: string
      last_login_at?: string
    }>(`select * from agrilink.user_accounts where phone = $1 limit 1`, [normalPhone])

    if (rows.length > 0) {
      const r = rows[0]
      const user: UserAccount = {
        id: r.id,
        phone: r.phone,
        fullName: r.full_name,
        role: r.role,
        pinHash: r.pin_hash,
        salt: r.salt,
        verificationStatus: (r.verification_status as any) || 'verified',
        onboardingComplete: r.onboarding_complete ?? true,
        metadata: r.metadata || {},
        createdAt: r.created_at,
        lastLoginAt: r.last_login_at,
      }
      inMemoryUsers.set(normalPhone, user)
      return user
    }

    // 3. Check if phone matches any pre-seeded or registered farmer in agrilink.farmers
    const farmerRows = await db.query<{ id: string; name: string; phone: string; village: string }>(
      `select id, name, phone, village from agrilink.farmers where replace(phone, ' ', '') like '%' || $1 limit 1`,
      [normalPhone]
    )
    if (farmerRows.length > 0) {
      const f = farmerRows[0]
      const { hash, salt } = hashPin('1234', `salt_${normalPhone}`)
      const meta = { village: f.village, farmerId: f.id }
      await db.query(
        `insert into agrilink.user_accounts (phone, full_name, role, pin_hash, salt, verification_status, onboarding_complete, metadata)
         values ($1, $2, 'farmer', $3, $4, 'verified', true, $5)
         on conflict (phone) do update set full_name = excluded.full_name`,
        [normalPhone, f.name, hash, salt, JSON.stringify(meta)]
      )
      const user: UserAccount = {
        id: f.id,
        phone: normalPhone,
        fullName: f.name,
        role: 'farmer',
        pinHash: hash,
        salt,
        verificationStatus: 'verified',
        onboardingComplete: true,
        metadata: meta,
        createdAt: new Date().toISOString(),
      }
      inMemoryUsers.set(normalPhone, user)
      return user
    }

    // 4. Check if phone matches any pre-seeded or registered buyer in agrilink.buyers
    const buyerRows = await db.query<{ id: string; name: string; contact_name: string; contact_phone: string; city: string }>(
      `select id, name, contact_name, contact_phone, city from agrilink.buyers where replace(contact_phone, ' ', '') like '%' || $1 limit 1`,
      [normalPhone]
    )
    if (buyerRows.length > 0) {
      const b = buyerRows[0]
      const { hash, salt } = hashPin('1234', `salt_${normalPhone}`)
      const meta = { company: b.name, city: b.city, buyerId: b.id }
      await db.query(
        `insert into agrilink.user_accounts (phone, full_name, role, pin_hash, salt, verification_status, onboarding_complete, metadata)
         values ($1, $2, 'buyer', $3, $4, 'verified', true, $5)
         on conflict (phone) do update set full_name = excluded.full_name`,
        [normalPhone, b.contact_name || b.name, hash, salt, JSON.stringify(meta)]
      )
      const user: UserAccount = {
        id: b.id,
        phone: normalPhone,
        fullName: b.contact_name || b.name,
        role: 'buyer',
        pinHash: hash,
        salt,
        verificationStatus: 'verified',
        onboardingComplete: true,
        metadata: meta,
        createdAt: new Date().toISOString(),
      }
      inMemoryUsers.set(normalPhone, user)
      return user
    }
  } catch (dbErr) {
    console.warn('[pin-auth] Database lookup notice:', dbErr)
  }

  // 5. Check Supabase if configured
  if (supabaseAdmin) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, verification_status, onboarding_complete, created_at')
        .eq('mobile_number', normalPhone)
        .maybeSingle()

      if (profile) {
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
 * Register a new farmer, buyer, or coordinator permanently in the database
 */
export async function registerUser(params: {
  phone: string
  fullName: string
  role: 'farmer' | 'buyer' | 'admin'
  pin: string
  metadata?: Record<string, unknown>
}): Promise<UserAccount> {
  const normalPhone = params.phone.replace(/\D/g, '').slice(-10)
  const { hash, salt } = hashPin(params.pin)
  const meta = params.metadata || {}

  let targetId = `usr_${normalPhone}_${Date.now()}`

  // 1. Persist permanently to PostgreSQL / PGlite database
  try {
    await ensureTable()
    const db = await getDb()

    // Insert into agrilink.user_accounts
    const [inserted] = await db.query<{ id: string }>(
      `insert into agrilink.user_accounts (phone, full_name, role, pin_hash, salt, verification_status, onboarding_complete, metadata)
       values ($1, $2, $3, $4, $5, 'verified', true, $6)
       on conflict (phone) do update set
         full_name = excluded.full_name,
         role = excluded.role,
         pin_hash = excluded.pin_hash,
         salt = excluded.salt,
         metadata = excluded.metadata
       returning id`,
      [normalPhone, params.fullName.trim(), params.role, hash, salt, JSON.stringify(meta)]
    )

    if (inserted?.id) {
      targetId = inserted.id
    }

    // If farmer, register into agrilink.farmers directory so they appear in farmer network
    if (params.role === 'farmer') {
      const fpos = await db.query<{ id: string }>(`select id from agrilink.fpos limit 1`)
      const fpoId = fpos[0]?.id
      if (fpoId) {
        await db.query(
          `insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng)
           values ($1, $2, $3, 'en', 1.0, 'Anand Hub', 22.56, 72.93)
           on conflict do nothing`,
          [fpoId, params.fullName.trim(), `+91 ${normalPhone}`]
        ).catch(() => {})
      }
    }

    // If buyer, register into agrilink.buyers directory
    if (params.role === 'buyer') {
      await db.query(
        `insert into agrilink.buyers (name, type, address, city, lat, lng, contact_name, contact_phone)
         values ($1, 'INSTITUTIONAL', 'Central Market Road', 'Anand', 22.56, 72.93, $2, $3)
         on conflict do nothing`,
        [params.fullName.trim(), params.fullName.trim(), `+91 ${normalPhone}`]
      ).catch(() => {})
    }
  } catch (err) {
    console.warn('[pin-auth] Database save notice:', err)
  }

  // 2. Synchronize to Supabase if configured
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
        user_metadata: { mobile: normalPhone, name: params.fullName.trim(), role: params.role },
      })

      const finalId = created?.user?.id || targetId
      targetId = finalId

      await supabaseAdmin.from('user_profiles').upsert({
        id: finalId,
        mobile_number: normalPhone,
        full_name: params.fullName.trim(),
        role: params.role,
        verification_status: 'verified',
        onboarding_complete: true,
      })
    } catch (e) {
      console.warn('[pin-auth] Could not sync user to Supabase:', e)
    }
  }

  const user: UserAccount = {
    id: targetId,
    phone: normalPhone,
    fullName: params.fullName.trim(),
    role: params.role,
    salt,
    pinHash: hash,
    verificationStatus: 'verified',
    onboardingComplete: true,
    metadata: meta,
    createdAt: new Date().toISOString(),
  }

  inMemoryUsers.set(normalPhone, user)
  return user
}

/**
 * Create an HMAC-signed session token (valid for 7 days)
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
