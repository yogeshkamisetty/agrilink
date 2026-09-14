import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { dispatch, routePreview } from '@/lib/server/dispatch'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireRole(request, 'admin')
    const db = await getDb()
    return Response.json(await routePreview(db, [id]))
  } catch (error) {
    return errorResponse(error, 'Route preview failed.')
  }
}

/** Dispatch this order — or a consolidated run of several, when `orderIds` lists the others on the same vehicle. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireRole(request, 'admin')
    const body = await readJson(request)
    if (body.vehicleCost == null) throw new DomainError('vehicleCost is required.', 400)
    const others = Array.isArray(body.orderIds) ? body.orderIds.map(String) : []
    const db = await getDb()
    const consignment = await dispatch(db, {
      orderIds: [...new Set([id, ...others])],
      vehicleCost: Number(body.vehicleCost),
      vehicleLabel: optionalString(body.vehicleLabel) ?? 'Hired pickup',
    })
    return Response.json({ consignment })
  } catch (error) {
    return errorResponse(error, 'Dispatch failed.')
  }
}
