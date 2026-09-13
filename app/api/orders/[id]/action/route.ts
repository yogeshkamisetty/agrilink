import { NextResponse } from 'next/server'
import { getDb } from '@/lib/server/db'
import {
  cascadeSmallOrderRejection,
  cascadeBulkOrderRejection,
  findNearestEligibleFarmer,
  type SmallOrderRouting,
  type BulkOrderRouting,
} from '@/lib/domain/order-routing'
import { getVillageLatLng, type CandidateFarmer } from '@/lib/domain/allocation'

// In-memory runtime state cache for active orders and routing state
const activeOrderRoutings: Map<string, SmallOrderRouting | BulkOrderRouting> = new Map()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, farmerId, reason, crop, qtyTargetKg } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 })
    }

    // 1. Fetch available cluster candidates
    const db = await getDb()
    let candidates: CandidateFarmer[] = []
    try {
      const rows = await db.query<any>(`
        select f.id, f.name, f.village, coalesce(f.crop_name, 'PADDY') as crop,
               coalesce(f.quantity, 500) as quantity, coalesce(f.quality_grade, 'A') as quality_grade,
               f.phone
        from agrilink.farmers f
      `)
      if (Array.isArray(rows) && rows.length > 0) {
        candidates = rows.map((r) => ({
          id: r.id,
          name: r.name,
          village: r.village,
          crop: (r.crop || 'PADDY').toUpperCase(),
          availableKg: Number(r.quantity || 500),
          reliability: 95,
          qualityGrade: (r.quality_grade === 'B' ? 'B' : 'A') as 'A' | 'B',
          location: getVillageLatLng(r.village),
        }))
      }
    } catch {}

    // Ensure fallback candidates if DB empty
    if (candidates.length === 0) {
      candidates = [
        { id: 'f-ramesh-101', name: 'Rameshbhai Patel', village: 'Boriavi', crop: 'PADDY', availableKg: 500, reliability: 95, qualityGrade: 'A', location: getVillageLatLng('Boriavi') },
        { id: 'f-savita-102', name: 'Savitaben Parmar', village: 'Petlad', crop: 'PADDY', availableKg: 700, reliability: 98, qualityGrade: 'A', location: getVillageLatLng('Petlad') },
        { id: 'f-mohan-103', name: 'Mohanbhai Solanki', village: 'Sojitra', crop: 'TOMATO', availableKg: 800, reliability: 91, qualityGrade: 'B', location: getVillageLatLng('Sojitra') },
        { id: 'f-jignesh-104', name: 'Jignesh Chauhan', village: 'Bakrol', crop: 'WHEAT', availableKg: 1000, reliability: 94, qualityGrade: 'A', location: getVillageLatLng('Bakrol') },
        { id: 'f-bhavna-109', name: 'Bhavnaben Thakor', village: 'Borsad', crop: 'ONION', availableKg: 600, reliability: 95, qualityGrade: 'A', location: getVillageLatLng('Borsad') },
      ]
    }

    const orderCrop = (crop || 'PADDY').toUpperCase()
    const targetKg = Number(qtyTargetKg || 40)
    const isSmallOrder = targetKg <= 50

    // Handle Action 1: Farmer Accepts
    if (action === 'farmer_accept') {
      try {
        await db.query(`update agrilink.orders set status = 'CONFIRMED' where id = $1`, [id])
      } catch {}

      const cached = activeOrderRoutings.get(id)
      if (cached && cached.tier === 'SMALL') {
        cached.acceptanceStatus = 'ACCEPTED'
        cached.status = 'AUTO_ALLOCATED'
        activeOrderRoutings.set(id, cached)
      }

      return NextResponse.json({
        ok: true,
        action: 'farmer_accept',
        message: 'Order allocation accepted! Scheduled for tomorrow morning pickup.',
        orderId: id,
        status: 'CONFIRMED',
      })
    }

    // Handle Action 2: Farmer Rejects (Automatic Fallback!)
    if (action === 'farmer_reject') {
      const rejectingFarmerId = farmerId || 'f-ramesh-101'

      if (isSmallOrder) {
        // Retrieve or initialize small order routing
        let currentRouting = activeOrderRoutings.get(id) as SmallOrderRouting | undefined
        if (!currentRouting || currentRouting.tier !== 'SMALL') {
          const nearest = findNearestEligibleFarmer(candidates, orderCrop, targetKg)
          currentRouting = {
            tier: 'SMALL',
            requiresAdmin: false,
            allocatedFarmer: nearest ? { id: nearest.farmer.id, name: nearest.farmer.name, village: nearest.farmer.village, distanceKm: nearest.distanceKm } : null,
            status: 'AUTO_ALLOCATED',
            acceptanceStatus: 'PENDING',
            declinedFarmerIds: [],
            rejectionHistory: [],
          }
        }

        const cascadeResult = cascadeSmallOrderRejection({
          crop: orderCrop,
          qtyTargetKg: targetKg,
          candidates,
          currentRouting,
          decliningFarmerId: rejectingFarmerId,
          reason: reason || 'Sprayer maintenance / plot occupied',
        })

        activeOrderRoutings.set(id, cascadeResult.newRouting)

        return NextResponse.json({
          ok: true,
          action: 'farmer_reject',
          isSmallOrder: true,
          message: cascadeResult.logMessage,
          nextFarmer: cascadeResult.nextFarmer,
          routing: cascadeResult.newRouting,
        })
      } else {
        // Bulk Order Rejection -> Auto-promote standby candidate
        let currentRouting = activeOrderRoutings.get(id) as BulkOrderRouting | undefined
        if (!currentRouting || currentRouting.tier !== 'BULK') {
          currentRouting = {
            tier: 'BULK',
            requiresAdmin: true,
            status: 'PENDING_ADMIN_REVIEW',
            declinedFarmerIds: [],
            promotedStandbyHistory: [],
          }
        }

        const cascadeResult = cascadeBulkOrderRejection({
          targetKg,
          crop: orderCrop,
          candidates,
          currentRouting,
          decliningFarmerId: rejectingFarmerId,
          declinedKg: Math.round(targetKg * 0.3),
        })

        activeOrderRoutings.set(id, cascadeResult.newRouting)

        return NextResponse.json({
          ok: true,
          action: 'farmer_reject',
          isSmallOrder: false,
          message: cascadeResult.logMessage,
          promotedFarmer: cascadeResult.promotedFarmer,
          routing: cascadeResult.newRouting,
        })
      }
    }

    // Handle Action 3: Admin Approves & Aggregates Bulk Demand
    if (action === 'admin_approve_aggregate') {
      try {
        await db.query(`update agrilink.orders set status = 'AGGREGATED' where id = $1`, [id])
      } catch {}

      const batchCode = `BATCH-${String(id).slice(-4).toUpperCase()}-${orderCrop}`

      return NextResponse.json({
        ok: true,
        action: 'admin_approve_aggregate',
        message: `Multi-smallholder sourcing batch ${batchCode} locked and confirmed by FPO Admin. Dispatch manifest generated.`,
        orderId: id,
        batchCode,
        status: 'AGGREGATED',
      })
    }

    // Handle Action 4: Farmer Commits Produce to an Order / Demand
    if (action === 'farmer_commit') {
      const commitQty = Number(body.committedKg || body.quantity_kg || 100)
      const farmerName = body.farmerName || 'Ramesh Kumar'
      const fId = body.farmerId || 'f-ramesh-101'

      // Check current order details
      let currentOrder: any = null
      try {
        const rows = await db.query<any>(`select * from agrilink.orders where id = $1`, [id])
        if (rows.length > 0) currentOrder = rows[0]
      } catch {}

      const currentCommitted = Number(currentOrder?.qty_committed_kg || 0)
      const target = Number(currentOrder?.qty_target_kg || body.targetKg || 500)
      const newCommitted = Math.min(target, currentCommitted + commitQty)
      const isFull = newCommitted >= target
      const newStatus = isFull ? 'AGGREGATED' : 'PARTIALLY_COMMITTED'

      try {
        await db.query(
          `update agrilink.orders
           set qty_committed_kg = $2,
               status = case when $3 = 'AGGREGATED' then 'AGGREGATED' else status end
           where id = $1`,
          [id, newCommitted, newStatus]
        )

        await db.query(
          `insert into agrilink.commitments (order_id, farmer_id, qty_committed_kg, is_standby, status, created_at)
           values ($1, $2, $3, false, 'ACTIVE', now())
           on conflict do nothing`,
          [id, fId, commitQty]
        ).catch(() => null)
      } catch (e) {
        console.warn('DB commitment update notice:', e)
      }

      return NextResponse.json({
        ok: true,
        action: 'farmer_commit',
        orderId: id,
        farmerName,
        committedKg: commitQty,
        totalCommittedKg: newCommitted,
        targetKg: target,
        remainingKg: Math.max(0, target - newCommitted),
        status: newStatus,
        message: `Successfully committed ${commitQty} kg produce. Remaining open capacity: ${Math.max(0, target - newCommitted)} kg.`
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to process order action' },
      { status: 500 }
    )
  }
}
