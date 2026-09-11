import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOtp, verifyOtp } from '@/lib/server/otp-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'send' | 'verify'
      phone?: string
      otp?: string
      sessionId?: string
    }

    const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(-10) : ''

    if (body.action === 'send') {
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }

      const result = await sendOtp(phone)
      return NextResponse.json(result)
    }

    if (body.action === 'verify') {
      if (!phone || !body.otp) {
        return NextResponse.json({ error: 'Phone number and verification code are required.' }, { status: 400 })
      }

      const verificationResult = await verifyOtp(phone, body.otp, body.sessionId)
      if (!verificationResult.ok) {
        return NextResponse.json({ error: verificationResult.error || 'Invalid verification code.' }, { status: 400 })
      }

      // If Supabase is not configured, return a mock success for offline preview
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseAdmin || !supabaseUrl || !anonKey) {
        return NextResponse.json({
          ok: true,
          isMock: true,
          user: { id: `mock-${phone}`, phone: `+91${phone}` },
        })
      }

      // Provision user deterministically in Supabase Auth
      const email = `phone_${phone}@agrilink.internal`
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'agrilink_secret'
      const password = createHmac('sha256', serviceKey).update(`pwd_${phone}`).digest('hex')

      let userId: string | null = null

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: `+91${phone}`,
        phone_confirm: true,
        user_metadata: { mobile: phone },
      })

      if (created?.user) {
        userId = created.user.id
      } else if (createError) {
        // Look up existing user
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
        const existing = usersData?.users?.find(u => u.email === email || u.phone === `+91${phone}`)
        if (existing) {
          userId = existing.id
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password })
        }
      }

      // Ensure profile row exists
      if (userId) {
        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id, onboarding_complete, role, verification_status')
          .eq('id', userId)
          .maybeSingle()

        if (!existingProfile) {
          await supabaseAdmin.from('user_profiles').insert({
            id: userId,
            mobile_number: phone,
            onboarding_complete: false,
            verification_status: 'pending',
          })
        }
      }

      // Generate full client session
      const anon = createClient(supabaseUrl, anonKey)
      const { data: authData, error: signInError } = await anon.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !authData?.session) {
        throw signInError || new Error('Failed to generate session for verified phone.')
      }

      // Log login event
      try {
        if (userId) {
          const now = new Date().toISOString()
          await supabaseAdmin.from('auth_activity').insert({
            user_id: userId,
            event_type: 'login',
            metadata: {},
          })
          await supabaseAdmin.from('user_profiles').update({ last_login_at: now }).eq('id', userId)
        }
      } catch {
        // Non-blocking
      }

      // Check onboarding status
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('id', authData.user.id)
        .maybeSingle()

      return NextResponse.json({
        ok: true,
        session: authData.session,
        user: authData.user,
        onboardingComplete: profile?.onboarding_complete ?? false,
      })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err) {
    console.error('[auth/otp] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Authentication service encountered an error.' },
      { status: 500 }
    )
  }
}
