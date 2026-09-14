import { requireRole } from '@/lib/server/auth'
import { canReset, getDb, resetDatabase } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse } from '@/lib/server/http'

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin')
    const db = await getDb()
    if (!canReset(db)) throw new DomainError('Database reset is disabled in production.', 403)
    await resetDatabase(db)
    return Response.json({ success: true, message: 'Database reset to initial seed state.' })
  } catch (error) {
    return errorResponse(error, 'Database reset failed.')
  }
}
