import { maxAcceptableKg } from '@/lib/domain/commitments'
import { GRADE_CRITERIA, type AiGrading, type Grade } from '@/lib/domain/grading'
import { lotAdvance, round2 } from '@/lib/domain/money'
import type { Commitment, Lot, Order } from '@/lib/types'
import { clock } from './clock'
import type { Db } from './db'
import { DomainError, notFound } from './errors'
import { sendMessage } from './messages'
import { getCommitments, getFarmer, getFpo, getLots, getOrder, lockOrder, mapRow } from './repo'
import { fpoShortName, promoteStandby, tick } from './sourcing'
import { gradePhoto } from './vision'

export const MAX_PHOTO_BYTES = 1_500_000
export const MAX_LOT_KG = 5_000

export type GradingAttempt = {
  id: string
  orderId: string
  farmerId: string
  aiStatus: 'GRADED' | 'LOW_CONFIDENCE' | 'UNAVAILABLE'
  aiGrade: Grade | null
  aiConfidence: number | null
  aiDefects: string[]
  aiReasoning: string | null
  aiModel: string | null
  photoDataUrl: string | null
  lat: number | null
  lng: number | null
  lotId: string | null
  createdAt: string
}

function asCollectionLive(commitments: Commitment[]) {
  return commitments.map((c) => ({ id: c.id, farmerId: c.farmerId, qtyKg: c.qtyCommittedKg, isStandby: c.isStandby, status: c.status, createdAt: c.createdAt }))
}

function assertCollectable(order: Order) {
  if (order.status !== 'SOURCING' && order.status !== 'COLLECTING') {
    throw new DomainError(order.status === 'DISPATCHED' || order.status === 'SETTLED' ? 'This order has been dispatched; no more lots can be added.' : 'Farmers have not been notified for this order yet.')
  }
}

async function assertFarmerCollectable(db: Db, orderId: string, farmerId: string) {
  const [active] = await db.query(`select 1 from agrilink.commitments where order_id = $1 and farmer_id = $2 and status = 'ACTIVE' limit 1`, [orderId, farmerId])
  if (!active) throw new DomainError('This farmer has no active commitment on the order.', 403)
  const [lot] = await db.query(`select code from agrilink.lots where order_id = $1 and farmer_id = $2`, [orderId, farmerId])
  if (lot) throw new DomainError(`This farmer's lot is already recorded (${lot.code}).`)
}

/** How much of each committed farmer's produce the order can still take. */
export async function acceptanceLimits(db: Db, order: Order) {
  const [commitments, lots] = await Promise.all([getCommitments(db, order.id), getLots(db, order.id)])
  const accepted = round2(lots.reduce((s, l) => s + l.qtyAcceptedKg, 0))
  const collected = new Set(lots.map((l) => l.farmerId))
  const live = asCollectionLive(commitments)
  const limits = new Map<string, number>()
  for (const farmerId of new Set(commitments.map((c) => c.farmerId))) {
    limits.set(farmerId, collected.has(farmerId) ? 0 : maxAcceptableKg(order.qtyTargetKg, accepted, live, collected, farmerId))
  }
  return { acceptedKg: accepted, limits }
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/

/**
 * Run GradeCam on a photo taken at the collection point. The photo and the
 * model's verdict are stored server-side before the coordinator decides, so
 * the AI grade on the lot record is exactly what the model said.
 */
export async function gradeLot(db: Db, input: { orderId: string; farmerId: string; photoDataUrl: string; lat?: number | null; lng?: number | null }): Promise<GradingAttempt> {
  await tick(db, input.orderId)
  const order = await getOrder(db, input.orderId)
  assertCollectable(order)
  await assertFarmerCollectable(db, order.id, input.farmerId)
  const match = DATA_URL.exec(input.photoDataUrl)
  if (!match) throw new DomainError('Photo must be a JPEG, PNG or WebP image captured from the camera.', 400)
  if (match[2].length * 0.75 > MAX_PHOTO_BYTES) throw new DomainError('Photo is too large; capture at a lower resolution.', 400)

  const ai: AiGrading = await gradePhoto(order.crop, match[2], match[1])
  const graded = ai.status === 'UNAVAILABLE' ? null : ai
  const [row] = await db.query(
    `insert into agrilink.grading_attempts (order_id, farmer_id, ai_status, ai_grade, ai_confidence, ai_defects, ai_reasoning, ai_model, photo_data_url, lat, lng, created_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12) returning *`,
    [
      order.id,
      input.farmerId,
      ai.status,
      graded?.grade ?? null,
      graded?.confidence ?? null,
      JSON.stringify(graded?.defects ?? []),
      ai.status === 'UNAVAILABLE' ? ai.reason : graded!.reasoning,
      graded?.model ?? null,
      input.photoDataUrl,
      input.lat ?? null,
      input.lng ?? null,
      clock.now(),
    ],
  )
  return mapRow<GradingAttempt>(row)
}

export type LotDecisionInput = {
  orderId: string
  farmerId: string
  attemptId: string | null
  weighedKg: number
  decision: 'ACCEPT' | 'OVERRIDE' | 'MANUAL' | 'REJECT'
  grade?: Grade
  reason?: string
  by: string
}

/**
 * The coordinator's decision on a lot. "The AI proposes, a human decides":
 * Accept takes the AI grade; Override replaces it and must say why; Manual
 * is for when the AI was unavailable or unsure; Reject needs a reason. An
 * accepted lot triggers the farmer's advance immediately — cash on harvest
 * day, funded from the buyer's advance.
 */
export async function recordLot(db: Db, input: LotDecisionInput) {
  await tick(db, input.orderId)
  return db.tx(async (tx) => {
    const now = clock.now()
    const order = await lockOrder(tx, input.orderId)
    assertCollectable(order)
    await assertFarmerCollectable(tx, order.id, input.farmerId)
    if (!(input.weighedKg > 0) || input.weighedKg > MAX_LOT_KG) throw new DomainError(`Weighed quantity must be between 0 and ${MAX_LOT_KG} kg.`, 400)
    const reason = input.reason?.trim() ?? ''

    let attempt: GradingAttempt | null = null
    if (input.attemptId) {
      const [row] = await tx.query('select * from agrilink.grading_attempts where id = $1', [input.attemptId])
      if (!row) throw notFound('Grading attempt')
      attempt = mapRow<GradingAttempt>(row)
      if (attempt.orderId !== order.id || attempt.farmerId !== input.farmerId) throw new DomainError('That photo was taken for a different lot.', 400)
      if (attempt.lotId) throw new DomainError('That photo is already attached to a lot.')
    }

    let finalGrade: Grade | null
    let decision: Lot['decision']
    switch (input.decision) {
      case 'ACCEPT':
        if (attempt?.aiStatus !== 'GRADED' || !attempt.aiGrade) throw new DomainError('There is no confident AI grade to accept — grade manually instead.', 400)
        if (!GRADE_CRITERIA[attempt.aiGrade].accepted) throw new DomainError(`The AI graded this lot ${attempt.aiGrade}, which is below AGMARK minimum. Override with a reason, or reject.`, 400)
        finalGrade = attempt.aiGrade
        decision = 'ACCEPTED'
        break
      case 'OVERRIDE':
        if (!attempt?.aiGrade) throw new DomainError('There is no AI grade to override — use manual grading.', 400)
        if (!input.grade || !GRADE_CRITERIA[input.grade].accepted) throw new DomainError('Override to Grade A or B, or reject the lot.', 400)
        if (input.grade === attempt.aiGrade) throw new DomainError('The override grade matches the AI grade — accept it instead.', 400)
        if (reason.length < 3) throw new DomainError('An override needs a reason.', 400)
        finalGrade = input.grade
        decision = 'OVERRIDDEN'
        break
      case 'MANUAL':
        if (attempt?.aiStatus === 'GRADED') throw new DomainError('The AI returned a confident grade — accept or override it.', 400)
        if (!input.grade || !GRADE_CRITERIA[input.grade].accepted) throw new DomainError('Manual grade must be A or B, or reject the lot.', 400)
        finalGrade = input.grade
        decision = 'MANUAL'
        break
      case 'REJECT':
        if (reason.length < 3) throw new DomainError('A rejection needs a reason the farmer will see.', 400)
        finalGrade = input.grade ?? attempt?.aiGrade ?? 'C'
        decision = 'REJECTED'
        break
    }

    const { acceptedKg: acceptedSoFar, limits } = await acceptanceLimits(tx, order)
    const limit = limits.get(input.farmerId) ?? 0
    const qtyAccepted = decision === 'REJECTED' ? 0 : round2(Math.min(input.weighedKg, limit))
    if (decision !== 'REJECTED' && qtyAccepted <= 0) {
      throw new DomainError(`The order target is already covered (${acceptedSoFar} of ${order.qtyTargetKg} kg accepted or reserved for other committed farmers). This standby lot is not needed.`)
    }

    const [lotRow] = await tx.query(
      `insert into agrilink.lots (order_id, farmer_id, qty_weighed_kg, qty_accepted_kg, ai_status, ai_grade, ai_confidence, ai_defects, ai_reasoning, ai_model,
                                  final_grade, decision, override_by, override_reason, photo_data_url, captured_at, lat, lng)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) returning *`,
      [
        order.id,
        input.farmerId,
        round2(input.weighedKg),
        qtyAccepted,
        attempt?.aiStatus ?? 'UNAVAILABLE',
        attempt?.aiGrade ?? null,
        attempt?.aiConfidence ?? null,
        JSON.stringify(attempt?.aiDefects ?? []),
        attempt?.aiReasoning ?? 'No photo captured',
        attempt?.aiModel ?? null,
        finalGrade,
        decision,
        decision === 'ACCEPTED' ? null : input.by,
        reason || null,
        attempt?.photoDataUrl ?? null,
        now,
        attempt?.lat ?? null,
        attempt?.lng ?? null,
      ],
    )
    const lot = mapRow<Lot>(lotRow)
    if (attempt) await tx.query('update agrilink.grading_attempts set lot_id = $2 where id = $1', [attempt.id, lot.id])
    await tx.query(`update agrilink.commitments set status = $3 where order_id = $1 and farmer_id = $2 and status = 'ACTIVE'`, [order.id, input.farmerId, decision === 'REJECTED' ? 'REJECTED' : 'FULFILLED'])

    const [farmer, fpo] = await Promise.all([getFarmer(tx, input.farmerId), getFpo(tx, order.fpoId)])
    let advance: { amount: number } | null = null
    if (decision === 'REJECTED') {
      await sendMessage(tx, { orderId: order.id, farmer, channel: 'SMS', kind: 'REJECTED', template: 'REJECTED', params: { crop: order.crop, reason }, at: now })
    } else {
      const [{ paid }] = await tx.query<{ paid: number }>('select coalesce(sum(amount), 0) as paid from agrilink.advance_records where order_id = $1', [order.id])
      const amount = lotAdvance(qtyAccepted, order.pricePerKg, order.advancePct, (order.advanceAmount ?? 0) - paid)
      await tx.query('insert into agrilink.advance_records (order_id, farmer_id, lot_id, amount, disbursed_at) values ($1, $2, $3, $4, $5)', [order.id, input.farmerId, lot.id, amount, now])
      await sendMessage(tx, { orderId: order.id, farmer, channel: 'SMS', kind: 'ADVANCE', template: 'ADVANCE', params: { crop: order.crop, amount, qty: qtyAccepted, grade: finalGrade!, fpo: fpoShortName(fpo) }, at: now })
      advance = { amount }
    }

    if (order.status === 'SOURCING') await tx.query(`update agrilink.orders set status = 'COLLECTING' where id = $1`, [order.id])
    const promoted = await promoteStandby(tx, order, now)
    return { lot, advance, promoted, partial: qtyAccepted < input.weighedKg && decision !== 'REJECTED' }
  })
}
