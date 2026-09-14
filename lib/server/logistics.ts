import { round2 } from '@/lib/domain/money'
import { planConsolidation, type ConsolidationPlan, type Shipment } from '@/lib/domain/vrp'
import type { Order } from '@/lib/types'
import type { Db } from './db'
import { depotStop, shipmentFor } from './dispatch'
import { getFpo, mapRows } from './repo'
import { tickAllSourcing } from './sourcing'

export type CollectionPlan = Awaited<ReturnType<typeof consolidationPlan>>

/**
 * Plan the collection runs for orders that have farmers lined up but have not
 * left yet. Orders are grouped by collection centre and delivery date — a
 * vehicle run serves one day — and each group is consolidated into vehicle
 * runs. Before collection the plan uses active primary commitments; once lots
 * are accepted it uses the weighed quantities.
 */
export async function consolidationPlan(db: Db, input: { orderIds?: string[] | null; deliveryDate?: string | null } = {}) {
  await tickAllSourcing(db)
  let orders = mapRows<Order>(await db.query(`select * from agrilink.orders where status in ('SOURCING', 'COLLECTING') order by delivery_date, created_at`))
  if (input.orderIds?.length) {
    const wanted = new Set(input.orderIds)
    orders = orders.filter((o) => wanted.has(o.id))
  }
  if (input.deliveryDate) orders = orders.filter((o) => o.deliveryDate === input.deliveryDate)

  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const key = `${order.fpoId}|${order.deliveryDate}`
    groups.set(key, [...(groups.get(key) ?? []), order])
  }

  const plans: Array<{ deliveryDate: string; fpoName: string; plannedFromCommitments: boolean; unroutedOrders: string[]; plan: ConsolidationPlan }> = []
  for (const group of groups.values()) {
    const fpo = await getFpo(db, group[0].fpoId)
    const shipments: Shipment[] = []
    const unrouted: string[] = []
    let planned = false
    for (const order of group) {
      const shipment = await shipmentFor(db, order)
      if (!shipment.pickups.length) {
        unrouted.push(order.code)
        continue
      }
      planned ||= shipment.planned
      shipments.push(shipment)
    }
    if (!shipments.length) continue
    plans.push({ deliveryDate: group[0].deliveryDate, fpoName: fpo.name, plannedFromCommitments: planned, unroutedOrders: unrouted, plan: planConsolidation(depotStop(fpo), shipments) })
  }

  const sum = (pick: (p: ConsolidationPlan) => number) => round2(plans.reduce((s, p) => s + pick(p.plan), 0))
  return {
    orders: orders.length,
    plans,
    totals: {
      runs: plans.reduce((s, p) => s + p.plan.runs.length, 0),
      kg: sum((p) => p.totalKg),
      km: sum((p) => p.totalKm),
      costRs: sum((p) => p.totalCostRs),
      separateKm: sum((p) => p.separateKm),
      separateCostRs: sum((p) => p.separateCostRs),
      savedKm: sum((p) => p.savedKm),
      savedCostRs: sum((p) => p.savedCostRs),
    },
  }
}
