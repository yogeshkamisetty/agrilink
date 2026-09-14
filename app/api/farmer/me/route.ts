import { requireFarmerId } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { errorResponse } from '@/lib/server/http'
import { farmerOverview } from '@/lib/server/views'

/** The signed-in farmer's harvests, commitments, offers, messages and payments. */
export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'farmer')
    const db = await getDb()
    return Response.json(await farmerOverview(db, await requireFarmerId(db, user)))
  } catch (error) {
    return errorResponse(error, 'Unable to load your farm overview.')
  }
}
