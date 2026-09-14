import { requireRole, type AppUser } from './auth'
import type { Db } from './db'
import { DomainError } from './errors'

/**
 * Accounts (phone + MPIN) and marketplace records (farmers, buyers) are kept
 * separately; they are linked by the mobile number, compared on its last ten
 * digits so '+91 98251 44102' and '9825144102' are the same person.
 */
export function userPhone(user: AppUser): string {
  return String(user.phone || user.user_metadata?.mobile || '').replace(/\D/g, '').slice(-10)
}

export function userName(user: AppUser): string {
  return String(user.user_metadata?.name ?? '').trim()
}

const lastTen = (column: string) => `right(regexp_replace(${column}, '[^0-9]', '', 'g'), 10)`

export async function farmerIdForUser(db: Db, user: AppUser): Promise<string | null> {
  const phone = userPhone(user)
  if (!phone) return null
  const [row] = await db.query<{ id: string }>(`select id from agrilink.farmers where ${lastTen('phone')} = $1 order by created_at limit 1`, [phone])
  return row?.id ?? null
}

export async function buyerIdForUser(db: Db, user: AppUser): Promise<string | null> {
  const phone = userPhone(user)
  if (!phone) return null
  const [row] = await db.query<{ id: string }>(`select id from agrilink.buyers where ${lastTen('contact_phone')} = $1 order by created_at limit 1`, [phone])
  return row?.id ?? null
}

export async function requireFarmerId(db: Db, user: AppUser): Promise<string> {
  const id = await farmerIdForUser(db, user)
  if (!id) throw new DomainError('Your account is not linked to a registered farmer yet — declare a harvest first.', 403)
  return id
}

export async function requireBuyerId(db: Db, user: AppUser): Promise<string> {
  const id = await buyerIdForUser(db, user)
  if (!id) throw new DomainError('Your account is not linked to a buyer profile yet — complete buyer onboarding first.', 403)
  return id
}

/** A farmer acts for themselves; an FPO coordinator records a reply taken by phone and must name the farmer. */
export async function actingFarmer(request: Request, db: Db, requestedFarmerId: unknown) {
  const user = await requireRole(request, ['farmer', 'admin'])
  if (user.role === 'farmer') return { user, farmerId: await requireFarmerId(db, user), onBehalf: false }
  if (typeof requestedFarmerId !== 'string' || !requestedFarmerId) throw new DomainError('Say which farmer this is for.', 400)
  return { user, farmerId: requestedFarmerId, onBehalf: true }
}
