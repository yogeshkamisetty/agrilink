import { getDb } from '@/lib/server/db'
import { overviewView } from '@/lib/server/views'

export async function GET() {
  try {
    const db = await getDb()
    const overview = await overviewView(db)
    return Response.json(overview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch overview data'
    return Response.json({ error: message }, { status: 500 })
  }
}
