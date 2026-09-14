import { NextResponse } from 'next/server'
import { isCropId } from '@/lib/domain/crops'
import { isoDate } from '@/lib/domain/dates'
import { suggestedPrice } from '@/lib/domain/money'
import { SMALL_ORDER_THRESHOLD_KG } from '@/lib/domain/order-routing'
import { requireBuyerId } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { clock } from '@/lib/server/clock'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { boardOrders, placeOrder, type BoardOrder } from '@/lib/server/marketplace'
import { getMandiPrice, getRetailPrice } from '@/lib/server/prices'
import { defaultDeliveryDate } from '@/lib/server/seed'

function requestShape(order: BoardOrder) {
  return {
    id: order.id,
    code: order.code,
    crop: order.crop,
    quantity_kg: order.qty_target_kg,
    price_per_kg: order.price_per_kg,
    delivery_date: order.delivery_date,
    purpose: order.purpose,
    review_required: order.order_tier === 'BULK',
    review_status: order.review_status,
    status: order.status,
    created_at: order.created_at,
  }
}

/** The quick request form sends only crop and quantity: price it at the fair price between mandi and retail, for the next standard delivery day. */
export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'buyer')
    const db = await getDb()
    const buyerId = await requireBuyerId(db, user)
    const body = await readJson(request)
    const crop = String(body.crop ?? '').trim().toUpperCase()
    if (!isCropId(crop)) throw new DomainError('Choose a supported crop.', 400)
    const [mandi, retail] = await Promise.all([getMandiPrice(db, crop), getRetailPrice(db, crop)])
    const pricePerKg = suggestedPrice(mandi?.pricePerKg ?? null, retail?.pricePerKg ?? null)
    if (pricePerKg == null) throw new DomainError('There is no reference price for this crop yet — order it from the marketplace with your own price.', 409)
    const placed = await placeOrder(
      db,
      { buyerId, crop, qtyTargetKg: Number(body.quantity_kg), pricePerKg, deliveryDate: defaultDeliveryDate(isoDate(clock.now())), purpose: optionalString(body.purpose) },
      { buyerId },
    )
    return NextResponse.json({ request: requestShape(placed.order), order: placed.order, message: placed.message, threshold_kg: SMALL_ORDER_THRESHOLD_KG })
  } catch (error) {
    return errorResponse(error, 'Unable to submit the request.')
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'buyer')
    const db = await getDb()
    const buyerId = await requireBuyerId(db, user)
    const mine = (await boardOrders(db, { buyerId })).filter((o) => o.is_mine)
    return NextResponse.json({ requests: mine.map(requestShape), threshold_kg: SMALL_ORDER_THRESHOLD_KG })
  } catch (error) {
    return errorResponse(error, 'Unable to load your requests.')
  }
}
