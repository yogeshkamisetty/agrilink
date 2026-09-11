/**
 * Money arithmetic. Amounts are rupees rounded to paise. The platform never
 * holds funds: every figure here is a ledger instruction for money moving
 * buyer → FPO bank account → farmer / transporter.
 */

export const DEFAULT_ADVANCE_PCT = 0.4

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Advance the buyer commits when posting the order: a share of the full target value. */
export function buyerAdvance(targetKg: number, pricePerKg: number, advancePct: number): number {
  return round2(targetKg * pricePerKg * advancePct)
}

/**
 * Advance disbursed to a farmer when their lot is accepted at collection.
 * Funded from the buyer's advance, so it can never exceed what is left of it.
 */
export function lotAdvance(acceptedKg: number, pricePerKg: number, advancePct: number, poolRemaining: number): number {
  return Math.max(0, Math.min(round2(acceptedKg * pricePerKg * advancePct), round2(poolRemaining)))
}

/**
 * Split the vehicle cost across lots in proportion to kg, using the largest
 * remainder method so the shares add up to the vehicle cost to the paisa.
 */
export function allocateTransport(vehicleCost: number, lots: { id: string; kg: number }[]): Map<string, number> {
  const shares = new Map<string, number>()
  const totalKg = lots.reduce((sum, l) => sum + l.kg, 0)
  if (lots.length === 0) return shares
  if (totalKg <= 0) {
    lots.forEach((l) => shares.set(l.id, 0))
    return shares
  }
  const totalPaise = Math.round(vehicleCost * 100)
  const exact = lots.map((l) => ({ id: l.id, paise: (totalPaise * l.kg) / totalKg }))
  const floored = exact.map((e) => ({ id: e.id, paise: Math.floor(e.paise), remainder: e.paise - Math.floor(e.paise) }))
  let leftover = totalPaise - floored.reduce((sum, e) => sum + e.paise, 0)
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id))
  for (const entry of byRemainder) {
    if (leftover <= 0) break
    entry.paise += 1
    leftover -= 1
  }
  floored.forEach((e) => shares.set(e.id, e.paise / 100))
  return shares
}

export type SettlementLine = { acceptedKg: number; pricePerKg: number; gross: number; transportShare: number; advanceDeducted: number; netPayable: number }

/** net payable = graded weight × agreed price − proportional transport share − advance already paid */
export function settleLot(acceptedKg: number, pricePerKg: number, transportShare: number, advancePaid: number): SettlementLine {
  const gross = round2(acceptedKg * pricePerKg)
  return {
    acceptedKg,
    pricePerKg,
    gross,
    transportShare: round2(transportShare),
    advanceDeducted: round2(advancePaid),
    netPayable: round2(gross - transportShare - advancePaid),
  }
}

/** Price a buyer is offered by default: halfway between mandi and retail, so both sides gain. */
export function suggestedPrice(mandiPerKg: number | null, retailPerKg: number | null): number | null {
  if (mandiPerKg != null && retailPerKg != null && retailPerKg > mandiPerKg) return Math.round((mandiPerKg + retailPerKg) / 2)
  if (mandiPerKg != null) return Math.round(mandiPerKg * 1.3)
  return null
}

export type PriceProof = {
  mandi: number | null
  retail: number | null
  farmerRealised: number
  buyerPaid: number
  farmerGain: number | null
  buyerSaving: number | null
  marginBefore: number | null
  marginAfter: number
  compressionPct: number | null
}

/**
 * The four-number proof: farmer realised vs the AGMARKNET mandi price, and
 * buyer paid vs the DoCA retail price. "Chain margin" is what sits between
 * farmer and consumer: retail − mandi before, buyer paid − farmer realised
 * through AgriLink.
 */
export function priceProof(input: { mandi: number | null; retail: number | null; buyerPaid: number; farmerRealised: number }): PriceProof {
  const { mandi, retail, buyerPaid, farmerRealised } = input
  const marginBefore = mandi != null && retail != null ? round2(retail - mandi) : null
  const marginAfter = round2(buyerPaid - farmerRealised)
  return {
    mandi,
    retail,
    farmerRealised: round2(farmerRealised),
    buyerPaid: round2(buyerPaid),
    farmerGain: mandi != null ? round2(farmerRealised - mandi) : null,
    buyerSaving: retail != null ? round2(retail - buyerPaid) : null,
    marginBefore,
    marginAfter,
    compressionPct: marginBefore != null && marginBefore > 0 ? Math.round(((marginBefore - marginAfter) / marginBefore) * 100) : null,
  }
}

export function formatINR(value: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? !Number.isInteger(round2(value))
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }).format(value)
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`
}
