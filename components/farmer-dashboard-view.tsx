'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  Minus,
  Phone,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Tag,
  TrendingUp,
  Truck,
  User,
  Wheat,
  X,
} from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import { Language } from '@/lib/i18n'
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

type FarmerTabKey = 'home' | 'crops' | 'supply' | 'payments'
type SupplySubTabKey = 'demand' | 'produce' | 'request' | 'handover' | 'accepted' | 'logistics'

export function FarmerDashboardView({
  currentUserName,
  lang,
  onNavigate,
  onDeclareHarvest,
  onOpenVoice,
  onOpenReceipt,
  onRedistributeExcess,
  onCapturePhoto,
  aiResult,
  busy,
}: FarmerDashboardViewProps) {
  // Primary 4-Tab Navigation
  const [activeTab, setActiveTab] = useState<FarmerTabKey>('home')
  const [supplySubTab, setSupplySubTab] = useState<SupplySubTabKey>('request')

  // Real data state from database
  const [me, setMe] = useState<FarmerOverview | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const [supplyRequestAccepted, setSupplyRequestAccepted] = useState(false)

  // Produce Batch state (Screen 5)
  const [batchActualHarvest, setBatchActualHarvest] = useState(1500)
  const [batchOffered, setBatchOffered] = useState(1200)

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
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [load])

  const flash = (tone: 'ok' | 'error', text: string) => {
    setToast({ tone, text })
    setTimeout(() => setToast(null), 5000)
  }

  const farmerName = me?.farmer?.name || currentUserName || 'Ravi Kumar'
  const fpoName = me?.fpo?.name || 'Mahi Valley Farmer Producer Co. Ltd'
  const collectionCentre = `${fpoName} - Collection Centre #1`

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-slate-900 pb-16">
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
      {/* 4-TAB PRIMARY NAVIGATION (Home · Crops · Supply · Payments)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex items-center justify-between gap-1">
        {[
          { key: 'home', label: 'Home', icon: Wheat, desc: 'Next Actions & Status' },
          { key: 'crops', label: 'My Crops', icon: Sprout, desc: 'Registry & Expected' },
          { key: 'supply', label: 'Supply & FPO', icon: ShoppingBag, desc: 'Requests, Produce & Handover' },
          { key: 'payments', label: 'Payments', icon: CircleDollarSign, desc: 'Passbook & Net Settlement' },
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
                else if (tab.key === 'crops') onNavigate('Overview')
                else if (tab.key === 'supply') onNavigate('Orders')
                else if (tab.key === 'payments') onNavigate('Settlements')
              }}
              className={`flex-1 py-3 px-3 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                isCurrent
                  ? 'bg-emerald-700 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              <IconComp className="w-4 h-4 shrink-0" />
              <div className="text-center sm:text-left">
                <span className="text-xs sm:text-sm block leading-none">{tab.label}</span>
                <span
                  className={`text-[10px] hidden md:block mt-0.5 ${
                    isCurrent ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  {tab.desc}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SCREEN 1 — FARMER HOME                                            */}
      {/* Answers: What do I need to do? Where do I take it? What happened?         */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-5">
          {/* Welcome Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Verified FPO Member
                </span>
                <span className="text-xs text-slate-500">{fpoName}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                Namaste, {farmerName} 👋
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Transparent direct farm-gate collection. The platform coordinates buyers and logistics; you only fulfill simple handovers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenVoice}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Mic className="w-4 h-4 text-emerald-700" />
                Voice Help
              </button>
              <button
                type="button"
                onClick={onDeclareHarvest}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Declare Harvest
              </button>
            </div>
          </div>

          {/* Three Immediate Questions Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. What do I need to do? */}
            <div className="bg-amber-50/80 border-2 border-amber-300 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                  Action Required
                </span>
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Tomato — 400 kg Request</h3>
              <p className="text-xs text-slate-600 mt-1">
                A buyer order has been reserved against your offered crop. Bring 400 kg to FPO.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('request')
                }}
                className="mt-3 text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
              >
                Open Supply Request <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Where do I take it? */}
            <div className="bg-blue-50/80 border-2 border-blue-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-blue-200 px-2 py-0.5 rounded">
                  Handover Location
                </span>
                <MapPin className="w-4 h-4 text-blue-700" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">24 Sep • 8–10 AM</h3>
              <p className="text-xs text-slate-600 mt-1">
                {collectionCentre}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('handover')
                }}
                className="mt-3 text-xs font-bold text-blue-900 hover:underline flex items-center gap-1"
              >
                View Handover Slip & QR <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. What happened to my produce? */}
            <div className="bg-emerald-50/80 border-2 border-emerald-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                  Latest Produce Status
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">392 kg Accepted (Grade A)</h3>
              <p className="text-xs text-slate-600 mt-1">
                Weighed & verified by FPO. Payment of ₹11,520 processing to your bank account.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="mt-3 text-xs font-bold text-emerald-900 hover:underline flex items-center gap-1"
              >
                View Passbook & Net Settlement <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('crops')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <Sprout className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">My Crops</h4>
                <p className="text-[11px] text-slate-500">Plot 01 • Kharif Tomato</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('demand')
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">Upcoming Demand</h4>
                <p className="text-[11px] text-slate-500">~5,000 kg High Demand</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSupplySubTab('produce')
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <Wheat className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">My Produce</h4>
                <p className="text-[11px] text-slate-500">1,200 kg Offered for Sale</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors"
              >
                <Receipt className="w-5 h-5 text-emerald-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-900">Payments & Passbook</h4>
                <p className="text-[11px] text-slate-500">₹11,520 Net Settlement</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCREENS 2 & 3 — CROP REGISTRY & EXPECTED HARVEST                  */}
      {/* Purpose: Future supply planning without administrative burden             */}
      {/* ========================================================================= */}
      {activeTab === 'crops' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Planning Signal</span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">Crop Registry & Expected Harvest</h2>
              <p className="text-xs text-slate-600 mt-1">
                Tell the platform what is growing in your fields so it can compare with upcoming demand forecasts.
              </p>
            </div>
            <button
              type="button"
              onClick={onDeclareHarvest}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-sm hover:bg-emerald-800 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Plot Crop
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Screen 2: Crop Registry Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                    🍅
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Crop Registry (Plot 01)</h3>
                    <p className="text-xs text-slate-500">Registered Farm Plot Record</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Active Plot
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Crop:</span>
                  <span className="font-bold text-slate-900">Tomato (Hybrid F1)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Farm / Plot:</span>
                  <span className="font-bold text-slate-900">Plot 01 • 1.5 Acre</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Season:</span>
                  <span className="font-bold text-slate-900">Kharif / Local Season</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Expected Harvest Window:</span>
                  <span className="font-bold text-slate-900">20–25 Sept</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Expected Quantity:</span>
                  <span className="font-bold text-emerald-800 text-sm">2,000 kg</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => flash('ok', 'Crop plot details updated in FPO registry.')}
                  className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700"
                >
                  Save / Edit Crop Record
                </button>
              </div>
            </div>

            {/* Screen 3: Expected Harvest Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    🌱
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Expected Harvest Signal</h3>
                    <p className="text-xs text-slate-500">Future Estimate — Not Stock</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  Status: Growing
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold">Important Difference:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Expected quantity (2,000 kg) is a <strong>future planning estimate</strong>, not confirmed inventory.
                  No buyer orders can be fulfilled until actual produce is harvested and verified by the FPO.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Estimated Yield:</span>
                  <span className="font-bold text-slate-900">2,000 kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Expected Window:</span>
                  <span className="font-bold text-slate-900">20–25 Sept (5 Days)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 text-slate-600">
                  <span className="text-slate-400">Demand Signal Overlap:</span>
                  <span className="font-bold text-emerald-700">High Demand Window (~5,000 kg needed)</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('supply')
                    setSupplySubTab('produce')
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm"
                >
                  Record Actual Harvest →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUPPLY & FPO (Screens 4 to 9)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'supply' && (
        <div className="space-y-5">
          {/* Sub-Navigation Bar for Supply Screens */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'request', label: '1. Supply Request (Screen 6)' },
              { id: 'produce', label: '2. My Produce / Available (Screen 5)' },
              { id: 'demand', label: '3. Upcoming Demand (Screen 4)' },
              { id: 'handover', label: '4. FPO Handover (Screen 7)' },
              { id: 'accepted', label: '5. Accepted Produce (Screen 8)' },
              { id: 'logistics', label: '6. Logistics Status (Screen 9)' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSupplySubTab(sub.id as SupplySubTabKey)}
                className={`px-3 py-2 rounded-xl font-bold transition-all ${
                  supplySubTab === sub.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 6: SUPPLY REQUEST (Replaces Allocation/Commitment)             */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'request' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 6 · Incoming Request
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Supply Request</h3>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  {supplyRequestAccepted ? 'Accepted · Awaiting Handover' : 'Awaiting Handover Confirmation'}
                </span>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                A buyer placed an order matching your ready harvest. You are the nearest member with ready crop supply.
                Please confirm if you can bring this lot to the FPO.
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Crop:</span>
                  <span className="font-extrabold text-slate-900 text-sm">Tomato</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Quantity Requested:</span>
                  <span className="font-extrabold text-emerald-800 text-base">400 kg</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-semibold text-slate-700">Buyer Order #123 (Annapurna Mess)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Bring Produce To:</span>
                  <span className="font-bold text-slate-900">{collectionCentre}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Handover Date / Time:</span>
                  <span className="font-bold text-blue-900">24 Sep • 8–10 AM</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Agreed Guaranteed Price:</span>
                  <span className="font-bold text-emerald-700">₹30 / kg (vs Mandi ₹24.50)</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => flash('ok', 'Request declined. Automatically routed to next nearest FPO member.')}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Pass to Next Farmer
                </button>

                <button
                  type="button"
                  disabled={supplyRequestAccepted}
                  onClick={() => {
                    setSupplyRequestAccepted(true)
                    flash('ok', 'Supply Request Accepted! Handover pass generated.')
                    setSupplySubTab('handover')
                  }}
                  className="w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {supplyRequestAccepted ? 'Request Already Accepted' : 'Accept Request & View Handover Pass'}
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 5: MY PRODUCE / AVAILABLE SUPPLY (5-Stage Pipeline)             */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'produce' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 5 · Produce Inventory
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">My Produce / Available Supply</h3>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Batch #T2209
                </span>
              </div>

              {/* 5-Stage Visual Progression Pipeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Produce Lifecycle: 5-Stage Progression
                </h4>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { num: 1, title: 'Expected', val: '2,000 kg', sub: 'Growing plot', active: true },
                    { num: 2, title: 'Actual Harvest', val: `${batchActualHarvest} kg`, sub: 'Picked from farm', active: true },
                    { num: 3, title: 'Farmer Offered', val: `${batchOffered} kg`, sub: 'Ready to sell', active: true },
                    { num: 4, title: 'FPO Received', val: '400 kg', sub: 'Handover at hub', active: true },
                    { num: 5, title: 'FPO Accepted', val: '392 kg', sub: 'Grade A verified', active: true },
                  ].map((st) => (
                    <div
                      key={st.num}
                      className={`p-3 rounded-xl border transition-all ${
                        st.active
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] block opacity-70">Stage {st.num}</span>
                      <span className="font-extrabold text-sm block mt-0.5">{st.val}</span>
                      <span className="text-[11px] block mt-0.5">{st.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Produce Batch Breakdown & Double-Selling Prevention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                  <h4 className="font-bold text-slate-900">Current Produce Batch Details</h4>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Actual Harvested:</span>
                    <span className="font-bold text-slate-900">{batchActualHarvest} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Offered for Sale:</span>
                    <span className="font-bold text-emerald-800">{batchOffered} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Committed to Orders:</span>
                    <span className="font-bold text-amber-800">400 kg (Order #123)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Uncommitted Eligible:</span>
                    <span className="font-bold text-blue-800">{batchOffered - 400} kg</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-2 text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Double-Selling Prevention Guard</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-900">
                    Once 400 kg is reserved for Buyer Order #123, only the remaining <strong>{batchOffered - 400} kg</strong> can be considered for another buyer request. The platform never allocates overlapping stock.
                  </p>
                  <p className="text-[11px] font-medium text-blue-800">
                    Status: <span className="font-bold">Awaiting FPO Verification at Collection Centre</span>
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onDeclareHarvest}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-sm"
                >
                  Add / Update Produce Quantities
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 4: UPCOMING DEMAND (Planning Signal)                            */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'demand' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 4 · Demand Forecast
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Upcoming Demand</h3>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Demand: HIGH
                </span>
              </div>

              {/* Regional Demand Forecast Note */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Source:</strong> Forecast inputs are aggregated from regional mandi trends and district historical consumption signals.
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Crop:</span>
                  <span className="font-extrabold text-slate-900">Tomato (Hybrid F1)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Market Demand Level:</span>
                  <span className="font-extrabold text-emerald-700">HIGH (3 Institutional Buyers + 2 Retailers)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Expected Need:</span>
                  <span className="font-extrabold text-slate-900 text-sm">~5,000 kg</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Needed By Window:</span>
                  <span className="font-bold text-slate-900">20–30 Sept</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Supply Signal Match:</span>
                  <span className="font-bold text-emerald-700">Your harvest period overlaps expected demand</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold">Important Notice:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Forecast demand does not equal a confirmed order. Do not commit or harvest produce until you receive a confirmed Supply Request.
                </p>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 7: FPO COLLECTION CENTRE HANDOVER SLIP                          */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'handover' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 7 · Physical Collection
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">FPO Collection Handover</h3>
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
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center">
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
                    <span className="text-slate-400">Collection Center:</span>
                    <span className="font-bold text-slate-900">{collectionCentre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Slot:</span>
                    <span className="font-bold text-blue-900">24 Sep • 8–10 AM</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Present this pass at the weighbridge. The FPO will record gross weight and sample quality for Grade A/B classification.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onOpenReceipt}
                  className="flex-1 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" /> Print / Save Pass
                </button>
                <button
                  type="button"
                  onClick={() => setSupplySubTab('accepted')}
                  className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  View Verified Acceptance →
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 8: ACCEPTED PRODUCE & CLEAR STATUS STATES                      */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'accepted' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 8 · Quality Verification
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Accepted Produce</h3>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Grade A — Accepted
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

              {/* State Transition Matrix Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200">
                  Traceable State Progression & Order Eligibility
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { state: 'Expected Supply', meaning: 'Future estimate (2,000 kg)', canFulfill: 'No' },
                    { state: 'Farmer Available', meaning: 'Actual produce offered (1,200 kg)', canFulfill: 'Not until FPO verification' },
                    { state: 'FPO Received', meaning: 'Physically at weighbridge', canFulfill: 'No' },
                    { state: 'FPO Accepted', meaning: 'Weighed & Grade A verified (392 kg)', canFulfill: 'Yes — Eligible Pool' },
                    { state: 'Committed / Reserved', meaning: 'Locked to Buyer Order #123', canFulfill: 'No for other orders' },
                    { state: 'Dispatched', meaning: 'En route in FPO consolidated truck', canFulfill: 'In transit' },
                    { state: 'Settled', meaning: 'Final payment credited to bank', canFulfill: 'Complete' },
                  ].map((row, idx) => (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between text-slate-600">
                      <div>
                        <span className="font-bold text-slate-900 block">{row.state}</span>
                        <span className="text-[11px] text-slate-500">{row.meaning}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        row.canFulfill.includes('Yes') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.canFulfill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSupplySubTab('logistics')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 shadow-sm flex items-center gap-1.5"
                >
                  Track Consolidated Logistics →
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 9: LOGISTICS REQUEST & STATUS                                  */}
          {/* --------------------------------------------------------------------- */}
          {supplySubTab === 'logistics' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Screen 9 · Dispatch Visibility
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Logistics Status</h3>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> In Transit
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                FPO combined your 392 kg with lots from 2 other local farmers into a single optimized vehicle run.
                (Route algorithms run in backend; farmer sees clean delivery status).
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Stage:</span>
                  <span className="font-bold text-emerald-800">In Transit to Buyer Destination</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">From Collection Point:</span>
                  <span className="font-bold text-slate-900">{collectionCentre}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Consolidated FPO Lot:</span>
                  <span className="font-bold text-slate-900">Tomato • Grade A (1,150 kg Total)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Assigned Vehicle:</span>
                  <span className="font-mono font-bold text-slate-900">AP XX XX 1234 (Tata Ace 1.5t)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Estimated Arrival (ETA):</span>
                  <span className="font-extrabold text-blue-900 text-sm">Today • 4:30 PM</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                >
                  View Payment & Final Settlement →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SCREEN 10 — PAYMENT / PASSBOOK & AUDITABLE SETTLEMENT             */}
      {/* Formula: Net = Accepted quantity × agreed price − disclosed charges       */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-5 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Screen 10 · Transparent Settlement
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Farmer Passbook & Ledger</h3>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settlement Credited
              </span>
            </div>

            {/* Formula Banner */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
              <span className="font-bold">Transparent Settlement Formula:</span>
              <p className="font-mono text-emerald-900 font-bold mt-1 text-[11px]">
                Net Payable = Accepted Qty (392 kg) × Agreed Price (₹30) − Disclosed Legitimate Charges (₹240)
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
                <span>Net Payable to Bank Account:</span>
                <span className="text-lg font-black text-emerald-700">₹11,520.00</span>
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
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
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
