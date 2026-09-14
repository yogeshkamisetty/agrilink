/**
 * Hired-vehicle classes an FPO books for village collection runs. Capacities
 * are typical rated payloads; tariffs are indicative local hire rates (a
 * loading charge plus a per-km rate, rounded to ₹50) and the coordinator
 * edits the real figure at dispatch. The mini-truck tariff is the one the
 * dispatch screen has always suggested.
 */

export type VehicleClassId = 'E_LOADER' | 'MINI_TRUCK' | 'PICKUP' | 'LCV'

export type VehicleClass = {
  id: VehicleClassId
  label: string
  capacityKg: number
  baseRs: number
  perKmRs: number
  minRs: number
  /** Battery range limit for electric loaders; null when range is not a constraint. */
  maxKm: number | null
}

export const FLEET: readonly VehicleClass[] = [
  { id: 'E_LOADER', label: 'Electric cargo three-wheeler', capacityKg: 400, baseRs: 100, perKmRs: 6, minRs: 300, maxKm: 60 },
  { id: 'MINI_TRUCK', label: 'Mini truck (Tata Ace class)', capacityKg: 750, baseRs: 200, perKmRs: 10, minRs: 500, maxKm: null },
  { id: 'PICKUP', label: 'Pickup (Bolero Pik-Up class)', capacityKg: 1500, baseRs: 300, perKmRs: 14, minRs: 800, maxKm: null },
  { id: 'LCV', label: 'Light commercial vehicle (14 ft)', capacityKg: 3500, baseRs: 600, perKmRs: 22, minRs: 1500, maxKm: null },
]

export const LARGEST_VEHICLE = FLEET[FLEET.length - 1]

export function vehicleClass(id: VehicleClassId): VehicleClass {
  return FLEET.find((v) => v.id === id)!
}

export function tripCost(vehicle: VehicleClass, km: number): number {
  return Math.max(vehicle.minRs, Math.round((vehicle.baseRs + vehicle.perKmRs * km) / 50) * 50)
}

/** The smallest vehicle that carries the load over the distance, or null when the load needs more than one of the largest. */
export function smallestFitting(loadKg: number, km: number): VehicleClass | null {
  return FLEET.find((v) => v.capacityKg >= loadKg && (v.maxKm == null || km <= v.maxKm)) ?? null
}
