import { roadKm, type LatLng } from './geo'
import {
  getVillageLatLng,
  allocateFarmersOptimal,
  type CandidateFarmer,
  type OptimalAllocationResult,
  DEFAULT_BUYER_DEPOT,
  DEFAULT_DEPOT,
} from './allocation'

export type { CandidateFarmer } from './allocation'

export const SMALL_ORDER_THRESHOLD_KG = 50

export type OrderTier = 'SMALL' | 'BULK'

export type FarmerResponseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type SmallOrderRouting = {
  tier: 'SMALL'
  requiresAdmin: boolean
  allocatedFarmer: {
    id: string
    name: string
    village: string
    distanceKm: number
    mobile_number?: string
  } | null
  status: 'AUTO_ALLOCATED' | 'UNFULFILLED'
  acceptanceStatus: FarmerResponseStatus
  declinedFarmerIds: string[]
  rejectionHistory: Array<{
    farmerId: string
    farmerName: string
    rejectedAt: string
    reason?: string
  }>
}

export type BulkOrderRouting = {
  tier: 'BULK'
  requiresAdmin: boolean
  status: 'PENDING_ADMIN_REVIEW' | 'AGGREGATED' | 'IN_TRANSIT'
  optimalResult?: OptimalAllocationResult
  declinedFarmerIds: string[]
  promotedStandbyHistory: Array<{
    declinedFarmerId: string
    declinedFarmerName: string
    promotedFarmerId: string
    promotedFarmerName: string
    promotedKg: number
    promotedAt: string
  }>
}

/**
 * Finds the nearest eligible farmer with available crop stock, excluding any farmers
 * who have already declined this specific order.
 */
export function findNearestEligibleFarmer(
  candidates: CandidateFarmer[],
  crop: string,
  neededKg: number,
  excludedFarmerIds: string[] = [],
  buyerLocation: LatLng = DEFAULT_BUYER_DEPOT
): { farmer: CandidateFarmer; distanceKm: number } | null {
  const normCrop = crop.toUpperCase()
  const excludedSet = new Set(excludedFarmerIds)

  // Filter candidates matching crop, having enough capacity, and not previously excluded
  const eligible = candidates.filter((c) => {
    if (excludedSet.has(c.id)) return false
    const fCrop = (c.crop || '').toUpperCase()
    const cropMatches = fCrop.includes(normCrop) || normCrop.includes(fCrop)
    return cropMatches && Number(c.availableKg || 0) >= neededKg
  })

  // If strict capacity filter yielded 0, fall back to crop-matching candidates with any stock
  const pool =
    eligible.length > 0
      ? eligible
      : candidates.filter((c) => {
          if (excludedSet.has(c.id)) return false
          const fCrop = (c.crop || '').toUpperCase()
          return fCrop.includes(normCrop) || normCrop.includes(fCrop)
        })

  if (pool.length === 0) return null

  // Calculate distance to buyer location and sort ascending (closest first)
  const scored = pool.map((farmer) => {
    const loc = farmer.location || getVillageLatLng(farmer.village)
    const distanceKm = Math.round(roadKm(loc, buyerLocation) * 10) / 10
    return {
      farmer: { ...farmer, location: loc },
      distanceKm,
    }
  })

  // Nearest first; if tied, highest reliability first
  scored.sort((a, b) => a.distanceKm - b.distanceKm || b.farmer.reliability - a.farmer.reliability)

  return scored[0] || null
}

/**
 * Automatically classifies an order into Small (≤ 50 kg) or Bulk (> 50 kg) and applies
 * direct auto-routing or flags for admin review.
 */
export function classifyAndRouteOrder(params: {
  crop: string
  qtyTargetKg: number
  candidates: CandidateFarmer[]
  buyerLocation?: LatLng
  excludedFarmerIds?: string[]
}): {
  tier: OrderTier
  routing: SmallOrderRouting | BulkOrderRouting
  summary: string
} {
  const { crop, qtyTargetKg, candidates, buyerLocation = DEFAULT_BUYER_DEPOT, excludedFarmerIds = [] } = params

  if (qtyTargetKg <= SMALL_ORDER_THRESHOLD_KG) {
    const nearest = findNearestEligibleFarmer(candidates, crop, qtyTargetKg, excludedFarmerIds, buyerLocation)

    if (nearest) {
      return {
        tier: 'SMALL',
        routing: {
          tier: 'SMALL',
          requiresAdmin: false,
          allocatedFarmer: {
            id: nearest.farmer.id,
            name: nearest.farmer.name,
            village: nearest.farmer.village,
            distanceKm: nearest.distanceKm,
            mobile_number: (nearest.farmer as any).mobile_number || (nearest.farmer as any).phone,
          },
          status: 'AUTO_ALLOCATED',
          acceptanceStatus: 'PENDING',
          declinedFarmerIds: excludedFarmerIds,
          rejectionHistory: [],
        },
        summary: `Small Order (≤ 50 kg): Automatically allocated to nearest farmer ${nearest.farmer.name} (${nearest.farmer.village}, ${nearest.distanceKm} km away) without admin bottleneck.`,
      }
    } else {
      return {
        tier: 'SMALL',
        routing: {
          tier: 'SMALL',
          requiresAdmin: false,
          allocatedFarmer: null,
          status: 'UNFULFILLED',
          acceptanceStatus: 'PENDING',
          declinedFarmerIds: excludedFarmerIds,
          rejectionHistory: [],
        },
        summary: `Small Order (≤ 50 kg): No eligible farmers currently available in cluster for ${crop}.`,
      }
    }
  }

  // Bulk Order (> 50 kg): Requires Admin review & multi-smallholder aggregation
  const optimal = allocateFarmersOptimal({
    targetKg: qtyTargetKg,
    crop,
    candidates,
    standbyPct: 0.15,
  })

  return {
    tier: 'BULK',
    routing: {
      tier: 'BULK',
      requiresAdmin: true,
      status: 'PENDING_ADMIN_REVIEW',
      optimalResult: optimal,
      declinedFarmerIds: excludedFarmerIds,
      promotedStandbyHistory: [],
    },
    summary: `Bulk Order (> 50 kg): Sourcing ${qtyTargetKg} kg requires FPO Admin verification and pooling of ${optimal.allocations.filter((a) => a.primaryKg > 0).length} smallholders + 15% standby reserve.`,
  }
}

/**
 * Handles a farmer declining a small order (≤ 50 kg) by automatically cascading
 * to the NEXT nearest farmer.
 */
export function cascadeSmallOrderRejection(params: {
  crop: string
  qtyTargetKg: number
  candidates: CandidateFarmer[]
  currentRouting: SmallOrderRouting
  decliningFarmerId: string
  reason?: string
  buyerLocation?: LatLng
}): {
  newRouting: SmallOrderRouting
  nextFarmer: { id: string; name: string; village: string; distanceKm: number } | null
  logMessage: string
} {
  const { crop, qtyTargetKg, candidates, currentRouting, decliningFarmerId, reason, buyerLocation = DEFAULT_BUYER_DEPOT } = params

  const decliningFarmer = candidates.find((c) => c.id === decliningFarmerId)
  const decliningName = decliningFarmer?.name || 'Farmer'

  const updatedDeclined = Array.from(new Set([...currentRouting.declinedFarmerIds, decliningFarmerId]))
  const updatedHistory = [
    ...currentRouting.rejectionHistory,
    {
      farmerId: decliningFarmerId,
      farmerName: decliningName,
      rejectedAt: new Date().toISOString(),
      reason: reason || 'Capacity committed or field unavailable',
    },
  ]

  // Find next nearest eligible candidate
  const nextNearest = findNearestEligibleFarmer(candidates, crop, qtyTargetKg, updatedDeclined, buyerLocation)

  if (nextNearest) {
    const nextFarmer = {
      id: nextNearest.farmer.id,
      name: nextNearest.farmer.name,
      village: nextNearest.farmer.village,
      distanceKm: nextNearest.distanceKm,
      mobile_number: (nextNearest.farmer as any).mobile_number || (nextNearest.farmer as any).phone,
    }

    return {
      newRouting: {
        ...currentRouting,
        allocatedFarmer: nextFarmer,
        status: 'AUTO_ALLOCATED',
        acceptanceStatus: 'PENDING',
        declinedFarmerIds: updatedDeclined,
        rejectionHistory: updatedHistory,
      },
      nextFarmer,
      logMessage: `${decliningName} declined. System automatically re-routed to next nearest farmer ${nextFarmer.name} (${nextFarmer.village}, ${nextFarmer.distanceKm} km away).`,
    }
  }

  return {
    newRouting: {
      ...currentRouting,
      allocatedFarmer: null,
      status: 'UNFULFILLED',
      acceptanceStatus: 'REJECTED',
      declinedFarmerIds: updatedDeclined,
      rejectionHistory: updatedHistory,
    },
    nextFarmer: null,
    logMessage: `All nearest farmers in cluster declined. Order marked for coordinator assistance.`,
  }
}

/**
 * Handles a farmer in a bulk pool (> 50 kg) declining their allocation:
 * Automatically promotes a standby smallholder from the 15% buffer (or next candidate)
 * to maintain 100% consignment fulfillment!
 */
export function cascadeBulkOrderRejection(params: {
  targetKg: number
  crop: string
  candidates: CandidateFarmer[]
  currentRouting: BulkOrderRouting
  decliningFarmerId: string
  declinedKg: number
}): {
  newRouting: BulkOrderRouting
  promotedFarmer: CandidateFarmer | null
  promotedKg: number
  logMessage: string
} {
  const { targetKg, crop, candidates, currentRouting, decliningFarmerId, declinedKg } = params

  const decliningFarmer = candidates.find((c) => c.id === decliningFarmerId)
  const decliningName = decliningFarmer?.name || 'Farmer'

  const updatedDeclined = Array.from(new Set([...currentRouting.declinedFarmerIds, decliningFarmerId]))

  // Re-run knapsack optimal excluding the declining farmer to find the replacement
  const remainingCandidates = candidates.filter((c) => !updatedDeclined.includes(c.id))
  const newOptimal = allocateFarmersOptimal({
    targetKg,
    crop,
    candidates: remainingCandidates,
    standbyPct: 0.15,
  })

  // Identify who was promoted or added to fill the gap
  const previousAllocatedIds = new Set(
    currentRouting.optimalResult?.allocations.filter((a) => a.allocatedKg > 0).map((a) => a.farmer.id) || []
  )
  const newlyAllocated = newOptimal.allocations.find(
    (a) => a.allocatedKg > 0 && !previousAllocatedIds.has(a.farmer.id)
  )

  const promotedCandidate = newlyAllocated?.farmer || remainingCandidates[0] || null
  const promotedKg = newlyAllocated?.allocatedKg || declinedKg

  const updatedHistory = [
    ...currentRouting.promotedStandbyHistory,
    {
      declinedFarmerId: decliningFarmerId,
      declinedFarmerName: decliningName,
      promotedFarmerId: promotedCandidate?.id || 'unknown',
      promotedFarmerName: promotedCandidate?.name || 'Standby Farmer',
      promotedKg,
      promotedAt: new Date().toISOString(),
    },
  ]

  const logMessage = `${decliningName} declined ${declinedKg} KG. System automatically promoted standby farmer ${promotedCandidate?.name || 'Cluster Reserve'} to cover the deficit and preserve consignment volume.`

  return {
    newRouting: {
      ...currentRouting,
      optimalResult: newOptimal,
      declinedFarmerIds: updatedDeclined,
      promotedStandbyHistory: updatedHistory,
    },
    promotedFarmer: promotedCandidate,
    promotedKg,
    logMessage,
  }
}
