'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  Filter,
  Info,
  Layers,
  Loader2,
  MapPin,
  Mic,
  Package,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
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
import {
  getWorkflowState,
  step1FarmerRequestCollection,
  type WorkflowState,
} from '@/lib/workflow-engine'

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

export type FarmerTabKey =
  | 'home'
  | 'registry'
  | 'demand'
  | 'expected_harvest'
  | 'my_produce'
  | 'handover'
  | 'logistics'
  | 'passbook'
  | 'notifications'

export interface CropRegistryEntry {
  id: string
  crop: string
  area: string
  expectedQtyKg: number
  harvestPeriod: string
  location: string
  status: string
}

export interface ExpectedHarvestEntry {
  id: string
  crop: string
  expectedQtyKg: number
  harvestDate: string
  status: 'Growing' | 'Vegetative' | 'Flowering' | 'Ripening' | 'Ready for Harvest'
  plotLocation: string
}

export interface MyProduceBatch {
  id: string
  crop: string
  declaredQtyKg: number
  harvestDate: string
  collectionStatus: 'Ready for Collection' | 'Collection Requested' | 'Scheduled' | 'Collected'
  verificationStatus: 'Pending Weighbridge' | 'Grade A (GradeCam)' | 'Grade B' | 'Verified'
  notes?: string
}

export interface CollectionHandoverRecord {
  id: string
  requestId: string
  fpoName: string
  collectionCentre: string
  dateTimeSlot: string
  crop: string
  quantityKg: number
  status: 'Requested' | 'Scheduled' | 'Handed Over' | 'Weighed & Verified'
  verifiedGrossKg?: number
  acceptedKg?: number
  grade?: string
}

export interface FarmerNotification {
  id: string
  title: string
  detail: string
  category: 'collection' | 'payment' | 'quality' | 'demand'
  time: string
  unread: boolean
}

export function FarmerDashboardView({
  order: activeOrderProp,
  buyer: activeBuyerProp,
  currentUserName,
  lang,
  activeNav,
  onNavigate,
  onDeclareHarvest,
  onOpenVoice,
  onOpenReceipt,
  onCapturePhoto,
  aiResult,
  busy,
}: FarmerDashboardViewProps) {
  // Primary 9-Tab Navigation:
  // Home · Crop Registry · Upcoming Demand · Expected Harvest · My Produce · Collection/Handover · Logistics Status · Payments/Passbook · Notifications
  const [activeTab, setActiveTab] = useState<FarmerTabKey>('home')

  // Real data state from server
  const [me, setMe] = useState<FarmerOverview | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [wfState, setWfState] = useState<WorkflowState>(() => getWorkflowState())

  // Local interactive states
  const [showGradeCam, setShowGradeCam] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [demandCropFilter, setDemandCropFilter] = useState<string>('ALL')

  // Modals
  const [isRequestCollectionModalOpen, setIsRequestCollectionModalOpen] = useState(false)
  const [isAddPlotModalOpen, setIsAddPlotModalOpen] = useState(false)
  const [selectedBatchForCollection, setSelectedBatchForCollection] = useState<string>('')

  // New Collection Request Form State
  const [collectionFormCrop, setCollectionFormCrop] = useState('TOMATO')
  const [collectionFormQty, setCollectionFormQty] = useState('400')
  const [collectionFormDate, setCollectionFormDate] = useState('2026-09-24')
  const [collectionFormSlot, setCollectionFormSlot] = useState('Morning (8:00 AM – 10:00 AM)')
  const [collectionFormNotes, setCollectionFormNotes] = useState('')

  // New Plot Registration Form State
  const [newPlotCrop, setNewPlotCrop] = useState('TOMATO')
  const [newPlotArea, setNewPlotArea] = useState('1.5 Acres')
  const [newPlotQty, setNewPlotQty] = useState('2000')
  const [newPlotPeriod, setNewPlotPeriod] = useState('20–25 Sep 2026')
  const [newPlotLocation, setNewPlotLocation] = useState('Plot 01 — North Canal')

  // Notification Filter State
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'collection' | 'payment' | 'quality'>('all')

  // Synchronize sidebar navigation with 9 internal farmer tabs
  useEffect(() => {
    if (activeNav === 'Orders') {
      setActiveTab('demand')
    } else if (activeNav === 'Overview') {
      setActiveTab('home')
    } else if (activeNav === 'Collection & grade') {
      setActiveTab('my_produce')
    } else if (activeNav === 'Settlements') {
      setActiveTab('passbook')
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
    setWfState(getWorkflowState())
    const timer = setInterval(load, 15000)

    const handleSync = () => {
      load()
      setWfState(getWorkflowState())
    }
    const handleWfSync = () => {
      setWfState(getWorkflowState())
    }
    window.addEventListener('agrilink:harvest-updated', handleSync)
    window.addEventListener('agrilink:order-created', handleSync)
    window.addEventListener('agrilink:workflow-updated', handleWfSync)

    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = (e) => {
          load()
          if (e.data?.type === 'WORKFLOW_STATE_UPDATED' && e.data?.state) {
            setWfState(e.data.state)
          } else {
            setWfState(getWorkflowState())
          }
        }
      }
    } catch {}

    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:harvest-updated', handleSync)
      window.removeEventListener('agrilink:order-created', handleSync)
      window.removeEventListener('agrilink:workflow-updated', handleWfSync)
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

  // Financial summary numbers
  const totalSettledNet = me?.summary?.settledNet && me.summary.settledNet > 0 ? me.summary.settledNet : 11520
  const mandiGain = me?.summary?.mandiComparison?.gain ?? 2160

  // 1. Crop Registry Initial / Live Data
  const [cropRegistry, setCropRegistry] = useState<CropRegistryEntry[]>([
    {
      id: 'reg-1',
      crop: 'TOMATO',
      area: '1.5 Acres',
      expectedQtyKg: 2000,
      harvestPeriod: '20–25 Sep 2026',
      location: 'Plot 01 — North Canal, Anand Rural',
      status: 'Active Cultivation',
    },
    {
      id: 'reg-2',
      crop: 'PADDY',
      area: '2.0 Acres',
      expectedQtyKg: 3500,
      harvestPeriod: '15–25 Oct 2026',
      location: 'Plot 02 — East Field, Anand Rural',
      status: 'Growing / Vegetative',
    },
  ])

  // 2. Expected Harvest (Planning Data, NOT inventory)
  const [expectedHarvests, setExpectedHarvests] = useState<ExpectedHarvestEntry[]>([
    {
      id: 'exp-1',
      crop: 'TOMATO',
      expectedQtyKg: 2000,
      harvestDate: '20–25 Sep 2026',
      status: 'Ripening',
      plotLocation: 'Plot 01 — North Canal',
    },
    {
      id: 'exp-2',
      crop: 'PADDY',
      expectedQtyKg: 3500,
      harvestDate: '15–25 Oct 2026',
      status: 'Vegetative',
      plotLocation: 'Plot 02 — East Field',
    },
    {
      id: 'exp-3',
      crop: 'WHEAT',
      expectedQtyKg: 1800,
      harvestDate: '10–20 Nov 2026',
      status: 'Growing',
      plotLocation: 'Plot 03 — Tube Well Side',
    },
  ])

  // 3. My Produce (Actual Harvested / Offered Produce)
  const [myProduce, setMyProduce] = useState<MyProduceBatch[]>([
    {
      id: 'prod-1',
      crop: 'TOMATO',
      declaredQtyKg: 400,
      harvestDate: '2026-09-22',
      collectionStatus: 'Scheduled',
      verificationStatus: 'Grade A (GradeCam)',
      notes: 'Picked and graded in 25kg standard crates. Ready at farm gate.',
    },
    {
      id: 'prod-2',
      crop: 'TOMATO',
      declaredQtyKg: 350,
      harvestDate: '2026-09-23',
      collectionStatus: 'Ready for Collection',
      verificationStatus: 'Pending Weighbridge',
      notes: 'Second picking. Clean sorting complete.',
    },
  ])

  // 4. Collection / Handover Records
  const [collectionHandovers, setCollectionHandovers] = useState<CollectionHandoverRecord[]>([
    {
      id: 'col-1',
      requestId: 'REQ-COL-1042',
      fpoName: fpoName,
      collectionCentre: collectionCentre,
      dateTimeSlot: '24 Sep 2026 • 8:00 AM – 10:00 AM',
      crop: 'TOMATO',
      quantityKg: 400,
      status: 'Scheduled',
      verifiedGrossKg: 392,
      acceptedKg: 392,
      grade: 'Grade A',
    },
    {
      id: 'col-2',
      requestId: 'REQ-COL-0918',
      fpoName: fpoName,
      collectionCentre: collectionCentre,
      dateTimeSlot: '15 Sep 2026 • 9:00 AM – 11:00 AM',
      crop: 'POTATO',
      quantityKg: 500,
      status: 'Weighed & Verified',
      verifiedGrossKg: 494,
      acceptedKg: 494,
      grade: 'Grade A',
    },
  ])

  // Dynamically reflect live workflow state in My Produce
  const liveMyProduce: MyProduceBatch[] = useMemo(() => {
    const stage = wfState.stage
    const primaryCol = wfState.collections[0]
    const primaryLot = wfState.lots[0]
    const prod1: MyProduceBatch = {
      id: 'prod-1',
      crop: primaryCol?.crop || 'TOMATO',
      declaredQtyKg: primaryCol?.declaredKg || 400,
      harvestDate: '2026-09-24',
      collectionStatus:
        stage === 1
          ? 'Collection Requested'
          : stage === 2
          ? 'Scheduled'
          : 'Collected',
      verificationStatus:
        stage >= 4
          ? `Grade A (GradeCam) · ${primaryLot?.acceptedKg || 370} kg`
          : stage === 3
          ? `Weighed on Scale (${primaryLot?.scaleKg || 392} kg)`
          : stage === 2
          ? 'Pending Weighbridge'
          : 'Pending Weighbridge',
      notes:
        stage >= 7
          ? 'Delivered & full payment settled: ₹10,860 net credited to SBI A/c ...4920'
          : stage >= 6
          ? 'Consignment dispatched to institutional buyer (300 kg out of 370 kg lot)'
          : stage >= 5
          ? 'Buyer matched: 300 kg reserved by PM POSHAN kitchen (70 kg in hub)'
          : stage >= 4
          ? 'GradeCam AI passed with 94% confidence: 22 kg blemish deduction → 370 kg accepted Grade A'
          : stage >= 3
          ? 'Produce weighed at central weighbridge: 392 kg gross (8 kg shrinkage)'
          : stage >= 2
          ? 'Pickup scheduled for 24 Sep (8–10 AM) via Tata Ace (AP XX XX 1234)'
          : '400 kg declared at farm gate. Ready for FPO collection.',
    }
    return [prod1, ...myProduce.filter((p) => p.id !== 'prod-1')]
  }, [wfState, myProduce])

  // Dynamically reflect live workflow state in Collection / Handover Records
  const liveCollectionHandovers: CollectionHandoverRecord[] = useMemo(() => {
    const stage = wfState.stage
    const primaryCol = wfState.collections[0]
    const primaryLot = wfState.lots[0]
    const col1: CollectionHandoverRecord = {
      id: 'col-1',
      requestId: primaryCol?.requestId || 'REQ-COL-1042',
      fpoName: fpoName,
      collectionCentre: primaryCol?.preferredHub || collectionCentre,
      dateTimeSlot: primaryCol?.scheduledSlot || '24 Sep 2026 • 8:00 AM – 10:00 AM',
      crop: primaryCol?.crop || 'TOMATO',
      quantityKg: primaryCol?.declaredKg || 400,
      status:
        stage === 1
          ? 'Requested'
          : stage === 2
          ? 'Scheduled'
          : stage === 3
          ? 'Handed Over'
          : 'Weighed & Verified',
      verifiedGrossKg: primaryLot?.scaleKg || (stage >= 3 ? 392 : undefined),
      acceptedKg: primaryLot?.acceptedKg || (stage >= 4 ? 370 : (stage >= 3 ? 392 : undefined)),
      grade: primaryLot?.grade ? `Grade ${primaryLot.grade}` : (stage >= 4 ? 'Grade A' : undefined),
    }
    return [col1, ...collectionHandovers.filter((c) => c.id !== 'col-1')]
  }, [wfState, fpoName, collectionCentre, collectionHandovers])

  // 5. Notifications List
  const [notifications, setNotifications] = useState<FarmerNotification[]>([
    {
      id: 'notif-1',
      title: 'Handover Slot Confirmed for 24 Sep',
      detail: `Your collection slot for 400 kg Tomato is booked at ${collectionCentre} between 8:00 AM – 10:00 AM.`,
      category: 'collection',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'GradeCam Quality Check: Grade A',
      detail: 'Lot LOT-TOM-0924 certified as Grade A (94% visual confidence). Premium farmgate rate applies.',
      category: 'quality',
      time: 'Yesterday',
      unread: true,
    },
    {
      id: 'notif-3',
      title: 'Net Settlement Credited: ₹11,520',
      detail: 'Disbursement for accepted 392 kg Tomato lot credited to State Bank of India A/c (...4920). Ref: AGR-2026-98124.',
      category: 'payment',
      time: '2 days ago',
      unread: false,
    },
    {
      id: 'notif-4',
      title: 'Kharif Demand Forecast Updated',
      detail: 'Institutional mid-day meal programs in Anand district increased Paddy demand forecast by 15%.',
      category: 'demand',
      time: '3 days ago',
      unread: false,
    },
  ])

  // Upcoming Demand Forecast Data
  const upcomingDemandData = useMemo(() => {
    return [
      {
        id: 'dem-1',
        crop: 'TOMATO',
        predictedDemandKg: 2400,
        forecastPeriod: '24 Sep – 22 Oct 2026 (Next 4 Weeks)',
        confidence: 94,
        confidenceLevel: 'High Confidence',
        dataSource: 'PM POSHAN Central Kitchens & District Civil Hospital',
        indicativePriceRange: '₹28.00 – ₹32.00 / kg',
        mandiBenchmark: '₹24.50 / kg',
      },
      {
        id: 'dem-2',
        crop: 'PADDY',
        predictedDemandKg: 6500,
        forecastPeriod: '01 Oct – 31 Oct 2026 (Next 4 Weeks)',
        confidence: 91,
        confidenceLevel: 'High Confidence',
        dataSource: 'State Fair Price Shops & Anganwadi Nutrition Hubs',
        indicativePriceRange: '₹26.00 – ₹29.50 / kg',
        mandiBenchmark: '₹23.00 / kg',
      },
      {
        id: 'dem-3',
        crop: 'WHEAT',
        predictedDemandKg: 4800,
        forecastPeriod: '15 Oct – 15 Nov 2026 (Next 4 Weeks)',
        confidence: 88,
        confidenceLevel: 'Medium-High',
        dataSource: 'Student Mess Cooperatives & Regional Ration Depot',
        indicativePriceRange: '₹31.00 – ₹34.00 / kg',
        mandiBenchmark: '₹28.00 / kg',
      },
      {
        id: 'dem-4',
        crop: 'POTATO',
        predictedDemandKg: 3200,
        forecastPeriod: '28 Sep – 26 Oct 2026 (Next 4 Weeks)',
        confidence: 90,
        confidenceLevel: 'High Confidence',
        dataSource: 'Community Food Kitchens & Civil Mess Supply',
        indicativePriceRange: '₹20.00 – ₹23.50 / kg',
        mandiBenchmark: '₹17.50 / kg',
      },
    ]
  }, [])

  // Handle Collection Request Submission (Primary CTA)
  const handleSubmitCollectionRequest = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessingAction(true)

    const qty = Number(collectionFormQty) || 400
    const crop = collectionFormCrop || 'TOMATO'
    
    // Unify state change with primary demo workflow engine
    const nextWf = step1FarmerRequestCollection(qty, crop)
    setWfState(nextWf)

    const primaryCol = nextWf.collections[0]
    const newReqId = primaryCol?.requestId || `REQ-COL-${Math.floor(1000 + Math.random() * 9000)}`
    const newRecord: CollectionHandoverRecord = {
      id: `col-${Date.now()}`,
      requestId: newReqId,
      fpoName: fpoName,
      collectionCentre: primaryCol?.preferredHub || collectionCentre,
      dateTimeSlot: `${collectionFormDate} • ${collectionFormSlot}`,
      crop: crop,
      quantityKg: qty,
      status: 'Requested',
    }

    setCollectionHandovers((prev) => [newRecord, ...prev])

    // Update batch status if linked
    if (selectedBatchForCollection) {
      setMyProduce((prev) =>
        prev.map((b) =>
          b.id === selectedBatchForCollection
            ? { ...b, collectionStatus: 'Collection Requested' }
            : b
        )
      )
    }

    // Add notification
    const newNotif: FarmerNotification = {
      id: `notif-${Date.now()}`,
      title: `Collection Requested (#${newReqId})`,
      detail: `Your request to collect ${collectionFormQty} kg of ${cropName(collectionFormCrop, lang)} has been sent to ${fpoName}. The FPO will schedule your handover slot shortly.`,
      category: 'collection',
      time: 'Just now',
      unread: true,
    }
    setNotifications((prev) => [newNotif, ...prev])

    setIsProcessingAction(false)
    setIsRequestCollectionModalOpen(false)
    flash('ok', `Collection requested successfully! Request ID: ${newReqId}`)
  }

  // Handle Adding New Plot to Crop Registry
  const handleAddPlot = (e: React.FormEvent) => {
    e.preventDefault()
    const newEntry: CropRegistryEntry = {
      id: `reg-${Date.now()}`,
      crop: newPlotCrop,
      area: newPlotArea,
      expectedQtyKg: Number(newPlotQty) || 1000,
      harvestPeriod: newPlotPeriod,
      location: `${newPlotLocation}, ${village}`,
      status: 'Active Cultivation',
    }
    setCropRegistry((prev) => [...prev, newEntry])

    // Also add to Expected Harvest planning
    const newExp: ExpectedHarvestEntry = {
      id: `exp-${Date.now()}`,
      crop: newPlotCrop,
      expectedQtyKg: Number(newPlotQty) || 1000,
      harvestDate: newPlotPeriod,
      status: 'Growing',
      plotLocation: newPlotLocation,
    }
    setExpectedHarvests((prev) => [...prev, newExp])

    setIsAddPlotModalOpen(false)
    flash('ok', `Crop plot registered successfully for ${cropName(newPlotCrop, lang)}!`)
  }

  // Filtered demands
  const filteredDemands = useMemo(() => {
    if (demandCropFilter === 'ALL') return upcomingDemandData
    return upcomingDemandData.filter((d) => d.crop === demandCropFilter)
  }, [upcomingDemandData, demandCropFilter])

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'all') return notifications
    return notifications.filter((n) => n.category === notificationFilter)
  }, [notifications, notificationFilter])

  const unreadCount = notifications.filter((n) => n.unread).length

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
      {/* 9-TAB PRIMARY NAVIGATION                                                  */}
      {/* Home · Crop Registry · Upcoming Demand · Expected Harvest · My Produce ·   */}
      {/* Collection/Handover · Logistics Status · Payments/Passbook · Notifications */}
      {/* ========================================================================= */}
      <nav aria-label="Farmer Navigation" className="bg-white rounded-2xl shadow-xs border border-slate-200 p-1.5 flex items-center gap-1 overflow-x-auto">
        {[
          { key: 'home', label: 'Home', icon: Wheat },
          { key: 'registry', label: 'Crop Registry', icon: Sprout },
          { key: 'demand', label: 'Upcoming Demand', icon: TrendingUp },
          { key: 'expected_harvest', label: 'Expected Harvest', icon: Calendar },
          { key: 'my_produce', label: 'My Produce', icon: Package },
          { key: 'handover', label: 'Collection/Handover', icon: QrCode },
          { key: 'logistics', label: 'Logistics Status', icon: Truck },
          { key: 'passbook', label: 'Payments/Passbook', icon: Receipt },
          { key: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
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
                else if (tab.key === 'demand') onNavigate('Orders')
                else if (tab.key === 'my_produce') onNavigate('Collection & grade')
                else if (tab.key === 'passbook') onNavigate('Settlements')
              }}
              className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
                isCurrent
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              <div className="relative">
                <IconComp className="w-4 h-4 shrink-0" />
                {tab.badge ? (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-white text-emerald-800' : 'bg-red-600 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] sm:text-xs block leading-tight text-center whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ========================================================================= */}
      {/* 1. HOME                                                                   */}
      {/* Name, verification, produce summary, demand summary, collection status,    */}
      {/* payment summary, relevant notifications. Keep simple; no unnecessary graphs*/}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Welcome & Verification Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Aadhaar & FPO Verified Farmer
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {village} • {fpoName}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Namaste, {farmerName} 👋
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Direct farmgate aggregation portal. Monitor your registered plots, harvest ready produce, collection handover slots, and transparent bank passbook.
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
                  setActiveTab('my_produce')
                  setShowGradeCam(true)
                }}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                GradeCam Check
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my_produce')
                  setIsRequestCollectionModalOpen(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-4 h-4" />
                Request Collection
              </button>
            </div>
          </div>

          {/* Simple Structured Operational Overview (No unnecessary graphs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Produce Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Produce Summary</span>
                  <Package className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-xl font-black text-slate-900">
                  {myProduce.reduce((s, p) => s + p.declaredQtyKg, 0)} kg Ready
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {cropRegistry.length} active plots registered ({expectedHarvests.reduce((s, e) => s + e.expectedQtyKg, 0)} kg estimated)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('my_produce')}
                className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View My Produce <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Demand Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demand Forecast</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-black text-blue-900">
                  16,900 kg District Demand
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  PM POSHAN & Fair Price Shops. Indicative +₹3–₹5/kg over mandi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('demand')}
                className="mt-4 text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                Upcoming Demand <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Collection Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collection Status</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-black text-slate-900">
                  24 Sep • 8–10 AM
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Slot scheduled at {collectionCentre}. 400 kg lot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('handover')}
                className="mt-4 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                View Handover Pass <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Payment Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled Net Credited</span>
                  <CircleDollarSign className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-xl font-black text-emerald-800">
                  {formatINR(totalSettledNet)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Direct bank credit to SBI A/c (...4920). Mandi gain +{formatINR(mandiGain)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('passbook')}
                className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                Open Passbook Ledger <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Farmer Action Center
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my_produce')
                  setIsRequestCollectionModalOpen(true)
                }}
                className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-colors"
              >
                <Truck className="w-5 h-5 text-emerald-700 mb-1.5" />
                <h4 className="text-xs font-bold text-slate-900">Request Collection</h4>
                <p className="text-[11px] text-slate-500">Submit ready harvest for pickup</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('registry')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-colors"
              >
                <Sprout className="w-5 h-5 text-emerald-700 mb-1.5" />
                <h4 className="text-xs font-bold text-slate-900">Crop Registry</h4>
                <p className="text-[11px] text-slate-500">View & add farm plots</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('demand')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-blue-600 mb-1.5" />
                <h4 className="text-xs font-bold text-slate-900">Upcoming Demand</h4>
                <p className="text-[11px] text-slate-500">Institutional forecast signals</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('handover')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-colors"
              >
                <QrCode className="w-5 h-5 text-purple-600 mb-1.5" />
                <h4 className="text-xs font-bold text-slate-900">Handover Slip & QR</h4>
                <p className="text-[11px] text-slate-500">Entry pass for FPO hub</p>
              </button>
            </div>
          </div>

          {/* Recent Relevant Notifications */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900">Recent Alerts & Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View All ({notifications.length}) →
              </button>
            </div>

            <div className="space-y-2">
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CROP REGISTRY                                                          */}
      {/* Crop, area, expected quantity, harvest period/location.                    */}
      {/* ========================================================================= */}
      {activeTab === 'registry' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Farm Land Holdings
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Crop Registry & Cultivated Plots 🌱
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Registered land records and sown crops. This enables your FPO to aggregate regional cluster volume in advance and plan logistics efficiently.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddPlotModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              Register New Crop Plot
            </button>
          </div>

          {/* Registry Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Registered Plots ({cropRegistry.length})
              </h3>
              <span className="text-xs text-slate-400">All plots verified with FPO geo-coordinates</span>
            </div>

            <div className="divide-y divide-slate-100">
              {cropRegistry.map((item) => (
                <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shrink-0">
                      {item.crop === 'TOMATO' ? '🍅' : item.crop === 'PADDY' ? '🍚' : item.crop === 'WHEAT' ? '🌾' : '🥔'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-slate-900">
                          {cropName(item.crop, lang)}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.location}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-left md:text-right">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Cultivated Area</span>
                      <span className="font-extrabold text-slate-800">{item.area}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Quantity</span>
                      <span className="font-extrabold text-emerald-800">{formatKg(item.expectedQtyKg)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Harvest Period</span>
                      <span className="font-semibold text-slate-700">{item.harvestPeriod}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. UPCOMING DEMAND                                                        */}
      {/* Simple cards/tables showing predicted demand, forecast period, confidence, */}
      {/* data source, indicative price range. Show “Forecast — Not a confirmed order.” */}
      {/* Do NOT make Supply Request a normal farmer action.                         */}
      {/* ========================================================================= */}
      {activeTab === 'demand' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Institutional Demand Foresight
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Upcoming Market Demand 📈
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Aggregated procurement forecasts based on government mid-day meal academic calendars, fair price shops, and institutional caterers in your district.
              </p>
            </div>

            {/* PROMINENT MANDATORY NOTICE: “Forecast — Not a confirmed order.” */}
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950 shadow-2xs">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-sm text-amber-900 uppercase tracking-wide block">
                  Forecast — Not a confirmed order.
                </span>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  These projected quantities are planning indicators calculated to assist in your seasonal harvesting schedule. FPO contracts and pickups are locked when actual produce is declared in <strong>My Produce</strong> and collection is requested.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">
              Filter by Crop:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['ALL', 'TOMATO', 'PADDY', 'WHEAT', 'POTATO'].map((cr) => (
                <button
                  key={cr}
                  type="button"
                  onClick={() => setDemandCropFilter(cr)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    demandCropFilter === cr
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cr === 'ALL' ? 'All Crops' : cropName(cr, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Demand Cards Grid (Informational only; no supply request buttons) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDemands.map((demand) => {
              const cropEmoji =
                demand.crop === 'TOMATO' ? '🍅' : demand.crop === 'PADDY' ? '🍚' : demand.crop === 'WHEAT' ? '🌾' : '🥔'

              return (
                <div
                  key={demand.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-blue-300 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl shrink-0">
                        {cropEmoji}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">
                          {cropName(demand.crop, lang)}
                        </h3>
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                          {demand.confidence}% Confidence ({demand.confidenceLevel})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Predicted Demand
                      </span>
                      <span className="text-lg font-black text-blue-900">
                        {formatKg(demand.predictedDemandKg)}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Forecast Period:</span>
                      <span className="font-bold text-slate-900">{demand.forecastPeriod}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Data Source:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[240px] truncate">
                        {demand.dataSource}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Indicative Price Range:</span>
                      <span className="font-black text-emerald-800">{demand.indicativePriceRange}</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-500 text-[11px]">
                      <span>Local Mandi Benchmark:</span>
                      <span>{demand.mandiBenchmark}</span>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Forecast planning signal only</span>
                    <span className="text-emerald-700 font-bold">No broker deduction</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXPECTED HARVEST                                                       */}
      {/* Crop, expected quantity, harvest date, status.                             */}
      {/* IMPORTANT: expected harvest is planning data, NOT inventory.              */}
      {/* ========================================================================= */}
      {activeTab === 'expected_harvest' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Planning Intelligence
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Expected Harvest Schedules 🌾
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Projected harvest maturity timeline for crops currently in your fields.
              </p>
            </div>

            {/* PROMINENT MANDATORY ALERT: expected harvest is planning data, NOT inventory */}
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-sm text-amber-900 uppercase tracking-wide block">
                  IMPORTANT: Expected harvest is planning data, NOT inventory.
                </span>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Expected yield data allows the FPO to reserve collection trucks and anticipate buyer needs. It is strictly planning data and is never treated as confirmed inventory until you physically harvest the produce and declare it under <strong>My Produce</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Expected Harvest Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {expectedHarvests.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      {item.crop === 'TOMATO' ? '🍅' : item.crop === 'PADDY' ? '🍚' : '🌾'} {cropName(item.crop, lang)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.status === 'Ready for Harvest' || item.status === 'Ripening'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Expected Quantity:</span>
                      <span className="font-extrabold text-slate-900">{formatKg(item.expectedQtyKg)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Estimated Harvest Date:</span>
                      <span className="font-bold text-slate-800">{item.harvestDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Plot Location:</span>
                      <span className="font-medium text-slate-600">{item.plotLocation}</span>
                    </div>
                    <div className="flex justify-between py-1 text-[11px] text-slate-400">
                      <span>Inventory Classification:</span>
                      <span className="font-semibold text-amber-800">Planning Data Only</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('my_produce')
                    onDeclareHarvest()
                  }}
                  className="w-full py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors"
                >
                  Harvested this lot? Declare Actual Harvest →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MY PRODUCE                                                             */}
      {/* Actual harvested/offered produce, declared quantity, harvest date,        */}
      {/* collection and verification status. Primary CTA: Request Collection.      */}
      {/* ========================================================================= */}
      {activeTab === 'my_produce' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header Banner with Primary CTA */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Actual Ready Harvest
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                My Produce (Harvested Lots) 📦
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Produce that has been physically harvested from your fields and is ready for pickup or handover at the collection centre.
              </p>
            </div>

            {/* Primary CTA: Request Collection */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowGradeCam(!showGradeCam)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                {showGradeCam ? 'Close Camera' : 'GradeCam Pre-Check'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchForCollection('')
                  setIsRequestCollectionModalOpen(true)
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Truck className="w-4 h-4" />
                Request Collection
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
                    <h3 className="font-extrabold text-base text-slate-900">GradeCam AI Pre-Inspection</h3>
                    <p className="text-xs text-slate-500">Scan produce before requesting collection to verify AGMARK quality</p>
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
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-500">Pre-Collection Instructions</span>
                    <ul className="text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>GradeCam pre-grades your crates according to AGMARK specifications.</li>
                      <li>Grade A produce qualifies for top guaranteed farmgate contract rates.</li>
                      <li>Ensures quick weighbridge clearance at the collection hub.</li>
                    </ul>
                  </div>

                  {aiResult && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">AI Quality Grade</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white">
                          Grade {aiResult.grade} ({aiResult.confidence}% confidence)
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        {aiResult.reasoning || 'High quality harvest lot. Eligible for direct collection.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Harvest Batches List */}
          <div className="space-y-3">
            {liveMyProduce.map((batch) => (
              <div
                key={batch.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shrink-0">
                    🍅
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900">
                        {cropName(batch.crop, lang)} — {formatKg(batch.declaredQtyKg)} Lot
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          batch.collectionStatus === 'Scheduled'
                            ? 'bg-blue-100 text-blue-900'
                            : batch.collectionStatus === 'Collection Requested'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {batch.collectionStatus}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {batch.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Harvest Date: <strong>{batch.harvestDate}</strong> • {batch.notes}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
                  {batch.collectionStatus === 'Ready for Collection' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchForCollection(batch.id)
                        setCollectionFormCrop(batch.crop)
                        setCollectionFormQty(String(batch.declaredQtyKg))
                        setIsRequestCollectionModalOpen(true)
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Request Collection
                    </button>
                  ) : batch.collectionStatus === 'Scheduled' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('handover')}
                      className="px-4 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      View Handover Slot
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Awaiting FPO Slot Scheduling
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. COLLECTION / HANDOVER                                                  */}
      {/* Request, FPO, collection centre, date/time, quantity, status.             */}
      {/* Prototype flow: farmer request → FPO schedules → farmer hands over at      */}
      {/* collection centre → FPO weighs/verifies.                                  */}
      {/* ========================================================================= */}
      {activeTab === 'handover' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                FPO Handover Tracking
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Collection & Handover Operations 🤝
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Standard prototype flow: <strong>Farmer Request → FPO Schedules → Farmer Hands Over at Collection Centre → FPO Weighs/Verifies</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedBatchForCollection('')
                setIsRequestCollectionModalOpen(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              New Collection Request
            </button>
          </div>

          {/* Collection Requests & Handovers */}
          <div className="space-y-4">
            {liveCollectionHandovers.map((col) => {
              const stepIndex =
                col.status === 'Requested'
                  ? 1
                  : col.status === 'Scheduled'
                  ? 2
                  : col.status === 'Handed Over'
                  ? 3
                  : 4

              return (
                <div key={col.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-slate-900">
                            {col.requestId} — {formatKg(col.quantityKg)} {cropName(col.crop, lang)}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {col.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Assigned FPO: <strong>{col.fpoName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenReceipt}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Handover Pass
                      </button>
                    </div>
                  </div>

                  {/* 4-Step Prototype Flow Stepper */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Handover Progress Pipeline
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          stepIndex >= 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="size-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">1</span>
                          <span>1. Farmer Request</span>
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border ${
                          stepIndex >= 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="size-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">2</span>
                          <span>2. FPO Schedules</span>
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border ${
                          stepIndex >= 3 ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="size-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">3</span>
                          <span>3. Farmer Hands Over</span>
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border ${
                          stepIndex >= 4 ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="size-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">4</span>
                          <span>4. FPO Weighs/Verifies</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Collection Centre</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {col.collectionCentre}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Time Slot</span>
                      <span className="font-bold text-blue-900 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {col.dateTimeSlot}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Weighbridge & Quality</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {col.verifiedGrossKg ? `${col.verifiedGrossKg} kg verified (${col.grade})` : 'Pending physical weighbridge'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. LOGISTICS STATUS                                                       */}
      {/* Only farmer-relevant status. No complex telematics or unnecessary maps.    */}
      {/* ========================================================================= */}
      {activeTab === 'logistics' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Farmer Transit Information
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              Logistics & Pickup Status 🚚
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Farmer-relevant transport details. Shows collection van assignment, scheduled arrival window, and transit progress to the FPO central hub.
            </p>
          </div>

          {/* Core Farmer-Relevant Logistics Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Tata Ace 1.5t (Vehicle: AP XX XX 1234)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transporter: Rameshwar Cluster Logistics • Driver Contact: +91 98765 43210
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Vehicle Assigned
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Arrival Window</span>
                <p className="font-extrabold text-slate-900 text-sm mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-700" />
                  24 Sep • 8:00 AM – 10:00 AM
                </p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Estimated pickup time for your lot</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Collection Destination</span>
                <p className="font-extrabold text-slate-900 text-sm mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  {collectionCentre}
                </p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Weighbridge & Quality Inspection Hub</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Consolidation Status</span>
                <p className="font-extrabold text-slate-900 text-sm mt-1">
                  Pooled with 2 Village Farmers
                </p>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">Shared transport saves 60% freight cost</span>
              </div>
            </div>

            {/* Current Transit Status Stepper */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-blue-900 block">Current Vehicle Status:</span>
              <p className="text-blue-800 leading-relaxed">
                Collection van dispatched from Anand depot. Routing through Anand Rural cluster collection points. Please ensure produce crates are ready with your Handover QR pass.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PAYMENTS / PASSBOOK                                                    */}
      {/* Accepted quantity, agreed rate, gross, charges, net, disbursement status. */}
      {/* ========================================================================= */}
      {activeTab === 'passbook' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Auditable Passbook
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Farmer Settlement Passbook & Payments 💰
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Itemized, auditable breakdown. Formula: <strong>Net Payable = Accepted Quantity × Agreed Rate − Disclosed Charges</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenReceipt}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
            >
              <Download className="w-4 h-4" />
              Download Bank Receipt
            </button>
          </div>

          {/* Latest Verified Settlement Ledger Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Settlement Slip #LOT-TOM-0924
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Tomato Lot (400 kg declared • 392 kg accepted)
                </h3>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Disbursed to Bank Account
              </span>
            </div>

            {/* Formula Itemization */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>1. Accepted Quantity (Post-GradeCam & Weighbridge QC):</span>
                <span className="font-extrabold text-slate-900 text-sm">392 kg (Grade A)</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>2. Agreed Contract Rate:</span>
                <span className="font-extrabold text-slate-900">₹30.00 / kg</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                <span>3. Gross Value (392 kg × ₹30.00):</span>
                <span className="font-extrabold text-slate-900 text-sm">₹11,760.00</span>
              </div>

              {/* Itemized Disclosed Charges */}
              <div className="py-2 border-b border-slate-200/60 space-y-1.5 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700 block">Disclosed Legitimate Deductions:</span>
                <div className="flex justify-between pl-3">
                  <span>• FPO Weighbridge & QC Handling:</span>
                  <span className="text-slate-800 font-semibold">- ₹120.00</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span>• Cluster Shared Transport:</span>
                  <span className="text-slate-800 font-semibold">- ₹120.00</span>
                </div>
                <div className="flex justify-between pl-3 font-bold text-slate-700 pt-0.5">
                  <span>Total Charges:</span>
                  <span>- ₹240.00</span>
                </div>
              </div>

              {/* Net Payable */}
              <div className="flex justify-between pt-2 text-sm sm:text-base font-extrabold text-emerald-950">
                <span>Net Credited to Bank Account:</span>
                <span className="text-lg sm:text-xl font-black text-emerald-800">
                  {formatINR(totalSettledNet)}
                </span>
              </div>
            </div>

            {/* Disbursement Proof & Banking Trail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Disbursement Status</span>
                <span className="font-bold text-emerald-900 mt-0.5 block">Direct Bank Transfer Complete</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank Account Reference</span>
                <span className="font-bold text-slate-800 mt-0.5 block">State Bank of India (A/c ...4920)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Transaction / UTR Code</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">AGR-2026-98124</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. NOTIFICATIONS                                                          */}
      {/* Relevant alerts (handover schedules, advance payments, AGMARK grading).   */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Farmer Activity Feed
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Notifications & Alerts 🔔
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Critical updates on handover time slots, AI quality grading scores, weighbridge net receipts, and bank disbursement confirmations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
                flash('ok', 'All notifications marked as read.')
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs self-start md:self-auto"
            >
              Mark All as Read
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
            {[
              { key: 'all', label: `All Alerts (${notifications.length})` },
              { key: 'collection', label: 'Collections' },
              { key: 'payment', label: 'Payments' },
              { key: 'quality', label: 'Quality Checks' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setNotificationFilter(f.key as any)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                  notificationFilter === f.key
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 flex items-start gap-4 transition-colors ${
                  notif.unread ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  {notif.category === 'collection' ? (
                    <Clock className="w-5 h-5 text-purple-600" />
                  ) : notif.category === 'payment' ? (
                    <CircleDollarSign className="w-5 h-5 text-emerald-600" />
                  ) : notif.category === 'quality' ? (
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      {notif.title}
                      {notif.unread && (
                        <span className="size-2 rounded-full bg-emerald-600 inline-block" />
                      )}
                    </h4>
                    <span className="text-[11px] text-slate-400 shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST COLLECTION (Primary CTA for My Produce)                    */}
      {/* ========================================================================= */}
      {isRequestCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Farmgate Aggregation
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Request Produce Collection 🚚
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestCollectionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollectionRequest} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Harvested Crop:</label>
                <select
                  value={collectionFormCrop}
                  onChange={(e) => setCollectionFormCrop(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                >
                  <option value="TOMATO">Tomato (Hybrid F1)</option>
                  <option value="PADDY">Paddy (PB 1121)</option>
                  <option value="WHEAT">Wheat (Sharbati)</option>
                  <option value="POTATO">Potato (Kufri Jyoti)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Quantity to Handover (kg):</label>
                  <input
                    type="number"
                    min={20}
                    max={10000}
                    value={collectionFormQty}
                    onChange={(e) => setCollectionFormQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Preferred Date:</label>
                  <input
                    type="date"
                    value={collectionFormDate}
                    onChange={(e) => setCollectionFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Preferred Handover Slot:</label>
                <select
                  value={collectionFormSlot}
                  onChange={(e) => setCollectionFormSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                >
                  <option value="Morning (8:00 AM – 10:00 AM)">Morning (8:00 AM – 10:00 AM)</option>
                  <option value="Midday (11:00 AM – 1:00 PM)">Midday (11:00 AM – 1:00 PM)</option>
                  <option value="Afternoon (2:00 PM – 4:00 PM)">Afternoon (2:00 PM – 4:00 PM)</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-950 block">Assigned Collection Point:</span>
                <p className="text-emerald-800 text-[11px]">
                  {collectionCentre} • Weighbridge & QC Operator on duty.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Optional Notes / Remarks:</label>
                <textarea
                  rows={2}
                  value={collectionFormNotes}
                  onChange={(e) => setCollectionFormNotes(e.target.value)}
                  placeholder="e.g. Graded into 16 crates, stored under shade."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRequestCollectionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm Collection Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW CROP PLOT (For Crop Registry)                         */}
      {/* ========================================================================= */}
      {isAddPlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Land Holding Record
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Register Crop Plot 🌱
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPlotModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Crop Sown:</label>
                  <select
                    value={newPlotCrop}
                    onChange={(e) => setNewPlotCrop(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                  >
                    <option value="TOMATO">Tomato</option>
                    <option value="PADDY">Paddy</option>
                    <option value="WHEAT">Wheat</option>
                    <option value="POTATO">Potato</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Cultivated Area:</label>
                  <input
                    type="text"
                    value={newPlotArea}
                    onChange={(e) => setNewPlotArea(e.target.value)}
                    placeholder="e.g. 1.5 Acres or 0.6 Hectares"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Expected Yield (kg):</label>
                  <input
                    type="number"
                    min={100}
                    value={newPlotQty}
                    onChange={(e) => setNewPlotQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Harvest Period:</label>
                  <input
                    type="text"
                    value={newPlotPeriod}
                    onChange={(e) => setNewPlotPeriod(e.target.value)}
                    placeholder="e.g. 20–25 Sep 2026"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Plot Name & Location:</label>
                <input
                  type="text"
                  value={newPlotLocation}
                  onChange={(e) => setNewPlotLocation(e.target.value)}
                  placeholder="e.g. Plot 01 — North Canal"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddPlotModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Plot to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
