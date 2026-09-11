import { requireSupabaseAdmin } from '@/lib/supabase-admin'

function extractDecision(body: Record<string, unknown>) {
  const text = String(body.transcript ?? body.response ?? body.status ?? '').toLowerCase()
  if (/\b(yes|accept|interested|haan|avunu)\b/.test(text)) return 'accepted'
  if (/\b(no|reject|not interested|kaadu)\b/.test(text)) return 'rejected'
  return null
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const body = await request.json() as Record<string, unknown>
    const commitmentId = typeof body.commitment_id === 'string' ? body.commitment_id : ''
    const decision = extractDecision(body)
    if (!commitmentId || !decision) return Response.json({ error: 'commitment_id and a YES/NO decision are required.' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('commitments').update({ commitment_status: decision }).eq('id', commitmentId).select('id,order_id,farmer_id,quantity_committed,commitment_status').single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ commitment: data })
  } catch {
    return Response.json({ error: 'Unable to process call response.' }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ ok: true, service: 'agrilink-voice-webhook' })
}
