import { CROPS, harvestLeadDays, type CropId } from './crops'
import { addDays, rangesOverlap } from './dates'
import { roadKm, type LatLng } from './geo'

/** Farmers further than this (estimated road km) from the buyer are not notified. */
export const MATCH_RADIUS_KM = 40

export type RegistryCandidate = {
  registryId: string
  farmerId: string
  farmerName: string
  village: string
  fpoId: string
  location: LatLng
  crop: CropId
  status: 'ACTIVE' | 'CLOSED'
  expectedQtyKg: number
  /** Quantity from this registry entry already committed to other live orders. */
  committedElsewhereKg: number
  harvestWindowStart: string
  harvestWindowEnd: string
}

export type ExclusionReason = 'OTHER_FPO' | 'CLOSED' | 'HARVEST_WINDOW' | 'DISTANCE' | 'NO_AVAILABLE_QTY'

export type MatchedFarmer = RegistryCandidate & { distanceKm: number; availableKg: number }
export type ExcludedFarmer = RegistryCandidate & { distanceKm: number; availableKg: number; reason: ExclusionReason; detail: string }

export type MatchInput = {
  crop: CropId
  deliveryDate: string
  fpoId: string
  buyerLocation: LatLng
  radiusKm?: number
}

/** The window in which a lot must be harvested to arrive saleable on the delivery date. */
export function acceptableHarvestWindow(crop: CropId, deliveryDate: string) {
  return { start: addDays(deliveryDate, -harvestLeadDays(crop)), end: deliveryDate }
}

/**
 * Pre-harvest registry match: crop + FPO membership + harvest window that can
 * reach the delivery date fresh + distance from the buyer + quantity not
 * already promised elsewhere. Every exclusion carries its reason so the
 * coordinator can see why a member was not notified.
 */
export function matchRegistry(input: MatchInput, candidates: RegistryCandidate[]) {
  const radiusKm = input.radiusKm ?? MATCH_RADIUS_KM
  const window = acceptableHarvestWindow(input.crop, input.deliveryDate)
  const matched: MatchedFarmer[] = []
  const excluded: ExcludedFarmer[] = []

  for (const candidate of candidates) {
    if (candidate.crop !== input.crop) continue
    const distanceKm = Math.round(roadKm(candidate.location, input.buyerLocation) * 10) / 10
    const availableKg = Math.max(0, candidate.expectedQtyKg - candidate.committedElsewhereKg)
    const base = { ...candidate, distanceKm, availableKg }

    if (candidate.fpoId !== input.fpoId) {
      excluded.push({ ...base, reason: 'OTHER_FPO', detail: 'Not a member of the fulfilling FPO' })
    } else if (candidate.status !== 'ACTIVE') {
      excluded.push({ ...base, reason: 'CLOSED', detail: 'Registry entry closed' })
    } else if (!rangesOverlap(candidate.harvestWindowStart, candidate.harvestWindowEnd, window.start, window.end)) {
      excluded.push({
        ...base,
        reason: 'HARVEST_WINDOW',
        detail: `Harvest ${candidate.harvestWindowStart} → ${candidate.harvestWindowEnd} cannot reach delivery fresh (${CROPS[input.crop].name} needs harvest between ${window.start} and ${window.end})`,
      })
    } else if (distanceKm > radiusKm) {
      excluded.push({ ...base, reason: 'DISTANCE', detail: `${distanceKm} km from buyer (limit ${radiusKm} km)` })
    } else if (availableKg <= 0) {
      excluded.push({ ...base, reason: 'NO_AVAILABLE_QTY', detail: 'Registered quantity already committed to other orders' })
    } else {
      matched.push(base)
    }
  }

  matched.sort((a, b) => a.distanceKm - b.distanceKm || b.availableKg - a.availableKg)
  return { matched, excluded, window, radiusKm }
}
