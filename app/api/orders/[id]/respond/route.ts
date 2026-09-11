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
    const result = await respond(db, id, farmerId, {
      channel,
      response,
      responseQtyKg: responseQtyKg ? Number(responseQtyKg) : null,
      responseSource: responseSource || 'IVR',
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record farmer response'
    return Response.json({ error: message }, { status: 400 })
  }
}
