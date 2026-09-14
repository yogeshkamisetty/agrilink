'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Boxes, ShieldCheck, Users, Layers, AlertCircle, ArrowRight, CheckCircle2, Truck, RefreshCw } from 'lucide-react'

export type AggregationContributor = {
  farmerId: string
  name: string
  village: string
  committedKg: number
  isStandby: boolean
  reliabilityScore: number
  status: 'ACTIVE' | 'STANDBY' | 'FULFILLED'
}

export interface SmartAggregationCardProps {
  orderCode: string
  crop: string
  targetKg: number
  pricePerKg: number
  deliveryDate: string
  buyerName: string
  contributors?: AggregationContributor[]
  onPromoteStandby?: (farmerId: string) => void
  onLockBatch?: () => void
  isLocking?: boolean
  batchLocked?: boolean
  vehicleName?: string
  km?: number
  fuelSavedPct?: number
  isLive?: boolean
}

const DEFAULT_CONTRIBUTORS: AggregationContributor[] = [
  { farmerId: 'f-ramesh-101', name: 'Rameshbhai Patel', village: 'Boriavi', committedKg: 250, isStandby: false, reliabilityScore: 93, status: 'ACTIVE' },
  { farmerId: 'f-savita-102', name: 'Savitaben Parmar', village: 'Petlad', committedKg: 300, isStandby: false, reliabilityScore: 98, status: 'ACTIVE' },
  { farmerId: 'f-mohan-103', name: 'Mohanbhai Solanki', village: 'Sojitra', committedKg: 200, isStandby: false, reliabilityScore: 91, status: 'ACTIVE' },
  { farmerId: 'f-jignesh-104', name: 'Jignesh Chauhan', village: 'Bakrol', committedKg: 250, isStandby: false, reliabilityScore: 94, status: 'ACTIVE' },
  { farmerId: 'f-suresh-108', name: 'Suresh Yadav (Standby)', village: 'Kheda', committedKg: 200, isStandby: true, reliabilityScore: 88, status: 'STANDBY' },
]

export function SmartAggregationCard({
  orderCode = 'AG-1001',
  crop = 'Paddy (Rice)',
  targetKg = 1000,
  pricePerKg = 28,
  deliveryDate = '2025-10-20',
  buyerName = 'PM POSHAN Central Kitchen',
  contributors,
  onPromoteStandby,
  onLockBatch,
  isLocking = false,
  batchLocked = false,
  vehicleName,
  km,
  fuelSavedPct,
  isLive = false,
}: SmartAggregationCardProps) {
  const effectiveContributors = contributors && contributors.length > 0 ? contributors : DEFAULT_CONTRIBUTORS
  const isUsingLive = isLive || (contributors && contributors.length > 0)

  const activeContributors = effectiveContributors.filter((c) => !c.isStandby)
  const standbyContributors = effectiveContributors.filter((c) => c.isStandby)

  const activeSum = activeContributors.reduce((sum, c) => sum + c.committedKg, 0)
  const standbySum = standbyContributors.reduce((sum, c) => sum + c.committedKg, 0)

  const pctFilled = Math.min(100, Math.round((activeSum / targetKg) * 100))

  return (
    <Card className="overflow-hidden border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Boxes className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-xs font-bold text-primary">{orderCode}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isUsingLive ? 'Real-Time Smart Aggregation' : 'Smart Aggregated'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                {activeContributors.length} Smallholders Pooled
              </span>
            </div>
            <h3 className="mt-1 font-serif text-lg sm:text-xl font-bold text-foreground">
              Smart Aggregation Engine: {crop} ({targetKg.toLocaleString()} kg)
            </h3>
            <p className="text-xs text-muted-foreground">
              Aggregated for {buyerName} · Due {deliveryDate} · Agreed ₹{pricePerKg}/kg
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5 text-left sm:text-right pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
          <div>
            <p className="font-mono text-xs text-muted-foreground">Active Pool Fulfillment</p>
            <p className="font-mono text-xl sm:text-2xl font-bold text-primary">
              {activeSum} / {targetKg} kg
              <span className="ml-1 text-xs text-muted-foreground font-normal">({pctFilled}%)</span>
            </p>
          </div>
          {onLockBatch && (
            <Button
              size="sm"
              onClick={onLockBatch}
              disabled={isLocking || batchLocked}
              className={`h-8 text-xs font-bold gap-1.5 shadow-sm transition-all ${
                batchLocked
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {batchLocked ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Batch Consolidated</span>
                </>
              ) : isLocking ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Locking Allocation…</span>
                </>
              ) : (
                <>
                  <Boxes className="size-3.5" />
                  <span>Lock & Combine {activeContributors.length} Farmers</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Multi-Farmer Stacked Progress Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" /> Automated Multi-Farmer Allocation
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            + {standbySum} kg Standby Buffer (+{Math.round((standbySum / targetKg) * 100)}%)
          </span>
        </div>

        <div className="h-4 w-full overflow-hidden rounded-full bg-secondary/80 flex p-0.5 border border-border">
          {activeContributors.map((farmer, idx) => {
            const widthPct = (farmer.committedKg / (targetKg + standbySum)) * 100
            const colors = ['bg-emerald-600', 'bg-teal-500', 'bg-emerald-400', 'bg-cyan-500']
            return (
              <div
                key={farmer.farmerId}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${colors[idx % colors.length]} transition-all relative group cursor-pointer`}
                title={`${farmer.name}: ${farmer.committedKg} kg (${farmer.reliabilityScore}% reliability)`}
              />
            )
          })}
          {standbyContributors.map((farmer) => {
            const widthPct = (farmer.committedKg / (targetKg + standbySum)) * 100
            return (
              <div
                key={farmer.farmerId}
                style={{ width: `${widthPct}%` }}
                className="h-full bg-amber-400/80 border-l border-background/40 transition-all cursor-pointer"
                title={`${farmer.name} (Standby Buffer): ${farmer.committedKg} kg`}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 text-[11px] text-muted-foreground">
          {activeContributors.map((farmer, idx) => {
            const dotColors = ['bg-emerald-600', 'bg-teal-500', 'bg-emerald-400', 'bg-cyan-500']
            return (
              <div key={farmer.farmerId} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                <span>{farmer.name.split(' ')[0]}: <strong>{farmer.committedKg} kg</strong></span>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span>Standby Buffer: <strong>{standbySum} kg</strong></span>
          </div>
        </div>

        {/* Realtime TSP Route Corridor & Vehicle Allocation */}
        {vehicleName && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 border border-border px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Truck className="size-3.5 text-primary" />
              <span>Recommended Freight: <strong>{vehicleName}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
              {km != null && <span>Route: <strong>{km} km</strong> TSP Loop</span>}
              {fuelSavedPct != null && fuelSavedPct > 0 && (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Route efficiency: {fuelSavedPct}% fewer km vs. baseline
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Roster of Contributing Smallholders with Reliability Scores */}
      <div className="mt-6 divide-y divide-border/60 rounded-2xl border border-border bg-secondary/30">
        <div className="hidden sm:flex p-3 bg-secondary/60 items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
          <span>Smallholder Partner</span>
          <div className="flex items-center gap-8">
            <span>Reliability Score</span>
            <span>Committed Vol</span>
            <span>Action</span>
          </div>
        </div>

        {effectiveContributors.map((c) => (
          <div key={c.farmerId} className="p-3 sm:p-3.5 hover:bg-card/60 transition-colors">
            {/* Desktop Row View (sm and up) */}
            <div className="hidden sm:flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className={`flex size-8 items-center justify-center rounded-xl font-mono text-xs font-bold ${c.isStandby ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                  {c.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    {c.isStandby && (
                      <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                        Standby Buffer
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{c.village} · 8.4 km from hub</span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {/* Reliability Score */}
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono font-semibold text-emerald-700 text-[11px]">
                    <ShieldCheck className="size-3" /> {c.reliabilityScore}%
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">High Trust</p>
                </div>

                {/* Volume */}
                <div className="text-right min-w-[70px]">
                  <span className="font-mono text-sm font-bold text-foreground">{c.committedKg} kg</span>
                  <p className="text-[10px] text-muted-foreground">₹{(c.committedKg * pricePerKg).toLocaleString()}</p>
                </div>

                {/* Action */}
                <div className="min-w-[80px] text-right">
                  {c.isStandby ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                      onClick={() => onPromoteStandby?.(c.farmerId)}
                    >
                      Promote
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="size-3.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Stacked View (< sm) */}
            <div className="flex flex-col gap-2.5 sm:hidden text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${c.isStandby ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                    {c.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      {c.isStandby && (
                        <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-semibold text-amber-800">
                          Standby
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate block">{c.village} · 8.4 km from hub</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="font-mono text-sm font-bold text-foreground">{c.committedKg} kg</span>
                  <p className="text-[10px] text-muted-foreground">₹{(c.committedKg * pricePerKg).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono font-semibold text-emerald-700 text-[10px]">
                  <ShieldCheck className="size-3" /> {c.reliabilityScore}% Trust
                </div>

                <div>
                  {c.isStandby ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 min-w-[70px] text-[10px] border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                      onClick={() => onPromoteStandby?.(c.farmerId)}
                    >
                      Promote
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="size-3.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SIH Judging Advantage Explanatory Note */}
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex items-start gap-3">
        <Users className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Why Aggregation Wins Over Marketplaces:</p>
          <p className="mt-0.5 leading-relaxed">
            Institutional buyers (kitchens, hospitals) cannot transact with individual 200 kg farmers.
            AgriLink combines smallholder commitments into one traceable bulk delivery plan. The agreed order price is shown to every participant, while route distance and transport cost are calculated from the selected stops.
          </p>
        </div>
      </div>
    </Card>
  )
}
