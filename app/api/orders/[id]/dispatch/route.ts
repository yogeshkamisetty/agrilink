import { getDb } from '@/lib/server/db'
import { dispatch, routePreview } from '@/lib/server/dispatch'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    const preview = await routePreview(db, [id])
    return Response.json(preview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route preview failed'
    return Response.json({ error: message }, { status: 400 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { vehicleCost, vehicleLabel = 'Hired pickup' } = body
    if (vehicleCost === undefined) {
      return Response.json({ error: 'vehicleCost is required' }, { status: 400 })
    }
    const db = await getDb()
    const consignment = await dispatch(db, {
      orderIds: [id],
      vehicleCost: Number(vehicleCost),
      vehicleLabel,
    })
    return Response.json({ consignment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
