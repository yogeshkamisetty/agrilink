import { describe, it, expect } from 'vitest'
import {
  findNearestEligibleFarmer,
  classifyAndRouteOrder,
  cascadeSmallOrderRejection,
  cascadeBulkOrderRejection,
  type SmallOrderRouting,
  type BulkOrderRouting,
} from './order-routing'
import type { CandidateFarmer } from './allocation'

const mockCandidates: CandidateFarmer[] = [
  {
    id: 'f-ramesh',
    name: 'Rameshbhai Patel',
    village: 'Boriavi', // ~6 km from Anand
    crop: 'PADDY',
    availableKg: 600,
    reliability: 95,
    qualityGrade: 'A',
  },
  {
    id: 'f-bakrol',
    name: 'Jignesh Chauhan',
    village: 'Bakrol', // ~1.5 km from Anand
    crop: 'PADDY',
    availableKg: 400,
    reliability: 92,
    qualityGrade: 'A',
  },
  {
    id: 'f-petlad',
    name: 'Savitaben Parmar',
    village: 'Petlad', // ~18 km from Anand
    crop: 'PADDY',
    availableKg: 800,
    reliability: 98,
    qualityGrade: 'A',
  },
  {
    id: 'f-mohan',
    name: 'Mohanbhai Solanki',
    village: 'Sojitra', // ~22 km from Anand
    crop: 'TOMATO',
    availableKg: 500,
    reliability: 91,
    qualityGrade: 'B',
  },
]

describe('SIH 2026 Order Routing & Cascading Fallback Engine', () => {
  it('identifies the nearest eligible farmer based on village distance for a small order', () => {
    // Bakrol is closest to Anand (the buyer depot)
    const nearest = findNearestEligibleFarmer(mockCandidates, 'PADDY', 40)
    expect(nearest).not.toBeNull()
    expect(nearest?.farmer.name).toBe('Jignesh Chauhan')
    expect(nearest?.farmer.village).toBe('Bakrol')
    expect(nearest?.distanceKm).toBeLessThan(10)
  })

  it('classifies small order (<= 50 kg) as SMALL and auto-allocates to nearest farmer without admin bottleneck', () => {
    const result = classifyAndRouteOrder({
      crop: 'PADDY',
      qtyTargetKg: 35,
      candidates: mockCandidates,
    })

    expect(result.tier).toBe('SMALL')
    expect(result.routing.tier).toBe('SMALL')
    expect(result.routing.requiresAdmin).toBe(false)
    expect(result.routing.status).toBe('AUTO_ALLOCATED')
    expect((result.routing as SmallOrderRouting).allocatedFarmer?.id).toBe('f-bakrol')
    expect((result.routing as SmallOrderRouting).acceptanceStatus).toBe('PENDING')
  })

  it('classifies bulk order (> 50 kg) as BULK requiring admin review and multi-farmer knapsack pooling', () => {
    const result = classifyAndRouteOrder({
      crop: 'PADDY',
      qtyTargetKg: 1000,
      candidates: mockCandidates,
    })

    expect(result.tier).toBe('BULK')
    expect(result.routing.tier).toBe('BULK')
    expect(result.routing.requiresAdmin).toBe(true)
    expect(result.routing.status).toBe('PENDING_ADMIN_REVIEW')
    const bulk = result.routing as BulkOrderRouting
    expect(bulk.optimalResult).toBeDefined()
    expect(bulk.optimalResult?.totalAllocatedKg).toBeGreaterThanOrEqual(1000)
  })

  it('automatically cascades to next nearest farmer when the allocated smallholder declines', () => {
    const initial = classifyAndRouteOrder({
      crop: 'PADDY',
      qtyTargetKg: 45,
      candidates: mockCandidates,
    })
    const smallRouting = initial.routing as SmallOrderRouting
    expect(smallRouting.allocatedFarmer?.id).toBe('f-bakrol')

    // Bakrol farmer rejects!
    const cascade = cascadeSmallOrderRejection({
      crop: 'PADDY',
      qtyTargetKg: 45,
      candidates: mockCandidates,
      currentRouting: smallRouting,
      decliningFarmerId: 'f-bakrol',
      reason: 'Sprayer repair in progress',
    })

    // Next nearest should be Boriavi (Ramesh Patel)
    expect(cascade.nextFarmer).not.toBeNull()
    expect(cascade.nextFarmer?.id).toBe('f-ramesh')
    expect(cascade.nextFarmer?.village).toBe('Boriavi')
    expect(cascade.newRouting.status).toBe('AUTO_ALLOCATED')
    expect(cascade.newRouting.declinedFarmerIds).toContain('f-bakrol')
    expect(cascade.newRouting.rejectionHistory.length).toBe(1)
    expect(cascade.newRouting.rejectionHistory[0].farmerName).toBe('Jignesh Chauhan')
    expect(cascade.logMessage).toContain('Jignesh Chauhan declined')
    expect(cascade.logMessage).toContain('Rameshbhai Patel')
  })

  it('promotes standby smallholder when a farmer in a bulk pool declines', () => {
    const initial = classifyAndRouteOrder({
      crop: 'PADDY',
      qtyTargetKg: 1000,
      candidates: mockCandidates,
    })
    const bulkRouting = initial.routing as BulkOrderRouting

    // Suppose f-bakrol declines their share of the bulk order
    const cascade = cascadeBulkOrderRejection({
      targetKg: 1000,
      crop: 'PADDY',
      candidates: mockCandidates,
      currentRouting: bulkRouting,
      decliningFarmerId: 'f-bakrol',
      declinedKg: 400,
    })

    expect(cascade.newRouting.declinedFarmerIds).toContain('f-bakrol')
    expect(cascade.newRouting.promotedStandbyHistory.length).toBe(1)
    expect(cascade.logMessage).toContain('declined 400 KG')
    expect(cascade.newRouting.optimalResult).toBeDefined()
  })
})
