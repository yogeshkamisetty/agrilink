import { getDb } from '@/lib/server/db'
import { withdraw } from '@/lib/server/sourcing'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { farmerId, source = 'FARMER' } = body
    if (!farmerId) {
      return Response.json({ error: 'farmerId is required' }, { status: 400 })
    }
    const db = await getDb()
    const result = await withdraw(db, id, farmerId, source)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to withdraw commitment'
    return Response.json({ error: message }, { status: 400 })
  }
}
