import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { errorResponse, readJson } from '@/lib/server/http'
import { notifyMatched } from '@/lib/server/sourcing'

/** The FPO starts sourcing a funded order: offers go to every matched farmer. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireRole(request, 'admin')
    const body = await readJson(request)
    const db = await getDb()
    const result = await notifyMatched(db, id, { simulateReplies: Boolean(body.simulateReplies ?? body.simulate_replies ?? false) })
    return Response.json(result)
  } catch (error) {
    return errorResponse(error, 'Failed to notify matched farmers.')
  }
}
