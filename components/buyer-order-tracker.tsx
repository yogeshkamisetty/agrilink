'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, Loader2, Receipt, RefreshCw, Truck } from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import type { BoardOrder } from '@/lib/server/marketplace'
import type { OrderDetail } from '@/lib/server/views'
import { step7DeliverAndSettle } from '@/lib/workflow-engine'
import { RouteMap } from './route-map'

/** What the order endpoint returns to the ordering buyer: no farmer phone numbers or match internals. */
type BuyerOrderView = Omit<OrderDetail, 'farmers' | 'match' | 'cascade'>

const inr = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`
const kgLabel = (value: number) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`
const dayLabel = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const timeLabel = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Step({ done, current, title, detail }: { done: boolean; current?: boolean; title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <Circle className={`mt-0.5 size-5 shrink-0 ${current ? 'text-primary' : 'text-muted-foreground/50'}`} />}
      <div>
        <p className={`text-sm font-semibold ${done || current ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </li>
  )
}

/** The buyer's side of an order after it is placed: sourcing progress, collection, delivery inspection, and the money trail. */
export function BuyerOrderTracker({ focus }: { focus: 'delivery' | 'payments' }) {
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<BuyerOrderView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [turnedAway, setTurnedAway] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/orders', { headers: authHeaders() }).catch(() => null)
    if (!res?.ok) return
    const json = await res.json()
    const mine = (json.orders as BoardOrder[]).filter((o) => o.is_mine)
    setOrders(mine)
    setSelected((current) => (current && mine.some((o) => o.id === current) ? current : (mine[0]?.id ?? null)))
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, { headers: authHeaders() }).catch(() => null)
    if (!res) return
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setDetail(json)
      setError(null)
    } else {
      setError(json.error || 'This order could not be loaded.')
    }
  }, [])

  useEffect(() => {
    loadOrders()
    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders])

  useEffect(() => {
    if (!selected) return
    loadDetail(selected)
    const timer = setInterval(() => loadDetail(selected), 15000)
    return () => clearInterval(timer)
  }, [selected, loadDetail])

  async function confirmDelivery() {
    if (!detail) return
    setBusy(true)
    try {
      const rejections = Object.entries(turnedAway).map(([lotId, reason]) => ({ lotId, reason }))
      const res = await fetch(`/api/orders/${detail.order.id}/deliver`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ rejections }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'The delivery could not be confirmed.')

      // Finalize primary demo workflow engine settlement (370 kg accepted × ₹30 - ₹240 = ₹10,860 net)
      try {
        step7DeliverAndSettle()
      } catch {}

      setNotice({ tone: 'ok', text: `Delivery confirmed. Invoice ${inr(json.invoice)} for ${kgLabel(json.invoicedKg)}${json.rejectedLots ? `; ${json.rejectedLots} lot(s) turned away are not invoiced` : ''}.` })
      setTurnedAway({})
      await Promise.all([loadOrders(), loadDetail(detail.order.id)])
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'The delivery could not be confirmed.' })
    } finally {
      setBusy(false)
    }
  }

  if (!orders.length) {
    return <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Orders you place from the store appear here with their delivery and payment progress.</div>
  }

  const order = detail?.order
  const status = order?.status
  const reached = (s: string[]) => Boolean(status && s.includes(status))
  const acceptedLots = (detail?.lots ?? []).filter((l) => l.qtyAcceptedKg > 0)
  const route = detail?.consignment?.routeJson

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {orders.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              setSelected(o.id)
              setTurnedAway({})
              setNotice(null)
            }}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${selected === o.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
          >
            <span className="font-mono font-bold">{o.code}</span> · {o.crop.charAt(0) + o.crop.slice(1).toLowerCase()} {kgLabel(o.qty_target_kg)}
          </button>
        ))}
      </div>

      {notice && <p className={`rounded-xl border p-3 text-sm ${notice.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>{notice.text}</p>}
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!detail && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the order…
        </p>
      )}

      {detail && order && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="font-mono text-xs font-bold text-primary">{order.code}</p>
                <h3 className="font-serif text-xl font-bold text-foreground">
                  {kgLabel(order.qtyTargetKg)} {order.crop.toLowerCase()} at {inr(order.pricePerKg)}/kg
                </h3>
                <p className="text-xs text-muted-foreground">Delivery {dayLabel(order.deliveryDate)} · from {detail.fpo.name}</p>
              </div>
              <button onClick={() => loadDetail(order.id)} aria-label="Refresh" className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground">
                <RefreshCw className="size-4" />
              </button>
            </div>
            <ol className="mt-5 space-y-4">
              <Step done title="Order placed" detail={`Placed ${timeLabel(order.createdAt)}`} />
              {order.orderTier === 'BULK' && (
                <Step
                  done={order.reviewStatus === 'approved'}
                  current={order.reviewStatus === 'pending'}
                  title={order.reviewStatus === 'rejected' ? 'Not approved' : 'FPO review of purpose'}
                  detail={order.adminNote ?? (order.reviewStatus === 'pending' ? 'Waiting for the coordinator' : 'Approved')}
                />
              )}
              {order.orderTier === 'BULK' ? (
                <Step
                  done={Boolean(order.advanceCommittedAt)}
                  current={order.status === 'POSTED' && order.reviewStatus === 'approved'}
                  title="Advance committed"
                  detail={order.advanceCommittedAt ? `${inr(order.advanceAmount ?? 0)} on ${timeLabel(order.advanceCommittedAt)}` : `${Math.round(order.advancePct * 100)}% of order value — commit it from the store`}
                />
              ) : (
                <Step done={reached(['SOURCING', 'COLLECTING', 'DISPATCHED', 'SETTLED'])} current={order.status === 'POSTED'} title="Farmer confirmed" detail="Small orders go to the nearest farmer who can fill them; you pay on delivery" />
              )}
              <Step
                done={detail.totals.primaryKg >= order.qtyTargetKg}
                current={order.status === 'SOURCING'}
                title="Farmers committed"
                detail={`${kgLabel(detail.totals.primaryKg)} of ${kgLabel(order.qtyTargetKg)}${detail.totals.standbyKg > 0 ? ` + ${kgLabel(detail.totals.standbyKg)} standby` : ''}`}
              />
              <Step done={reached(['DISPATCHED', 'SETTLED'])} current={order.status === 'COLLECTING'} title="Weighed and graded at collection" detail={`${kgLabel(detail.totals.acceptedKg)} accepted from ${acceptedLots.length} lot${acceptedLots.length === 1 ? '' : 's'}`} />
              <Step
                done={reached(['DISPATCHED', 'SETTLED'])}
                title="Dispatched"
                detail={detail.consignment ? `${detail.consignment.code} · ${detail.consignment.vehicleLabel} · ${timeLabel(detail.consignment.dispatchedAt)}` : 'Not yet'}
              />
              <Step done={order.status === 'SETTLED'} current={order.status === 'DISPATCHED'} title="Delivery inspected and settled" detail={order.deliveredAt ? `Confirmed ${timeLabel(order.deliveredAt)}` : 'Inspect the lots at the drop point, then confirm'} />
            </ol>
          </div>

          {focus === 'delivery' ? (
            <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground">
                <Truck className="size-5 text-muted-foreground" /> Delivery
              </h3>
              {route ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {route.km} km run · {route.solver}
                  </p>
                  <div className="h-[300px]">
                    <RouteMap stops={route.sequence} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">The route appears once the FPO dispatches the consignment.</p>
              )}

              {order.status === 'DISPATCHED' && (
                <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Inspect at the drop point</p>
                  <p className="text-xs text-muted-foreground">Turn away any lot that fails inspection, with a reason. Your inspection is binding: you are invoiced only for the lots you accept.</p>
                  <ul className="divide-y divide-border">
                    {acceptedLots.map((lot) => {
                      const rejected = lot.id in turnedAway
                      return (
                        <li key={lot.id} className="space-y-2 py-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">
                              <span className="font-mono">{lot.code}</span> · {lot.farmerName} · Grade {lot.finalGrade} · {kgLabel(lot.qtyAcceptedKg)}
                            </span>
                            <label className="flex items-center gap-1.5 text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={rejected}
                                onChange={(e) =>
                                  setTurnedAway((prev) => {
                                    const next = { ...prev }
                                    if (e.target.checked) next[lot.id] = ''
                                    else delete next[lot.id]
                                    return next
                                  })
                                }
                              />
                              Turn away
                            </label>
                          </div>
                          {rejected && (
                            <input value={turnedAway[lot.id]} onChange={(e) => setTurnedAway((prev) => ({ ...prev, [lot.id]: e.target.value }))} placeholder="Reason, e.g. soft and cracked fruit" className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none focus:border-primary" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <button onClick={confirmDelivery} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {busy && <Loader2 className="size-4 animate-spin" />} Confirm delivery
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground">
                <Receipt className="size-5 text-muted-foreground" /> Money trail
              </h3>
              {detail.ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing has moved yet. Entries appear when the advance is committed, lots are accepted, and the delivery is settled.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3 font-semibold">When</th>
                        <th className="py-2 pr-3 font-semibold">From → to</th>
                        <th className="py-2 pr-3 font-semibold">For</th>
                        <th className="py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.ledger.map((entry, i) => (
                        <tr key={`${entry.at}-${i}`}>
                          <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{timeLabel(entry.at)}</td>
                          <td className="py-2 pr-3 text-foreground">{entry.from} → {entry.to}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{entry.memo}</td>
                          <td className="py-2 text-right font-mono tabular-nums text-foreground">{inr(entry.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Ledger entries are instructions for bank transfers between the parties; AgriLink never holds the money.</p>

              {detail.proof ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">You paid vs retail</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{inr(detail.proof.buyerPaid)}/kg</p>
                    <p className="text-[11px] text-muted-foreground">{detail.proof.buyerSaving != null ? `${inr(detail.proof.buyerSaving)}/kg below the ${inr(detail.proof.retail!)} retail reference` : 'No retail reference on this order'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Farmers realised vs mandi</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{inr(detail.proof.farmerRealised)}/kg</p>
                    <p className="text-[11px] text-muted-foreground">{detail.proof.farmerGain != null ? `${inr(detail.proof.farmerGain)}/kg above the ${inr(detail.proof.mandi!)} mandi reference, after transport` : 'No mandi reference on this order'}</p>
                  </div>
                  {detail.proof.compressionPct != null && (
                    <p className="col-span-2 flex items-start gap-1.5 text-xs text-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      The gap between what farmers get and what the buyer pays shrank by {detail.proof.compressionPct}%: {inr(detail.proof.marginBefore!)}/kg through the mandi chain, {inr(detail.proof.marginAfter)}/kg here.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">The price comparison appears once the delivery is settled.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
