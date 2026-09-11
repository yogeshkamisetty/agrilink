import { getDb } from '@/lib/server/db'
import { commitAdvance } from '@/lib/server/sourcing'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const buyerId = body.buyerId || body.buyer_id
    if (!buyerId) {
      return Response.json({ error: 'buyerId is required' }, { status: 400 })
    }
    const db = await getDb()
    const order = await commitAdvance(db, id, buyerId)
    return Response.json({ order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to commit advance'
    return Response.json({ error: message }, { status: 400 })
  }
}
