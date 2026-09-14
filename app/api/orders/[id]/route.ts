import { buyerIdForUser } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse } from '@/lib/server/http'
import { orderDetail } from '@/lib/server/views'

/** The full order record — ledger, lots, farmer phone numbers — for the FPO and the ordering buyer only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireRole(request, ['admin', 'buyer'])
    const db = await getDb()
    const detail = await orderDetail(db, id)
    if (user.role === 'buyer') {
      if (detail.order.buyerId !== (await buyerIdForUser(db, user))) throw new DomainError('This order belongs to another buyer.', 403)
      // Buyers see their order, lots and money trail — not farmers' phone numbers, match internals or lot photos.
      const { farmers: _farmers, match: _match, cascade: _cascade, lots, ...rest } = detail
      return Response.json({ ...rest, lots: lots.map(({ photoDataUrl: _photo, ...lot }) => lot) })
    }
    return Response.json(detail)
  } catch (error) {
    return errorResponse(error, 'Unable to load the order.')
  }
}
