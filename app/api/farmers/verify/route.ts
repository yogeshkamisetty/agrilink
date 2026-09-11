import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { farmer_id, otp } = await request.json()
    if (typeof farmer_id !== 'string' || !/^\d{6}$/.test(String(otp))) {
      return NextResponse.json({ error: 'Enter the six-digit verification code.' }, { status: 400 })
    }

    if (otp !== '123456') return NextResponse.json({ error: 'That code is not valid. Try 123456 for the demo.' }, { status: 400 })
    const supabase = requireSupabaseAdmin()
    const { data, error } = await supabase.from('farmers').update({ verified: true }).eq('id', farmer_id).select('id,name,mobile_number,village,crop_name,quantity,verified,created_at').single()
    if (error) return NextResponse.json({ error: 'Could not verify this registration.' }, { status: 500 })
    return NextResponse.json({ farmer: data })
  } catch {
    return NextResponse.json({ error: 'Verification service is unavailable.' }, { status: 503 })
  }
}
