import { recordLot } from '@/lib/server/collection'
import { getDb } from '@/lib/server/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { farmerId, attemptId, weighedKg, decision, grade, reason, by = 'Coordinator' } = body
    if (!farmerId || weighedKg === undefined || !decision) {
      return Response.json({ error: 'farmerId, weighedKg, and decision are required' }, { status: 400 })
    }
    const db = await getDb()
    const result = await recordLot(db, {
      orderId: id,
      farmerId,
      attemptId: attemptId || null,
      weighedKg: Number(weighedKg),
      decision,
      grade,
      reason,
      by,
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lot collection failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
