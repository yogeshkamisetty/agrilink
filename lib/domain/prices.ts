import type { CropId } from './crops'

export type PriceTier = 'live' | 'cached' | 'seeded'

/** A reference price with provenance. The UI renders `tier` as a LIVE / CACHED / SEEDED badge. */
export type PriceQuote = {
  kind: 'MANDI' | 'RETAIL'
  crop: CropId
  pricePerKg: number
  market: string
  date: string
  source: 'AGMARKNET' | 'DOCA'
  tier: PriceTier
  fetchedAt: string
  detail: string
}

export type AgmarknetRecord = {
  state?: string
  district?: string
  market?: string
  commodity?: string
  arrival_date?: string
  modal_price?: number | string
}

/** AGMARKNET publishes ₹/quintal with dates as dd/mm/yyyy. */
export function parseArrivalDate(value: string | undefined): string | null {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

/**
 * Reduce a page of AGMARKNET records to one reference price: the median
 * modal price across markets on the latest arrival date, in ₹/kg.
 */
export function summariseMandiRecords(records: AgmarknetRecord[]): { pricePerKg: number; date: string; markets: string[] } | null {
  const rows = records
    .map((r) => ({ date: parseArrivalDate(r.arrival_date), modal: Number(r.modal_price), market: `${r.market ?? 'Unknown'}${r.state ? `, ${r.state}` : ''}` }))
    .filter((r): r is { date: string; modal: number; market: string } => r.date !== null && Number.isFinite(r.modal) && r.modal > 0)
  if (!rows.length) return null
  const latest = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date)
  const sameDay = rows.filter((r) => r.date === latest)
  const sorted = sameDay.map((r) => r.modal).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianQuintal = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return { pricePerKg: Math.round(medianQuintal) / 100, date: latest, markets: sameDay.map((r) => r.market) }
}
