import { NextResponse } from 'next/server'
import { round2 } from '@/lib/domain/money'
import { userName } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { coordinatorAllocate } from '@/lib/server/marketplace'
import { getFpo, getOrder } from '@/lib/server/repo'

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')
    const db = await getDb()
    return NextResponse.json({ batches: await db.query(`select * from agrilink.aggregation_batches order by created_at desc`) })
  } catch (error) {
    return errorResponse(error, 'Unable to load sourcing batches.')
  }
}

/** Lock a sourcing batch: the coordinator pools farmers into a funded order, within the registry and 115% rules, and records the batch. */
export async function POST(request: Request) {
  try {
    const admin = await requireRole(request, 'admin')
    const body = await readJson(request)
    const orderId = optionalString(body.order_id)
    if (!orderId) throw new DomainError('Choose the order this batch fills.', 400)
    const contributions = (Array.isArray(body.contributions) ? body.contributions : []).map((c) => {
      const item = (c ?? {}) as Record<string, unknown>
      return { farmerId: String(item.farmer_id ?? ''), qtyKg: Number(item.quantity_kg ?? item.allocated_kg) }
    })
    if (!contributions.length || contributions.some((c) => !c.farmerId || !(c.qtyKg > 0))) throw new DomainError('Add at least one farmer with a positive quantity.', 400)

    const db = await getDb()
    const allocation = await coordinatorAllocate(db, orderId, contributions)
    const order = await getOrder(db, orderId)
    const fpo = await getFpo(db, order.fpoId)
    const totalKg = round2(allocation.results.reduce((sum, r) => sum + r.primaryKg + r.standbyKg, 0))
    const [batch] = await db.query(
      `insert into agrilink.aggregation_batches (batch_code, fpo_name, crop, location, total_quantity_kg, created_by) values ($1, $2, $3, $4, $5, $6) returning *`,
      [optionalString(body.batch_code)?.toUpperCase() ?? `BATCH-${order.code}-${order.crop}`, fpo.name, order.crop, `${fpo.village} collection centre`, totalKg, userName(admin) || admin.id],
    )
    return NextResponse.json({ batch, results: allocation.results, totals: allocation.totals })
  } catch (error) {
    return errorResponse(error, 'Unable to lock the sourcing batch.')
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, 'admin')
    const body = await readJson(request)
    const batchId = optionalString(body.batch_id)
    const gradeA = Number(body.grade_a_kg)
    const gradeB = Number(body.grade_b_kg)
    if (!batchId || !Number.isFinite(gradeA) || !Number.isFinite(gradeB) || gradeA < 0 || gradeB < 0) throw new DomainError('Batch and non-negative grade quantities are required.', 400)
    const db = await getDb()
    const [batch] = await db.query(`update agrilink.aggregation_batches set grade_a_kg = $2, grade_b_kg = $3, quality_verified = $4 where id = $1 returning *`, [batchId, gradeA, gradeB, Boolean(body.quality_verified)])
    if (!batch) throw new DomainError('Batch not found.', 404)
    return NextResponse.json({ batch })
  } catch (error) {
    return errorResponse(error, 'Unable to update batch quality.')
  }
}
