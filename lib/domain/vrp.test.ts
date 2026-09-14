import { describe, expect, it } from 'vitest'
import { FLEET, smallestFitting, tripCost, vehicleClass } from './fleet'
import { checkOrderPrice, priceBand } from './pricing'
import type { RouteStop } from './routing'
import { planConsolidation, type Shipment } from './vrp'

const depot: RouteStop = { id: 'depot', kind: 'DEPOT', label: 'Boriavi collection centre', lat: 22.613, lng: 72.936 }
const kitchen = { id: 'kitchen', lat: 22.553, lng: 72.923 }
const pickup = (id: string, lat: number, lng: number, kg: number): RouteStop => ({ id, kind: 'PICKUP', label: id, lat, lng, kg })
const shipment = (orderId: string, pickups: RouteStop[]): Shipment => ({
  orderId,
  code: orderId.toUpperCase(),
  pickups,
  drop: { id: kitchen.id, kind: 'DROP', label: 'School kitchen', lat: kitchen.lat, lng: kitchen.lng, kg: pickups.reduce((s, p) => s + (p.kg ?? 0), 0) },
})

describe('fleet', () => {
  it('picks the smallest vehicle that carries the load over the distance', () => {
    expect(smallestFitting(300, 20)?.id).toBe('E_LOADER')
    expect(smallestFitting(300, 80)?.id).toBe('MINI_TRUCK')
    expect(smallestFitting(700, 10)?.id).toBe('MINI_TRUCK')
    expect(smallestFitting(1600, 10)?.id).toBe('LCV')
    expect(smallestFitting(4000, 10)).toBeNull()
    expect(FLEET.map((v) => v.capacityKg)).toEqual(FLEET.map((v) => v.capacityKg).sort((a, b) => a - b))
  })

  it('prices a trip as a loading charge plus a per-km rate, with a minimum', () => {
    expect(tripCost(vehicleClass('MINI_TRUCK'), 20)).toBe(500)
    expect(tripCost(vehicleClass('MINI_TRUCK'), 50)).toBe(700)
  })
})

describe('multi-order consolidation', () => {
  it('merges nearby orders onto one right-sized vehicle when that is cheaper', () => {
    const plan = planConsolidation(depot, [shipment('a', [pickup('farm-1', 22.62, 72.93, 200)]), shipment('b', [pickup('farm-2', 22.63, 72.94, 250)])])
    expect(plan.runs).toHaveLength(1)
    expect(plan.runs[0]).toMatchObject({ orderIds: ['a', 'b'], loadKg: 450, count: 1 })
    expect(plan.runs[0].vehicle.id).toBe('MINI_TRUCK')
    expect(plan.separateCostRs).toBe(600)
    expect(plan.savedCostRs).toBe(plan.separateCostRs - plan.totalCostRs)
    expect(plan.savedCostRs).toBeGreaterThan(0)
  })

  it('never merges past the largest vehicle', () => {
    const plan = planConsolidation(depot, ['a', 'b', 'c'].map((id, i) => shipment(id, [pickup(`farm-${id}`, 22.62 + i * 0.01, 72.93, 2000)])))
    expect(plan.runs).toHaveLength(3)
    expect(plan.savedCostRs).toBe(0)
  })

  it('collects a farmer who supplies two orders in one stop', () => {
    const plan = planConsolidation(depot, [shipment('a', [pickup('farm-1', 22.62, 72.93, 100)]), shipment('b', [pickup('farm-1', 22.62, 72.93, 100)])])
    const stops = plan.runs[0].route.sequence.filter((s) => s.kind === 'PICKUP')
    expect(stops).toEqual([expect.objectContaining({ id: 'farm-1', kg: 200 })])
  })

  it('sends several of the largest vehicles for an order that outweighs one', () => {
    const [run] = planConsolidation(depot, [shipment('a', [pickup('farm-1', 22.62, 72.93, 5000)])]).runs
    expect(run).toMatchObject({ count: 2, utilisationPct: 71 })
    expect(run.vehicle.id).toBe('LCV')
  })
})

describe('price corridor', () => {
  it('prices between mandi and retail and shows who gains what', () => {
    expect(priceBand({ mandiPerKg: 13, retailPerKg: 28, logisticsPerKg: 1 })).toEqual({
      mandiPerKg: 13,
      retailPerKg: 28,
      fairPricePerKg: 21,
      logisticsPerKg: 1,
      farmerGainPerKg: 7,
      buyerSavingPerKg: 7,
      traditionalFarmerSharePct: 46,
      directFarmerSharePct: 95,
    })
  })

  it('refuses a price below the mandi and warns above retail', () => {
    const below = checkOrderPrice(12, 13, 28)
    expect(below.ok).toBe(false)
    expect(below.ok ? '' : below.reason).toMatch(/below the mandi/)
    expect(checkOrderPrice(30, 13, 28)).toEqual({ ok: true, warnings: [expect.stringMatching(/above the retail/)] })
    expect(checkOrderPrice(20, null, null)).toEqual({ ok: true, warnings: [] })
    expect(checkOrderPrice(0, null, null).ok).toBe(false)
  })
})
