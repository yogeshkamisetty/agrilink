'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Layers,
  Users2,
  Building,
  CheckCircle2,
  Sparkles,
  Plus,
  Sprout,
  ShoppingBag,
  BadgeCheck,
  MapPin,
  Check,
  ArrowUpRight,
  Truck,
  Clock,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import { CommunityDemandModal } from './community-demand-modal'

export interface DemandForecastItem {
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
  status?: string
}

export interface FarmerProduceItem {
  id: string
  farmerName: string
  village: string
  crop: string
  quantityKg: number
  qualityGrade: string
  harvestDate: string
  verified: boolean
  pricePerKg: number
  mobileNumber?: string
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
    status: 'POSTED',
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
    status: 'POSTED',
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
    status: 'AGGREGATED',
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
    status: 'POSTED',
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
    status: 'AGGREGATED',
  },
]

const DEFAULT_FARMER_SUPPLIES: FarmerProduceItem[] = [
  {
    id: 'farm-sup-1',
    farmerName: 'Ramesh Kumar Patel',
    village: 'Kheda Village Cluster',
    crop: 'Tomato',
    quantityKg: 500,
    qualityGrade: 'A',
    harvestDate: '2025-10-18',
    verified: true,
    pricePerKg: 24,
    mobileNumber: '+91 98251 44102',
  },
  {
    id: 'farm-sup-2',
    farmerName: 'Savitri Devi',
    village: 'Borsad Taluka',
    crop: 'Wheat',
    quantityKg: 700,
    qualityGrade: 'A',
    harvestDate: '2025-10-25',
    verified: true,
    pricePerKg: 26,
    mobileNumber: '+91 98251 22334',
  },
  {
    id: 'farm-sup-3',
    farmerName: 'Mohan Lal Solanki',
    village: 'Vasad Riverside Block',
    crop: 'Paddy (Rice)',
    quantityKg: 1200,
    qualityGrade: 'A',
    harvestDate: '2025-10-20',
    verified: true,
    pricePerKg: 28,
    mobileNumber: '+91 98251 55667',
  },
  {
    id: 'farm-sup-4',
    farmerName: 'Bhavnaben Thakor',
    village: 'Petlad Mandi Corridor',
    crop: 'Onion',
    quantityKg: 800,
    qualityGrade: 'A',
    harvestDate: '2025-10-22',
    verified: true,
    pricePerKg: 22,
    mobileNumber: '+91 98251 77889',
  },
  {
    id: 'farm-sup-5',
    farmerName: 'Jignesh Chauhan',
    village: 'Bakrol Agricultural Zone',
    crop: 'Potato',
    quantityKg: 900,
    qualityGrade: 'B',
    harvestDate: '2025-10-24',
    verified: true,
    pricePerKg: 18,
    mobileNumber: '+91 98251 99001',
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

interface CropAvailabilityProps {
  onSelectCrop?: (crop: string) => void
  role?: 'Coordinator' | 'Buyer' | 'Farmer' | null
}

export function CropAvailability({ onSelectCrop, role }: CropAvailabilityProps = {}) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUPPLY' | 'INSTITUTIONAL' | 'COMMUNITY'>('ALL')
  const [cropFilter, setCropFilter] = useState('all')
  const [demands, setDemands] = useState<DemandForecastItem[]>(DEFAULT_FORECAST_DEMANDS)
  const [farmerSupplies, setFarmerSupplies] = useState<FarmerProduceItem[]>(DEFAULT_FARMER_SUPPLIES)
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [committedNotice, setCommittedNotice] = useState<string | null>(null)
  const [liveFarmersCount, setLiveFarmersCount] = useState<number>(7)
  const [liveFarmersKg, setLiveFarmersKg] = useState<number>(4100)

  useEffect(() => {
    let mounted = true

    const fetchLiveFeeds = async () => {
      try {
        // 1. Fetch live orders & demands from DB
        const ordersRes = await fetch('/api/orders')
        if (ordersRes.ok) {
          const ordData = await ordersRes.json()
          if (ordData.orders && Array.isArray(ordData.orders) && ordData.orders.length > 0 && mounted) {
            const mappedOrders: DemandForecastItem[] = ordData.orders.map((o: any) => {
              const cropRaw = (o.crop || o.crop_required || 'Paddy').toUpperCase()
              const cropName = cropRaw.charAt(0) + cropRaw.slice(1).toLowerCase()
              const target = Number(o.qty_target_kg || o.quantity_required || 1000)
              const committed =
                o.status === 'AGGREGATED'
                  ? target
                  : o.qty_committed_kg !== undefined && Number(o.qty_committed_kg) > 0
                  ? Number(o.qty_committed_kg)
                  : 0

              const code = o.code || `AG-${String(o.id || '1001').slice(-4).toUpperCase()}`

              return {
                id: o.id || `ord-${Math.random()}`,
                orderCode: code,
                crop: cropName,
                qtyTargetKg: target,
                qtyCommittedKg: committed,
                standbyBufferKg: Math.round(target * 0.15),
                deliveryDate: o.delivery_date
                  ? new Date(o.delivery_date).toISOString().split('T')[0]
                  : '2025-10-25',
                buyerName: o.buyer_name || o.delivery_location || 'Mid-day Meal Authority',
                buyerType: 'Institutional Buyer',
                buyerRating: 4.8,
                buyerCompletedOrders: 18,
                pricePerKg: Number(o.price_per_kg || 28),
                category: 'INSTITUTIONAL',
                status: o.status || 'POSTED',
              }
            })

            // Merge with DEFAULT_FORECAST_DEMANDS de-duplicating by orderCode / ID so defaults are NEVER wiped out
            setDemands((prev) => {
              const existingMap = new Map<string, DemandForecastItem>()
              // Put default baseline institutional and community demands first
              for (const def of DEFAULT_FORECAST_DEMANDS) {
                existingMap.set(def.orderCode, def)
              }
              // Overlay or append live orders from DB
              for (const mo of mappedOrders) {
                existingMap.set(mo.orderCode, mo)
              }
              // Keep any client-created community demands
              for (const p of prev) {
                if (p.id.startsWith('comm-') && !existingMap.has(p.orderCode)) {
                  existingMap.set(p.orderCode, p)
                }
              }
              return Array.from(existingMap.values())
            })
          }
        }

        // 2. Fetch live farmers & harvests from DB
        const farmersRes = await fetch('/api/farmers')
        if (farmersRes.ok) {
          const farmData = await farmersRes.json()
          if (farmData.farmers && Array.isArray(farmData.farmers) && farmData.farmers.length > 0 && mounted) {
            setLiveFarmersCount(farmData.farmers.length)
            const totalKg = farmData.farmers.reduce((sum: number, f: any) => sum + Number(f.quantity || 500), 0)
            setLiveFarmersKg(totalKg)

            const mappedFarmers: FarmerProduceItem[] = farmData.farmers.map((f: any, idx: number) => {
              const rawCrop = (f.crop_name || f.crop || 'Paddy').toUpperCase()
              const displayCrop = rawCrop.charAt(0) + rawCrop.slice(1).toLowerCase()
              const kg = Number(f.quantity || 500)
              const priceEstimate = rawCrop.includes('TOMATO') ? 24 : rawCrop.includes('WHEAT') ? 26 : rawCrop.includes('ONION') ? 22 : rawCrop.includes('POTATO') ? 18 : 28

              return {
                id: f.id || `farm-live-${idx}`,
                farmerName: f.name || 'Verified Smallholder',
                village: f.village || 'Kheda Cluster',
                crop: displayCrop,
                quantityKg: kg,
                qualityGrade: f.quality_grade || 'A',
                harvestDate: f.harvest_date || 'Oct 2025',
                verified: f.verified ?? true,
                pricePerKg: priceEstimate,
                mobileNumber: f.mobile_number || '+91 98251 44102',
              }
            })

            // Merge with defaults de-duplicating by farmerName / ID
            setFarmerSupplies(() => {
              const map = new Map<string, FarmerProduceItem>()
              // Add live database farmers first (newest entries first)
              for (const mf of mappedFarmers) {
                map.set(mf.id || mf.farmerName, mf)
              }
              // Supplement with defaults if fewer than 5
              for (const def of DEFAULT_FARMER_SUPPLIES) {
                if (!map.has(def.id) && !map.has(def.farmerName)) {
                  map.set(def.id, def)
                }
              }
              return Array.from(map.values())
            })
          }
        }
      } catch {}
    }

    fetchLiveFeeds()
    const timer = setInterval(fetchLiveFeeds, 20000)
    const onOrderCreated = () => fetchLiveFeeds()
    const onHarvestUpdated = () => fetchLiveFeeds()

    if (typeof window !== 'undefined') {
      window.addEventListener('agrilink:order-created', onOrderCreated)
      window.addEventListener('agrilink:harvest-updated', onHarvestUpdated)
    }

    return () => {
      mounted = false
      clearInterval(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('agrilink:order-created', onOrderCreated)
        window.removeEventListener('agrilink:harvest-updated', onHarvestUpdated)
      }
    }
  }, [])

  // Filter demands by tab and crop
  const filteredDemands = useMemo(() => {
    return demands.filter((item) => {
      const matchTab =
        activeTab === 'ALL' ||
        (activeTab === 'INSTITUTIONAL' && item.category === 'INSTITUTIONAL') ||
        (activeTab === 'COMMUNITY' && item.category === 'COMMUNITY')
      const matchCrop = cropFilter === 'all' || item.crop.toLowerCase().includes(cropFilter.toLowerCase())
      return matchTab && matchCrop
    })
  }, [demands, activeTab, cropFilter])

  // Filter farmer supplies by tab and crop
  const filteredSupplies = useMemo(() => {
    if (activeTab === 'INSTITUTIONAL' || activeTab === 'COMMUNITY') return []
    return farmerSupplies.filter((item) => {
      return cropFilter === 'all' || item.crop.toLowerCase().includes(cropFilter.toLowerCase())
    })
  }, [farmerSupplies, activeTab, cropFilter])

  const handleCommitDemand = (item: DemandForecastItem) => {
    setDemands((prev) =>
      prev.map((d) =>
        d.id === item.id
          ? { ...d, qtyCommittedKg: Math.min(d.qtyTargetKg, d.qtyCommittedKg + 100) }
          : d
      )
    )
    setCommittedNotice(`Successfully committed 100 kg to ${item.crop} demand for ${item.buyerName}!`)
    setTimeout(() => setCommittedNotice(null), 4000)
  }

  const handleSourceCrop = (cropName: string, quantity?: number, price?: number) => {
    if (onSelectCrop) onSelectCrop(cropName)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('agrilink:open-order', {
          detail: { crop: cropName, qty: quantity, price },
        })
      )
    }
    setCommittedNotice(`Opening purchase order for ${cropName}. Configuring contract...`)
    setTimeout(() => setCommittedNotice(null), 3500)
  }

  const handleOpenCreateDemand = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('agrilink:open-order', {
          detail: { crop: cropFilter !== 'all' ? cropFilter.toUpperCase() : 'PADDY' },
        })
      )
    }
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
      status: 'POSTED',
    }
    setDemands((prev) => [created, ...prev])
    setCommittedNotice(`Community demand pool for ${newDemand.crop} (${newDemand.qtyKg} KG) published to local FPO smallholders!`)
    setTimeout(() => setCommittedNotice(null), 4000)
  }

  const isBuyerRole = role === 'Buyer'

  return (
    <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
      {/* 1. Header Banner */}
      <div className="border-b border-border bg-secondary/40 p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                <TrendingUp className="h-4 w-4" /> Demand Prediction & Supply Planning Board
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live: {liveFarmersCount} Verified Smallholders · {liveFarmersKg.toLocaleString()} KG Produce Registered
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {demands.length} Procurement Demands
              </span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-bold">
              Live Produce Supply & Demand Forecast
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Direct connection between smallholder harvests and institutional kitchens. Buyers lock forward contracts 7–30 days in advance; smallholders commit production before harvest to eliminate distress sales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreateDemand}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-primary/90 transition-all min-h-[40px] cursor-pointer"
            >
              <Plus className="size-3.5" /> Post Future Demand
            </button>
            <button
              onClick={() => setShowCommunityModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2.5 text-xs font-semibold transition-colors min-h-[40px] cursor-pointer"
            >
              <Users2 className="size-3.5" /> Community Pool
            </button>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              aria-label="Filter by Crop"
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs"
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
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Live Market Feeds ({demands.length + farmerSupplies.length})
          </button>

          <button
            onClick={() => setActiveTab('SUPPLY')}
            className={`rounded-xl px-4 py-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SUPPLY'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sprout className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Live Farmer Produce Supply ({farmerSupplies.length})
          </button>

          <button
            onClick={() => setActiveTab('INSTITUTIONAL')}
            className={`rounded-xl px-4 py-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'INSTITUTIONAL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building className="size-3.5" />
            Institutional Kitchen Demands ({demands.filter((d) => d.category === 'INSTITUTIONAL').length})
          </button>

          <button
            onClick={() => setActiveTab('COMMUNITY')}
            className={`rounded-xl px-4 py-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'COMMUNITY'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users2 className="size-3.5" />
            Community Event Pools ({demands.filter((d) => d.category === 'COMMUNITY').length})
          </button>
        </div>
      </div>

      {committedNotice && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{committedNotice}</span>
        </div>
      )}

      {/* 5-Step Clear Flow Operational Lifecycle Pipeline */}
      <div className="border-b border-border bg-card px-5 sm:px-7 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              AgriLink Core Operating Flow · From Farmgate to Institutional Buyer
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Predictive AI · Knapsack Aggregation · TSP 2-Opt Routing · Zero-Brokerage Escrow
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[
            {
              step: '1',
              title: 'Demand Prediction',
              badge: '7–30d Advance',
              desc: 'Institutional kitchens & community pools lock forward procurement contracts with escrow deposit.',
            },
            {
              step: '2',
              title: 'Harvest Planning',
              badge: 'Marginal Farmers',
              desc: 'Smallholders declare produce acreage & commit pre-harvest output to avoid Mandi distress sale.',
            },
            {
              step: '3',
              title: 'Knapsack Aggregation',
              badge: '+15% Standby Reserve',
              desc: 'Multi-criteria solver combines smallholders by corridor proximity, reliability & AGMARKNET Grade A.',
            },
            {
              step: '4',
              title: 'TSP 2-Opt Runway',
              badge: 'Corridor Pickup',
              desc: 'Vehicle routing solver dispatches Tata Ace / Bolero to visit village waypoints with 30%+ fuel savings.',
            },
            {
              step: '5',
              title: 'QC & Escrow DBT',
              badge: 'Instant 15s Payout',
              desc: 'Farmgate GradeCam inspection unlocks escrow directly to farmer bank accounts without deductions.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-border bg-secondary/30 p-3 flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold font-mono">
                    {s.step}
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {s.badge}
                  </span>
                </div>
                <h5 className="mt-2 text-xs font-bold text-foreground">{s.title}</h5>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Shows Live Supplies and/or Demand Forecasts */}
      <div className="p-5 sm:p-7 space-y-8">
        {/* Section A: Live Smallholder Farmer Produce (Ready to Source) */}
        {filteredSupplies.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="size-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-serif text-xl font-bold text-foreground">
                  Live Farmgate Smallholder Produce
                </h3>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Ready for Procurement
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {filteredSupplies.length} Verified Harvests Available
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSupplies.map((supply) => {
                const imageSrc = cropImages[supply.crop.toLowerCase()] || '/crops/tomato.png'

                return (
                  <article
                    key={supply.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-600/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-1 flex items-center justify-center">
                            <img
                              src={imageSrc}
                              alt={supply.crop}
                              className="size-full object-contain group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                <BadgeCheck className="size-3" /> Grade {supply.qualityGrade} Assured
                              </span>
                            </div>
                            <h4 className="font-serif text-xl font-bold text-foreground mt-1">
                              {supply.crop}
                            </h4>
                            <p className="text-xs font-semibold text-foreground/80 mt-0.5">
                              {supply.farmerName}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-bold text-primary">₹{supply.pricePerKg}/kg</span>
                          <p className="text-[10px] text-muted-foreground">Mandi Rate</p>
                        </div>
                      </div>

                      {/* Smallholder Location & Verification */}
                      <div className="mt-4 rounded-xl bg-secondary/50 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" /> Location:
                          </span>
                          <span className="font-medium text-foreground">{supply.village}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Verification:
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Aadhaar KYC Verified</span>
                        </div>
                      </div>

                      {/* Quantity & Availability Badge */}
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          Available Farmgate Volume:
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {supply.quantityKg.toLocaleString()} KG
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5 border-t border-border/60 pt-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5 text-primary shrink-0" />
                        Harvest: {supply.harvestDate}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSourceCrop(supply.crop, supply.quantityKg, supply.pricePerKg)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all w-full min-[380px]:w-auto cursor-pointer"
                      >
                        <ShoppingBag className="size-3.5" />
                        <span>Source Produce</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* Section B: Upcoming Produce Demand Forecast (Forward Contracts) */}
        {filteredDemands.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="size-5 text-primary" />
                <h3 className="font-serif text-xl font-bold text-foreground">
                  Upcoming Produce Demand Forecast & Forward Contracts
                </h3>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  Supply Planning
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {filteredDemands.length} Active Forecasts
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredDemands.map((item) => {
                const imageSrc = cropImages[item.crop.toLowerCase()] || '/crops/tomato.png'
                const pct = Math.min(100, Math.round((item.qtyCommittedKg / item.qtyTargetKg) * 100))
                const isFull = pct >= 100 || item.status === 'AGGREGATED'

                const delivery = new Date(item.deliveryDate)
                const now = new Date()
                const diffDays = Math.max(1, Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                const mandiDistressPrice = Math.max(12, Math.round(item.pricePerKg * 0.76))
                const farmerUplift = item.pricePerKg - mandiDistressPrice

                const surgeBadge =
                  item.crop.toLowerCase().includes('tomato')
                    ? '+35% School Kitchen Surge'
                    : item.crop.toLowerCase().includes('paddy') || item.crop.toLowerCase().includes('rice')
                    ? '+28% Poshan Forward Demand'
                    : item.crop.toLowerCase().includes('wheat')
                    ? '+24% Rabi Grain Buffer Demand'
                    : '+30% Festive Bulk Sourcing'

                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      {/* Predictive Surge & Countdown Indicator */}
                      <div className="mb-2.5 flex items-center justify-between gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-bold text-amber-800 dark:text-amber-300">
                          <Flame className="size-3 text-amber-600" />
                          {surgeBadge}
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-mono font-medium">
                          <Clock className="size-3 text-primary" /> {diffDays}d harvest window
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-1 flex items-center justify-center">
                            <img
                              src={imageSrc}
                              alt={item.crop}
                              className="size-full object-contain group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-primary">{item.orderCode}</span>
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                {item.category === 'COMMUNITY' ? 'Community Pool' : 'B2B Institutional'}
                              </span>
                            </div>
                            <h4 className="font-serif text-xl font-bold text-foreground mt-0.5">{item.crop}</h4>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.buyerName}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-bold text-primary">₹{item.pricePerKg}/kg</span>
                          <p className="text-[10px] text-muted-foreground">Guaranteed</p>
                        </div>
                      </div>

                      {/* Buyer Trust Rating Badge */}
                      <div className="mt-3.5 flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-1.5 text-xs">
                        <span className="text-muted-foreground">{item.buyerType}</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          ★ {item.buyerRating}{' '}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({item.buyerCompletedOrders} orders)
                          </span>
                        </span>
                      </div>

                      {/* AGMARKNET Price Protection Uplift */}
                      <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs">
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                          <ShieldCheck className="size-3.5 text-emerald-600" /> Price Protection:
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          +₹{farmerUplift}/kg vs Mandi (₹{mandiDistressPrice})
                        </span>
                      </div>

                      {/* Aggregation Progress Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <Layers className="size-3.5 text-primary" /> Aggregation Progress
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {item.qtyCommittedKg.toLocaleString()} / {item.qtyTargetKg.toLocaleString()} kg ({pct}%)
                          </span>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFull ? 'bg-emerald-600' : pct > 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>Delivery: {item.deliveryDate}</span>
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">
                            +{item.standbyBufferKg} kg Buffer (15%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5 border-t border-border/60 pt-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5 text-primary shrink-0" /> Harvest by {item.deliveryDate}
                      </span>

                      {isBuyerRole ? (
                        <button
                          type="button"
                          onClick={() => handleSourceCrop(item.crop, item.qtyTargetKg, item.pricePerKg)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 text-xs font-bold transition-all w-full min-[380px]:w-auto cursor-pointer"
                        >
                          <Plus className="size-3.5" /> Post Similar Demand
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCommitDemand(item)}
                          disabled={isFull}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 min-h-[38px] text-xs font-bold shadow-xs transition-all w-full min-[380px]:w-auto ${
                            isFull
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 cursor-default'
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
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {filteredSupplies.length === 0 && filteredDemands.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Sprout className="mx-auto size-8 text-muted-foreground mb-2" />
            <h4 className="font-serif text-lg font-bold text-foreground">No Live Entries for this Filter</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No crops or demands match &quot;{cropFilter}&quot;. Try switching the crop filter above to All Crops.
            </p>
            <button
              onClick={() => setCropFilter('all')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 cursor-pointer"
            >
              Reset Filter to All Crops
            </button>
          </div>
        )}
      </div>

      <CommunityDemandModal
        isOpen={showCommunityModal}
        onClose={() => setShowCommunityModal(false)}
        onSubmitCommunityDemand={handleCreateCommunityDemand}
      />
    </section>
  )
}
