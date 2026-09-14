import type { Grade } from '@/lib/domain/grading'
import { userName } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { recordLot, type LotDecisionInput } from '@/lib/server/collection'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'

const DECISIONS: LotDecisionInput['decision'][] = ['ACCEPT', 'OVERRIDE', 'MANUAL', 'REJECT']

/** The coordinator weighs and grades a lot at the collection point. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = await requireRole(request, 'admin')
    const body = await readJson(request)
    const farmerId = optionalString(body.farmerId)
    const decision = String(body.decision ?? '') as LotDecisionInput['decision']
    if (!farmerId || body.weighedKg == null || !DECISIONS.includes(decision)) throw new DomainError('farmerId, weighedKg and a valid decision are required.', 400)
    const grade = ['A', 'B', 'C'].includes(String(body.grade)) ? (String(body.grade) as Grade) : undefined
    const db = await getDb()
    const result = await recordLot(db, {
      orderId: id,
      farmerId,
      attemptId: optionalString(body.attemptId),
      weighedKg: Number(body.weighedKg),
      decision,
      grade,
      reason: optionalString(body.reason) ?? undefined,
      by: userName(admin) || 'FPO coordinator',
    })
    return Response.json(result)
  } catch (error) {
    return errorResponse(error, 'Lot collection failed.')
  }
}
