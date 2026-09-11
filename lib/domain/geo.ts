export type LatLng = { lat: number; lng: number }

/**
 * Straight-line distance × a road-winding factor. Rural roads in Kheda/Anand
 * run roughly 1.3× the crow-fly distance; every km figure in the app is an
 * estimate on this basis, and the UI says so.
 */
export const ROAD_FACTOR = 1.3

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function roadKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * ROAD_FACTOR
}
