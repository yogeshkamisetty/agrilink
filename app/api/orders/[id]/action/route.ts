import { NextResponse } from 'next/server'
import { actingFarmer, userName } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { commitToDemand, respondToAllocation, reviewOrder } from '@/lib/server/marketplace'
import { notifyMatched } from '@/lib/server/sourcing'

/**
 * Marketplace actions on one order:
 *  farmer_accept / farmer_reject — the farmer a small order was routed to replies (a coordinator may record a phone reply)
 *  farmer_commit                 — a farmer commits part of a pooled bulk order from the demand board
 *  admin_validate_bulk           — the FPO reviews a bulk order's stated purpose
 *  admin_approve_aggregate       — the FPO starts sourcing a funded bulk order (notification cascade)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const action = String(body.action ?? '')
    const db = await getDb()

    switch (action) {
      case 'farmer_accept':
      case 'farmer_reject': {
        const { farmerId } = await actingFarmer(request, db, body.farmerId)
        const accept = action === 'farmer_accept'
        const { next } = await respondToAllocation(db, id, farmerId, accept)
        if (accept) {
          return NextResponse.json({ ok: true, action, status: 'SOURCING', message: 'Order accepted. The FPO will schedule the pickup and confirm it by SMS.' })
        }
        return NextResponse.json({
          ok: true,
          action,
          isSmallOrder: true,
          nextFarmer: next?.farmer ? { ...next.farmer, distanceKm: next.distanceKm } : null,
          message: next?.farmer
            ? `Declined. The order moved to ${next.farmer.name} (${next.farmer.village}, ${next.distanceKm} km away).`
            : `Declined. ${next?.reason ?? ''} It is now with the FPO coordinator to pool.`.replace(/\s+/g, ' '),
        })
      }

      case 'farmer_commit': {
        const { farmerId } = await actingFarmer(request, db, body.farmerId)
        const result = await commitToDemand(db, id, farmerId, Number(body.committedKg ?? body.quantity_kg))
        const parts = [
          result.primaryKg > 0 ? `${result.primaryKg} kg confirmed` : null,
          result.standbyKg > 0 ? `${result.standbyKg} kg on standby` : null,
          result.trimmedKg > 0 ? `${result.trimmedKg} kg above the order's 115% cap was not taken` : null,
        ].filter(Boolean)
        return NextResponse.json({ ok: true, action, ...result, message: `Commitment recorded: ${parts.join(', ')}.` })
      }

      case 'admin_validate_bulk': {
        const admin = await requireRole(request, 'admin')
        const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null
        if (!decision) throw new DomainError('Decision must be approved or rejected.', 400)
        const adjusted = body.adjustedQty == null || body.adjustedQty === '' ? null : Number(body.adjustedQty)
        const order = await reviewOrder(db, id, { decision, note: optionalString(body.note), reviewer: userName(admin) || 'FPO coordinator', adjustedQtyKg: adjusted })
        return NextResponse.json({
          ok: true,
          action,
          decision,
          status: order.status,
          note: order.adminNote,
          message: decision === 'approved' ? `${order.code} approved — the buyer can now commit the advance.` : `${order.code} rejected.`,
        })
      }

      case 'admin_approve_aggregate': {
        await requireRole(request, 'admin')
        const result = await notifyMatched(db, id, { simulateReplies: Boolean(body.simulateReplies) })
        return NextResponse.json({ ok: true, action, ...result, message: `Offers sent to ${result.matched} matched farmer${result.matched === 1 ? '' : 's'}.` })
      }

      default:
        throw new DomainError('Unknown action.', 400)
    }
  } catch (error) {
    return errorResponse(error, 'Unable to process the order action.')
  }
}
