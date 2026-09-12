import { CropId } from '@/lib/domain/crops'
import { getDb } from '@/lib/server/db'
import { listBuyers } from '@/lib/server/repo'
import { createOrder } from '@/lib/server/sourcing'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id,buyer_id,crop_required,quantity_required,grade_required,delivery_date,delivery_location,status,created_at')
        .order('created_at', { ascending: false })
      if (!error && data) return Response.json({ orders: data })
    }

    const db = await getDb()
    const rows = await db.query(`select o.*, b.name as buyer_name from agrilink.orders o join agrilink.buyers b on b.id = o.buyer_id order by o.created_at desc`)
    return Response.json({ orders: rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch orders'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = await getDb()

    // Map fields from either Supabase schema or AgriLink domain schema
    let buyerId = body.buyerId || body.buyer_id
    if (!buyerId) {
      const buyers = await listBuyers(db)
      if (buyers.length > 0) buyerId = buyers[0].id
    }

    const crop = (body.crop || body.crop_required || 'PADDY').toUpperCase() as CropId
    const qtyTargetKg = Number(body.qtyTargetKg || body.quantity_required || 1000)
    const pricePerKg = Number(body.pricePerKg || body.price_per_kg || 28)
    const deliveryDate = body.deliveryDate || body.delivery_date || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]

    const order = await createOrder(db, {
      buyerId,
      crop,
      qtyTargetKg,
      pricePerKg,
      deliveryDate,
      advancePct: body.advancePct ? Number(body.advancePct) : undefined,
    })

    if (supabaseAdmin) {
      try {
        await (supabaseAdmin as any).from('orders').insert({
          id: order.id,
          buyer_id: buyerId,
          crop_required: crop,
          quantity_required: qtyTargetKg,
          grade_required: 'Grade A Assured',
          delivery_date: deliveryDate,
          delivery_location: 'Central Kitchen Depot',
          status: 'POSTED',
        })
      } catch (err) {
        console.warn('Supabase sync non-fatal warning:', err)
      }
    }

    return Response.json({ order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create order'
    return Response.json({ error: message }, { status: 400 })
  }
}
