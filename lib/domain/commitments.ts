import { round2 } from './money'

/** Commitments accumulate to this multiple of the target; everything above 100% is standby. */
export const OVERCOMMIT_RATIO = 1.15

export function commitmentCap(targetKg: number): number {
  return round2(targetKg * OVERCOMMIT_RATIO)
}

export type CommitmentTotals = { targetKg: number; primaryKg: number; standbyKg: number }

export type Classification =
  | { ok: true; primaryKg: number; standbyKg: number; trimmedKg: number; fillsOrder: boolean }
  | { ok: false; reason: 'ORDER_FULL' | 'INVALID_QTY' }

/**
 * Split an incoming commitment into a primary part (up to the 100% line) and
 * a standby part (up to the 115% cap). Anything beyond the cap is trimmed.
 * A commitment that straddles the target line is split, so primary volume
 * never exceeds the target and no primary farmer is short-changed at
 * collection.
 */
export function classifyCommitment(totals: CommitmentTotals, offeredKg: number): Classification {
  if (!Number.isFinite(offeredKg) || offeredKg <= 0) return { ok: false, reason: 'INVALID_QTY' }
  const cap = commitmentCap(totals.targetKg)
  const room = round2(cap - totals.primaryKg - totals.standbyKg)
  if (room <= 0) return { ok: false, reason: 'ORDER_FULL' }

  const accepted = Math.min(round2(offeredKg), room)
  const primaryRoom = Math.max(0, round2(totals.targetKg - totals.primaryKg))
  const primaryKg = Math.min(accepted, primaryRoom)
  const standbyKg = round2(accepted - primaryKg)
  return {
    ok: true,
    primaryKg,
    standbyKg,
    trimmedKg: round2(offeredKg - accepted),
    fillsOrder: round2(totals.primaryKg + totals.standbyKg + accepted) >= cap,
  }
}

export type LiveCommitment = {
  id: string
  farmerId: string
  qtyKg: number
  isStandby: boolean
  status: 'ACTIVE' | 'WITHDRAWN' | 'FULFILLED' | 'REJECTED' | 'RELEASED' | 'NO_SHOW'
  createdAt: string
}

/** Kg still expected from active primary commitments whose farmer has not been collected yet. */
export function reservedPrimaryKg(commitments: LiveCommitment[], collectedFarmerIds: Set<string>, excludeFarmerId?: string): number {
  return round2(
    commitments
      .filter((c) => c.status === 'ACTIVE' && !c.isStandby && !collectedFarmerIds.has(c.farmerId) && c.farmerId !== excludeFarmerId)
      .reduce((sum, c) => sum + c.qtyKg, 0),
  )
}

/**
 * The shortfall standby commitments must cover: target minus what is
 * already accepted at collection minus what active primary farmers are
 * still expected to bring.
 */
export function shortfallKg(targetKg: number, acceptedKg: number, commitments: LiveCommitment[], collectedFarmerIds: Set<string>): number {
  return Math.max(0, round2(targetKg - acceptedKg - reservedPrimaryKg(commitments, collectedFarmerIds)))
}

/** Standby commitments to promote, earliest first, until the shortfall is covered. */
export function standbyToPromote(targetKg: number, acceptedKg: number, commitments: LiveCommitment[], collectedFarmerIds: Set<string>): LiveCommitment[] {
  let remaining = shortfallKg(targetKg, acceptedKg, commitments, collectedFarmerIds)
  const promoted: LiveCommitment[] = []
  const standby = commitments
    .filter((c) => c.status === 'ACTIVE' && c.isStandby && !collectedFarmerIds.has(c.farmerId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const c of standby) {
    if (remaining <= 0) break
    promoted.push(c)
    remaining = round2(remaining - c.qtyKg)
  }
  return promoted
}

/**
 * The most a farmer's lot can contribute at collection without eating into
 * volume reserved for primary farmers who have not been collected yet.
 * Accepted volume never exceeds the buyer's target.
 */
export function maxAcceptableKg(targetKg: number, acceptedKg: number, commitments: LiveCommitment[], collectedFarmerIds: Set<string>, farmerId: string): number {
  return Math.max(0, round2(targetKg - acceptedKg - reservedPrimaryKg(commitments, collectedFarmerIds, farmerId)))
}
