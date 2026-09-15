'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Clock, Info, Loader2, MapPin, RefreshCw, Search, ShieldCheck, ShoppingBag, Sprout, Truck, X } from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import type { BoardOrder, MarketCatalog } from '@/lib/server/marketplace'
import { step5BuyerOrderAndReserve } from '@/lib/workflow-engine'
import { BuyerDashboardView } from './buyer-dashboard-view'

type CatalogItem = MarketCatalog['items'][number]

export interface BuyerMarketplaceProps {
  currentUserName?: string | null
  /** Kept for existing callers; the server resolves the buyer from the signed-in session. */
  buyerId?: string
  buyerName?: string
  deliveryLocation?: string
}

const CROP_IMAGES: Record<string, string> = { TOMATO: '/crops/tomato.png', ONION: '/crops/onion.png', WHEAT: '/crops/wheat.png', POTATO: '/crops/potato.png', PADDY: '/crops/paddy.png' }
const HINDI_NAMES: Record<string, string> = { PADDY: 'धान', WHEAT: 'गेहूं', TOMATO: 'टमाटर', SPINACH: 'पालक', ONION: 'प्याज़', POTATO: 'आलू', BAJRA: 'बाजरा', TUR: 'तुअर' }
const CATEGORY: Record<string, 'Vegetables' | 'Grains & pulses'> = {
  TOMATO: 'Vegetables',
  SPINACH: 'Vegetables',
  ONION: 'Vegetables',
  POTATO: 'Vegetables',
  PADDY: 'Grains & pulses',
  WHEAT: 'Grains & pulses',
  BAJRA: 'Grains & pulses',
  TUR: 'Grains & pulses',
}
const TIER_LABEL: Record<string, string> = { live: 'live', cached: 'last live value', seeded: 'illustrative, offline' }
const PURPOSE_PRESETS = [
  'Mid-day meal kitchen weekly supply',
  'Hospital inpatient kitchen',
  'Hostel mess weekly supply',
  'Fair price shop stock',
  'Residents’ association group purchase',
]

const inr = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`
const kgLabel = (value: number) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
function isoInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function broadcast(type: string, payload: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent('agrilink:order-created'))
  try {
    const bc = new BroadcastChannel('agrilink_sync')
    bc.postMessage({ type, ...payload })
    bc.close()
  } catch {}
}

/** Where an order is, in the buyer's words. */
function orderProgress(o: BoardOrder): { text: string; tone: 'waiting' | 'active' | 'done' | 'problem' } {
  if (o.status === 'REJECTED') return { text: `Not approved${o.admin_note ? `: ${o.admin_note}` : ''}`, tone: 'problem' }
  if (o.order_tier === 'SMALL' && o.status === 'POSTED') {
    if (o.farmer_acceptance_status === 'PENDING') return { text: `Waiting for ${o.allocated_farmer_name ?? 'the nearest farmer'} to confirm`, tone: 'waiting' }
    return { text: 'No single nearby farmer can fill it — the FPO coordinator is pooling it', tone: 'problem' }
  }
  if (o.review_status === 'pending') return { text: 'Waiting for FPO review of your purpose', tone: 'waiting' }
  switch (o.status) {
    case 'POSTED':
      return { text: 'Approved — commit the advance so farmers can be asked to harvest', tone: 'waiting' }
    case 'FUNDED':
      return { text: 'Advance committed — the FPO is lining up farmers', tone: 'active' }
    case 'SOURCING':
      return { text: `${kgLabel(o.qty_committed_kg)} of ${kgLabel(o.qty_target_kg)} committed by farmers`, tone: 'active' }
    case 'COLLECTING':
      return { text: `Being weighed and graded at collection · ${kgLabel(o.accepted_kg)} accepted`, tone: 'active' }
    case 'DISPATCHED':
      return { text: 'On the way — inspect at delivery', tone: 'active' }
    case 'SETTLED':
      return { text: 'Delivered and settled', tone: 'done' }
    default:
      return { text: o.status, tone: 'active' }
  }
}

export function BuyerMarketplace({ currentUserName, buyerId, buyerName, deliveryLocation }: BuyerMarketplaceProps) {
  const [viewMode, setViewMode] = useState<'modern' | 'classic'>('modern')
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'All' | 'Vegetables' | 'Grains & pulses'>('All')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const [checkout, setCheckout] = useState<{ item: CatalogItem; qty: number; price: number; deliveryDate: string; purpose: string } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)

  const threshold = catalog?.smallOrderThresholdKg ?? 50

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace', { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'The store is unavailable right now.')
      setCatalog(json)
      setCatalogError(null)
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'The store is unavailable right now.')
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/orders', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.orders)) setOrders((json.orders as BoardOrder[]).filter((o) => o.is_mine))
      }
    } catch {
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
    loadOrders()
    const timer = setInterval(loadOrders, 15000)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = () => {
        loadOrders()
        loadCatalog()
      }
    } catch {}
    window.addEventListener('agrilink:order-created', loadOrders)
    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:order-created', loadOrders)
      try {
        bc?.close()
      } catch {}
    }
  }, [loadCatalog, loadOrders])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (catalog?.items ?? []).filter((item) => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || (HINDI_NAMES[item.crop] ?? '').includes(q) || item.villages.some((v) => v.toLowerCase().includes(q))
      return matchesSearch && (category === 'All' || CATEGORY[item.crop] === category)
    })
  }, [catalog, search, category])

  const headline = useMemo(() => {
    const all = catalog?.items ?? []
    const withRetail = all.filter((i) => i.band.buyerSavingPerKg != null && i.band.retailPerKg)
    const withMandi = all.filter((i) => i.band.farmerGainPerKg != null && i.band.mandiPerKg)
    return {
      supplyKg: all.reduce((s, i) => s + i.availableKg, 0),
      farmers: all.reduce((s, i) => s + i.farmers, 0),
      buyerSavingPct: withRetail.length ? Math.round((withRetail.reduce((s, i) => s + i.band.buyerSavingPerKg! / i.band.retailPerKg!, 0) / withRetail.length) * 100) : null,
      farmerGainPct: withMandi.length ? Math.round((withMandi.reduce((s, i) => s + i.band.farmerGainPerKg! / i.band.mandiPerKg!, 0) / withMandi.length) * 100) : null,
    }
  }, [catalog])

  function openCheckout(item: CatalogItem) {
    const qty = quantities[item.crop] ?? 25
    setFeedback(null)
    setCheckout({
      item,
      qty,
      price: item.band.fairPricePerKg ?? Math.ceil(item.band.mandiPerKg ?? 1),
      deliveryDate: isoInDays(2),
      purpose: '',
    })
  }

  async function placeOrder() {
    if (!checkout) return
    const bulk = checkout.qty > threshold
    if (bulk && checkout.purpose.trim().length < 12) {
      setFeedback({ tone: 'error', text: `Orders above ${threshold} kg need a purpose of at least 12 characters for FPO review.` })
      return
    }
    setPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          crop: checkout.item.crop,
          qtyTargetKg: checkout.qty,
          pricePerKg: checkout.price,
          deliveryDate: checkout.deliveryDate,
          deliveryLocation,
          purpose: bulk ? checkout.purpose.trim() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'The order could not be placed.')
      
      // Synchronize with primary demo workflow engine: reserve quantity against verified stock
      try {
        step5BuyerOrderAndReserve(checkout.qty)
      } catch {}

      setCheckout(null)
      setFeedback({ tone: 'ok', text: `${json.order.code} placed. ${json.message}` })
      broadcast('ORDER_CREATED', { orderId: json.order.id })
      await Promise.all([loadOrders(), loadCatalog()])
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : 'The order could not be placed.' })
    } finally {
      setPlacing(false)
    }
  }

  async function commitAdvance(order: BoardOrder) {
    setAdvancing(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}/advance`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'The advance could not be committed.')
      setFeedback({ tone: 'ok', text: `${inr(json.order.advanceAmount ?? 0)} advance committed for ${order.code}. The FPO can now ask farmers to harvest.` })
      broadcast('ORDER_FUNDED', { orderId: order.id })
      await loadOrders()
    } catch (e) {
      setFeedback({ tone: 'error', text: e instanceof Error ? e.message : 'The advance could not be committed.' })
    } finally {
      setAdvancing(null)
    }
  }

  const maxDelivery = checkout ? (checkout.item.shelfClass === 'perishable' ? checkout.item.harvestTo : isoInDays(60)) : undefined

  if (viewMode === 'modern') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs">
          <span className="font-semibold text-slate-600">Showing Transformed AgriLink Buyer Experience</span>
          <button
            onClick={() => setViewMode('classic')}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Switch to Compact Store View →
          </button>
        </div>
        <BuyerDashboardView
          currentUserName={currentUserName}
          buyerId={buyerId}
          buyerName={buyerName}
          deliveryLocation={deliveryLocation}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs">
        <span className="font-bold text-emerald-900">Showing Compact View</span>
        <button
          onClick={() => setViewMode('modern')}
          className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors cursor-pointer"
        >
          Switch to Full Marketplace &rarr;
        </button>
      </div>
      {feedback && !checkout && (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${feedback.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
          {feedback.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          <p className="flex-1">{feedback.text}</p>
          <button onClick={() => setFeedback(null)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Sprout className="size-3.5" /> Direct from {catalog?.fpo.name ?? 'FPO'} members
            </span>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">Farm produce, priced between mandi and retail</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground sm:text-sm">
              Every price sits between today’s mandi rate — what farmers would otherwise get — and the retail rate — what shops charge. Each figure shows where it comes from.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-secondary/80 p-3">
            <MapPin className="size-5 text-primary" />
            <div className="text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deliver to</span>
              <span className="block max-w-[220px] truncate font-bold text-foreground">{deliveryLocation ?? 'Your registered delivery address'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Registered harvest available</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{kgLabel(headline.supplyKg)}</p>
            <p className="text-[11px] text-muted-foreground">from {headline.farmers} farmer-crop registrations</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">You pay vs retail</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{headline.buyerSavingPct != null ? `${headline.buyerSavingPct}% less` : '—'}</p>
            <p className="text-[11px] text-muted-foreground">average across crops at the fair price</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Farmers earn vs mandi</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{headline.farmerGainPct != null ? `${headline.farmerGainPct}% more` : '—'}</p>
            <p className="text-[11px] text-muted-foreground">after their share of transport</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Order routing</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">≤{threshold} kg direct</p>
            <p className="text-[11px] text-muted-foreground">larger orders are pooled after FPO review</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crops or villages"
              className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['All', 'Vegetables', 'Grains & pulses'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {c === 'All' ? 'All crops' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {catalogError && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{catalogError}</p>}
      {!catalog && !catalogError && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading registered harvests and today’s prices…
        </p>
      )}
      {catalog && !items.length && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No registered harvest matches this search.</p>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const qty = quantities[item.crop] ?? 25
          const bulk = qty > threshold
          const { band } = item
          const quote = item.mandi ?? item.retail
          return (
            <div key={item.crop} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">{CATEGORY[item.crop] ?? 'Produce'}</span>
                  {quote && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title={quote.detail}>
                      Prices: {quote.source} · {TIER_LABEL[quote.tier] ?? quote.tier}
                    </span>
                  )}
                </div>

                <div className="relative mt-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/60 p-3">
                  {CROP_IMAGES[item.crop] ? <img src={CROP_IMAGES[item.crop]} alt={item.name} className="h-full object-contain drop-shadow-md" /> : <Sprout className="size-12 text-primary/60" />}
                  <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">{item.villages.slice(0, 3).join(' · ')}</div>
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-foreground">{item.name}</h3>
                  <span className="text-xs text-muted-foreground">{HINDI_NAMES[item.crop]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kgLabel(item.availableKg)} uncommitted from {item.farmers} farmer{item.farmers === 1 ? '' : 's'} · harvest {dayLabel(item.harvestFrom)}–{dayLabel(item.harvestTo)} · {item.shelfLifeDays}-day shelf life
                </p>

                <div className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-secondary/50 p-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="mr-1 text-xs text-muted-foreground">Fair price</span>
                      <span className="font-serif text-2xl font-bold text-primary">{band.fairPricePerKg != null ? inr(band.fairPricePerKg) : '—'}</span>
                      <span className="text-xs text-muted-foreground">/kg</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <span>Mandi (farmer’s alternative): <strong className="text-foreground">{band.mandiPerKg != null ? inr(band.mandiPerKg) : 'n/a'}</strong></span>
                    <span>Retail (shop price): <strong className="text-foreground">{band.retailPerKg != null ? inr(band.retailPerKg) : 'n/a'}</strong></span>
                    <span>Farmer earns: <strong className="text-foreground">{band.farmerGainPerKg != null ? `${band.farmerGainPerKg >= 0 ? '+' : ''}${inr(band.farmerGainPerKg)}/kg` : 'n/a'}</strong></span>
                    <span>You save: <strong className="text-foreground">{band.buyerSavingPerKg != null ? `${inr(band.buyerSavingPerKg)}/kg` : 'n/a'}</strong></span>
                  </div>
                  {band.directFarmerSharePct != null && (
                    <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      Farmer keeps <strong className="text-foreground">{band.directFarmerSharePct}%</strong> of what you pay
                      {band.traditionalFarmerSharePct != null && <> — against about {band.traditionalFarmerSharePct}% of the shop price through the mandi chain (mandi ÷ retail)</>}.
                    </p>
                  )}
                </div>

                {item.transport && (
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground" title={item.transport.basis}>
                    <Truck className="mt-0.5 size-3.5 shrink-0" />
                    Transport ≈ {inr(item.transport.perKgRs)}/kg on a consolidated run ({item.transport.km} km), deducted from farmers’ settlement by weight.
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Quantity</span>
                    <span className="font-mono text-primary">{qty} kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantities((p) => ({ ...p, [item.crop]: Math.max(1, qty - 5) }))} className="flex size-9 items-center justify-center rounded-xl border border-border bg-background font-bold hover:bg-secondary">−</button>
                    <input
                      type="number"
                      min={1}
                      max={item.availableKg}
                      value={qty}
                      onChange={(e) => setQuantities((p) => ({ ...p, [item.crop]: Math.max(1, Math.round(Number(e.target.value) || 1)) }))}
                      className="flex-1 rounded-xl border border-border bg-background py-1.5 text-center font-mono text-sm font-bold outline-none focus:border-primary"
                    />
                    <button onClick={() => setQuantities((p) => ({ ...p, [item.crop]: qty + 5 }))} className="flex size-9 items-center justify-center rounded-xl border border-border bg-background font-bold hover:bg-secondary">+</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 25, 50, 100, 250].map((preset) => (
                      <button key={preset} onClick={() => setQuantities((p) => ({ ...p, [item.crop]: preset }))} className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${qty === preset ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                        {preset} kg
                      </button>
                    ))}
                  </div>
                  <p className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium ${bulk ? 'border-amber-500/25 bg-amber-500/10 text-foreground' : 'border-emerald-500/20 bg-emerald-500/10 text-foreground'}`}>
                    {bulk ? <AlertTriangle className="size-3.5 shrink-0 text-amber-600" /> : <Check className="size-3.5 shrink-0 text-emerald-600" />}
                    {bulk ? `Above ${threshold} kg: pooled from several farmers after FPO review of your purpose.` : 'Up to 50 kg: sent straight to the nearest farmer who can fill it.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => openCheckout(item)}
                disabled={band.fairPricePerKg == null}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <ShoppingBag className="size-4" /> {bulk ? 'Order in bulk' : 'Order now'}
              </button>
            </div>
          )
        })}
      </div>

      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Order from {catalog?.fpo.name}</span>
                <h3 className="font-serif text-2xl font-bold text-foreground">{checkout.item.name}</h3>
                <p className="text-xs text-muted-foreground">{checkout.item.villages.join(' · ')}</p>
              </div>
              <button onClick={() => setCheckout(null)} aria-label="Close" className="flex size-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-foreground">
                Quantity (kg)
                <input type="number" min={1} max={checkout.item.availableKg} value={checkout.qty} onChange={(e) => setCheckout({ ...checkout, qty: Math.max(1, Math.round(Number(e.target.value) || 1)) })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 font-mono text-sm outline-none focus:border-primary" />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Your price (₹/kg)
                <input
                  type="number"
                  step="0.5"
                  min={checkout.item.band.mandiPerKg != null ? Math.ceil(checkout.item.band.mandiPerKg) : 1}
                  value={checkout.price}
                  onChange={(e) => setCheckout({ ...checkout, price: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Delivery date
                <input type="date" min={isoInDays(1)} max={maxDelivery} value={checkout.deliveryDate} onChange={(e) => setCheckout({ ...checkout, deliveryDate: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:border-primary" />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The price must be at least the mandi rate ({checkout.item.band.mandiPerKg != null ? inr(checkout.item.band.mandiPerKg) : 'n/a'}) so farmers never earn less than selling at the mandi. The fair price is {checkout.item.band.fairPricePerKg != null ? inr(checkout.item.band.fairPricePerKg) : 'n/a'}.
            </p>

            <div className="space-y-2 rounded-2xl bg-secondary/60 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produce value</span>
                <span className="font-mono font-semibold text-foreground">{inr(checkout.qty * checkout.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform commission</span>
                <span className="font-semibold text-foreground">None in the pilot</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Transport</span>
                <span className="text-right text-foreground">Shared by weight across the collection run, paid out of farmers’ settlement</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2">
                <span className="text-muted-foreground">Payment</span>
                <span className="text-right font-semibold text-foreground">
                  {checkout.qty > threshold ? 'Advance to the FPO account after approval; balance on delivery for what you accept' : 'On delivery, for what you accept at inspection'}
                </span>
              </div>
            </div>

            {checkout.qty > threshold ? (
              <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="size-4 text-amber-600" /> Purpose for FPO review (orders above {threshold} kg)
                </p>
                <textarea rows={3} value={checkout.purpose} onChange={(e) => setCheckout({ ...checkout, purpose: e.target.value })} placeholder="e.g. weekly vegetables for a 300-bed hospital kitchen" className="w-full rounded-xl border border-amber-500/40 bg-background p-3 text-xs outline-none focus:border-amber-600" />
                <div className="flex flex-wrap gap-1.5">
                  {PURPOSE_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setCheckout({ ...checkout, purpose: p })} className="rounded-lg border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                      {p}
                    </button>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="size-3.5" /> The FPO coordinator reviews the purpose before farmers are asked to harvest.
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Sent straight to the nearest member farmer with enough {checkout.item.name.toLowerCase()} registered who can reach you fresh. If they decline it moves to the next nearest.
              </p>
            )}

            {feedback?.tone === 'error' && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{feedback.text}</p>}

            <div className="flex items-center gap-3">
              <button onClick={() => setCheckout(null)} className="flex-1 rounded-xl border border-border bg-secondary py-3 text-xs font-bold text-foreground hover:bg-secondary/80">
                Cancel
              </button>
              <button onClick={placeOrder} disabled={placing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-60 sm:text-sm">
                {placing ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                {checkout.qty > threshold ? 'Submit for review' : 'Place order'} · {inr(checkout.qty * checkout.price)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground sm:text-2xl">Your orders</h3>
            <p className="text-xs text-muted-foreground">Updates as farmers confirm, the FPO reviews, and lots are collected.</p>
          </div>
          <button onClick={loadOrders} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
            <RefreshCw className={`size-3.5 ${ordersLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Orders you place appear here.</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 10).map((o) => {
              const progress = orderProgress(o)
              const canFund = o.order_tier === 'BULK' && o.status === 'POSTED' && o.review_status === 'approved'
              return (
                <div key={o.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{o.code}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{o.order_tier === 'SMALL' ? 'Direct' : 'Pooled'}</span>
                    </div>
                    <h4 className="font-serif text-lg font-bold text-foreground">
                      {o.crop.charAt(0) + o.crop.slice(1).toLowerCase()} · {kgLabel(o.qty_target_kg)} at {inr(o.price_per_kg)}/kg
                    </h4>
                    <p className={`flex items-center gap-1.5 text-xs ${progress.tone === 'problem' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {progress.tone === 'done' ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : progress.tone === 'problem' ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
                      {progress.text}
                    </p>
                    {o.purpose && <p className="text-[11px] text-muted-foreground">Purpose: “{o.purpose}”</p>}
                  </div>
                  <div className="shrink-0 space-y-1 text-left md:text-right">
                    <span className="block text-[11px] text-muted-foreground">Delivery {dayLabel(o.delivery_date)}</span>
                    <span className="block font-serif text-lg font-bold text-primary">{inr(o.qty_target_kg * o.price_per_kg)}</span>
                    {canFund && (
                      <button onClick={() => commitAdvance(o)} disabled={advancing === o.id} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                        {advancing === o.id && <Loader2 className="size-3.5 animate-spin" />} Commit advance
                      </button>
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
