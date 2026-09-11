import { getDb } from '@/lib/server/db'
import { notifyMatched } from '@/lib/server/sourcing'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const simulateReplies = Boolean(body.simulateReplies ?? body.simulate_replies ?? false)
    const db = await getDb()
    const result = await notifyMatched(db, id, { simulateReplies })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to notify matched farmers'
    return Response.json({ error: message }, { status: 400 })
  }
}
