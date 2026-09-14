import { actingFarmer } from '@/lib/server/actors'
import { gradeLot } from '@/lib/server/collection'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'

function coordinate(value: unknown, limit: number): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null
}

/** GradeCam: a committed farmer's pre-check, or the coordinator's inspection at the collection point. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDb()
    const body = await readJson(request)
    const { farmerId } = await actingFarmer(request, db, body.farmerId)
    const photoDataUrl = optionalString(body.photoDataUrl)
    if (!photoDataUrl) throw new DomainError('A photo is required.', 400)
    const attempt = await gradeLot(db, { orderId: id, farmerId, photoDataUrl, lat: coordinate(body.lat, 90), lng: coordinate(body.lng, 180) })
    return Response.json({ attempt })
  } catch (error) {
    return errorResponse(error, 'GradeCam inspection failed.')
  }
}
