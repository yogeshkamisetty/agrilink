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
  Boxes,
  Truck,
  Navigation,
  MapPin,
  Sparkles,
  PhoneCall,
  ArrowRight,
  Zap,
  Check,
  FileText,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Route,
  BarChart3,
} from 'lucide-react'
import { authHeaders, getAuthClient } from '@/lib/auth-client'
import { RouteMap } from '@/components/route-map'
import { BolnaCallModal } from '@/components/bolna-call-modal'
import { DemandForecastPanel } from '@/components/demand-forecast-panel'
import { LogisticsPlanPanel } from '@/components/logistics-plan-panel'
import { LARGEST_VEHICLE, smallestFitting, tripCost } from '@/lib/domain/fleet'
import {
  allocateFarmersOptimal,
  getVillageLatLng,
  type CandidateFarmer,
  type OptimalAllocationResult,
} from '@/lib/domain/allocation'
import { planRoute, type RouteStop } from '@/lib/domain/routing'
import {
  findNearestEligibleFarmer,
  cascadeSmallOrderRejection,
  SMALL_ORDER_THRESHOLD_KG,
  type SmallOrderRouting,
} from '@/lib/domain/order-routing'

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

export type LiveOrder = {
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
  order_tier?: 'SMALL' | 'BULK'
  allocation_mode?: 'AUTO_ALLOCATED' | 'POOL_AGGREGATION'
  allocated_farmer_name?: string | null
  allocated_farmer_id?: string | null
  allocated_farmer_village?: string | null
  allocated_farmer_distance_km?: number | null
  farmer_acceptance_status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null
  declined_history?: string[]
  purpose?: string | null
  review_status?: 'not_required' | 'pending' | 'approved' | 'rejected' | null
  admin_note?: string | null
  qty_committed_kg?: number
  standby_kg?: number
  is_fully_committed?: boolean
  open_for_commitment?: boolean
  mandi_price_per_kg?: number | null
  retail_price_per_kg?: number | null
  buyer_lat?: number
  buyer_lng?: number
  fpo_name?: string
  fpo_lat?: number
  fpo_lng?: number
}

type LiveFarmer = {
  id: string
  /** One row per farmer and live registry entry; this keys the row. */
  entry_id?: string
  name: string
  mobile_number?: string
  village: string
  lat?: number
  lng?: number
  crop_name?: string
  crop?: string
  quantity?: number
  registered_kg?: number
  quality_grade?: string | null
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

  // 4-Tab Architecture for Clean SIH Operational Command Center
  const [activeTab, setActiveTab] = useState<'orders' | 'aggregation' | 'batches' | 'farmers' | 'forecast' | 'logistics'>('orders')
  const [orderFilter, setOrderFilter] = useState<'all' | 'small' | 'bulk' | 'aggregated'>('all')

  // Farmer Roster Filter Tabs
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
  const [routeDispatched, setRouteDispatched] = useState(false)

  // Operational Dispatch Toast Feedback
  const [simulationToast, setSimulationToast] = useState<string | null>(null)

  // Registered buyers, so test orders are filed for a real buyer record
  const [buyers, setBuyers] = useState<Array<{ id: string; name: string; type: string }>>([])
  const testBuyer = () => buyers.find((b) => b.type === 'INSTITUTIONAL') ?? buyers[0]

  // Compliance Desk State for >50 kg Bulk Orders
  const [validatingOrderId, setValidatingOrderId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

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
          headers: authHeaders({ 'Content-Type': 'application/json' }),
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

  // Fetch all live operational feeds
  async function fetchLiveFeeds(showSpinner = false) {
    if (showSpinner) setRefreshing(true)
    try {
      const token = await ensureSession()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const [reviewsRes, ordersRes, farmersRes, batchesRes] = await Promise.all([
        fetch('/api/admin/reviews', { headers }).catch(() => null),
        fetch('/api/orders', { headers }).catch(() => null),
        fetch('/api/farmers', { headers }).catch(() => null),
        fetch('/api/aggregation', { headers }).catch(() => null),
      ])

      if (reviewsRes && reviewsRes.ok) {
        const revData = await reviewsRes.json()
        setData(revData)
        setError('')
      } else if (!data) {
        const reviewError: { error?: string } = reviewsRes ? await reviewsRes.json().catch(() => ({})) : {}
        setData({ profiles: [], activities: [], pending_reviews: [] })
        setError(reviewError.error || 'Sign in with an FPO coordinator account to load the command centre.')
      }

      if (ordersRes && ordersRes.ok) {
        const ordData = await ordersRes.json()
        if (Array.isArray(ordData.orders)) {
          setOrders(ordData.orders)
          if (!selectedOrderId && ordData.orders.length > 0) {
            // Pick first bulk order by default for aggregation desk
            const firstBulk = ordData.orders.find((o: any) => Number(o.qty_target_kg || o.quantity_required) > SMALL_ORDER_THRESHOLD_KG)
            setSelectedOrderId(firstBulk ? firstBulk.id : ordData.orders[0].id)
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

  useEffect(() => {
    ensureSession()
      .then(() => fetch('/api/marketplace', { headers: authHeaders() }))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (Array.isArray(json?.buyers)) setBuyers(json.buyers)
      })
      .catch(() => {})
  }, [])

  // Polling & sync listeners
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

  // Currently selected buyer order for Aggregation Desk
  const activeOrder = useMemo(() => {
    if (!orders.length) return null
    return orders.find((o) => o.id === selectedOrderId) || orders[0]
  }, [orders, selectedOrderId])

  const activeCrop = (activeOrder?.crop || activeOrder?.crop_required || 'PADDY').toUpperCase()
  const activeTargetKg = Number(activeOrder?.qty_target_kg || activeOrder?.quantity_required || 1000)
  const standbyBufferKg = Math.round(activeTargetKg * 0.15)
  const totalTargetWithBufferKg = activeTargetKg + standbyBufferKg

  // Filtered orders list based on tab pill
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'small') {
      return orders.filter((o) => Number(o.qty_target_kg || o.quantity_required) <= SMALL_ORDER_THRESHOLD_KG)
    }
    if (orderFilter === 'bulk') {
      return orders.filter((o) => Number(o.qty_target_kg || o.quantity_required) > SMALL_ORDER_THRESHOLD_KG && !o.is_fully_committed)
    }
    if (orderFilter === 'aggregated') {
      return orders.filter((o) => o.is_fully_committed)
    }
    return orders
  }, [orders, orderFilter])

  // Pending compliance orders (>50 kg awaiting admin verification of purpose)
  const pendingComplianceOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        Number(o.qty_target_kg || o.quantity_required || 0) > SMALL_ORDER_THRESHOLD_KG &&
        (o.review_status === 'pending' || o.status === 'PENDING_ADMIN_REVIEW')
    )
  }, [orders])

  // Farmers who registered the order's crop and still have some of it uncommitted
  const matchedFarmers = useMemo(
    () => farmers.filter((f) => (f.crop_name || f.crop || '').toUpperCase() === activeCrop && Number(f.quantity) > 0),
    [farmers, activeCrop],
  )

  // Candidate farmers for optimal knapsack solver
  const candidateFarmers: CandidateFarmer[] = useMemo(() => {
    return matchedFarmers.map((f) => ({
      id: f.id,
      name: f.name,
      village: f.village,
      crop: f.crop_name || f.crop || activeCrop,
      availableKg: Number(f.quantity) || 0,
      reliability: Number(f.reliability_score) || 90,
      // No grade on record yet counts as B, never as an assumed A.
      qualityGrade: (f.quality_grade === 'A' ? 'A' : 'B') as 'A' | 'B',
      location: f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : getVillageLatLng(f.village),
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
      depotLocation: activeOrder?.fpo_lat != null && activeOrder?.fpo_lng != null ? { lat: activeOrder.fpo_lat, lng: activeOrder.fpo_lng } : undefined,
      dropLocation: activeOrder?.buyer_lat != null && activeOrder?.buyer_lng != null ? { lat: activeOrder.buyer_lat, lng: activeOrder.buyer_lng } : undefined,
      depotLabel: activeOrder?.fpo_name ? `${activeOrder.fpo_name} collection centre` : 'FPO collection centre',
      dropLabel: activeOrder?.buyer_name || activeOrder?.delivery_location || 'Buyer',
    })
  }, [candidateFarmers, activeTargetKg, activeCrop, activeOrder])

  // Apply algorithmically optimal allocation quotas
  function applyOptimalAllocation() {
    if (!optimalResult) return
    const initialAlloc: Record<string, number> = {}
    for (const alloc of optimalResult.allocations) {
      initialAlloc[alloc.farmer.id] = alloc.allocatedKg
    }
    setFarmerAllocations(initialAlloc)
  }

  // Pre-seed optimal quotas whenever active order changes
  useEffect(() => {
    if (optimalResult && activeOrder) {
      applyOptimalAllocation()
      setRouteDispatched(false)
    }
  }, [optimalResult, activeOrder?.id])

  // Allocation toggle and manual quota tuning
  function toggleFarmer(farmerId: string, maxCap: number) {
    setFarmerAllocations((prev) => {
      const current = prev[farmerId] || 0
      if (current > 0) {
        const next = { ...prev }
        delete next[farmerId]
        return next
      } else {
        return { ...prev, [farmerId]: Math.min(maxCap, 300) }
      }
    })
  }

  function setFarmerQty(farmerId: string, qty: number, maxCap: number) {
    const clamped = Math.max(0, Math.min(maxCap, qty))
    setFarmerAllocations((prev) => {
      if (clamped <= 0) {
        const next = { ...prev }
        delete next[farmerId]
        return next
      }
      return { ...prev, [farmerId]: clamped }
    })
  }

  const totalAllocatedKg = useMemo(() => {
    return Object.values(farmerAllocations).reduce((sum, kg) => sum + Number(kg || 0), 0)
  }, [farmerAllocations])

  const targetProgressPct = Math.min(100, Math.round((totalAllocatedKg / (activeTargetKg || 1)) * 100))
  const bufferProgressPct = Math.min(100, Math.round((totalAllocatedKg / (totalTargetWithBufferKg || 1)) * 100))
  const isTargetMet = totalAllocatedKg >= activeTargetKg
  const isBufferSecured = totalAllocatedKg >= totalTargetWithBufferKg

  // Real-time Dynamic TSP Route Plan
  const dynamicRoutePlan = useMemo(() => {
    const allocatedFarmersList = candidateFarmers.filter((f) => (farmerAllocations[f.id] || 0) > 0)
    if (allocatedFarmersList.length === 0) return null

    const depotLoc = activeOrder?.fpo_lat != null && activeOrder?.fpo_lng != null ? { lat: activeOrder.fpo_lat, lng: activeOrder.fpo_lng } : getVillageLatLng('Boriavi')
    const depotStop: RouteStop = {
      id: 'depot',
      label: activeOrder?.fpo_name ? `${activeOrder.fpo_name} collection centre` : 'FPO collection centre',
      kind: 'DEPOT',
      lat: depotLoc.lat,
      lng: depotLoc.lng,
      detail: 'Vehicle starts here',
      kg: 0,
    }

    const pickupStops: RouteStop[] = allocatedFarmersList.map((f) => {
      const loc = f.location || getVillageLatLng(f.village)
      return {
        id: `stop-${f.id}`,
        label: `${f.name} (${f.village})`,
        kind: 'PICKUP',
        lat: loc.lat,
        lng: loc.lng,
        detail: `Allocated ${farmerAllocations[f.id]} KG ${activeCrop}`,
        kg: farmerAllocations[f.id],
      }
    })

    const dropLoc = activeOrder?.buyer_lat != null && activeOrder?.buyer_lng != null ? { lat: activeOrder.buyer_lat, lng: activeOrder.buyer_lng } : getVillageLatLng('Anand')
    const dropStop: RouteStop = {
      id: 'drop-buyer',
      label: activeOrder?.buyer_name || 'Buyer',
      kind: 'DROP',
      lat: dropLoc.lat,
      lng: dropLoc.lng,
      detail: `Delivery ${activeOrder?.delivery_date ?? ''}`.trim(),
      kg: totalAllocatedKg,
    }

    return planRoute(depotStop, pickupStops, [dropStop])
  }, [candidateFarmers, farmerAllocations, activeCrop, activeOrder, totalAllocatedKg])

  // Logistics Freight Vehicle Selection & Emissions Calculator
  const vehicleStats = useMemo(() => {
    const km = dynamicRoutePlan?.km ?? 0
    const naiveKm = dynamicRoutePlan?.naiveKm ?? 0
    const vehicle = smallestFitting(totalAllocatedKg, km) ?? LARGEST_VEHICLE
    const count = Math.max(1, Math.ceil(totalAllocatedKg / vehicle.capacityKg))
    const costRs = totalAllocatedKg > 0 ? tripCost(vehicle, km) * count : 0
    return {
      name: count > 1 ? `${count} × ${vehicle.label}` : vehicle.label,
      maxCapacityKg: vehicle.capacityKg * count,
      loadFactorPct: totalAllocatedKg > 0 ? Math.min(100, Math.round((totalAllocatedKg / (vehicle.capacityKg * count)) * 100)) : 0,
      fuelType: 'Indicative hire tariff — confirm at dispatch',
      km,
      kmSaved: Math.max(0, Math.round((naiveKm - km) * 10) / 10),
      costRs,
      costPerKg: totalAllocatedKg > 0 ? Math.round((costRs / totalAllocatedKg) * 100) / 100 : 0,
    }
  }, [dynamicRoutePlan, totalAllocatedKg])

  // Lock Sourcing Batch Action
  async function handleLockAggregation() {
    if (!activeOrder) return
    setIsAggregating(true)
    try {
      const token = await ensureSession()
      const contributions = Object.entries(farmerAllocations)
        .filter(([_, kg]) => kg > 0)
        .map(([farmerId, kg]) => ({
          farmer_id: farmerId,
          crop: activeCrop,
          allocated_kg: kg,
          quality_grade: 'A',
        }))

      const batchCode = `BATCH-${activeOrder.code || String(activeOrder.id).slice(-4).toUpperCase()}-${activeCrop}`

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

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to lock batch')
      const results: Array<{ status: string; farmerName: string; reason: string | null }> = json.results ?? []
      const committed = results.filter((r) => r.status === 'COMMITTED')
      const skipped = results.filter((r) => r.status === 'SKIPPED')
      setAggregationSuccess(
        `${json.batch?.batch_code ?? batchCode}: ${committed.length} farmer${committed.length === 1 ? '' : 's'} committed — ${json.totals?.primaryKg ?? 0} kg primary + ${json.totals?.standbyKg ?? 0} kg standby of ${json.totals?.targetKg ?? activeTargetKg} kg.` +
          (skipped.length ? ` Not added: ${skipped.map((r) => `${r.farmerName} (${r.reason})`).join('; ')}.` : '')
      )
      await fetchLiveFeeds(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrilink:harvest-updated'))
        window.dispatchEvent(new CustomEvent('agrilink:order-created'))
        try {
          const bc = new BroadcastChannel('agrilink_sync')
          bc.postMessage({ type: 'ORDER_LOCKED', orderId: activeOrder.id })
          bc.close()
        } catch {}
      }

      setTimeout(() => setAggregationSuccess(null), 7000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Aggregation failed.')
    } finally {
      setIsAggregating(false)
    }
  }

  // SIMULATION 1: Simulate Small Retail Order (<= 50 kg)
  async function handleSimulateSmallOrder() {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          crop: 'TOMATO',
          qtyTargetKg: 35,
          pricePerKg: 21,
          deliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          buyerId: testBuyer()?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSimulationToast(`Test order not placed: ${data.error || 'unknown error'}`)
        return
      }
      if (data.order) {
        setSimulationToast(`Small order ${data.order.code} (35 kg tomato): ${data.message}`)
        fetchLiveFeeds(false)
        setActiveTab('orders')
        setOrderFilter('small')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrilink:order-created'))
          try {
            const bc = new BroadcastChannel('agrilink_sync')
            bc.postMessage({ type: 'ORDER_CREATED', order: data.order })
            bc.close()
          } catch {}
        }
        setTimeout(() => setSimulationToast(null), 8000)
      }
    } catch {
      alert('Unable to simulate small order.')
    }
  }

  // SIMULATION 2: Simulate Bulk Institutional Demand (> 50 kg)
  async function handleSimulateBulkOrder() {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          crop: 'PADDY',
          qtyTargetKg: 1200,
          pricePerKg: 28,
          deliveryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          buyerId: testBuyer()?.id,
          submitForReview: true,
          buyerName: 'PM POSHAN Central Kitchen, Anand',
          deliveryLocation: 'Kitchen Block, Nana Bazaar, Vallabh Vidyanagar, Anand',
          purpose: 'PM POSHAN Central Kitchen weekly mid-day meal buffer quota for 14 government schools in Anand district (1,100 students).',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSimulationToast(`Test demand not placed: ${data.error || 'unknown error'}`)
        return
      }
      if (data.order) {
        setSimulationToast(`Bulk demand ${data.order.code} (1,200 kg paddy) is waiting for purpose review: ${data.message}`)
        fetchLiveFeeds(false)
        setActiveTab('orders')
        setOrderFilter('bulk')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrilink:order-created'))
          try {
            const bc = new BroadcastChannel('agrilink_sync')
            bc.postMessage({ type: 'ORDER_CREATED', order: data.order, isBulk: true })
            bc.close()
          } catch {}
        }
        setTimeout(() => setSimulationToast(null), 8000)
      }
    } catch {
      alert('Unable to simulate bulk demand.')
    }
  }

  // COMPLIANCE DESK: Admin Validates or Rejects Bulk Order Purpose
  async function handleValidateBulkOrder(orderId: string, decision: 'approved' | 'rejected') {
    setValidatingOrderId(orderId)
    try {
      const note =
        adminNotes[orderId] ||
        (decision === 'approved'
          ? 'Verified institutional buyer purpose and approved for multi-farmer aggregation.'
          : 'Order purpose does not meet institutional procurement compliance.')

      const res = await fetch(`/api/orders/${orderId}/action`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'admin_validate_bulk',
          decision,
          note,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        // Broadcast across all open tabs (BuyerMarketplace and other admin tabs)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrilink:order-created'))
          try {
            const bc = new BroadcastChannel('agrilink_sync')
            bc.postMessage({ type: 'ORDER_VALIDATED', orderId, decision, note })
            bc.close()
          } catch {}
        }

        setSimulationToast(
          decision === 'approved'
            ? `✅ Bulk Demand #${orderId.slice(-4).toUpperCase()} Validated & Approved! Sourcing unlocked.`
            : `❌ Bulk Demand #${orderId.slice(-4).toUpperCase()} Rejected by Compliance Desk.`
        )
        setTimeout(() => setSimulationToast(null), 8000)
        await fetchLiveFeeds(false)
      } else {
        alert(data.error || 'Failed to update order review.')
      }
    } catch {
      alert('Network error while validating order.')
    } finally {
      setValidatingOrderId(null)
    }
  }

  // SIMULATION 3: Simulate Farmer Rejection & Automated Fallback
  async function handleSimulateRejection(order: LiveOrder) {
    try {
      const isSmall = Number(order.qty_target_kg || order.quantity_required) <= SMALL_ORDER_THRESHOLD_KG
      const res = await fetch(`/api/orders/${order.id}/action`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'farmer_reject',
          farmerId: order.allocated_farmer_id,
          crop: order.crop,
          qtyTargetKg: order.qty_target_kg,
          reason: 'Sprayer breakdown / tractor booked',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSimulationToast(`Decline not recorded: ${json.error || 'unknown error'}`)
        return
      }
      if (json.ok) {
        if (isSmall && json.nextFarmer) {
          // Update order locally
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    allocated_farmer_name: `${json.nextFarmer.name} (${json.nextFarmer.village} · ${json.nextFarmer.distanceKm} km)`,
                    allocated_farmer_id: json.nextFarmer.id,
                    farmer_acceptance_status: 'PENDING',
                  }
                : o
            )
          )
          setSimulationToast(`🔄 Automated Fallback: ${json.message}`)
        } else if (isSmall) {
          setSimulationToast(json.message)
        } else if (!isSmall) {
          setSimulationToast(`🔄 Bulk Standby Promotion: ${json.message}`)
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrilink:order-created'))
          try {
            const bc = new BroadcastChannel('agrilink_sync')
            bc.postMessage({ type: 'ORDER_FALLBACK', orderId: order.id })
            bc.close()
          } catch {}
        }
        setTimeout(() => setSimulationToast(null), 8000)
      }
    } catch {
      alert('Unable to simulate farmer decline.')
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

  const totalBuyerKgNeeded = orders.reduce((sum, o) => sum + Number(o.qty_target_kg || o.quantity_required || 1000), 0)
  const totalFarmerKgAvailable = farmers.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0)
  const verifiedMembersCount = data?.profiles.filter((p) => p.verification_status === 'verified').length ?? 0
  const pendingSmallOrder = orders.find((o) => o.order_tier === 'SMALL' && o.farmer_acceptance_status === 'PENDING')
  // Order prices against the mandi and retail references captured when each order was placed
  const mandiPriced = orders.filter((o) => o.mandi_price_per_kg && o.price_per_kg)
  const farmerUpliftPct = mandiPriced.length ? Math.round((mandiPriced.reduce((s, o) => s + (o.price_per_kg! - o.mandi_price_per_kg!) / o.mandi_price_per_kg!, 0) / mandiPriced.length) * 100) : null
  const retailPriced = orders.filter((o) => o.retail_price_per_kg && o.price_per_kg)
  const buyerSavingPct = retailPriced.length ? Math.round((retailPriced.reduce((s, o) => s + (o.retail_price_per_kg! - o.price_per_kg!) / o.retail_price_per_kg!, 0) / retailPriced.length) * 100) : null
  const smallOrdersCount = orders.filter((o) => Number(o.qty_target_kg || o.quantity_required) <= SMALL_ORDER_THRESHOLD_KG).length
  const bulkOrdersCount = orders.filter((o) => Number(o.qty_target_kg || o.quantity_required) > SMALL_ORDER_THRESHOLD_KG).length

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
              Dashboard
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
              className="text-xs text-muted-foreground hover:text-destructive underline cursor-pointer"
            >
              Sign out
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold">FPO Admin Portal</h1>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Live Command Center
            </span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              FPO Cluster Ops
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Direct smallholder aggregation, automated nearest-farmer routing, live demand intake & APMC compliance.
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-secondary transition-colors min-h-[38px] shadow-xs cursor-pointer"
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
          <p className="mt-1 text-[11px] text-muted-foreground">
            {smallOrdersCount} Small (≤50 kg) · {bulkOrdersCount} Bulk Demands
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Cluster Smallholders</span>
            <Sprout className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {farmers.length} <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">({totalFarmerKgAvailable.toLocaleString()} KG)</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {liveFarmersCount} with app accounts
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Order price vs mandi</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {farmerUpliftPct != null ? `${farmerUpliftPct >= 0 ? '+' : ''}${farmerUpliftPct}%` : '—'}{' '}
            <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">for farmers, before transport</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {buyerSavingPct != null ? `Buyers pay ${buyerSavingPct}% below retail` : 'No retail reference yet'} · references captured at order time
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs sm:text-sm font-medium">Locked Consignments</span>
            <Boxes className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {batches.length} <span className="text-xs sm:text-sm font-sans font-normal text-muted-foreground">Batches</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            TSP 2-Opt Optimized · {vehicleStats.kmSaved} km saved by sequencing
          </p>
        </div>
      </div>

      {/* 3. Operational Dispatch Simulation Toolbar */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Dispatch & Routing Simulation
              </span>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                Ops Sandbox
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Simulate real-time small-order auto-routing (≤50 kg), bulk aggregation (&gt;50 kg), and instant rejection cascading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSimulateSmallOrder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 px-3 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Place a 35 kg retail order and observe immediate nearest-farmer auto-assignment"
            >
              <Zap className="size-3.5 text-emerald-600" />
              <span>Simulate Small Order (35 kg)</span>
            </button>

            <button
              onClick={handleSimulateBulkOrder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Place a 1,200 kg bulk demand requiring admin review and multi-farmer knapsack pooling"
            >
              <Boxes className="size-3.5" />
              <span>Simulate Bulk Demand (1,200 kg)</span>
            </button>

            {pendingSmallOrder && (
              <button
                onClick={() => handleSimulateRejection(pendingSmallOrder)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 px-3 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Simulate a farmer declining and watch the algorithm instantly re-route to next nearest farmer"
              >
                <RefreshCw className="size-3.5" />
                <span>Simulate Farmer Decline</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Simulation Toast Banner */}
        {simulationToast && (
          <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-3 flex items-center gap-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="leading-relaxed">{simulationToast}</p>
          </div>
        )}
      </div>

      {/* 4. Structured 4-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>1. Buyer Demands & Live Flow</span>
          <span className="rounded-full bg-background/20 px-2 py-0.2 text-[10px] font-mono">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('aggregation')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'aggregation'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Layers className="size-4" />
          <span>2. Smart Aggregation & Logistics Desk</span>
          {activeOrder && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
              {activeCrop} ({activeTargetKg} kg)
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'batches'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Boxes className="size-4" />
          <span>3. Sourcing Batches & Dispatch</span>
          <span className="rounded-full bg-background/20 px-2 py-0.2 text-[10px] font-mono">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('farmers')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'farmers'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Sprout className="size-4" />
          <span>4. Smallholder Cluster Roster</span>
          <span className="rounded-full bg-background/20 px-2 py-0.2 text-[10px] font-mono">
            {farmers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'forecast'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <BarChart3 className="size-4" />
          <span>5. Demand Forecast</span>
        </button>

        <button
          onClick={() => setActiveTab('logistics')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'logistics'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Route className="size-4" />
          <span>6. Collection Runs</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: BUYER DEMANDS & LIVE ORDER FLOW */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* 🛡️ BUYER LARGE ORDERS COMPLIANCE DESK (>50 KG PURPOSE VERIFICATION) */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400 shrink-0">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                      Buyer Large Orders Compliance Desk (&gt;50 kg Purpose Verification)
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        pendingComplianceOrders.length > 0
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-pulse'
                          : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                      }`}
                    >
                      {pendingComplianceOrders.length > 0
                        ? `⏳ ${pendingComplianceOrders.length} Demands Awaiting Purpose Verification`
                        : '✓ All Large Demands Verified'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground max-w-3xl">
                    Under AgriLink fair procurement policy, buyers placing orders exceeding 50 kg must declare their institutional procurement purpose. As FPO Administrator, verify the justification before releasing the demand for multi-smallholder aggregation.
                  </p>
                </div>
              </div>

              {pendingComplianceOrders.length === 0 && (
                <button
                  onClick={handleSimulateBulkOrder}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                  title="Simulate a >50 kg bulk demand with purpose to test real-time admin validation"
                >
                  <Boxes className="size-3.5" />
                  <span>+ Test &gt;50 kg Demand with Reason</span>
                </button>
              )}
            </div>

            {/* Pending Demands Cards or All Clear State */}
            {pendingComplianceOrders.length > 0 ? (
              <div className="mt-4 space-y-4">
                {pendingComplianceOrders.map((ord) => {
                  const targetKg = Number(ord.qty_target_kg || ord.quantity_required || 100)
                  const cropName = ord.crop || ord.crop_required || 'PADDY'
                  const code = ord.code || `AG-${String(ord.id).slice(-4).toUpperCase()}`
                  const price = Number(ord.price_per_kg || 28)
                  const totalEst = targetKg * price
                  const isValidating = validatingOrderId === ord.id

                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-amber-500/40 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-amber-500/60"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-secondary text-foreground">
                              {code}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {ord.buyer_name || 'Institutional Buyer'}
                            </span>
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                              {cropName} · {targetKg.toLocaleString()} KG (Bulk Demand)
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              Escrow Budget: ₹{totalEst.toLocaleString()} (₹{price}/kg)
                            </span>
                          </div>

                          {/* Stated Purpose Quote Box */}
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 mb-1">
                              <FileText className="size-3.5" />
                              <span>Buyer Stated Purpose for Bulk Order (&gt;50 kg):</span>
                            </div>
                            <blockquote className="italic text-foreground font-medium pl-2 border-l-2 border-amber-500/50">
                              &ldquo;{ord.purpose || 'No purpose given'}&rdquo;
                            </blockquote>
                            {ord.delivery_location && (
                              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3 text-primary" /> Delivery Target: {ord.delivery_location}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons & Note */}
                        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:min-w-[320px]">
                          <input
                            type="text"
                            value={adminNotes[ord.id] ?? ''}
                            onChange={(e) => setAdminNotes((prev) => ({ ...prev, [ord.id]: e.target.value }))}
                            placeholder="Add admin remarks (optional)..."
                            className="w-full sm:w-48 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              disabled={isValidating}
                              onClick={() => handleValidateBulkOrder(ord.id, 'approved')}
                              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                              title="Approve institutional purpose and release demand to multi-farmer pooling"
                            >
                              {isValidating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              <span>Approve & Validate</span>
                            </button>
                            <button
                              disabled={isValidating}
                              onClick={() => handleValidateBulkOrder(ord.id, 'rejected')}
                              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                              title="Reject bulk order purpose and decline demand"
                            >
                              <AlertCircle className="size-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>
                    No bulk demands currently pending compliance review. All orders &gt;50 kg are in active sourcing or completed.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  Real-time Listening Active
                </span>
              </div>
            )}
          </div>

          {/* Order Category Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOrderFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  orderFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card hover:bg-secondary text-foreground'
                }`}
              >
                All Orders ({orders.length})
              </button>
              <button
                onClick={() => setOrderFilter('small')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderFilter === 'small'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <Zap className="size-3.5" />
                <span>Small Orders (≤50 KG Auto-Allocated) ({smallOrdersCount})</span>
              </button>
              <button
                onClick={() => setOrderFilter('bulk')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderFilter === 'bulk'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                <Boxes className="size-3.5" />
                <span>Bulk Demands (&gt;50 KG Admin Review) ({bulkOrdersCount})</span>
              </button>
              <button
                onClick={() => setOrderFilter('aggregated')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  orderFilter === 'aggregated'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card hover:bg-secondary text-foreground'
                }`}
              >
                Fully committed ({orders.filter((o) => o.is_fully_committed).length})
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing <strong>{filteredOrders.length}</strong> orders
            </p>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5 sm:px-4">Order Code</th>
                  <th className="p-3.5 sm:px-4">Buyer Entity</th>
                  <th className="p-3.5 sm:px-4">Crop Required</th>
                  <th className="p-3.5 sm:px-4">Target Volume</th>
                  <th className="p-3.5 sm:px-4">Price / KG</th>
                  <th className="p-3.5 sm:px-4">Order Routing Tier</th>
                  <th className="p-3.5 sm:px-4">Allocation Status</th>
                  <th className="p-3.5 sm:px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((ord) => {
                  const targetKg = Number(ord.qty_target_kg || ord.quantity_required || 1000)
                  const isSmall = targetKg <= SMALL_ORDER_THRESHOLD_KG
                  const isCurrent = selectedOrderId === ord.id
                  const cropName = ord.crop || ord.crop_required || 'PADDY'
                  const code = ord.code || `AG-${String(ord.id).slice(-4).toUpperCase()}`
                  const isPendingReview = ord.review_status === 'pending' || ord.status === 'PENDING_ADMIN_REVIEW'
                  const isRejected = ord.review_status === 'rejected' || ord.status === 'REJECTED'

                  return (
                    <tr
                      key={ord.id}
                      className={`transition-colors ${
                        isCurrent ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/30'
                      }`}
                    >
                      <td className="p-3.5 sm:px-4 font-mono font-bold text-foreground">
                        {code}
                      </td>
                      <td className="p-3.5 sm:px-4 font-semibold text-foreground">
                        {ord.buyer_name || ord.delivery_location || 'Institutional Buyer'}
                      </td>
                      <td className="p-3.5 sm:px-4">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                          {cropName}
                        </span>
                      </td>
                      <td className="p-3.5 sm:px-4 font-mono font-bold">
                        {targetKg.toLocaleString()} KG
                      </td>
                      <td className="p-3.5 sm:px-4 font-mono text-foreground font-semibold">
                        ₹{ord.price_per_kg}
                      </td>
                      <td className="p-3.5 sm:px-4">
                        {isSmall ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              <Zap className="size-3" /> Auto-Allocated (≤50 kg)
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {ord.allocated_farmer_name ?? (ord.farmer_acceptance_status === 'REJECTED' ? 'No single nearby farmer — pool it' : 'Awaiting allocation')}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                              <Boxes className="size-3" /> Bulk Demand ({targetKg} kg)
                            </span>
                            {ord.purpose && (
                              <span
                                className="block text-[11px] text-muted-foreground truncate max-w-[220px]"
                                title={ord.purpose}
                              >
                                Reason: &ldquo;{ord.purpose}&rdquo;
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            ord.is_fully_committed
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : isPendingReview
                              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                              : isRejected
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : isSmall
                              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                              : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {ord.is_fully_committed ? (
                            <>✓ Fully committed</>
                          ) : isPendingReview ? (
                            <>⏳ Compliance Review Pending</>
                          ) : isRejected ? (
                            <>❌ Purpose Rejected</>
                          ) : isSmall ? (
                            <>{ord.farmer_acceptance_status === 'ACCEPTED' ? '⚡ Farmer confirmed' : ord.farmer_acceptance_status === 'REJECTED' ? 'Needs pooling' : '⚡ Waiting for farmer'}</>
                          ) : (
                            <>✅ Purpose Approved</>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSmall ? (
                            <button
                              onClick={() => handleSimulateRejection(ord)}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
                              title="Test farmer declining this order and verify automatic re-allocation to next nearest farmer"
                            >
                              <RefreshCw className="size-3" />
                              <span>Decline Fallback</span>
                            </button>
                          ) : isPendingReview ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleValidateBulkOrder(ord.id, 'approved')}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                title="Approve institutional purpose"
                              >
                                <Check className="size-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleValidateBulkOrder(ord.id, 'rejected')}
                                className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-1 text-xs font-bold transition-colors cursor-pointer"
                                title="Reject order purpose"
                              >
                                <AlertCircle className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedOrderId(ord.id)
                                setActiveTab('aggregation')
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                            >
                              <span>Review & Aggregate</span>
                              <ArrowRight className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SMART AGGREGATION & LOGISTICS DESK */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'aggregation' && (
        <section className="rounded-3xl border border-primary/30 bg-card shadow-sm overflow-hidden space-y-6">
          {/* Header Banner */}
          <div className="border-b border-border bg-primary/5 p-5 sm:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Layers className="size-4" />
                  <span>Smart Sourcing & Aggregation Desk</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                    Knapsack & Corridor TSP Solver
                  </span>
                </div>
                <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                  Consolidate Smallholders for Active Demand
                </h2>
                <p className="mt-1 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Combine produce from verified marginal smallholders, secure a 15% standby reserve to guarantee consignment volume,
                  and calculate the optimal TSP 2-Opt pickup sequence.
                </p>
              </div>

              {/* Order Selector Dropdown */}
              <div className="rounded-2xl border border-border bg-card p-3 shadow-xs shrink-0 min-w-[300px]">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Select Bulk Demand to Aggregate:
                </label>
                <select
                  value={selectedOrderId || ''}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-secondary/50 px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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

          {/* Active Demand Status Ribbon */}
          {activeOrder && (
            <div className="border-b border-border bg-secondary/30 px-5 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-muted-foreground">Order: </span>
                  <span className="font-mono font-bold text-foreground">
                    {activeOrder.code || `AG-${String(activeOrder.id).slice(-4).toUpperCase()}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Buyer: </span>
                  <span className="font-semibold text-foreground">
                    {activeOrder.buyer_name || activeOrder.delivery_location || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Crop: </span>
                  <span className="font-bold text-primary">{activeCrop}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Demand Target: </span>
                  <span className="font-bold text-foreground">{activeTargetKg.toLocaleString()} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground">+15% Standby Reserve: </span>
                  <span className="font-semibold text-amber-600">+{standbyBufferKg} KG</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activeOrder.status === 'AGGREGATED'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {activeOrder.status || 'PENDING'}
                </span>
              </div>
            </div>
          )}

          {/* Aggregation Body */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Success Banner */}
            {aggregationSuccess && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
                <CheckCircle2 className="size-5 shrink-0" />
                <p className="text-sm font-semibold">{aggregationSuccess}</p>
              </div>
            )}

            {/* Step 1: Knapsack Intelligence Banner */}
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
                          Multi-Objective Knapsack & Corridor TSP Allocation
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
                    <span>Re-apply Optimal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sourcing Capacity Meter */}
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

                <div>
                  {isBufferSecured ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" /> 100% Demand Target Met + 15% Standby Buffer Secured
                    </span>
                  ) : isTargetMet ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700">
                      <AlertCircle className="size-4" /> 100% Target Met · Standby Buffer ({totalAllocatedKg}/{totalTargetWithBufferKg} KG)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1 text-xs font-semibold text-destructive">
                      Needs {(activeTargetKg - totalAllocatedKg).toLocaleString()} KG more to fulfill consignment
                    </span>
                  )}
                </div>
              </div>

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
                <span>100% Target: {activeTargetKg} KG</span>
                <span className="font-semibold text-amber-600">+15% Buffer: {totalTargetWithBufferKg} KG</span>
              </div>
            </div>

            {/* Matched Smallholder Allocation Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg font-bold text-foreground">
                  Candidate Smallholders for {activeCrop} Sourcing:
                </h4>
                <span className="text-xs text-muted-foreground">
                  {matchedFarmers.length} farmers with uncommitted {activeCrop.toLowerCase()} registered
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5 sm:px-4">Include</th>
                      <th className="p-3.5 sm:px-4">Farmer Member</th>
                      <th className="p-3.5 sm:px-4">Village Corridor</th>
                      <th className="p-3.5 sm:px-4">Quality & Reliability</th>
                      <th className="p-3.5 sm:px-4">Algorithm Role</th>
                      <th className="p-3.5 sm:px-4">Available</th>
                      <th className="p-3.5 sm:px-4">Allocated (KG)</th>
                      <th className="p-3.5 sm:px-4 text-right">Voice Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matchedFarmers.map((f) => {
                      const allocated = farmerAllocations[f.id] || 0
                      const isSelected = allocated > 0
                      const maxCap = Number(f.quantity) || 0
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
                              {f.mobile_number}
                            </span>
                          </td>
                          <td className="p-3.5 sm:px-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 text-primary" /> {f.village}
                            </span>
                          </td>
                          <td className="p-3.5 sm:px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                {f.quality_grade ? `Grade ${f.quality_grade}` : 'Not graded yet'}
                              </span>
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {f.reliability_score ?? '—'}%
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
                                setSelectedCallAllocatedKg(allocated > 0 ? allocated : Number(f.quantity) || 0)
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

            {/* Step 3: Vehicle Load & Route Optimization */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="size-5 text-primary" />
                    <h4 className="font-serif text-xl font-bold text-foreground">
                      Consolidated Pickup Runway & TSP 2-Opt Routing
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optimized multi-stop collection visiting matched smallholders to eliminate intermediary empty haulage.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Navigation className="size-3.5" />
                    <span>{vehicleStats.km} KM Route</span>
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {vehicleStats.kmSaved} km saved by sequencing
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                    ₹{vehicleStats.costRs.toLocaleString('en-IN')} est. hire · ₹{vehicleStats.costPerKg}/kg
                  </span>
                </div>
              </div>

              {/* Recommended Vehicle Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-secondary/30 border border-border p-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Freight Carrier
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
                    Routing Engine
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    TSP 2-Opt Algorithm Solver
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dynamicRoutePlan?.sequence.length || 0} Total Waypoints · {dynamicRoutePlan?.km || 0} km vs {dynamicRoutePlan?.naiveKm || 0} km unoptimized
                  </p>
                </div>
              </div>

              {/* Leaflet Map & Sequence */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Waypoint Manifest ({dynamicRoutePlan?.sequence.length || 0} Stops):
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Interactive Sourcing Corridor Map:
                  </span>
                  <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-border shadow-xs">
                    <RouteMap stops={dynamicRoutePlan?.sequence || []} />
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Batch CTA Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Combining <strong>{Object.values(farmerAllocations).filter((kg) => kg > 0).length}</strong> smallholders ·
                Total <strong>{totalAllocatedKg} KG</strong> assigned to consignment{' '}
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
                <span>Confirm & Lock Aggregation Batch</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: SOURCING BATCHES & DISPATCH */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'batches' && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Boxes className="size-5 text-amber-600" />
              <h3 className="font-serif text-xl font-bold">Consolidated Sourcing Batches</h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {batches.length} Active Batches
            </span>
          </div>

          <div className="overflow-x-auto">
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
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                          {b.quality_verified ? `Graded · A ${b.grade_a_kg ?? 0} kg / B ${b.grade_b_kg ?? 0} kg` : 'Graded at collection'}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{b.created_by || '—'}</td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No batches created yet. Use Tab 2 (Smart Aggregation Desk) to combine smallholders into a batch.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SMALLHOLDER CLUSTER ROSTER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'farmers' && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                <Sprout className="size-5 text-emerald-600" />
                Cluster Farmer Directory & Produce Registry
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Incoming produce declared by smallholders across village clusters, synchronized with live accounts.
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
                All Smallholders ({farmers.length})
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
                Pre-Registered Cluster ({farmers.length - liveFarmersCount})
              </button>
            </div>
          </div>

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
                      key={f.entry_id ?? f.id}
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
                        {f.mobile_number}
                      </td>
                      <td className="py-3 text-muted-foreground">{f.village}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                          {f.crop_name ?? 'No active harvest'}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-foreground">{Number(f.quantity ?? 0).toLocaleString('en-IN')} KG</td>
                      <td className="py-3">
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {f.quality_grade ? `Grade ${f.quality_grade}` : 'Not graded yet'}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        <div>{f.harvest_date ?? '—'}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="size-3" /> {f.is_live_account ? 'App account' : 'FPO member'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCallFarmer(f)
                            setSelectedCallAllocatedKg(Number(f.quantity) || 0)
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
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No farmers match the &quot;{farmerFilterTab}&quot; filter.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'forecast' && <DemandForecastPanel />}
      {activeTab === 'logistics' && <LogisticsPlanPanel onDispatched={() => fetchLiveFeeds(false)} />}

      {/* Bolna AI Voice Calling Agent Confirmation Modal */}
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
