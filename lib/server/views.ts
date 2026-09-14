import { CASCADE_TIERS, elapsedCascadeHours, tierDueAt, type Channel } from '@/lib/domain/cascade'
import { shortfallKg } from '@/lib/domain/commitments'
import { channelCheck, CROPS, type CropId } from '@/lib/domain/crops'
import { addDays, isoDate, weekStart } from '@/lib/domain/dates'
import { forecastWeek, type CalendarDay, type HistoryWeek } from '@/lib/domain/forecast'
import { priceProof, round2, type PriceProof } from '@/lib/domain/money'
import type { Buyer, Commitment, Consignment, Farmer, Fpo, Lot, Notification, Order, RegistryEntry, Settlement } from '@/lib/types'
import { clock } from './clock'
import type { Db } from './db'
import { acceptanceLimits } from './collection'
import { getAdvances, getBuyer, getCommitments, getConsignment, getFarmer, getFarmersByIds, getFpo, getLots, getNotifications, getOrder, getSettlements, listBuyers, mapRow, mapRows } from './repo'
import { commitmentTotals, matchForOrder, tick, tickAllSourcing } from './sourcing'
import { getMandiPrice, getRetailPrice } from './prices'

export type LedgerEntry = { at: string; from: string; to: string; amount: number; memo: string }

export type OrderFarmerRow = {
  farmerId: string
  name: string
  village: string
  language: Farmer['language']
  phone: string
  distanceKm: number | null
  availableKg: number | null
  offers: Array<{ channel: Channel; sentAt: string }>
  response: 'ACCEPTED' | 'DECLINED' | null
  respondedAt: string | null
  respondedVia: Channel | null
  responseSource: Notification['responseSource']
  primaryKg: number
  standbyKg: number
  commitmentStatus: Commitment['status'] | null
  promoted: boolean
  withdrawn: boolean
  lot: (Lot & { advance: number | null }) | null
  limitKg: number
}

export type TierState = { channel: Channel; label: string; offsetHours: number; dueAt: string | null; state: 'not_started' | 'waiting' | 'sent' | 'skipped'; sent: number }

export type OrderDetail = Awaited<ReturnType<typeof orderDetail>>

/** Everything the order screens show, computed from records. Brings the cascade up to date first. */
export async function orderDetail(db: Db, orderId: string) {
  await tick(db, orderId)
  const order = await getOrder(db, orderId)
  const [buyer, fpo, commitments, lots, advances, notifications, settlements, consignment] = await Promise.all([
    getBuyer(db, order.buyerId),
    getFpo(db, order.fpoId),
    getCommitments(db, order.id),
    getLots(db, order.id),
    getAdvances(db, order.id),
    getNotifications(db, order.id),
    getSettlements(db, order.id),
    getConsignment(db, order.consignmentId),
  ])
  const now = clock.now()
  const match = await matchForOrder(db, order, buyer)
  const offers = notifications.filter((n) => n.kind === 'OFFER')

  const involved = new Set([...offers.map((o) => o.farmerId), ...commitments.map((c) => c.farmerId), ...(order.notifiedAt ? [] : match.matched.map((m) => m.farmerId))])
  const farmers = await getFarmersByIds(db, [...involved])
  const { acceptedKg, limits } = await acceptanceLimits(db, order)
  const matchedById = new Map(match.matched.map((m) => [m.farmerId, m]))

  const rows: OrderFarmerRow[] = [...involved].map((farmerId) => {
    const f = farmers.get(farmerId)!
    const mine = offers.filter((o) => o.farmerId === farmerId)
    const responded = mine.find((o) => o.respondedAt)
    const cs = commitments.filter((c) => c.farmerId === farmerId)
    const live = cs.filter((c) => c.status !== 'WITHDRAWN')
    const lot = lots.find((l) => l.farmerId === farmerId) ?? null
    const smsParams = mine.find((o) => o.channel === 'SMS')?.params
    const m = matchedById.get(farmerId)
    return {
      farmerId,
      name: f.name,
      village: f.village,
      language: f.language,
      phone: f.phone,
      distanceKm: m?.distanceKm ?? null,
      availableKg: m?.availableKg ?? smsParams?.expected ?? null,
      offers: mine.map((o) => ({ channel: o.channel, sentAt: o.sentAt })),
      response: responded?.response ?? null,
      respondedAt: responded?.respondedAt ?? null,
      respondedVia: responded?.channel ?? null,
      responseSource: responded?.responseSource ?? null,
      primaryKg: round2(live.filter((c) => !c.isStandby).reduce((s, c) => s + c.qtyCommittedKg, 0)),
      standbyKg: round2(live.filter((c) => c.isStandby).reduce((s, c) => s + c.qtyCommittedKg, 0)),
      commitmentStatus: cs.length ? (cs.find((c) => c.status === 'ACTIVE') ?? cs[cs.length - 1]).status : null,
      promoted: cs.some((c) => c.promotedAt),
      withdrawn: cs.length > 0 && cs.every((c) => c.status === 'WITHDRAWN'),
      lot: lot ? { ...lot, advance: advances.find((a) => a.lotId === lot.id)?.amount ?? null } : null,
      limitKg: limits.get(farmerId) ?? 0,
    }
  })
  rows.sort((a, b) => (a.respondedAt ?? '9').localeCompare(b.respondedAt ?? '9') || (a.distanceKm ?? 999) - (b.distanceKm ?? 999))

  const totals = commitmentTotals(order, commitments)
  const collected = new Set(lots.map((l) => l.farmerId))
  const live = commitments.map((c) => ({ id: c.id, farmerId: c.farmerId, qtyKg: c.qtyCommittedKg, isStandby: c.isStandby, status: c.status, createdAt: c.createdAt }))

  const sph = order.cascadeSecondsPerHour ?? 1
  const tiers: TierState[] = CASCADE_TIERS.map((t) => {
    const sent = offers.filter((o) => o.channel === t.channel).length
    if (!order.notifiedAt) return { channel: t.channel, label: t.label, offsetHours: t.offsetHours, dueAt: null, state: 'not_started', sent }
    const dueAt = tierDueAt(order.notifiedAt, t.offsetHours, sph)
    const state = sent > 0 ? 'sent' : Date.parse(dueAt) <= now.getTime() || order.status !== 'SOURCING' ? 'skipped' : 'waiting'
    return { channel: t.channel, label: t.label, offsetHours: t.offsetHours, dueAt, state, sent }
  })

  const disbursed = round2(advances.reduce((s, a) => s + a.amount, 0))
  const withFarmer = <T extends { farmerId: string }>(x: T) => ({ ...x, farmerName: farmers.get(x.farmerId)?.name ?? '—', village: farmers.get(x.farmerId)?.village ?? '' })

  return {
    order,
    buyer,
    fpo,
    now: now.toISOString(),
    channelRule: channelCheck(order.crop, buyer.type),
    match: { matched: match.matched, excluded: match.excluded, window: match.window, radiusKm: match.radiusKm },
    cascade: {
      secondsPerHour: sph,
      notifiedAt: order.notifiedAt,
      elapsedHours: order.notifiedAt ? round2(elapsedCascadeHours(order.notifiedAt, now, sph)) : 0,
      tiers,
      matched: new Set(offers.map((o) => o.farmerId)).size,
      accepted: rows.filter((r) => r.response === 'ACCEPTED').length,
      declined: rows.filter((r) => r.response === 'DECLINED').length,
      silent: rows.filter((r) => r.offers.length && !r.response).length,
      filledNoticeSentAt: order.filledNoticeSentAt,
      simulated: order.simulateReplies,
    },
    farmers: rows,
    totals: {
      ...totals,
      acceptedKg,
      shortfallKg: order.status === 'SOURCING' || order.status === 'COLLECTING' ? shortfallKg(order.qtyTargetKg, acceptedKg, live, collected) : 0,
      withdrawnKg: round2(commitments.filter((c) => c.status === 'WITHDRAWN').reduce((s, c) => s + c.qtyCommittedKg, 0)),
    },
    lots: lots.map((l) => withFarmer({ ...l, advance: advances.find((a) => a.lotId === l.id)?.amount ?? null })),
    advance: { committed: order.advanceAmount, disbursed, remaining: order.advanceAmount != null ? round2(order.advanceAmount - disbursed) : null },
    consignment,
    settlements: settlements.map(withFarmer),
    proof: orderProof(order, settlements),
    ledger: ledger(order, buyer, fpo, advances, lots, settlements, consignment, farmers),
    actions: {
      commitAdvance: order.status === 'POSTED',
      notify: order.status === 'FUNDED',
      collect: order.status === 'SOURCING' || order.status === 'COLLECTING',
      dispatch: order.status === 'COLLECTING' && acceptedKg > 0,
      confirmDelivery: order.status === 'DISPATCHED',
    },
  }
}

export function orderProof(order: Order, settlements: Settlement[]): PriceProof | null {
  const kg = settlements.reduce((s, x) => s + x.acceptedKg, 0)
  if (!kg) return null
  const realised = settlements.reduce((s, x) => s + x.grossAmount - x.transportShare, 0) / kg
  return priceProof({ mandi: order.mandiRef?.pricePerKg ?? null, retail: order.retailRef?.pricePerKg ?? null, buyerPaid: order.pricePerKg, farmerRealised: realised })
}

/** The money path for one order, derived from records: buyer → FPO account → farmers / transporter. */
function ledger(order: Order, buyer: Buyer, fpo: Fpo, advances: Awaited<ReturnType<typeof getAdvances>>, lots: Lot[], settlements: Settlement[], consignment: Consignment | null, farmers: Map<string, Farmer>): LedgerEntry[] {
  const account = `${fpo.name.split(' ').slice(0, 2).join(' ')} FPO account`
  const entries: LedgerEntry[] = []
  if (order.advanceCommittedAt && order.advanceAmount != null) {
    entries.push({ at: order.advanceCommittedAt, from: buyer.name, to: account, amount: order.advanceAmount, memo: `${Math.round(order.advancePct * 100)}% advance on ${order.code}` })
  }
  for (const a of advances) {
    const lot = lots.find((l) => l.id === a.lotId)
    entries.push({ at: a.disbursedAt, from: account, to: farmers.get(a.farmerId)?.name ?? 'Farmer', amount: a.amount, memo: `Harvest-day advance · ${lot?.code ?? ''}` })
  }
  if (consignment) {
    const share = round2(lots.reduce((s, l) => s + (l.transportShare ?? 0), 0))
    entries.push({ at: consignment.dispatchedAt, from: account, to: `Transporter (${consignment.vehicleLabel})`, amount: share, memo: `This order's share of ${consignment.code}` })
  }
  if (settlements.length && order.deliveredAt) {
    const invoiced = round2(lots.filter((l) => l.qtyAcceptedKg > 0 && l.buyerDecision !== 'REJECTED').reduce((s, l) => s + l.qtyAcceptedKg, 0) * order.pricePerKg)
    const balance = round2(invoiced - (order.advanceAmount ?? 0))
    entries.push(
      balance >= 0
        ? { at: order.deliveredAt, from: buyer.name, to: account, amount: balance, memo: `Balance on delivery (invoice ${invoiced})` }
        : { at: order.deliveredAt, from: account, to: buyer.name, amount: -balance, memo: `Advance refund — invoice ${invoiced} below advance` },
    )
    for (const s of settlements) entries.push({ at: s.createdAt, from: account, to: farmers.get(s.farmerId)?.name ?? 'Farmer', amount: s.netPayable, memo: 'Settlement balance' })
  }
  return entries.sort((a, b) => a.at.localeCompare(b.at))
}

export type OrderSummary = Awaited<ReturnType<typeof listOrders>>[number]

export async function listOrders(db: Db, filter: { buyerId?: string } = {}) {
  await tickAllSourcing(db)
  const orders = mapRows<Order>(await db.query(`select * from agrilink.orders ${filter.buyerId ? 'where buyer_id = $1' : ''} order by created_at desc`, filter.buyerId ? [filter.buyerId] : []))
  const buyers = new Map((await listBuyers(db)).map((b) => [b.id, b]))
  const out = []
  for (const order of orders) {
    const [commitments, lots] = await Promise.all([getCommitments(db, order.id), getLots(db, order.id)])
    out.push({ order, buyer: buyers.get(order.buyerId)!, totals: { ...commitmentTotals(order, commitments), acceptedKg: round2(lots.reduce((s, l) => s + l.qtyAcceptedKg, 0)) } })
  }
  return out
}

/** Coordinator landing view: verified demand, committed supply, and the pilot metric. */
export async function overviewView(db: Db) {
  const [orders, metric] = await Promise.all([listOrders(db), weeklyMetric(db)])
  return {
    orders: orders.map(({ order, buyer, totals }) => ({
      order,
      buyer: { id: buyer.id, name: buyer.name, type: buyer.type, location: `${buyer.city} · ${buyer.address}` },
      totals: { capKg: totals.capKg, primaryKg: totals.primaryKg, standbyKg: totals.standbyKg, acceptedKg: totals.acceptedKg },
    })),
    metrics: {
      pilotVolumePct: metric.pct,
      activeOrdersCount: orders.filter(({ order }) => !['SETTLED', 'REJECTED'].includes(order.status)).length,
      totalVolumeKg: round2(orders.reduce((sum, { order }) => sum + order.qtyTargetKg, 0)),
    },
  }
}

/** Price screen data is always labelled with its live, cached, or seeded source tier. */
export async function pricesView(db: Db, crop: CropId) {
  if (!(crop in CROPS)) throw new Error('Unsupported crop.')
  const [mandi, retail] = await Promise.all([getMandiPrice(db, crop), getRetailPrice(db, crop)])
  return { crop: CROPS[crop], mandi, retail, fetchedAt: clock.now().toISOString() }
}

// ─── Farmer views ───────────────────────────────────────────────────────────

export type FarmerInbox = Awaited<ReturnType<typeof farmerInbox>>

export async function farmerInbox(db: Db, farmerId: string) {
  await tickAllSourcing(db)
  const farmer = await getFarmer(db, farmerId)
  const fpo = await getFpo(db, farmer.fpoId)
  const messages = mapRows<Notification & { orderCode: string; orderStatus: Order['status']; buyerName: string }>(
    await db.query(
      `select n.*, o.code as order_code, o.status as order_status, b.name as buyer_name
         from agrilink.notifications n join agrilink.orders o on o.id = n.order_id join agrilink.buyers b on b.id = o.buyer_id
        where n.farmer_id = $1 order by n.sent_at, n.id`,
      [farmerId],
    ),
  )
  const orderIds = [...new Set(messages.filter((m) => m.kind === 'OFFER').map((m) => m.orderId))]
  const offers = []
  for (const orderId of orderIds) {
    const order = await getOrder(db, orderId)
    const [commitments, lots] = await Promise.all([getCommitments(db, orderId), getLots(db, orderId)])
    const mine = commitments.filter((c) => c.farmerId === farmerId)
    const responded = messages.find((m) => m.orderId === orderId && m.kind === 'OFFER' && m.respondedAt)
    const totals = commitmentTotals(order, commitments)
    const room = round2(totals.capKg - totals.primaryKg - totals.standbyKg)
    const lot = lots.find((l) => l.farmerId === farmerId) ?? null
    const smsOffer = messages.find((m) => m.orderId === orderId && m.kind === 'OFFER' && m.channel === 'SMS')
    offers.push({
      orderId,
      orderCode: order.code,
      crop: order.crop,
      buyerName: messages.find((m) => m.orderId === orderId)!.buyerName,
      status: order.status,
      deliveryDate: order.deliveryDate,
      pricePerKg: order.pricePerKg,
      availableKg: Math.min(smsOffer?.params.expected ?? 0, Math.max(0, room)),
      response: responded?.response ?? null,
      respondedQtyKg: responded?.responseQtyKg ?? null,
      primaryKg: round2(mine.filter((c) => !c.isStandby && c.status !== 'WITHDRAWN').reduce((s, c) => s + c.qtyCommittedKg, 0)),
      standbyKg: round2(mine.filter((c) => c.isStandby && c.status !== 'WITHDRAWN').reduce((s, c) => s + c.qtyCommittedKg, 0)),
      withdrawn: mine.length > 0 && mine.every((c) => c.status === 'WITHDRAWN'),
      canRespond: order.status === 'SOURCING' && !responded && room > 0,
      canWithdraw: (order.status === 'SOURCING' || order.status === 'COLLECTING') && mine.some((c) => c.status === 'ACTIVE') && !lot,
      lot: lot ? { code: lot.code, finalGrade: lot.finalGrade, qtyAcceptedKg: lot.qtyAcceptedKg, decision: lot.decision } : null,
    })
  }
  return { farmer, fpo, messages, offers: offers.reverse() }
}

export type FarmerSales = Awaited<ReturnType<typeof farmerSales>>

export async function farmerSales(db: Db, farmerId: string) {
  const farmer = await getFarmer(db, farmerId)
  const lots = mapRows<Lot & { orderCode: string; crop: CropId; deliveryDate: string; pricePerKg: number; buyerName: string; orderStatus: Order['status']; mandiRef: Order['mandiRef']; retailRef: Order['retailRef'] }>(
    await db.query(
      `select l.*, o.code as order_code, o.crop, o.delivery_date, o.price_per_kg, o.status as order_status, o.mandi_ref, o.retail_ref, b.name as buyer_name
         from agrilink.lots l join agrilink.orders o on o.id = l.order_id join agrilink.buyers b on b.id = o.buyer_id
        where l.farmer_id = $1 order by l.captured_at desc`,
      [farmerId],
    ),
  )
  const sales = []
  for (const lot of lots) {
    const [settlementRow] = await db.query('select * from agrilink.settlements where lot_id = $1', [lot.id])
    const [advanceRow] = await db.query('select * from agrilink.advance_records where lot_id = $1', [lot.id])
    const settlement = settlementRow ? mapRow<Settlement>(settlementRow) : null
    const advance = advanceRow ? (advanceRow.amount as number) : null
    const proof = settlement && settlement.acceptedKg > 0
      ? priceProof({ mandi: lot.mandiRef?.pricePerKg ?? null, retail: lot.retailRef?.pricePerKg ?? null, buyerPaid: lot.pricePerKg, farmerRealised: (settlement.grossAmount - settlement.transportShare) / settlement.acceptedKg })
      : null
    sales.push({ lot, settlement, advance, proof })
  }
  return { farmer, sales }
}

export type FarmerOverview = Awaited<ReturnType<typeof farmerOverview>>

type FarmerCommitmentRow = {
  orderId: string
  code: string
  crop: CropId
  pricePerKg: number
  deliveryDate: string
  orderStatus: Order['status']
  buyerName: string
  mandiRef: Order['mandiRef']
  qtyCommittedKg: number
  isStandby: boolean
  status: Commitment['status']
  vehicleLabel: string | null
  dispatchedAt: string | null
}

/** The farmer's home screen, from records: registered harvests, live commitments, the next pickup, and money received. */
export async function farmerOverview(db: Db, farmerId: string) {
  const inbox = await farmerInbox(db, farmerId)
  const sales = await farmerSales(db, farmerId)
  const registry = mapRows<RegistryEntry & { committedKg: number }>(
    await db.query(
      `select r.*, coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')), 0) as committed_kg
         from agrilink.crop_registry r where r.farmer_id = $1 and r.status = 'ACTIVE' order by r.harvest_window_start`,
      [farmerId],
    ),
  )
  const commitments = mapRows<FarmerCommitmentRow>(
    await db.query(
      `select o.id as order_id, o.code, o.crop, o.price_per_kg, o.delivery_date, o.status as order_status, o.mandi_ref, b.name as buyer_name,
              c.qty_committed_kg, c.is_standby, c.status, cn.vehicle_label, cn.dispatched_at
         from agrilink.commitments c
         join agrilink.orders o on o.id = c.order_id
         join agrilink.buyers b on b.id = o.buyer_id
         left join agrilink.consignments cn on cn.id = o.consignment_id
        where c.farmer_id = $1 and c.status in ('ACTIVE', 'FULFILLED')
        order by o.delivery_date, o.code`,
      [farmerId],
    ),
  )

  const open = commitments.filter((c) => !c.isStandby && c.orderStatus !== 'SETTLED')
  const priced = open.filter((c) => c.mandiRef?.pricePerKg != null)
  const pricedValue = round2(priced.reduce((s, c) => s + c.qtyCommittedKg * c.pricePerKg, 0))
  const mandiValue = round2(priced.reduce((s, c) => s + c.qtyCommittedKg * c.mandiRef!.pricePerKg, 0))

  return {
    farmer: inbox.farmer,
    fpo: inbox.fpo,
    registry,
    commitments,
    offers: inbox.offers,
    messages: inbox.messages.slice(-8).reverse(),
    sales: sales.sales,
    summary: {
      committedKg: round2(open.reduce((s, c) => s + c.qtyCommittedKg, 0)),
      contractValue: round2(open.reduce((s, c) => s + c.qtyCommittedKg * c.pricePerKg, 0)),
      // Only commitments whose order captured a mandi reference can be compared with the mandi.
      mandiComparison: priced.length ? { contractValue: pricedValue, mandiValue, gain: round2(pricedValue - mandiValue) } : null,
      advancesReceived: round2(sales.sales.reduce((s, x) => s + (x.advance ?? 0), 0)),
      settledNet: round2(sales.sales.reduce((s, x) => s + (x.settlement?.netPayable ?? 0), 0)),
      nextDelivery: commitments.find((c) => !c.isStandby && ['SOURCING', 'COLLECTING', 'DISPATCHED'].includes(c.orderStatus)) ?? null,
    },
  }
}

// ─── Coordinator & shared ───────────────────────────────────────────────────

export async function registryView(db: Db) {
  const rows = await db.query<Record<string, unknown>>(
    `select r.*, f.name as farmer_name, f.village, f.land_hectares,
            coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')), 0) as committed_kg
       from agrilink.crop_registry r join agrilink.farmers f on f.id = r.farmer_id
      order by r.crop, f.name`,
  )
  return rows.map((r) => ({ ...mapRow<RegistryEntry & { farmerName: string; village: string; landHectares: number; committedKg: number }>(r) }))
}

/**
 * The pilot's one success metric: of this week's member volume, how much
 * moved through confirmed AgriLink orders rather than the trader or mandi
 * channel (as logged by the coordinator).
 */
export async function weeklyMetric(db: Db) {
  const start = weekStart(isoDate(clock.now()))
  const end = addDays(start, 6)
  const [{ moved }] = await db.query<{ moved: number }>(
    `select coalesce(sum(qty_accepted_kg), 0) as moved from agrilink.lots where (captured_at at time zone 'Asia/Kolkata')::date between $1::date and $2::date`,
    [start, end],
  )
  const [{ outside, synthetic }] = await db.query<{ outside: number; synthetic: boolean }>(
    `select coalesce(sum(qty_kg), 0) as outside, coalesce(bool_or(synthetic), false) as synthetic from agrilink.channel_sales_log where sold_on between $1::date and $2::date`,
    [start, end],
  )
  const total = round2(moved + outside)
  return { weekStart: start, movedKg: round2(moved), outsideKg: round2(outside), totalKg: total, pct: total > 0 ? Math.round((moved / total) * 100) : 0, outsideIsSeeded: synthetic }
}

export async function forecastFor(db: Db, buyerId: string, crop: CropId, deliveryDate: string) {
  const history = (await db.query<{ week_start: string; school_days: number; qty_kg: number }>(`select week_start, school_days, qty_kg from agrilink.order_history where buyer_id = $1 and crop = $2`, [buyerId, crop])).map<HistoryWeek>((r) => ({ weekStart: r.week_start, schoolDays: r.school_days, qtyKg: r.qty_kg }))
  const calendar = (await db.query<{ day: string; kind: 'HOLIDAY' | 'EXAM'; label: string }>(`select day, kind, label from agrilink.academic_calendar`)).map<CalendarDay>((c) => ({ day: c.day, kind: c.kind, label: c.label }))
  const forecast = forecastWeek(history, deliveryDate, calendar)
  return forecast ? { ...forecast, crop: CROPS[crop].name, synthetic: true } : null
}
