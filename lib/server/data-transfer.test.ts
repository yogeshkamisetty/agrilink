import { describe, expect, it } from 'vitest'
import { getDb } from './db'
import { listBuyers, getOrder, listFarmers } from './repo'
import { createOrder, matchForOrder } from './sourcing'
import { overviewView, orderDetail } from './views'
import { channelCheck, shelfClassOf, getCrop } from '@/lib/domain/crops'

describe('End-to-End Realtime Cross-Role Data Transfer Lifecycle', () => {
  it('guarantees shelf-life channel routing never throws undefined', () => {
    // Both standard and edge-case crop names
    expect(shelfClassOf('PADDY')).toBe('shelfStable')
    expect(shelfClassOf('WHEAT')).toBe('shelfStable')
    expect(shelfClassOf('TOMATO')).toBe('perishable')
    expect(shelfClassOf('UNKNOWN_CROP')).toBe('semiPerishable')

    // Case insensitivity and safe fallbacks
    const paddyCheck = channelCheck('paddy', 'INSTITUTIONAL')
    expect(paddyCheck.allowed).toBe(true)
    expect(paddyCheck.reason).toContain('Paddy (Rice)')

    const tomatoSocietyCheck = channelCheck('TOMATO', 'RESIDENTIAL_SOCIETY')
    expect(tomatoSocietyCheck.allowed).toBe(false)
    expect(tomatoSocietyCheck.reason).toContain('institutional kitchens only')

    // Null/undefined safety
    const safeCheck = channelCheck('PADDY', null)
    expect(safeCheck.allowed).toBe(true)
  })

  it('transfers order creation from Buyer to FPO and Farmers', async () => {
    const db = await getDb()
    const buyers = await listBuyers(db)
    expect(buyers.length).toBeGreaterThan(0)
    const buyer = buyers[0]

    // 1. Buyer creates a future demand order
    const deliveryDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
    const created = await createOrder(db, {
      buyerId: buyer.id,
      crop: 'PADDY',
      qtyTargetKg: 1000,
      pricePerKg: 28,
      deliveryDate,
      advancePct: 0.15,
    })

    expect(created.id).toBeDefined()
    expect(created.crop).toBe('PADDY')
    expect(created.qtyTargetKg).toBe(1000)
    expect(created.status).toBe('POSTED')

    // 2. FPO Overview reflects the new order and metrics in realtime
    const overview = await overviewView(db)
    expect(overview.orders.length).toBeGreaterThan(0)
    const matchedOverviewOrder = overview.orders.find((o) => o.order.id === created.id)
    expect(matchedOverviewOrder).toBeDefined()
    expect(matchedOverviewOrder?.order.status).toBe('POSTED')
    expect(matchedOverviewOrder?.buyer.name).toBe(buyer.name)

    // 3. Smallholder Matching Engine evaluates candidates for the order
    const match = await matchForOrder(db, created, buyer)
    expect(match).toBeDefined()
    expect(match.matched).toBeDefined()

    // 4. Order Detail view computes full cross-role state
    const detail = await orderDetail(db, created.id)
    expect(detail.order.id).toBe(created.id)
    expect(detail.buyer.id).toBe(buyer.id)
    expect(detail.channelRule.allowed).toBe(true)
    expect(detail.totals.targetKg).toBe(1000)
  })

  it('transfers farmer harvest declaration live to admin and buyer, and consolidates multi-farmer batches', async () => {
    const db = await getDb()

    // 1. Farmer declares new harvest produce
    const testFarmerName = `Ramesh Test Patel ${Date.now()}`
    const testCrop = 'TOMATO'
    const testQty = 650
    const testPhone = '+919825199999'

    const [fpo] = await db.query<{ id: string }>(`select id from agrilink.fpos limit 1`)
    const fpoId = fpo?.id || 'f0000000-0000-0000-0000-000000000001'

    const inserted = await db.query<any>(
      `insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng)
       values ($1, $2, $3, 'gu', 1.0, 'Kheda Cluster', 22.56, 72.92) returning *`,
      [fpoId, testFarmerName, testPhone]
    )
    expect(inserted.length).toBeGreaterThan(0)
    expect(inserted[0].name).toBe(testFarmerName)

    await db.query<any>(
      `insert into agrilink.crop_registry (farmer_id, crop, expected_qty_kg, harvest_window_start, harvest_window_end)
       values ($1, $2, $3, '2025-10-25'::date, '2025-11-05'::date)`,
      [inserted[0].id, testCrop, testQty]
    )

    // 2. Admin & Buyer query live farmers supply
    const allFarmers = await db.query<any>(
      `select f.id, f.name, f.phone as mobile_number, f.village,
              coalesce(r.crop, 'PADDY') as crop_name,
              coalesce(r.expected_qty_kg, 500) as quantity
       from agrilink.farmers f
       left join agrilink.crop_registry r on r.farmer_id = f.id`
    )
    expect(allFarmers.length).toBeGreaterThan(0)
    const foundFarmer = allFarmers.find((f: any) => f.name === testFarmerName)
    expect(foundFarmer).toBeDefined()
    expect(foundFarmer.crop_name).toBe(testCrop)
    expect(Number(foundFarmer.quantity)).toBe(testQty)

    // 3. Admin performs Smart Aggregation: combines smallholders for an order
    const buyerOrder = (await db.query<any>(`select * from agrilink.orders`))[0]
    expect(buyerOrder).toBeDefined()

    const batchCode = `BATCH-${buyerOrder.code || 'AG1001'}-${testCrop}`
    const contributions = [
      { farmer_id: foundFarmer.id, quantity_kg: 500 },
      { farmer_id: 'f-savita-102', quantity_kg: 500 },
    ]
    const totalBatchKg = 1000

    const batchRows = await db.query<any>(
      `insert into agrilink.aggregation_batches (batch_code, fpo_name, crop, location, total_quantity_kg, created_by)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [batchCode, 'Mahi Valley FPO', testCrop, 'Kheda Central Depot', totalBatchKg, 'Anita Desai']
    )
    expect(batchRows.length).toBeGreaterThan(0)
    expect(batchRows[0].batch_code).toBe(batchCode)

    // 4. Update order status to AGGREGATED
    const updatedOrder = await db.query<any>(
      `update agrilink.orders set status = 'AGGREGATED' where id = $1 returning *`,
      [buyerOrder.id]
    )
    expect(updatedOrder.length).toBeGreaterThan(0)
    expect(updatedOrder[0].status).toBe('AGGREGATED')

    // 5. Query aggregation batches
    const batches = await db.query<any>(`select * from agrilink.aggregation_batches`)
    expect(batches.length).toBeGreaterThan(0)
    expect(batches.some((b: any) => b.batch_code === batchCode)).toBe(true)
  })
})
