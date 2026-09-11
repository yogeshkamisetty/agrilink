import { allocateTransport, round2 } from '@/lib/domain/money'
import type { RoutePlan, RouteStop } from '@/lib/domain/routing'
import type { Buyer, Consignment, Order, StoredRoute } from '@/lib/types'
import { clock } from './clock'
import { uuidArray, type Db } from './db'
import { DomainError } from './errors'
import { sendMessage } from './messages'
import { optimiseRoute } from './optimizer'
import { getBuyer, getCommitments, getFarmersByIds, getFpo, getLots, lockOrder, mapRow, mapRows } from './repo'
import { tick } from './sourcing'

/** Hired pickup (Tata Ace class): a loading charge plus a per-km rate. Editable at dispatch. */
export function suggestVehicleCost(km: number): number {
  return Math.max(500, Math.round((200 + 10 * km) / 50) * 50)
}

async function loadOrders(db: Db, orderIds: string[]) {
  if (!orderIds.length) throw new DomainError('Select at least one order.', 400)
  const orders = mapRows<Order>(await db.query('select * from agrilink.orders where id = any($1::uuid[]) order by created_at', [uuidArray(orderIds)]))
  if (orders.length !== new Set(orderIds).size) throw new DomainError('One or more orders were not found.', 404)
  if (new Set(orders.map((o) => o.fpoId)).size > 1) throw new DomainError('A consignment can only carry orders from one FPO.', 400)
  return orders
}

/**
 * Stops for a vehicle run. Once collection has started, pickups are the
 * farmers whose lots were accepted; before that, the plan uses active primary
 * commitments. Stops arrive in commitment/collection order — the naive
 * baseline the optimised route is compared against.
 */
async function buildStops(db: Db, orders: Order[]) {
  const fpo = await getFpo(db, orders[0].fpoId)
  const depot: RouteStop = { id: 'depot', kind: 'DEPOT', label: `${fpo.village} collection centre`, detail: fpo.name, lat: fpo.lat, lng: fpo.lng }
  const pickupKg = new Map<string, { kg: number; lines: string[]; firstAt: string }>()
  const drops: RouteStop[] = []
  const buyers = new Map<string, Buyer>()
  let planned = false

  for (const order of orders) {
    const lots = (await getLots(db, order.id)).filter((l) => l.qtyAcceptedKg > 0)
    const sources = lots.length
      ? lots.map((l) => ({ farmerId: l.farmerId, kg: l.qtyAcceptedKg, at: l.capturedAt }))
      : (await getCommitments(db, order.id)).filter((c) => c.status === 'ACTIVE' && !c.isStandby).map((c) => ({ farmerId: c.farmerId, kg: c.qtyCommittedKg, at: c.createdAt }))
    if (!lots.length) planned = true
    for (const s of sources) {
      const entry = pickupKg.get(s.farmerId) ?? { kg: 0, lines: [], firstAt: s.at }
      entry.kg = round2(entry.kg + s.kg)
      entry.lines.push(`${s.kg} kg ${order.crop.toLowerCase()} · ${order.code}`)
      entry.firstAt = entry.firstAt < s.at ? entry.firstAt : s.at
      pickupKg.set(s.farmerId, entry)
    }
    const buyer = buyers.get(order.buyerId) ?? (await getBuyer(db, order.buyerId))
    buyers.set(buyer.id, buyer)
    const existing = drops.find((d) => d.id === buyer.id)
    const orderKg = round2(sources.reduce((sum, s) => sum + s.kg, 0))
    if (existing) {
      existing.kg = round2((existing.kg ?? 0) + orderKg)
      existing.detail += ` · ${order.code}`
    } else {
      drops.push({ id: buyer.id, kind: 'DROP', label: buyer.name, detail: `Drop · ${order.code}`, kg: orderKg, lat: buyer.lat, lng: buyer.lng })
    }
  }

  const farmers = await getFarmersByIds(db, [...pickupKg.keys()])
  const pickups: RouteStop[] = [...pickupKg.entries()]
    .sort((a, b) => a[1].firstAt.localeCompare(b[1].firstAt))
    .map(([farmerId, p]) => {
      const f = farmers.get(farmerId)!
      return { id: farmerId, kind: 'PICKUP', label: f.village, detail: `${f.name} · ${p.lines.join(', ')}`, kg: p.kg, lat: f.lat, lng: f.lng }
    })
  return { depot, pickups, drops, planned }
}

export async function routePreview(db: Db, orderIds: string[]) {
  for (const id of orderIds) await tick(db, id)
  const orders = await loadOrders(db, orderIds)
  const bad = orders.find((o) => !['SOURCING', 'COLLECTING', 'DISPATCHED'].includes(o.status))
  if (bad) throw new DomainError(`${bad.code} has no farmer commitments to route yet.`, 400)
  const { depot, pickups, drops, planned } = await buildStops(db, orders)
  if (!pickups.length) throw new DomainError('No committed or collected lots to route yet.', 400)
  const plan = await optimiseRoute(depot, pickups, drops)
  return { plan, planned, suggestedVehicleCost: suggestVehicleCost(plan.km), totalKg: round2(pickups.reduce((s, p) => s + (p.kg ?? 0), 0)) }
}

export type DispatchInput = { orderIds: string[]; vehicleCost: number; vehicleLabel: string }

/**
 * Close collection and send the consignment. Computes the route over the
 * actual pickups, splits the vehicle cost across every accepted lot by kg,
 * releases standby farmers who were not needed, and marks uncollected
 * primary commitments as no-shows.
 */
export async function dispatch(db: Db, input: DispatchInput): Promise<Consignment> {
  if (!(input.vehicleCost >= 0) || input.vehicleCost > 100_000) throw new DomainError('Vehicle cost must be between ₹0 and ₹1,00,000.', 400)
  const orders = await loadOrders(db, input.orderIds)
  for (const order of orders) {
    if (order.status !== 'COLLECTING') throw new DomainError(`${order.code} is not ready to dispatch — ${order.status === 'DISPATCHED' || order.status === 'SETTLED' ? 'it has already left' : 'no lots have been collected yet'}.`)
  }
  const { depot, pickups, drops, planned } = await buildStops(db, orders)
  if (planned || !pickups.length) throw new DomainError('Every order in the consignment needs at least one accepted lot.')
  // Solve outside the transaction: the OR-Tools call is a network hop.
  const plan: RoutePlan = await optimiseRoute(depot, pickups, drops)
  const lotIdsAtPlan = (await db.query<{ id: string }>(`select id from agrilink.lots where order_id = any($1::uuid[]) and qty_accepted_kg > 0 order by id`, [uuidArray(input.orderIds)])).map((r) => r.id)

  return db.tx(async (tx) => {
    const now = clock.now()
    const locked = []
    for (const order of orders) locked.push(await lockOrder(tx, order.id))
    if (locked.some((o) => o.status !== 'COLLECTING')) throw new DomainError('An order changed while dispatching — refresh and try again.')
    const lots = await tx.query<{ id: string; qty_accepted_kg: number }>(`select id, qty_accepted_kg from agrilink.lots where order_id = any($1::uuid[]) and qty_accepted_kg > 0 order by id`, [uuidArray(input.orderIds)])
    if (lots.map((l) => l.id).join() !== lotIdsAtPlan.join()) throw new DomainError('Lots changed while dispatching — refresh and try again.')

    const route: StoredRoute = { ...plan, orderIds: input.orderIds }
    const [row] = await tx.query(`insert into agrilink.consignments (vehicle_label, vehicle_cost, route_json, dispatched_at) values ($1, $2, $3::jsonb, $4) returning *`, [
      input.vehicleLabel.trim() || 'Hired pickup',
      round2(input.vehicleCost),
      JSON.stringify(route),
      now,
    ])
    const consignment = mapRow<Consignment>(row)

    const shares = allocateTransport(input.vehicleCost, lots.map((l) => ({ id: l.id, kg: l.qty_accepted_kg })))
    for (const [lotId, share] of shares) await tx.query('update agrilink.lots set transport_share = $2 where id = $1', [lotId, share])
    // Rejected lots rode no truck.
    await tx.query(`update agrilink.lots set transport_share = 0 where order_id = any($1::uuid[]) and qty_accepted_kg = 0`, [uuidArray(input.orderIds)])

    for (const order of locked) {
      await tx.query(`update agrilink.orders set status = 'DISPATCHED', consignment_id = $2 where id = $1`, [order.id, consignment.id])
      const released = await tx.query<{ farmer_id: string; qty_committed_kg: number }>(
        `update agrilink.commitments set status = 'RELEASED' where order_id = $1 and status = 'ACTIVE' and is_standby returning farmer_id, qty_committed_kg`,
        [order.id],
      )
      await tx.query(`update agrilink.commitments set status = 'NO_SHOW' where order_id = $1 and status = 'ACTIVE'`, [order.id])
      const farmers = await getFarmersByIds(tx, released.map((r) => r.farmer_id))
      for (const r of released) {
        await sendMessage(tx, { orderId: order.id, farmer: farmers.get(r.farmer_id)!, channel: 'SMS', kind: 'RELEASED', template: 'RELEASED', params: { crop: order.crop, qty: r.qty_committed_kg }, at: now })
      }
    }
    return consignment
  })
}
