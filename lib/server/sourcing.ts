import { CASCADE_TIERS, cascadeSecondsPerHour, type Channel } from '@/lib/domain/cascade'
import { classifyCommitment, commitmentCap, standbyToPromote, type LiveCommitment } from '@/lib/domain/commitments'
import { channelCheck, CROPS, type CropId } from '@/lib/domain/crops'
import { addDays, isoDate } from '@/lib/domain/dates'
import { renderMessage, type MessageParams } from '@/lib/domain/i18n'
import { matchRegistry, type RegistryCandidate } from '@/lib/domain/matching'
import { buyerAdvance, DEFAULT_ADVANCE_PCT, round2 } from '@/lib/domain/money'
import { SMALL_ORDER_THRESHOLD_KG } from '@/lib/domain/order-routing'
import { checkOrderPrice } from '@/lib/domain/pricing'
import type { Buyer, Commitment, Farmer, Fpo, Notification, Order } from '@/lib/types'
import { clock } from './clock'
import { uuidArray, type Db } from './db'
import { DomainError } from './errors'
import { sendMessage } from './messages'
import { getMandiPrice, getRetailPrice } from './prices'
import { getBuyer, getCommitments, getFarmer, getFarmersByIds, getFpo, getLots, listBuyers, lockOrder, mapRow, mapRows, primaryFpo } from './repo'
import { sendTestWhatsApp } from './whatsapp'

export const MIN_ORDER_KG = 10
/** Households order kitchen quantities. */
export const MIN_CONSUMER_ORDER_KG = 1
export const MAX_ORDER_KG = 10_000
export const MAX_LEAD_DAYS = 60

export function fpoShortName(fpo: Pick<Fpo, 'name'>): string {
  return fpo.name.replace(/\s+Farmer Producer Co\.?\s*Ltd\.?$/i, ' FPO')
}

// ─── Order intake ────────────────────────────────────────────────────────────

export type CreateOrderInput = {
  buyerId: string
  crop: CropId
  qtyTargetKg: number
  pricePerKg: number
  deliveryDate: string
  advancePct?: number
  purpose?: string | null
  deliveryLocation?: string | null
  /** Set when an FPO coordinator posts the order themselves: bulk orders then skip the review queue. */
  approvedBy?: string | null
}

export async function createOrder(db: Db, input: CreateOrderInput): Promise<Order> {
  const buyer = await getBuyer(db, input.buyerId)
  const rule = channelCheck(input.crop, buyer.type)
  if (!rule.allowed) throw new DomainError(rule.reason, 400)
  const minKg = buyer.type === 'CONSUMER' ? MIN_CONSUMER_ORDER_KG : MIN_ORDER_KG
  if (!(input.qtyTargetKg >= minKg) || input.qtyTargetKg > MAX_ORDER_KG) throw new DomainError(`Quantity must be between ${minKg} and ${MAX_ORDER_KG} kg.`, 400)
  if (!(input.pricePerKg > 0)) throw new DomainError('Price must be positive.', 400)
  const today = isoDate(clock.now())
  if (input.deliveryDate <= today) throw new DomainError('Delivery must be after today — demand is committed before harvest.', 400)
  if (input.deliveryDate > addDays(today, MAX_LEAD_DAYS)) throw new DomainError(`Delivery must be within ${MAX_LEAD_DAYS} days.`, 400)

  const fpo = await primaryFpo(db)
  // Reference prices are captured on the order so the price proof later
  // traces to the figures that were on screen when the buyer committed.
  const [mandi, retail] = await Promise.all([getMandiPrice(db, input.crop), getRetailPrice(db, input.crop)])
  const price = checkOrderPrice(input.pricePerKg, mandi?.pricePerKg ?? null, retail?.pricePerKg ?? null)
  if (!price.ok) throw new DomainError(price.reason, 400)

  const orderTier = input.qtyTargetKg <= SMALL_ORDER_THRESHOLD_KG ? 'SMALL' : 'BULK'
  const approvedBy = input.approvedBy?.trim() || null
  const reviewStatus = orderTier === 'SMALL' ? 'not_required' : approvedBy ? 'approved' : 'pending'
  const now = clock.now()
  const [row] = await db.query(
    `insert into agrilink.orders (buyer_id, fpo_id, crop, qty_target_kg, price_per_kg, delivery_date, advance_pct, status, mandi_ref, retail_ref, created_at,
                                  order_tier, review_status, purpose, delivery_location, reviewed_at, admin_note)
     values ($1, $2, $3, $4, $5, $6::date, $7, 'POSTED', $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16) returning *`,
    [
      buyer.id,
      fpo.id,
      input.crop,
      round2(input.qtyTargetKg),
      round2(input.pricePerKg),
      input.deliveryDate,
      input.advancePct ?? DEFAULT_ADVANCE_PCT,
      mandi ? JSON.stringify(mandi) : null,
      retail ? JSON.stringify(retail) : null,
      now,
      orderTier,
      reviewStatus,
      input.purpose?.trim() || null,
      input.deliveryLocation?.trim() || `${buyer.address}, ${buyer.city}`,
      approvedBy ? now : null,
      approvedBy ? `Posted by FPO coordinator ${approvedBy}` : null,
    ],
  )
  return mapRow<Order>(row)
}

function assertReviewCleared(order: Order) {
  if (order.status === 'REJECTED' || order.reviewStatus === 'rejected') throw new DomainError('This order was rejected at FPO review.', 409)
  if (order.reviewStatus === 'pending') throw new DomainError('This bulk order is waiting for FPO review of its stated purpose; it can go ahead once approved.', 409)
}

/** Buyer commits the advance to the FPO's bank account (ledger entry only). Funds the order. */
export async function commitAdvance(db: Db, orderId: string, buyerId: string): Promise<Order> {
  return db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.buyerId !== buyerId) throw new DomainError('Only the buyer who placed the order can commit its advance.', 403)
    assertReviewCleared(order)
    if (order.status !== 'POSTED') throw new DomainError('The advance for this order is already committed.')
    const amount = buyerAdvance(order.qtyTargetKg, order.pricePerKg, order.advancePct)
    const [row] = await tx.query(`update agrilink.orders set status = 'FUNDED', advance_amount = $2, advance_committed_at = $3 where id = $1 returning *`, [order.id, amount, clock.now()])
    return mapRow<Order>(row)
  })
}

// ─── Matching & notification ────────────────────────────────────────────────

export async function loadCandidates(db: Db, crop: CropId, orderId: string | null): Promise<RegistryCandidate[]> {
  const rows = await db.query<Record<string, unknown>>(
    `select r.id as registry_id, r.farmer_id, f.name as farmer_name, f.village, f.fpo_id, f.lat, f.lng, r.crop, r.status,
            r.expected_qty_kg, r.harvest_window_start, r.harvest_window_end,
            coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c
                      where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')
                        and ($2::uuid is null or c.order_id <> $2::uuid)), 0) as committed_elsewhere_kg
       from agrilink.crop_registry r join agrilink.farmers f on f.id = r.farmer_id
      where r.crop = $1
      order by f.name`,
    [crop, orderId],
  )
  return rows.map((r) => ({
    registryId: r.registry_id as string,
    farmerId: r.farmer_id as string,
    farmerName: r.farmer_name as string,
    village: r.village as string,
    fpoId: r.fpo_id as string,
    location: { lat: r.lat as number, lng: r.lng as number },
    crop: r.crop as CropId,
    status: r.status as 'ACTIVE' | 'CLOSED',
    expectedQtyKg: r.expected_qty_kg as number,
    committedElsewhereKg: r.committed_elsewhere_kg as number,
    harvestWindowStart: r.harvest_window_start as string,
    harvestWindowEnd: r.harvest_window_end as string,
  }))
}

export async function matchForOrder(db: Db, order: Order, buyer: Buyer) {
  return matchRegistry({ crop: order.crop, deliveryDate: order.deliveryDate, fpoId: order.fpoId, buyerLocation: { lat: buyer.lat, lng: buyer.lng } }, await loadCandidates(db, order.crop, order.id))
}

function offerParams(order: Order, buyer: Buyer, fpo: Fpo, farmer: Pick<Farmer, 'name'>, availableKg: number): MessageParams {
  return { crop: order.crop, buyer: buyer.name, fpo: fpoShortName(fpo), farmer: farmer.name.split(' ')[0], date: order.deliveryDate, qty: order.qtyTargetKg, expected: availableKg, price: order.pricePerKg }
}

export async function notifyMatched(db: Db, orderId: string, opts: { simulateReplies: boolean }) {
  const result = await db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    assertReviewCleared(order)
    if (order.orderTier === 'SMALL' && order.allocationStatus && order.allocationStatus !== 'UNFULFILLED') {
      throw new DomainError('This small order is routed directly to the nearest farmer; it is only broadcast if no nearby farmer can fill it.')
    }
    if (order.status === 'POSTED') throw new DomainError('The buyer has not committed the advance yet. Farmers are only asked to harvest against funded demand.')
    if (order.status !== 'FUNDED') throw new DomainError('Farmers have already been notified for this order.')
    const [buyer, fpo] = await Promise.all([getBuyer(tx, order.buyerId), getFpo(tx, order.fpoId)])
    const match = await matchForOrder(tx, order, buyer)
    if (!match.matched.length) {
      throw new DomainError(`No registered ${CROPS[order.crop].name.toLowerCase()} farmers can reach ${buyer.name} fresh by ${order.deliveryDate}. ${match.excluded.length} registry entries were excluded — see the registry panel for reasons.`)
    }
    const now = clock.now()
    const farmers = await getFarmersByIds(tx, match.matched.map((m) => m.farmerId))
    let firstOffer: { name: string; body: string } | null = null
    for (const m of match.matched) {
      const farmer = farmers.get(m.farmerId)!
      const params = offerParams(order, buyer, fpo, farmer, m.availableKg)
      for (const channel of ['SMS', 'WHATSAPP'] as const) {
        await sendMessage(tx, { orderId, farmer, channel, kind: 'OFFER', template: 'OFFER_SMS', params, at: now })
      }
      firstOffer ??= { name: farmer.name, body: renderMessage('OFFER_SMS', params, farmer.language) }
    }
    await tx.query(`update agrilink.orders set status = 'SOURCING', notified_at = $2, cascade_seconds_per_hour = $3, simulate_replies = $4 where id = $1`, [orderId, now, cascadeSecondsPerHour(), opts.simulateReplies])
    return { matched: match.matched.length, excluded: match.excluded.length, firstOffer }
  })

  // One real WhatsApp message to the team's test phone, sent after commit so a
  // slow or failing API never holds the order lock or blocks the cascade.
  const whatsapp = result.firstOffer ? await sendTestWhatsApp(`AgriLink demo · the offer as sent to ${result.firstOffer.name}:\n\n${result.firstOffer.body}`) : { sent: false, detail: 'no offer' }
  if (whatsapp.sent) {
    await db.query(
      `update agrilink.notifications set external_ref = $2 where id = (select id from agrilink.notifications where order_id = $1 and channel = 'WHATSAPP' and kind = 'OFFER' order by sent_at, id limit 1)`,
      [orderId, whatsapp.detail],
    )
  }
  return { matched: result.matched, excluded: result.excluded, whatsapp }
}

// ─── Cascade engine ─────────────────────────────────────────────────────────

function live(commitments: Commitment[]): LiveCommitment[] {
  return commitments.map((c) => ({ id: c.id, farmerId: c.farmerId, qtyKg: c.qtyCommittedKg, isStandby: c.isStandby, status: c.status, createdAt: c.createdAt }))
}

export function commitmentTotals(order: Pick<Order, 'qtyTargetKg'>, commitments: Commitment[]) {
  const active = commitments.filter((c) => c.status === 'ACTIVE' || c.status === 'FULFILLED')
  const primaryKg = round2(active.filter((c) => !c.isStandby).reduce((s, c) => s + c.qtyCommittedKg, 0))
  const standbyKg = round2(active.filter((c) => c.isStandby).reduce((s, c) => s + c.qtyCommittedKg, 0))
  return { targetKg: order.qtyTargetKg, capKg: commitmentCap(order.qtyTargetKg), primaryKg, standbyKg }
}

async function offersFor(db: Db, orderId: string) {
  return mapRows<Notification>(await db.query(`select * from agrilink.notifications where order_id = $1 and kind = 'OFFER' order by sent_at, id`, [orderId]))
}

async function isFull(db: Db, order: Order) {
  const totals = commitmentTotals(order, await getCommitments(db, order.id))
  return totals.primaryKg + totals.standbyKg >= totals.capKg
}

type CascadeEvent =
  | { at: Date; kind: 'escalate'; channel: Channel }
  | { at: Date; kind: 'reply'; farmerId: string; response: 'ACCEPT' | 'DECLINE'; qtyKg: number | null }

/**
 * Bring a sourcing order's cascade up to `now`: escalate to IVR and the
 * coordinator call list for farmers who have not replied, apply simulated
 * replies when the demo switch is on, and tell silent farmers once the order
 * is full. Events are processed in time order, so the result is the same
 * whether the page polls every second or once an hour.
 */
async function advanceCascade(tx: Db, order: Order, now: Date): Promise<Order> {
  if (order.status !== 'SOURCING' || !order.notifiedAt) return order
  const secondsPerHour = order.cascadeSecondsPerHour ?? 1
  const start = Date.parse(order.notifiedAt)
  const at = (hours: number) => new Date(start + hours * secondsPerHour * 1000)

  const offers = await offersFor(tx, order.id)
  const matchedIds = [...new Set(offers.map((o) => o.farmerId))]
  const smsParams = new Map(offers.filter((o) => o.channel === 'SMS').map((o) => [o.farmerId, o.params]))
  const events: CascadeEvent[] = []
  for (const tier of CASCADE_TIERS) {
    if (tier.offsetHours > 0 && at(tier.offsetHours) <= now) events.push({ at: at(tier.offsetHours), kind: 'escalate', channel: tier.channel })
  }
  if (order.simulateReplies && matchedIds.length) {
    const profiles = await tx.query<{ farmer_id: string; reply_after_hours: number; response: 'ACCEPT' | 'DECLINE' | 'NONE'; qty_kg: number | null }>(
      `select * from agrilink.demo_reply_profiles where farmer_id = any($1::uuid[])`,
      [uuidArray(matchedIds)],
    )
    for (const p of profiles) {
      if (p.response !== 'NONE' && at(p.reply_after_hours) <= now) events.push({ at: at(p.reply_after_hours), kind: 'reply', farmerId: p.farmer_id, response: p.response, qtyKg: p.qty_kg })
    }
  }
  if (!events.length) return order
  events.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === 'escalate' ? -1 : 1))

  const farmers = await getFarmersByIds(tx, matchedIds)
  const [buyer, fpo] = await Promise.all([getBuyer(tx, order.buyerId), getFpo(tx, order.fpoId)])
  let filledAt: Date | null = null

  for (const event of events) {
    const respondedBy = new Set(
      (await tx.query<{ farmer_id: string }>(`select distinct farmer_id from agrilink.notifications where order_id = $1 and kind = 'OFFER' and responded_at is not null and responded_at <= $2`, [order.id, event.at])).map((r) => r.farmer_id),
    )
    if (event.kind === 'escalate') {
      if (await isFull(tx, order)) continue
      for (const farmerId of matchedIds) {
        if (respondedBy.has(farmerId)) continue
        const farmer = farmers.get(farmerId)!
        const params = smsParams.get(farmerId) ?? offerParams(order, buyer, fpo, farmer, 0)
        await sendMessage(tx, { orderId: order.id, farmer, channel: event.channel, kind: 'OFFER', template: event.channel === 'IVR' ? 'OFFER_IVR' : 'OFFER_COORDINATOR', params, at: event.at })
      }
    } else {
      const alreadyReplied = await tx.query(`select 1 from agrilink.notifications where order_id = $1 and farmer_id = $2 and kind = 'OFFER' and responded_at is not null`, [order.id, event.farmerId])
      if (alreadyReplied.length) continue
      if (event.response === 'DECLINE') {
        await applyResponse(tx, order, event.farmerId, { accept: false, qtyKg: 0, source: 'SIMULATED', at: event.at })
        continue
      }
      if (await isFull(tx, order)) continue
      const available = await availableForFarmer(tx, order, event.farmerId)
      const qty = Math.min(event.qtyKg ?? available, available)
      if (qty <= 0) continue
      const result = await applyResponse(tx, order, event.farmerId, { accept: true, qtyKg: qty, source: 'SIMULATED', at: event.at })
      if (result.fillsOrder) filledAt = event.at
    }
  }

  await sendFilledNotices(tx, order, filledAt ?? now)
  return lockOrder(tx, order.id)
}

/** Once the order reaches 115%, farmers who never replied are told it is full instead of being escalated. */
async function sendFilledNotices(tx: Db, order: Order, at: Date) {
  const [current] = await tx.query<{ filled_notice_sent_at: Date | null }>(`select filled_notice_sent_at from agrilink.orders where id = $1`, [order.id])
  if (current.filled_notice_sent_at || !(await isFull(tx, order))) return
  const silent = await tx.query<{ farmer_id: string }>(
    `select farmer_id from agrilink.notifications where order_id = $1 and kind = 'OFFER' group by farmer_id having bool_and(responded_at is null)`,
    [order.id],
  )
  const [buyer, farmers] = await Promise.all([getBuyer(tx, order.buyerId), getFarmersByIds(tx, silent.map((s) => s.farmer_id))])
  for (const { farmer_id } of silent) {
    await sendMessage(tx, { orderId: order.id, farmer: farmers.get(farmer_id)!, channel: 'SMS', kind: 'FILLED', template: 'FILLED', params: { crop: order.crop, buyer: buyer.name }, at })
  }
  await tx.query(`update agrilink.orders set filled_notice_sent_at = $2 where id = $1`, [order.id, at])
}

/** Bring an order's time-driven state up to date. Safe to call on every read. */
export async function tick(db: Db, orderId: string): Promise<void> {
  await db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.status === 'SOURCING') await advanceCascade(tx, order, clock.now())
  })
}

export async function tickAllSourcing(db: Db): Promise<void> {
  const rows = await db.query<{ id: string }>(`select id from agrilink.orders where status = 'SOURCING'`)
  for (const { id } of rows) await tick(db, id)
}

// ─── Farmer responses ───────────────────────────────────────────────────────

async function activeRegistryEntry(db: Db, farmerId: string, crop: CropId) {
  const [row] = await db.query<{ id: string; expected_qty_kg: number }>(`select id, expected_qty_kg from agrilink.crop_registry where farmer_id = $1 and crop = $2 and status = 'ACTIVE'`, [farmerId, crop])
  return row ?? null
}

async function availableForFarmer(db: Db, order: Order, farmerId: string): Promise<number> {
  const entry = await activeRegistryEntry(db, farmerId, order.crop)
  if (!entry) return 0
  const [{ used }] = await db.query<{ used: number }>(
    `select coalesce(sum(qty_committed_kg), 0) as used from agrilink.commitments where registry_id = $1 and order_id <> $2 and status in ('ACTIVE', 'FULFILLED')`,
    [entry.id, order.id],
  )
  return Math.max(0, round2(entry.expected_qty_kg - used))
}

export type ResponseInput = { accept: boolean; qtyKg: number; source: 'FARMER' | 'SIMULATED' | 'COORDINATOR'; at: Date; channel?: Channel }
export type ResponseResult = { accepted: boolean; primaryKg: number; standbyKg: number; trimmedKg: number; fillsOrder: boolean }

async function applyResponse(tx: Db, order: Order, farmerId: string, input: ResponseInput): Promise<ResponseResult> {
  if (order.status !== 'SOURCING') throw new DomainError('This order is no longer taking commitments.')
  const offers = (await offersFor(tx, order.id)).filter((o) => o.farmerId === farmerId && Date.parse(o.sentAt) <= input.at.getTime())
  if (!offers.length) throw new DomainError('This farmer was not matched to the order.', 403)
  if (offers.some((o) => o.respondedAt)) throw new DomainError('The farmer has already replied to this order.')
  const offer = (input.channel && offers.find((o) => o.channel === input.channel)) || offers[offers.length - 1]
  const farmer = await getFarmer(tx, farmerId)

  const markOffer = (response: 'ACCEPTED' | 'DECLINED', qty: number | null) =>
    tx.query(`update agrilink.notifications set responded_at = $2, response = $3, response_qty_kg = $4, response_source = $5 where id = $1`, [offer.id, input.at, response, qty, input.source])

  if (!input.accept) {
    await markOffer('DECLINED', null)
    return { accepted: false, primaryKg: 0, standbyKg: 0, trimmedKg: 0, fillsOrder: false }
  }

  const entry = await activeRegistryEntry(tx, farmerId, order.crop)
  if (!entry) throw new DomainError('No active crop registry entry for this farmer and crop.')
  const available = await availableForFarmer(tx, order, farmerId)
  if (input.qtyKg > available) throw new DomainError(`Only ${available} kg of this farmer's registered ${CROPS[order.crop].name.toLowerCase()} is uncommitted.`, 400)

  const classification = classifyCommitment(commitmentTotals(order, await getCommitments(tx, order.id)), input.qtyKg)
  if (!classification.ok) throw new DomainError(classification.reason === 'ORDER_FULL' ? 'The order is already full (115% of target committed).' : 'Enter a quantity above zero.', classification.reason === 'ORDER_FULL' ? 409 : 400)

  for (const [kg, standby] of [[classification.primaryKg, false], [classification.standbyKg, true]] as const) {
    if (kg > 0) {
      await tx.query(`insert into agrilink.commitments (order_id, farmer_id, registry_id, qty_committed_kg, is_standby, created_at) values ($1, $2, $3, $4, $5, $6)`, [order.id, farmerId, entry.id, kg, standby, input.at])
    }
  }
  await markOffer('ACCEPTED', round2(classification.primaryKg + classification.standbyKg))
  await sendMessage(tx, {
    orderId: order.id,
    farmer,
    channel: 'SMS',
    kind: 'CONFIRMATION',
    template: 'CONFIRMATION',
    params: { crop: order.crop, date: order.deliveryDate, primary: classification.primaryKg, standby: classification.standbyKg, offered: classification.trimmedKg > 0 ? input.qtyKg : undefined },
    at: input.at,
  })
  return { accepted: true, primaryKg: classification.primaryKg, standbyKg: classification.standbyKg, trimmedKg: classification.trimmedKg, fillsOrder: classification.fillsOrder }
}

export async function respond(db: Db, orderId: string, farmerId: string, input: Omit<ResponseInput, 'at'>): Promise<ResponseResult> {
  return db.tx(async (tx) => {
    const now = clock.now()
    const order = await advanceCascade(tx, await lockOrder(tx, orderId), now)
    const result = await applyResponse(tx, order, farmerId, { ...input, at: now })
    if (result.fillsOrder) await sendFilledNotices(tx, order, now)
    return result
  })
}

// ─── Dropouts & standby promotion ───────────────────────────────────────────

/**
 * Promote standby commitments, earliest first, to cover any shortfall: a
 * withdrawn farmer, a rejected lot, or a lot that weighed in light.
 */
export async function promoteStandby(tx: Db, order: Order, at: Date) {
  const [commitments, lots] = await Promise.all([getCommitments(tx, order.id), getLots(tx, order.id)])
  const acceptedKg = lots.reduce((s, l) => s + l.qtyAcceptedKg, 0)
  const collected = new Set(lots.map((l) => l.farmerId))
  const toPromote = standbyToPromote(order.qtyTargetKg, acceptedKg, live(commitments), collected)
  if (!toPromote.length) return []
  const farmers = await getFarmersByIds(tx, toPromote.map((c) => c.farmerId))
  for (const c of toPromote) {
    await tx.query(`update agrilink.commitments set is_standby = false, promoted_at = $2 where id = $1`, [c.id, at])
    await sendMessage(tx, { orderId: order.id, farmer: farmers.get(c.farmerId)!, channel: 'SMS', kind: 'PROMOTED', template: 'PROMOTED', params: { crop: order.crop, qty: c.qtyKg, date: order.deliveryDate }, at })
  }
  return toPromote.map((c) => ({ farmerId: c.farmerId, farmerName: farmers.get(c.farmerId)!.name, qtyKg: c.qtyKg }))
}

/** A farmer drops out before collection (from their phone, or the coordinator records the call). */
export async function withdraw(db: Db, orderId: string, farmerId: string, source: 'FARMER' | 'COORDINATOR') {
  return db.tx(async (tx) => {
    const now = clock.now()
    const order = await advanceCascade(tx, await lockOrder(tx, orderId), now)
    if (order.status !== 'SOURCING' && order.status !== 'COLLECTING') throw new DomainError('Commitments can only be withdrawn before dispatch.')
    const [lot] = await tx.query(`select 1 from agrilink.lots where order_id = $1 and farmer_id = $2`, [orderId, farmerId])
    if (lot) throw new DomainError("This farmer's lot has already been collected.")
    const rows = await tx.query<{ qty_committed_kg: number }>(`update agrilink.commitments set status = 'WITHDRAWN' where order_id = $1 and farmer_id = $2 and status = 'ACTIVE' returning qty_committed_kg`, [orderId, farmerId])
    if (!rows.length) throw new DomainError('No active commitment to withdraw.')
    const farmer = await getFarmer(tx, farmerId)
    await sendMessage(tx, { orderId, farmer, channel: 'SMS', kind: 'WITHDRAWN', template: 'WITHDRAWN', params: { crop: order.crop }, at: now })
    const promoted = await promoteStandby(tx, order, now)
    return { withdrawnKg: round2(rows.reduce((s, r) => s + r.qty_committed_kg, 0)), source, promoted }
  })
}
