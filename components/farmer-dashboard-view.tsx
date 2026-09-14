'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Camera, Check, CheckCircle2, CircleDollarSign, Clock, Loader2, MessageSquare, Mic, Phone, Receipt, RefreshCw, ShoppingBag, Sprout, Truck, Wheat, X } from 'lucide-react'
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

type GradeAttempt = { aiStatus: 'GRADED' | 'LOW_CONFIDENCE' | 'UNAVAILABLE'; aiGrade: string | null; aiConfidence: number | null; aiReasoning: string | null; aiDefects: string[] }

const CROP_IMAGES: Record<string, string> = { PADDY: '/crops/paddy.png', TOMATO: '/crops/tomato.png', WHEAT: '/crops/wheat.png', ONION: '/crops/onion.png', POTATO: '/crops/potato.png' }
const STAGE: Record<string, string> = {
  POSTED: 'Waiting for the buyer',
  FUNDED: 'Buyer has paid the advance',
  SOURCING: 'Commitments being collected',
  COLLECTING: 'Collection and grading',
  DISPATCHED: 'On the way to the buyer',
  SETTLED: 'Settled',
  REJECTED: 'Cancelled',
}

const LABELS = {
  en: { welcome: 'Welcome', declare: 'Declare harvest', voice: 'Voice assistant', committed: 'Committed produce', vsMandi: 'Compared with the mandi', next: 'Next delivery', received: 'Money received', harvests: 'My registered harvests', commitments: 'My commitments', messages: 'Messages from the FPO', overview: 'My harvest & pickup', demands: 'Buyer demands', quality: 'Quality check', passbook: 'Passbook & payments', allocated: 'An order has been sent to you', accept: 'Accept', decline: 'Decline' },
  hi: { welcome: 'नमस्ते', declare: 'नई फसल दर्ज करें', voice: 'बोलकर पूछें', committed: 'पक्की फसल', vsMandi: 'मंडी से तुलना', next: 'अगली डिलीवरी', received: 'मिला भुगतान', harvests: 'मेरी दर्ज फसलें', commitments: 'मेरे वादे', messages: 'FPO के संदेश', overview: 'मेरी फसल और उठाव', demands: 'खरीदार मांग', quality: 'क्वालिटी जांच', passbook: 'पासबुक और भुगतान', allocated: 'आपको एक ऑर्डर भेजा गया है', accept: 'स्वीकार करें', decline: 'मना करें' },
  te: { welcome: 'నమస్కారం', declare: 'పంటను నమోదు చేయండి', voice: 'వాయిస్ సహాయం', committed: 'ఖరారైన పంట', vsMandi: 'మండీతో పోలిక', next: 'తదుపరి డెలివరీ', received: 'అందిన చెల్లింపు', harvests: 'నా నమోదైన పంటలు', commitments: 'నా ఒప్పందాలు', messages: 'FPO సందేశాలు', overview: 'నా పంట & పికప్', demands: 'కొనుగోలుదారు డిమాండ్లు', quality: 'నాణ్యత తనిఖీ', passbook: 'పాస్‌బుక్ & చెల్లింపులు', allocated: 'మీకు ఒక ఆర్డర్ పంపబడింది', accept: 'అంగీకరించండి', decline: 'తిరస్కరించండి' },
}

const inr = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`
const kgLabel = (value: number) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`
const dayLabel = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const cropLabel = (crop: string) => crop.charAt(0) + crop.slice(1).toLowerCase()

function broadcast(type: string) {
  window.dispatchEvent(new CustomEvent('agrilink:order-created'))
  try {
    const bc = new BroadcastChannel('agrilink_sync')
    bc.postMessage({ type })
    bc.close()
  } catch {}
}

export function FarmerDashboardView({ currentUserName, lang, activeNav, onNavigate, onDeclareHarvest, onOpenVoice }: FarmerDashboardViewProps) {
  const t = (LABELS as Record<string, typeof LABELS.en>)[lang] ?? LABELS.en
  const [me, setMe] = useState<FarmerOverview | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [commitQty, setCommitQty] = useState<Record<string, number>>({})
  const [grading, setGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeAttempt | null>(null)

  const load = useCallback(async () => {
    const [meRes, ordersRes] = await Promise.all([
      fetch('/api/farmer/me', { headers: authHeaders() }).catch(() => null),
      fetch('/api/orders', { headers: authHeaders() }).catch(() => null),
    ])
    if (meRes) {
      const json = await meRes.json().catch(() => ({}))
      if (meRes.ok) {
        setMe(json)
        setMeError(null)
      } else {
        setMeError(json.error || 'Your farm record could not be loaded.')
      }
    }
    if (ordersRes?.ok) {
      const json = await ordersRes.json().catch(() => ({}))
      if (Array.isArray(json.orders)) setOrders(json.orders)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    window.addEventListener('agrilink:order-created', load)
    window.addEventListener('agrilink:harvest-updated', load)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = () => load()
    } catch {}
    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:order-created', load)
      window.removeEventListener('agrilink:harvest-updated', load)
      try {
        bc?.close()
      } catch {}
    }
  }, [load])

  function flash(tone: 'ok' | 'error', text: string) {
    setToast({ tone, text })
    setTimeout(() => setToast((current) => (current?.text === text ? null : current)), 8000)
  }

  async function act(orderId: string, body: Record<string, unknown>) {
    setBusyId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/action`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'That did not go through. Please try again.')
      flash('ok', json.message || 'Done.')
      broadcast('FARMER_ACTION')
      await load()
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'That did not go through. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function gradePhoto(dataUrl: string) {
    const next = me?.summary.nextDelivery
    if (!next) {
      flash('error', 'Photos are checked against a committed lot. Commit your harvest to an order first.')
      return
    }
    setGrading(true)
    try {
      const res = await fetch(`/api/orders/${next.orderId}/grade`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ photoDataUrl: dataUrl }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'The photo could not be checked.')
      setGradeResult(json.attempt)
    } catch (e) {
      setGradeResult(null)
      flash('error', e instanceof Error ? e.message : 'The photo could not be checked.')
    } finally {
      setGrading(false)
    }
  }

  const farmerName = me?.farmer.name ?? currentUserName ?? ''
  const summary = me?.summary
  const allocations = orders.filter((o) => o.is_allocated_to_me)
  const available = new Map((me?.registry ?? []).map((r) => [r.crop, Math.max(0, r.expectedQtyKg - r.committedKg)]))
  const openDemands = orders.filter((o) => o.open_for_commitment)
  const upcoming = orders.filter((o) => o.order_tier === 'BULK' && (o.status === 'POSTED' || o.status === 'FUNDED') && o.review_status !== 'pending' && o.review_status !== 'rejected')
  const received = (summary?.advancesReceived ?? 0) + (summary?.settledNet ?? 0)

  const tabs = [
    { key: 'Overview' as const, label: t.overview, Icon: Wheat },
    { key: 'Orders' as const, label: t.demands, Icon: ShoppingBag, count: openDemands.length },
    { key: 'Collection & grade' as const, label: t.quality, Icon: BadgeCheck },
    { key: 'Settlements' as const, label: t.passbook, Icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-2xl px-5 py-3.5 shadow-2xl ${toast.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-destructive text-white'}`}>
          {toast.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <X className="mt-0.5 size-5 shrink-0" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {me && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-foreground">
                  <Sprout className="size-3.5 text-emerald-600" /> Member, {me.fpo.name}
                </span>
              )}
              {me && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{me.farmer.village}</span>}
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t.welcome}
              {farmerName ? `, ${farmerName}` : ''}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Sell your harvest through your FPO at a price agreed before you pick it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={onDeclareHarvest} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90">
              <Sprout className="size-4" /> {t.declare}
            </button>
            <button onClick={onOpenVoice} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20">
              <Mic className="size-4" /> {t.voice}
            </button>
          </div>
        </div>

        {meError && <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{meError}</p>}
        {!me && !meError && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your farm record…
          </p>
        )}

        {summary && (
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-6 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Wheat className="size-3.5" />{t.committed}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{kgLabel(summary.committedKg)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">worth {inr(summary.contractValue)} at agreed prices</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><CircleDollarSign className="size-3.5" />{t.vsMandi}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {summary.mandiComparison ? `${summary.mandiComparison.gain >= 0 ? '+' : '−'}${inr(Math.abs(summary.mandiComparison.gain))}` : '—'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {summary.mandiComparison ? `${inr(summary.mandiComparison.contractValue)} agreed vs ${inr(summary.mandiComparison.mandiValue)} at the mandi rate on order day` : 'appears once you commit to an order'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Truck className="size-3.5" />{t.next}</p>
              {summary.nextDelivery ? (
                <>
                  <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{dayLabel(summary.nextDelivery.deliveryDate)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {kgLabel(summary.nextDelivery.qtyCommittedKg)} {cropLabel(summary.nextDelivery.crop).toLowerCase()} for {summary.nextDelivery.buyerName} · {STAGE[summary.nextDelivery.orderStatus]}
                    {summary.nextDelivery.vehicleLabel ? ` · ${summary.nextDelivery.vehicleLabel}` : ''}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No pickup scheduled</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Receipt className="size-3.5" />{t.received}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{inr(received)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{inr(summary.advancesReceived)} advances · {inr(summary.settledNet)} settlement balances</p>
            </div>
          </div>
        )}
      </div>

      {allocations.map((o) => (
        <div key={o.id} className="rounded-3xl border-2 border-primary/40 bg-card p-5 shadow-md sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> {t.allocated}
              </span>
              <h3 className="font-serif text-xl font-bold text-foreground sm:text-2xl">
                {kgLabel(o.qty_target_kg)} {cropLabel(o.crop).toLowerCase()} for {o.buyer_name}
              </h3>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span>
                  Price <strong className="font-mono text-foreground">{inr(o.price_per_kg)}/kg</strong>
                  {o.mandi_price_per_kg != null && ` (mandi ${inr(o.mandi_price_per_kg)}/kg)`}
                </span>
                <span>Deliver by <strong className="text-foreground">{dayLabel(o.delivery_date)}</strong></span>
                <span>You are the nearest member with enough registered</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button onClick={() => act(o.id, { action: 'farmer_accept' })} disabled={busyId === o.id} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60">
                {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t.accept}
              </button>
              <button onClick={() => act(o.id, { action: 'farmer_reject' })} disabled={busyId === o.id} className="inline-flex items-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/20 disabled:opacity-60" title="The order moves to the next nearest farmer">
                <X className="size-4" /> {t.decline}
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {tabs.map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition-all sm:text-sm ${activeNav === key ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Icon className="size-4" /> {label}
            {count != null && count > 0 && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-foreground">{count}</span>}
          </button>
        ))}
      </div>

      {activeNav === 'Overview' && me && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <h3 className="font-serif text-xl font-bold text-foreground">{t.harvests}</h3>
                <button onClick={onDeclareHarvest} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80">
                  <Sprout className="size-3.5" /> {t.declare}
                </button>
              </div>
              {me.registry.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No harvest registered yet. Declare what you expect to pick so buyers’ orders can reach you.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {me.registry.map((r) => {
                    const pct = r.expectedQtyKg > 0 ? Math.min(100, Math.round((r.committedKg / r.expectedQtyKg) * 100)) : 0
                    return (
                      <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-border bg-background/40 p-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60 p-1">
                          {CROP_IMAGES[r.crop] ? <img src={CROP_IMAGES[r.crop]} alt="" className="size-full object-contain" /> : <Sprout className="size-6 text-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-foreground">{cropLabel(r.crop)}</p>
                            <p className="text-xs tabular-nums text-muted-foreground">{kgLabel(r.committedKg)} of {kgLabel(r.expectedQtyKg)} committed</p>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">Harvest window {dayLabel(r.harvestWindowStart)} – {dayLabel(r.harvestWindowEnd)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="border-b border-border pb-4 font-serif text-xl font-bold text-foreground">{t.commitments}</h3>
              {me.commitments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No commitments yet. Open demands are under “{t.demands}”.</p>
              ) : (
                <div className="mt-2 divide-y divide-border">
                  {me.commitments.map((c) => (
                    <div key={`${c.orderId}-${c.isStandby}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {kgLabel(c.qtyCommittedKg)} {cropLabel(c.crop).toLowerCase()} · {c.buyerName}
                          {c.isStandby && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">standby</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.code} · deliver by {dayLabel(c.deliveryDate)} · {STAGE[c.orderStatus]}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-foreground">{inr(c.pricePerKg)}/kg</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-border pb-4 font-serif text-xl font-bold text-foreground">
              <MessageSquare className="size-5 text-muted-foreground" /> {t.messages}
            </h3>
            {me.messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Offers, confirmations and payment notes will appear here, as sent to your phone.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {me.messages.map((m) => (
                  <li key={m.id} className="rounded-2xl bg-secondary/60 p-3 text-xs">
                    <p className="text-foreground">{m.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {m.channel} · {new Date(m.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeNav === 'Orders' && (
        <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="font-serif text-2xl font-bold text-foreground">{t.demands}</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Funded orders that are taking commitments. You can commit up to what you have registered and not yet promised; anything past the order’s 115% cap is not taken.</p>
          </div>

          {openDemands.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No order is taking commitments right now.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {openDemands.map((d) => {
                const mine = available.get(d.crop) ?? 0
                const needed = Math.max(0, d.qty_target_kg - d.qty_committed_kg)
                const qty = commitQty[d.id] ?? Math.min(mine, needed > 0 ? needed : mine)
                return (
                  <div key={d.id} className="flex flex-col justify-between rounded-2xl border border-border bg-background/40 p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60 p-1">
                          {CROP_IMAGES[d.crop] ? <img src={CROP_IMAGES[d.crop]} alt="" className="size-full object-contain" /> : <Sprout className="size-6 text-primary" />}
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">{d.code}</span>
                      </div>
                      <h4 className="mt-3 font-serif text-xl font-bold text-foreground">{cropLabel(d.crop)}</h4>
                      <p className="text-xs text-muted-foreground">{d.buyer_name}</p>
                      <div className="mt-3 space-y-1.5 rounded-xl bg-secondary/60 p-3 text-xs">
                        <p className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold text-foreground">{inr(d.price_per_kg)}/kg{d.mandi_price_per_kg != null && <span className="font-normal text-muted-foreground"> · mandi {inr(d.mandi_price_per_kg)}</span>}</span></p>
                        <p className="flex justify-between"><span className="text-muted-foreground">Deliver by</span><span className="font-semibold text-foreground">{dayLabel(d.delivery_date)}</span></p>
                        <p className="flex justify-between"><span className="text-muted-foreground">Still needed</span><span className="font-semibold text-foreground">{kgLabel(needed)} {needed === 0 && '(standby only)'}</span></p>
                        <p className="flex justify-between"><span className="text-muted-foreground">You have uncommitted</span><span className="font-semibold text-foreground">{kgLabel(mine)}</span></p>
                      </div>
                    </div>
                    {mine > 0 ? (
                      <div className="mt-4 flex items-center gap-2">
                        <input type="number" min={1} max={mine} value={qty} onChange={(e) => setCommitQty((p) => ({ ...p, [d.id]: Math.max(0, Number(e.target.value) || 0) }))} className="w-24 rounded-xl border border-border bg-background px-2 py-2 text-center font-mono text-sm outline-none focus:border-primary" aria-label="Kilograms to commit" />
                        <button onClick={() => act(d.id, { action: 'farmer_commit', committedKg: qty })} disabled={busyId === d.id || qty <= 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                          {busyId === d.id ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Commit
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-[11px] text-muted-foreground">Register {cropLabel(d.crop).toLowerCase()} to take part.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Clock className="size-4 text-muted-foreground" /> Coming up</h4>
              <p className="mb-3 text-xs text-muted-foreground">Approved orders that open for commitments once the buyer pays the advance — useful for planning your harvest.</p>
              <div className="divide-y divide-border rounded-2xl border border-border">
                {upcoming.map((o) => (
                  <div key={o.id} className="flex flex-col gap-1 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-foreground">{kgLabel(o.qty_target_kg)} {cropLabel(o.crop).toLowerCase()} · {o.buyer_name}</span>
                    <span className="text-muted-foreground">{inr(o.price_per_kg)}/kg · by {dayLabel(o.delivery_date)} · {STAGE[o.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeNav === 'Collection & grade' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground"><Camera className="size-5 text-muted-foreground" /> GradeCam pre-check</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Photograph a sample of the lot for your next delivery. The AI suggests a grade against AGMARK criteria; the FPO coordinator makes the final call at collection.
            </p>
            <div className="mt-4">
              <GradeCamCamera onCapture={gradePhoto} disabled={grading || !summary?.nextDelivery} />
            </div>
            {!summary?.nextDelivery && <p className="mt-3 text-xs text-muted-foreground">Commit to an order first — the check is recorded against that lot.</p>}
            {grading && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking the photo…
              </p>
            )}
            {gradeResult && (
              <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4 text-xs">
                {gradeResult.aiStatus === 'UNAVAILABLE' ? (
                  <p className="text-foreground">AI grading is unavailable ({gradeResult.aiReasoning}). The coordinator will grade the lot by hand.</p>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">
                      {gradeResult.aiStatus === 'GRADED' ? `Suggested grade ${gradeResult.aiGrade}` : `Unsure${gradeResult.aiGrade ? ` — possibly grade ${gradeResult.aiGrade}` : ''}`}
                      {gradeResult.aiConfidence != null && <span className="font-normal text-muted-foreground"> · {Math.round(gradeResult.aiConfidence * 100)}% confidence</span>}
                    </p>
                    {gradeResult.aiReasoning && <p className="mt-1 text-muted-foreground">{gradeResult.aiReasoning}</p>}
                    {gradeResult.aiDefects.length > 0 && <p className="mt-1 text-muted-foreground">Seen: {gradeResult.aiDefects.join('; ')}</p>}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-xl font-bold text-foreground">Graded lots</h3>
            {(me?.sales ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Lots appear here once they are weighed and graded at collection.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {me!.sales.map(({ lot }) => (
                  <div key={lot.id} className="rounded-2xl border border-border bg-background/40 p-3 text-xs">
                    <p className="flex justify-between gap-2">
                      <span className="font-semibold text-foreground">{lot.code} · {cropLabel(lot.crop)}</span>
                      <span className="text-foreground">{lot.decision === 'REJECTED' ? 'Not accepted' : `Grade ${lot.finalGrade}`}</span>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Weighed {kgLabel(lot.qtyWeighedKg)} · accepted {kgLabel(lot.qtyAcceptedKg)} · {lot.decision === 'OVERRIDDEN' ? `AI grade changed by the coordinator: ${lot.overrideReason}` : lot.decision === 'MANUAL' ? 'graded by the coordinator' : lot.decision === 'REJECTED' ? lot.overrideReason : 'AI grade accepted'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeNav === 'Settlements' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
            <h3 className="border-b border-border pb-4 font-serif text-2xl font-bold text-foreground">{t.passbook}</h3>
            {(me?.sales ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Payments appear here from your first accepted lot: the advance on harvest day, then the balance after delivery.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {me!.sales.map(({ lot, settlement, advance, proof }) => (
                  <div key={lot.id} className="rounded-2xl border border-border bg-background/40 p-4 text-sm">
                    <p className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>{lot.code} · {lot.orderCode} · {lot.buyerName}</span>
                      <span>{STAGE[lot.orderStatus]}</span>
                    </p>
                    {settlement ? (
                      <div className="mt-2 space-y-1">
                        <p className="flex justify-between"><span className="text-muted-foreground">{kgLabel(settlement.acceptedKg)} × {inr(settlement.pricePerKg)}</span><span className="font-semibold text-foreground">{inr(settlement.grossAmount)}</span></p>
                        <p className="flex justify-between text-xs"><span className="text-muted-foreground">Advance already paid</span><span className="text-foreground">−{inr(settlement.advanceDeducted)}</span></p>
                        <p className="flex justify-between text-xs"><span className="text-muted-foreground">Share of transport</span><span className="text-foreground">−{inr(settlement.transportShare)}</span></p>
                        <p className="flex justify-between border-t border-border pt-1 font-semibold"><span className="text-foreground">Balance paid</span><span className="text-foreground">{inr(settlement.netPayable)}</span></p>
                        {proof?.farmerGain != null && (
                          <p className="text-[11px] text-muted-foreground">
                            You realised {inr(proof.farmerRealised)}/kg after transport — {proof.farmerGain >= 0 ? `${inr(proof.farmerGain)} above` : `${inr(Math.abs(proof.farmerGain))} below`} the mandi reference of {inr(proof.mandi!)}/kg.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 flex justify-between"><span className="text-muted-foreground">Advance on harvest day ({kgLabel(lot.qtyAcceptedKg)} accepted)</span><span className="font-semibold text-foreground">{inr(advance ?? 0)}</span></p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <h4 className="font-serif text-lg font-bold text-foreground">How you are paid</h4>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>Advance: when your lot is accepted at collection, from the buyer’s advance held in the FPO’s bank account.</li>
              <li>Balance: after the buyer inspects the delivery — agreed price × accepted weight, less the advance and your share of transport by weight.</li>
              <li>Every payment is also sent to your phone as a message in your language.</li>
            </ul>
            <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-3.5 text-xs">
              <p className="flex items-center justify-between"><span className="text-muted-foreground">Kisan Call Centre</span><span className="font-mono font-bold text-foreground">1800-180-1551</span></p>
            </div>
            <a href="tel:18001801551" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90">
              <Phone className="size-3.5" /> Call Kisan Call Centre
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
