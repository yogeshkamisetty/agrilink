import { CropId } from '@/lib/domain/crops'
import { getDb } from '@/lib/server/db'
import { pricesView } from '@/lib/server/views'
import { priceEstimationService } from '@/lib/services/intelligence'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ crop: string }> }
) {
  try {
    const { crop } = await params
    const url = new URL(request.url)
    const grade = (url.searchParams.get('grade') as 'A' | 'B' | 'C') || 'A'
    const distanceKm = url.searchParams.get('distanceKm') ? Number(url.searchParams.get('distanceKm')) : 25
    const demandFactor = (url.searchParams.get('demandFactor') as any) || 'HIGH'

    const db = await getDb()
    const cropId = crop.toUpperCase() as CropId
    const prices = await pricesView(db, cropId)

    const mandiRef = prices.mandi?.pricePerKg ?? 25.0
    const estimation = priceEstimationService.estimate({
      crop: cropId,
      grade,
      location: 'FPO Collection Hub',
      distanceKm,
      demandFactor,
      customMandiRef: mandiRef,
    })

    return Response.json({
      ...prices,
      suggestedPrice: estimation.suggestedPricePerKg,
      estimation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Price fetch failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
