import { actingFarmer } from '@/lib/server/actors'
import { getDb } from '@/lib/server/db'
import { errorResponse, readJson } from '@/lib/server/http'
import { withdraw } from '@/lib/server/sourcing'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDb()
    const body = await readJson(request)
    const { farmerId, onBehalf } = await actingFarmer(request, db, body.farmerId)
    const result = await withdraw(db, id, farmerId, onBehalf ? 'COORDINATOR' : 'FARMER')
    return Response.json(result)
  } catch (error) {
    return errorResponse(error, 'Failed to withdraw the commitment.')
  }
}
