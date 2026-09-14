import { isIsoDate } from '@/lib/domain/dates'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse } from '@/lib/server/http'
import { consolidationPlan } from '@/lib/server/logistics'

/** Consolidated collection runs for orders with farmers lined up: `?date=YYYY-MM-DD` and/or `?orderIds=a,b`. */
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    if (date && !isIsoDate(date)) throw new DomainError('Use a YYYY-MM-DD delivery date.', 400)
    const ids = url.searchParams.get('orderIds')
    const db = await getDb()
    const plan = await consolidationPlan(db, { deliveryDate: date, orderIds: ids ? ids.split(',').map((s) => s.trim()).filter(Boolean) : null })
    return Response.json(plan)
  } catch (error) {
    return errorResponse(error, 'Unable to plan collection runs.')
  }
}
