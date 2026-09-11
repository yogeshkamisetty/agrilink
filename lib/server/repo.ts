import type { AdvanceRecord, Buyer, Commitment, Consignment, Farmer, Fpo, Lot, Notification, Order, RegistryEntry, Settlement } from '@/lib/types'
import type { Db, Row } from './db'
import { notFound } from './errors'

/** snake_case row → camelCase record, timestamps → ISO strings. */
export function mapRow<T>(row: Row): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value instanceof Date ? value.toISOString() : value
  }
  return out as T
}

export const mapRows = <T,>(rows: Row[]) => rows.map((r) => mapRow<T>(r))

async function one<T>(db: Db, sql: string, params: unknown[], what: string): Promise<T> {
  const [row] = await db.query(sql, params)
  if (!row) throw notFound(what)
  return mapRow<T>(row)
}

export const getOrder = (db: Db, id: string) => one<Order>(db, 'select * from agrilink.orders where id = $1', [id], 'Order')
/** Row-locks the order so concurrent actions on it serialise. Call inside a transaction. */
export const lockOrder = (db: Db, id: string) => one<Order>(db, 'select * from agrilink.orders where id = $1 for update', [id], 'Order')
export const getBuyer = (db: Db, id: string) => one<Buyer>(db, 'select * from agrilink.buyers where id = $1', [id], 'Buyer')
export const getFarmer = (db: Db, id: string) => one<Farmer>(db, 'select * from agrilink.farmers where id = $1', [id], 'Farmer')
export const getFpo = (db: Db, id: string) => one<Fpo>(db, 'select * from agrilink.fpos where id = $1', [id], 'FPO')

export async function getCommitments(db: Db, orderId: string) {
  return mapRows<Commitment>(await db.query('select * from agrilink.commitments where order_id = $1 order by created_at, id', [orderId]))
}

export async function getLots(db: Db, orderId: string) {
  return mapRows<Lot>(await db.query('select * from agrilink.lots where order_id = $1 order by captured_at, id', [orderId]))
}

export async function getAdvances(db: Db, orderId: string) {
  return mapRows<AdvanceRecord>(await db.query('select * from agrilink.advance_records where order_id = $1 order by disbursed_at, id', [orderId]))
}

export async function getSettlements(db: Db, orderId: string) {
  return mapRows<Settlement>(await db.query('select * from agrilink.settlements where order_id = $1 order by created_at, id', [orderId]))
}

export async function getNotifications(db: Db, orderId: string) {
  return mapRows<Notification>(await db.query('select * from agrilink.notifications where order_id = $1 order by sent_at, id', [orderId]))
}

export async function getConsignment(db: Db, id: string | null) {
  if (!id) return null
  const [row] = await db.query('select * from agrilink.consignments where id = $1', [id])
  return row ? mapRow<Consignment>(row) : null
}

export async function getFarmersByIds(db: Db, ids: string[]) {
  if (!ids.length) return new Map<string, Farmer>()
  const rows = mapRows<Farmer>(await db.query('select * from agrilink.farmers where id = any($1::uuid[])', [`{${ids.join(',')}}`]))
  return new Map(rows.map((f) => [f.id, f]))
}

export async function getRegistryEntry(db: Db, id: string) {
  return one<RegistryEntry>(db, 'select * from agrilink.crop_registry where id = $1', [id], 'Registry entry')
}

export async function listBuyers(db: Db) {
  return mapRows<Buyer>(await db.query('select * from agrilink.buyers order by name'))
}

export async function listFarmers(db: Db) {
  return mapRows<Farmer>(await db.query('select * from agrilink.farmers order by name'))
}

export async function primaryFpo(db: Db) {
  return one<Fpo>(db, 'select * from agrilink.fpos order by created_at limit 1', [], 'FPO')
}
