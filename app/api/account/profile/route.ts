import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)

    if (supabaseAdmin) {
      try {
        const { data: profile, error } = await supabaseAdmin
          .from('user_profiles')
          .select('id, role, full_name, mobile_number, verification_status, onboarding_complete, village, district, state, fpo_name, organization_name, organization_type')
          .eq('id', user.id)
          .maybeSingle()

        if (!error && profile) {
          return NextResponse.json({ ok: true, profile })
        }
      } catch {}
    }

    const phone = (user.user_metadata?.mobile as string) || (user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '')
    const fullName = (user.user_metadata?.name as string) || (user.role === 'buyer' ? 'Meera Patel' : user.role === 'admin' ? 'Anita Sharma' : 'Ramesh Kumar')

    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        role: user.role || 'farmer',
        full_name: fullName,
        mobile_number: phone,
        verification_status: 'verified',
        onboarding_complete: true,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load profile.'
    const status = message === 'AUTH_REQUIRED' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
