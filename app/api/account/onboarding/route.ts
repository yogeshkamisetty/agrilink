import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

function sanitizeText(value: unknown, maxLength = 100): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // strip control chars
    .trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const requestedRole = body.role

    const fullName = sanitizeText(body.full_name, 100)
    if ((requestedRole !== 'farmer' && requestedRole !== 'buyer' && requestedRole !== 'admin') || !fullName) {
      return NextResponse.json({ error: 'Choose a role and enter your name.' }, { status: 400 })
    }

    const role: 'farmer' | 'buyer' | 'admin' = requestedRole
    const village = sanitizeText(body.village, 100)
    const district = sanitizeText(body.district, 100)
    const state = sanitizeText(body.state, 100)
    const fpoName = sanitizeText(body.fpo_name, 100)
    const organizationName = sanitizeText(body.organization_name, 120)
    const organizationType = sanitizeText(body.organization_type, 60)

    if (role === 'farmer' && (!village || !district || !state)) {
      return NextResponse.json({ error: 'Village, district, and state are required for farmers.' }, { status: 400 })
    }
    if (role === 'buyer' && (!organizationName || !organizationType)) {
      return NextResponse.json({ error: 'Organization name and business type are required for buyers.' }, { status: 400 })
    }
    if (role === 'admin' && (!district || !fpoName)) {
      return NextResponse.json({ error: 'FPO Federation name and District hub are required for admins.' }, { status: 400 })
    }

    const db = requireSupabaseAdmin()
    const cleanPhone = typeof body.mobile_number === 'string' ? body.mobile_number.replace(/\D/g, '').slice(-10) : null

    const { data, error } = await db
      .from('user_profiles')
      .upsert({
        id: user.id,
        role,
        full_name: fullName,
        mobile_number: cleanPhone,
        village,
        district,
        state,
        fpo_name: fpoName,
        organization_name: organizationName,
        organization_type: organizationType,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Profile save failed: ${error.message}`)
    }

    // Synchronize to domain tables (buyers or farmers) for unified data flow
    if (role === 'buyer' && organizationName) {
      try {
        await db.from('buyers').insert({
          buyer_name: fullName,
          organization_name: organizationName,
          mobile_number: cleanPhone || user.phone || '',
        })
      } catch (syncErr) {
        console.warn('[onboarding] buyer sync warning:', syncErr)
      }
    } else if (role === 'farmer' && village) {
      try {
        await db.from('farmers').insert({
          name: fullName,
          village: village,
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
