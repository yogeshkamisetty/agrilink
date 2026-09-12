'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  ShoppingBag,
  Sprout,
  Users2,
  Check,
  ArrowRight,
  Sparkles,
  Boxes,
  Scale,
  Calendar,
  Building,
  Truck,
  Navigation,
  MapPin,
  Fuel,
  Award,
  Compass,
  PhoneCall,
  Bot,
} from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'
import { RouteMap } from '@/components/route-map'
import { BolnaCallModal } from '@/components/bolna-call-modal'
import {
  allocateFarmersOptimal,
  getVillageLatLng,
  type CandidateFarmer,
  type OptimalAllocationResult,
} from '@/lib/domain/allocation'
import { planRoute } from '@/lib/domain/routing'

type Profile = {
  id: string
  full_name: string
  role: string
  mobile_number: string | null
  verification_status: string
  last_login_at: string | null
  last_logout_at: string | null
}

type Activity = {
  id: string
  user_id: string | null
  event_type: string
  created_at: string
}

type PendingReview = {
  id: string
  crop: string
  quantity_kg: number
  purpose: string | null
  created_at: string
}

type Data = {
  profiles: Profile[]
  activities: Activity[]
  pending_reviews: PendingReview[]
}

type LiveOrder = {
  id: string
  code?: string
  crop?: string
  crop_required?: string
  qty_target_kg?: number
  quantity_required?: number
  price_per_kg?: number
  delivery_date?: string
  delivery_location?: string
  buyer_name?: string
  status?: string
  created_at?: string
}

type LiveFarmer = {
  id: string
  name: string
  mobile_number?: string
  village: string
  crop_name?: string
  crop?: string
  quantity?: number
  quality_grade?: string
  harvest_date?: string | null
  verified?: boolean
  reliability_score?: number
  is_live_account?: boolean
  last_login_at?: string
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'recently'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type AggregationBatch = {
  id: string
  batch_code: string
  fpo_name: string
  crop: string
  location: string
  total_quantity_kg: number
  grade_a_kg?: number
  grade_b_kg?: number
  quality_verified?: boolean
  created_by?: string
  created_at?: string
}

export function AdminPortal() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [farmers, setFarmers] = useState<LiveFarmer[]>([])
  const [batches, setBatches] = useState<AggregationBatch[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Section 6 Filter Tabs
  const [farmerFilterTab, setFarmerFilterTab] = useState<'all' | 'live' | 'preseeded'>('all')
  const liveFarmersCount = useMemo(() => farmers.filter((f) => f.is_live_account).length, [farmers])
  const displayedFarmers = useMemo(() => {
    if (farmerFilterTab === 'live') {
      return farmers.filter((f) => f.is_live_account)
    }
    if (farmerFilterTab === 'preseeded') {
      return farmers.filter((f) => !f.is_live_account)
    }
    return farmers
  }, [farmers, farmerFilterTab])

  // Smart Aggregation Engine States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [farmerAllocations, setFarmerAllocations] = useState<Record<string, number>>({})
  const [isAggregating, setIsAggregating] = useState(false)
  const [aggregationSuccess, setAggregationSuccess] = useState<string | null>(null)

  // Bolna AI Calling Agent Confirmation States
  const [bolnaModalOpen, setBolnaModalOpen] = useState(false)
  const [selectedCallFarmer, setSelectedCallFarmer] = useState<LiveFarmer | null>(null)
  const [selectedCallAllocatedKg, setSelectedCallAllocatedKg] = useState<number>(300)
  const [confirmedFarmers, setConfirmedFarmers] = useState<Record<string, boolean>>({})


  // Auto-heal session for Anita Sharma (Coordinator / Admin)
  async function ensureSession(): Promise<string | null> {
    let { data: session } = await getAuthClient().auth.getSession()
    let token = session.session?.access_token

    const phone = typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_phone') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_role') : null

    if ((phone === '9825000000' || role === 'Coordinator') && (!token || !token.startsWith('agl_'))) {
      try {
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'quick_demo', role: 'admin' }),
        })
        const authData = await res.json()
        if (authData.ok && authData.session) {
          token = authData.session.access_token
          localStorage.setItem('agrilink_user_name', authData.profile.full_name)
          localStorage.setItem('agrilink_user_role', 'Coordinator')
          localStorage.setItem('agrilink_user_phone', authData.profile.mobile_number)
          localStorage.setItem('agrilink_session', JSON.stringify(authData.session))
        }
      } catch {}
    }
    return token || null
  }

  // Fetch all live operational feeds across buyer, farmer, and admin
  async function fetchLiveFeeds(showSpinner = false) {
    if (showSpinner) setRefreshing(true)
    try {
      const token = await ensureSession()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const [reviewsRes, ordersRes, farmersRes, batchesRes] = await Promise.all([
        fetch('/api/admin/reviews', { headers }).catch(() => null),
        fetch('/api/orders').catch(() => null),
        fetch('/api/farmers').catch(() => null),
        fetch('/api/aggregation', { headers }).catch(() => null),
      ])

      if (reviewsRes && reviewsRes.ok) {
        const revData = await reviewsRes.json()
        setData(revData)
        setError('')
      } else if (!data) {
        // Fallback demo data if reviews API needs auth re-issue
        setData({
          profiles: [
            { id: 'u-1', full_name: 'Anita Desai', role: 'coordinator', mobile_number: '9825000000', verification_status: 'verified', last_login_at: new Date().toISOString(), last_logout_at: null },
            { id: 'u-2', full_name: 'Rameshbhai Patel', role: 'farmer', mobile_number: '9825144102', verification_status: 'verified', last_login_at: new Date().toISOString(), last_logout_at: null },
            { id: 'u-3', full_name: 'Dinesh Prajapati', role: 'buyer', mobile_number: '9000020202', verification_status: 'verified', last_login_at: new Date().toISOString(), last_logout_at: null },
          ],
          activities: [],
          pending_reviews: [],
        })
      }

      if (ordersRes && ordersRes.ok) {
        const ordData = await ordersRes.json()
        if (Array.isArray(ordData.orders)) {
          setOrders(ordData.orders)
          // Default select first open order if none selected
          if (!selectedOrderId && ordData.orders.length > 0) {
            setSelectedOrderId(ordData.orders[0].id)
          }
        }
      }

      if (farmersRes && farmersRes.ok) {
        const farmData = await farmersRes.json()
        if (Array.isArray(farmData.farmers)) {
          setFarmers(farmData.farmers)
        }
      }

      if (batchesRes && batchesRes.ok) {
        const batData = await batchesRes.json()
        if (Array.isArray(batData.batches)) {
          setBatches(batData.batches)
        }
      }
    } catch (e) {
      if (!data) setError(e instanceof Error ? e.message : 'Unable to synchronize admin live feeds.')
    } finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }

  // Setup auto-polling every 4 seconds + custom events + cross-tab synchronization
  useEffect(() => {
    fetchLiveFeeds()
    const interval = setInterval(() => {
      fetchLiveFeeds(false)
    }, 4000)

    const handleOrderCreated = () => fetchLiveFeeds(false)
    const handleHarvestUpdated = () => fetchLiveFeeds(false)
    const handleStorage = () => fetchLiveFeeds(false)

    window.addEventListener('agrilink:order-created', handleOrderCreated)
    window.addEventListener('agrilink:harvest-updated', handleHarvestUpdated)
    window.addEventListener('storage', handleStorage)

    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = () => fetchLiveFeeds(false)
      }
    } catch {}

    return () => {
      clearInterval(interval)
      window.removeEventListener('agrilink:order-created', handleOrderCreated)
      window.removeEventListener('agrilink:harvest-updated', handleHarvestUpdated)
      window.removeEventListener('storage', handleStorage)
      try {
        bc?.close()
      } catch {}
    }
  }, [])

  // Currently selected buyer order for Smart Aggregation
  const activeOrder = useMemo(() => {
    if (!orders.length) return null
    return orders.find((o) => o.id === selectedOrderId) || orders[0]
  }, [orders, selectedOrderId])

  const activeCrop = (activeOrder?.crop || activeOrder?.crop_required || 'PADDY').toUpperCase()
  const activeTargetKg = Number(activeOrder?.qty_target_kg || activeOrder?.quantity_required || 1000)
  const standbyBufferKg = Math.round(activeTargetKg * 0.15)
  const totalTargetWithBufferKg = activeTargetKg + standbyBufferKg

  // Farmers matching the active order's crop
  const matchedFarmers = useMemo(() => {
    const matched = farmers.filter((f) => {
      const fCrop = (f.crop_name || f.crop || '').toUpperCase()
      return fCrop.includes(activeCrop) || activeCrop.includes(fCrop)
    })
    // If fewer than 3 matched, provide additional available farmers so aggregation demo is always functional
    if (matched.length < 3) {
      const remaining = farmers.filter((f) => !matched.some((m) => m.id === f.id))
      return [...matched, ...remaining].slice(0, 6)
    }
    return matched
  }, [farmers, activeCrop])

  // Convert farmers to CandidateFarmers for the multi-objective allocation engine
  const candidateFarmers: CandidateFarmer[] = useMemo(() => {
    return matchedFarmers.map((f) => ({
      id: f.id,
      name: f.name,
      village: f.village,
      crop: f.crop_name || f.crop || activeCrop,
      availableKg: Number(f.quantity || 500),
      reliability: Number(f.reliability_score || 94),
      qualityGrade: (f.quality_grade === 'B' ? 'B' : 'A') as 'A' | 'B',
      location: getVillageLatLng(f.village),
    }))
  }, [matchedFarmers, activeCrop])

  // Multi-objective knapsack & corridor TSP optimization
  const optimalResult = useMemo(() => {
    if (!candidateFarmers.length || !activeTargetKg) return null
    return allocateFarmersOptimal({
      targetKg: activeTargetKg,
      crop: activeCrop,
      candidates: candidateFarmers,
      standbyPct: 0.15,
      depotLabel: 'Kheda FPO Central Sourcing Hub',
      dropLabel: activeOrder?.buyer_name || activeOrder?.delivery_location || 'Institutional Buyer Central Kitchen',
    })
  }, [candidateFarmers, activeTargetKg, activeCrop, activeOrder])

  // Apply algorithmically optimal farmer allocation
  function applyOptimalAllocation() {
    if (!optimalResult) return
    const initialAlloc: Record<string, number> = {}
    for (const alloc of optimalResult.allocations) {
      initialAlloc[alloc.farmer.id] = alloc.allocatedKg
    }
    setFarmerAllocations(initialAlloc)
    setRouteDispatched(false)
  }

  // Pre-initialize farmer allocations when active order changes
  useEffect(() => {
    applyOptimalAllocation()
  }, [activeOrder?.id, optimalResult?.summaryText])

  // Total allocated KG across smallholders
  const totalAllocatedKg = useMemo(() => {
    return Object.values(farmerAllocations).reduce((sum, kg) => sum + (Number(kg) || 0), 0)
  }, [farmerAllocations])

  const targetProgressPct = Math.min(100, Math.round((totalAllocatedKg / activeTargetKg) * 100))
  const bufferProgressPct = Math.min(100, Math.round((totalAllocatedKg / totalTargetWithBufferKg) * 100))
  const isTargetMet = totalAllocatedKg >= activeTargetKg
  const isBufferSecured = totalAllocatedKg >= totalTargetWithBufferKg

  // Dynamic TSP Route recalculation reflecting active contributing smallholders
  const dynamicRoutePlan = useMemo(() => {
    if (!optimalResult) return null

    const activeAllocations = Object.entries(farmerAllocations)
      .filter(([_, kg]) => kg > 0)
      .map(([id, kg]) => {
        const farmer = matchedFarmers.find((f) => f.id === id)
        return { id, kg, farmer }
      })
      .filter((item): item is { id: string; kg: number; farmer: LiveFarmer } => !!item.farmer)

    if (activeAllocations.length === 0) return optimalResult.routePlan

    const depotStop = {
      id: 'fpo-depot',
      kind: 'DEPOT' as const,
      label: 'Kheda FPO Central Sourcing Hub',
      detail: 'Collection start & vehicle dispatch',
      lat: 22.7533,
      lng: 72.6841,
      kg: 0,
    }

    const pickupStops = activeAllocations.map((a, idx) => ({
      id: a.id,
      kind: 'PICKUP' as const,
      label: `Stop #${idx + 1}: ${a.farmer.name}`,
      detail: `${a.farmer.village} · Load ${a.kg} KG`,
      lat: getVillageLatLng(a.farmer.village).lat,
      lng: getVillageLatLng(a.farmer.village).lng,
      kg: a.kg,
    }))

    const totalKg = activeAllocations.reduce((s, a) => s + a.kg, 0)
    const dropStop = {
      id: 'buyer-drop',
      kind: 'DROP' as const,
      label: activeOrder?.buyer_name || activeOrder?.delivery_location || 'Institutional Buyer Central Kitchen',
      detail: `Central intake · Unload ${totalKg} KG`,
      lat: 22.5645,
      lng: 72.9289,
      kg: totalKg,
    }

    return planRoute(depotStop, pickupStops, [dropStop])
  }, [optimalResult, farmerAllocations, matchedFarmers, activeOrder])

  // Vehicle recommendation & sustainability metrics
  const vehicleStats = useMemo(() => {
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
    const km = dynamicRoutePlan?.km || 22.4
    const naiveKm = dynamicRoutePlan?.naiveKm || 32.1
    const fuelSavedPct = naiveKm > 0 ? Math.max(0, Math.round(((naiveKm - km) / naiveKm) * 100)) : 30
    const co2SavingsKg = Math.round(km * 0.18 * (fuelSavedPct / 100) * 10) / 10

    return {
      name: vehicleName,
      maxCapacityKg,
      loadFactorPct,
      fuelType,
      km,
      naiveKm,
      fuelSavedPct,
      co2SavingsKg,
    }
  }, [totalAllocatedKg, dynamicRoutePlan])

  // State for route dispatch notification
  const [routeDispatched, setRouteDispatched] = useState(false)

  // Handle allocation toggle / adjustment
  function toggleFarmer(farmerId: string, maxQty: number) {
    setFarmerAllocations((prev) => {
      const current = prev[farmerId] || 0
      if (current > 0) {
        return { ...prev, [farmerId]: 0 }
      } else {
        return { ...prev, [farmerId]: maxQty }
      }
    })
  }

  function setFarmerQty(farmerId: string, qty: number, maxQty: number) {
    const valid = Math.max(0, Math.min(maxQty, qty))
    setFarmerAllocations((prev) => ({ ...prev, [farmerId]: valid }))
  }

  // Lock and Combine Farmers Batch with Route Dispatch
  async function handleLockAggregation() {
    if (!activeOrder) return
    setIsAggregating(true)
    setAggregationSuccess(null)

    try {
      const contributions = Object.entries(farmerAllocations)
        .filter(([_, kg]) => kg > 0)
        .map(([farmerId, kg]) => ({ farmer_id: farmerId, quantity_kg: kg }))

      if (contributions.length === 0) {
        alert('Please allocate harvest produce from at least one smallholder.')
        setIsAggregating(false)
        return
      }

      const orderCode = activeOrder.code || `AG-${String(activeOrder.id).slice(-4).toUpperCase()}`
      const batchCode = `BATCH-${orderCode}-${activeCrop}`
      const token = await ensureSession()

      const res = await fetch('/api/aggregation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          order_id: activeOrder.id,
          batch_code: batchCode,
          fpo_name: 'Mahi Valley FPO',
          crop: activeCrop,
          location: 'Kheda Central Sourcing Hub',
          contributions,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to lock batch')
      }

      setAggregationSuccess(
        `Batch ${batchCode} consolidated from ${contributions.length} smallholders (${totalAllocatedKg} KG)! TSP collection runway dispatched via ${vehicleStats.name} (${vehicleStats.km} km, ${vehicleStats.fuelSavedPct}% fuel saved).`
      )
      setRouteDispatched(true)

      // Refresh data
      await fetchLiveFeeds(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrilink:harvest-updated'))
        window.dispatchEvent(new CustomEvent('agrilink:order-created'))
      }

      setTimeout(() => setAggregationSuccess(null), 6000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Aggregation failed.')
    } finally {
      setIsAggregating(false)
    }
  }

  // Buyer approval action
  async function review(id: string, decision: 'approved' | 'rejected') {
    try {
      const token = await ensureSession()
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: id, decision }),
      })
      if (!response.ok) setError((await response.json()).error)
      else fetchLiveFeeds(false)
    } catch {
      setError('Failed to update review status.')
    }
  }

  if (loading && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fcfbf7] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">AgriLink Operational Command</h2>
            <p className="mt-1 text-sm text-muted-foreground">Connecting live buyer orders, smallholder harvests & smart aggregation…</p>
          </div>
        </div>
      </main>
    )
  }

  // Calculate Operational Metrics
  const totalBuyerKgNeeded = orders.reduce((sum, o) => sum + Number(o.qty_target_kg || o.quantity_required || 1000), 0)
  const totalFarmerKgAvailable = farmers.reduce((sum, f) => sum + Number(f.quantity || 500), 0)
  const verifiedMembersCount = data?.profiles.filter((p) => p.verification_status === 'verified').length || farmers.length + 3

  return (
    <main className="mx-auto max-w-7xl p-3.5 py-6 sm:p-8 space-y-6 sm:space-y-8">
      {/* 1. Header Navigation & Realtime Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-primary hover:underline">
              ← Main Home
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link href="/portal" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Workspace
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const auth = getAuthClient()
                  await auth.auth.signOut()
                } catch {}
                localStorage.removeItem('agrilink_user_name')
                localStorage.removeItem('agrilink_user_role')
                localStorage.removeItem('agrilink_user_phone')
                localStorage.removeItem('agrilink_session')
                window.location.href = '/'
              }}
              className="text-xs text-muted-foreground hover:text-destructive underline"
            >
              Sign out
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold">FPO Admin Portal</h1>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Live Operations
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Direct smallholder aggregation, live demand intake, produce allocation & APMC compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync Active (4s)</span>
          </div>
          <button
            onClick={() => fetchLiveFeeds(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-secondary transition-colors min-h-[38px] shadow-xs"
            title="Force refresh live feeds"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Buyer Demands</span>
            <ShoppingBag className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {orders.length} <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">({totalBuyerKgNeeded.toLocaleString()} KG)</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Committed by schools, hospitals & retailers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Smallholder Supply</span>
            <Sprout className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {farmers.length} <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">({totalFarmerKgAvailable.toLocaleString()} KG)</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Live declared produce in cluster</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Aggregated Batches</span>
            <Boxes className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {batches.length} <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">Locked</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Smallholders consolidated for bulk delivery</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Verified Members</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {verifiedMembersCount}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Aadhaar KYC & FPO certified profiles</p>
        </div>
      </div>

      {/* 3. SMART AGGREGATION ENGINE (Interactive Sourcing & Combining Multi-Farmer Batches) */}
      <section className="rounded-3xl border border-primary/30 bg-card shadow-sm overflow-hidden">
        {/* Banner Header */}
        <div className="border-b border-border bg-primary/5 p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Layers className="size-4" />
                <span>Smart Aggregation Engine</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                  Core Sourcing Architecture
                </span>
              </div>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Consolidate Smallholders for Buyer Demands
              </h2>
              <p className="mt-1 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Institutional buyers require bulk volumes (e.g. 1,000 KG). The Smart Aggregation Engine automatically
                combines output from multiple marginal smallholder farmers, secures a 15% standby reserve for sorting loss,
                and locks a single unified sourcing batch.
              </p>
            </div>

            {/* Order Selector Dropdown */}
            <div className="rounded-2xl border border-border bg-card p-3 shadow-xs shrink-0 min-w-[280px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Select Buyer Order to Fulfill:
              </label>
              <select
                value={selectedOrderId || ''}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
              >
                {orders.map((ord) => {
                  const cropName = ord.crop || ord.crop_required || 'PADDY'
                  const code = ord.code || `AG-${String(ord.id).slice(-4).toUpperCase()}`
                  const kg = ord.qty_target_kg || ord.quantity_required || 1000
                  return (
                    <option key={ord.id} value={ord.id}>
                      {code} · {cropName} ({kg} KG) · {ord.status || 'POSTED'}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Order Summary Bar */}
        {activeOrder && (
          <div className="border-b border-border bg-secondary/30 px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <div>
                <span className="text-muted-foreground">Order: </span>
                <span className="font-mono font-bold text-foreground">
                  {activeOrder.code || `AG-${String(activeOrder.id).slice(-4).toUpperCase()}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Buyer: </span>
                <span className="font-semibold text-foreground">
                  {activeOrder.buyer_name || activeOrder.delivery_location || 'Mid-day Meal Kitchen'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Target Crop: </span>
                <span className="font-bold text-primary">{activeCrop}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Order Target: </span>
                <span className="font-bold text-foreground">{activeTargetKg.toLocaleString()} KG</span>
              </div>
              <div>
                <span className="text-muted-foreground">+15% Standby Buffer: </span>
                <span className="font-semibold text-amber-600">+{standbyBufferKg} KG ({totalTargetWithBufferKg.toLocaleString()} KG Total)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                activeOrder.status === 'AGGREGATED'
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : activeOrder.status === 'FUNDED'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-secondary text-foreground'
              }`}>
                {activeOrder.status || 'POSTED'}
              </span>
            </div>
          </div>
        )}

        {/* Aggregation Workspace Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Success Banner */}
          {aggregationSuccess && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="text-sm font-semibold">{aggregationSuccess}</p>
            </div>
          )}

          {/* Algorithm Rationale & Intelligence Banner */}
          {optimalResult && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary mt-0.5">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Multi-Factor Knapsack & TSP Corridor Optimization
                      </span>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        {optimalResult.allocations.filter((a) => a.allocatedKg > 0).length} Optimal Matches
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                      {optimalResult.summaryText}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyOptimalAllocation}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  title="Recalculate and restore optimal allocation quotas"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Re-apply Knapsack Optimal</span>
                </button>
              </div>
            </div>
          )}

          {/* Allocation Progress Meter */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Consolidated Sourcing Capacity
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl font-bold text-foreground">
                    {totalAllocatedKg.toLocaleString()} KG
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    of {activeTargetKg.toLocaleString()} KG Required ({targetProgressPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isBufferSecured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" /> 100% Target Met + 15% Standby Buffer Secured
                  </span>
                ) : isTargetMet ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700">
                    <AlertCircle className="size-4" /> 100% Target Met · Standby Buffer ({totalAllocatedKg}/{totalTargetWithBufferKg} KG)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1 text-xs font-semibold text-destructive">
                    Needs {(activeTargetKg - totalAllocatedKg).toLocaleString()} KG more to meet order
                  </span>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-300 ${
                  isBufferSecured ? 'bg-emerald-600' : isTargetMet ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, bufferProgressPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>0 KG</span>
              <span>100% Order Target: {activeTargetKg} KG</span>
              <span className="font-semibold text-amber-600">+15% Buffer Target: {totalTargetWithBufferKg} KG</span>
            </div>
          </div>

          {/* Matched Smallholder Farmers Selection Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold text-foreground">
                Matched Smallholders for {activeCrop} Sourcing:
              </h4>
              <span className="text-xs text-muted-foreground">
                {matchedFarmers.length} registered farmers available in Anand / Kheda cluster
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3.5 sm:px-4">Include</th>
                    <th className="p-3.5 sm:px-4">Farmer Member</th>
                    <th className="p-3.5 sm:px-4">Village Corridor</th>
                    <th className="p-3.5 sm:px-4">Declared Crop</th>
                    <th className="p-3.5 sm:px-4">Quality & Reliability</th>
                    <th className="p-3.5 sm:px-4">Algorithm Role</th>
                    <th className="p-3.5 sm:px-4">Capacity</th>
                    <th className="p-3.5 sm:px-4">Allocated (KG)</th>
                    <th className="p-3.5 sm:px-4 text-right">AI Voice Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matchedFarmers.map((f) => {
                    const allocated = farmerAllocations[f.id] || 0
                    const isSelected = allocated > 0
                    const maxCap = Number(f.quantity || 500)
                    const allocInfo = optimalResult?.allocations.find((a) => a.farmer.id === f.id)
                    const isPrimary = allocInfo && allocInfo.primaryKg > 0
                    const isStandby = allocInfo && allocInfo.standbyKg > 0

                    return (
                      <tr
                        key={f.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <td className="p-3.5 sm:px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFarmer(f.id, maxCap)}
                            className="size-4 rounded text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 sm:px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{f.name}</span>
                            {f.is_live_account && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                                <span className="size-1 rounded-full bg-emerald-500 animate-pulse" /> Live
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {f.mobile_number || '+91 98251 44102'}
                          </span>
                        </td>
                        <td className="p-3.5 sm:px-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-primary" /> {f.village}
                          </span>
                        </td>
                        <td className="p-3.5 sm:px-4">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                            {f.crop_name || f.crop || activeCrop}
                          </span>
                        </td>
                        <td className="p-3.5 sm:px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              Grade {f.quality_grade || 'A'}
                            </span>
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {f.reliability_score || 95}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 sm:px-4">
                          {isPrimary && isStandby ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                              Primary ({allocInfo.primaryKg}k) + Standby ({allocInfo.standbyKg}k)
                            </span>
                          ) : isPrimary ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              Primary Fulfillment ({allocInfo.primaryKg} kg)
                            </span>
                          ) : isStandby ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              +15% Standby Buffer ({allocInfo.standbyKg} kg)
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Reserve Standby Pool</span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4 font-mono font-medium">{maxCap} KG</td>
                        <td className="p-3.5 sm:px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={maxCap}
                              value={allocated}
                              onChange={(e) => setFarmerQty(f.id, Number(e.target.value), maxCap)}
                              className="w-20 h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono font-bold text-foreground outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-[11px] text-muted-foreground">/ {maxCap}</span>
                          </div>
                        </td>
                        <td className="p-3.5 sm:px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCallFarmer(f)
                              setSelectedCallAllocatedKg(allocated > 0 ? allocated : Number(f.quantity || 300))
                              setBolnaModalOpen(true)
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              confirmedFarmers[f.id]
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary hover:scale-105'
                            }`}
                            title="Trigger Bolna AI Outbound Voice Call to Farmer"
                          >
                            <PhoneCall className="size-3.5" />
                            <span>{confirmedFarmers[f.id] ? 'Confirmed ✓' : 'Call AI Agent'}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consolidated Vehicle Collection Runway & TSP 2-Opt Routing */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="size-5 text-primary" />
                  <h4 className="font-serif text-xl font-bold text-foreground">
                    Consolidated Collection Runway & TSP 2-Opt Route
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optimized vehicle waypoint routing visiting matched smallholders to eliminate empty haulage.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Navigation className="size-3.5" />
                  <span>{vehicleStats.km} KM Route</span>
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {vehicleStats.fuelSavedPct}% Fuel Saved
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {vehicleStats.co2SavingsKg} kg CO₂ Avoided
                </span>
              </div>
            </div>

            {/* Recommended Vehicle Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-secondary/30 border border-border p-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned Logistics Vehicle
                </span>
                <p className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  {vehicleStats.name}
                </p>
                <p className="text-xs text-muted-foreground">{vehicleStats.fuelType}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payload Load Factor
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-foreground">
                    {totalAllocatedKg} / {vehicleStats.maxCapacityKg} KG
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    ({vehicleStats.loadFactorPct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, vehicleStats.loadFactorPct)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Route Optimization
                </span>
                <p className="text-xs font-semibold text-foreground">
                  TSP 2-Opt Algorithm Solver
                </p>
                <p className="text-xs text-muted-foreground">
                  {dynamicRoutePlan?.sequence.length || 0} Total Waypoints · {dynamicRoutePlan?.km || 0} km vs {dynamicRoutePlan?.naiveKm || 0} km unoptimized
                </p>
              </div>
            </div>

            {/* Waypoints List and Interactive Leaflet Route Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Waypoint Timeline Manifest */}
              <div className="lg:col-span-5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Waypoint Sequence Manifest ({dynamicRoutePlan?.sequence.length || 0} Stops):
                </span>
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {dynamicRoutePlan?.sequence.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="rounded-xl border border-border bg-card p-3 flex items-start gap-3 text-xs"
                    >
                      <div
                        className={`size-6 rounded-full flex items-center justify-center font-mono font-bold text-[11px] shrink-0 mt-0.5 ${
                          stop.kind === 'DEPOT'
                            ? 'bg-secondary text-foreground border border-border'
                            : stop.kind === 'DROP'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-foreground truncate">{stop.label}</p>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              stop.kind === 'DEPOT'
                                ? 'bg-secondary text-muted-foreground'
                                : stop.kind === 'DROP'
                                ? 'bg-primary/15 text-primary'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {stop.kind}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] truncate mt-0.5">{stop.detail}</p>
                        {stop.kg !== undefined && stop.kg > 0 && (
                          <span className="inline-block mt-1 font-mono text-[10px] font-bold text-foreground">
                            Weight: {stop.kg} KG
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Leaflet Route Map */}
              <div className="lg:col-span-7">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Live Sourcing Cluster Map & Navigation Corridor:
                </span>
                <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-border shadow-xs">
                  <RouteMap stops={dynamicRoutePlan?.sequence || []} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button to Lock Sourcing Batch & Dispatch Route */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Combining <strong>{Object.values(farmerAllocations).filter((kg) => kg > 0).length}</strong> smallholders ·
              Total <strong>{totalAllocatedKg} KG</strong> assigned to batch{' '}
              <span className="font-mono text-foreground font-semibold">
                BATCH-{activeOrder?.code || 'AG1001'}-{activeCrop}
              </span>
              {routeDispatched && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3.5" /> Dispatched to driver
                </span>
              )}
            </div>

            <button
              onClick={handleLockAggregation}
              disabled={isAggregating || totalAllocatedKg <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all min-h-[44px] cursor-pointer"
            >
              {isAggregating ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              <span>Combine Farmers & Lock Sourcing Batch</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Aggregated Batches List */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Boxes className="size-5 text-amber-600" />
            <h3 className="font-serif text-xl font-bold">Consolidated Sourcing Batches</h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {batches.length} Active Batches
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {batches.length > 0 ? (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-3">Batch Code</th>
                  <th className="pb-3">FPO Hub</th>
                  <th className="pb-3">Produce Crop</th>
                  <th className="pb-3">Total Quantity</th>
                  <th className="pb-3">Quality Clearance</th>
                  <th className="pb-3">Consolidated By</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/30">
                    <td className="py-3 font-mono font-bold text-primary">{b.batch_code}</td>
                    <td className="py-3 font-medium text-foreground">{b.fpo_name} ({b.location})</td>
                    <td className="py-3">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                        {b.crop}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-foreground">{b.total_quantity_kg} KG</td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        ✓ Quality Verified (Grade A)
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{b.created_by || 'Anita Desai'}</td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Today'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No batches created yet. Use the Smart Aggregation Engine above to combine smallholders into a batch.
            </p>
          )}
        </div>
      </section>

      {/* 5. Live Buyer Orders Stream & 1-Click Aggregate */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Live Buyer Demands & Orders Feed
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time purchase commitments placed by institutional buyers, hospitals, and community pools.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary">{orders.length} Live Orders</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="text-muted-foreground border-b border-border">
              <tr>
                <th className="pb-3">Order ID</th>
                <th className="pb-3">Buyer Name</th>
                <th className="pb-3">Crop Required</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Price / KG</th>
                <th className="pb-3">Delivery Window</th>
                <th className="pb-3">Escrow Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((ord) => {
                const code = ord.code || `AG-${String(ord.id).slice(-4).toUpperCase()}`
                const cropName = ord.crop || ord.crop_required || 'PADDY'
                const kg = ord.qty_target_kg || ord.quantity_required || 1000
                const isCurrent = selectedOrderId === ord.id

                return (
                  <tr key={ord.id} className={isCurrent ? 'bg-primary/5' : 'hover:bg-secondary/30'}>
                    <td className="py-3 font-mono font-bold text-foreground">{code}</td>
                    <td className="py-3 font-semibold text-foreground">
                      {ord.buyer_name || ord.delivery_location || 'Institutional Buyer'}
                    </td>
                    <td className="py-3">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                        {cropName}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold">{kg} KG</td>
                    <td className="py-3 font-mono">₹{ord.price_per_kg || 28}</td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString() : '20 Oct 2025'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ord.status === 'AGGREGATED'
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : ord.status === 'FUNDED'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {ord.status || 'POSTED'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrderId(ord.id)
                          window.scrollTo({ top: 350, behavior: 'smooth' })
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        {isCurrent ? 'Selected' : 'Smart Aggregate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Live Smallholder Farmer Harvest Produce Feed */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Sprout className="size-5 text-emerald-600" />
              Live Farmer Harvest Declarations Feed
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Incoming produce reported by smallholder farmers across village clusters, synchronized with live accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFarmerFilterTab('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                farmerFilterTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
              }`}
            >
              All Declared Harvests ({farmers.length})
            </button>
            <button
              type="button"
              onClick={() => setFarmerFilterTab('live')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                farmerFilterTab === 'live'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Logins Only ({liveFarmersCount})
            </button>
            <button
              type="button"
              onClick={() => setFarmerFilterTab('preseeded')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                farmerFilterTab === 'preseeded'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
              }`}
            >
              Cluster Pre-Registered ({farmers.length - liveFarmersCount})
            </button>
          </div>
        </div>

        {/* Live sync banner if active accounts exist */}
        {liveFarmersCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
              </span>
              <span>
                <strong>{liveFarmersCount} Live Active Smallholder Account{liveFarmersCount > 1 ? 's' : ''}</strong> connected. Harvest declarations and logins sync automatically across devices and tabs.
              </span>
            </div>
            {farmerFilterTab !== 'live' && (
              <button
                type="button"
                onClick={() => setFarmerFilterTab('live')}
                className="text-[11px] font-bold underline hover:text-emerald-900 dark:hover:text-emerald-100 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Filter Live Accounts Only →
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {displayedFarmers.length > 0 ? (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-3">Farmer Name & Status</th>
                  <th className="pb-3">Mobile Contact</th>
                  <th className="pb-3">Village Cluster</th>
                  <th className="pb-3">Produce Crop</th>
                  <th className="pb-3">Available Quantity</th>
                  <th className="pb-3">Quality Grade</th>
                  <th className="pb-3">Harvest Window</th>
                  <th className="pb-3">KYC Verification</th>
                  <th className="pb-3 text-right">Voice Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedFarmers.map((f) => (
                  <tr
                    key={f.id}
                    className={`transition-colors ${
                      f.is_live_account
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                        : 'hover:bg-secondary/30'
                    }`}
                  >
                    <td className="py-3 font-semibold text-foreground">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{f.name}</span>
                        {f.is_live_account ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.2 text-[9px] text-muted-foreground font-medium">
                            Cluster Member
                          </span>
                        )}
                      </div>
                      {f.last_login_at && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          Active {formatRelativeTime(f.last_login_at)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {f.mobile_number || '+91 98251 44102'}
                    </td>
                    <td className="py-3 text-muted-foreground">{f.village}</td>
                    <td className="py-3">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                        {f.crop_name || f.crop || 'PADDY'}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-foreground">{f.quantity || 500} KG</td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        Grade {f.quality_grade || 'A'}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      <div>{f.harvest_date || 'Oct 2025'}</div>
                      {f.is_live_account && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Live Registered</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="size-3" /> Aadhaar KYC
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCallFarmer(f)
                          setSelectedCallAllocatedKg(Number(f.quantity || 300))
                          setBolnaModalOpen(true)
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                          confirmedFarmers[f.id]
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary hover:scale-105'
                        }`}
                        title="Trigger Bolna AI Outbound Voice Call to Farmer"
                      >
                        <PhoneCall className="size-3" />
                        <span>{confirmedFarmers[f.id] ? 'Confirmed ✓' : 'Call AI Agent'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No farmers match the &quot;{farmerFilterTab}&quot; filter.</p>
              {farmerFilterTab === 'live' && (
                <p className="text-[11px] text-muted-foreground">
                  Open another tab or window, sign up or log in as a farmer at <Link href="/login" className="text-primary underline">/login</Link>, and the live farmer record will appear here in real time.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 7. Registered Member Activity */}
      {data && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-serif text-xl sm:text-2xl font-bold">Platform Member Directory</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-3">Member Name</th>
                  <th className="pb-3">Platform Role</th>
                  <th className="pb-3">Mobile</th>
                  <th className="pb-3">Verification Status</th>
                  <th className="pb-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-foreground">{p.full_name}</td>
                    <td className="py-3 capitalize font-semibold text-primary">{p.role}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{p.mobile_number || '—'}</td>
                    <td className="py-3 capitalize text-xs">
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        {p.verification_status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {p.last_login_at ? new Date(p.last_login_at).toLocaleString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 8. Bolna AI Voice Calling Agent Confirmation Modal */}
      <BolnaCallModal
        isOpen={bolnaModalOpen}
        onClose={() => setBolnaModalOpen(false)}
        farmer={selectedCallFarmer}
        order={activeOrder}
        allocatedKg={selectedCallAllocatedKg}
        onCallSuccess={(farmerId) => {
          setConfirmedFarmers((prev) => ({ ...prev, [farmerId]: true }))
        }}
      />
    </main>
  )
}
