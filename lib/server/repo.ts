import type { AdvanceRecord, Buyer, Commitment, Consignment, Farmer, Fpo, Lot, Notification, Order, RegistryEntry, Settlement } from '@/lib/types'
import { uuidArray, type Db, type Row } from './db'
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

export async function getOrdersByIds(db: Db, ids: string[]): Promise<Map<string, Order>> {
  if (!ids.length) return new Map()
  const rows = mapRows<Order>(await db.query('select * from agrilink.orders where id = any($1::uuid[])', [uuidArray(ids)]))
  return new Map(rows.map((o) => [o.id, o]))
}

export async function getCommitments(db: Db, orderId: string) {
  return mapRows<Commitment>(await db.query('select * from agrilink.commitments where order_id = $1 order by created_at, id', [orderId]))
}

export async function getCommitmentsByOrderIds(db: Db, orderIds: string[]): Promise<Map<string, Commitment[]>> {
  const map = new Map<string, Commitment[]>()
  if (!orderIds.length) return map
  for (const id of orderIds) map.set(id, [])
  const rows = mapRows<Commitment>(await db.query('select * from agrilink.commitments where order_id = any($1::uuid[]) order by created_at, id', [uuidArray(orderIds)]))
  for (const r of rows) {
    map.get(r.orderId)?.push(r)
  }
  return map
}

export async function getLots(db: Db, orderId: string) {
  return mapRows<Lot>(await db.query('select * from agrilink.lots where order_id = $1 order by captured_at, id', [orderId]))
}

export async function getLotsByOrderIds(db: Db, orderIds: string[]): Promise<Map<string, Lot[]>> {
  const map = new Map<string, Lot[]>()
  if (!orderIds.length) return map
  for (const id of orderIds) map.set(id, [])
  const rows = mapRows<Lot>(await db.query('select * from agrilink.lots where order_id = any($1::uuid[]) order by captured_at, id', [uuidArray(orderIds)]))
  for (const r of rows) {
    map.get(r.orderId)?.push(r)
  }
  return map
}

export async function getAdvances(db: Db, orderId: string) {
  return mapRows<AdvanceRecord>(await db.query('select * from agrilink.advance_records where order_id = $1 order by disbursed_at, id', [orderId]))
}

export async function getSettlements(db: Db, orderId: string) {
  return mapRows<Settlement>(await db.query('select * from agrilink.settlements where order_id = $1 order by created_at, id', [orderId]))
}

export async function getSettlementsByLotIds(db: Db, lotIds: string[]): Promise<Map<string, Settlement>> {
  if (!lotIds.length) return new Map()
  const rows = mapRows<Settlement>(await db.query('select * from agrilink.settlements where lot_id = any($1::uuid[])', [uuidArray(lotIds)]))
  return new Map(rows.map((s) => [s.lotId, s]))
}

export async function getAdvancesByLotIds(db: Db, lotIds: string[]): Promise<Map<string, number>> {
  if (!lotIds.length) return new Map()
  const rows = await db.query<{ lot_id: string; amount: number }>('select lot_id, amount from agrilink.advance_records where lot_id = any($1::uuid[])', [uuidArray(lotIds)])
  return new Map(rows.map((a) => [a.lot_id, a.amount as number]))
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
  const rows = mapRows<Farmer>(await db.query('select * from agrilink.farmers where id = any($1::uuid[])', [uuidArray(ids)]))
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
