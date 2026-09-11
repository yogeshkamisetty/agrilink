import { requireSupabaseAdmin } from '@/lib/supabase-admin'

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export async function POST(request: Request) {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const body = await request.json()
    const buyerId = asText(body.buyer_id)
    const cropRequired = asText(body.crop_required)
    const gradeRequired = asText(body.grade_required)
    const deliveryDate = asText(body.delivery_date)
    const deliveryLocation = asText(body.delivery_location)
    const quantityRequired = Number(body.quantity_required)

    if (!buyerId || !cropRequired || !deliveryDate || !deliveryLocation || !Number.isFinite(quantityRequired) || quantityRequired <= 0) {
      return Response.json({ error: 'Buyer, crop, positive quantity, delivery date, and location are required.' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert({
      buyer_id: buyerId, crop_required: cropRequired, quantity_required: quantityRequired,
      grade_required: gradeRequired || null, delivery_date: deliveryDate, delivery_location: deliveryLocation, status: 'open',
    }).select('id,buyer_id,crop_required,quantity_required,grade_required,delivery_date,delivery_location,status').single()
    if (orderError) return Response.json({ error: orderError.message }, { status: 400 })

    const { data: farmers, error: farmerError } = await supabaseAdmin.from('farmers')
      .select('id,name,mobile_number,quantity,crop_name,quality_grade,harvest_date,verified')
      .eq('verified', true).ilike('crop_name', cropRequired).gt('quantity', 0)
    if (farmerError) return Response.json({ error: farmerError.message }, { status: 500 })

    const eligible = (farmers ?? []).filter((farmer) => {
      const gradeMatches = !gradeRequired || farmer.quality_grade?.toLowerCase() === gradeRequired.toLowerCase()
      const dateMatches = !farmer.harvest_date || farmer.harvest_date <= deliveryDate
      return gradeMatches && dateMatches
    })

    let remaining = quantityRequired
    const commitments = []
    for (const farmer of eligible) {
      if (remaining <= 0) break
      const quantityCommitted = Math.min(Number(farmer.quantity), remaining)
      if (quantityCommitted <= 0) continue
      commitments.push({ order_id: order.id, farmer_id: farmer.id, quantity_committed: quantityCommitted, commitment_status: 'pending' })
      remaining -= quantityCommitted
    }

    if (commitments.length) {
      const { error: commitmentError } = await supabaseAdmin.from('commitments').insert(commitments)
      if (commitmentError) return Response.json({ error: commitmentError.message }, { status: 500 })
    }

    return Response.json({ order, matched_farmers: eligible.slice(0, commitments.length), commitments, unmet_quantity: Math.max(remaining, 0) })
  } catch {
    return Response.json({ error: 'Unable to create and match order.' }, { status: 500 })
  }
}

export async function GET() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin.from('orders').select('id,buyer_id,crop_required,quantity_required,grade_required,delivery_date,delivery_location,status,created_at').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ orders: data })
}
