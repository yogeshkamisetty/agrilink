import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { getVillageLatLng } from '@/lib/domain/allocation'
import { getDb } from './db'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface UserAccount {
  id: string
  phone: string
  fullName: string
  role: 'farmer' | 'buyer' | 'admin'
  salt: string
  pinHash: string
  verificationStatus: 'verified' | 'pending' | 'under_review' | 'pending_review' | 'needs_correction' | 'rejected'
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

const LOCAL_DEV_SECRET = 'agrilink-local-development-only-session-secret'

function getSecret(): string {
  const configured = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (configured) return configured
  // A default checked into a public repository lets anyone mint an admin token.
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set in production to sign session tokens.')
  return LOCAL_DEV_SECRET
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

const lastTenDigits = `right(regexp_replace(%col%, '[^0-9]', '', 'g'), 10)`

/**
 * Link an account to its marketplace record — a member farmer or a buyer — creating it once per
 * mobile number. Farmers get no harvest here: supply comes only from harvest declarations.
 * Locations default to the FPO's own collection centre until a village or address is known.
 */
async function ensureMarketplaceRecord(phone: string, name: string, role: 'farmer' | 'buyer', meta: Record<string, unknown>) {
  try {
    const db = await getDb()
    const [fpo] = await db.query<{ id: string; lat: number; lng: number; village: string; district: string }>(`select id, lat, lng, village, district from agrilink.fpos order by created_at limit 1`)
    if (!fpo || !name) return
    const village = typeof meta.village === 'string' && meta.village.trim() ? meta.village.trim() : null
    if (role === 'farmer') {
      const [existing] = await db.query(`select 1 from agrilink.farmers where ${lastTenDigits.replace('%col%', 'phone')} = $1 limit 1`, [phone])
      if (existing) return
      const location = village ? getVillageLatLng(village) : { lat: fpo.lat, lng: fpo.lng }
      await db.query(`insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng) values ($1, $2, $3, 'hi', 1.0, $4, $5, $6)`, [
        fpo.id,
        name,
        `+91 ${phone}`,
        village ?? fpo.village,
        location.lat,
        location.lng,
      ])
      return
    }
    const [existing] = await db.query(`select 1 from agrilink.buyers where ${lastTenDigits.replace('%col%', 'contact_phone')} = $1 limit 1`, [phone])
    if (existing) return
    const buyerType = ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY', 'CONSUMER'].includes(String(meta.organizationType ?? '').toUpperCase()) ? String(meta.organizationType).toUpperCase() : 'INSTITUTIONAL'
    const city = typeof meta.city === 'string' && meta.city.trim() ? meta.city.trim() : fpo.district
    await db.query(`insert into agrilink.buyers (name, type, address, city, lat, lng, contact_name, contact_phone) values ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      name,
      buyerType,
      'Address to be confirmed',
      city,
      fpo.lat,
      fpo.lng,
      name,
      `+91 ${phone}`,
    ])
  } catch (error) {
    console.warn('[pin-auth] Marketplace record not created:', error)
  }
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

    if (params.role === 'farmer' || params.role === 'buyer') {
      await ensureMarketplaceRecord(normalPhone, params.fullName.trim(), params.role, meta)
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
export function createSessionToken(user: Pick<UserAccount, 'id' | 'phone' | 'fullName' | 'role'> & Partial<UserAccount>): { token: string; exp: number } {
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

/**
 * Record a user's login timestamp across in-memory cache and persistent database
 */
export async function recordUserLogin(phone: string): Promise<void> {
  const normalPhone = phone.replace(/\D/g, '').slice(-10)
  const now = new Date().toISOString()
  seedDemoUsers()
  const cached = inMemoryUsers.get(normalPhone)
  if (cached) {
    cached.lastLoginAt = now
  }
  try {
    const db = await getDb()
    await db.query(`update agrilink.user_accounts set last_login_at = $1 where phone = $2`, [now, normalPhone])
  } catch {}
}

/**
 * Retrieve all registered users across in-memory cache, PostgreSQL/PGlite database, and Supabase
 */
export async function getAllUsers(): Promise<UserAccount[]> {
  seedDemoUsers()
  const usersMap = new Map<string, UserAccount>()

  // 1. In-memory fast cache
  for (const [phone, user] of inMemoryUsers.entries()) {
    usersMap.set(phone, { ...user })
  }

  // 2. Persistent SQL database
  try {
    await ensureTable()
    const db = await getDb()
    const rows = await db.query<any>(`select * from agrilink.user_accounts order by created_at desc`)
    if (Array.isArray(rows)) {
      for (const r of rows) {
        const phone = String(r.phone || '').replace(/\D/g, '').slice(-10)
        if (!phone) continue
        if (!usersMap.has(phone)) {
          const rawStatus = r.verification_status
          const status: 'verified' | 'pending' = rawStatus === 'pending' ? 'pending' : 'verified'
          usersMap.set(phone, {
            id: r.id,
            phone,
            fullName: r.full_name || 'AgriLink User',
            role: (r.role === 'admin' || r.role === 'buyer' ? r.role : 'farmer') as 'farmer' | 'buyer' | 'admin',
            salt: r.salt || '',
            pinHash: r.pin_hash || '',
            verificationStatus: status,
            onboardingComplete: r.onboarding_complete ?? true,
            metadata: r.metadata || {},
            createdAt: r.created_at || new Date().toISOString(),
            lastLoginAt: r.last_login_at || undefined,
          })
        } else {
          const u = usersMap.get(phone)!
          if (r.last_login_at && (!u.lastLoginAt || new Date(r.last_login_at) > new Date(u.lastLoginAt))) {
            u.lastLoginAt = r.last_login_at
          }
        }
      }
    }
  } catch {}

  // 3. Supabase user profiles if configured
  if (supabaseAdmin) {
    try {
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('*')
      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          const phone = String(p.mobile_number || '').replace(/\D/g, '').slice(-10)
          if (!phone) continue
          if (!usersMap.has(phone)) {
            const rawStatus = p.verification_status
            const status: 'verified' | 'pending' = rawStatus === 'pending' ? 'pending' : 'verified'
            usersMap.set(phone, {
              id: p.id,
              phone,
              fullName: p.full_name || 'AgriLink User',
              role: (p.role === 'admin' || p.role === 'buyer' ? p.role : 'farmer') as 'farmer' | 'buyer' | 'admin',
              salt: '',
              pinHash: '',
              verificationStatus: status,
              onboardingComplete: p.onboarding_complete ?? true,
              metadata: { village: p.village, district: p.district },
              createdAt: p.created_at || new Date().toISOString(),
              lastLoginAt: p.last_login_at || undefined,
            })
          }
        }
      }
    } catch {}
  }

  return Array.from(usersMap.values())
}

/**
 * Update a user's profile details during onboarding or profile editing
 */
export async function updateUserProfile(params: {
  phone: string
  fullName?: string
  role?: 'farmer' | 'buyer' | 'admin'
  village?: string | null
  district?: string | null
  state?: string | null
  fpoName?: string | null
  organizationName?: string | null
  organizationType?: string | null
  onboardingComplete?: boolean
  metadata?: Record<string, unknown>
}): Promise<UserAccount | null> {
  const normalPhone = params.phone.replace(/\D/g, '').slice(-10)
  if (!normalPhone) return null

  // 1. In-memory update
  let user = inMemoryUsers.get(normalPhone)
  if (user) {
    if (params.fullName) user.fullName = params.fullName
    if (params.role) user.role = params.role
    if (params.onboardingComplete !== undefined) user.onboardingComplete = params.onboardingComplete
    user.metadata = {
      ...user.metadata,
      village: params.village ?? user.metadata?.village,
      district: params.district ?? user.metadata?.district,
      state: params.state ?? user.metadata?.state,
      fpoName: params.fpoName ?? user.metadata?.fpoName,
      organizationName: params.organizationName ?? user.metadata?.organizationName,
      organizationType: params.organizationType ?? user.metadata?.organizationType,
      ...(params.metadata || {}),
    }
  }

  // 2. Database update
  try {
    await ensureTable()
    const db = await getDb()
    const meta = {
      village: params.village,
      district: params.district,
      state: params.state,
      fpoName: params.fpoName,
      organizationName: params.organizationName,
      organizationType: params.organizationType,
      ...(params.metadata || {}),
    }

    await db.query(
      `update agrilink.user_accounts
       set full_name = coalesce($1, full_name),
           role = coalesce($2, role),
           onboarding_complete = true,
           metadata = metadata || $3::jsonb
       where phone = $4`,
      [params.fullName || null, params.role || null, JSON.stringify(meta), normalPhone]
    )

    if (params.role === 'farmer' || params.role === 'buyer') {
      await ensureMarketplaceRecord(normalPhone, params.organizationName || params.fullName || user?.fullName || '', params.role, {
        village: params.village,
        city: params.district,
        organizationType: params.organizationType,
      })
    }
  } catch (dbErr) {
    console.warn('[pin-auth] updateUserProfile db error:', dbErr)
  }

  // 3. Supabase update if configured
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('user_profiles').upsert({
        mobile_number: normalPhone,
        full_name: params.fullName,
        role: params.role,
        village: params.village,
        district: params.district,
        state: params.state,
        fpo_name: params.fpoName,
        organization_name: params.organizationName,
        organization_type: params.organizationType,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
    } catch (sbErr) {
      console.warn('[pin-auth] updateUserProfile supabase error:', sbErr)
    }
  }

  return inMemoryUsers.get(normalPhone) || null
}

