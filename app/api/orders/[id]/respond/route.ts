import { getDb } from '@/lib/server/db'
import { respond } from '@/lib/server/sourcing'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { farmerId, response, channel, responseQtyKg, responseSource } = body
    if (!farmerId || !response || !channel) {
      return Response.json({ error: 'farmerId, response, and channel are required' }, { status: 400 })
    }
    const db = await getDb()
    if (!['ACCEPT', 'DECLINE', 'ACCEPTED', 'DECLINED'].includes(response) || !['SMS', 'WHATSAPP', 'IVR', 'COORDINATOR'].includes(channel)) {
      return Response.json({ error: 'Unsupported response or channel.' }, { status: 400 })
    }
    const accept = response === 'ACCEPT' || response === 'ACCEPTED'
    const source = ['FARMER', 'SIMULATED', 'COORDINATOR'].includes(responseSource) ? responseSource : 'FARMER'
    const qtyKg = responseQtyKg == null ? 0 : Number(responseQtyKg)
    if (!Number.isFinite(qtyKg) || (accept && qtyKg <= 0)) return Response.json({ error: 'A positive response quantity is required when accepting.' }, { status: 400 })
    const result = await respond(db, id, farmerId, { channel, accept, qtyKg, source })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record farmer response'
    return Response.json({ error: message }, { status: 400 })
  }
}
