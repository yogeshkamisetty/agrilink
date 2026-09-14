import { requireBuyerId } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { confirmDelivery } from '@/lib/server/delivery'
import { errorResponse, readJson } from '@/lib/server/http'
import { getOrder } from '@/lib/server/repo'

/** The buyer's binding inspection at the drop point; a coordinator may record it for a buyer without the app. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireRole(request, ['buyer', 'admin'])
    const db = await getDb()
    const body = await readJson(request)
    const buyerId = user.role === 'admin' ? (await getOrder(db, id)).buyerId : await requireBuyerId(db, user)
    const rejections = (Array.isArray(body.rejections) ? body.rejections : [])
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({ lotId: String((r as Record<string, unknown>).lotId ?? ''), reason: String((r as Record<string, unknown>).reason ?? '') }))
    const result = await confirmDelivery(db, { orderId: id, buyerId, rejections })
    return Response.json(result)
  } catch (error) {
    return errorResponse(error, 'Delivery confirmation failed.')
  }
}
