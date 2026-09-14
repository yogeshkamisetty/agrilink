import { requireBuyerId } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { errorResponse } from '@/lib/server/http'
import { getOrder } from '@/lib/server/repo'
import { commitAdvance } from '@/lib/server/sourcing'

/** The ordering buyer commits the advance; an FPO coordinator may record a buyer's transfer on their behalf. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireRole(request, ['buyer', 'admin'])
    const db = await getDb()
    const buyerId = user.role === 'admin' ? (await getOrder(db, id)).buyerId : await requireBuyerId(db, user)
    const order = await commitAdvance(db, id, buyerId)
    return Response.json({ order })
  } catch (error) {
    return errorResponse(error, 'Failed to commit the advance.')
  }
}
