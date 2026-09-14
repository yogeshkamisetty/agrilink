import { round2, suggestedPrice } from './money'

export type PriceBand = {
  mandiPerKg: number | null
  retailPerKg: number | null
  fairPricePerKg: number | null
  /** Estimated transport the farmer bears per kg (deducted at settlement). */
  logisticsPerKg: number | null
  /** What the farmer realises above the mandi, after transport. */
  farmerGainPerKg: number | null
  /** What the buyer saves against the shop price. */
  buyerSavingPerKg: number | null
  /** Mandi price as a share of the retail price: the farmer's cut of the consumer rupee without AgriLink. */
  traditionalFarmerSharePct: number | null
  /** Farmer's realised price as a share of what the buyer pays through AgriLink. */
  directFarmerSharePct: number | null
}

/**
 * The corridor a direct order sits in. The floor is the AGMARKNET mandi modal
 * price — what the farmer gets without us. The ceiling is the DoCA retail
 * price — what the consumer pays without us. Mandi ÷ retail is a proxy for
 * the farmer's share of the consumer rupee through the intermediary chain
 * (RBI's 2024 study puts it at roughly a third for tomato, onion and potato).
 */
export function priceBand(input: { mandiPerKg: number | null; retailPerKg: number | null; pricePerKg?: number | null; logisticsPerKg?: number | null }): PriceBand {
  const mandi = input.mandiPerKg
  const retail = input.retailPerKg
  const price = input.pricePerKg ?? suggestedPrice(mandi, retail)
  const logistics = input.logisticsPerKg ?? null
  const realised = price != null ? price - (logistics ?? 0) : null
  return {
    mandiPerKg: mandi,
    retailPerKg: retail,
    fairPricePerKg: price,
    logisticsPerKg: logistics,
    farmerGainPerKg: realised != null && mandi != null ? round2(realised - mandi) : null,
    buyerSavingPerKg: price != null && retail != null ? round2(retail - price) : null,
    traditionalFarmerSharePct: mandi != null && retail != null && retail > 0 ? Math.round((mandi / retail) * 100) : null,
    directFarmerSharePct: realised != null && price != null && price > 0 ? Math.round((realised / price) * 100) : null,
  }
}

export type PriceCheck = { ok: true; warnings: string[] } | { ok: false; reason: string }

/**
 * A direct order may never pay the farmer less than the mandi would: that is
 * the first benefit the marketplace promises. Paying above the shop price is
 * the buyer's call, so it only warns.
 */
export function checkOrderPrice(pricePerKg: number, mandiPerKg: number | null, retailPerKg: number | null): PriceCheck {
  if (!(pricePerKg > 0)) return { ok: false, reason: 'Price must be positive.' }
  if (mandiPerKg != null && pricePerKg < mandiPerKg) {
    return { ok: false, reason: `₹${pricePerKg}/kg is below the mandi reference of ₹${mandiPerKg}/kg — farmers would earn less than selling at the mandi. Offer at least ₹${Math.ceil(mandiPerKg)}/kg.` }
  }
  const warnings: string[] = []
  if (retailPerKg != null && pricePerKg > retailPerKg) warnings.push(`₹${pricePerKg}/kg is above the retail reference of ₹${retailPerKg}/kg.`)
  return { ok: true, warnings }
}
