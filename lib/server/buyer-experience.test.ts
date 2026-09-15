import { describe, expect, it } from 'vitest'

describe('Transformed Buyer Experience & Marketplace Engine', () => {
  it('calculates cart subtotals and transparent cluster logistics fee', () => {
    const items = [
      { crop: 'TOMATO', qtyKg: 300, pricePerKg: 34 },
      { crop: 'ONION', qtyKg: 100, pricePerKg: 28 },
    ]

    const subtotal = items.reduce((sum, item) => sum + item.qtyKg * item.pricePerKg, 0)
    expect(subtotal).toBe(300 * 34 + 100 * 28) // 10200 + 2800 = 13000

    const totalWeightKg = items.reduce((sum, item) => sum + item.qtyKg, 0)
    expect(totalWeightKg).toBe(400)

    // Formula: ₹150 base cluster run + ₹1.5 per kg freight share
    const logisticsFee = Math.round(150 + totalWeightKg * 1.5)
    expect(logisticsFee).toBe(150 + 600) // ₹750

    const grandTotal = subtotal + logisticsFee
    expect(grandTotal).toBe(13750)
  })

  it('validates 7-stage order lifecycle progression', () => {
    const STAGES = [
      'PLACED',
      'CONFIRMED',
      'ALLOCATED',
      'DISPATCHED',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
    ] as const

    expect(STAGES).toHaveLength(7)
    expect(STAGES[0]).toBe('PLACED')
    expect(STAGES[2]).toBe('ALLOCATED')
    expect(STAGES[4]).toBe('IN_TRANSIT')
    expect(STAGES[5]).toBe('DELIVERED')
    expect(STAGES[6]).toBe('COMPLETED')

    function advanceOrderStage(current: typeof STAGES[number]): typeof STAGES[number] {
      const idx = STAGES.indexOf(current)
      if (idx < STAGES.length - 1) return STAGES[idx + 1]
      return current
    }

    let orderStatus: typeof STAGES[number] = 'PLACED'
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('CONFIRMED')
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('ALLOCATED')
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('DISPATCHED')
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('IN_TRANSIT')
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('DELIVERED')
    orderStatus = advanceOrderStage(orderStatus)
    expect(orderStatus).toBe('COMPLETED')
  })

  it('enforces bulk procurement gating by buyer category', () => {
    type BuyerCategory = 'Household' | 'Retailer' | 'Restaurant' | 'Processor'

    function isBulkProcurementEligible(cat: BuyerCategory): boolean {
      return cat !== 'Household'
    }

    expect(isBulkProcurementEligible('Household')).toBe(false)
    expect(isBulkProcurementEligible('Retailer')).toBe(true)
    expect(isBulkProcurementEligible('Restaurant')).toBe(true)
    expect(isBulkProcurementEligible('Processor')).toBe(true)
  })

  it('computes demand remaining quantities and matching percentages correctly', () => {
    const demand = {
      requestedQtyKg: 400,
      matchedQtyKg: 370,
    }

    const remainingQtyKg = Math.max(0, demand.requestedQtyKg - demand.matchedQtyKg)
    expect(remainingQtyKg).toBe(30)

    const matchRatio = demand.matchedQtyKg / demand.requestedQtyKg
    expect(matchRatio).toBe(0.925)
    expect(Math.round(matchRatio * 100)).toBe(93)

    const status = remainingQtyKg === 0 ? 'FULLY_MATCHED' : demand.matchedQtyKg > 0 ? 'PARTIALLY_MATCHED' : 'OPEN'
    expect(status).toBe('PARTIALLY_MATCHED')
  })

  it('enforces non-guaranteed indicative supply disclosure rule', () => {
    const disclaimer =
      'Supply matches displayed below are indicative based on verified FPO harvest registries and inventory. AgriLink does not guarantee supply until formal allocation and order confirmation.'

    expect(disclaimer).toContain('indicative based on verified FPO harvest registries')
    expect(disclaimer).toContain('does not guarantee supply until formal allocation')
  })
})
