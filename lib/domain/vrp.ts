import { LARGEST_VEHICLE, smallestFitting, tripCost, type VehicleClass } from './fleet'
import { round2 } from './money'
import { planRoute, type RoutePlan, type RouteStop } from './routing'

/** One order's share of a collection run: the farms it is picked up from and the buyer it is dropped at. */
export type Shipment = { orderId: string; code: string; pickups: RouteStop[]; drop: RouteStop }

export type VehicleRun = {
  vehicle: VehicleClass
  /** More than one only when a single order outweighs the largest vehicle. */
  count: number
  orderIds: string[]
  codes: string[]
  loadKg: number
  utilisationPct: number
  route: RoutePlan
  costRs: number
}

export type ConsolidationPlan = {
  runs: VehicleRun[]
  totalKg: number
  totalKm: number
  totalCostRs: number
  costPerKgRs: number | null
  /** Every order on its own vehicle — the baseline the plan is measured against. */
  separateKm: number
  separateCostRs: number
  savedKm: number
  savedCostRs: number
  algorithm: string
}

const shipmentKg = (s: Shipment) => round2(s.pickups.reduce((sum, p) => sum + (p.kg ?? 0), 0))

/** A farmer supplying two orders on the same run is one stop, carrying both loads. */
function mergeStops(stops: RouteStop[]): RouteStop[] {
  const byId = new Map<string, RouteStop>()
  for (const stop of stops) {
    const existing = byId.get(stop.id)
    if (!existing) {
      byId.set(stop.id, { ...stop })
      continue
    }
    existing.kg = round2((existing.kg ?? 0) + (stop.kg ?? 0))
    if (stop.detail && stop.detail !== existing.detail) existing.detail = existing.detail ? `${existing.detail} · ${stop.detail}` : stop.detail
  }
  return [...byId.values()]
}

export function buildRun(depot: RouteStop, shipments: Shipment[]): VehicleRun {
  const loadKg = round2(shipments.reduce((sum, s) => sum + shipmentKg(s), 0))
  const route = planRoute(depot, mergeStops(shipments.flatMap((s) => s.pickups)), mergeStops(shipments.map((s) => s.drop)))
  const fitting = smallestFitting(loadKg, route.km)
  const vehicle = fitting ?? LARGEST_VEHICLE
  const count = fitting ? 1 : Math.max(1, Math.ceil(loadKg / LARGEST_VEHICLE.capacityKg))
  return {
    vehicle,
    count,
    orderIds: shipments.map((s) => s.orderId),
    codes: shipments.map((s) => s.code),
    loadKg,
    utilisationPct: Math.round((loadKg / (vehicle.capacityKg * count)) * 100),
    route,
    costRs: tripCost(vehicle, route.km) * count,
  }
}

const runKm = (run: VehicleRun) => run.route.km * run.count

/**
 * Consolidate a day's orders from one collection centre into as few, as
 * cheap vehicle runs as possible. Clarke–Wright savings: start with one run
 * per order, then repeatedly merge the pair of runs whose combined run costs
 * the most less than the two separately, while the load still fits the
 * largest vehicle. Each candidate run is sequenced with the pickup-then-drop
 * nearest-neighbour + 2-opt planner and priced on the smallest vehicle that
 * carries it, so savings reflect both shorter distance and right-sized
 * vehicles.
 */
export function planConsolidation(depot: RouteStop, shipments: Shipment[]): ConsolidationPlan {
  type Group = { key: number; shipments: Shipment[]; run: VehicleRun }
  let nextKey = 0
  let groups: Group[] = shipments.filter((s) => s.pickups.length > 0).map((s) => ({ key: nextKey++, shipments: [s], run: buildRun(depot, [s]) }))

  const separateKm = round2(groups.reduce((sum, g) => sum + runKm(g.run), 0))
  const separateCostRs = groups.reduce((sum, g) => sum + g.run.costRs, 0)

  const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
  const candidates = new Map<string, { run: VehicleRun; saving: number }>()
  const evaluate = (a: Group, b: Group) => {
    if (a.run.loadKg + b.run.loadKg > LARGEST_VEHICLE.capacityKg) return
    const run = buildRun(depot, [...a.shipments, ...b.shipments])
    candidates.set(pairKey(a.key, b.key), { run, saving: a.run.costRs + b.run.costRs - run.costRs })
  }
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) evaluate(groups[i], groups[j])

  for (;;) {
    let best: { a: Group; b: Group; run: VehicleRun; saving: number } | null = null
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const candidate = candidates.get(pairKey(groups[i].key, groups[j].key))
        if (!candidate || candidate.saving <= 0) continue
        if (!best || candidate.saving > best.saving || (candidate.saving === best.saving && candidate.run.route.km < best.run.route.km)) {
          best = { a: groups[i], b: groups[j], ...candidate }
        }
      }
    }
    if (!best) break
    const merged: Group = { key: nextKey++, shipments: [...best.a.shipments, ...best.b.shipments], run: best.run }
    groups = groups.filter((g) => g !== best!.a && g !== best!.b)
    for (const g of groups) evaluate(g, merged)
    groups.push(merged)
  }

  const runs = groups.map((g) => g.run)
  const totalKg = round2(runs.reduce((sum, r) => sum + r.loadKg, 0))
  const totalKm = round2(runs.reduce((sum, r) => sum + runKm(r), 0))
  const totalCostRs = runs.reduce((sum, r) => sum + r.costRs, 0)
  return {
    runs,
    totalKg,
    totalKm,
    totalCostRs,
    costPerKgRs: totalKg > 0 ? round2(totalCostRs / totalKg) : null,
    separateKm,
    separateCostRs,
    savedKm: round2(separateKm - totalKm),
    savedCostRs: separateCostRs - totalCostRs,
    algorithm: 'Clarke–Wright savings over orders; each run sequenced by nearest-neighbour + 2-opt (pickups before drops) on the smallest vehicle class that fits',
  }
}
