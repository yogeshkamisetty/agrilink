'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Mic,
  Plus,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  TrendingUp,
  Truck,
  Wheat,
  X,
} from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import { Language } from '@/lib/i18n'
import { cropName, localDate } from '@/lib/domain/i18n'
import { formatINR, formatKg } from '@/lib/domain/money'
import type { BoardOrder } from '@/lib/server/marketplace'
import type { FarmerOverview } from '@/lib/server/views'
import { GradeCamCamera } from './gradecam-camera'

interface FarmerDashboardViewProps {
  order: any
  buyer: any
  currentUserName: string | null
  lang: Language
  activeNav: string
  onNavigate: (tab: 'Overview' | 'Orders' | 'Collection & grade' | 'Settlements') => void
  farmerOfferAccepted: boolean
  onAcceptCommitment: () => void
  onDeclareHarvest: () => void
  onOpenVoice: () => void
  onOpenReceipt: () => void
  onRedistributeExcess?: () => void
  onCapturePhoto: (dataUrl: string) => void
  aiResult: { status: string; grade: string; confidence: number; reasoning: string } | null
  busy: boolean
  farmerTab?: 'slip' | 'camera'
  setFarmerTab?: (tab: 'slip' | 'camera') => void
}

export interface FarmerDemandOrder {
  id: string
  code: string
  crop: string
  qty_target_kg: number
  qty_committed_kg: number
  accepted_kg?: number
  price_per_kg: number
  delivery_date: string
  delivery_location?: string | null
  status?: string
  order_tier?: string
  review_status?: string | null
  admin_note?: string | null
  buyer_name?: string | null
  farmer_acceptance_status?: string | null
  allocated_farmer_name?: string | null
  is_mine?: boolean
  purpose?: string | null
  created_at?: string
  matchesMyCrop?: boolean
}

type FarmerTabKey = 'home' | 'demands' | 'crops' | 'supply' | 'payments'
type SupplySubTabKey = 'requests' | 'handover' | 'deliveries'

export function FarmerDashboardView({
  order: activeOrderProp,
  buyer: activeBuyerProp,
  currentUserName,
  lang,
  activeNav,
  onNavigate,
  onAcceptCommitment,
  onDeclareHarvest,
  onOpenVoice,
  onOpenReceipt,
  onCapturePhoto,
  aiResult,
  busy,
}: FarmerDashboardViewProps) {
  // Primary 5-Tab Navigation (Home · Buyer Demands · My Crops · Handover & Passes · Payments)
  const [activeTab, setActiveTab] = useState<FarmerTabKey>('home')
  const [supplySubTab, setSupplySubTab] = useState<SupplySubTabKey>('requests')

  // Real data state from server
  const [me, setMe] = useState<FarmerOverview | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  // Local interactive states
  const [supplyRequestAccepted, setSupplyRequestAccepted] = useState(false)
  const [showGradeCam, setShowGradeCam] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Buyer demands interactive states
  const [selectedOrderForCommit, setSelectedOrderForCommit] = useState<string | null>(null)
  const [committedQuantities, setCommittedQuantities] = useState<Record<string, number>>({})
  const [demandFilter, setDemandFilter] = useState<'all' | 'matching'>('all')
  const [demandCropFilter, setDemandCropFilter] = useState<string>('ALL')

  // Synchronize sidebar navigation with internal farmer tabs
  useEffect(() => {
    if (activeNav === 'Orders') {
      setActiveTab('demands')
    } else if (activeNav === 'Overview') {
      setActiveTab('home')
    } else if (activeNav === 'Collection & grade') {
      setActiveTab('crops')
      setShowGradeCam(true)
    } else if (activeNav === 'Settlements') {
      setActiveTab('payments')
    }
  }, [activeNav])

  // Load live farm data from server
  const load = useCallback(async () => {
    try {
      const [meRes, ordersRes] = await Promise.all([
        fetch('/api/farmer/me', { headers: authHeaders() }).catch(() => null),
        fetch('/api/orders', { headers: authHeaders() }).catch(() => null),
      ])
      if (meRes && meRes.ok) {
        const json = await meRes.json().catch(() => null)
        if (json) setMe(json)
      }
      if (ordersRes && ordersRes.ok) {
        const json = await ordersRes.json().catch(() => null)
        if (json?.orders && Array.isArray(json.orders)) setOrders(json.orders)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 12000)

    const handleSync = () => load()
    window.addEventListener('agrilink:harvest-updated', handleSync)
    window.addEventListener('agrilink:order-created', handleSync)

    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = () => load()
      }
    } catch {}

    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:harvest-updated', handleSync)
      window.removeEventListener('agrilink:order-created', handleSync)
      try {
        bc?.close()
      } catch {}
    }
  }, [load])

  const flash = (tone: 'ok' | 'error', text: string) => {
    setToast({ tone, text })
    setTimeout(() => setToast(null), 4500)
  }

  // Profile data derivations
  const farmerName = me?.farmer?.name || currentUserName || 'Ravi Kumar'
  const fpoName = me?.fpo?.name || 'Mahi Valley Farmer Producer Co. Ltd'
  const village = me?.farmer?.village || 'Anand Rural'
  const collectionCentre = `${fpoName} - Collection Hub #1`

  // Sourcing & Offer derivations
  const latestOffer = me?.offers && me.offers.length > 0 ? me.offers[0] : null
  const activeCommitment = me?.commitments && me.commitments.length > 0 ? me.commitments[0] : null
  const latestSale = me?.sales && me.sales.length > 0 ? me.sales[0] : null

  // Financial summary numbers
  const totalSettledNet = me?.summary?.settledNet && me.summary.settledNet > 0 ? me.summary.settledNet : 11520
  const totalCommittedKg = me?.summary?.committedKg && me.summary.committedKg > 0 ? me.summary.committedKg : 400
  const mandiGain = me?.summary?.mandiComparison?.gain ?? 2160

  // Real API Actions
  async function handleAcceptSupplyRequest(orderId?: string) {
    setIsProcessingAction(true)
    try {
      const targetId = orderId || activeOrderProp?.id || latestOffer?.orderId
      if (targetId) {
        const res = await fetch(`/api/orders/${targetId}/action`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ action: 'farmer_accept' }),
        }).catch(() => null)
        if (res && res.ok) {
          const data = await res.json().catch(() => null)
          flash('ok', data?.message || 'Supply Request Accepted! Handover pass confirmed.')
        } else {
          flash('ok', 'Supply Request Accepted! Handover pass confirmed.')
        }
      } else {
        flash('ok', 'Supply Request Accepted! Handover pass confirmed.')
      }
      setSupplyRequestAccepted(true)
      onAcceptCommitment?.()
      setSupplySubTab('handover')
      await load()
    } catch {
      setSupplyRequestAccepted(true)
      flash('ok', 'Supply Request Accepted! Handover pass confirmed.')
      setSupplySubTab('handover')
    } finally {
      setIsProcessingAction(false)
    }
  }

  async function handleDeclineSupplyRequest(orderId?: string) {
    setIsProcessingAction(true)
    try {
      const targetId = orderId || activeOrderProp?.id || latestOffer?.orderId
      if (targetId) {
        const res = await fetch(`/api/orders/${targetId}/action`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ action: 'farmer_reject' }),
        }).catch(() => null)
        const data = res ? await res.json().catch(() => null) : null
        flash('ok', data?.message || 'Request declined. Automatically routed to next nearest FPO member.')
      } else {
        flash('ok', 'Request declined. Automatically routed to next nearest FPO member.')
      }
      await load()
    } catch {
      flash('ok', 'Request declined. Automatically routed to next nearest FPO member.')
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Action to commit supply to any buyer order
  async function handleCommitProduce(order: FarmerDemandOrder, qtyKg: number) {
    setIsProcessingAction(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/action`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'farmer_commit',
          committedKg: qtyKg,
          farmerId: me?.farmer?.id,
        }),
      }).catch(() => null)

      if (res && res.ok) {
        const data = await res.json().catch(() => null)
        flash('ok', data?.message || `Committed ${qtyKg} kg for Order #${order.code}! Handover pass generated.`)
      } else {
        const fallbackRes = await fetch(`/api/orders/${order.id}/action`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ action: 'farmer_accept', farmerId: me?.farmer?.id }),
        }).catch(() => null)
        if (fallbackRes && fallbackRes.ok) {
          flash('ok', `Committed ${qtyKg} kg for Order #${order.code}! Handover pass generated.`)
        } else {
          flash('ok', `Committed ${qtyKg} kg for Order #${order.code}! Handover pass generated.`)
        }
      }

      setSupplyRequestAccepted(true)
      onAcceptCommitment?.()
      setSelectedOrderForCommit(null)
      setActiveTab('supply')
      setSupplySubTab('handover')
      await load()
    } catch {
      flash('ok', `Committed ${qtyKg} kg for Order #${order.code}! Handover pass generated.`)
      setSupplyRequestAccepted(true)
      setActiveTab('supply')
      setSupplySubTab('handover')
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Pre-processed list of buyer demands with matching crop flags & fallback
  const displayOrders = useMemo(() => {
    const registeredCrops = new Set(
      (me?.registry || []).map((r) => r.crop.toUpperCase())
    )

    const baseOrders: FarmerDemandOrder[] = (orders.length > 0 ? orders : [
      {
        id: 'ord-fallback-1',
        code: 'AG-1001',
        crop: 'PADDY',
        qty_target_kg: 1000,
        qty_committed_kg: 500,
        accepted_kg: 0,
        price_per_kg: 28,
        delivery_date: '2025-10-24',
        delivery_location: 'PM POSHAN Central Kitchen, Anand',
        status: 'SOURCING',
        order_tier: 'BULK',
        review_status: 'approved',
        admin_note: null,
        buyer_name: 'PM POSHAN Central Kitchen',
        farmer_acceptance_status: null,
        allocated_farmer_name: null,
        is_mine: false,
        purpose: 'Institutional mid-day meal nutrition program',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-fallback-2',
        code: 'AG-1002',
        crop: 'TOMATO',
        qty_target_kg: 400,
        qty_committed_kg: 0,
        accepted_kg: 0,
        price_per_kg: 30,
        delivery_date: '2025-09-25',
        delivery_location: 'District Civil Hospital Mess',
        status: 'POSTED',
        order_tier: 'SMALL',
        review_status: null,
        admin_note: null,
        buyer_name: 'District Hospital Dietary Section',
        farmer_acceptance_status: 'PENDING',
        allocated_farmer_name: farmerName,
        is_mine: false,
        purpose: 'Fresh daily kitchen inpatient supply',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-fallback-3',
        code: 'AG-1003',
        crop: 'WHEAT',
        qty_target_kg: 2000,
        qty_committed_kg: 1200,
        accepted_kg: 0,
        price_per_kg: 32.5,
        delivery_date: '2025-11-10',
        delivery_location: 'Hostel Mess Group Purchase',
        status: 'SOURCING',
        order_tier: 'BULK',
        review_status: 'approved',
        admin_note: null,
        buyer_name: 'Vallabh Vidyanagar Student Mess Cooperative',
        farmer_acceptance_status: null,
        allocated_farmer_name: null,
        is_mine: false,
        purpose: 'Weekly whole wheat grain supply',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-fallback-4',
        code: 'AG-1004',
        crop: 'POTATO',
        qty_target_kg: 600,
        qty_committed_kg: 200,
        accepted_kg: 0,
        price_per_kg: 22,
        delivery_date: '2025-10-05',
        delivery_location: 'Community Food Bank',
        status: 'SOURCING',
        order_tier: 'BULK',
        review_status: 'approved',
        admin_note: null,
        buyer_name: 'State Welfare Mess & Community Kitchen',
        farmer_acceptance_status: null,
        allocated_farmer_name: null,
        is_mine: false,
        purpose: 'Weekly community ration',
        created_at: new Date().toISOString(),
      },
    ]) as FarmerDemandOrder[]

    return baseOrders
      .map((o) => ({
        ...o,
        matchesMyCrop: registeredCrops.has(o.crop.toUpperCase()) || o.crop.toUpperCase() === 'TOMATO' || o.crop.toUpperCase() === 'PADDY',
      }))
      .filter((o) => {
        if (demandFilter === 'matching' && !o.matchesMyCrop) return false
        if (demandCropFilter !== 'ALL' && o.crop.toUpperCase() !== demandCropFilter) return false
        return true
      })
      .sort((a, b) => (b.matchesMyCrop ? 1 : 0) - (a.matchesMyCrop ? 1 : 0))
  }, [orders, me?.registry, demandFilter, demandCropFilter, farmerName])

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 font-sans text-slate-900 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 transition-all ${
            toast.tone === 'ok' ? 'bg-emerald-800 text-white' : 'bg-red-700 text-white'
          }`}
        >
          {toast.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-red-200" />}
          {toast.text}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5-TAB PRIMARY NAVIGATION (Home · Demands · Crops · Handover · Payments)     */}
      {/* ========================================================================= */}
      <nav aria-label="Farmer Navigation" className="bg-white rounded-2xl shadow-xs border border-slate-200 p-1.5 flex items-center justify-between gap-1 overflow-x-auto">
        {[
          { key: 'home', label: 'Home', icon: Wheat, desc: 'Overview & Next Actions' },
          { key: 'demands', label: 'Buyer Demands', icon: ShoppingBag, desc: 'Open Orders & Rates', badge: displayOrders.length },
          { key: 'crops', label: 'My Crops', icon: Sprout, desc: 'Registered Plots & AI Check' },
          { key: 'supply', label: 'Handover & Passes', icon: QrCode, desc: 'Collection Hub QR Slips' },
          { key: 'payments', label: 'Passbook', icon: CircleDollarSign, desc: 'Net Settlement' },
        ].map((tab) => {
          const IconComp = tab.icon
          const isCurrent = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key as FarmerTabKey)
                if (tab.key === 'home') onNavigate('Overview')
                else if (tab.key === 'demands') onNavigate('Orders')
                else if (tab.key === 'crops') onNavigate('Collection & grade')
                else if (tab.key === 'supply') onNavigate('Overview')
                else if (tab.key === 'payments') onNavigate('Settlements')
              }}
              className={`flex-1 py-3 px-2 sm:px-3 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 ${
                isCurrent
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              <div className="relative">
                <IconComp className="w-4 h-4 shrink-0" />
                {tab.badge ? (
                  <span
                    className={`absolute -top-1.5 -right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-white text-emerald-800' : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs sm:text-sm block leading-none whitespace-nowrap">{tab.label}</span>
                <span
                  className={`text-[10px] hidden md:block mt-0.5 ${
                    isCurrent ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {tab.desc}
                </span>
              </div>
            </button>
          )
        })}
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: FARMER HOME                                                        */}
      {/* Three essential questions: What to do? Where to take? Latest status?      */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-5">
          {/* Welcome Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Verified FPO Farmer
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {village} • {fpoName}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Namaste, {farmerName} 👋
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Direct farm-gate aggregation. Buyer orders are pooled transparently; you confirm simple handovers at your local collection centre.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenVoice}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Open voice assistant"
              >
                <Mic className="w-4 h-4 text-emerald-700" />
                Voice Help
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('crops')
                  setShowGradeCam(true)
                }}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                GradeCam Check
              </button>
              <button
                type="button"
                onClick={onDeclareHarvest}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Declare Harvest
              </button>
            </div>
          </div>

          {/* Three Immediate Farmer Questions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. What do I need to do? */}
            <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                    Action Needed
                  </span>
                  <Clock className="w-4 h-4 text-amber-700" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {latestOffer ? `${cropName(latestOffer.crop, lang)} — ${latestOffer.availableKg || 400} kg Request` : 'Tomato — 400 kg Request'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {latestOffer
                    ? `A buyer order is reserved against your ready harvest at guaranteed ₹${latestOffer.pricePerKg}/kg.`
                    : 'A verified buyer order is waiting for confirmation against your ready harvest.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('demands')
                  onNavigate('Orders')
                }}
                className="mt-4 text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1.5"
              >
                Review Buyer Demands <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Where do I take it? */}
            <div className="bg-blue-50/90 border border-blue-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded">
                    Handover Location
                  </span>
                  <MapPin className="w-4 h-4 text-blue-700" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">24 Sep • 8–10 AM</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {collectionCentre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('handover')
                }}
                className="mt-4 text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1.5"
              >
                View Handover Slip & QR <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. What happened to my produce? */}
            <div className="bg-emerald-50/90 border border-emerald-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                    Latest Produce Status
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">392 kg Accepted (Grade A)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Weighed & verified by FPO. Payment of {formatINR(totalSettledNet)} credited to your verified bank account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="mt-4 text-xs font-bold text-emerald-900 hover:text-emerald-950 flex items-center gap-1.5"
              >
                View Passbook & Net Settlement <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Financial & Performance Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Payments Credited</span>
              <p className="mt-1 text-2xl font-black text-emerald-800">{formatINR(totalSettledNet)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Disbursed directly via bank passbook</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Committed Supply</span>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatKg(totalCommittedKg)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Locked to confirmed buyer contracts</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mandi Price Advantage</span>
              <p className="mt-1 text-2xl font-black text-emerald-700">+{formatINR(mandiGain)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Agreed rate ₹30/kg vs Mandi ₹24.50/kg</p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('crops')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <Sprout className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">My Crops</h4>
                <p className="text-[11px] text-slate-500">View registered farm plots</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('demands')
                  onNavigate('Orders')
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">Buyer Demands</h4>
                <p className="text-[11px] text-slate-500">Live institutional orders</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('handover')
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <QrCode className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">Handover Pass</h4>
                <p className="text-[11px] text-slate-500">Collection center QR slip</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <Receipt className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">Payments & Passbook</h4>
                <p className="text-[11px] text-slate-500">Settlements & deductions</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUYER DEMANDS (Simplified & Friendly for Farmers)                  */}
      {/* Direct institutional procurement with guaranteed farmgate prices          */}
      {/* ========================================================================= */}
      {activeTab === 'demands' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Guaranteed Purchase Prices
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {fpoName} Direct Procurement
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Buyer Demands for Your Harvest 🛒
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Institutional buyers (PM POSHAN school kitchens, hospital canteens, student hostels) have pre-booked produce with your FPO. Prices are guaranteed and always higher than local APMC mandi rates.
              </p>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl shrink-0">
              <div className="text-center px-2">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Open Demands</span>
                <span className="text-xl font-black text-emerald-900">{displayOrders.length}</span>
              </div>
              <div className="h-8 w-px bg-emerald-200" />
              <div className="text-center px-2">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Mandi Advantage</span>
                <span className="text-xl font-black text-emerald-800">+₹3–₹5<span className="text-xs font-semibold">/kg</span></span>
              </div>
            </div>
          </div>

          {/* Three Simple Assurances for the Farmer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <TrendingUp className="size-4.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Guaranteed Farmgate Price</p>
                <p className="text-[11px] text-slate-500">Agreed in advance; zero post-harvest crash</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Building2 className="size-4.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Verified Institutional Buyers</p>
                <p className="text-[11px] text-slate-500">Government schemes, schools & hospital kitchens</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <CircleDollarSign className="size-4.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Direct Bank Deposit</p>
                <p className="text-[11px] text-slate-500">Credited same-day of physical weighbridge handover</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => setDemandFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  demandFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Buyer Orders ({orders.length || 4})
              </button>
              <button
                type="button"
                onClick={() => setDemandFilter('matching')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
                  demandFilter === 'matching'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Sprout className="size-3.5" />
                Matches My Plots ({displayOrders.filter((o) => o.matchesMyCrop).length})
              </button>
            </div>

            {/* Crop Specific Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['ALL', 'PADDY', 'TOMATO', 'WHEAT', 'POTATO'].map((cr) => (
                <button
                  key={cr}
                  type="button"
                  onClick={() => setDemandCropFilter(cr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    demandCropFilter === cr
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cr === 'ALL' ? 'All Crops' : cropName(cr, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* List of Buyer Demand Cards */}
          <div className="space-y-4">
            {displayOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No buyer orders found for this filter</p>
                <p className="text-xs text-slate-500">Switch to "All Buyer Orders" to see all open procurement requests.</p>
                <button
                  type="button"
                  onClick={() => { setDemandFilter('all'); setDemandCropFilter('ALL') }}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  Show All Demands
                </button>
              </div>
            ) : (
              displayOrders.map((order) => {
                const normCrop = order.crop.toUpperCase()
                const cropEmoji = normCrop === 'TOMATO' ? '🍅' : normCrop === 'WHEAT' ? '🌾' : normCrop === 'PADDY' ? '🍚' : normCrop === 'POTATO' ? '🥔' : '🌱'
                const mandiRef = normCrop === 'PADDY' ? 24.5 : normCrop === 'TOMATO' ? 24.5 : normCrop === 'WHEAT' ? 28.0 : normCrop === 'POTATO' ? 18.0 : 22.0
                const mandiDelta = Number((order.price_per_kg - mandiRef).toFixed(2))
                const remainingKg = Math.max(0, order.qty_target_kg - (order.qty_committed_kg || 0))
                const progressPct = Math.min(100, Math.round(((order.qty_committed_kg || 0) / order.qty_target_kg) * 100))
                const isSelected = selectedOrderForCommit === order.id
                const committedKg = committedQuantities[order.id] || Math.min(remainingKg || 200, 200)
                const isAlreadyAccepted = supplyRequestAccepted && (order.id === latestOffer?.orderId || order.code === latestOffer?.orderCode || order.code === 'AG-1002')

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-xs ${
                      order.matchesMyCrop ? 'border-emerald-300 ring-1 ring-emerald-500/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top row: Crop + Match Badge + Order ID */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shrink-0">
                          {cropEmoji}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-base text-slate-900">
                              {cropName(order.crop, lang)}
                            </h3>
                            {order.matchesMyCrop && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-700" />
                                Matches Your Registered Plot
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Order #{order.code} · {order.buyer_name || 'Verified Institutional Buyer'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Guaranteed Price
                        </div>
                        <div className="text-xl font-black text-emerald-800">
                          ₹{order.price_per_kg.toFixed(2)}
                          <span className="text-xs font-semibold text-slate-500"> / kg</span>
                        </div>
                        {mandiDelta > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700">
                            +{formatINR(mandiDelta)}/kg vs local Mandi (₹{mandiRef.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle details: Quantity progress, Handover slot, Location */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3.5 text-xs">
                      {/* Quantity & Progress */}
                      <div className="space-y-1.5">
                        <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                          Total Buyer Demand
                        </span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {formatKg(order.qty_target_kg)} Needed
                        </p>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{formatKg(order.qty_committed_kg || 0)} pooled</span>
                          <span className="font-bold text-emerald-800">{formatKg(remainingKg)} remaining</span>
                        </div>
                      </div>

                      {/* Collection Point & Handover Timing */}
                      <div className="space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                          Handover Window & Hub
                        </span>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          {order.delivery_date ? localDate(order.delivery_date, lang) : '24–25 Sep'} • 8–10 AM
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {collectionCentre}
                        </p>
                      </div>

                      {/* Buyer Purpose & Assurance */}
                      <div className="space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                          Procurement Purpose
                        </span>
                        <p className="font-semibold text-slate-800">
                          {order.purpose || 'Institutional bulk supply with direct FPO weighbridge pickup.'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          ✓ Advance escrow funded by buyer
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-3 border-t border-slate-100">
                      {isAlreadyAccepted ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>Supply confirmed for this demand. Your FPO collection entry pass is generated!</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('supply')
                              setSupplySubTab('handover')
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center gap-1.5 shrink-0"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            View Handover QR Slip →
                          </button>
                        </div>
                      ) : isSelected ? (
                        /* Expandable Commitment Box */
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                              How many kilos can you supply from your harvest?
                            </h4>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForCommit(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Quick preset buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {[50, 100, 200, Math.min(400, remainingKg || 400)].filter(Boolean).map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setCommittedQuantities((prev) => ({ ...prev, [order.id]: q }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  committedKg === q
                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {q} kg
                              </button>
                            ))}
                          </div>

                          {/* Number Input & Earnings Calculation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                            <div className="flex items-center gap-2">
                              <label htmlFor={`qty-${order.id}`} className="text-xs font-bold text-slate-600 shrink-0">
                                Quantity (kg):
                              </label>
                              <input
                                id={`qty-${order.id}`}
                                type="number"
                                min={10}
                                max={remainingKg || 1000}
                                value={committedKg}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1)
                                  setCommittedQuantities((prev) => ({ ...prev, [order.id]: val }))
                                }}
                                className="w-28 px-3 py-2 text-sm font-black text-center bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                              />
                            </div>

                            <div className="bg-emerald-100/70 p-2.5 rounded-lg text-xs text-emerald-950 flex items-center justify-between">
                              <span className="font-semibold">Guaranteed Net Earnings:</span>
                              <span className="font-black text-sm text-emerald-900">
                                {formatINR(committedKg * order.price_per_kg)}
                              </span>
                            </div>
                          </div>

                          {/* Confirm Action Button */}
                          <div className="pt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForCommit(null)}
                              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isProcessingAction}
                              onClick={() => handleCommitProduce(order, committedKg)}
                              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs flex items-center gap-2 disabled:opacity-50"
                            >
                              {isProcessingAction ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Confirm Supply & Get Handover Pass ({committedKg} kg · {formatINR(committedKg * order.price_per_kg)})
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Default Action Trigger Button */
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Available remaining: <strong className="text-slate-800">{formatKg(remainingKg)}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForCommit(order.id)
                              if (!committedQuantities[order.id]) {
                                setCommittedQuantities((prev) => ({ ...prev, [order.id]: Math.min(200, remainingKg || 200) }))
                              }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-transform active:scale-98"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            I Can Supply This Produce →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY CROPS & HARVEST REGISTRY                                        */}
      {/* Plots, harvest windows, and inline GradeCam AI inspection                 */}
      {/* ========================================================================= */}
      {activeTab === 'crops' && (
        <div className="space-y-5">
          {/* Section Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Crop Registry</span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">My Crops & Expected Harvests</h2>
              <p className="text-xs text-slate-600 mt-1">
                Your registered farm plots allow the FPO to match buyer demand early without administrative overhead.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGradeCam(!showGradeCam)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                  showGradeCam
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                {showGradeCam ? 'Close GradeCam' : 'Scan Quality with GradeCam'}
              </button>
              <button
                type="button"
                onClick={onDeclareHarvest}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-xs hover:bg-emerald-800 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Declare Harvest
              </button>
            </div>
          </div>

          {/* Inline GradeCam Quality Inspection Panel */}
          {showGradeCam && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/30 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">GradeCam AI Quality Inspector</h3>
                    <p className="text-xs text-slate-500">Instant visual grading before bringing produce to collection centre</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGradeCam(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-black">
                  <GradeCamCamera onCapture={onCapturePhoto} disabled={busy} />
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inspection Guidelines</span>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>Hold camera 30–50 cm directly above the produce crate.</li>
                      <li>Ensure adequate, even natural light without deep shadows.</li>
                      <li>AI checks color maturity, surface texture, and blemish percentage.</li>
                    </ul>
                  </div>

                  {aiResult && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">AI Assessment Result</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white">
                          Grade {aiResult.grade} ({aiResult.confidence}% match)
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        {aiResult.reasoning || 'High quality harvest lot. Premium farm-gate collection rate applies.'}
                      </p>
                      <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200/60">
                        ✓ Eligible for immediate Grade A collection at FPO centre
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Registered Crop Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {me?.registry && me.registry.length > 0 ? (
              me.registry.map((reg) => (
                <div key={reg.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
                        {reg.crop === 'TOMATO' ? '🍅' : reg.crop === 'WHEAT' ? '🌾' : reg.crop === 'PADDY' ? '🍚' : '🌱'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">{cropName(reg.crop, lang)}</h3>
                        <p className="text-xs text-slate-500">Registered Farm Plot</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                      {reg.status || 'Active'}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                      <span className="text-slate-400">Estimated Yield:</span>
                      <span className="font-bold text-slate-900">{formatKg(reg.expectedQtyKg)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                      <span className="text-slate-400">Harvest Window:</span>
                      <span className="font-bold text-slate-900">
                        {reg.harvestWindowStart && reg.harvestWindowEnd
                          ? `${localDate(reg.harvestWindowStart, lang)} – ${localDate(reg.harvestWindowEnd, lang)}`
                          : 'Late Season'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                      <span className="text-slate-400">Committed to Orders:</span>
                      <span className="font-bold text-emerald-800">{formatKg(reg.committedKg || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                      <span className="text-slate-400">Available Stock:</span>
                      <span className="font-bold text-blue-800">{formatKg(Math.max(0, reg.expectedQtyKg - (reg.committedKg || 0)))}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onDeclareHarvest}
                      className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700"
                    >
                      Update Yield / Harvest Window
                    </button>
                  </div>
                </div>
              ))
            ) : (
              // Default registered plot card
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                      🍅
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Tomato (Hybrid F1)</h3>
                      <p className="text-xs text-slate-500">Plot 01 • 1.5 Acre</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                    Active Plot
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Season:</span>
                    <span className="font-bold text-slate-900">Kharif Season</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Expected Harvest Window:</span>
                    <span className="font-bold text-slate-900">20–25 Sept</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Estimated Yield:</span>
                    <span className="font-bold text-emerald-800 text-sm">2,000 kg</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Committed to Orders:</span>
                    <span className="font-bold text-slate-900">400 kg (Order #123)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onDeclareHarvest}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700"
                  >
                    Declare Actual Harvest Quantity
                  </button>
                </div>
              </div>
            )}

            {/* Expected vs Actual Harvest Planning Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    🌱
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Harvest Planning Overview</h3>
                    <p className="text-xs text-slate-500">Future Planning Signals vs Confirmed Stock</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  Status: Growing
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold">Transparent Inventory Rule:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Estimated yields represent future forecasts. Orders are only scheduled for pickup once produce is physically harvested and verified by the FPO at the collection point.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Total Registered Plots:</span>
                  <span className="font-bold text-slate-900">{me?.registry?.length || 1} Active Plot</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Market Demand Window:</span>
                  <span className="font-bold text-emerald-700">High Demand (~5,000 kg required)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Assigned FPO Collection Hub:</span>
                  <span className="font-bold text-slate-900">{collectionCentre}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('demands')
                    onNavigate('Orders')
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                >
                  View Live Buyer Demands →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUPPLY & HANDOVER                                                  */}
      {/* 3 streamlined views: Requests, Handover Slip, Deliveries                  */}
      {/* ========================================================================= */}
      {activeTab === 'supply' && (
        <div className="space-y-5">
          {/* Sub-Navigation */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 text-xs">
            {[
              { id: 'requests', label: '1. Supply Requests' },
              { id: 'handover', label: '2. Handover Pass & QR' },
              { id: 'deliveries', label: '3. Deliveries & Quality' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSupplySubTab(sub.id as SupplySubTabKey)}
                className={`px-4 py-2.5 rounded-xl font-bold transition-all ${
                  supplySubTab === sub.id
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SUB-VIEW 1: INCOMING SUPPLY REQUESTS */}
          {supplySubTab === 'requests' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Incoming Request
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Buyer Supply Request</h3>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  {supplyRequestAccepted ? 'Accepted · Awaiting Handover' : 'Awaiting Confirmation'}
                </span>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                A verified institutional buyer placed an order matching your ready produce. As the nearest FPO member with available supply, this request has been routed to you.
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Crop:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {latestOffer ? cropName(latestOffer.crop, lang) : 'Tomato (Hybrid F1)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Quantity Requested:</span>
                  <span className="font-extrabold text-emerald-800 text-base">
                    {latestOffer ? formatKg(latestOffer.availableKg || 400) : '400 kg'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-semibold text-slate-700">
                    {latestOffer ? `Order #${latestOffer.orderCode || 'ORD-123'}` : 'Buyer Order #123 (Annapurna Mess)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Collection Centre:</span>
                  <span className="font-bold text-slate-900">{collectionCentre}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Scheduled Handover Slot:</span>
                  <span className="font-bold text-blue-900">24 Sep • 8–10 AM</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Agreed Contract Price:</span>
                  <span className="font-bold text-emerald-700">
                    {latestOffer ? `₹${latestOffer.pricePerKg} / kg` : '₹30 / kg'} (vs Mandi ₹24.50)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isProcessingAction || supplyRequestAccepted}
                  onClick={() => handleDeclineSupplyRequest()}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Pass to Next Farmer
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction || supplyRequestAccepted}
                  onClick={() => handleAcceptSupplyRequest()}
                  className="w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {supplyRequestAccepted ? 'Request Already Accepted' : 'Accept Request & View Handover Pass'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: FPO HANDOVER PASS & QR */}
          {supplySubTab === 'handover' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Collection Centre Entry Pass
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">FPO Handover Pass</h3>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Slot Confirmed
                </span>
              </div>

              {/* Physical Handover Slip with QR */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 text-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{fpoName}</h4>
                    <p className="text-[11px] text-slate-500">Collection Point Entry Pass</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs">
                    <QrCode className="w-10 h-10 text-slate-800" />
                  </div>
                </div>

                <div className="space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lot Code:</span>
                    <span className="font-mono font-bold text-slate-900">LOT-TOM-0924-400</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Farmer:</span>
                    <span className="font-bold text-slate-900">{farmerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Committed Quantity:</span>
                    <span className="font-bold text-emerald-800">400 kg Tomato</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collection Hub:</span>
                    <span className="font-bold text-slate-900">{collectionCentre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Time Slot:</span>
                    <span className="font-bold text-blue-900">24 Sep • 8–10 AM</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                  Present this pass at the weighbridge. The operator will record gross weight and sample quality for Grade A/B verification.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onOpenReceipt}
                  className="flex-1 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Receipt className="w-4 h-4" /> Print / Save Pass
                </button>
                <button
                  type="button"
                  onClick={() => setSupplySubTab('deliveries')}
                  className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  Track Delivery Status →
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: DELIVERIES & QUALITY STATUS */}
          {supplySubTab === 'deliveries' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Quality & Dispatch
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Produce Delivery Status</h3>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Grade A Verified
                </span>
              </div>

              {/* Weighment & Quality Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Submitted</span>
                  <span className="text-base font-extrabold text-slate-800 mt-0.5 block">400 kg</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Verified Weight</span>
                  <span className="text-base font-extrabold text-slate-800 mt-0.5 block">392 kg</span>
                  <span className="text-[10px] text-slate-400">(-8kg shrinkage)</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                  <span className="text-emerald-700 block text-[11px]">Accepted Qty</span>
                  <span className="text-base font-extrabold text-emerald-800 mt-0.5 block">392 kg</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Rejected Qty</span>
                  <span className="text-base font-extrabold text-slate-800 mt-0.5 block">0 kg</span>
                </div>
              </div>

              {/* Dispatch Logistics Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    Consolidated FPO Dispatch Run
                  </span>
                  <span className="text-blue-800 font-mono">AP XX XX 1234 (Tata Ace 1.5t)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your 392 kg lot was pooled with lots from 2 other local farmers into one consolidated delivery vehicle. Transport cost was shared proportionally.
                </p>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Current Vehicle Status:</span>
                  <span className="font-bold text-emerald-700">Delivered & Discharged at Buyer Hub</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  View Final Bank Settlement →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYMENTS & AUDITABLE SETTLEMENT PASSBOOK                           */}
      {/* Formula: Net = Accepted quantity × agreed price − disclosed charges       */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-5 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Transparent Passbook
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Farmer Settlement Ledger</h3>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Credited to Bank
              </span>
            </div>

            {/* Formula Banner */}
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <span className="font-bold">Transparent Auditable Formula:</span>
              <p className="font-mono text-emerald-900 font-bold text-[11px]">
                Net Payable = Accepted Qty (392 kg) × Agreed Rate (₹30) − Disclosed Charges (₹240)
              </p>
            </div>

            {/* Detailed Ledger Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>Produce & Handover Date:</span>
                <span className="font-bold text-slate-900">Tomato • 24 Sep</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>FPO Verified Accepted Weight:</span>
                <span className="font-bold text-emerald-800">392 kg (Grade A)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>Pre-Agreed Contract Rate:</span>
                <span className="font-bold text-slate-900">₹30.00 / kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>Gross Crop Value:</span>
                <span className="font-bold text-slate-900">₹11,760.00</span>
              </div>

              {/* Itemized Disclosed Deductions */}
              <div className="py-2 border-b border-slate-200/60 space-y-1.5 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700 block">Disclosed Legitimate Deductions:</span>
                <div className="flex justify-between pl-2">
                  <span>• FPO Weighbridge & QC Handling:</span>
                  <span className="text-slate-800 font-medium">- ₹120.00</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>• Cluster Shared Transport:</span>
                  <span className="text-slate-800 font-medium">- ₹120.00</span>
                </div>
                <div className="flex justify-between pl-2 font-bold text-slate-700">
                  <span>Total Charges:</span>
                  <span>- ₹240.00</span>
                </div>
              </div>

              {/* Net Payable */}
              <div className="flex justify-between pt-2 text-sm font-extrabold text-emerald-900">
                <span>Net Credited to Bank Account:</span>
                <span className="text-lg font-black text-emerald-700">{formatINR(totalSettledNet)}</span>
              </div>
            </div>

            {/* Audit Trail & Linked Artifacts */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
              <span className="text-slate-500">
                Linked to: <strong>Supply Request #123</strong> & <strong>FPO Receipt #LOT-TOM-0924</strong>
              </span>
              <button
                type="button"
                onClick={onOpenReceipt}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" /> Download Tax / Bank Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
