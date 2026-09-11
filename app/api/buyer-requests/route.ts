import { NextResponse } from 'next/server'
import { requireRole, requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'
const LARGE_ORDER_KG = 50
export async function POST(request: Request) {
  try {
    const buyer = await requireRole(request, 'buyer'), body = await request.json() as { crop?: string; quantity_kg?: number; purpose?: string }, quantity = Number(body.quantity_kg)
    if (!body.crop?.trim() || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Crop and a positive quantity are required.' }, { status: 400 })
    const reviewRequired = quantity > LARGE_ORDER_KG
    if (reviewRequired && (!body.purpose || body.purpose.trim().length < 12)) return NextResponse.json({ error: 'Orders above 50 kg require a clear purchase purpose for admin review.' }, { status: 400 })
    const { data, error } = await requireSupabaseAdmin().from('buyer_purchase_requests').insert({ buyer_id: buyer.id, crop: body.crop.trim(), quantity_kg: quantity, purpose: body.purpose?.trim() || null, review_required: reviewRequired, review_status: reviewRequired ? 'pending' : 'not_required' }).select().single()
    if (error) throw error
    return NextResponse.json({ request: data, threshold_kg: LARGE_ORDER_KG })
  } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'AUTH_REQUIRED' ? 'Please sign in.' : error instanceof Error && error.message === 'FORBIDDEN' ? 'Buyer access is required.' : 'Unable to submit the request.' }, { status: 403 }) }
}
export async function GET(request: Request) {
  try { const user = await requireUser(request); const { data, error } = await requireSupabaseAdmin().from('buyer_purchase_requests').select().eq('buyer_id', user.id).order('created_at', { ascending: false }); if (error) throw error; return NextResponse.json({ requests: data, threshold_kg: LARGE_ORDER_KG }) } catch { return NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
}
