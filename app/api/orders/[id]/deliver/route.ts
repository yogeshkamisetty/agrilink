import { confirmDelivery } from '@/lib/server/delivery'
import { getDb } from '@/lib/server/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { buyerId, rejections = [] } = body
    if (!buyerId) {
      return Response.json({ error: 'buyerId is required' }, { status: 400 })
    }
    const db = await getDb()
    const result = await confirmDelivery(db, {
      orderId: id,
      buyerId,
      rejections,
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delivery confirmation failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
