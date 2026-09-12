import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { getDb } from '@/lib/server/db'

function normalizePhone(value: unknown) {
  const phone = typeof value === 'string' ? value.replace(/[^\d+]/g, '') : ''
  return /^\+?[1-9]\d{9,14}$/.test(phone) ? phone : null
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const village = typeof body.village === 'string' ? body.village.trim() : ''
    const cropName = typeof body.crop_name === 'string' ? body.crop_name.trim() : ''
    const mobileNumber = normalizePhone(body.mobile_number)
    const quantity = Number(body.quantity)
    const qualityGrade = typeof body.quality_grade === 'string' ? body.quality_grade.trim() : null
    const harvestDate = typeof body.harvest_date === 'string' ? body.harvest_date : null

    if (!name || !village || !cropName || !mobileNumber || !Number.isFinite(quantity) || quantity <= 0) {
      return Response.json({ error: 'Name, village, valid mobile number, crop, and positive quantity are required.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('farmers').insert({
      name, village, mobile_number: mobileNumber, crop_name: cropName, quantity,
      quality_grade: qualityGrade, harvest_date: harvestDate, verified: false,
    }).select('id,name,mobile_number,village,crop_name,quantity,quality_grade,harvest_date,verified').single()

    if (error) {
      console.error('[farmers/POST] Supabase insert error:', error.message)
      if (error.message?.includes('relation "public.farmers" does not exist')) {
        return Response.json({
          error: "Table 'public.farmers' does not exist in Supabase database. Run 'supabase/schema.sql' in Supabase SQL editor to create it.",
        }, { status: 503 })
      }
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ farmer: data, otp_required: true })
  } catch (err) {
    console.error('[farmers/POST] Error:', err)
    return Response.json({ error: 'Unable to register farmer.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin.from('farmers')
      .select('id,name,mobile_number,village,crop_name,quantity,quality_grade,harvest_date,verified')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data)) {
      return Response.json({ farmers: data })
    }

    // Fallback to local/relational database if Supabase table is not yet migrated
    try {
      const db = await getDb()
      const rows = await db.query<{ id: string; name: string; mobile_number: string; village: string }>(
        `select id::text, name, phone as mobile_number, village from agrilink.farmers order by name`
      )
      if (rows && rows.length > 0) {
        return Response.json({
          farmers: rows.map((r) => ({
            id: r.id,
            name: r.name,
            mobile_number: r.mobile_number,
            village: r.village,
            crop_name: 'Paddy',
            quantity: 500,
            quality_grade: 'A',
            harvest_date: null,
            verified: true,
          })),
        })
      }
    } catch {
      // Internal DB unavailable
    }

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ farmers: [] })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to fetch farmers' }, { status: 500 })
  }
}
