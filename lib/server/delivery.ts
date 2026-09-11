import { round2, settleLot } from '@/lib/domain/money'
import type { Settlement } from '@/lib/types'
import { clock } from './clock'
import type { Db } from './db'
import { DomainError } from './errors'
import { sendMessage } from './messages'
import { getFarmersByIds, getFpo, getLots, lockOrder, mapRow } from './repo'
import { fpoShortName } from './sourcing'

export type DeliveryInput = { orderId: string; buyerId: string; rejections: Array<{ lotId: string; reason: string }> }

/**
 * The buyer's inspection at the drop point is binding and happens once:
 * accept the consignment, optionally turning away specific lots with a
 * reason. There is no returns flow afterwards.
 *
 * Liability rule: once the FPO accepts a lot at collection, the farmer is
 * paid for it. A lot the buyer turns away is not invoiced to the buyer and is
 * carried by the FPO — which is why the collection grade is audited.
 */
export async function confirmDelivery(db: Db, input: DeliveryInput) {
  return db.tx(async (tx) => {
    const now = clock.now()
    const order = await lockOrder(tx, input.orderId)
    if (order.buyerId !== input.buyerId) throw new DomainError('Only the ordering buyer can confirm this delivery.', 403)
    if (order.status === 'SETTLED') throw new DomainError('This delivery was already confirmed; the inspection is binding.')
    if (order.status !== 'DISPATCHED') throw new DomainError('The consignment has not been dispatched yet.')

    const lots = (await getLots(tx, order.id)).filter((l) => l.qtyAcceptedKg > 0)
    const rejected = new Map<string, string>()
    for (const r of input.rejections) {
      if (!lots.some((l) => l.id === r.lotId)) throw new DomainError('A flagged lot is not part of this delivery.', 400)
      if (r.reason.trim().length < 3) throw new DomainError('Say why each flagged lot is being turned away.', 400)
      rejected.set(r.lotId, r.reason.trim())
    }

    const [fpo, farmers] = await Promise.all([getFpo(tx, order.fpoId), getFarmersByIds(tx, lots.map((l) => l.farmerId))])
    const settlements: Settlement[] = []
    for (const lot of lots) {
      const reason = rejected.get(lot.id)
      await tx.query('update agrilink.lots set buyer_decision = $2, buyer_reason = $3 where id = $1', [lot.id, reason ? 'REJECTED' : 'ACCEPTED', reason ?? null])
      const [{ advance }] = await tx.query<{ advance: number }>('select coalesce(sum(amount), 0) as advance from agrilink.advance_records where lot_id = $1', [lot.id])
      const line = settleLot(lot.qtyAcceptedKg, order.pricePerKg, lot.transportShare ?? 0, advance)
      const [row] = await tx.query(
        `insert into agrilink.settlements (order_id, farmer_id, lot_id, accepted_kg, price_per_kg, gross_amount, transport_share, advance_deducted, net_payable, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [order.id, lot.farmerId, lot.id, line.acceptedKg, line.pricePerKg, line.gross, line.transportShare, line.advanceDeducted, line.netPayable, now],
      )
      settlements.push(mapRow<Settlement>(row))
      await sendMessage(tx, {
        orderId: order.id,
        farmer: farmers.get(lot.farmerId)!,
        channel: 'SMS',
        kind: 'SETTLED',
        template: 'SETTLED',
        params: { crop: order.crop, qty: line.acceptedKg, price: line.pricePerKg, gross: line.gross, advance: line.advanceDeducted, transport: line.transportShare, net: line.netPayable, fpo: fpoShortName(fpo) },
        at: now,
      })
    }
    await tx.query(`update agrilink.orders set status = 'SETTLED', delivered_at = $2 where id = $1`, [order.id, now])

    const invoicedKg = round2(lots.filter((l) => !rejected.has(l.id)).reduce((s, l) => s + l.qtyAcceptedKg, 0))
    return { settlements, invoicedKg, invoice: round2(invoicedKg * order.pricePerKg), rejectedLots: rejected.size }
  })
}
