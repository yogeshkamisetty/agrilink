import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'
export async function POST(request: Request) {
  try {
    const user = await requireUser(request), body = await request.json() as Record<string, unknown>, requestedRole = body.role
    if ((requestedRole !== 'farmer' && requestedRole !== 'buyer') || typeof body.full_name !== 'string' || !body.full_name.trim()) return NextResponse.json({ error: 'Choose a role and enter your name.' }, { status: 400 })
    const role: 'farmer' | 'buyer' = requestedRole
    if (role === 'farmer' && (!body.village || !body.district || !body.state)) return NextResponse.json({ error: 'Village, district, and state are required for farmers.' }, { status: 400 })
    if (role === 'buyer' && (!body.organization_name || !body.organization_type)) return NextResponse.json({ error: 'Organization name and type are required for buyers.' }, { status: 400 })
    const db = requireSupabaseAdmin()
    const { data, error } = await db.from('user_profiles').upsert({ id: user.id, role, full_name: body.full_name.trim(), mobile_number: typeof body.mobile_number === 'string' ? body.mobile_number.replace(/\D/g, '').slice(-10) : null, village: typeof body.village === 'string' ? body.village.trim() : null, district: typeof body.district === 'string' ? body.district.trim() : null, state: typeof body.state === 'string' ? body.state.trim() : null, fpo_name: typeof body.fpo_name === 'string' ? body.fpo_name.trim() : null, organization_name: typeof body.organization_name === 'string' ? body.organization_name.trim() : null, organization_type: typeof body.organization_type === 'string' ? body.organization_type.trim() : null, onboarding_complete: true, updated_at: new Date().toISOString() }).select().single()
    if (error) throw error
    await db.from('auth_activity').insert({ user_id: user.id, event_type: 'onboarding_complete', metadata: { role } })
    return NextResponse.json({ profile: data })
  } catch (error) { const status = error instanceof Error && error.message === 'AUTH_REQUIRED' ? 401 : 500; return NextResponse.json({ error: status === 401 ? 'Please sign in again.' : 'Unable to save your profile.' }, { status }) }
}
