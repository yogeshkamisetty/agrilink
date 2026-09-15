import { describe, expect, it } from 'vitest'
import {
  demandForecastingService,
  priceEstimationService,
  supplyAllocationService,
  routeOptimizationService,
  qualityVerificationService,
  SimulatedAgmarkVisionProvider,
  type InventoryLotCandidate,
  type OrderRequirement,
} from './index'

describe('Intelligence Layer: Demand Forecasting Service', () => {
  it('computes 7d forecast with statistical baseline and mandatory UI label', () => {
    const result = demandForecastingService.predict({
      crop: 'TOMATO',
      location: 'Anand',
      period: '7d',
    })

    expect(result.crop).toBe('TOMATO')
    expect(result.location).toBe('Anand')
    expect(result.period).toBe('7d')
    expect(result.predictedQuantityKg).toBeGreaterThan(1000)
    expect(result.confidencePct).toBe(88)
    expect(result.dataSource).toContain('PM-POSHAN')
    expect(result.baselineModel).toContain('Moving Average')
    expect(result.uiLabel).toBe('Forecast — Not a confirmed order.')
    expect(result.seriesBreakdown).toHaveLength(7)
  })

  it('reflects lower institutional demand on weekends in the series breakdown', () => {
    const result = demandForecastingService.predict({
      crop: 'POTATO',
      location: 'Kheda',
      period: '7d',
      referenceDate: '2026-09-14', // Monday
    })

    const sundayPoint = result.seriesBreakdown.find((p) => p.dayOfWeek === 'Sun')
    const mondayPoint = result.seriesBreakdown.find((p) => p.dayOfWeek === 'Mon')

    if (sundayPoint && mondayPoint) {
      expect(sundayPoint.predictedKg).toBeLessThan(mondayPoint.predictedKg)
      expect(sundayPoint.isWeekendOrHoliday).toBe(true)
    }
  })

  it('adjusts confidence down for longer 30-day forecast horizon', () => {
    const shortForecast = demandForecastingService.predict({ crop: 'ONION', location: 'Nashik', period: '7d' })
    const longForecast = demandForecastingService.predict({ crop: 'ONION', location: 'Nashik', period: '30d' })

    expect(shortForecast.confidencePct).toBeGreaterThan(longForecast.confidencePct)
    expect(longForecast.seriesBreakdown).toHaveLength(30)
  })
})

describe('Intelligence Layer: Price Estimation Service', () => {
  it('calculates suggested price with transparent breakdown: ₹25 + ₹2 + ₹1 - ₹1 = ₹27/kg', () => {
    const result = priceEstimationService.estimate({
      crop: 'TOMATO',
      grade: 'A',
      location: 'Kheda FPO Hub',
      distanceKm: 25, // > 20 km -> -₹1.00 transport deduction
      demandFactor: 'HIGH', // +₹1.00 demand adjustment
      customMandiRef: 25.0, // ₹25.00 mandi baseline
    })

    // Breakdown: 25 (mandi) + 2 (Grade A) + 1 (High demand) - 1 (distance > 20km) = 27
    expect(result.marketReferencePerKg).toBe(25)
    expect(result.gradeAdjustmentPerKg).toBe(2)
    expect(result.demandAdjustmentPerKg).toBe(1)
    expect(result.locationLogisticsAdjustmentPerKg).toBe(-1)
    expect(result.suggestedPricePerKg).toBe(27)
    expect(result.breakdownFormula).toBe('₹25 + ₹2 + ₹1 - ₹1 = ₹27/kg')
    expect(result.label).toBe('Indicative / Suggested Price')
    expect(result.currency).toBe('INR')
    expect(result.algorithmType).toContain('Non-AI Cost-Plus Formula')
  })

  it('applies discount for Grade C produce and bonus for close depot proximity', () => {
    const result = priceEstimationService.estimate({
      crop: 'POTATO',
      grade: 'C',
      location: 'Depot Yard',
      distanceKm: 4, // <= 5 km -> +₹0.50 proximity bonus
      demandFactor: 'NORMAL',
      customMandiRef: 18.0,
    })

    // 18 - 4 (Grade C) + 0 (Normal) + 0.5 (Proximity) = 14.50
    expect(result.gradeAdjustmentPerKg).toBe(-4)
    expect(result.locationLogisticsAdjustmentPerKg).toBe(0.5)
    expect(result.suggestedPricePerKg).toBe(14.5)
    expect(result.breakdownFormula).toContain('₹18 - ₹4 + ₹0 + ₹1 = ₹15/kg')
  })
})

describe('Intelligence Layer: Supply Allocation Optimization Service', () => {
  const mockOrder: OrderRequirement = {
    id: 'ORD-781',
    buyerName: 'PM-POSHAN Central Kitchen Anand',
    crop: 'TOMATO',
    gradeRequired: 'A',
    quantityKg: 700,
    deliveryDate: '2026-09-18',
    deliveryLocation: 'Anand',
  }

  const mixedInventory: InventoryLotCandidate[] = [
    // 1. Verified Lot A (Eligible)
    {
      lotId: 'LOT-101',
      farmerId: 'F-1',
      farmerName: 'Ramesh Patel',
      crop: 'TOMATO',
      grade: 'A',
      scaleWeightKg: 400,
      availableKg: 392,
      freshnessDaysRemaining: 5,
      verifiedAt: '2026-09-15T06:00:00Z',
      location: 'Boriavi',
      lat: 22.6105,
      lng: 72.9324,
      farmgatePricePerKg: 24,
      isVerified: true,
      lotStatus: 'VERIFIED',
    },
    // 2. Verified Lot B (Eligible)
    {
      lotId: 'LOT-102',
      farmerId: 'F-2',
      farmerName: 'Suresh Parmar',
      crop: 'TOMATO',
      grade: 'A',
      scaleWeightKg: 350,
      availableKg: 350,
      freshnessDaysRemaining: 4,
      verifiedAt: '2026-09-15T06:30:00Z',
      location: 'Kheda',
      lat: 22.7533,
      lng: 72.6841,
      farmgatePricePerKg: 24,
      isVerified: true,
      lotStatus: 'VERIFIED',
    },
    // 3. UNVERIFIED / EXPECTED HARVEST (MUST BE EXCLUDED!)
    {
      lotId: 'LOT-103',
      farmerId: 'F-3',
      farmerName: 'Jignesh Solanki',
      crop: 'TOMATO',
      grade: 'A',
      scaleWeightKg: 0,
      availableKg: 600,
      freshnessDaysRemaining: 10,
      verifiedAt: '',
      location: 'Borsad',
      lat: 22.4118,
      lng: 72.9022,
      farmgatePricePerKg: 23,
      isVerified: false, // NOT VERIFIED
      lotStatus: 'HARVEST_PLANNED', // PLANNED HARVEST
    },
    // 4. Grade B Lot (Grade mismatch for Grade A requirement)
    {
      lotId: 'LOT-104',
      farmerId: 'F-4',
      farmerName: 'Mahesh Vaghela',
      crop: 'TOMATO',
      grade: 'B',
      scaleWeightKg: 200,
      availableKg: 200,
      freshnessDaysRemaining: 3,
      verifiedAt: '2026-09-15T06:45:00Z',
      location: 'Petlad',
      lat: 22.4735,
      lng: 72.8024,
      farmgatePricePerKg: 21,
      isVerified: true,
      lotStatus: 'VERIFIED',
    },
  ]

  it('matches order strictly to VERIFIED inventory and NEVER allocates expected harvest', () => {
    const plan = supplyAllocationService.allocate(mockOrder, mixedInventory)

    // Expected harvest LOT-103 must be strictly excluded
    expect(plan.unverifiedLotsExcludedCount).toBe(1)
    expect(plan.unverifiedKgExcluded).toBe(600)
    expect(plan.allocatedLots.some((l) => l.lotId === 'LOT-103')).toBe(false)

    // Grade B lot LOT-104 cannot fulfill Grade A order
    expect(plan.allocatedLots.some((l) => l.lotId === 'LOT-104')).toBe(false)

    // Fulfill 700 kg from LOT-101 (392 kg) and LOT-102 (308 kg taken of 350 available)
    expect(plan.allocatedKg).toBe(700)
    expect(plan.fulfillmentStatus).toBe('FULL')
    expect(plan.shortfallKg).toBe(0)
    expect(plan.allocatedLots).toHaveLength(2)

    expect(plan.allocatedLots[0].lotId).toBe('LOT-102') // Freshness 4 days first (FIFO)
    expect(plan.allocatedLots[1].lotId).toBe('LOT-101') // Freshness 5 days second

    // Vehicle and split shipment assigned
    expect(plan.splitShipments.length).toBeGreaterThanOrEqual(1)
    expect(plan.splitShipments[0].loadKg).toBe(700)
    expect(plan.averageFarmerRealizationPerKg).toBe(24)
  })

  it('correctly handles partial fulfillment when verified inventory is insufficient', () => {
    const hugeOrder: OrderRequirement = {
      ...mockOrder,
      quantityKg: 2000,
    }

    const plan = supplyAllocationService.allocate(hugeOrder, mixedInventory)

    expect(plan.fulfillmentStatus).toBe('PARTIAL')
    expect(plan.allocatedKg).toBe(742) // 392 + 350
    expect(plan.shortfallKg).toBe(1258)
    expect(plan.unverifiedKgExcluded).toBe(600) // Audited exclusion
  })
})

describe('Intelligence Layer: Route Optimization Service', () => {
  it('optimizes multi-stop route returning stop sequence, vehicle, distance, duration, utilization, and ETAs', () => {
    const depot = { id: 'DEPOT-1', label: 'Central FPO Hub Kheda', lat: 22.7533, lng: 72.6841 }
    const stops = [
      { id: 'S-1', label: 'Boriavi Center', lat: 22.6105, lng: 72.9324, quantityKg: 392, timeWindow: { open: '08:00', close: '09:30' } },
      { id: 'S-2', label: 'Borsad Farmgate', lat: 22.4118, lng: 72.9022, quantityKg: 408, timeWindow: { open: '09:00', close: '11:00' } },
      { id: 'S-3', label: 'Bakrol Collection Depot', lat: 22.5614, lng: 72.9238, quantityKg: 350, timeWindow: { open: '08:30', close: '10:00' } },
    ]

    const result = routeOptimizationService.optimize({
      depot,
      stops,
      vehicleCapacityKg: 1500,
      startTime: '07:30 AM',
      averageSpeedKmH: 35,
      serviceMinutesPerStop: 15,
    })

    expect(result.stopSequence).toHaveLength(3)
    expect(result.totalPayloadKg).toBe(1150)
    expect(result.vehicleCapacityKg).toBe(1500)
    expect(result.utilizationPct).toBe(77) // 1150 / 1500 = 76.6% -> 77%
    expect(result.totalDistanceKm).toBeGreaterThan(30)
    expect(result.totalDurationMinutes).toBeGreaterThan(60)

    // Check that sequential stops have ascending sequence indices and valid ETAs
    result.stopSequence.forEach((stop, idx) => {
      expect(stop.sequenceIndex).toBe(idx + 1)
      expect(stop.estimatedArrivalTime).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/)
      expect(stop.estimatedDepartureTime).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/)
      expect(stop.cumulativeDistanceKm).toBeGreaterThan(0)
    })

    expect(result.algorithmType).toContain('Clarke-Wright Savings & 2-Opt')
  })
})

describe('Intelligence Layer: Quality Verification Service', () => {
  it('uses clearly labelled simulated classification provider without universal accuracy claims', async () => {
    const result = await qualityVerificationService.inspectLot({
      crop: 'TOMATO',
      declaredGrade: 'A',
    })

    expect(result.providerName).toContain('Simulated MobileNet-v3')
    expect(result.isSimulated).toBe(true)
    expect(result.modelType).toBe('SIMULATED_MOCK_CLASSIFIER')
    expect(result.universalAccuracyClaimed).toBe(false)
    expect(result.accuracyNotice).toContain('Not a universal ground-truth classifier')
    expect(result.predictedGrade).toBe('A')
    expect(result.confidenceScorePct).toBe(94)
    expect(result.defectBreakdown.length).toBeGreaterThanOrEqual(3)
    expect(result.ripenessPercentage).toBeGreaterThanOrEqual(80)
    expect(result.firmnessIndex).toBe('FIRM_OPTIMAL')
    expect(result.recommendedAction).toBe('ACCEPT_GRADE_A')
  })

  it('supports pluggable custom providers', async () => {
    class CustomEdgeProvider extends SimulatedAgmarkVisionProvider {
      providerName = 'Custom Edge-TFLite Test Provider'
    }

    const customService = new (qualityVerificationService.constructor as any)(new CustomEdgeProvider())
    const res = await customService.inspectLot({ crop: 'POTATO' })
    expect(res.providerName).toBe('Custom Edge-TFLite Test Provider')
  })
})
