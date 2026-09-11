import { CropId } from '@/lib/domain/crops'
import { getDb } from '@/lib/server/db'
import { pricesView } from '@/lib/server/views'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ crop: string }> }
) {
  try {
    const { crop } = await params
    const db = await getDb()
    const cropId = crop.toUpperCase() as CropId
    const prices = await pricesView(db, cropId)
    return Response.json(prices)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Price fetch failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
