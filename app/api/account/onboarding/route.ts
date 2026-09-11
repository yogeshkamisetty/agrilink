import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const requestedRole = body.role

    if ((requestedRole !== 'farmer' && requestedRole !== 'buyer') || typeof body.full_name !== 'string' || !body.full_name.trim()) {
      return NextResponse.json({ error: 'Choose a role and enter your name.' }, { status: 400 })
    }

    const role: 'farmer' | 'buyer' = requestedRole
    if (role === 'farmer' && (!body.village || !body.district || !body.state)) {
      return NextResponse.json({ error: 'Village, district, and state are required for farmers.' }, { status: 400 })
    }
    if (role === 'buyer' && (!body.organization_name || !body.organization_type)) {
      return NextResponse.json({ error: 'Organization name and business type are required for buyers.' }, { status: 400 })
    }

    const db = requireSupabaseAdmin()
    const cleanPhone = typeof body.mobile_number === 'string' ? body.mobile_number.replace(/\D/g, '').slice(-10) : null

    const { data, error } = await db
      .from('user_profiles')
      .upsert({
        id: user.id,
        role,
        full_name: body.full_name.trim(),
        mobile_number: cleanPhone,
        village: typeof body.village === 'string' ? body.village.trim() : null,
        district: typeof body.district === 'string' ? body.district.trim() : null,
        state: typeof body.state === 'string' ? body.state.trim() : null,
        fpo_name: typeof body.fpo_name === 'string' ? body.fpo_name.trim() : null,
        organization_name: typeof body.organization_name === 'string' ? body.organization_name.trim() : null,
        organization_type: typeof body.organization_type === 'string' ? body.organization_type.trim() : null,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Profile save failed: ${error.message}`)
    }

    // Synchronize to domain tables (buyers or farmers) for unified data flow
    if (role === 'buyer' && body.organization_name) {
      try {
        await db.from('buyers').insert({
          buyer_name: body.full_name.trim(),
          organization_name: String(body.organization_name).trim(),
          mobile_number: cleanPhone || user.phone || '',
        })
      } catch (syncErr) {
        console.warn('[onboarding] buyer sync warning:', syncErr)
      }
    } else if (role === 'farmer' && body.village) {
      try {
        await db.from('farmers').insert({
          name: body.full_name.trim(),
          village: String(body.village).trim(),
          mobile_number: cleanPhone || user.phone || '',
          crop_name: 'Mixed Crops',
          quantity: 0,
          verified: false,
        })
      } catch (syncErr) {
        console.warn('[onboarding] farmer sync warning:', syncErr)
      }
    }

    // Log onboarding completion in audit trail
    try {
      await db.from('auth_activity').insert({
        user_id: user.id,
        event_type: 'onboarding_complete',
        metadata: { role },
      })
    } catch (activityError) {
      console.warn('[onboarding] activity log warning:', activityError)
    }

    return NextResponse.json({ ok: true, profile: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected profile-save error.'
    const status = message === 'AUTH_REQUIRED' ? 401 : message.includes('credentials are not configured') ? 503 : 500
    console.error('[onboarding] failed:', message)
    return NextResponse.json(
      {
        error:
          status === 401
            ? 'Please sign in again.'
            : status === 503
            ? 'Server authentication is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel.'
            : message,
      },
      { status }
    )
  }
}
