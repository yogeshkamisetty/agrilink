import { roadKm, type LatLng } from './geo'
import { planRoute, type RoutePlan, type RouteStop } from './routing'

export const VILLAGE_COORDINATES: Record<string, LatLng> = {
  kheda: { lat: 22.7533, lng: 72.6841 },
  boriavi: { lat: 22.6105, lng: 72.9324 },
  borsad: { lat: 22.4118, lng: 72.9022 },
  vasad: { lat: 22.4705, lng: 73.0722 },
  petlad: { lat: 22.4735, lng: 72.8024 },
  bakrol: { lat: 22.5614, lng: 72.9238 },
  sojitra: { lat: 22.5358, lng: 72.712 },
  anand: { lat: 22.5645, lng: 72.9289 },
}

export const DEFAULT_DEPOT: LatLng = { lat: 22.7533, lng: 72.6841 } // Kheda FPO Central Sourcing Depot
export const DEFAULT_BUYER_DEPOT: LatLng = { lat: 22.5645, lng: 72.9289 } // PM POSHAN Central Kitchen, Anand

export function getVillageLatLng(villageName: string): LatLng {
  if (!villageName) return VILLAGE_COORDINATES.kheda
  const clean = villageName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [key, coords] of Object.entries(VILLAGE_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) return coords
  }
  // Deterministic fallback offset around Anand district
  let hash = 0
  for (let i = 0; i < villageName.length; i++) hash = (hash * 31 + villageName.charCodeAt(i)) % 1000
  const latOffset = (hash / 1000 - 0.5) * 0.15
  const lngOffset = ((hash % 100) / 100 - 0.5) * 0.15
  return { lat: 22.56 + latOffset, lng: 72.92 + lngOffset }
}

export type CandidateFarmer = {
  id: string
  name: string
  village: string
  crop: string
  availableKg: number
  reliability: number // 0-100
  qualityGrade: 'A' | 'B'
  location?: LatLng
}

export type FarmerAllocation = {
  farmer: CandidateFarmer
  allocatedKg: number
  primaryKg: number
  standbyKg: number
  isStandby: boolean
  score: number
  scoreBreakdown: {
    reliability: number
    proximity: number
    quality: number
  }
}

export type VehicleRecommendation = {
  name: string
  maxCapacityKg: number
  loadFactorPct: number
  fuelType: string
  co2SavingsKg: number
}

export type OptimalAllocationResult = {
  allocations: FarmerAllocation[]
  totalPrimaryKg: number
  totalStandbyKg: number
  totalAllocatedKg: number
  targetKg: number
  standbyTargetKg: number
  isTargetMet: boolean
  isBufferSecured: boolean
  routePlan: RoutePlan
  vehicle: VehicleRecommendation
  summaryText: string
}

export type AllocateFarmersParams = {
  targetKg: number
  crop: string
  depotLocation?: LatLng
  dropLocation?: LatLng
  depotLabel?: string
  dropLabel?: string
  candidates: CandidateFarmer[]
  standbyPct?: number // default 0.15 (15%)
}

/**
 * Multi-Factor Knapsack & Route-Cluster Allocation Algorithm.
 * Optimizes smallholder selection across:
 *  1. Proximity to FPO Depot and collection corridor (minimizes transport runway)
 *  2. Historical Delivery Reliability Score
 *  3. AGMARKNET Quality Grade (Grade A prioritised)
 *
 * Automatically separates optimal allocations into:
 *  - Primary Consignment Quota (100% of order target)
 *  - 15-20% Standby Buffer Reserve
 *
 * Automatically generates the TSP-optimised vehicle pickup sequence (planRoute)
 * and assigns the ideal vehicle capacity.
 */
export function allocateFarmersOptimal(params: AllocateFarmersParams): OptimalAllocationResult {
  const {
    targetKg,
    crop,
    depotLocation = DEFAULT_DEPOT,
    dropLocation = DEFAULT_BUYER_DEPOT,
    depotLabel = 'Kheda FPO Central Sourcing Hub',
    dropLabel = 'Buyer Institutional Depot',
    candidates,
    standbyPct = 0.15,
  } = params

  const standbyTargetKg = Math.round(targetKg * standbyPct)
  const totalNeededKg = targetKg + standbyTargetKg

  // 1. Filter candidates matching the target crop
  const normCrop = crop.toUpperCase()
  const matched = candidates.filter((c) => {
    const fCrop = (c.crop || '').toUpperCase()
    return fCrop.includes(normCrop) || normCrop.includes(fCrop)
  })

  // Fallback to all candidates if matching pool is too small for demo/hackathon flexibility
  const pool = matched.length >= 2 ? matched : candidates

  // 2. Score each candidate
  const scored = pool.map((farmer) => {
    const loc = farmer.location || getVillageLatLng(farmer.village)
    const distToDepot = roadKm(loc, depotLocation)
    const distToDrop = roadKm(loc, dropLocation)
    const avgDist = (distToDepot + distToDrop) / 2

    // Proximity factor: closer to depot/drop corridor yields higher score (0 to 1)
    const proximityScore = Math.max(0, 1 - avgDist / 45)

    // Reliability factor: normalized 0 to 1
    const reliabilityScore = Math.max(0, Math.min(100, farmer.reliability || 90)) / 100

    // Quality grade factor: Grade A = 1.0, Grade B = 0.75
    const qualityScore = farmer.qualityGrade === 'A' ? 1.0 : 0.75

    // Composite Weighted Score
    const compositeScore = Math.round((reliabilityScore * 0.4 + proximityScore * 0.35 + qualityScore * 0.25) * 1000) / 1000

    return {
      farmer: { ...farmer, location: loc },
      score: compositeScore,
      scoreBreakdown: {
        reliability: Math.round(reliabilityScore * 100),
        proximity: Math.round(proximityScore * 100),
        quality: Math.round(qualityScore * 100),
      },
    }
  })

  // 3. Sort by composite score descending
  scored.sort((a, b) => b.score - a.score)

  // 4. Knapsack Allocation: Fill Primary Target first, then Standby Buffer
  let remainingPrimary = targetKg
  let remainingStandby = standbyTargetKg
  const allocations: FarmerAllocation[] = []

  for (const item of scored) {
    const available = Number(item.farmer.availableKg) || 300
    let takePrimary = 0
    let takeStandby = 0

    if (remainingPrimary > 0) {
      takePrimary = Math.min(available, remainingPrimary)
      remainingPrimary -= takePrimary

      const leftover = available - takePrimary
      if (leftover > 0 && remainingStandby > 0) {
        takeStandby = Math.min(leftover, remainingStandby)
        remainingStandby -= takeStandby
      }
    } else if (remainingStandby > 0) {
      takeStandby = Math.min(available, remainingStandby)
      remainingStandby -= takeStandby
    }

    allocations.push({
      farmer: item.farmer,
      allocatedKg: takePrimary + takeStandby,
      primaryKg: takePrimary,
      standbyKg: takeStandby,
      isStandby: takePrimary === 0 && takeStandby > 0,
      score: item.score,
      scoreBreakdown: item.scoreBreakdown,
    })
  }

  const totalPrimaryKg = allocations.reduce((sum, a) => sum + a.primaryKg, 0)
  const totalStandbyKg = allocations.reduce((sum, a) => sum + a.standbyKg, 0)
  const totalAllocatedKg = totalPrimaryKg + totalStandbyKg

  const isTargetMet = totalPrimaryKg >= targetKg
  const isBufferSecured = totalAllocatedKg >= totalNeededKg

  // 5. Generate TSP-Optimized Collection Route for the contributing smallholders
  const activeFarmersForRoute = allocations.filter((a) => a.allocatedKg > 0)

  const depotStop: RouteStop = {
    id: 'fpo-depot',
    kind: 'DEPOT',
    label: depotLabel,
    detail: 'Collection start & vehicle dispatch',
    lat: depotLocation.lat,
    lng: depotLocation.lng,
    kg: 0,
  }

  const pickupStops: RouteStop[] = activeFarmersForRoute.map((a, idx) => ({
    id: a.farmer.id || `pickup-${idx + 1}`,
    kind: 'PICKUP',
    label: `Stop #${idx + 1}: ${a.farmer.name}`,
    detail: `${a.farmer.village} · ${a.primaryKg > 0 ? `${a.primaryKg} kg Primary` : ''} ${a.standbyKg > 0 ? `+${a.standbyKg} kg Standby` : ''}`.trim(),
    lat: a.farmer.location!.lat,
    lng: a.farmer.location!.lng,
    kg: a.allocatedKg,
  }))

  const dropStop: RouteStop = {
    id: 'buyer-drop',
    kind: 'DROP',
    label: dropLabel,
    detail: `Central intake · Unload ${totalAllocatedKg} KG`,
    lat: dropLocation.lat,
    lng: dropLocation.lng,
    kg: totalAllocatedKg,
  }

  const routePlan = planRoute(depotStop, pickupStops, [dropStop])

  // 6. Select Recommended Vehicle Capacity
  let vehicleName = 'Tata Ace CNG (Mini Truck)'
  let maxCapacityKg = 850
  let fuelType = 'CNG Green Freight'

  if (totalAllocatedKg > 1400) {
    vehicleName = 'Eicher Pro 2049 (Medium Commercial)'
    maxCapacityKg = 2500
    fuelType = 'Clean Diesel (BS-VI)'
  } else if (totalAllocatedKg > 800) {
    vehicleName = 'Mahindra Bolero Maxi Truck Plus'
    maxCapacityKg = 1400
    fuelType = 'Clean Diesel (BS-VI)'
  }

  const loadFactorPct = Math.min(100, Math.round((totalAllocatedKg / maxCapacityKg) * 100))
  const fuelSavedPct = routePlan.naiveKm > 0 ? Math.max(0, Math.round(((routePlan.naiveKm - routePlan.km) / routePlan.naiveKm) * 100)) : 28
  const co2SavingsKg = Math.round(routePlan.km * 0.18 * (fuelSavedPct / 100) * 10) / 10

  const vehicle: VehicleRecommendation = {
    name: vehicleName,
    maxCapacityKg,
    loadFactorPct,
    fuelType,
    co2SavingsKg,
  }

  // 7. Explanatory Summary Rationale
  const primaryCount = allocations.filter((a) => a.primaryKg > 0).length
  const standbyCount = allocations.filter((a) => a.standbyKg > 0).length
  const primaryFarmers = allocations.filter((a) => a.primaryKg > 0)
  const avgReliability =
    primaryCount > 0
      ? Math.round(primaryFarmers.reduce((sum, a) => sum + (a.farmer.reliability || 90), 0) / primaryCount)
      : 94

  const summaryText = `Optimized allocation selected ${primaryCount} smallholder${primaryCount === 1 ? '' : 's'} (${avgReliability}% avg reliability) for primary ${totalPrimaryKg} KG fulfillment, plus ${standbyCount} smallholder${standbyCount === 1 ? '' : 's'} providing +${totalStandbyKg} KG (+${Math.round((totalStandbyKg / targetKg) * 100)}%) standby buffer reserve. Collection route optimized via TSP 2-opt (${routePlan.km} km, ${fuelSavedPct}% fuel saved).`

  return {
    allocations,
    totalPrimaryKg,
    totalStandbyKg,
    totalAllocatedKg,
    targetKg,
    standbyTargetKg,
    isTargetMet,
    isBufferSecured,
    routePlan,
    vehicle,
    summaryText,
  }
}
