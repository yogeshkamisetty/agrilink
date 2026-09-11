import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

/** Deployment-safe diagnostic: exposes readiness, never credentials or user data. */
export async function GET() {
  const authConfigured = Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY)
  const workflowDatabaseConfigured = Boolean(process.env.DATABASE_URL)
  if (!authConfigured) return NextResponse.json({ ok: false, service: 'agrilink', supabase: 'not_configured', workflow_database: workflowDatabaseConfigured ? 'configured' : 'not_configured' }, { status: 503 })
  try {
    const db = requireSupabaseAdmin(), { error } = await db.from('user_profiles').select('id').limit(1)
    if (error) return NextResponse.json({ ok: false, service: 'agrilink', supabase: 'schema_unavailable', workflow_database: workflowDatabaseConfigured ? 'configured' : 'not_configured', detail: error.message }, { status: 503 })
    if (!workflowDatabaseConfigured) return NextResponse.json({ ok: false, service: 'agrilink', supabase: 'ready', workflow_database: 'not_configured' }, { status: 503 })
    return NextResponse.json({ ok: true, service: 'agrilink', supabase: 'ready', workflow_database: 'configured' })
  } catch { return NextResponse.json({ ok: false, service: 'agrilink', supabase: 'unavailable', workflow_database: workflowDatabaseConfigured ? 'configured' : 'not_configured' }, { status: 503 }) }
}
