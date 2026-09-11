import { requireSupabaseAdmin } from '@/lib/supabase-admin'

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

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ farmer: data, otp_required: true })
  } catch {
    return Response.json({ error: 'Unable to register farmer.' }, { status: 500 })
  }
}

export async function GET() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin.from('farmers')
    .select('id,name,mobile_number,village,crop_name,quantity,quality_grade,harvest_date,verified')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ farmers: data })
}
