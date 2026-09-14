'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Route, Truck } from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import type { CollectionPlan } from '@/lib/server/logistics'
import { RouteMap } from './route-map'

type Run = CollectionPlan['plans'][number]['plan']['runs'][number]

const inr = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

/** Load against capacity: the fill carries the value, the track is a lighter step of the same ramp. */
function LoadMeter({ run }: { run: Run }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Load</span>
        <span className="tabular-nums text-foreground">
          {nf.format(run.loadKg)} / {nf.format(run.vehicle.capacityKg * run.count)} kg · {run.utilisationPct}%
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#cde2fb] dark:bg-[#184f95]">
        <div className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${Math.min(100, run.utilisationPct)}%` }} />
      </div>
    </div>
  )
}

export function LogisticsPlanPanel({ onDispatched }: { onDispatched?: () => void }) {
  const [data, setData] = useState<CollectionPlan | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyRun, setBusyRun] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/logistics/plan', { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not plan collection runs')
      setData(json)
      setNotice(null)
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'Could not plan collection runs' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function dispatchRun(run: Run, key: string) {
    setBusyRun(key)
    try {
      const res = await fetch(`/api/orders/${run.orderIds[0]}/dispatch`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ orderIds: run.orderIds, vehicleCost: run.costRs, vehicleLabel: run.count > 1 ? `${run.count} × ${run.vehicle.label}` : run.vehicle.label }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Dispatch failed')
      setNotice({ tone: 'ok', text: `${json.consignment.code} dispatched with ${run.codes.join(', ')}. Transport cost is split across the lots by weight.` })
      onDispatched?.()
      await load()
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'Dispatch failed' })
    } finally {
      setBusyRun(null)
    }
  }

  const totals = data?.totals
  const selectedRun = data?.plans.flatMap((p, i) => p.plan.runs.map((r, j) => ({ key: `${i}-${j}`, run: r }))).find((x) => x.key === selected)?.run ?? data?.plans[0]?.plan.runs[0] ?? null

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Route className="size-4" /> Logistics planning
          </p>
          <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">Consolidated collection runs</h3>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Orders delivering on the same day share vehicles when that is cheaper: each run is sequenced pickups-before-drops and priced on the smallest vehicle that carries it. Tariffs are indicative — confirm the hire rate at dispatch.
          </p>
        </div>
        <button onClick={load} className="inline-flex h-9 items-center gap-1.5 self-start rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-foreground hover:bg-secondary/80 lg:self-auto">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-plan
        </button>
      </div>

      {notice && (
        <p className={`rounded-xl border p-3 text-xs ${notice.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>{notice.text}</p>
      )}

      {totals && (
        <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Vehicle runs</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{totals.runs}</p>
            <p className="text-[11px] text-muted-foreground">for {data?.orders ?? 0} orders with farmers lined up</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Produce to move</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{nf.format(totals.kg)} kg</p>
            <p className="text-[11px] text-muted-foreground">{totals.kg > 0 ? `${inr(totals.costRs / totals.kg)}/kg transport` : '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Route distance</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{nf.format(totals.km)} km</p>
            <p className="text-[11px] text-muted-foreground">{nf.format(totals.separateKm)} km if each order ran alone</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Transport cost</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{inr(totals.costRs)}</p>
            <p className="text-[11px] text-muted-foreground">{totals.savedCostRs > 0 ? `${inr(totals.savedCostRs)} less than separate trips` : 'no cheaper consolidation found'}</p>
          </div>
        </div>
      )}

      {data && !data.plans.length && !loading && (
        <p className="rounded-xl bg-secondary/60 p-4 text-xs text-muted-foreground">No order has farmers committed yet. Runs appear here once sourcing starts.</p>
      )}

      {data?.plans.map((group, i) => (
        <div key={`${group.deliveryDate}-${i}`} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Delivering {dayLabel(group.deliveryDate)} · from {group.fpoName}
            </h4>
            {group.plannedFromCommitments && <span className="text-[11px] text-muted-foreground">Planned from commitments — dispatch opens once lots are weighed and accepted</span>}
          </div>
          {group.unroutedOrders.length > 0 && <p className="text-[11px] text-muted-foreground">Waiting for farmers: {group.unroutedOrders.join(', ')}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {group.plan.runs.map((run, j) => {
              const key = `${i}-${j}`
              const isSelected = selectedRun === run
              return (
                <div key={key} className={`rounded-2xl border p-4 transition-colors ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/40'}`}>
                  <button onClick={() => setSelected(key)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Truck className="size-4 text-muted-foreground" />
                          {run.count > 1 ? `${run.count} × ` : ''}
                          {run.vehicle.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Orders {run.codes.join(', ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{inr(run.costRs)}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{nf.format(run.route.km)} km · {inr(run.costRs / Math.max(run.loadKg, 1))}/kg</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <LoadMeter run={run} />
                    </div>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground">{run.route.sequence.filter((s) => s.kind === 'PICKUP').length} farm stops · {run.route.solver}</span>
                    <button
                      disabled={group.plannedFromCommitments || busyRun !== null}
                      onClick={() => dispatchRun(run, key)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyRun === key && <Loader2 className="size-3.5 animate-spin" />} Dispatch run
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {selectedRun && (
        <div className="grid gap-4 lg:grid-cols-12">
          <ol className="max-h-[340px] space-y-2 overflow-y-auto pr-1 lg:col-span-5">
            {selectedRun.route.sequence.map((stop, idx) => (
              <li key={`${stop.id}-${idx}`} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 text-xs">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-bold text-foreground">{idx + 1}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {stop.label} <span className="font-normal text-muted-foreground">· {stop.kind.toLowerCase()}</span>
                  </p>
                  {stop.detail && <p className="truncate text-[11px] text-muted-foreground">{stop.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="h-[340px] lg:col-span-7">
            <RouteMap stops={selectedRun.route.sequence} />
          </div>
        </div>
      )}
    </section>
  )
}
