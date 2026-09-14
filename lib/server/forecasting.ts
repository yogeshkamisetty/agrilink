import { CROP_IDS, CROPS, shelfClassOf, type BuyerType, type CropId } from '@/lib/domain/crops'
import { addDays, isoDate, weekStart } from '@/lib/domain/dates'
import { forecastWeeklyDemand, projectSupply, sumForecasts, supplyBalance, type Backtest, type SmoothingParams, type WeeklyPoint } from '@/lib/domain/demand-forecast'
import { schoolWeek, type CalendarDay } from '@/lib/domain/forecast'
import { round2 } from '@/lib/domain/money'
import { clock } from './clock'
import type { Db } from './db'

export const MAX_FORECAST_WEEKS = 8

type BuyerRow = { id: string; name: string; type: BuyerType; enrolment: number | null }

/** School kitchens only cook on school days; their history is normalised to the academic calendar. */
const followsSchoolCalendar = (buyer: BuyerRow) => buyer.type === 'INSTITUTIONAL' && buyer.enrolment != null

export type BuyerForecast = {
  buyerId: string
  buyerName: string
  buyerType: BuyerType
  basisWeeks: number
  syntheticWeeks: number
  platformWeeks: number
  nextWeekKg: number
  params: SmoothingParams
  backtest: Backtest | null
  method: string
}

/**
 * Demand for one crop over the next weeks, bottom-up: a model per buyer on
 * its weekly purchase history (platform orders replace any synthetic figure
 * for the same week), summed across buyers, set against orders already booked
 * and against the uncommitted harvest members have registered.
 */
export async function cropDemandForecast(db: Db, crop: CropId, weeks = 4) {
  const horizon = Math.min(MAX_FORECAST_WEEKS, Math.max(1, Math.round(weeks) || 4))
  const today = isoDate(clock.now())
  const thisWeek = weekStart(today)
  const weekStarts = Array.from({ length: horizon }, (_, i) => addDays(thisWeek, 7 * (i + 1)))
  const lastWeek = weekStarts[weekStarts.length - 1]

  const [history, calendarRows, buyers, orders, registry] = await Promise.all([
    db.query<{ buyer_id: string; week_start: string; school_days: number; qty_kg: number; synthetic: boolean }>(`select buyer_id, week_start, school_days, qty_kg, synthetic from agrilink.order_history where crop = $1`, [crop]),
    db.query<{ day: string; kind: 'HOLIDAY' | 'EXAM'; label: string }>(`select day, kind, label from agrilink.academic_calendar`),
    db.query<BuyerRow>(`select id, name, type, enrolment from agrilink.buyers order by name`),
    db.query<{ buyer_id: string; delivery_date: string; qty_target_kg: number }>(`select buyer_id, delivery_date, qty_target_kg from agrilink.orders where crop = $1 and status <> 'REJECTED'`, [crop]),
    db.query<{ available_kg: number; harvest_window_start: string; harvest_window_end: string }>(
      `select greatest(0, r.expected_qty_kg - coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')), 0)) as available_kg,
              r.harvest_window_start, r.harvest_window_end
         from agrilink.crop_registry r where r.crop = $1 and r.status = 'ACTIVE'`,
      [crop],
    ),
  ])
  const calendar: CalendarDay[] = calendarRows.map((c) => ({ day: c.day, kind: c.kind, label: c.label }))

  // Orders delivered in completed weeks are real history; orders in the forecast weeks are booked demand.
  const platformHistory = new Map<string, number>()
  const booked = new Map<string, number>()
  for (const o of orders) {
    const ws = weekStart(o.delivery_date)
    if (ws < thisWeek) platformHistory.set(`${o.buyer_id}|${ws}`, (platformHistory.get(`${o.buyer_id}|${ws}`) ?? 0) + o.qty_target_kg)
    else if (ws > thisWeek && ws <= lastWeek) booked.set(ws, (booked.get(ws) ?? 0) + o.qty_target_kg)
  }

  const perBuyer: Array<{ summary: BuyerForecast; forecast: NonNullable<ReturnType<typeof forecastWeeklyDemand>> }> = []
  for (const buyer of buyers) {
    const school = followsSchoolCalendar(buyer)
    const points = new Map<string, WeeklyPoint & { synthetic: boolean }>()
    for (const h of history) {
      if (h.buyer_id !== buyer.id || h.week_start >= thisWeek) continue
      points.set(h.week_start, { weekStart: h.week_start, qtyKg: h.qty_kg, servingDays: school ? h.school_days : null, synthetic: h.synthetic })
    }
    for (const [key, kg] of platformHistory) {
      const [buyerId, ws] = key.split('|')
      if (buyerId !== buyer.id) continue
      points.set(ws, { weekStart: ws, qtyKg: kg, servingDays: school ? schoolWeek(ws, calendar).schoolDays : null, synthetic: false })
    }
    const series = [...points.values()]
    const forecast = forecastWeeklyDemand(
      series,
      weekStarts.map((ws) => ({ weekStart: ws, servingDays: school ? schoolWeek(ws, calendar).schoolDays : null })),
    )
    if (!forecast) continue
    perBuyer.push({
      forecast,
      summary: {
        buyerId: buyer.id,
        buyerName: buyer.name,
        buyerType: buyer.type,
        basisWeeks: forecast.basisWeeks,
        syntheticWeeks: series.filter((p) => p.synthetic).length,
        platformWeeks: series.filter((p) => !p.synthetic).length,
        nextWeekKg: forecast.points[0]?.kg ?? 0,
        params: forecast.params,
        backtest: forecast.backtest,
        method: forecast.method,
      },
    })
  }

  const combined = sumForecasts(perBuyer.map((p) => p.forecast), weekStarts)
  const supplyMode = shelfClassOf(crop) === 'perishable' ? 'flow' : 'stock'
  const supply = projectSupply(
    registry.map((r) => ({ availableKg: r.available_kg, start: r.harvest_window_start, end: r.harvest_window_end })),
    weekStarts,
    supplyMode,
  )

  const weeksOut = weekStarts.map((ws, i) => {
    const bookedKg = round2(booked.get(ws) ?? 0)
    const p = combined[i]
    return { weekStart: ws, forecastKg: p.kg, lowKg: p.lowKg, highKg: p.highKg, bookedKg, demandKg: Math.max(p.kg, bookedKg), supplyKg: supply.weekly[i] }
  })
  const demandKg = Math.round(weeksOut.reduce((s, w) => s + w.demandKg, 0))
  const lowKg = Math.max(0, Math.round(demandKg - Math.sqrt(combined.reduce((s, p) => s + (p.kg - p.lowKg) ** 2, 0))))
  const highKg = Math.round(demandKg + Math.sqrt(combined.reduce((s, p) => s + (p.highKg - p.kg) ** 2, 0)))
  const bookedKg = round2(weeksOut.reduce((s, w) => s + w.bookedKg, 0))
  const hasDemandSignal = perBuyer.length > 0 || bookedKg > 0

  return {
    crop,
    cropName: CROPS[crop].name,
    generatedAt: clock.now().toISOString(),
    horizonWeeks: horizon,
    status: perBuyer.length ? 'OK' : bookedKg > 0 ? 'BOOKED_ONLY' : 'INSUFFICIENT_HISTORY',
    weeks: weeksOut,
    totals: { demandKg, lowKg, highKg, bookedKg, supplyKg: supply.horizonKg },
    balance: hasDemandSignal ? supplyBalance({ kg: demandKg, lowKg, highKg }, supply.horizonKg) : null,
    supplyMode,
    buyers: perBuyer.map((p) => p.summary),
    syntheticHistory: perBuyer.some((p) => p.summary.syntheticWeeks > 0),
    method:
      'Per-buyer damped-trend exponential smoothing on weekly purchases (school kitchens normalised to serving days), summed across buyers; demand is the larger of forecast and booked orders; ' +
      (supplyMode === 'flow' ? 'perishable supply spread evenly across each registered harvest window.' : 'storable supply counted as uncommitted stock over the horizon.'),
  }
}

export type CropForecast = Awaited<ReturnType<typeof cropDemandForecast>>

export type ForecastOverview = Awaited<ReturnType<typeof forecastOverview>>

/** One line per crop that has demand history or registered supply. */
export async function forecastOverview(db: Db, weeks = 4) {
  const active = await db.query<{ crop: string }>(`select distinct crop from agrilink.order_history union select distinct crop from agrilink.crop_registry where status = 'ACTIVE'`)
  const crops = CROP_IDS.filter((c) => active.some((a) => a.crop === c))
  const forecasts: CropForecast[] = []
  for (const crop of crops) forecasts.push(await cropDemandForecast(db, crop, weeks))
  return {
    generatedAt: clock.now().toISOString(),
    horizonWeeks: forecasts[0]?.horizonWeeks ?? weeks,
    crops: forecasts.map((f) => ({
      crop: f.crop,
      cropName: f.cropName,
      status: f.status,
      nextWeekKg: f.weeks[0]?.demandKg ?? 0,
      demandKg: f.totals.demandKg,
      lowKg: f.totals.lowKg,
      highKg: f.totals.highKg,
      bookedKg: f.totals.bookedKg,
      supplyKg: f.totals.supplyKg,
      balance: f.balance,
      buyers: f.buyers.length,
      syntheticHistory: f.syntheticHistory,
    })),
  }
}
