import { NextResponse } from 'next/server'
import { userName } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { boardOrders, reviewOrder } from '@/lib/server/marketplace'
import { getAllUsers } from '@/lib/server/pin-auth'

/** The coordinator's desk: accounts, recent sign-ins, and bulk orders waiting for purpose review. */
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')
    const db = await getDb()
    const profiles = (await getAllUsers())
      .map((u) => ({ id: u.id, full_name: u.fullName, role: u.role, mobile_number: u.phone, verification_status: u.verificationStatus, last_login_at: u.lastLoginAt ?? null, last_logout_at: null }))
      .sort((a, b) => String(b.last_login_at ?? '').localeCompare(String(a.last_login_at ?? '')))
    const activities = profiles
      .filter((p) => p.last_login_at)
      .slice(0, 20)
      .map((p) => ({ id: `login-${p.id}`, user_id: p.id, event_type: `${p.role}_login`, created_at: p.last_login_at as string }))
    const pending_reviews = (await boardOrders(db))
      .filter((o) => o.review_status === 'pending')
      .map((o) => ({ id: o.id, code: o.code, crop: o.crop, quantity_kg: o.qty_target_kg, purpose: o.purpose, buyer_name: o.buyer_name, created_at: o.created_at }))
    return NextResponse.json({ profiles, activities, pending_reviews })
  } catch (error) {
    return errorResponse(error, 'Failed to load administrator data.')
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole(request, 'admin')
    const body = await readJson(request)
    const orderId = optionalString(body.request_id)
    const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null
    if (!orderId || !decision) throw new DomainError('A request and decision are required.', 400)
    const db = await getDb()
    const order = await reviewOrder(db, orderId, { decision, note: optionalString(body.note), reviewer: userName(admin) || 'FPO coordinator' })
    return NextResponse.json({ request: { id: order.id, review_status: order.reviewStatus, admin_note: order.adminNote } })
  } catch (error) {
    return errorResponse(error, 'Unable to review this request.')
  }
}
