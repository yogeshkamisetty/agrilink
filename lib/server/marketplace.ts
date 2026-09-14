import { getVillageLatLng } from '@/lib/domain/allocation'
import { cascadeSecondsPerHour } from '@/lib/domain/cascade'
import { classifyCommitment } from '@/lib/domain/commitments'
import { BUYER_TYPE_LABEL, channelCheck, CROPS, shelfClassOf, type BuyerType, type CropId } from '@/lib/domain/crops'
import { addDays, isoDate } from '@/lib/domain/dates'
import { LARGEST_VEHICLE, smallestFitting, tripCost } from '@/lib/domain/fleet'
import { roadKm } from '@/lib/domain/geo'
import { LANGS, type Lang } from '@/lib/domain/i18n'
import { round2 } from '@/lib/domain/money'
import { SMALL_ORDER_THRESHOLD_KG } from '@/lib/domain/order-routing'
import { priceBand, type PriceBand } from '@/lib/domain/pricing'
import type { PriceQuote } from '@/lib/domain/prices'
import { planRoute, type RouteStop } from '@/lib/domain/routing'
import type { Farmer, Order, RegistryEntry } from '@/lib/types'
import { clock } from './clock'
import type { Db } from './db'
import { DomainError } from './errors'
import { sendMessage } from './messages'
import { getMandiPrice, getRetailPrice } from './prices'
import { getBuyer, getCommitments, getFarmer, getFpo, getOrder, listBuyers, lockOrder, mapRow, primaryFpo } from './repo'
import { commitmentTotals, createOrder, fpoShortName, loadCandidates, matchForOrder, respond, tickAllSourcing, type CreateOrderInput } from './sourcing'
import { matchRegistry } from '@/lib/domain/matching'

export const REVIEW_PURPOSE_MIN_CHARS = 12

// ─── Catalog: what can be bought, from whom, at what fair price ─────────────

export type CatalogItem = {
  crop: CropId
  name: string
  shelfLifeDays: number
  shelfClass: ReturnType<typeof shelfClassOf>
  availableKg: number
  farmers: number
  villages: string[]
  harvestFrom: string
  harvestTo: string
  mandi: PriceQuote | null
  retail: PriceQuote | null
  band: PriceBand
  transport: { vehicle: string; vehicles: number; km: number; loadKg: number; costRs: number; perKgRs: number; basis: string } | null
  channels: Array<{ type: BuyerType; label: string; allowed: boolean }>
}

type SupplyRow = { crop: string; farmer_id: string; village: string; lat: number; lng: number; harvest_window_start: string; harvest_window_end: string; available_kg: number }

const BUYER_TYPES = Object.keys(BUYER_TYPE_LABEL) as BuyerType[]

/**
 * The live catalog: uncommitted registered harvest per crop, today's mandi
 * and retail references, the fair price between them, and the transport a
 * farmer would bear for a consolidated collection run — so every figure on
 * the storefront traces to a record or a published price.
 */
export async function marketCatalog(db: Db, opts: { buyerId?: string | null } = {}) {
  const today = isoDate(clock.now())
  const [fpo, buyers] = await Promise.all([primaryFpo(db), listBuyers(db)])
  const buyer = opts.buyerId ? (buyers.find((b) => b.id === opts.buyerId) ?? null) : null
  const reference = buyer ?? buyers.find((b) => b.type === 'INSTITUTIONAL') ?? buyers[0] ?? null
  const rows = await db.query<SupplyRow>(
    `select r.crop, r.farmer_id, f.village, f.lat, f.lng, r.harvest_window_start, r.harvest_window_end,
            greatest(0, r.expected_qty_kg - coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c
                                                      where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')), 0)) as available_kg
       from agrilink.crop_registry r join agrilink.farmers f on f.id = r.farmer_id
      where r.status = 'ACTIVE' and r.harvest_window_end >= $1::date and f.fpo_id = $2`,
    [today, fpo.id],
  )

  const byCrop = new Map<CropId, SupplyRow[]>()
  for (const row of rows) {
    if (!(row.crop in CROPS) || !(row.available_kg > 0)) continue
    const crop = row.crop as CropId
    byCrop.set(crop, [...(byCrop.get(crop) ?? []), row])
  }

  const items = await Promise.all(
    [...byCrop.entries()].map(async ([crop, supply]): Promise<CatalogItem> => {
      const [mandi, retail] = await Promise.all([getMandiPrice(db, crop), getRetailPrice(db, crop)])
      const availableKg = round2(supply.reduce((sum, s) => sum + s.available_kg, 0))
      let transport: CatalogItem['transport'] = null
      if (reference) {
        const depot: RouteStop = { id: 'depot', kind: 'DEPOT', label: `${fpo.village} collection centre`, lat: fpo.lat, lng: fpo.lng }
        const pickups: RouteStop[] = supply.map((s) => ({ id: s.farmer_id, kind: 'PICKUP', label: s.village, kg: s.available_kg, lat: s.lat, lng: s.lng }))
        const route = planRoute(depot, pickups, [{ id: reference.id, kind: 'DROP', label: reference.name, kg: availableKg, lat: reference.lat, lng: reference.lng }])
        const vehicle = smallestFitting(availableKg, route.km) ?? LARGEST_VEHICLE
        const vehicles = Math.max(1, Math.ceil(availableKg / vehicle.capacityKg))
        const costRs = tripCost(vehicle, route.km) * vehicles
        transport = {
          vehicle: vehicle.label,
          vehicles,
          km: route.km,
          loadKg: availableKg,
          costRs,
          perKgRs: round2(costRs / availableKg),
          basis: `All ${supply.length} registered farm${supply.length === 1 ? '' : 's'} collected in one run from ${fpo.village} to ${reference.name}`,
        }
      }
      return {
        crop,
        name: CROPS[crop].name,
        shelfLifeDays: CROPS[crop].shelfLifeDays,
        shelfClass: shelfClassOf(crop),
        availableKg,
        farmers: new Set(supply.map((s) => s.farmer_id)).size,
        villages: [...new Set(supply.map((s) => s.village))],
        harvestFrom: supply.map((s) => (s.harvest_window_start > today ? s.harvest_window_start : today)).sort()[0],
        harvestTo: supply.map((s) => s.harvest_window_end).sort().at(-1)!,
        mandi,
        retail,
        band: priceBand({ mandiPerKg: mandi?.pricePerKg ?? null, retailPerKg: retail?.pricePerKg ?? null, logisticsPerKg: transport?.perKgRs ?? null }),
        transport,
        channels: BUYER_TYPES.map((type) => ({ type, label: BUYER_TYPE_LABEL[type], allowed: channelCheck(crop, type).allowed })),
      }
    }),
  )

  return {
    generatedAt: clock.now().toISOString(),
    fpo: { name: fpo.name, village: fpo.village, district: fpo.district, state: fpo.state },
    referenceBuyer: reference ? { id: reference.id, name: reference.name, type: reference.type } : null,
    smallOrderThresholdKg: SMALL_ORDER_THRESHOLD_KG,
    items: items.sort((a, b) => b.availableKg - a.availableKg),
  }
}

export type MarketCatalog = Awaited<ReturnType<typeof marketCatalog>>

// ─── Order board (the shape the dashboards read) ────────────────────────────

export type BoardViewer = { farmerId?: string | null; buyerId?: string | null }

type BoardRow = {
  id: string
  code: string
  buyer_id: string
  crop: CropId
  qty_target_kg: number
  price_per_kg: number
  delivery_date: string
  status: Order['status']
  created_at: Date | string
  purpose: string | null
  review_status: Order['reviewStatus']
  admin_note: string | null
  order_tier: Order['orderTier']
  allocated_farmer_id: string | null
  allocation_status: Order['allocationStatus']
  declined_farmer_ids: string[] | null
  delivery_location: string | null
  advance_amount: number | null
  mandi_ref: PriceQuote | null
  retail_ref: PriceQuote | null
  buyer_name: string
  buyer_type: BuyerType
  buyer_lat: number
  buyer_lng: number
  fpo_name: string
  fpo_lat: number
  fpo_lng: number
  farmer_name: string | null
  farmer_village: string | null
  farmer_lat: number | null
  farmer_lng: number | null
  primary_kg: number
  standby_kg: number
  accepted_kg: number
}

export type BoardOrder = ReturnType<typeof boardShape>

function boardShape(r: BoardRow, viewer: BoardViewer) {
  const distanceKm = r.farmer_lat != null && r.farmer_lng != null ? Math.round(roadKm({ lat: r.farmer_lat, lng: r.farmer_lng }, { lat: r.buyer_lat, lng: r.buyer_lng }) * 10) / 10 : null
  const capKg = round2(r.qty_target_kg * 1.15)
  return {
    id: r.id,
    code: r.code,
    buyer_id: r.buyer_id,
    crop: r.crop,
    crop_required: r.crop,
    qty_target_kg: r.qty_target_kg,
    quantity_required: r.qty_target_kg,
    qty_committed_kg: r.primary_kg,
    standby_kg: r.standby_kg,
    accepted_kg: r.accepted_kg,
    price_per_kg: r.price_per_kg,
    mandi_price_per_kg: r.mandi_ref?.pricePerKg ?? null,
    retail_price_per_kg: r.retail_ref?.pricePerKg ?? null,
    delivery_date: r.delivery_date,
    delivery_location: r.delivery_location ?? r.buyer_name,
    buyer_name: r.buyer_name,
    buyer_type: r.buyer_type,
    buyer_lat: r.buyer_lat,
    buyer_lng: r.buyer_lng,
    fpo_name: r.fpo_name,
    fpo_lat: r.fpo_lat,
    fpo_lng: r.fpo_lng,
    status: r.status,
    created_at: r.created_at,
    advance_amount: r.advance_amount,
    purpose: r.purpose,
    review_status: r.review_status,
    admin_note: r.admin_note,
    order_tier: r.order_tier,
    allocation_mode: r.order_tier === 'SMALL' ? 'AUTO_ALLOCATED' : 'POOL_AGGREGATION',
    allocated_farmer_id: r.allocated_farmer_id,
    allocated_farmer_name: r.farmer_name ? `${r.farmer_name} (${r.farmer_village} · ${distanceKm} km)` : null,
    allocated_farmer_village: r.farmer_village,
    allocated_farmer_distance_km: distanceKm,
    farmer_acceptance_status: r.allocation_status === 'ACCEPTED' ? 'ACCEPTED' : r.allocation_status === 'UNFULFILLED' ? 'REJECTED' : r.allocation_status === 'PENDING' ? 'PENDING' : null,
    declined_history: r.declined_farmer_ids ?? [],
    is_fully_committed: r.primary_kg >= r.qty_target_kg,
    open_for_commitment: r.order_tier === 'BULK' && r.status === 'SOURCING' && r.primary_kg + r.standby_kg < capKg,
    is_allocated_to_me: Boolean(viewer.farmerId) && r.allocated_farmer_id === viewer.farmerId && r.allocation_status === 'PENDING',
    is_mine: Boolean(viewer.buyerId) && r.buyer_id === viewer.buyerId,
  }
}

export async function boardOrders(db: Db, viewer: BoardViewer = {}, orderId?: string) {
  if (!orderId) await tickAllSourcing(db)
  const rows = await db.query<BoardRow>(
    `select o.id, o.code, o.buyer_id, o.crop, o.qty_target_kg, o.price_per_kg, o.delivery_date, o.status, o.created_at, o.purpose, o.review_status,
            o.admin_note, o.order_tier, o.allocated_farmer_id, o.allocation_status, o.declined_farmer_ids, o.delivery_location, o.advance_amount,
            o.mandi_ref, o.retail_ref,
            b.name as buyer_name, b.type as buyer_type, b.lat as buyer_lat, b.lng as buyer_lng,
            fp.name as fpo_name, fp.lat as fpo_lat, fp.lng as fpo_lng,
            f.name as farmer_name, f.village as farmer_village, f.lat as farmer_lat, f.lng as farmer_lng,
            coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.order_id = o.id and c.status in ('ACTIVE', 'FULFILLED') and not c.is_standby), 0) as primary_kg,
            coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.order_id = o.id and c.status in ('ACTIVE', 'FULFILLED') and c.is_standby), 0) as standby_kg,
            coalesce((select sum(l.qty_accepted_kg) from agrilink.lots l where l.order_id = o.id), 0) as accepted_kg
       from agrilink.orders o
       join agrilink.buyers b on b.id = o.buyer_id
       join agrilink.fpos fp on fp.id = o.fpo_id
       left join agrilink.farmers f on f.id = o.allocated_farmer_id
      ${orderId ? 'where o.id = $1' : ''}
      order by o.created_at desc`,
    orderId ? [orderId] : [],
  )
  return rows.map((r) => boardShape(r, viewer))
}

// ─── Placing an order ───────────────────────────────────────────────────────

export type SmallOrderAllocation = { farmer: { id: string; name: string; village: string } | null; distanceKm: number | null; reason: string | null }

export async function placeOrder(db: Db, input: CreateOrderInput, viewer: BoardViewer = {}) {
  const bulk = input.qtyTargetKg > SMALL_ORDER_THRESHOLD_KG
  if (bulk && !input.approvedBy && (input.purpose?.trim().length ?? 0) < REVIEW_PURPOSE_MIN_CHARS) {
    throw new DomainError(`Orders above ${SMALL_ORDER_THRESHOLD_KG} kg need a purpose of at least ${REVIEW_PURPOSE_MIN_CHARS} characters for FPO review.`, 400)
  }
  const created = await createOrder(db, input)
  let allocation: SmallOrderAllocation | null = null
  let message: string
  if (created.orderTier === 'SMALL') {
    allocation = await allocateSmallOrder(db, created.id)
    message = allocation.farmer
      ? `Matched to ${allocation.farmer.name} in ${allocation.farmer.village}, ${allocation.distanceKm} km from the delivery point — waiting for them to confirm.`
      : `${allocation.reason} The FPO coordinator can pool it from several farmers.`
  } else {
    message = created.reviewStatus === 'approved' ? 'Order posted. The buyer can now commit the advance to start sourcing.' : 'Sent for FPO review of the stated purpose. Commit the advance once it is approved.'
  }
  const [order] = await boardOrders(db, viewer, created.id)
  return { order, allocation, message }
}

/**
 * Small orders skip the broadcast: the nearest member farmer whose
 * uncommitted registered harvest can fill the whole order — and can reach
 * the buyer fresh — gets it directly. Farmers who declined are skipped.
 */
export async function allocateSmallOrder(db: Db, orderId: string): Promise<SmallOrderAllocation> {
  return db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.orderTier !== 'SMALL') throw new DomainError('Only small orders are allocated to a single farmer.', 400)
    if (order.status !== 'POSTED') throw new DomainError('This order is already being fulfilled.', 409)
    const buyer = await getBuyer(tx, order.buyerId)
    const match = matchRegistry({ crop: order.crop, deliveryDate: order.deliveryDate, fpoId: order.fpoId, buyerLocation: { lat: buyer.lat, lng: buyer.lng } }, await loadCandidates(tx, order.crop, order.id))
    const declined = new Set(order.declinedFarmerIds ?? [])
    const candidate = match.matched.find((m) => !declined.has(m.farmerId) && m.availableKg >= order.qtyTargetKg) ?? null

    if (!candidate) {
      await tx.query(`update agrilink.orders set allocated_farmer_id = null, allocation_status = 'UNFULFILLED' where id = $1`, [order.id])
      const reason = match.matched.some((m) => !declined.has(m.farmerId))
        ? `No single nearby farmer has ${order.qtyTargetKg} kg of ${CROPS[order.crop].name.toLowerCase()} uncommitted.`
        : `No registered ${CROPS[order.crop].name.toLowerCase()} farmer${declined.size ? ' who has not already declined' : ''} can reach ${buyer.name} fresh by ${order.deliveryDate}.`
      return { farmer: null, distanceKm: null, reason }
    }

    await tx.query(`update agrilink.orders set allocated_farmer_id = $2, allocation_status = 'PENDING' where id = $1`, [order.id, candidate.farmerId])
    const [farmer, fpo] = await Promise.all([getFarmer(tx, candidate.farmerId), getFpo(tx, order.fpoId)])
    await sendMessage(tx, {
      orderId: order.id,
      farmer,
      channel: 'SMS',
      kind: 'OFFER',
      template: 'OFFER_SMS',
      params: { crop: order.crop, buyer: buyer.name, fpo: fpoShortName(fpo), farmer: farmer.name.split(' ')[0], date: order.deliveryDate, qty: order.qtyTargetKg, expected: candidate.availableKg, price: order.pricePerKg },
      at: clock.now(),
    })
    return { farmer: { id: farmer.id, name: farmer.name, village: farmer.village }, distanceKm: candidate.distanceKm, reason: null }
  })
}

/** The allocated farmer accepts (a primary commitment is created) or declines (the order moves to the next nearest farmer). */
export async function respondToAllocation(db: Db, orderId: string, farmerId: string, accept: boolean) {
  await db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.orderTier !== 'SMALL') throw new DomainError('This is a pooled bulk order — commit a quantity from the demand board instead.', 400)
    if (order.status !== 'POSTED' || order.allocatedFarmerId !== farmerId || order.allocationStatus !== 'PENDING') throw new DomainError('This order is not waiting for this farmer’s reply.', 409)
    const now = clock.now()
    const [offer] = await tx.query<{ id: string }>(`select id from agrilink.notifications where order_id = $1 and farmer_id = $2 and kind = 'OFFER' and responded_at is null order by sent_at desc limit 1`, [orderId, farmerId])

    if (!accept) {
      if (offer) await tx.query(`update agrilink.notifications set responded_at = $2, response = 'DECLINED', response_source = 'FARMER' where id = $1`, [offer.id, now])
      const declined = [...new Set([...(order.declinedFarmerIds ?? []), farmerId])]
      await tx.query(`update agrilink.orders set declined_farmer_ids = $2::jsonb, allocated_farmer_id = null, allocation_status = null where id = $1`, [orderId, JSON.stringify(declined)])
      return
    }

    const [entry] = await tx.query<{ id: string; expected_qty_kg: number }>(`select id, expected_qty_kg from agrilink.crop_registry where farmer_id = $1 and crop = $2 and status = 'ACTIVE'`, [farmerId, order.crop])
    if (!entry) throw new DomainError('There is no active registered harvest of this crop to supply from.', 409)
    const [{ used }] = await tx.query<{ used: number }>(
      `select coalesce(sum(qty_committed_kg), 0) as used from agrilink.commitments where registry_id = $1 and order_id <> $2 and status in ('ACTIVE', 'FULFILLED')`,
      [entry.id, orderId],
    )
    const available = round2(entry.expected_qty_kg - used)
    if (available < order.qtyTargetKg) throw new DomainError(`Only ${available} kg of the registered ${CROPS[order.crop].name.toLowerCase()} is still uncommitted.`, 409)

    await tx.query(`insert into agrilink.commitments (order_id, farmer_id, registry_id, qty_committed_kg, is_standby, created_at) values ($1, $2, $3, $4, false, $5)`, [orderId, farmerId, entry.id, order.qtyTargetKg, now])
    if (offer) await tx.query(`update agrilink.notifications set responded_at = $2, response = 'ACCEPTED', response_qty_kg = $3, response_source = 'FARMER' where id = $1`, [offer.id, now, order.qtyTargetKg])
    await tx.query(
      `update agrilink.orders set allocation_status = 'ACCEPTED', status = 'SOURCING', notified_at = coalesce(notified_at, $2), cascade_seconds_per_hour = coalesce(cascade_seconds_per_hour, $3) where id = $1`,
      [orderId, now, cascadeSecondsPerHour()],
    )
    const farmer = await getFarmer(tx, farmerId)
    await sendMessage(tx, { orderId, farmer, channel: 'SMS', kind: 'CONFIRMATION', template: 'CONFIRMATION', params: { crop: order.crop, date: order.deliveryDate, primary: order.qtyTargetKg, standby: 0 }, at: now })
  })
  return { accepted: accept, next: accept ? null : await allocateSmallOrder(db, orderId) }
}

/**
 * A farmer commits part of a pooled order from the demand board. The board is
 * one more channel for the same offer the cascade sends, so the registry
 * match (FPO, harvest window, distance, uncommitted quantity) still decides
 * who may commit, and the 115% cap and standby split still apply.
 */
export async function commitToDemand(db: Db, orderId: string, farmerId: string, qtyKg: number) {
  if (!(qtyKg > 0)) throw new DomainError('Enter a quantity above zero.', 400)
  const order = await getOrder(db, orderId)
  if (order.orderTier === 'SMALL') throw new DomainError('Small orders go to one farmer directly — accept it from the allocation card.', 400)
  if (order.status !== 'SOURCING') {
    throw new DomainError(
      order.status === 'POSTED' || order.status === 'FUNDED'
        ? 'This order is not open for commitments yet — farmers are asked once the buyer has funded it and the FPO starts sourcing.'
        : 'This order is no longer taking commitments.',
      409,
    )
  }
  const [offered] = await db.query(`select 1 from agrilink.notifications where order_id = $1 and farmer_id = $2 and kind = 'OFFER' limit 1`, [orderId, farmerId])
  if (!offered) {
    const buyer = await getBuyer(db, order.buyerId)
    const match = await matchForOrder(db, order, buyer)
    const matched = match.matched.find((m) => m.farmerId === farmerId)
    if (!matched) {
      const excluded = match.excluded.find((m) => m.farmerId === farmerId)
      throw new DomainError(excluded ? `This order cannot be supplied from here: ${excluded.detail}.` : `There is no registered ${CROPS[order.crop].name.toLowerCase()} harvest to supply this order from.`, 403)
    }
    const [farmer, fpo] = await Promise.all([getFarmer(db, farmerId), getFpo(db, order.fpoId)])
    await sendMessage(db, {
      orderId,
      farmer,
      channel: 'SMS',
      kind: 'OFFER',
      template: 'OFFER_SMS',
      params: { crop: order.crop, buyer: buyer.name, fpo: fpoShortName(fpo), farmer: farmer.name.split(' ')[0], date: order.deliveryDate, qty: order.qtyTargetKg, expected: matched.availableKg, price: order.pricePerKg },
      at: clock.now(),
    })
  }
  return respond(db, orderId, farmerId, { accept: true, qtyKg, source: 'FARMER', channel: 'SMS' })
}

// ─── FPO coordinator actions ────────────────────────────────────────────────

export async function reviewOrder(db: Db, orderId: string, input: { decision: 'approved' | 'rejected'; note?: string | null; reviewer: string; adjustedQtyKg?: number | null }) {
  return db.tx(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.reviewStatus !== 'pending') throw new DomainError(order.reviewStatus === 'not_required' ? 'This order does not need review.' : `This order was already ${order.reviewStatus}.`, 409)
    const note = input.note?.trim() || (input.decision === 'approved' ? `Purpose verified by ${input.reviewer}` : '')
    if (input.decision === 'rejected' && note.length < 3) throw new DomainError('Give the buyer a reason for rejecting the order.', 400)
    let qty = order.qtyTargetKg
    if (input.adjustedQtyKg != null) {
      if (!(input.adjustedQtyKg > SMALL_ORDER_THRESHOLD_KG && input.adjustedQtyKg <= order.qtyTargetKg)) {
        throw new DomainError(`An adjusted quantity must be above ${SMALL_ORDER_THRESHOLD_KG} kg and no more than the ${order.qtyTargetKg} kg ordered.`, 400)
      }
      qty = round2(input.adjustedQtyKg)
    }
    const [row] = await tx.query(
      `update agrilink.orders set review_status = $2, admin_note = $3, reviewed_at = $4, qty_target_kg = $5, status = case when $2 = 'rejected' then 'REJECTED' else status end where id = $1 returning *`,
      [orderId, input.decision, note, clock.now(), qty],
    )
    return mapRow<Order>(row)
  })
}

export type Contribution = { farmerId: string; qtyKg: number }
export type ContributionResult = { farmerId: string; farmerName: string; status: 'COMMITTED' | 'SKIPPED'; primaryKg: number; standbyKg: number; reason: string | null }

/**
 * The coordinator pools farmers into a funded bulk order — usually after
 * calling them — within the same rules as farmers committing themselves:
 * registered uncommitted harvest only, primary up to 100%, standby to 115%.
 */
export async function coordinatorAllocate(db: Db, orderId: string, contributions: Contribution[]) {
  return db.tx(async (tx) => {
    let order = await lockOrder(tx, orderId)
    if (order.status === 'REJECTED' || order.reviewStatus === 'rejected') throw new DomainError('This order was rejected at FPO review.', 409)
    if (order.reviewStatus === 'pending') throw new DomainError('Approve the order’s purpose before pooling farmers into it.', 409)
    if (order.status === 'POSTED') throw new DomainError('The buyer has not committed the advance yet. Farmers are only asked to harvest against funded demand.', 409)
    if (order.status !== 'FUNDED' && order.status !== 'SOURCING') throw new DomainError('This order is no longer taking commitments.', 409)
    const now = clock.now()
    if (order.status === 'FUNDED') {
      await tx.query(`update agrilink.orders set status = 'SOURCING', notified_at = $2, cascade_seconds_per_hour = $3, simulate_replies = false where id = $1`, [orderId, now, cascadeSecondsPerHour()])
      order = await lockOrder(tx, orderId)
    }

    const results: ContributionResult[] = []
    for (const c of contributions) {
      const farmer = await getFarmer(tx, c.farmerId)
      const skip = (reason: string) => results.push({ farmerId: farmer.id, farmerName: farmer.name, status: 'SKIPPED', primaryKg: 0, standbyKg: 0, reason })
      const [entry] = await tx.query<{ id: string; expected_qty_kg: number }>(`select id, expected_qty_kg from agrilink.crop_registry where farmer_id = $1 and crop = $2 and status = 'ACTIVE'`, [farmer.id, order.crop])
      if (!entry) {
        skip(`no active ${CROPS[order.crop].name.toLowerCase()} harvest registered`)
        continue
      }
      const [{ mine }] = await tx.query<{ mine: number }>(`select count(*)::int as mine from agrilink.commitments where order_id = $1 and farmer_id = $2 and status = 'ACTIVE'`, [orderId, farmer.id])
      if (mine > 0) {
        skip('already committed to this order')
        continue
      }
      const [{ used }] = await tx.query<{ used: number }>(
        `select coalesce(sum(qty_committed_kg), 0) as used from agrilink.commitments where registry_id = $1 and order_id <> $2 and status in ('ACTIVE', 'FULFILLED')`,
        [entry.id, orderId],
      )
      const qty = Math.min(round2(c.qtyKg), round2(entry.expected_qty_kg - used))
      if (!(qty > 0)) {
        skip('registered harvest is already committed elsewhere')
        continue
      }
      const classification = classifyCommitment(commitmentTotals(order, await getCommitments(tx, orderId)), qty)
      if (!classification.ok) {
        skip(classification.reason === 'ORDER_FULL' ? 'order already holds 115% of its target' : 'invalid quantity')
        continue
      }
      for (const [kg, standby] of [[classification.primaryKg, false], [classification.standbyKg, true]] as const) {
        if (kg > 0) await tx.query(`insert into agrilink.commitments (order_id, farmer_id, registry_id, qty_committed_kg, is_standby, created_at) values ($1, $2, $3, $4, $5, $6)`, [orderId, farmer.id, entry.id, kg, standby, now])
      }
      // The coordinator's call is this farmer's reply: stop any further escalation to them.
      await tx.query(
        `update agrilink.notifications set responded_at = $3, response = 'ACCEPTED', response_qty_kg = $4, response_source = 'COORDINATOR' where order_id = $1 and farmer_id = $2 and kind = 'OFFER' and responded_at is null`,
        [orderId, farmer.id, now, round2(classification.primaryKg + classification.standbyKg)],
      )
      await sendMessage(tx, { orderId, farmer, channel: 'SMS', kind: 'CONFIRMATION', template: 'CONFIRMATION', params: { crop: order.crop, date: order.deliveryDate, primary: classification.primaryKg, standby: classification.standbyKg }, at: now })
      results.push({ farmerId: farmer.id, farmerName: farmer.name, status: 'COMMITTED', primaryKg: classification.primaryKg, standbyKg: classification.standbyKg, reason: classification.trimmedKg > 0 ? `${classification.trimmedKg} kg above the 115% cap was not taken` : null })
    }
    // Nothing pooled: roll back, including the FUNDED → SOURCING move.
    if (!results.some((r) => r.status === 'COMMITTED')) {
      throw new DomainError(`No farmer could be added: ${results.map((r) => `${r.farmerName} — ${r.reason}`).join('; ')}.`, 409)
    }
    return { results, totals: commitmentTotals(order, await getCommitments(tx, orderId)) }
  })
}

// ─── Supply registry ────────────────────────────────────────────────────────

export type HarvestDeclaration = {
  phone: string
  name: string
  village: string | null
  crop: CropId
  quantityKg: number
  harvestStart: string
  language?: Lang
  landHectares?: number | null
  location?: { lat: number; lng: number } | null
}

/**
 * A farmer (or the coordinator on their behalf) declares an upcoming
 * harvest. Creates the member record on first declaration and keeps one live
 * registry entry per farmer and crop, whose window follows the crop's shelf
 * life. Quantity already committed to orders cannot be declared away.
 */
export async function declareHarvest(db: Db, input: HarvestDeclaration) {
  if (!(input.quantityKg > 0) || input.quantityKg > 100_000) throw new DomainError('Enter the expected harvest in kg.', 400)
  return db.tx(async (tx) => {
    const fpo = await primaryFpo(tx)
    let [farmerRow] = await tx.query(`select * from agrilink.farmers where right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $1 order by created_at limit 1`, [input.phone])
    const created = !farmerRow
    if (!farmerRow) {
      if (!input.village) throw new DomainError('Enter the village so collection can be planned.', 400)
      if (input.name.trim().length < 2) throw new DomainError('Enter the farmer’s name.', 400)
      // A GPS pin from the phone is preferred; otherwise the village is placed from the pilot gazetteer.
      const location = input.location ?? getVillageLatLng(input.village)
      const language = input.language && (LANGS as readonly string[]).includes(input.language) ? input.language : 'hi'
      ;[farmerRow] = await tx.query(
        `insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
        [fpo.id, input.name.trim(), `+91 ${input.phone}`, language, input.landHectares && input.landHectares > 0 ? input.landHectares : 1, input.village, location.lat, location.lng],
      )
    }
    const farmer = mapRow<Farmer>(farmerRow)
    const windowDays = shelfClassOf(input.crop) === 'perishable' ? 7 : 30
    const harvestEnd = addDays(input.harvestStart, windowDays)
    const [existing] = await tx.query<{ id: string }>(`select id from agrilink.crop_registry where farmer_id = $1 and crop = $2 and status = 'ACTIVE'`, [farmer.id, input.crop])
    let entryRow
    if (existing) {
      const [{ committed }] = await tx.query<{ committed: number }>(`select coalesce(sum(qty_committed_kg), 0) as committed from agrilink.commitments where registry_id = $1 and status in ('ACTIVE', 'FULFILLED')`, [existing.id])
      if (input.quantityKg < committed) throw new DomainError(`${committed} kg of this harvest is already committed to orders; the declaration cannot go below that.`, 409)
      ;[entryRow] = await tx.query(`update agrilink.crop_registry set expected_qty_kg = $2, harvest_window_start = $3::date, harvest_window_end = $4::date where id = $1 returning *`, [existing.id, round2(input.quantityKg), input.harvestStart, harvestEnd])
    } else {
      ;[entryRow] = await tx.query(
        `insert into agrilink.crop_registry (farmer_id, crop, expected_qty_kg, harvest_window_start, harvest_window_end) values ($1, $2, $3, $4::date, $5::date) returning *`,
        [farmer.id, input.crop, round2(input.quantityKg), input.harvestStart, harvestEnd],
      )
    }
    return { farmer, entry: mapRow<RegistryEntry>(entryRow), created }
  })
}
