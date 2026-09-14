import { isCropId } from '@/lib/domain/crops'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { cropDemandForecast, forecastOverview } from '@/lib/server/forecasting'
import { errorResponse } from '@/lib/server/http'

/** Demand forecast for the coming weeks: one crop in detail with `?crop=TOMATO`, or a line per crop. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const weeks = Number(url.searchParams.get('weeks') ?? 4)
    const crop = url.searchParams.get('crop')?.trim().toUpperCase()
    const db = await getDb()
    if (crop) {
      if (!isCropId(crop)) throw new DomainError('Unsupported crop.', 400)
      return Response.json(await cropDemandForecast(db, crop, weeks))
    }
    return Response.json(await forecastOverview(db, weeks))
  } catch (error) {
    return errorResponse(error, 'Unable to compute the forecast.')
  }
}
