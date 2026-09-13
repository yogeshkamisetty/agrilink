import { CropId } from '@/lib/domain/crops'
import { getDb } from '@/lib/server/db'
import { listBuyers } from '@/lib/server/repo'
import { createOrder } from '@/lib/server/sourcing'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    let orderList: any[] = []

    // 1. Try DB first to get rich institutional orders
    try {
      const db = await getDb()
      const rows = await db.query<any>(`
        select o.*, b.name as buyer_name,
               coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.order_id = o.id), 0) as db_committed_kg
        from agrilink.orders o
        left join agrilink.buyers b on b.id = o.buyer_id
        order by o.created_at desc
      `)
      if (Array.isArray(rows) && rows.length > 0) {
        orderList = rows.map((o) => {
          const target = Number(o.qty_target_kg || o.quantity_required || 1000)
          const committed = o.status === 'AGGREGATED' ? target : Number(o.db_committed_kg || o.qty_committed_kg || 0)
          const isSmall = target <= 50
          return {
            ...o,
            crop: (o.crop || o.crop_required || 'PADDY').toUpperCase(),
            crop_required: (o.crop_required || o.crop || 'PADDY').toUpperCase(),
            qty_target_kg: target,
            quantity_required: target,
            qty_committed_kg: committed,
            price_per_kg: Number(o.price_per_kg || 28),
            buyer_name: o.buyer_name || 'PM POSHAN Central Kitchen',
            delivery_location: o.delivery_location || o.buyer_name || 'Central Kitchen Depot',
            code: o.code || `AG-${String(o.id || '1001').slice(-4).toUpperCase()}`,
            order_tier: isSmall ? 'SMALL' : 'BULK',
            allocation_mode: isSmall ? 'AUTO_ALLOCATED' : 'POOL_AGGREGATION',
            allocated_farmer_name: o.allocated_farmer_name || (isSmall ? 'Jignesh Chauhan (Bakrol · 1.8 km)' : null),
            allocated_farmer_id: o.allocated_farmer_id || (isSmall ? 'f-jignesh-104' : null),
            farmer_acceptance_status: o.farmer_acceptance_status || 'PENDING',
          }
        })
      }

      // Ensure full suite of baseline institutional demands (Tomato, Wheat, Onion) are available with live 2026 dates
      const nowMs = Date.now()
      const baselineDemands = [
        {
          id: 'ord-tomato-101',
          crop: 'TOMATO',
          qty_target_kg: 500,
          qty_committed_kg: 350,
          price_per_kg: 24,
          delivery_date: new Date(nowMs + 86400000 * 4).toISOString().split('T')[0],
          buyer_name: 'Civil Hospital Trust Kitchen, Anand',
          status: 'SOURCING',
        },
        {
          id: 'ord-wheat-102',
          crop: 'WHEAT',
          qty_target_kg: 1200,
          qty_committed_kg: 900,
          price_per_kg: 26,
          delivery_date: new Date(nowMs + 86400000 * 7).toISOString().split('T')[0],
          buyer_name: 'Jan Poshan Kendra · FPS 214',
          status: 'SOURCING',
        },
        {
          id: 'ord-onion-103',
          crop: 'ONION',
          qty_target_kg: 400,
          qty_committed_kg: 220,
          price_per_kg: 22,
          delivery_date: new Date(nowMs + 86400000 * 5).toISOString().split('T')[0],
          buyer_name: 'Kheda Community Hostel Mess',
          status: 'SOURCING',
        },
      ]

      for (const bd of baselineDemands) {
        if (!orderList.some((o) => o.id === bd.id || o.crop === bd.crop)) {
          try {
            await db.query(`
              insert into agrilink.orders (id, crop, qty_target_kg, qty_committed_kg, price_per_kg, delivery_date, status, created_at)
              values ($1, $2, $3, $4, $5, $6::date, $7, now())
              on conflict (id) do nothing
            `, [bd.id, bd.crop, bd.qty_target_kg, bd.qty_committed_kg, bd.price_per_kg, bd.delivery_date, bd.status])
          } catch {}

          orderList.push({
            id: bd.id,
            crop: bd.crop,
            crop_required: bd.crop,
            qty_target_kg: bd.qty_target_kg,
            quantity_required: bd.qty_target_kg,
            qty_committed_kg: bd.qty_committed_kg,
            price_per_kg: bd.price_per_kg,
            delivery_date: bd.delivery_date,
            buyer_name: bd.buyer_name,
            delivery_location: bd.buyer_name,
            code: `AG-${bd.crop.slice(0, 3)}-101`,
            status: bd.status,
            order_tier: 'BULK',
            allocation_mode: 'POOL_AGGREGATION',
            allocated_farmer_name: null,
            allocated_farmer_id: null,
            farmer_acceptance_status: 'PENDING',
          })
        }
      }
    } catch {}

    // 2. Also check Supabase
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('id,buyer_id,crop_required,quantity_required,grade_required,delivery_date,delivery_location,status,created_at')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            if (!orderList.some((o) => o.id === item.id)) {
              const target = Number(item.quantity_required || 1000)
              const committed = item.status === 'AGGREGATED' ? target : 0
              const isSmall = target <= 50
              orderList.push({
                ...item,
                crop: (item.crop_required || 'PADDY').toUpperCase(),
                crop_required: item.crop_required,
                qty_target_kg: target,
                quantity_required: target,
                qty_committed_kg: committed,
                price_per_kg: 28,
                buyer_name: item.delivery_location || 'Institutional Buyer',
                code: `AG-${String(item.id || '1001').slice(-4).toUpperCase()}`,
                order_tier: isSmall ? 'SMALL' : 'BULK',
                allocation_mode: isSmall ? 'AUTO_ALLOCATED' : 'POOL_AGGREGATION',
                allocated_farmer_name: isSmall ? 'Jignesh Chauhan (Bakrol · 1.8 km)' : null,
                allocated_farmer_id: isSmall ? 'f-jignesh-104' : null,
                farmer_acceptance_status: 'PENDING',
              })
            }
          }
        }
      } catch {}
    }

    return Response.json({ orders: orderList })
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

    const isSmall = qtyTargetKg <= 50
    const enrichedOrder = {
      ...order,
      order_tier: isSmall ? 'SMALL' : 'BULK',
      allocation_mode: isSmall ? 'AUTO_ALLOCATED' : 'POOL_AGGREGATION',
      allocated_farmer_name: isSmall ? 'Jignesh Chauhan (Bakrol · 1.8 km)' : null,
      allocated_farmer_id: isSmall ? 'f-jignesh-104' : null,
      farmer_acceptance_status: 'PENDING',
    }

    return Response.json({ order: enrichedOrder })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create order'
    return Response.json({ error: message }, { status: 400 })
  }
}
