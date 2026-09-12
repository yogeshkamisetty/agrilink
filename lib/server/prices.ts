import { CROPS, getCrop, type CropId } from '@/lib/domain/crops'
import { summariseMandiRecords, type AgmarknetRecord, type PriceQuote } from '@/lib/domain/prices'
import { clock } from './clock'
import type { Db } from './db'

/**
 * External price adapters. Each tries the live feed, then the last value it
 * successfully fetched (cached), then the seeded snapshot — and says which
 * one it used. A failed feed never breaks a screen.
 */

const AGMARKNET_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'
const LIVE_TIMEOUT_MS = 6000

type Row = { kind: 'MANDI' | 'RETAIL'; crop: CropId; market: string; price_date: string; price_per_kg: number; source: string; tier: 'live' | 'seeded'; detail: string | null; fetched_at: Date }

function toQuote(row: Row, tier: PriceQuote['tier']): PriceQuote {
  return {
    kind: row.kind,
    crop: row.crop,
    pricePerKg: row.price_per_kg,
    market: row.market,
    date: row.price_date,
    source: row.source as PriceQuote['source'],
    tier,
    fetchedAt: new Date(row.fetched_at).toISOString(),
    detail: row.detail ?? '',
  }
}

async function fallback(db: Db, kind: 'MANDI' | 'RETAIL', crop: CropId, why: string): Promise<PriceQuote | null> {
  const [cached] = await db.query<Row>(`select * from agrilink.price_refs where kind = $1 and crop = $2 and tier = 'live' order by fetched_at desc limit 1`, [kind, crop])
  if (cached) return { ...toQuote(cached, 'cached'), detail: `${cached.detail ?? ''} · live feed unavailable now (${why})`.trim() }
  const [seeded] = await db.query<Row>(`select * from agrilink.price_refs where kind = $1 and crop = $2 and tier = 'seeded' order by fetched_at desc limit 1`, [kind, crop])
  return seeded ? { ...toQuote(seeded, 'seeded'), detail: `${seeded.detail ?? ''} · ${why}` } : null
}

async function cacheLive(db: Db, quote: Omit<PriceQuote, 'tier' | 'fetchedAt'>): Promise<PriceQuote> {
  const [row] = await db.query<Row>(
    `insert into agrilink.price_refs (kind, crop, market, price_date, price_per_kg, source, tier, detail, fetched_at)
     values ($1, $2, $3, $4::date, $5, $6, 'live', $7, $8) returning *`,
    [quote.kind, quote.crop, quote.market, quote.date, quote.pricePerKg, quote.source, quote.detail, clock.now()],
  )
  return toQuote(row, 'live')
}

async function fetchJson(url: string): Promise<{ records?: unknown[] }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS), cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function dataGovUrl(resource: string, key: string, filters: Record<string, string>) {
  const url = new URL(`https://api.data.gov.in/resource/${resource}`)
  url.searchParams.set('api-key', key)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '200')
  for (const [field, value] of Object.entries(filters)) url.searchParams.set(`filters[${field}]`, value)
  return url.toString()
}

/**
 * AGMARKNET mandi price. Tries the pilot state's markets first; if none have
 * reported yet today (common early in the morning before arrivals are logged)
 * falls back to the national median — and says so.
 */
export async function getMandiPrice(db: Db, crop: CropId, state = process.env.PILOT_STATE || 'Gujarat'): Promise<PriceQuote | null> {
  const key = process.env.DATA_GOV_IN_API_KEY
  if (!key) return fallback(db, 'MANDI', crop, 'DATA_GOV_IN_API_KEY not set')
  const commodity = getCrop(crop).agmarknetCommodity
  try {
    const stateData = await fetchJson(dataGovUrl(AGMARKNET_RESOURCE, key, { 'state.keyword': state, commodity }))
    const inState = summariseMandiRecords((stateData.records ?? []) as AgmarknetRecord[])
    if (inState) {
      return cacheLive(db, { kind: 'MANDI', crop, pricePerKg: inState.pricePerKg, market: `${state} median (${inState.markets.length} markets)`, date: inState.date, source: 'AGMARKNET', detail: `Modal price, median of ${inState.markets.slice(0, 4).join('; ')}` })
    }
    const national = await fetchJson(dataGovUrl(AGMARKNET_RESOURCE, key, { commodity }))
    const all = summariseMandiRecords((national.records ?? []) as AgmarknetRecord[])
    if (all) {
      return cacheLive(db, { kind: 'MANDI', crop, pricePerKg: all.pricePerKg, market: `National median (${all.markets.length} markets)`, date: all.date, source: 'AGMARKNET', detail: `No ${state} arrivals published yet for this date; median of ${all.markets.slice(0, 3).join('; ')}` })
    }
    return fallback(db, 'MANDI', crop, `AGMARKNET returned no ${commodity} records`)
  } catch (error) {
    return fallback(db, 'MANDI', crop, `AGMARKNET request failed: ${(error as Error).message}`)
  }
}

type DocaRecord = Record<string, unknown>

function pickNumber(record: DocaRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(record[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return null
}

/**
 * DoCA Price Monitoring retail price. The division publishes through a
 * reporting portal rather than a stable API, so the data.gov.in resource is
 * configured via DOCA_RESOURCE_ID once verified. Until then this returns
 * the cached or seeded figure, labelled as such.
 */
export async function getRetailPrice(db: Db, crop: CropId, centre = process.env.DOCA_CENTRE || 'Ahmedabad'): Promise<PriceQuote | null> {
  const commodity = getCrop(crop).docaCommodity
  if (!commodity) return null
  const key = process.env.DATA_GOV_IN_API_KEY
  const resource = process.env.DOCA_RESOURCE_ID
  if (!key || !resource) return fallback(db, 'RETAIL', crop, 'DoCA feed not configured (DOCA_RESOURCE_ID)')
  try {
    const data = await fetchJson(dataGovUrl(resource, key, { commodity }))
    const records = (data.records ?? []) as DocaRecord[]
    const forCentre = records.filter((r) => String(r.centre ?? r.center ?? r.city ?? '').toLowerCase() === centre.toLowerCase())
    const record = forCentre[0] ?? records[0]
    const price = record ? pickNumber(record, ['retail_price', 'price', 'retail', 'modal_price']) : null
    if (!record || price == null) return fallback(db, 'RETAIL', crop, 'DoCA returned no usable record')
    const date = String(record.date ?? record.price_date ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10)
    return cacheLive(db, { kind: 'RETAIL', crop, pricePerKg: price, market: String(record.centre ?? record.center ?? centre), date, source: 'DOCA', detail: 'DoCA Price Monitoring daily retail price' })
  } catch (error) {
    return fallback(db, 'RETAIL', crop, `DoCA request failed: ${(error as Error).message}`)
  }
}
