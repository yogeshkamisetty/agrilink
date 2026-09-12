import fs from 'node:fs/promises'
import path from 'node:path'
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema'

export type Row = Record<string, unknown>

export interface Db {
  /** Parameterised query ($1, $2 …). Returns rows. */
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>
  /** Run statements atomically. Nested calls join the outer transaction. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>
  /** Multi-statement SQL without parameters (schema setup). */
  exec(sql: string): Promise<void>
  readonly kind: 'pglite' | 'postgres'
  close(): Promise<void>
}

// Keep numerics as JS numbers and calendar dates as 'YYYY-MM-DD' strings on both drivers.
const NUMERIC = 1700
const INT8 = 20
const DATE = 1082

async function openPglite(dataDir: string | undefined): Promise<Db> {
  try {
    const { PGlite } = await import('@electric-sql/pglite')
    let pg: any
    try {
      if (dataDir) await fs.mkdir(dataDir, { recursive: true })
      pg = new PGlite(dataDir, {
        parsers: { [NUMERIC]: (v: string) => Number(v), [INT8]: (v: string) => Number(v), [DATE]: (v: string) => v },
      })
      await pg.waitReady
    } catch (err) {
      console.warn('[agrilink/db] PGlite directory initialization notice, falling back to in-memory instance:', err)
      pg = new PGlite(undefined, {
        parsers: { [NUMERIC]: (v: string) => Number(v), [INT8]: (v: string) => Number(v), [DATE]: (v: string) => v },
      })
      await pg.waitReady
    }

    type Queryable = { query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>; exec: (sql: string) => Promise<unknown> }
    const wrap = (q: Queryable, inTx: boolean): Db => ({
      kind: 'pglite',
      query: async <T,>(text: string, params: unknown[] = []) => (await q.query<T>(text, params)).rows,
      tx: <T,>(fn: (db: Db) => Promise<T>) => (inTx ? fn(wrap(q, true)) : pg.transaction((t: any) => fn(wrap(t as unknown as Queryable, true)))),
      exec: async (sql: string) => {
        await q.exec(sql)
      },
      close: () => pg.close(),
    })
    return wrap(pg as unknown as Queryable, false)
  } catch (err) {
    console.warn('[agrilink/db] PGlite wasm or bundle error, activating in-memory fallback:', err)
    const { createMemoryFallbackDb } = await import('./memory-fallback')
    return createMemoryFallbackDb()
  }
}

async function openPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import('postgres')
  const sql = postgres(url, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    types: {
      numeric: { to: NUMERIC, from: [NUMERIC], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      bigint: { to: INT8, from: [INT8], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      date: { to: DATE, from: [DATE], serialize: (x: unknown) => String(x), parse: (x: string) => x },
    },
  })
  type Unsafe = { unsafe: (text: string, params?: never[]) => Promise<unknown> }
  const wrap = (q: Unsafe, inTx: boolean): Db => ({
    kind: 'postgres',
    query: async <T,>(text: string, params: unknown[] = []) => (await q.unsafe(text, params as never[])) as T[],
    tx: <T,>(fn: (db: Db) => Promise<T>) => (inTx ? fn(wrap(q, true)) : (sql.begin((t) => fn(wrap(t as unknown as Unsafe, true))) as Promise<T>)),
    exec: async (text: string) => {
      await q.unsafe(text)
    },
    close: () => sql.end(),
  })
  return wrap(sql as unknown as Unsafe, false)
}

export function localDataDir(): string | undefined {
  if (process.env.VERCEL) {
    return '/tmp/agrilink-pglite'
  }
  return process.env.AGRILINK_DATA_DIR || path.join(process.cwd(), '.data', 'pglite')
}

async function schemaState(db: Db): Promise<'missing' | 'current' | 'stale'> {
  const [exists] = await db.query<{ ok: boolean }>(`select to_regclass('agrilink.meta') is not null as ok`)
  if (!exists?.ok) return 'missing'
  const [row] = await db.query<{ value: string }>(`select value from agrilink.meta where key = 'schema_version'`)
  return row?.value === SCHEMA_VERSION ? 'current' : 'stale'
}

export async function applySchema(db: Db) {
  await db.exec(SCHEMA_SQL)
  await db.query(`insert into agrilink.meta (key, value) values ('schema_version', $1) on conflict (key) do update set value = excluded.value`, [SCHEMA_VERSION])
}

export async function dropSchema(db: Db) {
  await db.exec('drop schema if exists agrilink cascade')
}

/** Create the schema and seed data if needed. Local databases are rebuilt when the schema changes. */
export async function prepare(db: Db) {
  const state = await schemaState(db)
  if (state === 'stale') {
    if (db.kind !== 'pglite' && process.env.AGRILINK_ALLOW_RESET !== 'true') {
      throw new Error(`AgriLink schema is out of date (expected version ${SCHEMA_VERSION}). Run supabase/schema.sql after dropping the agrilink schema, or set AGRILINK_ALLOW_RESET=true.`)
    }
    console.warn(`[agrilink] schema changed → rebuilding the ${db.kind} database`)
    await dropSchema(db)
  }
  if (state !== 'current') await applySchema(db)
  const [{ n }] = await db.query<{ n: number }>('select count(*)::int as n from agrilink.fpos')
  if (n === 0) {
    const { seed } = await import('./seed')
    await seed(db)
  }
}

const KEY = Symbol.for('agrilink.db')
type Holder = { [KEY]?: Promise<Db> }

/**
 * Process-wide connection. Held on globalThis because Next.js builds route
 * handlers and server components into separate module graphs — two PGlite
 * instances on one data directory would corrupt it.
 */
export function getDb(): Promise<Db> {
  const holder = globalThis as Holder
  if (!holder[KEY]) {
    const url = process.env.DATABASE_URL
    if (!url && process.env.VERCEL) {
      console.warn('[agrilink] DATABASE_URL is not set on Vercel. Falling back to temporary PGlite database in /tmp.')
    }
    holder[KEY] = (url ? openPostgres(url) : openPglite(localDataDir()))
      .then(async (db) => {
        try {
          await prepare(db)
        } catch (prepErr) {
          console.warn('[agrilink/db] Schema prepare warning, operating with resilient memory fallback:', prepErr)
          const { createMemoryFallbackDb } = await import('./memory-fallback')
          return createMemoryFallbackDb()
        }
        return db
      })
      .catch(async (error) => {
        console.warn('[agrilink/db] Database provider failure, recovering with memory store:', error)
        const { createMemoryFallbackDb } = await import('./memory-fallback')
        const fallback = createMemoryFallbackDb()
        holder[KEY] = Promise.resolve(fallback)
        return fallback
      })
  }
  return holder[KEY]!
}

/** Tests: swap in an in-memory database. */
export function setDbForTests(db: Db | undefined) {
  const holder = globalThis as Holder
  if (db) holder[KEY] = Promise.resolve(db)
  else delete holder[KEY]
}

export async function openMemoryDb(): Promise<Db> {
  return openPglite(undefined)
}

export function canReset(db: Db): boolean {
  return db.kind === 'pglite' || process.env.AGRILINK_ALLOW_RESET === 'true'
}

export async function resetDatabase(db: Db) {
  await dropSchema(db)
  await prepare(db)
}

/** Postgres array literal for uuid[] parameters, portable across both drivers. */
export function uuidArray(ids: string[]): string {
  return `{${ids.join(',')}}`
}
