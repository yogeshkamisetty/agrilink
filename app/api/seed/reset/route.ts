import { canReset, getDb, resetDatabase } from '@/lib/server/db'

export async function POST() {
  try {
    const db = await getDb()
    if (!canReset(db)) {
      return Response.json({ error: 'Database reset is disabled in production.' }, { status: 403 })
    }
    await resetDatabase(db)
    return Response.json({ success: true, message: 'Database reset to initial seed state.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database reset failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
