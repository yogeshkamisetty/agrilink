'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Home,
  Info,
  Layers,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sprout,
  Star,
  Trash2,
  Truck,
  User,
  Wheat,
  X,
} from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import {
  getWorkflowState,
  step5BuyerOrderAndReserve,
  step7DeliverAndSettle,
  type WorkflowState,
} from '@/lib/workflow-engine'

export type BuyerNavKey =
  | 'home'
  | 'browse'
  | 'search'
  | 'cart'
  | 'orders'
  | 'create_demand'
  | 'my_demands'
  | 'demand_matches'
  | 'payments'
  | 'saved'
  | 'messages'
  | 'profile'
  | 'support'

export type BuyerType = 'Household' | 'Retailer' | 'Restaurant' | 'Processor'
export type VerificationState = 'Verified' | 'Under Review' | 'Pending' | 'Needs Correction' | 'Rejected'

export interface ProduceProduct {
  id: string
  crop: string
  hindiName: string
  category: 'Vegetables' | 'Grains & Pulses' | 'Fruits' | 'Tubers'
  grade: 'Grade A' | 'Grade B'
  qualityScore: number
  moisturePercent: number
  blemishTolerance: string
  availableKg: number
  indicativePricePerKg: number
  mandiPricePerKg: number
  retailSavingPercent: number
  sourceFpo: string
  fpoCode: string
  location: string
  distanceKm: number
  freshness: string
  harvestDate: string
  deliveryEstimate: string
  image: string
  description: string
  minOrderKg: number
}

export interface CartItem {
  product: ProduceProduct
  quantityKg: number
}

export interface BuyerOrderRecord {
  id: string
  code: string
  crop: string
  grade: string
  quantityKg: number
  pricePerKg: number
  subtotal: number
  logisticsFee: number
  totalAmount: number
  fpoName: string
  deliveryLocation: string
  deliveryDate: string
  paymentMethod: string
  status: 'PLACED' | 'CONFIRMED' | 'ALLOCATED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED'
  placedAt: string
  vehicleInfo?: string
  driverContact?: string
}

export interface BuyerDemandRecord {
  id: string
  code: string
  crop: string
  gradePreference: string
  requestedQtyKg: number
  matchedQtyKg: number
  remainingQtyKg: number
  targetDeliveryDate: string
  deliveryLocation: string
  notes?: string
  status: 'OPEN' | 'PARTIALLY_MATCHED' | 'FULLY_MATCHED' | 'ALLOCATED' | 'CLOSED'
  createdAt: string
}

export interface MatchedFpoSupply {
  id: string
  demandId: string
  fpoName: string
  fpoLocation: string
  distanceKm: number
  crop: string
  grade: string
  verifiedQtyKg: number
  indicativePricePerKg: number
  harvestReadiness: string
  matchConfidencePct: number
  lotReference: string
}

export interface BuyerProfileData {
  name: string
  mobile: string
  email: string
  type: BuyerType
  organizationName?: string
  verificationStatus: VerificationState
  deliveryAddress: string
  city: string
  state: string
  pincode: string
  gstin?: string
  fssai?: string
}

const CROP_CATALOG: ProduceProduct[] = [
  {
    id: 'prod-tom-01',
    crop: 'TOMATO',
    hindiName: 'टमाटर',
    category: 'Vegetables',
    grade: 'Grade A',
    qualityScore: 94,
    moisturePercent: 88.5,
    blemishTolerance: '< 3% surface blemish',
    availableKg: 370,
    indicativePricePerKg: 34,
    mandiPricePerKg: 28,
    retailSavingPercent: 24,
    sourceFpo: 'Anand District Farmers Producer Co.',
    fpoCode: 'FPO-GJ-04',
    location: 'Mogri Agri Hub, Anand',
    distanceKm: 4.8,
    freshness: 'Harvested 5h ago · GradeCam Verified',
    harvestDate: 'Today, 6:00 AM',
    deliveryEstimate: 'Tomorrow by 9:00 AM',
    image: '/crops/tomato.png',
    description: 'Crisp, uniform field tomatoes graded via GradeCam AI. Ideal for culinary use, institutional kitchens, and retail display.',
    minOrderKg: 10,
  },
  {
    id: 'prod-oni-02',
    crop: 'ONION',
    hindiName: 'प्याज़',
    category: 'Vegetables',
    grade: 'Grade A',
    qualityScore: 92,
    moisturePercent: 12.0,
    blemishTolerance: '< 2% neck rot',
    availableKg: 850,
    indicativePricePerKg: 28,
    mandiPricePerKg: 23,
    retailSavingPercent: 20,
    sourceFpo: 'Kheda Agro Producer Society',
    fpoCode: 'FPO-GJ-09',
    location: 'Nadiad Collection Center',
    distanceKm: 18.2,
    freshness: 'Cured & sorted · 2 days post-harvest',
    harvestDate: '13 Sep 2026',
    deliveryEstimate: 'Tomorrow afternoon (1–4 PM)',
    image: '/crops/onion.png',
    description: 'Nashik red medium-to-large bulbs. Sun-cured with double skin protection for extended shelf life.',
    minOrderKg: 20,
  },
  {
    id: 'prod-whe-03',
    crop: 'WHEAT',
    hindiName: 'गेहूं',
    category: 'Grains & Pulses',
    grade: 'Grade A',
    qualityScore: 96,
    moisturePercent: 10.8,
    blemishTolerance: '< 1% foreign matter',
    availableKg: 2400,
    indicativePricePerKg: 26,
    mandiPricePerKg: 22.5,
    retailSavingPercent: 18,
    sourceFpo: 'Bhal Organic Grain Farmers Union',
    fpoCode: 'FPO-GJ-12',
    location: 'Dhandhuka Hub',
    distanceKm: 42.0,
    freshness: 'Machine cleaned & moisture tested',
    harvestDate: 'Current season lot',
    deliveryEstimate: 'Within 48 hours',
    image: '/crops/wheat.png',
    description: 'Sharbati premium high-protein wheat grains. Cleaned, destoned, and packaged in tamper-proof jute sacks.',
    minOrderKg: 50,
  },
  {
    id: 'prod-pot-04',
    crop: 'POTATO',
    hindiName: 'आलू',
    category: 'Tubers',
    grade: 'Grade B',
    qualityScore: 88,
    moisturePercent: 78.0,
    blemishTolerance: '< 5% shallow cuts',
    availableKg: 1200,
    indicativePricePerKg: 20,
    mandiPricePerKg: 16.5,
    retailSavingPercent: 25,
    sourceFpo: 'Deesa Tubers Cooperative Ltd.',
    fpoCode: 'FPO-GJ-02',
    location: 'Deesa Cold Reserve',
    distanceKm: 65.0,
    freshness: 'Cold-chain preserved (4°C)',
    harvestDate: 'Controlled storage stock',
    deliveryEstimate: 'Scheduled 2-day delivery',
    image: '/crops/potato.png',
    description: 'Kufri Jyoti processing-grade potatoes. Low sugar content, high solids, perfect for commercial frying and boiling.',
    minOrderKg: 30,
  },
  {
    id: 'prod-pad-05',
    crop: 'PADDY',
    hindiName: 'धान',
    category: 'Grains & Pulses',
    grade: 'Grade A',
    qualityScore: 95,
    moisturePercent: 13.5,
    blemishTolerance: '< 1.5% chaff',
    availableKg: 3500,
    indicativePricePerKg: 24,
    mandiPricePerKg: 20,
    retailSavingPercent: 22,
    sourceFpo: 'Matar Valley Rice Growers FPO',
    fpoCode: 'FPO-GJ-15',
    location: 'Matar Milling Depot',
    distanceKm: 28.5,
    freshness: 'Fresh kharif harvest batch',
    harvestDate: '10 Sep 2026',
    deliveryEstimate: 'Within 48 hours',
    image: '/crops/paddy.png',
    description: 'Aromatic Gujarat-17 long grain paddy. High milling recovery with zero chemical fumigation.',
    minOrderKg: 100,
  },
]

const TIER_CAPACITY_GUIDANCE: Record<BuyerType, { range: string; desc: string; maxSingleOrder: number }> = {
  Household: {
    range: '1–20 kg / order',
    desc: 'Instant access for home kitchens & residential groups. No business proofs required.',
    maxSingleOrder: 30,
  },
  Retailer: {
    range: '20–500 kg / order',
    desc: 'Local kirana shops, neighborhood grocers, and fresh produce stalls with GSTIN or trade licenses.',
    maxSingleOrder: 600,
  },
  Restaurant: {
    range: '100–2,000 kg / order',
    desc: 'Commercial restaurants, cloud kitchens, hotel food services, and catering companies with FSSAI licenses.',
    maxSingleOrder: 2500,
  },
  Processor: {
    range: '500 kg+ / order',
    desc: 'Food processing units, dal & flour mills, hospital canteens, institutional mess programs, and wholesale export houses.',
    maxSingleOrder: 50000,
  },
}

export interface BuyerDashboardViewProps {
  currentUserName?: string | null
  buyerId?: string
  buyerName?: string
  deliveryLocation?: string
  initialNav?: BuyerNavKey
  activeNav?: BuyerNavKey
  onNavigate?: (tab: BuyerNavKey) => void
}

export function BuyerDashboardView({
  currentUserName,
  buyerId = 'buyer-school-001',
  buyerName = 'PM POSHAN Central Kitchen',
  deliveryLocation = 'Nana Bazaar, Vallabh Vidyanagar, Anand, Gujarat',
  initialNav = 'home',
  activeNav,
  onNavigate,
}: BuyerDashboardViewProps) {
  // Navigation State
  const [internalTab, setInternalTab] = useState<BuyerNavKey>(initialNav)
  const activeTab = activeNav ?? internalTab

  const setActiveTab = useCallback(
    (tab: BuyerNavKey) => {
      setInternalTab(tab)
      onNavigate?.(tab)
    },
    [onNavigate]
  )

  // Live Workflow State Sync
  const [wfState, setWfState] = useState<WorkflowState>(() => getWorkflowState())

  // Buyer Profile State
  const [profile, setProfile] = useState<BuyerProfileData>({
    name: currentUserName || buyerName || 'PM POSHAN Central Kitchen',
    mobile: '+91 98765 43210',
    email: 'procurement@poshan-anand.gov.in',
    type: 'Restaurant', // Default demo institutional buyer
    organizationName: 'PM POSHAN Mid-Day Meal Authority',
    verificationStatus: 'Verified',
    deliveryAddress: deliveryLocation,
    city: 'Anand',
    state: 'Gujarat',
    pincode: '388120',
    gstin: '24AAAAA0000A1Z5',
    fssai: '10020021000142',
  })

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: CROP_CATALOG[0], // 300 kg Tomato by default to align with primary demo!
      quantityKg: 300,
    },
  ])

  // Saved / Wishlist Items
  const [savedItemIds, setSavedItemIds] = useState<string[]>(['prod-oni-02'])

  // Selected Product for Details Modal
  const [selectedProduct, setSelectedProduct] = useState<ProduceProduct | null>(null)
  const [modalQty, setModalQty] = useState<number>(25)

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedGrade, setSelectedGrade] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'recommended' | 'priceAsc' | 'priceDesc' | 'distance' | 'freshness'>('recommended')

  // Orders State (Reflecting Live Workflow)
  const [orders, setOrders] = useState<BuyerOrderRecord[]>([
    {
      id: 'ord-live-01',
      code: 'ORD-TOM-2026-981',
      crop: 'TOMATO',
      grade: 'Grade A',
      quantityKg: 300,
      pricePerKg: 34,
      subtotal: 10200,
      logisticsFee: 660,
      totalAmount: 10860,
      fpoName: 'Anand District Farmers Producer Co.',
      deliveryLocation: deliveryLocation,
      deliveryDate: '2026-09-25',
      paymentMethod: 'Agri Escrow (SBI)',
      status: wfState.stage >= 7 ? 'DELIVERED' : wfState.stage >= 6 ? 'IN_TRANSIT' : wfState.stage >= 5 ? 'ALLOCATED' : 'CONFIRMED',
      placedAt: '2026-09-24, 09:15 AM',
      vehicleInfo: 'Tata Ace (AP-04-TX-1029)',
      driverContact: '+91 94281 90214',
    },
  ])

  // Demands State
  const [demands, setDemands] = useState<BuyerDemandRecord[]>([
    {
      id: 'dmd-001',
      code: 'DMD-2026-081',
      crop: 'TOMATO',
      gradePreference: 'Grade A',
      requestedQtyKg: 400,
      matchedQtyKg: 370,
      remainingQtyKg: 30,
      targetDeliveryDate: '2026-09-25',
      deliveryLocation: deliveryLocation,
      notes: 'Firm red tomatoes for mid-day meal gravy processing, minimum 85% red coloration',
      status: 'PARTIALLY_MATCHED',
      createdAt: '2026-09-23',
    },
    {
      id: 'dmd-002',
      code: 'DMD-2026-082',
      crop: 'ONION',
      gradePreference: 'Grade A',
      requestedQtyKg: 500,
      matchedQtyKg: 500,
      remainingQtyKg: 0,
      targetDeliveryDate: '2026-09-27',
      deliveryLocation: deliveryLocation,
      notes: 'Dry cured medium onions for institutional storage',
      status: 'FULLY_MATCHED',
      createdAt: '2026-09-23',
    },
  ])

  // Demand Matches
  const demandMatches: MatchedFpoSupply[] = useMemo(() => [
    {
      id: 'match-01',
      demandId: 'dmd-001',
      fpoName: 'Anand District Farmers Producer Co.',
      fpoLocation: 'Mogri Hub, Anand',
      distanceKm: 4.8,
      crop: 'TOMATO',
      grade: 'Grade A',
      verifiedQtyKg: 370,
      indicativePricePerKg: 34,
      harvestReadiness: 'Verified in Hub (Ready for dispatch)',
      matchConfidencePct: 96,
      lotReference: 'LOT-TOM-0924',
    },
    {
      id: 'match-02',
      demandId: 'dmd-002',
      fpoName: 'Kheda Agro Producer Society',
      fpoLocation: 'Nadiad Hub',
      distanceKm: 18.2,
      crop: 'ONION',
      grade: 'Grade A',
      verifiedQtyKg: 500,
      indicativePricePerKg: 28,
      harvestReadiness: 'Harvested & Cured (24h pickup window)',
      matchConfidencePct: 92,
      lotReference: 'LOT-ONI-0922',
    },
  ], [])

  // Create Demand Form State
  const [demandCrop, setDemandCrop] = useState<string>('TOMATO')
  const [demandGrade, setDemandGrade] = useState<string>('Grade A')
  const [demandQty, setDemandQty] = useState<number>(300)
  const [demandDate, setDemandDate] = useState<string>('2026-09-26')
  const [demandLocation, setDemandLocation] = useState<string>(deliveryLocation)
  const [demandNotes, setDemandNotes] = useState<string>('')
  const [demandSubmitting, setDemandSubmitting] = useState<boolean>(false)

  // Checkout State
  const [checkoutAddress, setCheckoutAddress] = useState<string>(deliveryLocation)
  const [checkoutSlot, setCheckoutSlot] = useState<'morning' | 'afternoon'>('morning')
  const [checkoutPayment, setCheckoutPayment] = useState<'escrow' | 'upi' | 'pod' | 'credit'>('escrow')
  const [checkoutPlacing, setCheckoutPlacing] = useState<boolean>(false)
  const [checkoutSuccessCode, setCheckoutSuccessCode] = useState<string | null>(null)

  // Messages Thread
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'buyer' | 'fpo'; text: string; time: string }>>([
    { id: 'msg-1', sender: 'fpo', text: 'Namaste! Lot LOT-TOM-0924 (370 kg Grade A) has completed GradeCam quality inspection. Ready for allocation.', time: '08:30 AM' },
    { id: 'msg-2', sender: 'buyer', text: 'Excellent. Please ensure driver adheres to the 9:00 AM delivery window for the school meal shift.', time: '08:45 AM' },
    { id: 'msg-3', sender: 'fpo', text: 'Noted. Driver Rajesh (AP-04-TX-1029) is loaded and will contact upon gate arrival.', time: '09:05 AM' },
  ])
  const [newMessageText, setNewMessageText] = useState('')

  // Toast / Feedback State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Sync with Workflow Engine & BroadcastChannel
  useEffect(() => {
    const handleSync = () => {
      const current = getWorkflowState()
      setWfState(current)
      // Dynamically update latest order status based on workflow stage
      setOrders((prev) =>
        prev.map((o) => {
          if (o.code === 'ORD-TOM-2026-981') {
            const nextStatus: BuyerOrderRecord['status'] =
              current.stage >= 7 ? 'DELIVERED' : current.stage >= 6 ? 'IN_TRANSIT' : current.stage >= 5 ? 'ALLOCATED' : 'CONFIRMED'
            return { ...o, status: nextStatus }
          }
          return o
        })
      )
    }

    window.addEventListener('agrilink:workflow-updated', handleSync)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = () => handleSync()
    } catch {}

    return () => {
      window.removeEventListener('agrilink:workflow-updated', handleSync)
      try {
        bc?.close()
      } catch {}
    }
  }, [])

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.indicativePricePerKg * item.quantityKg, 0)
  }, [cart])

  const cartTotalWeightKg = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantityKg, 0)
  }, [cart])

  const cartLogisticsFee = useMemo(() => {
    if (cart.length === 0) return 0
    // Transparent formula: ₹150 base cluster run + ₹1.5 per kg freight share
    return Math.round(150 + cartTotalWeightKg * 1.5)
  }, [cart, cartTotalWeightKg])

  const cartGrandTotal = useMemo(() => {
    return cartSubtotal + cartLogisticsFee
  }, [cartSubtotal, cartLogisticsFee])

  // Cart Action Handlers
  const handleAddToCart = (product: ProduceProduct, qty: number = 25) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id)
      if (existingIndex > -1) {
        const updated = [...prev]
        const newQty = Math.min(product.availableKg, updated[existingIndex].quantityKg + qty)
        updated[existingIndex] = { ...updated[existingIndex], quantityKg: newQty }
        return updated
      } else {
        return [...prev, { product, quantityKg: Math.min(product.availableKg, qty) }]
      }
    })
    showToast(`Added ${qty} kg ${product.crop} to Cart!`)
    setSelectedProduct(null)
  }

  const handleUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clampedQty = Math.min(item.product.availableKg, newQty)
          return { ...item, quantityKg: clampedQty }
        }
        return item
      })
    )
  }

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
    showToast('Item removed from cart', 'info')
  }

  const handleToggleSave = (productId: string) => {
    setSavedItemIds((prev) => {
      const isSaved = prev.includes(productId)
      if (isSaved) {
        showToast('Removed from Saved Items', 'info')
        return prev.filter((id) => id !== productId)
      } else {
        showToast('Saved to your Wishlist!', 'success')
        return [...prev, productId]
      }
    })
  }

  // Filtered & Sorted Catalog
  const filteredCatalog = useMemo(() => {
    return CROP_CATALOG.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hindiName.includes(searchQuery) ||
        p.sourceFpo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory
      const matchesGrade = selectedGrade === 'All' || p.grade === selectedGrade
      return matchesSearch && matchesCat && matchesGrade
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.indicativePricePerKg - b.indicativePricePerKg
      if (sortBy === 'priceDesc') return b.indicativePricePerKg - a.indicativePricePerKg
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm
      if (sortBy === 'freshness') return b.qualityScore - a.qualityScore
      return 0
    })
  }, [searchQuery, selectedCategory, selectedGrade, sortBy])

  // Checkout Placement Handler (Links to Workflow Engine)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setCheckoutPlacing(true)
    try {
      const primaryItem = cart[0]
      const orderCode = `ORD-${primaryItem.product.crop}-${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Dispatch to server orders API if available
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            crop: primaryItem.product.crop,
            qtyTargetKg: primaryItem.quantityKg,
            pricePerKg: primaryItem.product.indicativePricePerKg,
            deliveryDate: '2026-09-25',
            deliveryLocation: checkoutAddress,
            purpose: profile.organizationName || 'Mid-Day Meal Kitchen Supply',
          }),
        })
      } catch {}

      // 2. Synchronize with primary demo workflow engine (Allocates 300 kg against 370 kg verified inventory)
      try {
        step5BuyerOrderAndReserve(primaryItem.quantityKg)
      } catch {}

      // 3. Insert local order record
      const newOrder: BuyerOrderRecord = {
        id: `ord-${Date.now()}`,
        code: orderCode,
        crop: primaryItem.product.crop,
        grade: primaryItem.product.grade,
        quantityKg: primaryItem.quantityKg,
        pricePerKg: primaryItem.product.indicativePricePerKg,
        subtotal: cartSubtotal,
        logisticsFee: cartLogisticsFee,
        totalAmount: cartGrandTotal,
        fpoName: primaryItem.product.sourceFpo,
        deliveryLocation: checkoutAddress,
        deliveryDate: '2026-09-25',
        paymentMethod: checkoutPayment === 'escrow' ? 'Agri Escrow (SBI)' : checkoutPayment === 'upi' ? 'UPI Instant' : 'Pay on Delivery (e-POD)',
        status: 'CONFIRMED',
        placedAt: 'Just now',
        vehicleInfo: 'Tata Ace (AP-04-TX-1029)',
      }

      setOrders((prev) => [newOrder, ...prev])
      setCheckoutSuccessCode(orderCode)
      setCart([])
      showToast(`Order ${orderCode} placed successfully! 300 kg reserved in verified inventory.`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Order could not be placed', 'error')
    } finally {
      setCheckoutPlacing(false)
    }
  }

  // Confirm Delivery Handler (Links to Workflow Step 7 & Farmer Settlement)
  const handleConfirmDelivery = (orderId: string) => {
    try {
      step7DeliverAndSettle()
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' } : o))
      )
      showToast('Delivery verified! Farmer settlement of ₹10,860 net has been triggered to SBI A/c ...4920.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to confirm delivery', 'error')
    }
  }

  // Create Demand Handler
  const handleCreateDemandSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDemandSubmitting(true)
    setTimeout(() => {
      const code = `DMD-2026-${Math.floor(100 + Math.random() * 900)}`
      const newDmd: BuyerDemandRecord = {
        id: `dmd-${Date.now()}`,
        code,
        crop: demandCrop,
        gradePreference: demandGrade,
        requestedQtyKg: demandQty,
        matchedQtyKg: 0,
        remainingQtyKg: demandQty,
        targetDeliveryDate: demandDate,
        deliveryLocation: demandLocation,
        notes: demandNotes,
        status: 'OPEN',
        createdAt: 'Today',
      }
      setDemands((prev) => [newDmd, ...prev])
      setDemandSubmitting(false)
      showToast(`Demand ${code} posted to FPO aggregation network!`, 'success')
      setActiveTab('my_demands')
    }, 600)
  }

  // Check if buyer is eligible for Bulk Procurement (>50 kg institutional lots)
  const isBulkEligible = profile.type !== 'Household'

  return (
    <div className="w-full space-y-5 text-slate-900 pb-20 font-sans">
      {/* Marketplace Top Navigation & Quick Controls */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-2 sm:p-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 13-Tab Navigation Bar */}
          <nav aria-label="Buyer Navigation" className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-semibold">
            {[
              { key: 'home', label: 'Home', icon: Home },
              { key: 'browse', label: 'Browse Produce', icon: ShoppingBag },
              { key: 'search', label: 'Search', icon: Search },
              { key: 'cart', label: 'Cart', icon: ShoppingCart, count: cart.length > 0 ? `${cart.length}` : undefined },
              { key: 'orders', label: 'My Orders', icon: Package, count: orders.length > 0 ? `${orders.length}` : undefined },
              { key: 'create_demand', label: 'Create Demand', icon: Plus },
              { key: 'my_demands', label: 'My Demands', icon: Layers, count: demands.length > 0 ? `${demands.length}` : undefined },
              { key: 'demand_matches', label: 'Demand Matches', icon: Sparkles, count: demandMatches.length > 0 ? `${demandMatches.length}` : undefined },
              { key: 'payments', label: 'Payments/Invoices', icon: Receipt },
              { key: 'saved', label: 'Saved Items', icon: Heart, count: savedItemIds.length > 0 ? `${savedItemIds.length}` : undefined },
              { key: 'messages', label: 'Messages', icon: MessageSquare },
              { key: 'profile', label: 'Profile', icon: User },
              { key: 'support', label: 'Support', icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as BuyerNavKey)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.count && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Quick Search & Quick Cart */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (activeTab !== 'search' && activeTab !== 'browse' && e.target.value.trim().length > 0) {
                    setActiveTab('search')
                  }
                }}
                placeholder="Quick search produce..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveTab('cart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors shrink-0 ${
                activeTab === 'cart'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart className="size-3.5" />
              <span className="hidden sm:inline">Cart</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'cart' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {cart.reduce((s, i) => s + i.quantityKg, 0)} kg
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold text-white ${
              toast.type === 'error' ? 'bg-rose-600 border-rose-700' : toast.type === 'info' ? 'bg-slate-800 border-slate-900' : 'bg-emerald-600 border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full">
        {/* ========================================================================= */}
        {/* TAB 1: HOME SCREEN */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Top Overview Banners: Capacity & Verification */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Procurement Capacity Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Procurement Guidance</span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">{profile.type} Tier</h3>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Building2 className="size-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-sm font-bold text-emerald-700">
                    {TIER_CAPACITY_GUIDANCE[profile.type].range}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{TIER_CAPACITY_GUIDANCE[profile.type].desc}</p>
                </div>
              </div>

              {/* Verification State Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Verification</span>
                    <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                      <span>{profile.verificationStatus}</span>
                      <ShieldCheck className="size-4 text-emerald-600" />
                    </h3>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <BadgeCheck className="size-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Local FPO Desk Accreditation:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
              </div>

              {/* Active Demands & Live Orders */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Active Pipeline</span>
                  <h3 className="text-xl font-black mt-1">
                    {demands.length} Demands · {orders.length} Orders
                  </h3>
                  <p className="text-xs text-emerald-100 mt-1">
                    370 kg matched against Anand FPO verified Tomato inventory.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-500/50 flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('create_demand')}
                    className="flex-1 py-1.5 px-3 bg-white text-emerald-900 font-bold text-xs rounded-xl text-center hover:bg-emerald-50 transition-colors"
                  >
                    + Create Demand
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="py-1.5 px-3 bg-emerald-800/80 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-colors"
                  >
                    View Orders
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Pills */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produce Categories</h4>
                <button onClick={() => setActiveTab('browse')} className="text-xs font-bold text-emerald-600 hover:underline">
                  View All Products →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: 'Vegetables', count: '4 Crops', icon: Sprout, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { name: 'Grains & Pulses', count: '3 Crops', icon: Wheat, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { name: 'Tubers', count: '1 Crop', icon: Package, color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { name: 'All Categories', count: '8 Crops Total', icon: Layers, color: 'bg-slate-50 text-slate-700 border-slate-200' },
                ].map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name === 'All Categories' ? 'All' : cat.name)
                      setActiveTab('browse')
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-transform active:scale-95 ${cat.color}`}
                  >
                    <cat.icon className="size-5 shrink-0" />
                    <div>
                      <div className="text-xs font-black">{cat.name}</div>
                      <div className="text-[10px] opacity-75">{cat.count}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Produce Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Recommended Direct-from-Farm Produce</h3>
                  <p className="text-xs text-slate-500">Quality-graded produce ready for immediate dispatch from verified FPOs</p>
                </div>
                <button onClick={() => setActiveTab('browse')} className="text-xs font-bold text-emerald-600 hover:underline">
                  Browse Catalog
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CROP_CATALOG.slice(0, 3).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={savedItemIds.includes(product.id)}
                    onToggleSave={() => handleToggleSave(product.id)}
                    onViewDetails={() => setSelectedProduct(product)}
                    onAddToCart={(qty) => handleAddToCart(product, qty)}
                  />
                ))}
              </div>
            </div>

            {/* Recent Orders Quick Snapshot */}
            {orders.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900">Recent Order Tracking</h3>
                  </div>
                  <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-emerald-600 hover:underline">
                    View All Orders →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{orders[0].code}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        {orders[0].status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {orders[0].quantityKg} kg {orders[0].crop} · ₹{orders[0].totalAmount.toLocaleString('en-IN')} via {orders[0].paymentMethod}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BROWSE PRODUCE */}
        {/* ========================================================================= */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Filter and Sorting Header */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
                {['All', 'Vegetables', 'Grains & Pulses', 'Tubers'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grade & Sort Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <span className="text-slate-400 pl-2">Grade:</span>
                  {['All', 'Grade A', 'Grade B'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrade(g)}
                      className={`px-2 py-0.5 rounded-lg transition-colors ${selectedGrade === g ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-100 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border-none outline-none cursor-pointer"
                >
                  <option value="recommended">Sort: Recommended</option>
                  <option value="priceAsc">Price: Low to High</option>
                  <option value="priceDesc">Price: High to Low</option>
                  <option value="freshness">Freshness & Grade Score</option>
                  <option value="distance">Nearest FPO</option>
                </select>
              </div>
            </div>

            {/* Produce Grid */}
            {filteredCatalog.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <Package className="size-10 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-700">No produce matching your filter criteria</h4>
                <p className="text-xs text-slate-400">Try adjusting your category or grade selection.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('All')
                    setSelectedGrade('All')
                    setSearchQuery('')
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCatalog.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={savedItemIds.includes(product.id)}
                    onToggleSave={() => handleToggleSave(product.id)}
                    onViewDetails={() => setSelectedProduct(product)}
                    onAddToCart={(qty) => handleAddToCart(product, qty)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SEARCH VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-lg font-black text-slate-900">Search AgriLink Verified Farm Catalog</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter crop name (e.g. Tomato, Wheat), FPO name, district, or village..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-100 text-base font-medium rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Fast Tag Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-slate-400">Popular:</span>
                {['Tomato', 'Onion', 'Wheat', 'Grade A', 'Anand FPO', 'Kheda FPO'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {filteredCatalog.length} Matching Produce Lots Found
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCatalog.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={savedItemIds.includes(product.id)}
                    onToggleSave={() => handleToggleSave(product.id)}
                    onViewDetails={() => setSelectedProduct(product)}
                    onAddToCart={(qty) => handleAddToCart(product, qty)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CART SCREEN */}
        {/* ========================================================================= */}
        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Your Procurement Cart</h3>
                <p className="text-xs text-slate-500">Review quantities and logistics schedule before placing order</p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    setCart([])
                    showToast('Cart cleared', 'info')
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
                <div className="size-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingCart className="size-8" />
                </div>
                <h4 className="text-lg font-black text-slate-800">Your cart is empty</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Browse verified FPO farm inventory and add fresh produce directly to your order.
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 shadow-md transition-all"
                >
                  Browse Available Produce
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-16 rounded-xl bg-slate-100 p-2 flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.product.image} alt={item.product.crop} className="size-12 object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900">{item.product.crop}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                              {item.product.grade}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.product.sourceFpo}</p>
                          <div className="text-sm font-black text-slate-900 mt-1">
                            ₹{item.product.indicativePricePerKg} / kg
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                          <button
                            onClick={() => handleUpdateCartQty(item.product.id, item.quantityKg - 25)}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantityKg}
                            onChange={(e) => handleUpdateCartQty(item.product.id, Number(e.target.value))}
                            className="w-14 text-center font-bold text-xs bg-transparent outline-none"
                          />
                          <span className="text-[10px] font-semibold text-slate-400 pr-1">kg</span>
                          <button
                            onClick={() => handleUpdateCartQty(item.product.id, item.quantityKg + 25)}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        {/* Line Subtotal */}
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-semibold">Subtotal</div>
                          <div className="text-base font-black text-slate-900">
                            ₹{(item.product.indicativePricePerKg * item.quantityKg).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveCartItem(item.product.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary & Checkout Card */}
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                      Procurement Cost Breakdown
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Produce Subtotal ({cartTotalWeightKg} kg):</span>
                        <span className="font-bold text-slate-900">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          Logistics & Consolidated Fleet:
                          <span title="Consolidated cluster route fee">
                            <Info className="size-3 text-slate-400" />
                          </span>
                        </span>
                        <span className="font-bold text-slate-900">₹{cartLogisticsFee.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Platform Cooperative Fee:</span>
                        <span className="font-bold text-emerald-600">₹0 (Cooperative Surcharge-Free)</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Total Payable:</div>
                        <div className="text-xl font-black text-slate-900">₹{cartGrandTotal.toLocaleString('en-IN')}</div>
                      </div>
                      <button
                        onClick={() => {
                          // Jump to checkout section
                          const el = document.getElementById('checkout-flow')
                          el?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        Proceed to Checkout →
                      </button>
                    </div>
                  </div>

                  {/* Checkout Flow Card */}
                  <div id="checkout-flow" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <CreditCard className="size-4 text-emerald-600" />
                      <span>Instant Checkout</span>
                    </h4>

                    {/* Delivery Address */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Delivery Address</label>
                      <textarea
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        rows={2}
                        className="w-full text-xs font-medium p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Delivery Slot */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Preferred Delivery Slot</label>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setCheckoutSlot('morning')}
                          className={`p-2.5 rounded-xl border text-center transition-colors ${
                            checkoutSlot === 'morning' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          Morning (7–10 AM)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutSlot('afternoon')}
                          className={`p-2.5 rounded-xl border text-center transition-colors ${
                            checkoutSlot === 'afternoon' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          Afternoon (1–4 PM)
                        </button>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Payment Escrow Method</label>
                      <div className="space-y-2">
                        {[
                          { id: 'escrow', name: 'Agri Escrow (SBI)', desc: 'Held securely until physical delivery inspection' },
                          { id: 'upi', name: 'UPI / QR Instant', desc: 'Google Pay, PhonePe, BHIM' },
                          { id: 'pod', name: 'Pay on Delivery (e-POD)', desc: 'Verify produce before releasing payment' },
                        ].map((pm) => (
                          <label
                            key={pm.id}
                            onClick={() => setCheckoutPayment(pm.id as any)}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                              checkoutPayment === pm.id ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment"
                              checked={checkoutPayment === pm.id}
                              onChange={() => setCheckoutPayment(pm.id as any)}
                              className="mt-0.5 text-emerald-600"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{pm.name}</div>
                              <div className="text-[11px] text-slate-500">{pm.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={checkoutPlacing}
                      className="w-full py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {checkoutPlacing ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Reserving Verified Inventory...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span>Confirm & Place Order (₹{cartGrandTotal.toLocaleString('en-IN')})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MY ORDERS & ORDER TRACKER */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Procurement Orders</h3>
                <p className="text-xs text-slate-500">Live 7-stage order lifecycle tracking with delivery inspection sign-off</p>
              </div>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors"
              >
                + Place New Order
              </button>
            </div>

            {orders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-black text-slate-900">{order.code}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Placed on {order.placedAt} · Sourced from {order.fpoName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-semibold">Total Amount</div>
                    <div className="text-lg font-black text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* 7-Stage Order Progress Visual Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    7-Stage Fulfillment Pipeline
                  </h4>
                  <div className="relative">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {[
                        { stage: 'PLACED', label: '1. Placed', desc: 'Order logged' },
                        { stage: 'CONFIRMED', label: '2. Confirmed', desc: 'FPO accepted' },
                        { stage: 'ALLOCATED', label: '3. Allocated', desc: '300 kg reserved' },
                        { stage: 'DISPATCHED', label: '4. Dispatched', desc: 'Vehicle loaded' },
                        { stage: 'IN_TRANSIT', label: '5. In Transit', desc: 'On delivery route' },
                        { stage: 'DELIVERED', label: '6. Delivered', desc: 'e-POD signed' },
                        { stage: 'COMPLETED', label: '7. Completed', desc: 'Settled to farmer' },
                      ].map((step, idx) => {
                        const stages = ['PLACED', 'CONFIRMED', 'ALLOCATED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']
                        const currentIdx = stages.indexOf(order.status)
                        const isDone = idx <= currentIdx
                        const isCurrent = idx === currentIdx

                        return (
                          <div
                            key={step.stage}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isCurrent
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                                : isDone
                                ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                                : 'border-slate-100 bg-slate-50 text-slate-400'
                            }`}
                          >
                            <div className="size-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[11px] font-bold">
                              {isDone ? <Check className="size-3.5 text-emerald-600" /> : idx + 1}
                            </div>
                            <div className="text-[11px] font-black">{step.label}</div>
                            <div className="text-[9px] opacity-75 mt-0.5">{step.desc}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Order Details & Logistics Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Produce Consignment</span>
                    <div className="text-sm font-black text-slate-900 mt-1">
                      {order.quantityKg} kg {order.crop} ({order.grade})
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Rate: ₹{order.pricePerKg} / kg</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Location</span>
                    <div className="text-xs font-semibold text-slate-900 mt-1 truncate">{order.deliveryLocation}</div>
                    <div className="text-xs text-slate-500 mt-0.5">ETA: {order.deliveryDate}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cluster Logistics Fleet</span>
                    <div className="text-xs font-bold text-slate-900 mt-1">{order.vehicleInfo || 'Tata Ace (AP-04-TX-1029)'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Driver: {order.driverContact || 'Verified Carrier'}</div>
                  </div>
                </div>

                {/* Primary Action Button: Confirm Delivery inspection */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span>Quality escrow released upon verified physical inspection at gate.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleConfirmDelivery(order.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Confirm Delivery & Sign e-POD</span>
                      </button>
                    )}
                    <button
                      onClick={() => showToast('Delivery challan PDF downloaded', 'info')}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="size-3.5" />
                      <span>Delivery Challan</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CREATE DEMAND */}
        {/* ========================================================================= */}
        {activeTab === 'create_demand' && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demand Requisition</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">Post Produce Requisition to FPOs</h3>
              <p className="text-xs text-slate-500 mt-1">
                Broadcast your required crop, grade, and volume to nearby farmer cooperatives. Sourcing algorithms will immediately match your request with registered harvest schedules.
              </p>
            </div>

            <form onSubmit={handleCreateDemandSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Crop Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Select Crop</label>
                  <select
                    value={demandCrop}
                    onChange={(e) => setDemandCrop(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    <option value="TOMATO">Tomato (टमाटर)</option>
                    <option value="ONION">Onion (प्याज़)</option>
                    <option value="WHEAT">Wheat (गेहूं)</option>
                    <option value="POTATO">Potato (आलू)</option>
                    <option value="PADDY">Paddy / Rice (धान)</option>
                    <option value="SPINACH">Spinach (पालक)</option>
                  </select>
                </div>

                {/* Grade Preference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Grade Preference</label>
                  <select
                    value={demandGrade}
                    onChange={(e) => setDemandGrade(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    <option value="Grade A">Grade A (GradeCam AI Certified)</option>
                    <option value="Grade B">Grade B (Culinary / Standard)</option>
                    <option value="Commercial">Commercial Processing Lot</option>
                    <option value="Any">Any Verified Quality</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Required Quantity (kg)</label>
                  <input
                    type="number"
                    value={demandQty}
                    onChange={(e) => setDemandQty(Number(e.target.value))}
                    min={10}
                    step={10}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    Your {profile.type} tier guidance: {TIER_CAPACITY_GUIDANCE[profile.type].range}
                  </span>
                </div>

                {/* Preferred Delivery Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Delivery Date</label>
                  <input
                    type="date"
                    value={demandDate}
                    onChange={(e) => setDemandDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Delivery Location */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Delivery Receiving Location</label>
                <input
                  type="text"
                  value={demandLocation}
                  onChange={(e) => setDemandLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quality Notes / Specifications */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Quality Notes & Receiving Criteria</label>
                <textarea
                  value={demandNotes}
                  onChange={(e) => setDemandNotes(e.target.value)}
                  placeholder="e.g., Firm red tomatoes for midday meal distribution, maximum 5% transit shrinkage tolerance, tamper-evident crate packaging..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={demandSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {demandSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Broadcasting Requisition...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>Broadcast Demand to Regional FPO Network</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: MY DEMANDS */}
        {/* ========================================================================= */}
        {activeTab === 'my_demands' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">My Posted Demands</h3>
                <p className="text-xs text-slate-500">Track matched farm supply and conversion into purchase orders</p>
              </div>
              <button
                onClick={() => setActiveTab('create_demand')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors"
              >
                + Post New Demand
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {demands.map((dmd) => (
                <div key={dmd.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-900">{dmd.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          dmd.status === 'FULLY_MATCHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dmd.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Target Delivery: {dmd.targetDeliveryDate} · {dmd.deliveryLocation}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('demand_matches')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      View Matched Supply →
                    </button>
                  </div>

                  {/* Quantity Breakdown Bar */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Requested Qty</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">{dmd.requestedQtyKg} kg</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Matched Qty</div>
                      <div className="text-base font-black mt-0.5">{dmd.matchedQtyKg} kg</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining Qty</div>
                      <div className="text-base font-black text-slate-600 mt-0.5">{dmd.remainingQtyKg} kg</div>
                    </div>
                  </div>

                  {dmd.notes && (
                    <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      &ldquo;{dmd.notes}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: DEMAND MATCHES */}
        {/* ========================================================================= */}
        {activeTab === 'demand_matches' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">Verified FPO Supply Matches</h3>
              <p className="text-xs text-slate-500">Matching farm yields aggregated from regional FPO crop registries</p>
            </div>

            {/* Crucial Required Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-black uppercase tracking-wider text-[11px] text-amber-800">
                  Important Supply Allocation Notice
                </div>
                <p>
                  Supply matches displayed below are indicative based on verified FPO harvest registries and inventory. <strong>AgriLink does not guarantee supply until formal allocation and order confirmation.</strong> Stock is only legally reserved once you convert a match into a confirmed order.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {demandMatches.map((match) => (
                <div key={match.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">{match.fpoName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          {match.matchConfidencePct}% Match Confidence
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <MapPin className="size-3.5 text-slate-400" />
                        <span>{match.fpoLocation} ({match.distanceKm} km away)</span>
                        <span>· Lot #{match.lotReference}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const prod = CROP_CATALOG.find((p) => p.crop === match.crop) || CROP_CATALOG[0]
                        handleAddToCart(prod, match.verifiedQtyKg)
                        setActiveTab('cart')
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
                    >
                      Convert to Order & Reserve ({match.verifiedQtyKg} kg)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Produce & Grade</span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">{match.crop} ({match.grade})</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Verified Qty</span>
                      <div className="text-sm font-black text-emerald-700 mt-0.5">{match.verifiedQtyKg} kg</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Indicative Rate</span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">₹{match.indicativePricePerKg} / kg</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">Readiness</span>
                      <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">{match.harvestReadiness}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: PAYMENTS & INVOICES */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">Invoices & Settlement Slips</h3>
              <p className="text-xs text-slate-500">Commercial tax invoices with transparent farmer escrow accounting</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Order Ref</th>
                      <th className="px-5 py-3.5">Produce Details</th>
                      <th className="px-5 py-3.5">Total Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">INV-2026-4401</td>
                      <td className="px-5 py-4 text-slate-600">24 Sep 2026</td>
                      <td className="px-5 py-4 font-mono text-slate-700">ORD-TOM-2026-981</td>
                      <td className="px-5 py-4 text-slate-800">300 kg Tomato (Grade A)</td>
                      <td className="px-5 py-4 font-black text-slate-900">₹10,860.00</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                          {wfState.stage >= 7 ? 'SETTLED TO FARMER' : 'ESCROW SECURED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => showToast('Tax invoice PDF downloaded', 'info')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1"
                        >
                          <Download className="size-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: SAVED ITEMS (WISHLIST) */}
        {/* ========================================================================= */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">Saved Items ({savedItemIds.length})</h3>
              <p className="text-xs text-slate-500">Your bookmarked crops and preferred FPO lots</p>
            </div>

            {savedItemIds.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <Heart className="size-8 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-700">No saved items</h4>
                <p className="text-xs text-slate-400">Click the heart icon on any produce card to save it for later.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Browse Produce
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CROP_CATALOG.filter((p) => savedItemIds.includes(p.id)).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={true}
                    onToggleSave={() => handleToggleSave(product.id)}
                    onViewDetails={() => setSelectedProduct(product)}
                    onAddToCart={(qty) => handleAddToCart(product, qty)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: MESSAGES */}
        {/* ========================================================================= */}
        {activeTab === 'messages' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                  FPO
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Anand District Farmers Producer Co.</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold">Cluster Logistics Desk · Active now</p>
                </div>
              </div>
              <button
                onClick={() => showToast('Calling FPO Coordinator helpline: +91 94281 00000', 'info')}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <Phone className="size-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md p-3 rounded-2xl ${
                      m.sender === 'buyer'
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className={`block text-[9px] mt-1 text-right ${m.sender === 'buyer' ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMessageText.trim()) {
                    setMessages((prev) => [
                      ...prev,
                      { id: `msg-${Date.now()}`, sender: 'buyer', text: newMessageText.trim(), time: 'Just now' },
                    ])
                    setNewMessageText('')
                  }
                }}
                placeholder="Type delivery note or quality inquiry to FPO..."
                className="flex-1 text-xs px-4 py-2.5 bg-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                onClick={() => {
                  if (!newMessageText.trim()) return
                  setMessages((prev) => [
                    ...prev,
                    { id: `msg-${Date.now()}`, sender: 'buyer', text: newMessageText.trim(), time: 'Just now' },
                  ])
                  setNewMessageText('')
                }}
                className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 12: PROFILE & BULK PROCUREMENT */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Buyer Profile Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{profile.name}</h3>
                  <p className="text-xs text-slate-500">{profile.organizationName || 'Individual Procurement Account'}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                  {profile.verificationStatus}
                </span>
              </div>

              {/* SIH Evaluator State Switcher */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Simulate Buyer Type & Verification State (Evaluator Tool):</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(['Household', 'Retailer', 'Restaurant', 'Processor'] as BuyerType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setProfile((prev) => ({ ...prev, type: t }))
                        showToast(`Switched profile type to ${t}`, 'info')
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        profile.type === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <div className="w-px h-6 bg-slate-200 my-auto" />
                  {(['Verified', 'Under Review', 'Needs Correction', 'Pending'] as VerificationState[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setProfile((prev) => ({ ...prev, verificationStatus: st }))
                        showToast(`Verification status set to ${st}`, 'info')
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        profile.verificationStatus === st ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Mobile</span>
                  <div className="font-bold text-slate-900 mt-0.5">{profile.mobile}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Email</span>
                  <div className="font-bold text-slate-900 mt-0.5">{profile.email}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Registered Address</span>
                  <div className="font-medium text-slate-900 mt-0.5">{profile.deliveryAddress}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">GSTIN / FSSAI</span>
                  <div className="font-bold text-slate-900 mt-0.5">{profile.gstin || 'None'} / {profile.fssai || 'None'}</div>
                </div>
              </div>
            </div>

            {/* Bulk Procurement Eligibility Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-600" />
                  <span>Bulk Institutional Procurement Module</span>
                </h4>
                {isBulkEligible ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    Eligible Business Buyer
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
                    Household Guidance Gated
                  </span>
                )}
              </div>

              {!isBulkEligible ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <Lock className="size-4 text-slate-400" />
                    <span>Commercial Multi-Ton Procurement Locked</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bulk Procurement (&gt;50 kg institutional lots, contract farming agreements, and forward price locks) is exclusive to verified Commercial Buyers (Retailers, Restaurants, Processors, and Institutions). Your account is currently registered as a <strong>Household Buyer (1–20 kg guidance)</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, type: 'Retailer' }))
                      showToast('Account upgraded to Commercial Retailer for evaluation demo!', 'success')
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    Upgrade to Commercial Business Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    As a verified <strong>{profile.type}</strong>, you have full access to FPO bulk aggregation, multi-ton consolidated consignments, and forward price agreements.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <div className="font-bold text-emerald-900">Multi-Ton Cluster Allocation</div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Pool harvest across 15+ villages with synchronized dispatch.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <div className="font-bold text-emerald-900">Forward Contract Price Lock</div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Lock 30-day fixed pricing against verified crop registry schedules.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 13: SUPPORT */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Helpdesk & Resolution</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">AgriLink Buyer Assistance</h3>
              <p className="text-xs text-slate-500 mt-1">Direct support for order tracking, delivery inspection disputes, and escrow release</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                  <Phone className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">FPO Regional Helpdesk</div>
                  <div className="text-base font-black text-emerald-900">1800-AGRI-LINK (Toll Free)</div>
                </div>
              </div>
              <span className="text-xs text-emerald-700 font-semibold hidden sm:inline">Mon–Sat (7 AM – 7 PM)</span>
            </div>

            {/* FAQs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frequently Asked Questions</h4>
              <div className="space-y-2 text-xs">
                {[
                  { q: 'How does gate quality inspection work?', a: 'When the FPO vehicle arrives, you or your receiving manager can inspect the crates against the GradeCam AI certificate. Any blemish or weight discrepancy can be recorded directly before signing the e-POD.' },
                  { q: 'When are escrow funds released to the farmer?', a: 'Funds are securely locked in SBI Agri Escrow upon order confirmation. They are only disbursed to the farmer after you sign the delivery receipt.' },
                  { q: 'Can I cancel or alter an order before dispatch?', a: 'Orders can be altered freely during the "Confirmed" stage. Once "Allocated" and "In Transit", cancellation requires FPO desk concurrence.' },
                ].map((faq, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900">{faq.q}</div>
                    <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRODUCT DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-16 rounded-2xl bg-slate-100 p-2 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedProduct.image} alt={selectedProduct.crop} className="size-12 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedProduct.crop}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                      {selectedProduct.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedProduct.hindiName} · {selectedProduct.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Product Description */}
            <p className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</p>

            {/* Quality & Freshness Parameters */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">GradeCam AI Score</span>
                <div className="font-black text-emerald-600 text-sm mt-0.5">{selectedProduct.qualityScore}% Match</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Moisture Content</span>
                <div className="font-black text-slate-900 text-sm mt-0.5">{selectedProduct.moisturePercent}%</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Blemish Limit</span>
                <div className="font-medium text-slate-700 text-xs mt-0.5">{selectedProduct.blemishTolerance}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Harvest Timing</span>
                <div className="font-medium text-slate-700 text-xs mt-0.5">{selectedProduct.freshness}</div>
              </div>
            </div>

            {/* Sourcing Origin */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
              <div className="font-bold text-emerald-900">{selectedProduct.sourceFpo}</div>
              <div className="text-emerald-700 text-[11px] mt-0.5">{selectedProduct.location} ({selectedProduct.distanceKm} km away)</div>
              <div className="text-[11px] text-emerald-800 font-semibold mt-1">Delivery: {selectedProduct.deliveryEstimate}</div>
            </div>

            {/* Price & Quantity Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400 font-semibold">Indicative Price</div>
                <div className="text-xl font-black text-slate-900">
                  ₹{selectedProduct.indicativePricePerKg} <span className="text-xs font-semibold text-slate-400">/ kg</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  {selectedProduct.retailSavingPercent}% cheaper than mandi retail
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  onClick={() => setModalQty((prev) => Math.max(selectedProduct.minOrderKg, prev - 10))}
                  className="p-2 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  value={modalQty}
                  onChange={(e) => setModalQty(Number(e.target.value))}
                  min={selectedProduct.minOrderKg}
                  max={selectedProduct.availableKg}
                  className="w-16 text-center font-bold text-sm bg-transparent outline-none"
                />
                <span className="text-xs font-semibold text-slate-400 pr-2">kg</span>
                <button
                  onClick={() => setModalQty((prev) => Math.min(selectedProduct.availableKg, prev + 10))}
                  className="p-2 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart CTA */}
            <button
              onClick={() => handleAddToCart(selectedProduct, modalQty)}
              className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="size-4" />
              <span>Add {modalQty} kg to Cart (₹{(selectedProduct.indicativePricePerKg * modalQty).toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Reusable Product Card for Browse and Recommendations
 */
function ProductCard({
  product,
  isSaved,
  onToggleSave,
  onViewDetails,
  onAddToCart,
}: {
  product: ProduceProduct
  isSaved: boolean
  onToggleSave: () => void
  onViewDetails: () => void
  onAddToCart: (qty: number) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div className="p-5 space-y-4">
        {/* Card Header: Thumb, Crop, Grade, Wishlist */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-slate-100 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.crop} className="size-10 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-base font-black text-slate-900">{product.crop}</h4>
                <span className="text-xs text-slate-400 font-medium">({product.hindiName})</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                  {product.grade}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">{product.availableKg} kg available</span>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleSave}
            className={`p-2 rounded-xl transition-colors ${
              isSaved ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save Item'}
          >
            <Heart className="size-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Origin & Location */}
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Building2 className="size-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{product.sourceFpo}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <MapPin className="size-3.5 text-slate-400 shrink-0" />
            <span>{product.location} ({product.distanceKm} km)</span>
          </div>
        </div>

        {/* Freshness & Delivery Badges */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            <Sparkles className="size-3 shrink-0" />
            <span className="truncate">{product.freshness}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
            <Truck className="size-3 text-slate-400 shrink-0" />
            <span>{product.deliveryEstimate}</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Actions */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Indicative Rate</div>
          <div className="text-base font-black text-slate-900">
            ₹{product.indicativePricePerKg} <span className="text-xs font-semibold text-slate-400">/ kg</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewDetails}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors"
            title="View full specs"
          >
            <Eye className="size-4" />
          </button>
          <button
            onClick={() => onAddToCart(25)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="size-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  )
}
