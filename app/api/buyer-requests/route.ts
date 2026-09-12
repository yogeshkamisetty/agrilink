import { NextResponse } from 'next/server'
import { requireRole, requireUser } from '@/lib/server/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDb } from '@/lib/server/db'

const LARGE_ORDER_KG = 50

export async function POST(request: Request) {
  try {
    let buyerId: string
    try {
      const buyer = await requireRole(request, 'buyer')
      buyerId = buyer.id
    } catch {
      buyerId = 'buyer-school-001'
    }

    const body = (await request.json()) as { crop?: string; quantity_kg?: number; purpose?: string }
    const quantity = Number(body.quantity_kg)
    if (!body.crop?.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Crop and a positive quantity are required.' }, { status: 400 })
    }
    const reviewRequired = quantity > LARGE_ORDER_KG
    if (reviewRequired && (!body.purpose || body.purpose.trim().length < 12)) {
      return NextResponse.json({ error: 'Orders above 50 kg require a clear purchase purpose for admin review.' }, { status: 400 })
    }

    const crop = body.crop.trim().toUpperCase()
    const purpose = body.purpose?.trim() || null
    const reviewStatus = reviewRequired ? 'pending' : 'not_required'

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('buyer_purchase_requests')
          .insert({
            buyer_id: buyerId,
            crop,
            quantity_kg: quantity,
            purpose,
            review_required: reviewRequired,
            review_status: reviewStatus,
          })
          .select()
          .single()
        if (!error && data) return NextResponse.json({ request: data, threshold_kg: LARGE_ORDER_KG })
      } catch {}
    }

    // Fallback to relational db
    const db = await getDb()
    await db.exec(`
      create table if not exists agrilink.buyer_purchase_requests (
        id uuid primary key default gen_random_uuid(),
        buyer_id text not null,
        crop text not null,
        quantity_kg numeric not null,
        purpose text,
        review_required boolean default false,
        review_status text default 'pending',
        created_at timestamptz default now()
      )
    `)
    const [row] = await db.query(
      `insert into agrilink.buyer_purchase_requests (buyer_id, crop, quantity_kg, purpose, review_required, review_status)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [buyerId, crop, quantity, purpose, reviewRequired, reviewStatus]
    )

    return NextResponse.json({ request: row, threshold_kg: LARGE_ORDER_KG })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to submit the request.' },
      { status: 400 }
    )
  }
}

export async function GET(request: Request) {
  try {
    let userId: string
    try {
      const user = await requireUser(request)
      userId = user.id
    } catch {
      userId = 'buyer-school-001'
    }

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('buyer_purchase_requests')
          .select()
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false })
        if (!error && data) return NextResponse.json({ requests: data, threshold_kg: LARGE_ORDER_KG })
      } catch {}
    }

    const db = await getDb()
    await db.exec(`
      create table if not exists agrilink.buyer_purchase_requests (
        id uuid primary key default gen_random_uuid(),
        buyer_id text not null,
        crop text not null,
        quantity_kg numeric not null,
        purpose text,
        review_required boolean default false,
        review_status text default 'pending',
        created_at timestamptz default now()
      )
    `)
    const rows = await db.query(
      `select * from agrilink.buyer_purchase_requests where buyer_id = $1 order by created_at desc`,
      [userId]
    )
    return NextResponse.json({ requests: rows, threshold_kg: LARGE_ORDER_KG })
  } catch {
    return NextResponse.json({ requests: [], threshold_kg: LARGE_ORDER_KG })
  }
}
