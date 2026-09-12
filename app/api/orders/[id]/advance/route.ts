import { getDb } from '@/lib/server/db'
import { commitAdvance } from '@/lib/server/sourcing'
import { getOrder } from '@/lib/server/repo'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const db = await getDb()
    let buyerId = body.buyerId || body.buyer_id
    if (!buyerId) {
      const order = await getOrder(db, id)
      buyerId = order.buyerId
    }
    const order = await commitAdvance(db, id, buyerId)
    return Response.json({ order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to commit advance'
    return Response.json({ error: message }, { status: 400 })
  }
}
