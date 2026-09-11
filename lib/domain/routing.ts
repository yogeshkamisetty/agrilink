import { roadKm, type LatLng } from './geo'

export type StopKind = 'DEPOT' | 'PICKUP' | 'DROP'
export type RouteStop = LatLng & { id: string; kind: StopKind; label: string; detail?: string; kg?: number }

export type RoutePlan = {
  sequence: RouteStop[]
  km: number
  naiveSequence: RouteStop[]
  naiveKm: number
  solver: string
}

export function pathKm(stops: LatLng[]): number {
  let total = 0
  for (let i = 1; i < stops.length; i++) total += roadKm(stops[i - 1], stops[i])
  return Math.round(total * 10) / 10
}

function nearestNeighbour(start: LatLng, stops: RouteStop[]): RouteStop[] {
  const remaining = [...stops]
  const ordered: RouteStop[] = []
  let current: LatLng = start
  while (remaining.length) {
    let best = 0
    for (let i = 1; i < remaining.length; i++) {
      if (roadKm(current, remaining[i]) < roadKm(current, remaining[best])) best = i
    }
    const [next] = remaining.splice(best, 1)
    ordered.push(next)
    current = next
  }
  return ordered
}

/**
 * 2-opt over the full path (depot fixed at index 0), but only reversing
 * sub-paths that stay inside one segment, so every pickup still happens
 * before any drop.
 */
function twoOpt(path: RouteStop[], segments: Array<[number, number]>): RouteStop[] {
  let best = [...path]
  let bestKm = pathKm(best)
  let improved = true
  while (improved) {
    improved = false
    for (const [from, to] of segments) {
      for (let i = from; i < to; i++) {
        for (let j = i + 1; j <= to; j++) {
          const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)]
          const km = pathKm(candidate)
          if (km + 1e-9 < bestKm) {
            best = candidate
            bestKm = km
            improved = true
          }
        }
      }
    }
  }
  return best
}

/**
 * Single hired vehicle: start at the FPO collection centre, visit every
 * village pickup, then every buyer drop. Open path — the vehicle does not
 * return. `pickups` and `drops` arrive in their "naive" order (the order the
 * commitments came in), which is what the optimised route is compared to.
 */
export function planRoute(depot: RouteStop, pickups: RouteStop[], drops: RouteStop[]): RoutePlan {
  const naiveSequence = [depot, ...pickups, ...drops]
  const orderedPickups = nearestNeighbour(depot, pickups)
  const orderedDrops = nearestNeighbour(orderedPickups.at(-1) ?? depot, drops)
  const initial = [depot, ...orderedPickups, ...orderedDrops]
  const segments: Array<[number, number]> = []
  if (pickups.length > 1) segments.push([1, pickups.length])
  if (drops.length > 1) segments.push([pickups.length + 1, pickups.length + drops.length])
  const sequence = twoOpt(initial, segments)
  const km = pathKm(sequence)
  const naiveKm = pathKm(naiveSequence)
  // Never report an "optimised" route that is worse than the naive one.
  return km <= naiveKm
    ? { sequence, km, naiveSequence, naiveKm, solver: 'Nearest-neighbour + 2-opt (TypeScript)' }
    : { sequence: naiveSequence, km: naiveKm, naiveSequence, naiveKm, solver: 'Nearest-neighbour + 2-opt (TypeScript)' }
}
