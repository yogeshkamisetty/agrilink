import { getDb } from '@/lib/server/db'
import { orderDetail } from '@/lib/server/views'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    const detail = await orderDetail(db, id)
    return Response.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order not found'
    return Response.json({ error: message }, { status: 404 })
  }
}
