import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = clean(body.name)
    const mobile = clean(body.mobile_number)
    const village = clean(body.village)
    const crop = clean(body.crop_name)
    const quantity = Number(body.quantity)
    const consent = body.consent === true

    if (!name || !/^\+?[0-9]{10,13}$/.test(mobile.replace(/\s/g, '')) || !village || !crop || !Number.isFinite(quantity) || quantity <= 0 || !consent) {
      return NextResponse.json({ error: 'Please complete all required fields and consent.' }, { status: 400 })
    }

    const supabase = requireSupabaseAdmin()
    const { data, error } = await supabase.from('farmers').insert({
      name,
      mobile_number: mobile,
      village,
      crop_name: crop,
      quantity,
      verified: false,
    }).select('id,name,mobile_number,village,crop_name,quantity,verified,created_at').single()

    if (error) return NextResponse.json({ error: 'Could not save farmer registration.' }, { status: 500 })
    return NextResponse.json({ farmer: data, otp_required: true })
  } catch {
    return NextResponse.json({ error: 'Registration service is unavailable.' }, { status: 503 })
  }
}
