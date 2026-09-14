import { getDb } from '@/lib/server/db'
import { overviewView } from '@/lib/server/views'

type CacheEntry = { data: unknown; expiresAt: number }
let overviewCache: CacheEntry | null = null
const CACHE_TTL_MS = 3_000

export async function GET() {
  try {
    const now = Date.now()
    if (overviewCache && overviewCache.expiresAt > now) {
      return Response.json(overviewCache.data)
    }
    const db = await getDb()
    const overview = await overviewView(db)
    overviewCache = { data: overview, expiresAt: now + CACHE_TTL_MS }
    return Response.json(overview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch overview data'
    return Response.json({ error: message }, { status: 500 })
  }
}
