import { gradeLot } from '@/lib/server/collection'
import { getDb } from '@/lib/server/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { farmerId, photoDataUrl, lat, lng } = body
    if (!farmerId || !photoDataUrl) {
      return Response.json({ error: 'farmerId and photoDataUrl are required' }, { status: 400 })
    }
    const db = await getDb()
    const attempt = await gradeLot(db, {
      orderId: id,
      farmerId,
      photoDataUrl,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    })
    return Response.json({ attempt })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GradeCam inspection failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
