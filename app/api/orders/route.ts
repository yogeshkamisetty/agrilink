import { isCropId } from '@/lib/domain/crops'
import { isIsoDate } from '@/lib/domain/dates'
import { buyerIdForUser, farmerIdForUser, requireBuyerId, userName } from '@/lib/server/actors'
import { optionalUser, requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { boardOrders, placeOrder } from '@/lib/server/marketplace'

export async function GET(request: Request) {
  try {
    const db = await getDb()
    const user = await optionalUser(request)
    const viewer = {
      farmerId: user?.role === 'farmer' ? await farmerIdForUser(db, user) : null,
      buyerId: user?.role === 'buyer' ? await buyerIdForUser(db, user) : null,
    }
    return Response.json({ orders: await boardOrders(db, viewer) })
  } catch (error) {
    return errorResponse(error, 'Unable to load orders.')
  }
}

/** Buyers order for themselves; an FPO coordinator posts on a buyer's behalf and skips the review queue. */
export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ['buyer', 'admin'])
    const db = await getDb()
    const body = await readJson(request)
    const buyerId = user.role === 'buyer' ? await requireBuyerId(db, user) : optionalString(body.buyerId)
    if (!buyerId) throw new DomainError('Choose the buyer this order is for.', 400)
    const crop = String(body.crop ?? '').trim().toUpperCase()
    if (!isCropId(crop)) throw new DomainError('Choose a supported crop.', 400)
    const deliveryDate = optionalString(body.deliveryDate)
    if (!deliveryDate || !isIsoDate(deliveryDate)) throw new DomainError('Pick a delivery date.', 400)

    const placed = await placeOrder(
      db,
      {
        buyerId,
        crop,
        qtyTargetKg: Number(body.qtyTargetKg),
        pricePerKg: Number(body.pricePerKg),
        deliveryDate,
        advancePct: body.advancePct == null ? undefined : Number(body.advancePct),
        purpose: optionalString(body.purpose),
        deliveryLocation: optionalString(body.deliveryLocation),
        // A coordinator can also file an order on a buyer's behalf that still goes through review.
        approvedBy: user.role === 'admin' && body.submitForReview !== true ? userName(user) || 'FPO coordinator' : null,
      },
      { buyerId: user.role === 'buyer' ? buyerId : null },
    )
    return Response.json(placed)
  } catch (error) {
    return errorResponse(error, 'Unable to create the order.')
  }
}
