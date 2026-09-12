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
})
