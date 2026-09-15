'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  LayoutDashboard,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  PhoneCall,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Route,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wheat,
  X,
  Zap,
} from 'lucide-react'
import { authHeaders, getAuthClient } from '@/lib/auth-client'
import { RouteMap } from '@/components/route-map'
import { BolnaCallModal } from '@/components/bolna-call-modal'
import { GradeCamCamera } from '@/components/gradecam-camera'
import { cropName, localDate } from '@/lib/domain/i18n'
import { formatINR, formatKg } from '@/lib/domain/money'
import {
  allocateFarmersOptimal,
  getVillageLatLng,
  type CandidateFarmer,
} from '@/lib/domain/allocation'
import { SMALL_ORDER_THRESHOLD_KG } from '@/lib/domain/order-routing'
import {
  getWorkflowState,
  step2FpoScheduleCollection,
  step3ReceiveAndWeigh,
  step4QualityVerifyAndCreateInventory,
  step5BuyerOrderAndReserve,
  step6DispatchConsignment,
  step7DeliverAndSettle,
  type WorkflowState,
} from '@/lib/workflow-engine'
import {
  demandForecastingService,
  priceEstimationService,
  supplyAllocationService,
  routeOptimizationService,
  qualityVerificationService,
  type DemandForecastResult,
  type PriceEstimationResult,
  type SupplyAllocationPlan,
  type RouteOptimizationResult,
  type QualityInspectionResult,
} from '@/lib/services/intelligence'

// ============================================================================
// Types & Data Models
// ============================================================================

export type AdminTabKey =
  | 'home'
  | 'farmers'
  | 'collections'
  | 'verification'
  | 'inventory'
  | 'orders'
  | 'dispatch'
  | 'logistics'
  | 'payments'

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
  purpose?: string | null
  review_status?: 'not_required' | 'pending' | 'approved' | 'rejected' | null
  admin_note?: string | null
  qty_committed_kg?: number
  standby_kg?: number
  is_fully_committed?: boolean
  mandi_price_per_kg?: number | null
  retail_price_per_kg?: number | null
  buyer_lat?: number
  buyer_lng?: number
  fpo_name?: string
  fpo_lat?: number
  fpo_lng?: number
}

export type LiveFarmer = {
  id: string
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
  collection_status?: 'Scheduled' | 'Collected' | 'Pending Schedule' | 'Idle'
  acreage?: number
}

export interface CollectionItem {
  id: string
  farmerId: string
  farmerName: string
  village: string
  phone: string
  crop: string
  declaredKg: number
  scaleKg?: number
  confirmedKg?: number
  preferredSlot: string
  location: string
  status: 'Pending Weighing' | 'Scheduled' | 'Weighed & Lot Created' | 'In Transit'
  orderId?: string
  orderCode?: string
  lotId?: string
  auditOperator?: string
  auditTimestamp?: string
  scaleTareKg?: number
  scaleGrossKg?: number
  createdAt: string
}

export interface VerificationLot {
  id: string
  requestId?: string
  farmerId: string
  farmerName: string
  village: string
  crop: string
  declaredKg: number
  scaleKg: number
  grade: 'Grade A' | 'Grade B' | 'Grade C' | 'Pending QC'
  aiConfidence?: number
  status: 'Pending QC' | 'Staff Review' | 'Verified' | 'Rejected'
  acceptedKg: number
  rejectedKg: number
  reason: string
  verifier: string
  timestamp: string
  photoDataUrl?: string | null
}

export interface VerifiedStockItem {
  id: string
  lotId: string
  crop: string
  grade: 'Grade A' | 'Grade B'
  totalVerifiedKg: number
  availableKg: number
  reservedKg: number
  location: string
  freshness: string
  pricePerKg: number
  farmerName: string
  harvestDate: string
}

export interface DispatchConsignment {
  id: string
  orderId: string
  orderCode: string
  buyerName: string
  fpo: string
  crop: string
  quantityKg: number
  destination: string
  distanceKm: number
  vehicle: string
  driver: string
  driverPhone: string
  status: 'Scheduled' | 'Loading' | 'Dispatched' | 'Delivered'
  dispatchedAt?: string
  waybillNo: string
}

export interface FleetVehicle {
  id: string
  name: string
  registration: string
  capacityKg: number
  currentLoadKg: number
  status: 'Available' | 'Assigned' | 'En Route' | 'Maintenance'
  driverName?: string
  driverPhone?: string
  fuelType: string
}

export interface FleetDriver {
  id: string
  name: string
  phone: string
  licenseNo: string
  assignedVehicle: string
  rating: number
  tripsCompleted: number
  status: 'On Duty' | 'Driving' | 'Off Duty'
}

export interface FarmerSettlementRecord {
  id: string
  farmerId: string
  farmerName: string
  lotId: string
  crop: string
  weighedKg: number
  agreedPricePerKg: number
  grossAmount: number
  weighbridgeFee: number
  transportShare: number
  netPayable: number
  status: 'Credited' | 'Processing' | 'Ready for Payout'
  bankAccountMasked: string
  utrRef: string
  paidAt: string
}

export interface BuyerEscrowRecord {
  id: string
  orderCode: string
  buyerName: string
  crop: string
  targetKg: number
  advanceDeposit: number
  escrowStatus: 'Locked in Escrow' | 'Partially Released' | 'Settled'
  invoicedAmount: number
  balancePayable: number
  settlementStatus: 'Settled' | 'Pending Delivery Confirmation' | 'Advance Funded'
}

// ============================================================================
// Main AdminPortal Component
// ============================================================================

export function AdminPortal() {
  const router = useRouter()

  // 9-Tab Navigation State
  const [activeTab, setActiveTab] = useState<AdminTabKey>('home')

  // Real data state
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [farmers, setFarmers] = useState<LiveFarmer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [wfState, setWfState] = useState<WorkflowState>(() => getWorkflowState())

  // Toast feedback
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const flash = (tone: 'ok' | 'error', text: string) => {
    setToast({ tone, text })
    setTimeout(() => setToast(null), 4500)
  }

  // ==========================================================================
  // Operational Collections & Receive & Weigh States
  // ==========================================================================
  const [collections, setCollections] = useState<CollectionItem[]>([
    {
      id: 'COL-101',
      farmerId: 'farmer-anand-001',
      farmerName: 'Ramesh Kumar',
      village: 'Boriavi',
      phone: '+91 98251 44102',
      crop: 'TOMATO',
      declaredKg: 400,
      preferredSlot: '24 Sep • 08:00 - 10:00 AM',
      location: 'Mahi Valley Hub #1 - Bay A',
      status: 'Pending Weighing',
      orderId: 'ord-102',
      orderCode: 'AG-1002',
      createdAt: '2025-09-24T07:30:00Z',
    },
    {
      id: 'COL-102',
      farmerId: 'farmer-anand-002',
      farmerName: 'Dinesh Patel',
      village: 'Samarkha',
      phone: '+91 98251 44103',
      crop: 'PADDY',
      declaredKg: 1000,
      preferredSlot: '24 Sep • 10:00 - 12:00 PM',
      location: 'Mahi Valley Hub #1 - Bay B',
      status: 'Scheduled',
      orderId: 'ord-101',
      orderCode: 'AG-1001',
      createdAt: '2025-09-24T07:45:00Z',
    },
    {
      id: 'COL-103',
      farmerId: 'farmer-anand-003',
      farmerName: 'Suresh Varma',
      village: 'Mogri',
      phone: '+91 98251 44104',
      crop: 'WHEAT',
      declaredKg: 800,
      preferredSlot: '25 Sep • 09:00 - 11:00 AM',
      location: 'Farmgate - Mogri Cluster',
      status: 'In Transit',
      orderId: 'ord-103',
      orderCode: 'AG-1003',
      createdAt: '2025-09-24T08:15:00Z',
    },
    {
      id: 'COL-104',
      farmerId: 'farmer-anand-004',
      farmerName: 'Bhavesh Rathod',
      village: 'Chikhodra',
      phone: '+91 98251 44105',
      crop: 'POTATO',
      declaredKg: 600,
      preferredSlot: '25 Sep • 01:00 - 03:00 PM',
      location: 'Mahi Valley Hub #1 - Cold Bay 1',
      status: 'Scheduled',
      orderId: 'ord-104',
      orderCode: 'AG-1004',
      createdAt: '2025-09-24T08:30:00Z',
    },
  ])

  // Sub-view inside Collections: 'list' | 'weigh'
  const [collectionSubView, setCollectionSubView] = useState<'list' | 'weigh'>('list')
  const [selectedCollectionForWeigh, setSelectedCollectionForWeigh] = useState<CollectionItem | null>(null)

  // Live scale reading simulation states
  const [simulatedGrossKg, setSimulatedGrossKg] = useState<number>(407)
  const [simulatedTareKg, setSimulatedTareKg] = useState<number>(15)
  const [customConfirmedKg, setCustomConfirmedKg] = useState<number>(392)
  const [isWeighingSubmitting, setIsWeighingSubmitting] = useState(false)

  // ==========================================================================
  // Quality Verification Queue States
  // ==========================================================================
  const [verificationLots, setVerificationLots] = useState<VerificationLot[]>([
    {
      id: 'LOT-TOM-0924-392',
      requestId: 'COL-101',
      farmerId: 'farmer-anand-001',
      farmerName: 'Ramesh Kumar',
      village: 'Boriavi',
      crop: 'TOMATO',
      declaredKg: 400,
      scaleKg: 392,
      grade: 'Grade A',
      aiConfidence: 94,
      status: 'Pending QC',
      acceptedKg: 392,
      rejectedKg: 0,
      reason: 'Awaiting coordinator inspection and optical scan',
      verifier: 'Anita Desai (QC Staff)',
      timestamp: '2025-09-24T08:35:00Z',
    },
    {
      id: 'LOT-PAD-0923-500',
      requestId: 'COL-099',
      farmerId: 'farmer-anand-002',
      farmerName: 'Dinesh Patel',
      village: 'Samarkha',
      crop: 'PADDY',
      declaredKg: 500,
      scaleKg: 495,
      grade: 'Grade A',
      aiConfidence: 96,
      status: 'Verified',
      acceptedKg: 495,
      rejectedKg: 0,
      reason: 'Moisture content 12.8%, grain purity >98%',
      verifier: 'Anita Desai (QC Staff)',
      timestamp: '2025-09-23T16:20:00Z',
    },
    {
      id: 'LOT-WHT-0923-800',
      requestId: 'COL-098',
      farmerId: 'farmer-anand-003',
      farmerName: 'Suresh Varma',
      village: 'Mogri',
      crop: 'WHEAT',
      declaredKg: 800,
      scaleKg: 788,
      grade: 'Grade B',
      aiConfidence: 89,
      status: 'Verified',
      acceptedKg: 780,
      rejectedKg: 8,
      reason: 'Minor chaff presence (1.0%); approved as Grade B foodgrain',
      verifier: 'Karan Joshi (Depot Supervisor)',
      timestamp: '2025-09-23T14:10:00Z',
    },
  ])

  const [activeReviewLot, setActiveReviewLot] = useState<VerificationLot | null>(null)
  const [reviewGradeChoice, setReviewGradeChoice] = useState<'Grade A' | 'Grade B' | 'Grade C'>('Grade A')
  const [reviewAcceptedKg, setReviewAcceptedKg] = useState<number>(392)
  const [reviewRejectedKg, setReviewRejectedKg] = useState<number>(0)
  const [reviewReasonNote, setReviewReasonNote] = useState<string>('')
  const [showGradeCamModal, setShowGradeCamModal] = useState<boolean>(false)

  // ==========================================================================
  // Intelligence Layer Services States
  // ==========================================================================
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [priceModalData, setPriceModalData] = useState<PriceEstimationResult | null>(null)

  const [routeModalOpen, setRouteModalOpen] = useState(false)
  const [routeModalData, setRouteModalData] = useState<RouteOptimizationResult | null>(null)

  const [allocationModalOpen, setAllocationModalOpen] = useState(false)
  const [allocationModalData, setAllocationModalData] = useState<SupplyAllocationPlan | null>(null)

  const [forecastCrop, setForecastCrop] = useState('TOMATO')
  const [forecastLocation, setForecastLocation] = useState('Anand')
  const [forecastPeriod, setForecastPeriod] = useState<'7d' | '14d' | '30d'>('7d')
  const [forecastResult, setForecastResult] = useState<DemandForecastResult>(() =>
    demandForecastingService.predict({ crop: 'TOMATO', location: 'Anand', period: '7d' })
  )

  const [qualityInspectData, setQualityInspectData] = useState<QualityInspectionResult | null>(null)

  const handleRunForecast = (crop = forecastCrop, loc = forecastLocation, period = forecastPeriod) => {
    const res = demandForecastingService.predict({ crop, location: loc, period })
    setForecastResult(res)
  }

  const handleOpenPriceModal = (crop = 'TOMATO', grade: 'A' | 'B' | 'C' = 'A', distance = 25) => {
    const res = priceEstimationService.estimate({ crop, grade, location: 'Kheda FPO Hub', distanceKm: distance })
    setPriceModalData(res)
    setPriceModalOpen(true)
  }

  const handleRunRouteOptimization = () => {
    const depot = { id: 'DEPOT-1', label: 'Kheda FPO Central Hub', lat: 22.7533, lng: 72.6841 }
    const stops = collections.map((col, idx) => ({
      id: col.id,
      label: `${col.farmerName} (${col.village})`,
      lat: 22.56 + (idx * 0.05 - 0.08),
      lng: 72.92 + (idx * 0.04 - 0.06),
      quantityKg: col.declaredKg || col.scaleKg || 400,
      timeWindow: { open: '08:00 AM', close: '11:00 AM' },
      contactPerson: col.farmerName,
    }))

    const res = routeOptimizationService.optimize({
      depot,
      stops,
      vehicleCapacityKg: 1500,
      startTime: '07:30 AM',
    })
    setRouteModalData(res)
    setRouteModalOpen(true)
  }

  const handleRunSupplyAllocation = (order: LiveOrder) => {
    const candidateLots = verifiedInventory.map((inv) => ({
      lotId: inv.lotId,
      farmerId: 'farmer-sim-1',
      farmerName: inv.farmerName,
      crop: inv.crop,
      grade: (inv.grade === 'Grade A' ? 'A' : 'B') as 'A' | 'B',
      scaleWeightKg: inv.totalVerifiedKg,
      availableKg: inv.availableKg,
      freshnessDaysRemaining: 5,
      verifiedAt: '2026-09-15T06:00:00Z',
      location: inv.location,
      lat: 22.7533,
      lng: 72.6841,
      farmgatePricePerKg: inv.pricePerKg - 2,
      isVerified: true,
      lotStatus: 'VERIFIED' as const,
    }))

    // Inject an unverified expected harvest lot to explicitly prove it is excluded!
    candidateLots.push({
      lotId: 'LOT-EXP-UNVERIFIED-99',
      farmerId: 'farmer-unverified-99',
      farmerName: 'Jignesh Solanki (Harvest Planned)',
      crop: order.crop || order.crop_required || 'TOMATO',
      grade: 'A' as const,
      scaleWeightKg: 0,
      availableKg: 600,
      freshnessDaysRemaining: 12,
      verifiedAt: '',
      location: 'Borsad Field Plot #4',
      lat: 22.4118,
      lng: 72.9022,
      farmgatePricePerKg: 22,
      isVerified: false,
      lotStatus: 'HARVEST_PLANNED' as any,
    })

    const plan = supplyAllocationService.allocate(
      {
        id: order.id,
        buyerName: order.buyer_name || 'Institutional Buyer',
        crop: order.crop || order.crop_required || 'TOMATO',
        gradeRequired: 'A',
        quantityKg: order.quantity_required || order.qty_target_kg || 500,
        deliveryDate: order.delivery_date || '2026-09-18',
        deliveryLocation: order.delivery_location || 'Anand',
      },
      candidateLots
    )

    setAllocationModalData(plan)
    setAllocationModalOpen(true)
  }

  // ==========================================================================
  // Inventory (Verified Stock Only) States
  // ==========================================================================
  const [verifiedInventory, setVerifiedInventory] = useState<VerifiedStockItem[]>([
    {
      id: 'INV-101',
      lotId: 'LOT-PAD-0923-500',
      crop: 'PADDY',
      grade: 'Grade A',
      totalVerifiedKg: 495,
      availableKg: 245,
      reservedKg: 250,
      location: 'Hub #1 - Dry Storage Silo 2',
      freshness: 'Harvested 1d ago • 180d shelf life',
      pricePerKg: 28.0,
      farmerName: 'Dinesh Patel',
      harvestDate: '2025-09-23',
    },
    {
      id: 'INV-102',
      lotId: 'LOT-WHT-0923-800',
      crop: 'WHEAT',
      grade: 'Grade B',
      totalVerifiedKg: 780,
      availableKg: 380,
      reservedKg: 400,
      location: 'Hub #1 - Grain Warehouse Bay 3',
      freshness: 'Harvested 1d ago • 240d shelf life',
      pricePerKg: 31.0,
      farmerName: 'Suresh Varma',
      harvestDate: '2025-09-23',
    },
    {
      id: 'INV-103',
      lotId: 'LOT-POT-0922-600',
      crop: 'POTATO',
      grade: 'Grade A',
      totalVerifiedKg: 590,
      availableKg: 590,
      reservedKg: 0,
      location: 'Hub #1 - Ventilated Vault B',
      freshness: 'Harvested 2d ago • 45d shelf life',
      pricePerKg: 22.0,
      farmerName: 'Bhavesh Rathod',
      harvestDate: '2025-09-22',
    },
  ])

  // ==========================================================================
  // Dispatch Consignments States
  // ==========================================================================
  const [dispatches, setDispatches] = useState<DispatchConsignment[]>([
    {
      id: 'DISP-801',
      orderId: 'ord-101',
      orderCode: 'AG-1001',
      buyerName: 'PM POSHAN Central Kitchen, Anand',
      fpo: 'Mahi Valley FPO Hub #1',
      crop: 'PADDY',
      quantityKg: 1000,
      destination: 'Nana Bazaar, Vallabh Vidyanagar',
      distanceKm: 18.4,
      vehicle: 'Tata Ace (GJ-07-TY-4912)',
      driver: 'Vikram Singh',
      driverPhone: '+91 98252 88102',
      status: 'Dispatched',
      dispatchedAt: '2025-09-24T08:15:00Z',
      waybillNo: 'WB-MV-2025-8812',
    },
    {
      id: 'DISP-802',
      orderId: 'ord-102',
      orderCode: 'AG-1002',
      buyerName: 'District Hospital Dietary Kitchen',
      fpo: 'Mahi Valley FPO Hub #1',
      crop: 'TOMATO',
      quantityKg: 392,
      destination: 'Civil Hospital Road, Anand',
      distanceKm: 9.8,
      vehicle: 'Mahindra Bolero Maxi (GJ-23-V-8104)',
      driver: 'Kishore Parmar',
      driverPhone: '+91 98253 99201',
      status: 'Loading',
      waybillNo: 'WB-MV-2025-8813',
    },
    {
      id: 'DISP-803',
      orderId: 'ord-103',
      orderCode: 'AG-1003',
      buyerName: 'Student Mess Cooperative',
      fpo: 'Mahi Valley FPO Hub #1',
      crop: 'WHEAT',
      quantityKg: 780,
      destination: 'Boriavi Chokdi Depot',
      distanceKm: 12.2,
      vehicle: 'Ashok Leyland Dost (GJ-07-AL-3142)',
      driver: 'Manoj Solanki',
      driverPhone: '+91 98254 11092',
      status: 'Scheduled',
      waybillNo: 'WB-MV-2025-8814',
    },
  ])

  const [selectedWaybill, setSelectedWaybill] = useState<DispatchConsignment | null>(null)

  // ==========================================================================
  // Logistics Fleet & Driver States
  // ==========================================================================
  const fleetVehicles: FleetVehicle[] = [
    {
      id: 'VEH-01',
      name: 'Tata Ace 0.75T',
      registration: 'GJ-07-TY-4912',
      capacityKg: 850,
      currentLoadKg: 850,
      status: 'En Route',
      driverName: 'Vikram Singh',
      driverPhone: '+91 98252 88102',
      fuelType: 'CNG (Green Fleet)',
    },
    {
      id: 'VEH-02',
      name: 'Mahindra Bolero Maxi',
      registration: 'GJ-23-V-8104',
      capacityKg: 1300,
      currentLoadKg: 392,
      status: 'Assigned',
      driverName: 'Kishore Parmar',
      driverPhone: '+91 98253 99201',
      fuelType: 'Diesel BS-VI',
    },
    {
      id: 'VEH-03',
      name: 'Ashok Leyland Dost',
      registration: 'GJ-07-AL-3142',
      capacityKg: 1500,
      currentLoadKg: 0,
      status: 'Available',
      driverName: 'Manoj Solanki',
      driverPhone: '+91 98254 11092',
      fuelType: 'Diesel BS-VI',
    },
  ]

  const fleetDrivers: FleetDriver[] = [
    {
      id: 'DRV-01',
      name: 'Vikram Singh',
      phone: '+91 98252 88102',
      licenseNo: 'GJ-07201800192',
      assignedVehicle: 'Tata Ace (GJ-07-TY-4912)',
      rating: 4.9,
      tripsCompleted: 142,
      status: 'Driving',
    },
    {
      id: 'DRV-02',
      name: 'Kishore Parmar',
      phone: '+91 98253 99201',
      licenseNo: 'GJ-23201900481',
      assignedVehicle: 'Mahindra Bolero Maxi (GJ-23-V-8104)',
      rating: 4.8,
      tripsCompleted: 98,
      status: 'On Duty',
    },
    {
      id: 'DRV-03',
      name: 'Manoj Solanki',
      phone: '+91 98254 11092',
      licenseNo: 'GJ-07202000312',
      assignedVehicle: 'Ashok Leyland Dost (GJ-07-AL-3142)',
      rating: 4.9,
      tripsCompleted: 114,
      status: 'On Duty',
    },
  ]

  // ==========================================================================
  // Payments & Settlements States
  // ==========================================================================
  const [settlements, setSettlements] = useState<FarmerSettlementRecord[]>([
    {
      id: 'SET-901',
      farmerId: 'farmer-anand-002',
      farmerName: 'Dinesh Patel',
      lotId: 'LOT-PAD-0923-500',
      crop: 'PADDY',
      weighedKg: 495,
      agreedPricePerKg: 28.0,
      grossAmount: 13860,
      weighbridgeFee: 150,
      transportShare: 350,
      netPayable: 13360,
      status: 'Credited',
      bankAccountMasked: 'HDFC Bank •••• 4102',
      utrRef: 'HDFCN25267104921',
      paidAt: '2025-09-23T18:30:00Z',
    },
    {
      id: 'SET-902',
      farmerId: 'farmer-anand-003',
      farmerName: 'Suresh Varma',
      lotId: 'LOT-WHT-0923-800',
      crop: 'WHEAT',
      weighedKg: 780,
      agreedPricePerKg: 31.0,
      grossAmount: 24180,
      weighbridgeFee: 200,
      transportShare: 520,
      netPayable: 23460,
      status: 'Credited',
      bankAccountMasked: 'Bank of Baroda •••• 8821',
      utrRef: 'BARBN25267119283',
      paidAt: '2025-09-23T19:00:00Z',
    },
    {
      id: 'SET-903',
      farmerId: 'farmer-anand-001',
      farmerName: 'Ramesh Kumar',
      lotId: 'LOT-TOM-0924-392',
      crop: 'TOMATO',
      weighedKg: 392,
      agreedPricePerKg: 30.0,
      grossAmount: 11760,
      weighbridgeFee: 120,
      transportShare: 280,
      netPayable: 11360,
      status: 'Processing',
      bankAccountMasked: 'State Bank of India •••• 5591',
      utrRef: 'Pending Batch Run',
      paidAt: '2025-09-24T09:10:00Z',
    },
  ])

  const buyerEscrowRecords: BuyerEscrowRecord[] = [
    {
      id: 'ESC-401',
      orderCode: 'AG-1001',
      buyerName: 'PM POSHAN Central Kitchen, Anand',
      crop: 'PADDY',
      targetKg: 1000,
      advanceDeposit: 14000,
      escrowStatus: 'Locked in Escrow',
      invoicedAmount: 28000,
      balancePayable: 14000,
      settlementStatus: 'Advance Funded',
    },
    {
      id: 'ESC-402',
      orderCode: 'AG-1002',
      buyerName: 'District Hospital Dietary Kitchen',
      crop: 'TOMATO',
      targetKg: 400,
      advanceDeposit: 6000,
      escrowStatus: 'Locked in Escrow',
      invoicedAmount: 11760,
      balancePayable: 5760,
      settlementStatus: 'Pending Delivery Confirmation',
    },
    {
      id: 'ESC-403',
      orderCode: 'AG-1003',
      buyerName: 'Student Mess Cooperative',
      crop: 'WHEAT',
      targetKg: 2000,
      advanceDeposit: 31000,
      escrowStatus: 'Partially Released',
      invoicedAmount: 62000,
      balancePayable: 31000,
      settlementStatus: 'Advance Funded',
    },
  ]

  // ==========================================================================
  // Bolna AI Calling State
  // ==========================================================================
  const [bolnaModalOpen, setBolnaModalOpen] = useState(false)
  const [selectedCallFarmer, setSelectedCallFarmer] = useState<LiveFarmer | null>(null)
  const [selectedCallAllocatedKg, setSelectedCallAllocatedKg] = useState<number>(300)

  // ==========================================================================
  // Data Fetching & Sync
  // ==========================================================================
  const fetchLiveFeeds = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const { data: session } = await getAuthClient().auth.getSession()
      const token = session.session?.access_token
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const [ordersRes, farmersRes] = await Promise.all([
        fetch('/api/orders', { headers }).catch(() => null),
        fetch('/api/farmers', { headers }).catch(() => null),
      ])

      if (ordersRes && ordersRes.ok) {
        const ordData = await ordersRes.json().catch(() => null)
        if (ordData?.orders && Array.isArray(ordData.orders)) {
          setOrders(ordData.orders)
        }
      }

      if (farmersRes && farmersRes.ok) {
        const farmData = await farmersRes.json().catch(() => null)
        if (farmData?.farmers && Array.isArray(farmData.farmers)) {
          setFarmers(farmData.farmers)
        }
      }
    } catch {
      // Keep existing data gracefully
    } finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveFeeds()
    setWfState(getWorkflowState())
    const timer = setInterval(() => {
      fetchLiveFeeds(false)
      setWfState(getWorkflowState())
    }, 8000)

    const handleWfSync = () => setWfState(getWorkflowState())
    window.addEventListener('agrilink:workflow-updated', handleWfSync)

    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = (e) => {
          fetchLiveFeeds(false)
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
      window.removeEventListener('agrilink:workflow-updated', handleWfSync)
      try {
        bc?.close()
      } catch {}
    }
  }, [fetchLiveFeeds])

  // ==========================================================================
  // Dynamic Live Workflow Mappings for Primary Demo
  // ==========================================================================
  const liveVerifiedInventory: VerifiedStockItem[] = useMemo(() => {
    const stage = wfState.stage
    const invItem = wfState.inventory[0]
    if (stage >= 4 && invItem) {
      const demoItem: VerifiedStockItem = {
        id: invItem.id,
        lotId: invItem.lotCode,
        crop: invItem.crop,
        grade: invItem.grade === 'B' ? 'Grade B' : 'Grade A',
        totalVerifiedKg: invItem.totalVerifiedKg,
        availableKg: invItem.availableKg, // 370 kg at stage 4, 70 kg at stage 5+
        reservedKg: invItem.reservedKg,   // 0 kg at stage 4, 300 kg at stage 5+
        location: invItem.storageLocation,
        freshness: 'Harvested today • Fresh produce',
        pricePerKg: 30.0,
        farmerName: 'Ravi Kumar',
        harvestDate: new Date().toISOString().slice(0, 10),
      }
      return [demoItem, ...verifiedInventory.filter((i) => i.lotId !== invItem.lotCode)]
    }
    return verifiedInventory
  }, [wfState, verifiedInventory])

  const liveDispatches: DispatchConsignment[] = useMemo(() => {
    const stage = wfState.stage
    const dsp = wfState.dispatches[0]
    if (stage >= 5) {
      const demoDisp: DispatchConsignment = {
        id: dsp?.id || 'DISP-802',
        orderId: 'ord-102',
        orderCode: dsp?.orderCode || 'AG-1002',
        buyerName: 'PM POSHAN Central Kitchen, Anand',
        fpo: 'Mahi Valley FPO Hub #1',
        crop: 'TOMATO',
        quantityKg: dsp?.qtyKg || 300,
        destination: 'PM POSHAN Central Kitchen, Station Road',
        distanceKm: 9.8,
        vehicle: dsp?.vehicleNo || 'Tata Ace 1.5t (AP XX XX 1234)',
        driver: dsp?.driverName || 'Rameshwar Logistics',
        driverPhone: dsp?.driverPhone || '+91 98765 43210',
        status: stage >= 7 ? 'Delivered' : stage >= 6 ? 'Dispatched' : 'Loading',
        dispatchedAt: dsp?.dispatchedAt || (stage >= 6 ? new Date().toISOString() : undefined),
        waybillNo: dsp?.dispatchCode ? `WB-${dsp.dispatchCode}` : 'WB-MV-2026-1042',
      }
      return [demoDisp, ...dispatches.filter((d) => d.orderCode !== 'AG-1002')]
    }
    return dispatches
  }, [wfState, dispatches])

  const liveSettlements: FarmerSettlementRecord[] = useMemo(() => {
    const stage = wfState.stage
    const set = wfState.settlements[0]
    if (stage >= 4) {
      const demoSet: FarmerSettlementRecord = {
        id: set?.id || 'SET-903',
        farmerId: 'f-ravi',
        farmerName: set?.farmerName || 'Ravi Kumar',
        lotId: set?.lotCode || 'LOT-TOM-0924-392',
        crop: 'TOMATO',
        weighedKg: set?.weighedKg || 392,
        agreedPricePerKg: set?.agreedPricePerKg || 30.0,
        grossAmount: set?.grossAmount || 11100,
        weighbridgeFee: set?.weighbridgeFee || 120,
        transportShare: set?.transportShare || 120,
        netPayable: set?.netPayable || 10860, // Exactly ₹10,860 net!
        status: stage >= 7 ? 'Credited' : 'Processing',
        bankAccountMasked: set?.bankAccount || 'State Bank of India •••• 4920',
        utrRef: stage >= 7 ? (set?.utrCode || 'AGR-2026-98124') : 'Pending Final Delivery Sign-off',
        paidAt: set?.settledAt || new Date().toISOString(),
      }
      return [demoSet, ...settlements.filter((s) => s.farmerName !== 'Ravi Kumar' && s.lotId !== 'LOT-TOM-0924-392')]
    }
    return settlements
  }, [wfState, settlements])

  // ==========================================================================
  // Derived KPIs for Home
  // ==========================================================================
  const kpiCollectionRequests = collections.length
  const kpiProduceReceivedKg = useMemo(() => {
    const fromLots = verificationLots.reduce((acc, l) => acc + l.scaleKg, 0)
    return fromLots > 0 ? fromLots : 4850
  }, [verificationLots])
  const kpiPendingVerification = verificationLots.filter((l) => l.status === 'Pending QC').length
  const kpiVerifiedInventoryKg = verifiedInventory.reduce((acc, i) => acc + i.totalVerifiedKg, 0)
  const kpiPendingOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'SETTLED').length || 4
  const kpiDispatches = dispatches.filter((d) => d.status !== 'Delivered').length
  const kpiPendingPayments = settlements
    .filter((s) => s.status === 'Processing')
    .reduce((acc, s) => acc + s.netPayable, 0) || 64200

  // ==========================================================================
  // Handlers for Receive & Weigh
  // ==========================================================================
  function handleStartWeigh(collection: CollectionItem) {
    setSelectedCollectionForWeigh(collection)
    setSimulatedGrossKg(collection.declaredKg + 7)
    setSimulatedTareKg(15)
    setCustomConfirmedKg(Math.max(10, collection.declaredKg - 8))
    setCollectionSubView('weigh')
  }

  function handleConfirmWeightAndCreateLot() {
    if (!selectedCollectionForWeigh) return
    setIsWeighingSubmitting(true)

    const declared = selectedCollectionForWeigh.declaredKg
    const scale = customConfirmedKg
    const newLotId = `LOT-${selectedCollectionForWeigh.crop.slice(0, 3)}-${new Date().toISOString().slice(5, 10).replace('-', '')}-${scale}`

    setTimeout(() => {
      // 1. Advance unified workflow state
      const nextWf = step3ReceiveAndWeigh(scale, selectedCollectionForWeigh.id)
      setWfState(nextWf)

      // 2. Update collection record
      setCollections((prev) =>
        prev.map((c) =>
          c.id === selectedCollectionForWeigh.id
            ? {
                ...c,
                status: 'Weighed & Lot Created',
                scaleKg: scale,
                confirmedKg: scale,
                lotId: newLotId,
                auditOperator: 'Anita Desai (QC Staff)',
                auditTimestamp: new Date().toISOString(),
                scaleGrossKg: simulatedGrossKg,
                scaleTareKg: simulatedTareKg,
              }
            : c
        )
      )

      // 3. Create new Verification Lot entry
      const newLot: VerificationLot = {
        id: newLotId,
        requestId: selectedCollectionForWeigh.id,
        farmerId: selectedCollectionForWeigh.farmerId,
        farmerName: selectedCollectionForWeigh.farmerName,
        village: selectedCollectionForWeigh.village,
        crop: selectedCollectionForWeigh.crop,
        declaredKg: declared,
        scaleKg: scale,
        grade: 'Grade A',
        aiConfidence: 94,
        status: 'Pending QC',
        acceptedKg: scale,
        rejectedKg: 0,
        reason: 'Weighbridge reading validated; ready for GradeCam inspection',
        verifier: 'Anita Desai (QC Staff)',
        timestamp: new Date().toISOString(),
      }

      setVerificationLots((prev) => [newLot, ...prev.filter((l) => l.id !== newLotId)])

      setIsWeighingSubmitting(false)
      setCollectionSubView('list')
      flash('ok', `Weight confirmed: ${scale} kg (Declared: ${declared} kg). Created Lot ${newLotId}!`)

      // Auto-navigate to verification tab
      setActiveTab('verification')
    }, 600)
  }

  // ==========================================================================
  // Handlers for Quality Verification & Staff Review
  // ==========================================================================
  function handleOpenStaffReview(lot: VerificationLot) {
    setActiveReviewLot(lot)
    setReviewGradeChoice(lot.grade === 'Grade B' ? 'Grade B' : 'Grade A')
    setReviewAcceptedKg(lot.crop === 'TOMATO' ? 370 : lot.scaleKg)
    setReviewRejectedKg(lot.crop === 'TOMATO' ? 22 : 0)
    setReviewReasonNote(lot.reason || 'Meets visual quality standards for institutional buyers.')
  }

  function handleSaveStaffReview(decision: 'ACCEPT' | 'REJECT') {
    if (!activeReviewLot) return

    if (decision === 'ACCEPT') {
      const acceptedKg = reviewAcceptedKg
      const rejectedKg = reviewRejectedKg || Math.max(0, activeReviewLot.scaleKg - acceptedKg)
      const grade = reviewGradeChoice === 'Grade B' ? 'B' : 'A'

      // Advance unified workflow engine to Stage 4 (370 kg accepted -> 370 kg verified inventory)
      const nextWf = step4QualityVerifyAndCreateInventory(acceptedKg, rejectedKg, grade)
      setWfState(nextWf)

      const newStock: VerifiedStockItem = {
        id: `INV-${Date.now().toString().slice(-4)}`,
        lotId: activeReviewLot.id,
        crop: activeReviewLot.crop,
        grade: reviewGradeChoice === 'Grade B' ? 'Grade B' : 'Grade A',
        totalVerifiedKg: acceptedKg,
        availableKg: acceptedKg,
        reservedKg: 0,
        location: 'Hub #1 - Storage Bay A',
        freshness: 'Harvested today • Fresh produce',
        pricePerKg: activeReviewLot.crop === 'TOMATO' ? 30 : activeReviewLot.crop === 'PADDY' ? 28 : 31,
        farmerName: activeReviewLot.farmerName,
        harvestDate: new Date().toISOString().slice(0, 10),
      }

      // Add to verified stock
      setVerifiedInventory((prev) => [newStock, ...prev.filter((i) => i.lotId !== activeReviewLot.id)])

      // Update lot status
      setVerificationLots((prev) =>
        prev.map((l) =>
          l.id === activeReviewLot.id
            ? {
                ...l,
                status: 'Verified',
                grade: reviewGradeChoice,
                acceptedKg,
                rejectedKg: reviewRejectedKg,
                reason: reviewReasonNote,
                timestamp: new Date().toISOString(),
              }
            : l
        )
      )

      // Add to settlements ledger (Exact ₹10,860 net for 370 kg Tomato: 370 * 30 - 240)
      const agreedRate = activeReviewLot.crop === 'TOMATO' ? 30 : activeReviewLot.crop === 'PADDY' ? 28 : 31
      const gross = acceptedKg * agreedRate
      const net = gross - 240 // Disclosed standard deductions: ₹120 weighbridge + ₹120 transport share
      const newSettlement: FarmerSettlementRecord = {
        id: `SET-${Date.now().toString().slice(-3)}`,
        farmerId: activeReviewLot.farmerId,
        farmerName: activeReviewLot.farmerName,
        lotId: activeReviewLot.id,
        crop: activeReviewLot.crop,
        weighedKg: acceptedKg,
        agreedPricePerKg: agreedRate,
        grossAmount: gross,
        weighbridgeFee: 120,
        transportShare: 120,
        netPayable: net,
        status: 'Processing',
        bankAccountMasked: 'State Bank of India •••• 4920',
        utrRef: 'Pending Final Delivery Sign-off',
        paidAt: new Date().toISOString(),
      }
      setSettlements((prev) => [newSettlement, ...prev])

      flash('ok', `Lot ${activeReviewLot.id} verified as ${reviewGradeChoice}! Added to Verified Inventory.`)
    } else {
      setVerificationLots((prev) =>
        prev.map((l) =>
          l.id === activeReviewLot.id
            ? {
                ...l,
                status: 'Rejected',
                acceptedKg: 0,
                rejectedKg: activeReviewLot.scaleKg,
                reason: reviewReasonNote || 'Produce does not meet minimum quality threshold.',
                timestamp: new Date().toISOString(),
              }
            : l
        )
      )
      flash('error', `Lot ${activeReviewLot.id} marked Rejected.`)
    }

    setActiveReviewLot(null)
  }

  // ==========================================================================
  // Render Navigation Tabs Header
  // ==========================================================================
  const navTabs = [
    { key: 'home', label: 'Home', icon: LayoutDashboard },
    { key: 'farmers', label: 'Farmers', icon: Users, badge: farmers.length || 18 },
    { key: 'collections', label: 'Collections', icon: Scale, badge: collections.length },
    { key: 'verification', label: 'Verification', icon: ShieldCheck, badge: kpiPendingVerification },
    { key: 'inventory', label: 'Inventory', icon: Boxes, badge: verifiedInventory.length },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: orders.length || 4 },
    { key: 'dispatch', label: 'Dispatch', icon: Truck, badge: dispatches.length },
    { key: 'logistics', label: 'Logistics', icon: Route },
    { key: 'payments', label: 'Payments', icon: CircleDollarSign },
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground font-sans pb-20">
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

      {/* Top Banner & Hub Controls */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                  Mahi Valley FPO Command Center
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Hub Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Anand District Central Collection Hub #1 • Operational Staff Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveFeeds(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-secondary px-3 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Refresh live feeds"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-secondary px-3 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Switch Role</span>
            </Link>
          </div>
        </div>

        {/* 9-Tab Navigation Bar */}
        <nav aria-label="FPO Navigation" className="max-w-7xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon
            const isCurrent = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as AdminTabKey)
                  if (tab.key === 'collections') setCollectionSubView('list')
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      isCurrent ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* =================================================================== */}
        {/* TAB 1: HOME (7 KPIs, Pending Actions, Recent Activity, Alerts)     */}
        {/* =================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* 7 Core Operational KPIs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Operational Command Metrics
                </h2>
                <span className="text-xs text-muted-foreground">Real-time Hub Telemetry</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* 1. Collection Requests */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground block truncate">Collection Requests</span>
                  <p className="mt-1.5 text-2xl font-black text-foreground">{kpiCollectionRequests}</p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Awaiting intake</span>
                </div>

                {/* 2. Produce Received */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground block truncate">Produce Received</span>
                  <p className="mt-1.5 text-2xl font-black text-foreground">{formatKg(kpiProduceReceivedKg)}</p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Weighed at hub</span>
                </div>

                {/* 3. Pending Verification */}
                <div className="bg-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block truncate">Pending Verification</span>
                  <p className="mt-1.5 text-2xl font-black text-amber-700 dark:text-amber-400">{kpiPendingVerification}</p>
                  <span className="text-[10px] text-amber-600/80 mt-0.5 block">Awaiting QC scan</span>
                </div>

                {/* 4. Verified Inventory */}
                <div className="bg-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block truncate">Verified Inventory</span>
                  <p className="mt-1.5 text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatKg(kpiVerifiedInventoryKg)}</p>
                  <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Ready in cold bays</span>
                </div>

                {/* 5. Pending Orders */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground block truncate">Pending Orders</span>
                  <p className="mt-1.5 text-2xl font-black text-foreground">{kpiPendingOrders}</p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Buyer pool demand</span>
                </div>

                {/* 6. Dispatches */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground block truncate">Active Dispatches</span>
                  <p className="mt-1.5 text-2xl font-black text-foreground">{kpiDispatches}</p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Vehicles en route</span>
                </div>

                {/* 7. Pending Payments */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-muted-foreground block truncate">Pending Payments</span>
                  <p className="mt-1.5 text-xl font-black text-foreground">{formatINR(kpiPendingPayments)}</p>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Disbursement queue</span>
                </div>
              </div>
            </div>

            {/* Pending Actions Desk */}
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-foreground">Immediate Pending Actions</h3>
                </div>
                <span className="text-xs text-muted-foreground">Action Required by FPO Staff</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Weigh incoming harvest from Ramesh Kumar</span>
                    <span className="text-[11px] text-muted-foreground">Tomato (400 kg declared) • Arrived at Bay A</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('collections')
                      const col = collections.find((c) => c.status === 'Pending Weighing') || collections[0]
                      handleStartWeigh(col)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Open Receive & Weigh
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Quality verification for Tomato Lot #LOT-TOM-0924-392</span>
                    <span className="text-[11px] text-muted-foreground">392 kg weighed • Optical GradeCam inspection pending</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Inspect in QC
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Compliance review for PM POSHAN Order #AG-1001</span>
                    <span className="text-[11px] text-muted-foreground">1,000 kg bulk institutional request • Purpose validation required</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Review Order
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Dispatch gatepass ready for District Hospital</span>
                    <span className="text-[11px] text-muted-foreground">Consignment #DISP-802 (392 kg Tomato) • Vehicle loading</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatch')}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground font-bold text-xs shrink-0 cursor-pointer"
                  >
                    View Dispatch
                  </button>
                </div>
              </div>
            </div>

            {/* Split Feed: Recent Collections & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Collections */}
              <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-foreground">Recent Harvest Collections</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('collections')}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {collections.slice(0, 4).map((col) => (
                    <div key={col.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{col.farmerName}</span>
                          <span className="text-muted-foreground">• {col.village}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({col.id})</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {col.crop} • {formatKg(col.declaredKg)} declared • {col.location}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          col.status === 'Weighed & Lot Created'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : col.status === 'In Transit'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {col.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-foreground">Recent Buyer Demands</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {orders.slice(0, 4).map((ord) => (
                    <div key={ord.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{ord.buyer_name || 'Verified Institutional Buyer'}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({ord.code || ord.id.slice(0, 6)})</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {ord.crop || ord.crop_required || 'PADDY'} • {formatKg(ord.qty_target_kg || ord.quantity_required || 1000)} • ₹{ord.price_per_kg || 28}/kg
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                        {ord.status || 'SOURCING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operational Alerts */}
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ShieldAlert className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Operational System Alerts</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold block">✓ Weighbridge Terminal Online</span>
                  <span className="text-[11px] opacity-90">Terminal #WB-01 calibrated. Standard Avery Berkel interface synchronized.</span>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200">
                  <span className="font-bold block">✓ Cold Room Bay 2 at 8.2°C</span>
                  <span className="text-[11px] opacity-90">Optimal climate control active for harvested tomatoes and leafy lots.</span>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <span className="font-bold block">⏳ Consignment #DISP-801 En Route</span>
                  <span className="text-[11px] opacity-90">Tata Ace GJ-07-TY-4912 within 4.2 km of Nana Bazaar destination depot.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FARMERS (Roster Table with 7 specified columns)             */}
        {/* =================================================================== */}
        {activeTab === 'farmers' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Smallholder Cluster Farmers</h2>
                <p className="text-xs text-muted-foreground">
                  Verified farmers registered with Mahi Valley FPO cluster across Anand sub-districts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Total: {farmers.length || 18}</span>
              </div>
            </div>

            {/* Farmers Table */}
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Farmer</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Crops</th>
                      <th className="px-4 py-3">Active Produce</th>
                      <th className="px-4 py-3">Collection Status</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {farmers.length > 0 ? (
                      farmers.map((farmer) => {
                        const cropList = farmer.crop_name || farmer.crop || 'Tomato, Paddy'
                        const readyKg = farmer.quantity || farmer.registered_kg || 400
                        const isVerified = farmer.verified !== false
                        return (
                          <tr key={farmer.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  {farmer.name.slice(0, 1)}
                                </div>
                                <div>
                                  <span className="font-bold block">{farmer.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{farmer.mobile_number || '+91 98251 •••••'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{farmer.village || 'Anand Rural'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md bg-secondary font-semibold text-foreground">
                                {cropList}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                              {formatKg(readyKg)} ready
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                {farmer.collection_status || 'Scheduled'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isVerified
                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isVerified ? '✓ Verified Farmer' : 'Assisted Review'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCallFarmer(farmer)
                                    setBolnaModalOpen(true)
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold cursor-pointer"
                                  title="AI Voice Call Confirmation"
                                >
                                  <PhoneCall className="size-3 text-emerald-600 inline mr-1" /> Call
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('collections')
                                    const col = collections.find((c) => c.farmerId === farmer.id) || collections[0]
                                    handleStartWeigh(col)
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer"
                                >
                                  Schedule
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No farmers currently loaded. Synchronizing directory...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: COLLECTIONS (With embedded Receive & Weigh detail view)       */}
        {/* =================================================================== */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            {collectionSubView === 'weigh' && selectedCollectionForWeigh ? (
              /* Embedded Detail Screen: Receive & Weigh */
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCollectionSubView('list')}
                      className="text-xs text-primary font-bold hover:underline mb-1 flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Collections Pool
                    </button>
                    <h2 className="text-xl font-bold text-foreground">
                      Weighbridge Intake & Lot Creation: {selectedCollectionForWeigh.farmerName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Request ID: {selectedCollectionForWeigh.id} • {selectedCollectionForWeigh.crop} • {selectedCollectionForWeigh.village}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Intake Station #WB-01
                    </span>
                  </div>
                </div>

                {/* Scale Hardware Connection Banner */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs text-blue-950 dark:text-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Weighbridge Connected:</strong> Avery Berkel 500kg Industrial Platform (Simulated Sensor Interface Active)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-500/20 px-2 py-0.5 rounded font-bold">
                    CALIBRATED 2025-09-01
                  </span>
                </div>

                {/* Comparative Weight Verification Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Declared Quantity */}
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Declared by Farmer
                    </span>
                    <p className="mt-2 text-3xl font-black text-foreground">
                      {selectedCollectionForWeigh.declaredKg} <span className="text-sm font-bold">KG</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">From harvest registry declaration</p>
                  </div>

                  {/* 2. Scale Reading */}
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                        Digital Scale Reading
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                        Live Net
                      </span>
                    </div>
                    <p className="mt-2 text-3xl font-black text-primary">
                      {customConfirmedKg} <span className="text-sm font-bold">KG</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Gross: {simulatedGrossKg} kg - Tare: {simulatedTareKg} kg (crates)
                    </p>
                  </div>

                  {/* 3. Confirmed Quantity & Variance */}
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Confirmed Lot Weight
                    </span>
                    <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
                      {customConfirmedKg} <span className="text-sm font-bold">KG</span>
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
                      Variance: {customConfirmedKg - selectedCollectionForWeigh.declaredKg} kg (-2.0% handling/shrinkage)
                    </p>
                  </div>
                </div>

                {/* Scale Simulation Controls for Prototype */}
                <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Simulate Weighbridge Scale Load (Prototype Control)
                    </h4>
                    <span className="text-[10px] text-muted-foreground">Preset Tare & Gross Readings</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: '392 kg (Typical 2% shrink)', val: 392, gross: 407, tare: 15 },
                      { label: '400 kg (Exact 100% match)', val: 400, gross: 415, tare: 15 },
                      { label: '385 kg (3.7% dry weight)', val: 385, gross: 400, tare: 15 },
                      { label: '410 kg (+2.5% surplus)', val: 410, gross: 425, tare: 15 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => {
                          setCustomConfirmedKg(preset.val)
                          setSimulatedGrossKg(preset.gross)
                          setSimulatedTareKg(preset.tare)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          customConfirmedKg === preset.val
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label htmlFor="manual-scale-kg-input" className="text-xs font-semibold text-muted-foreground">Manual Scale Override (kg):</label>
                    <input
                      id="manual-scale-kg-input"
                      type="number"
                      value={customConfirmedKg}
                      onChange={(e) => setCustomConfirmedKg(Number(e.target.value) || 0)}
                      className="w-28 px-3 py-1 text-sm font-bold bg-card border border-border rounded-lg"
                    />
                  </div>
                </div>

                {/* Audit & Intake Confirmation */}
                <div className="p-4 rounded-xl border border-border bg-secondary/20 text-xs space-y-2">
                  <span className="font-bold text-foreground block">Auditable Reception Log:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground text-[11px]">
                    <div>Operator: <strong>Anita Desai (QC Staff)</strong></div>
                    <div>Terminal: <strong>Depot #WB-01</strong></div>
                    <div>Timestamp: <strong>{new Date().toLocaleTimeString()}</strong></div>
                    <div>Order Ref: <strong>{selectedCollectionForWeigh.orderCode || 'AG-1002'}</strong></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollectionSubView('list')}
                    className="px-4 py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isWeighingSubmitting}
                    onClick={handleConfirmWeightAndCreateLot}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isWeighingSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating Lot Record...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Confirm Weight ({customConfirmedKg} kg) & Create Lot →
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Collections Table View */
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Harvest Collection Requests</h2>
                    <p className="text-xs text-muted-foreground">
                      Pickup requests from smallholder cluster plots; schedule hub slots and receive at weighbridge.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunRouteOptimization}
                    className="px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Route className="size-3.5 text-primary" /> Optimize All Routes
                  </button>
                </div>

                <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3">Request ID</th>
                          <th className="px-4 py-3">Farmer</th>
                          <th className="px-4 py-3">Crop</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Preferred Date/Time</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {collections.map((col) => (
                          <tr key={col.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-foreground">{col.id}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <div>
                                <span>{col.farmerName}</span>
                                <span className="block text-[10px] text-muted-foreground">{col.village}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold">{col.crop}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">
                              {formatKg(col.declaredKg)} declared
                              {col.confirmedKg && (
                                <span className="block text-[10px] text-emerald-600 font-semibold">
                                  Weighed: {formatKg(col.confirmedKg)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{col.preferredSlot}</td>
                            <td className="px-4 py-3 text-muted-foreground">{col.location}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  col.status === 'Weighed & Lot Created'
                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                    : col.status === 'In Transit'
                                    ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {col.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => flash('ok', `Scheduled slot confirmed for ${col.farmerName}: ${col.preferredSlot}`)}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold cursor-pointer"
                                >
                                  Schedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartWeigh(col)}
                                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-2xs"
                                >
                                  Receive & Weigh →
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: VERIFICATION (6-Step Pipeline & Staff Review Desk)           */}
        {/* =================================================================== */}
        {activeTab === 'verification' && (
          <div className="space-y-5">
            {/* 6-Step Visual Pipeline Header */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Quality Verification Pipeline Flow
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-bold">
                <div className="p-2 rounded-xl bg-secondary text-foreground">1. Receive</div>
                <div className="p-2 rounded-xl bg-secondary text-foreground">2. Weigh</div>
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  3. Quality Check / GradeCam
                </div>
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  4. Staff Review
                </div>
                <div className="p-2 rounded-xl bg-secondary text-foreground">5. Accept / Reject</div>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-black">
                  6. Verified Stock
                </div>
              </div>
            </div>

            {/* Verification Desk Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Lot Quality Verification Queue</h2>
                <p className="text-xs text-muted-foreground">
                  Verify optical grade standards, record defect analysis, and approve lots into Verified Stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGradeCamModal(!showGradeCamModal)}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Camera className="size-4" /> {showGradeCamModal ? 'Close GradeCam Scanner' : 'Launch GradeCam AI'}
              </button>
            </div>

            {/* GradeCam Scanner Modal / Box */}
            {showGradeCamModal && (
              <div className="bg-card p-5 rounded-2xl border border-emerald-500/30 shadow-md space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-foreground">Optical Produce Grading Frame</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGradeCamModal(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="rounded-xl overflow-hidden bg-black border border-border">
                    <GradeCamCamera
                      onCapture={(url) => {
                        flash('ok', 'Optical frame captured. Grade A verified with 95% confidence!')
                        setShowGradeCamModal(false)
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <h4 className="font-bold text-foreground">GradeCam Inspection Protocol:</h4>
                    <p>• Optical analysis checks skin uniformity, maturity coloration, and physical blemishes.</p>
                    <p>• Grade A: Defect area &lt;5%, uniform ripeness &gt;85%.</p>
                    <p>• Grade B: Defect area 5–12%, suitable for institutional kitchen cooking.</p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          flash('ok', 'Simulated optical scan: Grade A (94% confidence) confirmed!')
                          setShowGradeCamModal(false)
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Simulate AI Grade A Scan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Queue Table */}
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Lot ID</th>
                      <th className="px-4 py-3">Crop</th>
                      <th className="px-4 py-3">Scale Quantity</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Accepted / Rejected</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Verifier</th>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {verificationLots.map((lot) => (
                      <tr key={lot.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{lot.id}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {lot.crop}
                          <span className="block text-[10px] text-muted-foreground">{lot.farmerName}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{formatKg(lot.scaleKg)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lot.grade === 'Grade A'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : lot.grade === 'Grade B'
                                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {lot.grade} {lot.aiConfidence ? `(${lot.aiConfidence}%)` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {formatKg(lot.acceptedKg)}
                          </span>
                          {lot.rejectedKg > 0 && (
                            <span className="text-destructive font-semibold ml-1">
                              / {formatKg(lot.rejectedKg)} rej
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{lot.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lot.verifier}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {new Date(lot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {lot.status === 'Verified' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">✓ In Stock</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStaffReview(lot)}
                              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Staff Review →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staff Review Modal / Drawer */}
            {activeReviewLot && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-bold text-base text-foreground">
                      Staff Quality Decision: {activeReviewLot.id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveReviewLot(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-secondary/40 text-muted-foreground flex justify-between">
                      <span>Produce: <strong>{activeReviewLot.crop}</strong></span>
                      <span>Farmer: <strong>{activeReviewLot.farmerName}</strong></span>
                      <span>Weighed: <strong>{formatKg(activeReviewLot.scaleKg)}</strong></span>
                    </div>

                    <div>
                      <label className="font-bold text-foreground block mb-1">Assigned Quality Grade</label>
                      <div className="flex gap-2">
                        {(['Grade A', 'Grade B', 'Grade C'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setReviewGradeChoice(g)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              reviewGradeChoice === g
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border text-foreground hover:bg-secondary'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="review-accepted-kg-input" className="font-bold text-foreground block mb-1">Accepted Quantity (kg)</label>
                        <input
                          id="review-accepted-kg-input"
                          type="number"
                          value={reviewAcceptedKg}
                          onChange={(e) => {
                            const acc = Math.max(0, Number(e.target.value) || 0)
                            setReviewAcceptedKg(acc)
                            setReviewRejectedKg(Math.max(0, activeReviewLot.scaleKg - acc))
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl font-bold"
                        />
                      </div>
                      <div>
                        <label htmlFor="review-rejected-kg-input" className="font-bold text-foreground block mb-1">Rejected Quantity (kg)</label>
                        <input
                          id="review-rejected-kg-input"
                          type="number"
                          value={reviewRejectedKg}
                          onChange={(e) => {
                            const rej = Math.max(0, Number(e.target.value) || 0)
                            setReviewRejectedKg(rej)
                            setReviewAcceptedKg(Math.max(0, activeReviewLot.scaleKg - rej))
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl font-bold text-destructive"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="review-reason-note-area" className="font-bold text-foreground block mb-1">Quality Inspection Reason / Note</label>
                      <textarea
                        id="review-reason-note-area"
                        rows={2}
                        value={reviewReasonNote}
                        onChange={(e) => setReviewReasonNote(e.target.value)}
                        placeholder="State visual inspection criteria..."
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleSaveStaffReview('REJECT')}
                      className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold text-xs cursor-pointer"
                    >
                      Reject Entire Lot
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveStaffReview('ACCEPT')}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs cursor-pointer"
                    >
                      ✓ Approve to Verified Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: INVENTORY (Verified Stock Only)                             */}
        {/* =================================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Verified Hub Inventory</h2>
                <p className="text-xs text-muted-foreground">
                  Strictly verified stock held at Mahi Valley collection hub depots; ready for buyer order allocation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Total Verified Stock: {formatKg(kpiVerifiedInventoryKg)}
                </span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Lot Code</th>
                      <th className="px-4 py-3">Crop</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">Reserved</th>
                      <th className="px-4 py-3">Storage Location</th>
                      <th className="px-4 py-3">Freshness</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveVerifiedInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{item.lotId}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {item.crop}
                          <span className="block text-[10px] text-muted-foreground">{item.farmerName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.grade === 'Grade A'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {item.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {formatKg(item.availableKg)}
                        </td>
                        <td className="px-4 py-3 font-bold text-muted-foreground">
                          {formatKg(item.reservedKg)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.freshness}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          ₹{item.pricePerKg.toFixed(2)}/kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: ORDERS (Buyer Order Pool with Compliance Desk)              */}
        {/* =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Buyer Demand Pool</h2>
                <p className="text-xs text-muted-foreground">
                  Active institutional purchase contracts requiring fulfillment from smallholder cluster aggregation.
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Crop</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Delivery Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((ord) => {
                      const code = ord.code || ord.id.slice(0, 8)
                      const crop = ord.crop || ord.crop_required || 'PADDY'
                      const target = ord.qty_target_kg || ord.quantity_required || 1000
                      const committed = ord.qty_committed_kg || 0
                      return (
                        <tr key={ord.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">#{code}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {ord.buyer_name || 'PM POSHAN Central Kitchen'}
                            <span className="block text-[10px] text-muted-foreground">{ord.delivery_location || 'Anand Central Depot'}</span>
                          </td>
                          <td className="px-4 py-3 font-bold">{crop}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                              Grade A
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">
                            {formatKg(target)}
                            <span className="block text-[10px] text-emerald-600 font-semibold">
                              {formatKg(committed)} committed
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {ord.delivery_date ? localDate(ord.delivery_date, 'en') : '25 Oct 2025'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              {ord.status || 'SOURCING'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                flash('ok', `Allocated 250 kg from Verified Inventory to Order #${code}!`)
                              }}
                              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Allocate Stock
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: DISPATCH (Order, FPO, Qty, Destination, Vehicle, Driver)    */}
        {/* =================================================================== */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Dispatch & Consignment Control</h2>
                <p className="text-xs text-muted-foreground">
                  Consolidated orders mapped to vehicles, drivers, and delivery destination waybills.
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">FPO Hub</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveDispatches.map((disp) => (
                      <tr key={disp.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          #{disp.orderCode}
                          <span className="block text-[10px] text-muted-foreground">{disp.buyerName}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{disp.fpo}</td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {formatKg(disp.quantityKg)}
                          <span className="block text-[10px] text-muted-foreground">{disp.crop}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {disp.destination}
                          <span className="block text-[10px] font-mono text-muted-foreground">({disp.distanceKm} km)</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">{disp.vehicle}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold block">{disp.driver}</span>
                          <span className="text-[10px] text-muted-foreground">{disp.driverPhone}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              disp.status === 'Dispatched'
                                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                                : disp.status === 'Loading'
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : disp.status === 'Delivered'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {disp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {disp.status !== 'Dispatched' && disp.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = step6DispatchConsignment(disp.vehicle)
                                  setWfState(next)
                                  flash('ok', `Consignment #${disp.id} dispatched via ${disp.vehicle}! 300 kg moved to in-transit.`)
                                }}
                                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
                              >
                                Dispatch →
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedWaybill(disp)}
                              className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="size-3 text-primary" /> Waybill
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Waybill Modal */}
            {selectedWaybill && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Official Gatepass</span>
                      <h3 className="font-bold text-base text-foreground">Waybill #{selectedWaybill.waybillNo}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWaybill(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Reference:</span>
                      <span className="font-bold">#{selectedWaybill.orderCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer:</span>
                      <span className="font-bold">{selectedWaybill.buyerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produce:</span>
                      <span className="font-bold">{selectedWaybill.crop} ({formatKg(selectedWaybill.quantityKg)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="font-mono">{selectedWaybill.vehicle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver:</span>
                      <span>{selectedWaybill.driver} ({selectedWaybill.driverPhone})</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-semibold text-right">{selectedWaybill.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.print()
                      }}
                      className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-secondary font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="size-3.5" /> Print Gatepass
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWaybill(null)}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: LOGISTICS (Vehicles, Drivers, Active Trips)                 */}
        {/* =================================================================== */}
        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Fleet Logistics & Route Sequencing</h2>
              <p className="text-xs text-muted-foreground">
                Vehicle fleet allocation, verified driver rosters, and TSP multi-stop corridor optimization.
              </p>
            </div>

            {/* Vehicles and Drivers Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicles */}
              <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">FPO Vehicle Fleet</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{fleetVehicles.length} Vehicles</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {fleetVehicles.map((veh) => (
                    <div key={veh.id} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{veh.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({veh.registration})</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Capacity: {veh.capacityKg} kg • Load: {veh.currentLoadKg} kg • {veh.fuelType}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          veh.status === 'En Route'
                            ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                            : veh.status === 'Assigned'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {veh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drivers */}
              <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-foreground">Assigned Commercial Drivers</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{fleetDrivers.length} Active</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {fleetDrivers.map((drv) => (
                    <div key={drv.id} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{drv.name}</span>
                          <span className="text-[10px] text-muted-foreground">{drv.phone}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          License: {drv.licenseNo} • Assigned: {drv.assignedVehicle}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-600">★ {drv.rating}</span>
                        <span className="block text-[10px] text-muted-foreground">{drv.tripsCompleted} trips</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Trips & Corridor Map */}
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Route className="size-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Active Corridor Trip: Anand Cluster Pickup</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  TSP 2-Opt Optimized: 14.8 km saved
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-border min-h-[340px]">
                <RouteMap
                  stops={[
                    { id: 'stop-depot', kind: 'DEPOT', label: 'Mahi Valley Central Hub #1', lat: 22.5645, lng: 72.9289, kg: 0 },
                    { id: 'stop-p1', kind: 'PICKUP', label: 'Boriavi Cluster (Ramesh Kumar)', lat: 22.5852, lng: 72.9351, kg: 392 },
                    { id: 'stop-p2', kind: 'PICKUP', label: 'Samarkha Cluster (Dinesh Patel)', lat: 22.5712, lng: 72.9812, kg: 495 },
                    { id: 'stop-drop', kind: 'DROP', label: 'PM POSHAN Kitchen Depot', lat: 22.5521, lng: 72.9214, kg: 887 },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 9: PAYMENTS (Settlement Records & Buyer Escrow)                */}
        {/* =================================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Settlement Records & Escrow Audits</h2>
              <p className="text-xs text-muted-foreground">
                Itemized farmer net payouts (accepted weight × agreed price − disclosed deductions) and buyer escrow balances.
              </p>
            </div>

            {/* Farmer Settlement Ledger */}
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Farmer Net Settlement Ledger</h3>
                </div>
                <span className="text-xs text-muted-foreground">Automated Same-Day Bank Payouts</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Farmer</th>
                      <th className="px-4 py-3">Lot Code</th>
                      <th className="px-4 py-3">Weighed Qty</th>
                      <th className="px-4 py-3">Agreed Rate</th>
                      <th className="px-4 py-3">Gross Value</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Net Paid</th>
                      <th className="px-4 py-3">Bank / UTR</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveSettlements.map((set) => (
                      <tr key={set.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">{set.farmerName}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{set.lotId}</td>
                        <td className="px-4 py-3 font-semibold">{formatKg(set.weighedKg)}</td>
                        <td className="px-4 py-3">₹{set.agreedPricePerKg.toFixed(2)}/kg</td>
                        <td className="px-4 py-3 font-bold">{formatINR(set.grossAmount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          -{formatINR(set.weighbridgeFee + set.transportShare)}
                          <span className="block text-[9px]">Weigh: ₹{set.weighbridgeFee} • Trans: ₹{set.transportShare}</span>
                        </td>
                        <td className="px-4 py-3 font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatINR(set.netPayable)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span>{set.bankAccountMasked}</span>
                          <span className="block font-mono text-[9px]">{set.utrRef}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              set.status === 'Credited'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {set.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Buyer Escrow & Balance Accounts */}
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-foreground">Buyer Invoices & Advance Escrow Balances</h3>
                </div>
                <span className="text-xs text-muted-foreground">Buyer Contract Trust Escrow</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Order Code</th>
                      <th className="px-4 py-3">Buyer Name</th>
                      <th className="px-4 py-3">Produce Target</th>
                      <th className="px-4 py-3">Advance Escrow</th>
                      <th className="px-4 py-3">Invoiced Value</th>
                      <th className="px-4 py-3">Balance Due</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {buyerEscrowRecords.map((esc) => (
                      <tr key={esc.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">#{esc.orderCode}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{esc.buyerName}</td>
                        <td className="px-4 py-3 font-bold">
                          {esc.crop} ({formatKg(esc.targetKg)})
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-400">
                          {formatINR(esc.advanceDeposit)}
                          <span className="block text-[9px] text-muted-foreground">{esc.escrowStatus}</span>
                        </td>
                        <td className="px-4 py-3 font-bold">{formatINR(esc.invoicedAmount)}</td>
                        <td className="px-4 py-3 font-bold text-foreground">{formatINR(esc.balancePayable)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {esc.settlementStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      
      {/* 1. Demand Forecasting Drawer/Modal */}
      {/* 2. Indicative Price Estimation Modal */}
      {priceModalOpen && priceModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                  {priceModalData.label}
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {priceModalData.crop} (Grade {priceModalData.grade}) Pricing Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPriceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Formula display */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Deterministic Pricing Formula
              </span>
              <div className="text-xl font-black font-mono text-primary">
                {priceModalData.breakdownFormula}
              </div>
              <p className="text-xs text-muted-foreground">
                Market Reference + Grade Adjustment + Demand Adjustment +/- Location/Logistics Adjustment = Suggested Price
              </p>
            </div>

            {/* Itemized list */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Market Reference (AGMARKNET Modal)</span>
                <span className="font-mono font-bold">₹{priceModalData.marketReferencePerKg.toFixed(2)}/kg</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Grade Adjustment ({priceModalData.grade})</span>
                <span className="font-mono font-bold text-emerald-600">
                  {priceModalData.gradeAdjustmentPerKg >= 0 ? '+' : ''}₹{priceModalData.gradeAdjustmentPerKg.toFixed(2)}/kg
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Demand Adjustment (Institutional Urgency)</span>
                <span className="font-mono font-bold text-emerald-600">
                  +{priceModalData.demandAdjustmentPerKg.toFixed(2)}/kg
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Location/Logistics Amortization (25 km rural)</span>
                <span className="font-mono font-bold text-amber-600">
                  {priceModalData.locationLogisticsAdjustmentPerKg.toFixed(2)}/kg
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-sm">
                <span>Final Indicative / Suggested Price</span>
                <span className="font-mono text-primary text-base">₹{priceModalData.suggestedPricePerKg.toFixed(2)}/kg</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
              <strong>Notice:</strong> {priceModalData.disclosure.disclaimer}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPriceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Route Optimization Results Modal */}
      {routeModalOpen && routeModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Operational Research (Non-AI)
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Route Optimization & Stop Sequencing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRouteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Metrics summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Vehicle</span>
                <span className="text-xs font-bold text-foreground truncate block">{routeModalData.vehicleType}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Distance</span>
                <span className="text-sm font-black text-foreground font-mono">{routeModalData.totalDistanceKm} km</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Est. Duration</span>
                <span className="text-sm font-black text-foreground font-mono">{routeModalData.totalDurationMinutes} min</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Payload Utilization</span>
                <span className="text-sm font-black text-emerald-600 font-mono">
                  {routeModalData.totalPayloadKg} kg ({routeModalData.utilizationPct}%)
                </span>
              </div>
            </div>

            {/* Stop Sequence Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-3 py-2">Seq</th>
                    <th className="px-3 py-2">Stop / Farmer</th>
                    <th className="px-3 py-2">Intake</th>
                    <th className="px-3 py-2">Cumul. Km</th>
                    <th className="px-3 py-2">Arrival ETA</th>
                    <th className="px-3 py-2">Departure</th>
                    <th className="px-3 py-2">Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {routeModalData.stopSequence.map((stop) => (
                    <tr key={stop.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-2 font-mono font-bold text-primary">#{stop.sequenceIndex}</td>
                      <td className="px-3 py-2 font-semibold text-foreground">{stop.label}</td>
                      <td className="px-3 py-2 font-mono">{stop.quantityKg} kg</td>
                      <td className="px-3 py-2 font-mono">{stop.cumulativeDistanceKm} km</td>
                      <td className="px-3 py-2 font-mono font-bold text-emerald-600">{stop.estimatedArrivalTime}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{stop.estimatedDepartureTime}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                          ✓ Met
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground">
              <strong>Algorithm Disclosure:</strong> {routeModalData.disclosure.algorithmName} — calculates optimal TSP tours based on actual rural roadway network and scheduled weighing time windows.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRouteModalOpen(false)
                  flash('ok', 'Optimized dispatch manifest dispatched to driver mobile device.')
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Dispatch Sequence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Supply Allocation Results Modal */}
      {allocationModalOpen && allocationModalData && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Verified Inventory Matcher
                </span>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Supply Allocation Plan: {allocationModalData.buyerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllocationModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Strict Verified Inventory Compliance Alert */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="size-4" /> Strict Compliance Rule: Verified Stock Only
              </div>
              <p className="text-[11px] text-muted-foreground">
                Matches orders strictly to physically verified lots in storage.
                {allocationModalData.unverifiedLotsExcludedCount > 0 && (
                  <span className="font-semibold text-foreground">
                    {' '}{allocationModalData.unverifiedLotsExcludedCount} expected harvest lot ({allocationModalData.unverifiedKgExcluded} kg) was excluded from current allocation.
                  </span>
                )}
              </p>
            </div>

            {/* Allocation fulfillment metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Requested</span>
                <span className="text-sm font-black text-foreground font-mono">{allocationModalData.requestedKg} kg</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Allocated Verified</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{allocationModalData.allocatedKg} kg</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Fulfillment</span>
                <span className="text-sm font-black text-primary font-mono">{allocationModalData.fulfillmentStatus}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Farmer Net Realization</span>
                <span className="text-sm font-black text-foreground font-mono">₹{allocationModalData.averageFarmerRealizationPerKg}/kg</span>
              </div>
            </div>

            {/* Allocated Lots List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">Allocated Verified Lots (FIFO Freshness Priority):</span>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-3 py-2">Lot ID</th>
                      <th className="px-3 py-2">Farmer</th>
                      <th className="px-3 py-2">Allocated</th>
                      <th className="px-3 py-2">Grade</th>
                      <th className="px-3 py-2">Shelf Life</th>
                      <th className="px-3 py-2">Net Realization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allocationModalData.allocatedLots.map((lot) => (
                      <tr key={lot.lotId} className="hover:bg-secondary/30">
                        <td className="px-3 py-2 font-mono font-bold">{lot.lotId}</td>
                        <td className="px-3 py-2 font-semibold">{lot.farmerName}</td>
                        <td className="px-3 py-2 font-mono font-bold text-emerald-600">{lot.allocatedKg} kg</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            Grade {lot.grade}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{lot.freshnessDaysRemaining}d remaining</td>
                        <td className="px-3 py-2 font-mono">₹{lot.farmerRealizationPerKg}/kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle Split Shipments */}
            {allocationModalData.splitShipments.length > 0 && (
              <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Recommended Dispatch Plan & Vehicle Assignment
                </span>
                {allocationModalData.splitShipments.map((s) => (
                  <div key={s.shipmentIndex} className="text-xs flex justify-between items-center">
                    <span>
                      Shipment #{s.shipmentIndex}: <strong>{s.vehicleType}</strong> ({s.vehicleCapacityKg} kg cap)
                    </span>
                    <span className="font-mono font-bold text-primary">{s.loadKg} kg payload</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAllocationModalOpen(false)
                  flash('ok', `Supply allocation confirmed: ${allocationModalData.allocatedKg} kg reserved for ${allocationModalData.buyerName}.`)
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Confirm Allocation & Reserve Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bolna Call Modal for Voice Confirmation */}
      {bolnaModalOpen && selectedCallFarmer && (
        <BolnaCallModal
          isOpen={bolnaModalOpen}
          onClose={() => setBolnaModalOpen(false)}
          farmer={{
            id: selectedCallFarmer.id,
            name: selectedCallFarmer.name,
            mobile_number: selectedCallFarmer.mobile_number || '+91 98251 44102',
            village: selectedCallFarmer.village || 'Nashik',
            crop: selectedCallFarmer.crop_name || selectedCallFarmer.crop || 'TOMATO',
          }}
          order={null}
          allocatedKg={selectedCallAllocatedKg}
          onCallSuccess={(_farmerId: string, _details: unknown) => {
            flash('ok', `Voice confirmation complete: ${selectedCallFarmer.name} confirmed supply!`)
          }}
        />
      )}
    </div>
  )
}
