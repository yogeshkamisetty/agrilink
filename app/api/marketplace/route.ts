import { buyerIdForUser } from '@/lib/server/actors'
import { optionalUser } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { errorResponse } from '@/lib/server/http'
import { marketCatalog } from '@/lib/server/marketplace'
import { listBuyers } from '@/lib/server/repo'

/** The storefront: live registered supply per crop with its mandi–retail price corridor and transport estimate. */
export async function GET(request: Request) {
  try {
    const db = await getDb()
    const user = await optionalUser(request)
    const buyerId = user?.role === 'buyer' ? await buyerIdForUser(db, user) : null
    const catalog = await marketCatalog(db, { buyerId })
    // Coordinators post orders on a buyer's behalf, so they need the buyer list.
    const buyers = user?.role === 'admin' ? (await listBuyers(db)).map((b) => ({ id: b.id, name: b.name, type: b.type, city: b.city })) : undefined
    return Response.json({ ...catalog, buyerId, buyers })
  } catch (error) {
    return errorResponse(error, 'Unable to load the marketplace.')
  }
}
