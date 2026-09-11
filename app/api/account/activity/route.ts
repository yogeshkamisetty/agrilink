import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'
export async function POST(request: Request) {
  try { const user = await requireUser(request), body = await request.json() as { event_type?: 'login' | 'logout' | 'signup' }; if (!['login', 'logout', 'signup'].includes(body.event_type ?? '')) return NextResponse.json({ error: 'Invalid activity.' }, { status: 400 }); const now = new Date().toISOString(), db = requireSupabaseAdmin(); await db.from('auth_activity').insert({ user_id: user.id, event_type: body.event_type!, metadata: {} }); if (body.event_type === 'login' || body.event_type === 'logout') await db.from('user_profiles').update(body.event_type === 'login' ? { last_login_at: now } : { last_logout_at: now }).eq('id', user.id); return NextResponse.json({ ok: true }) } catch { return NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
}
