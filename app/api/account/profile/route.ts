import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const db = requireSupabaseAdmin()
    const { data: profile, error } = await db
      .from('user_profiles')
      .select('id, role, full_name, mobile_number, verification_status, onboarding_complete, village, district, state, fpo_name, organization_name, organization_type')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load profile.'
    const status = message === 'AUTH_REQUIRED' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
