'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Users2,
  Building,
  CheckCircle2,
  Sparkles,
  Plus
} from 'lucide-react'
import { CommunityDemandModal } from './community-demand-modal'

interface DemandForecastItem {
  id: string
  orderCode: string
  crop: string
  qtyTargetKg: number
  qtyCommittedKg: number
  standbyBufferKg: number
  deliveryDate: string
  buyerName: string
  buyerType: string
  buyerRating: number
  buyerCompletedOrders: number
  pricePerKg: number
  category: 'INSTITUTIONAL' | 'COMMUNITY'
}

const DEFAULT_FORECAST_DEMANDS: DemandForecastItem[] = [
  {
    id: 'dem-01',
    orderCode: 'AG-1001',
    crop: 'Paddy (Rice)',
    qtyTargetKg: 1000,
    qtyCommittedKg: 750,
    standbyBufferKg: 200,
    deliveryDate: '2025-10-20',
    buyerName: 'PM POSHAN Central Kitchen',
    buyerType: 'Mid-Day Meal Authority',
    buyerRating: 4.9,
    buyerCompletedOrders: 24,
    pricePerKg: 28,
    category: 'INSTITUTIONAL',
  },
  {
    id: 'dem-02',
    orderCode: 'AG-1002',
    crop: 'Tomato',
    qtyTargetKg: 500,
    qtyCommittedKg: 350,
    standbyBufferKg: 100,
    deliveryDate: '2025-10-18',
    buyerName: 'Civil Hospital Canteen Trust',
    buyerType: 'Healthcare Kitchen',
    buyerRating: 4.8,
    buyerCompletedOrders: 16,
    pricePerKg: 24,
    category: 'INSTITUTIONAL',
  },
  {
    id: 'dem-03',
    orderCode: 'AG-1003',
    crop: 'Wheat',
    qtyTargetKg: 1200,
    qtyCommittedKg: 1200,
    standbyBufferKg: 250,
    deliveryDate: '2025-10-25',
    buyerName: 'Jan Poshan Kendra · FPS No. 214',
    buyerType: 'Fair Price Shop Network',
    buyerRating: 4.7,
    buyerCompletedOrders: 19,
    pricePerKg: 26,
    category: 'INSTITUTIONAL',
  },
  {
    id: 'dem-04',
    orderCode: 'COMM-01',
    crop: 'Onion',
    qtyTargetKg: 300,
    qtyCommittedKg: 200,
    standbyBufferKg: 50,
    deliveryDate: '2025-10-22',
    buyerName: 'Patel Family Wedding Reception (500 Guests)',
    buyerType: 'Community Event Pool',
    buyerRating: 5.0,
    buyerCompletedOrders: 3,
    pricePerKg: 22,
    category: 'COMMUNITY',
  },
  {
    id: 'dem-05',
    orderCode: 'COMM-02',
    crop: 'Potato',
    qtyTargetKg: 400,
    qtyCommittedKg: 400,
    standbyBufferKg: 80,
    deliveryDate: '2025-10-24',
    buyerName: 'Shreeji Heights Society Bulk Group Buy',
    buyerType: 'Residential Association',
    buyerRating: 4.9,
    buyerCompletedOrders: 12,
    pricePerKg: 18,
    category: 'COMMUNITY',
  },
]

const cropImages: Record<string, string> = {
  tomato: '/crops/tomato.png',
  wheat: '/crops/wheat.png',
  paddy: '/crops/paddy.png',
  rice: '/crops/paddy.png',
  onion: '/crops/onion.png',
  potato: '/crops/potato.png',
}

export function CropAvailability({ onSelectCrop }: { onSelectCrop?: (crop: string) => void } = {}) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'INSTITUTIONAL' | 'COMMUNITY'>('ALL')
  const [cropFilter, setCropFilter] = useState('all')
  const [demands, setDemands] = useState<DemandForecastItem[]>(DEFAULT_FORECAST_DEMANDS)
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [committedNotice, setCommittedNotice] = useState<string | null>(null)

  const filteredDemands = useMemo(() => {
    return demands.filter((item) => {
      const matchTab = activeTab === 'ALL' || item.category === activeTab
      const matchCrop = cropFilter === 'all' || item.crop.toLowerCase().includes(cropFilter.toLowerCase())
      return matchTab && matchCrop
    })
  }, [demands, activeTab, cropFilter])

  const handleCommitDemand = (item: DemandForecastItem) => {
    setDemands((prev) =>
      prev.map((d) =>
        d.id === item.id
          ? { ...d, qtyCommittedKg: Math.min(d.qtyTargetKg, d.qtyCommittedKg + 100) }
          : d
      )
    )
    setCommittedNotice(`Successfully committed 100 kg to ${item.crop} demand for ${item.buyerName}!`)
    setTimeout(() => setCommittedNotice(null), 3500)
  }

  const handleCreateCommunityDemand = (newDemand: any) => {
    const created: DemandForecastItem = {
      id: `comm-${Date.now()}`,
      orderCode: `COMM-0${demands.length + 1}`,
      crop: newDemand.crop,
      qtyTargetKg: newDemand.qtyKg,
      qtyCommittedKg: 0,
      standbyBufferKg: Math.round(newDemand.qtyKg * 0.2),
      deliveryDate: newDemand.deliveryDate,
      buyerName: newDemand.title,
      buyerType: 'Community Event Pool',
      buyerRating: 5.0,
      buyerCompletedOrders: 1,
      pricePerKg: 24,
      category: 'COMMUNITY',
    }
    setDemands((prev) => [created, ...prev])
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      {/* Header Banner */}
      <div className="border-b border-border bg-secondary/40 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <TrendingUp className="h-4 w-4" /> Demand Prediction & Supply Planning Board
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-bold">Upcoming Produce Demand Forecast</h2>
            <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Institutional buyers & community pools forecast their culinary requirements 7–30 days in advance.
              Smallholders lock in production contracts before harvest, eliminating market uncertainty.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCommunityModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 text-xs font-semibold transition-colors shadow-xs min-h-[38px]"
            >
              <Plus className="size-3.5" /> Post Community Event Demand
            </button>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="h-9.5 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Crops</option>
              <option value="paddy">Paddy (Rice)</option>
              <option value="wheat">Wheat</option>
              <option value="tomato">Tomato</option>
              <option value="onion">Onion</option>
              <option value="potato">Potato</option>
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`rounded-xl px-3.5 py-1.5 transition-all ${
              activeTab === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Forecasted Demands ({demands.length})
          </button>
          <button
            onClick={() => setActiveTab('INSTITUTIONAL')}
            className={`rounded-xl px-3.5 py-1.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'INSTITUTIONAL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building className="size-3.5" /> Institutional Kitchens & FPS
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITY')}
            className={`rounded-xl px-3.5 py-1.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'COMMUNITY'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users2 className="size-3.5" /> Community Event Pool (Weddings & Bulk)
          </button>
        </div>
      </div>

      {committedNotice && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{committedNotice}</span>
        </div>
      )}

      {/* Demand Cards Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDemands.map((item) => {
            const imageSrc = cropImages[item.crop.toLowerCase()] || '/crops/tomato.png'
            const pct = Math.min(100, Math.round((item.qtyCommittedKg / item.qtyTargetKg) * 100))
            const isFull = pct >= 100

            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-1 flex items-center justify-center">
                        <img
                          src={imageSrc}
                          alt={item.crop}
                          className="size-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-primary">{item.orderCode}</span>
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                            {item.category === 'COMMUNITY' ? 'Community' : 'B2B'}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-foreground mt-0.5">{item.crop}</h3>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[170px]">{item.buyerName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-primary">₹{item.pricePerKg}/kg</span>
                      <p className="text-[10px] text-muted-foreground">Guaranteed</p>
                    </div>
                  </div>

                  {/* Buyer Trust Rating Badge */}
                  <div className="mt-3.5 flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">{item.buyerType}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      ★ {item.buyerRating} <span className="text-[10px] text-muted-foreground font-normal">({item.buyerCompletedOrders} orders)</span>
                    </span>
                  </div>

                  {/* Aggregation Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Layers className="size-3 text-primary" /> Aggregation Progress
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {item.qtyCommittedKg} / {item.qtyTargetKg} kg ({pct}%)
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-emerald-600' : 'bg-primary'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>Delivery: {item.deliveryDate}</span>
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        +{item.standbyBufferKg} kg Standby Buffer
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5 border-t border-border/60 pt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="size-3 text-primary shrink-0" /> Harvest by {item.deliveryDate}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCommitDemand(item)}
                    disabled={isFull}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-semibold shadow-xs transition-all w-full min-[380px]:w-auto ${
                      isFull
                        ? 'bg-emerald-500/20 text-emerald-700 cursor-default'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95 cursor-pointer'
                    }`}
                  >
                    {isFull ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> Fully Aggregated
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" /> Commit Harvest
                      </>
                    )}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <CommunityDemandModal
        isOpen={showCommunityModal}
        onClose={() => setShowCommunityModal(false)}
        onSubmitCommunityDemand={handleCreateCommunityDemand}
      />
    </section>
  )
}
