import { NextResponse } from 'next/server'
import { getDb, resetDatabase, canReset } from '@/lib/server/db'

export async function GET() {
  try {
    const db = await getDb()
    
    // Check tables in agrilink schema
    const tablesToCheck = ['fpos', 'farmers', 'buyer_requests', 'orders', 'lots', 'notifications']
    const tableResults: Record<string, { exists: boolean; count: number }> = {}

    for (const table of tablesToCheck) {
      try {
        const rows = await db.query<{ count: number }>(
          `select count(*)::int as count from agrilink.${table}`
        )
        tableResults[table] = { exists: true, count: rows[0]?.count ?? 0 }
      } catch {
        tableResults[table] = { exists: false, count: 0 }
      }
    }

    let schemaVersion = 'unknown'
    try {
      const metaRows = await db.query<{ value: string }>(
        `select value from agrilink.meta where key = 'schema_version'`
      )
      schemaVersion = metaRows[0]?.value || 'missing'
    } catch {
      schemaVersion = 'missing'
    }

    return NextResponse.json({
      status: 'healthy',
      driver: db.kind,
      schemaVersion,
      tables: tableResults,
      environment: {
        isVercel: Boolean(process.env.VERCEL),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        nodeEnv: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Database diagnostic check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const db = await getDb()

    if (body.action === 'reset') {
      if (!canReset(db)) {
        return NextResponse.json(
          { error: 'Database reset is disabled in this environment.' },
          { status: 403 }
        )
      }
      await resetDatabase(db)
      return NextResponse.json({
        success: true,
        message: 'Database schema reset and re-seeded successfully.',
        driver: db.kind,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection confirmed and schema active.',
      driver: db.kind,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Database operation failed',
      },
      { status: 500 }
    )
  }
}
