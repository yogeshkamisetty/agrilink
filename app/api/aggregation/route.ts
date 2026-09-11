import { NextResponse } from 'next/server'
import { requireRole, requireUser } from '@/lib/server/auth'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try { await requireUser(request); const { data, error } = await requireSupabaseAdmin().from('aggregation_batches').select().order('created_at', { ascending: false }); if (error) throw error; return NextResponse.json({ batches: data }) } catch { return NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
}
export async function POST(request: Request) {
  try {
    const coordinator = await requireRole(request, 'admin'), body = await request.json() as { batch_code?: string; fpo_name?: string; crop?: string; location?: string; contributions?: Array<{ farmer_id?: string; quantity_kg?: number }> }
    if (!body.batch_code?.trim() || !body.fpo_name?.trim() || !body.crop?.trim() || !body.location?.trim() || !body.contributions?.length) return NextResponse.json({ error: 'Batch, FPO, crop, location, and at least one contribution are required.' }, { status: 400 })
    const contributions = body.contributions.map((item) => ({ farmer_id: item.farmer_id || null, quantity_kg: Number(item.quantity_kg) }))
    if (contributions.some((item) => !Number.isFinite(item.quantity_kg) || item.quantity_kg <= 0)) return NextResponse.json({ error: 'Each contribution must have a positive weight.' }, { status: 400 })
    const db = requireSupabaseAdmin(), total = contributions.reduce((sum, item) => sum + item.quantity_kg, 0)
    const { data: batch, error } = await db.from('aggregation_batches').insert({ batch_code: body.batch_code.trim().toUpperCase(), fpo_name: body.fpo_name.trim(), crop: body.crop.trim().toUpperCase(), location: body.location.trim(), total_quantity_kg: total, created_by: coordinator.id }).select().single()
    if (error) throw error
    const { error: contributionError } = await db.from('aggregation_contributions').insert(contributions.map((item) => ({ ...item, batch_id: batch.id })))
    if (contributionError) throw contributionError
    return NextResponse.json({ batch, contributions })
  } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'FORBIDDEN' ? 'Administrator access is required.' : 'Unable to create the aggregation batch.' }, { status: 403 }) }
}
export async function PATCH(request: Request) {
  try {
    await requireRole(request, 'admin'); const body = await request.json() as { batch_id?: string; grade_a_kg?: number; grade_b_kg?: number; quality_verified?: boolean }
    const a = Number(body.grade_a_kg), b = Number(body.grade_b_kg)
    if (!body.batch_id || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return NextResponse.json({ error: 'Batch and non-negative grade quantities are required.' }, { status: 400 })
    const db = requireSupabaseAdmin(), { data: current, error: lookupError } = await db.from('aggregation_batches').select('total_quantity_kg').eq('id', body.batch_id).single()
    if (lookupError || a + b > current.total_quantity_kg) return NextResponse.json({ error: 'Grade quantities cannot exceed batch weight.' }, { status: 400 })
    const { data, error } = await db.from('aggregation_batches').update({ grade_a_kg: a, grade_b_kg: b, quality_verified: Boolean(body.quality_verified) }).eq('id', body.batch_id).select().single()
    if (error) throw error
    return NextResponse.json({ batch: data })
  } catch { return NextResponse.json({ error: 'Unable to update batch quality.' }, { status: 403 }) }
}
