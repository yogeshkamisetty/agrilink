'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag,
  Search,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  X,
  RefreshCw,
  MapPin,
  Star,
  Check,
  Lock,
} from 'lucide-react'

export interface BuyerMarketplaceProps {
  currentUserName?: string | null
  buyerId?: string
  buyerName?: string
  deliveryLocation?: string
}

interface ProductItem {
  id: string
  name: string
  hindiName: string
  cropKey: string
  category: 'Vegetables' | 'Grains' | 'Tubers'
  ratePerKg: number
  mandiRatePerKg: number
  minOrderKg: number
  availableStockKg: number
  originVillage: string
  farmersCount: number
  rating: number
  reviewsCount: number
  description: string
  harvestDate: string
  image: string
  featuredBadge?: string
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'prod-tomato',
    name: 'Farmgate Hybrid Tomato',
    hindiName: 'ताजा टमाटर',
    cropKey: 'TOMATO',
    category: 'Vegetables',
    ratePerKg: 24,
    mandiRatePerKg: 32,
    minOrderKg: 10,
    availableStockKg: 3200,
    originVillage: 'Boriavi & Sojitra Clusters',
    farmersCount: 14,
    rating: 4.9,
    reviewsCount: 128,
    description: 'High-lycopene grade-A hybrid tomatoes, freshly harvested from smallholder orchards. Uniform shape and long shelf life.',
    harvestDate: 'Harvested Today Morning',
    image: '/crops/tomato.png',
    featuredBadge: '⚡ Best Seller',
  },
  {
    id: 'prod-onion',
    name: 'Kheda Nasik Red Onion',
    hindiName: 'लाल प्याज',
    cropKey: 'ONION',
    category: 'Vegetables',
    ratePerKg: 22,
    mandiRatePerKg: 28,
    minOrderKg: 15,
    availableStockKg: 2800,
    originVillage: 'Borsad & Petlad Villages',
    farmersCount: 19,
    rating: 4.8,
    reviewsCount: 94,
    description: 'Cured red onions with medium pungency and thick outer skin. Ideal for institutional kitchens and community dining.',
    harvestDate: 'Cured & Graded 24h ago',
    image: '/crops/onion.png',
    featuredBadge: '🛡️ Fair Price Choice',
  },
  {
    id: 'prod-wheat',
    name: 'Sharbati Golden Wheat',
    hindiName: 'शरबती गेहूं',
    cropKey: 'WHEAT',
    category: 'Grains',
    ratePerKg: 26,
    mandiRatePerKg: 34,
    minOrderKg: 20,
    availableStockKg: 6500,
    originVillage: 'Bakrol & Anand Plains',
    farmersCount: 22,
    rating: 5.0,
    reviewsCount: 210,
    description: 'Directly sourced premium whole grain Sharbati wheat. 100% sortex cleaned, high protein, zero moisture rot.',
    harvestDate: 'Cleaned Lot · Season Stock',
    image: '/crops/wheat.png',
    featuredBadge: '🌾 Institutional Grade',
  },
  {
    id: 'prod-potato',
    name: 'Gujarat Jyoti Potato',
    hindiName: 'देशी आलू',
    cropKey: 'POTATO',
    category: 'Tubers',
    ratePerKg: 17,
    mandiRatePerKg: 23,
    minOrderKg: 15,
    availableStockKg: 4100,
    originVillage: 'Petlad & Karamsad Cluster',
    farmersCount: 11,
    rating: 4.7,
    reviewsCount: 76,
    description: 'Cold-store conditioned table potatoes with thin skin and firm flesh. Excellent starch balance, zero sprouting.',
    harvestDate: 'Fresh Dispatch Lot',
    image: '/crops/potato.png',
    featuredBadge: '💰 Super Saver',
  },
  {
    id: 'prod-paddy',
    name: 'Gujarat 17 Premium Paddy (Rice)',
    hindiName: 'धान (चावल)',
    cropKey: 'PADDY',
    category: 'Grains',
    ratePerKg: 28,
    mandiRatePerKg: 36,
    minOrderKg: 25,
    availableStockKg: 8000,
    originVillage: 'Mahi River Basin, Anand',
    farmersCount: 28,
    rating: 4.9,
    reviewsCount: 185,
    description: 'Aromatic medium-grain raw paddy rice from Mahi canal basin farms. 98.5% grain purity with zero broken chalky kernel.',
    harvestDate: 'Season Harvest Lot',
    image: '/crops/paddy.png',
    featuredBadge: '⭐ Prime Harvest',
  },
]

// Preset Institutional Purpose options for > 50 kg orders
const PURPOSE_PRESETS = [
  '🏫 Mid-day School Meal Nutrition Programme (1,100 students)',
  '🏥 Civil Hospital Inpatient Diet Kitchen (300 beds)',
  '🍛 Community Hostel Mess Weekly Supply (250 residents)',
  '🏪 PDS Fair Price Shop Network Buffer Stock',
  '🎉 Community Gathering / Wedding Reception (500 guests)',
  '🏢 Corporate Campus Employee Cafeteria Supply',
]

export function BuyerMarketplace({
  currentUserName,
  buyerId = 'buyer-school-001',
  buyerName = 'PM POSHAN Central Kitchen, Vallabh Vidyanagar',
  deliveryLocation = 'Kitchen Block, Nana Bazaar, Vallabh Vidyanagar, Anand',
}: BuyerMarketplaceProps) {
  // Filters and UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'prod-tomato': 45, // default ≤ 50 kg for demonstration
    'prod-onion': 120, // default > 50 kg for bulk demonstration
    'prod-wheat': 500,
    'prod-potato': 35,
    'prod-paddy': 1000,
  })

  // Checkout modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [checkoutQty, setCheckoutQty] = useState<number>(45)
  const [purposeText, setPurposeText] = useState<string>('')
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState<string>(() => {
    return new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  })
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null)

  // Live Orders state
  const [liveOrders, setLiveOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Fetch live orders
  const fetchLiveOrders = async () => {
    try {
      setOrdersLoading(true)
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.orders)) {
          setLiveOrders(data.orders)
        }
      }
    } catch {} finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveOrders()
    const timer = setInterval(fetchLiveOrders, 3000)

    // Cross-tab real-time sync
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = (event) => {
          fetchLiveOrders()
          if (event.data?.type === 'ORDER_VALIDATED') {
            setOrderFeedback('🎉 Live Update: Administrator just reviewed and updated an order status!')
            setTimeout(() => setOrderFeedback(null), 6000)
          }
        }
      }
    } catch {}

    const handleLocalEvent = () => fetchLiveOrders()
    window.addEventListener('agrilink:order-created', handleLocalEvent)

    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:order-created', handleLocalEvent)
      try { bc?.close() } catch {}
    }
  }, [])

  // Quantity helpers
  const handleQtyChange = (prodId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[prodId] || 25
      const updated = Math.max(5, current + delta)
      return { ...prev, [prodId]: updated }
    })
  }

  const handleSetExactQty = (prodId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [prodId]: Math.max(1, value),
    }))
  }

  // Open Amazon-style checkout
  const openCheckout = (prod: ProductItem) => {
    setSelectedProduct(prod)
    const currentQty = quantities[prod.id] || 45
    setCheckoutQty(currentQty)
    if (currentQty > 50) {
      setPurposeText('Mid-day Meal School Programme Buffer Stock (1,100 students)')
    } else {
      setPurposeText('')
    }
  }

  // Submit Order Execution
  const handleConfirmOrder = async () => {
    if (!selectedProduct) return

    const isBulk = checkoutQty > 50
    if (isBulk && (!purposeText || purposeText.trim().length < 8)) {
      alert('Orders over 50 kg require a clear institutional purpose for administrator verification.')
      return
    }

    setIsPlacingOrder(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: selectedProduct.cropKey,
          qtyTargetKg: checkoutQty,
          pricePerKg: selectedProduct.ratePerKg,
          deliveryDate: scheduledDeliveryDate,
          buyerId,
          buyerName,
          deliveryLocation,
          purpose: isBulk ? purposeText.trim() : null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.order) {
        // Broadcast across all open browser windows (so Admin sees it in real-time)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agrilink:order-created'))
          try {
            const bc = new BroadcastChannel('agrilink_sync')
            bc.postMessage({ type: 'ORDER_CREATED', order: data.order, isBulk })
            bc.close()
          } catch {}
        }

        setSelectedProduct(null)
        setOrderFeedback(
          isBulk
            ? `🛡️ Bulk Order Created (${checkoutQty} KG ${selectedProduct.name})! Purpose submitted for live administrator validation.`
            : `⚡ Order Placed (${checkoutQty} KG ${selectedProduct.name})! Automatically matched to nearest smallholder with zero admin delay.`
        )
        setTimeout(() => setOrderFeedback(null), 8000)
        await fetchLiveOrders()
      } else {
        alert(data.error || 'Failed to place order.')
      }
    } catch {
      alert('Network error while placing order.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Filtered products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hindiName.includes(searchQuery) ||
        p.cropKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.originVillage.toLowerCase().includes(searchQuery.toLowerCase())

      if (activeCategory === 'All') return matchesSearch
      if (activeCategory === 'Vegetables') return matchesSearch && p.category === 'Vegetables'
      if (activeCategory === 'Grains') return matchesSearch && p.category === 'Grains'
      if (activeCategory === 'Tubers') return matchesSearch && p.category === 'Tubers'
      if (activeCategory === 'Small') return matchesSearch && (quantities[p.id] || 0) <= 50
      if (activeCategory === 'Bulk') return matchesSearch && (quantities[p.id] || 0) > 50
      return matchesSearch
    })
  }, [searchQuery, activeCategory, quantities])

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {orderFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="size-5 shrink-0" />
          <div className="text-xs sm:text-sm font-semibold">{orderFeedback}</div>
        </div>
      )}

      {/* 1. Amazon / Flipkart Style Store Header */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles className="size-3.5" />
                AgriLink Farmgate Direct • Amazon/Flipkart Marketplace
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                DoCA Assured
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Farm Produce Sourcing Store
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Order fresh harvest directly from verified smallholders in Gujarat clusters. Zero middlemen margin, transparent rates, and guaranteed weighment.
            </p>
          </div>

          {/* Delivery location address bar (Amazon Style) */}
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/80 border border-border p-3 sm:p-3.5 shrink-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MapPin className="size-5" />
            </div>
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Deliver to Institutional Kitchen:
              </span>
              <span className="font-bold text-foreground truncate max-w-[200px] block">
                {deliveryLocation}
              </span>
              <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Next-Day Tata Ace Delivery Active
              </span>
            </div>
          </div>
        </div>

        {/* 2. Amazon Search Bar & Quick Categories */}
        <div className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh farm produce (e.g. Tomato, Onion, Wheat, Potato, Paddy)..."
                className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['All', 'Vegetables', 'Grains', 'Tubers', 'Small', 'Bulk'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {cat === 'All'
                    ? 'All Items'
                    : cat === 'Small'
                    ? '⚡ ≤50 kg Direct'
                    : cat === 'Bulk'
                    ? '🛡️ >50 kg Bulk'
                    : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Flipkart / Amazon Promotional Ribbon */}
          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-950 dark:text-emerald-300 block">Zero Middlemen Markup</span>
                <span className="text-emerald-800 dark:text-emerald-400 text-[11px]">Save 20% to 26% vs local APMC mandi</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3">
              <Truck className="size-5 text-blue-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-blue-950 dark:text-blue-300 block">Tata Ace Doorstep Dispatch</span>
                <span className="text-blue-800 dark:text-blue-400 text-[11px]">Direct farm collection to your depot gate</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
              <Lock className="size-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-950 dark:text-amber-300 block">50 KG Protocol Verification</span>
                <span className="text-amber-800 dark:text-amber-400 text-[11px]">Auto-match ≤50kg · Admin review &gt;50kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Catalog Grid (Amazon / Flipkart Layout) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            Verified Smallholder Harvests ({filteredProducts.length})
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Live prices pegged to DoCA / APMC benchmark
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((prod) => {
            const qty = quantities[prod.id] || 25
            const isBulk = qty > 50
            const grossTotal = qty * prod.ratePerKg
            const mandiTotal = qty * prod.mandiRatePerKg
            const savings = mandiTotal - grossTotal
            const savingsPct = Math.round(((prod.mandiRatePerKg - prod.ratePerKg) / prod.mandiRatePerKg) * 100)

            return (
              <div
                key={prod.id}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <div>
                  {/* Card Top: Badges & Thumbnail */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        {prod.featuredBadge}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                        {savingsPct}% Cheaper
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      <span>{prod.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({prod.reviewsCount})</span>
                    </div>
                  </div>

                  {/* Produce Image with Zoom effect */}
                  <div className="mt-4 relative h-40 w-full rounded-2xl bg-secondary/60 border border-border flex items-center justify-center overflow-hidden p-3">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-medium">
                      {prod.originVillage}
                    </div>
                  </div>

                  {/* Product Title & Details */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-lg font-bold text-foreground">
                        {prod.name}
                      </h3>
                      <span className="text-xs text-muted-foreground font-medium">
                        {prod.hindiName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {prod.description}
                    </p>
                  </div>

                  {/* Pricing Box (Amazon Style) */}
                  <div className="mt-4 rounded-2xl bg-secondary/50 p-3 border border-border/70 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground mr-1">Farmgate Rate:</span>
                        <span className="font-serif text-2xl font-bold text-primary">
                          ₹{prod.ratePerKg}
                        </span>
                        <span className="text-xs text-muted-foreground">/kg</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="line-through text-muted-foreground">₹{prod.mandiRatePerKg}/kg</span>
                        <span className="block text-[10px] font-bold text-emerald-600">Save ₹{savings.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Available Harvest: <strong>{prod.availableStockKg.toLocaleString()} KG</strong></span>
                      <span className="text-emerald-700 font-semibold">{prod.farmersCount} Farmers Pool</span>
                    </div>
                  </div>

                  {/* Interactive Quantity Selector & Presets */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">Choose Quantity (KG):</span>
                      <span className="font-mono text-primary font-bold">{qty} KG</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQtyChange(prod.id, -10)}
                        className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground font-bold hover:bg-secondary active:scale-95 transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => handleSetExactQty(prod.id, Number(e.target.value))}
                        className="flex-1 text-center font-mono font-bold text-sm py-1.5 rounded-xl border border-border bg-background focus:border-primary outline-none"
                      />
                      <button
                        onClick={() => handleQtyChange(prod.id, 10)}
                        className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground font-bold hover:bg-secondary active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Fast Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[25, 50, 100, 250, 500].map((presetKg) => (
                        <button
                          key={presetKg}
                          onClick={() => handleSetExactQty(prod.id, presetKg)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            qty === presetKg
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {presetKg === 50 ? '50 kg (Limit)' : `${presetKg} kg`}
                        </button>
                      ))}
                    </div>

                    {/* DYNAMIC 50 KG LIMIT BADGE */}
                    <div className="pt-2">
                      {!isBulk ? (
                        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span>Auto-Match (≤ 50 kg): Instant nearest farmer allocation.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                          <span>Bulk Order (&gt; 50 kg): Institutional reason required for admin review.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom CTA Buttons (Amazon / Flipkart Dual Actions) */}
                <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
                  <button
                    onClick={() => openCheckout(prod)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.98] ${
                      isBulk
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                  >
                    <ShoppingBag className="size-4" />
                    <span>{isBulk ? 'Order Bulk (Submit Purpose)' : 'Buy Now (Instant Match)'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Amazon-Style 1-Click Checkout Drawer / Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-secondary p-2 border border-border flex items-center justify-center">
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="size-full object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    1-Click Direct Farmgate Checkout
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedProduct.originVillage} · Rate: ₹{selectedProduct.ratePerKg}/kg
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex size-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Price & Weight Summary */}
            <div className="rounded-2xl bg-secondary/60 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Selected Produce Volume:</span>
                <span className="font-mono font-bold text-foreground text-sm">{checkoutQty} KG</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Farmgate Price (at ₹{selectedProduct.ratePerKg}/kg):</span>
                <span className="font-mono font-semibold text-foreground">₹{(checkoutQty * selectedProduct.ratePerKg).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600">
                <span>Intermediary / Mandi Commission:</span>
                <span className="font-bold">₹0.00 (Direct Protocol)</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600">
                <span>Scheduled Farmgate Freight:</span>
                <span className="font-bold">FREE (Cluster Tata Ace Dispatch)</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold text-foreground">
                <span>Total Amount Payable:</span>
                <span className="font-serif text-xl font-bold text-primary">₹{(checkoutQty * selectedProduct.ratePerKg).toLocaleString()}</span>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Delivery Destination:
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-muted-foreground">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{deliveryLocation}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Scheduled Delivery Date:
                </label>
                <input
                  type="date"
                  value={scheduledDeliveryDate}
                  onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* CRITICAL 50 KG COMPLIANCE PROTOCOL CHECK */}
            {checkoutQty <= 50 ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Small Order Protocol Active (≤ 50 kg)</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  No administrative review is required. Our smart spatial routing algorithm will automatically allocate this request to the single nearest verified smallholder in the cluster.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <span>Bulk Order Compliance Protocol Active (&gt; 50 kg)</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Under DoCA Fair Market guidelines, demands exceeding 50 kg trigger multi-smallholder Knapsack pooling and require a valid institutional purpose for <strong>Real-Time Administrator Verification</strong>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    * Institutional Purchase Purpose / Reason (Required):
                  </label>
                  <textarea
                    rows={3}
                    value={purposeText}
                    onChange={(e) => setPurposeText(e.target.value)}
                    placeholder="Enter intended purpose (e.g. Weekly vegetable supply for 300 hospital patients/hostel students)..."
                    className="w-full rounded-xl border border-amber-500/40 bg-background p-3 text-xs outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  />

                  {/* Preset Chips */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">Presets:</span>
                    {PURPOSE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurposeText(p)}
                        className="rounded-lg bg-secondary border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-left"
                      >
                        {p.split('(')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-600" />
                  <span>The FPO Administrator in the Command Center will review this reason live.</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex-1 rounded-xl border border-border bg-secondary py-3 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isPlacingOrder}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all ${
                  checkoutQty > 50
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isPlacingOrder ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>
                  {checkoutQty > 50
                    ? `Submit for Admin Validation (₹${(checkoutQty * selectedProduct.ratePerKg).toLocaleString()})`
                    : `Confirm Purchase (₹${(checkoutQty * selectedProduct.ratePerKg).toLocaleString()})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Amazon-Style "Your Placed Orders & Real-Time Validation Tracker" */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Live Order Pipeline
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Your Orders & Real-Time Validation Status
            </h3>
            <p className="text-xs text-muted-foreground">
              Live updates via AgriLink BroadcastChannel. When administrator approves a bulk request, status unlocks in real-time.
            </p>
          </div>

          <button
            onClick={fetchLiveOrders}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className={`size-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Feeds</span>
          </button>
        </div>

        {liveOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No active orders found. Place your first order above!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {liveOrders.slice(0, 6).map((ord) => {
              const targetKg = Number(ord.qty_target_kg || ord.quantity_required || 500)
              const isBulk = targetKg > 50
              const isPendingAdmin = ord.review_status === 'pending' || ord.status === 'PENDING_ADMIN_REVIEW'
              const isApproved = ord.review_status === 'approved' || ord.status === 'POSTED' || ord.status === 'AGGREGATED'

              return (
                <div key={ord.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {ord.code || `AG-${String(ord.id).slice(-4).toUpperCase()}`}
                      </span>

                      {/* Real-time Validation Badges */}
                      {isBulk && isPendingAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          ⏳ Awaiting Real-Time Admin Validation
                        </span>
                      )}

                      {isBulk && isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          ✅ Validated & Approved by Admin
                        </span>
                      )}

                      {!isBulk && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-300">
                          ⚡ Auto-Allocated (≤50 kg)
                        </span>
                      )}

                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {ord.status}
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-foreground">
                      {ord.crop} · {targetKg.toLocaleString()} KG at ₹{ord.price_per_kg}/kg
                    </h4>

                    {/* Purpose Note Display */}
                    {ord.purpose && (
                      <div className="rounded-xl bg-secondary/70 border border-border/80 px-3 py-1.5 text-xs text-muted-foreground max-w-xl">
                        <strong className="text-foreground">Submitted Purpose:</strong> &ldquo;{ord.purpose}&rdquo;
                      </div>
                    )}

                    {ord.admin_note && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        🛡️ Administrator Note: {ord.admin_note}
                      </p>
                    )}
                  </div>

                  <div className="text-left md:text-right shrink-0 space-y-1">
                    <span className="text-[11px] text-muted-foreground block">
                      Delivery: {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Next Day'}
                    </span>
                    <span className="font-serif text-lg font-bold text-primary block">
                      ₹{(targetKg * Number(ord.price_per_kg || 28)).toLocaleString()}
                    </span>
                    {ord.allocated_farmer_name && (
                      <span className="text-[10px] text-muted-foreground block">
                        Assigned: {ord.allocated_farmer_name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
