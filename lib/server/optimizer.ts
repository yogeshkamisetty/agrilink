import { ROAD_FACTOR } from '@/lib/domain/geo'
import { pathKm, planRoute, type RoutePlan, type RouteStop } from '@/lib/domain/routing'

/**
 * Route optimisation. When OPTIMIZER_URL points at the FastAPI service
 * (services/optimizer), Google OR-Tools solves the pickup-then-drop route;
 * otherwise, or if the service fails, the TypeScript heuristic does. Distances
 * are always recomputed here so both solvers are measured the same way.
 */
export async function optimiseRoute(depot: RouteStop, pickups: RouteStop[], drops: RouteStop[]): Promise<RoutePlan> {
  const local = planRoute(depot, pickups, drops)
  const url = process.env.OPTIMIZER_URL
  if (!url || pickups.length + drops.length < 2) return local
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/optimize-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depot, pickups, drops, road_factor: ROAD_FACTOR }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { sequence?: string[]; solver?: string }
    const byId = new Map([depot, ...pickups, ...drops].map((s) => [s.id, s]))
    const sequence = (data.sequence ?? []).map((id) => byId.get(id))
    const valid =
      sequence.length === byId.size &&
      sequence.every(Boolean) &&
      new Set(data.sequence).size === byId.size &&
      sequence[0]!.id === depot.id &&
      sequence.findIndex((s) => s!.kind === 'DROP') > sequence.findLastIndex((s) => s!.kind === 'PICKUP')
    if (!valid) throw new Error('service returned an incomplete or out-of-order route')
    const km = pathKm(sequence as RouteStop[])
    return km <= local.km + 0.05
      ? { sequence: sequence as RouteStop[], km, naiveSequence: local.naiveSequence, naiveKm: local.naiveKm, solver: data.solver ?? 'Google OR-Tools' }
      : { ...local, solver: `${local.solver} (beat OR-Tools result)` }
  } catch (error) {
    return { ...local, solver: `${local.solver} — OR-Tools service unavailable (${(error as Error).message})` }
  }
}
