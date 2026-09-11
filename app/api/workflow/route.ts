import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const body = await request.json() as { action?: string; commitment_id?: string; status?: string }
    if (body.action !== 'update_commitment' || !body.commitment_id || !['accepted', 'rejected', 'pending'].includes(body.status ?? '')) {
      return Response.json({ error: 'Use action=update_commitment with a valid commitment_id and status.' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin.from('commitments').update({ commitment_status: body.status }).eq('id', body.commitment_id).select('id,order_id,farmer_id,quantity_committed,commitment_status').single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ commitment: data })
  } catch {
    return Response.json({ error: 'Unable to update workflow.' }, { status: 500 })
  }
}
