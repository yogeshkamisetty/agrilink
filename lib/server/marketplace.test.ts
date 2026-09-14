import { beforeAll, describe, expect, it } from 'vitest'
import { isoDate } from '@/lib/domain/dates'
import { clock } from './clock'
import { openMemoryDb, prepare, type Db } from './db'
import { cropDemandForecast } from './forecasting'
import { consolidationPlan } from './logistics'
import { boardOrders, commitToDemand, coordinatorAllocate, declareHarvest, placeOrder, respondToAllocation, reviewOrder } from './marketplace'
import { getCommitments, getOrder } from './repo'
import { defaultDeliveryDate } from './seed'
import { commitAdvance } from './sourcing'

let db: Db
let delivery: string
/** Seeded farmer ids by name, buyer ids by buyer type. */
const ids: Record<string, string> = {}

beforeAll(async () => {
  db = await openMemoryDb()
  await prepare(db)
  delivery = defaultDeliveryDate(isoDate(clock.now()))
  for (const f of await db.query<{ id: string; name: string }>(`select id, name from agrilink.farmers`)) ids[f.name] = f.id
  for (const b of await db.query<{ id: string; type: string }>(`select id, type from agrilink.buyers`)) ids[b.type] = b.id
})

describe('marketplace order flow', () => {
  let smallOrderId = ''
  let bulkOrderId = ''

  it('never lets a buyer pay farmers less than the mandi', async () => {
    await expect(placeOrder(db, { buyerId: ids.INSTITUTIONAL, crop: 'TOMATO', qtyTargetKg: 30, pricePerKg: 5, deliveryDate: delivery })).rejects.toThrow(/below the mandi/)
  })

  it('routes a small order straight to the nearest farmer who can fill it', async () => {
    const placed = await placeOrder(db, { buyerId: ids.INSTITUTIONAL, crop: 'TOMATO', qtyTargetKg: 40, pricePerKg: 21, deliveryDate: delivery })
    smallOrderId = placed.order.id
    expect(placed.order).toMatchObject({ order_tier: 'SMALL', review_status: 'not_required', status: 'POSTED' })
    expect(placed.allocation?.farmer?.name).toBe('Kokilaben Rathod')
    const [asFarmer] = await boardOrders(db, { farmerId: ids['Kokilaben Rathod'] }, smallOrderId)
    expect(asFarmer.is_allocated_to_me).toBe(true)
  })

  it('moves a declined small order to the next nearest farmer', async () => {
    const { next } = await respondToAllocation(db, smallOrderId, ids['Kokilaben Rathod'], false)
    expect(next?.farmer?.name).toBe('Jignesh Chauhan')
    expect((await getOrder(db, smallOrderId)).declinedFarmerIds).toContain(ids['Kokilaben Rathod'])
    await expect(respondToAllocation(db, smallOrderId, ids['Kokilaben Rathod'], true)).rejects.toThrow(/not waiting/)
  })

  it('turns an accepted allocation into a primary commitment', async () => {
    await respondToAllocation(db, smallOrderId, ids['Jignesh Chauhan'], true)
    const order = await getOrder(db, smallOrderId)
    expect(order).toMatchObject({ status: 'SOURCING', allocationStatus: 'ACCEPTED' })
    const commitments = await getCommitments(db, smallOrderId)
    expect(commitments).toHaveLength(1)
    expect(commitments[0]).toMatchObject({ farmerId: ids['Jignesh Chauhan'], qtyCommittedKg: 40, isStandby: false, status: 'ACTIVE' })
  })

  it('holds bulk orders for review of their purpose before they can be funded', async () => {
    const paddy = { buyerId: ids.INSTITUTIONAL, crop: 'PADDY' as const, qtyTargetKg: 600, pricePerKg: 28, deliveryDate: delivery }
    await expect(placeOrder(db, paddy)).rejects.toThrow(/purpose/)
    const placed = await placeOrder(db, { ...paddy, purpose: 'Mid-day meal rice for 1,100 students' })
    bulkOrderId = placed.order.id
    expect(placed.order.review_status).toBe('pending')
    await expect(commitAdvance(db, bulkOrderId, ids.INSTITUTIONAL)).rejects.toThrow(/waiting for FPO review/)
    await reviewOrder(db, bulkOrderId, { decision: 'approved', reviewer: 'Anita Sharma' })
    expect((await commitAdvance(db, bulkOrderId, ids.INSTITUTIONAL)).status).toBe('FUNDED')
  })

  it('pools farmers into a funded order within the 115% cap', async () => {
    const { results, totals } = await coordinatorAllocate(db, bulkOrderId, [
      { farmerId: ids['Rameshbhai Patel'], qtyKg: 500 },
      { farmerId: ids['Mohanbhai Solanki'], qtyKg: 300 },
    ])
    expect(results.map((r) => r.status)).toEqual(['COMMITTED', 'COMMITTED'])
    expect(totals).toMatchObject({ targetKg: 600, capKg: 690, primaryKg: 600, standbyKg: 90 })
    expect((await getOrder(db, bulkOrderId)).status).toBe('SOURCING')
  })

  it('keeps the registry rules when farmers commit from the demand board', async () => {
    await expect(commitToDemand(db, bulkOrderId, ids['Suresh Yadav'], 100)).rejects.toThrow(/km from buyer/)
    await expect(commitToDemand(db, bulkOrderId, ids['Laxmiben Vaghela'], 100)).rejects.toThrow(/full/)
  })

  it('lets households order kitchen quantities of perishables, but not ration shops', async () => {
    const [household] = await db.query<{ id: string }>(
      `insert into agrilink.buyers (name, type, address, city, lat, lng, contact_name, contact_phone)
       values ('Test household', 'CONSUMER', 'Vallabh Vidyanagar', 'Anand', 22.55, 72.93, 'Test', '+91 98989 12121') returning id`,
    )
    const placed = await placeOrder(db, { buyerId: household.id, crop: 'TOMATO', qtyTargetKg: 5, pricePerKg: 21, deliveryDate: delivery })
    expect(placed.order.order_tier).toBe('SMALL')
    await expect(placeOrder(db, { buyerId: ids.FAIR_PRICE_SHOP, crop: 'TOMATO', qtyTargetKg: 40, pricePerKg: 21, deliveryDate: delivery })).rejects.toThrow(/institutional kitchens only/)
  })

  it('declares harvests without declaring away committed quantity', async () => {
    const declaration = { phone: '9812345678', name: 'Test Farmer', village: 'Anand', crop: 'TOMATO' as const, harvestStart: delivery }
    const first = await declareHarvest(db, { ...declaration, quantityKg: 120 })
    expect(first.created).toBe(true)
    const again = await declareHarvest(db, { ...declaration, quantityKg: 150 })
    expect(again).toMatchObject({ created: false, entry: { id: first.entry.id, expectedQtyKg: 150 } })
    await expect(declareHarvest(db, { phone: '9000010104', name: 'Jignesh Chauhan', village: 'Bakrol', crop: 'TOMATO', quantityKg: 30, harvestStart: delivery })).rejects.toThrow(/already committed/)
  })
})

describe('demand forecast and logistics on seeded data', () => {
  it('forecasts crop demand bottom-up and sets it against registered supply', async () => {
    const tomato = await cropDemandForecast(db, 'TOMATO', 4)
    expect(tomato.status).toBe('OK')
    expect(tomato.weeks).toHaveLength(4)
    expect(tomato.buyers.length).toBeGreaterThan(0)
    expect(tomato.totals.demandKg).toBeGreaterThan(0)
    expect(tomato.syntheticHistory).toBe(true)
    expect(tomato.balance?.status).toMatch(/SHORTFALL|SURPLUS|BALANCED/)
    const paddy = await cropDemandForecast(db, 'PADDY', 2)
    expect(paddy).toMatchObject({ status: 'OK', supplyMode: 'stock' })
  })

  it('consolidates the day’s committed orders into vehicle runs', async () => {
    const { plans, totals } = await consolidationPlan(db, { deliveryDate: delivery })
    expect(plans).toHaveLength(1)
    expect(totals.kg).toBe(640)
    for (const run of plans[0].plan.runs) expect(run.loadKg).toBeLessThanOrEqual(run.vehicle.capacityKg * run.count)
    expect(totals.costRs).toBeLessThanOrEqual(totals.separateCostRs)
  })
})
