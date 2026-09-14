import { addDays, daysBetween } from './dates'

/**
 * Weekly demand forecasting per buyer and crop.
 *
 * Model: damped-trend exponential smoothing (level + damped trend), with the
 * three smoothing constants chosen per series by grid search on one-step-ahead
 * squared error. Kitchens that follow the school calendar are normalised to a
 * full serving week first, so vacations and holidays are not read as demand
 * shocks, and re-scaled by the serving days of each forecast week. The 80%
 * interval comes from the in-sample one-step residuals, widened with the
 * square root of the horizon. Every forecast carries a rolling-origin
 * backtest against a naive "same as last week" baseline, so the model has to
 * earn its keep — on synthetic history those figures describe the method,
 * not real-world accuracy.
 */

export type WeeklyPoint = { weekStart: string; qtyKg: number; servingDays?: number | null }
export type FutureWeek = { weekStart: string; servingDays?: number | null }

export type SmoothingParams = { alpha: number; beta: number; phi: number }
export type SmoothingFit = SmoothingParams & { level: number; trend: number; residuals: number[]; sse: number }

export type Backtest = { holdoutWeeks: number; maeKg: number; mapePct: number | null; naiveMaeKg: number; skillPct: number | null }
export type ForecastPoint = { weekStart: string; kg: number; lowKg: number; highKg: number; servingDays: number | null }
export type SeriesForecast = { points: ForecastPoint[]; params: SmoothingParams; residualSdKg: number; basisWeeks: number; backtest: Backtest | null; method: string }

export const FULL_WEEK_SERVING_DAYS = 6
export const MIN_HISTORY_WEEKS = 8
/** z for a two-sided 80% interval under normally distributed errors. */
export const Z_80 = 1.2816

const ALPHAS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
const BETAS = [0, 0.05, 0.1, 0.2, 0.3]
const PHIS = [0.8, 0.9, 0.98]
/** One-step errors this early mostly reflect the initial state, not the parameters. */
const WARMUP = 2
const MIN_TRAINING_WEEKS = 6

export function smooth(series: number[], p: SmoothingParams): SmoothingFit {
  if (series.length < 2) throw new Error('At least two observations are needed.')
  const m = Math.min(4, series.length - 1)
  let level = series[0]
  let trend = (series[m] - series[0]) / m
  const residuals: number[] = []
  for (let t = 1; t < series.length; t++) {
    const expected = level + p.phi * trend
    residuals.push(series[t] - expected)
    const previous = level
    level = p.alpha * series[t] + (1 - p.alpha) * expected
    trend = p.beta * (level - previous) + (1 - p.beta) * p.phi * trend
  }
  const scored = residuals.slice(Math.min(WARMUP, residuals.length - 1))
  return { ...p, level, trend, residuals, sse: scored.reduce((sum, e) => sum + e * e, 0) }
}

export function fitSmoothing(series: number[]): SmoothingFit {
  let best: SmoothingFit | null = null
  for (const alpha of ALPHAS) {
    for (const beta of BETAS) {
      for (const phi of PHIS) {
        const fit = smooth(series, { alpha, beta, phi })
        if (!best || fit.sse < best.sse - 1e-9) best = fit
      }
    }
  }
  return best!
}

/** h-step-ahead point forecast: level + (φ + φ² + … + φʰ) × trend. */
export function project(fit: SmoothingFit, h: number): number {
  let damping = 0
  for (let i = 1; i <= h; i++) damping += fit.phi ** i
  return fit.level + damping * fit.trend
}

function sampleSd(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
}

const toFullWeek = (qtyKg: number, servingDays: number | null | undefined) => (servingDays == null ? qtyKg : servingDays > 0 ? (qtyKg * FULL_WEEK_SERVING_DAYS) / servingDays : 0)
const fromFullWeek = (kg: number, servingDays: number | null | undefined) => (servingDays == null ? kg : (kg * servingDays) / FULL_WEEK_SERVING_DAYS)

function prepareHistory(history: WeeklyPoint[]): WeeklyPoint[] {
  return history.filter((h) => h.servingDays == null || h.servingDays > 0).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

/** Rolling-origin one-step backtest over the last `holdoutWeeks`, against last week's (calendar-adjusted) volume. */
export function backtest(history: WeeklyPoint[], holdoutWeeks = 6): Backtest | null {
  const clean = prepareHistory(history)
  const k = Math.min(holdoutWeeks, clean.length - MIN_TRAINING_WEEKS)
  if (k < 2) return null
  const y = clean.map((h) => toFullWeek(h.qtyKg, h.servingDays))
  const errors: number[] = []
  const naiveErrors: number[] = []
  const pctErrors: number[] = []
  for (let i = clean.length - k; i < clean.length; i++) {
    const fit = fitSmoothing(y.slice(0, i))
    const predicted = fromFullWeek(Math.max(0, project(fit, 1)), clean[i].servingDays)
    const naive = fromFullWeek(y[i - 1], clean[i].servingDays)
    const actual = clean[i].qtyKg
    errors.push(Math.abs(actual - predicted))
    naiveErrors.push(Math.abs(actual - naive))
    if (actual > 0) pctErrors.push(Math.abs(actual - predicted) / actual)
  }
  const mae = errors.reduce((s, e) => s + e, 0) / errors.length
  const naiveMae = naiveErrors.reduce((s, e) => s + e, 0) / naiveErrors.length
  return {
    holdoutWeeks: k,
    maeKg: Math.round(mae * 10) / 10,
    mapePct: pctErrors.length ? Math.round((pctErrors.reduce((s, e) => s + e, 0) / pctErrors.length) * 1000) / 10 : null,
    naiveMaeKg: Math.round(naiveMae * 10) / 10,
    skillPct: naiveMae > 0 ? Math.round((1 - mae / naiveMae) * 100) : null,
  }
}

export function forecastWeeklyDemand(history: WeeklyPoint[], future: FutureWeek[]): SeriesForecast | null {
  const clean = prepareHistory(history)
  if (clean.length < MIN_HISTORY_WEEKS) return null
  const calendarAdjusted = clean.some((h) => h.servingDays != null && h.servingDays !== FULL_WEEK_SERVING_DAYS)
  const y = clean.map((h) => toFullWeek(h.qtyKg, h.servingDays))
  const fit = fitSmoothing(y)
  const residualSd = sampleSd(fit.residuals.slice(Math.min(WARMUP, fit.residuals.length - 1)))

  const points = future.map((week, i) => {
    const h = i + 1
    const base = Math.max(0, project(fit, h))
    const spread = Z_80 * residualSd * Math.sqrt(h)
    return {
      weekStart: week.weekStart,
      kg: Math.round(fromFullWeek(base, week.servingDays)),
      lowKg: Math.max(0, Math.round(fromFullWeek(base - spread, week.servingDays))),
      highKg: Math.round(fromFullWeek(base + spread, week.servingDays)),
      servingDays: week.servingDays ?? null,
    }
  })

  return {
    points,
    params: { alpha: fit.alpha, beta: fit.beta, phi: fit.phi },
    residualSdKg: Math.round(residualSd * 10) / 10,
    basisWeeks: clean.length,
    backtest: backtest(clean),
    method: `Damped-trend exponential smoothing (α=${fit.alpha}, β=${fit.beta}, φ=${fit.phi}) fitted on ${clean.length} weeks${calendarAdjusted ? ', volumes normalised to serving days' : ''}; 80% interval from one-step residuals`,
  }
}

/** Combine independent per-buyer forecasts: point forecasts add, interval half-widths add in quadrature. */
export function sumForecasts(forecasts: SeriesForecast[], weekStarts: string[]): ForecastPoint[] {
  return weekStarts.map((weekStart, i) => {
    let kg = 0
    let lowVar = 0
    let highVar = 0
    for (const f of forecasts) {
      const p = f.points[i]
      if (!p) continue
      kg += p.kg
      lowVar += (p.kg - p.lowKg) ** 2
      highVar += (p.highKg - p.kg) ** 2
    }
    return { weekStart, kg, lowKg: Math.max(0, Math.round(kg - Math.sqrt(lowVar))), highKg: Math.round(kg + Math.sqrt(highVar)), servingDays: null }
  })
}

export type SupplyWindow = { availableKg: number; start: string; end: string }

/**
 * Registered supply per forecast week. Perishable harvests are a flow: each
 * registry entry's uncommitted quantity is spread evenly over its harvest
 * window. Storable crops are a stock: the whole uncommitted quantity counts
 * in every week its window overlaps, and only once over the horizon.
 */
export function projectSupply(windows: SupplyWindow[], weekStarts: string[], mode: 'flow' | 'stock') {
  const weekly = weekStarts.map((start) => {
    const end = addDays(start, 6)
    let total = 0
    for (const w of windows) {
      if (w.availableKg <= 0 || w.end < start || w.start > end) continue
      if (mode === 'stock') {
        total += w.availableKg
        continue
      }
      const span = daysBetween(w.start, w.end) + 1
      const from = w.start > start ? w.start : start
      const to = w.end < end ? w.end : end
      total += (w.availableKg * (daysBetween(from, to) + 1)) / span
    }
    return Math.round(total)
  })
  const horizonStart = weekStarts[0]
  const horizonEnd = weekStarts.length ? addDays(weekStarts[weekStarts.length - 1], 6) : horizonStart
  const horizonKg =
    mode === 'flow'
      ? weekly.reduce((s, v) => s + v, 0)
      : Math.round(windows.filter((w) => w.availableKg > 0 && w.end >= horizonStart && w.start <= horizonEnd).reduce((s, w) => s + w.availableKg, 0))
  return { weekly, horizonKg }
}

export type Balance = { status: 'SHORTFALL' | 'SURPLUS' | 'BALANCED'; gapKg: number; coveragePct: number | null; message: string }

export function supplyBalance(demand: { kg: number; lowKg: number; highKg: number }, supplyKg: number): Balance {
  const coveragePct = demand.kg > 0 ? Math.round((supplyKg / demand.kg) * 100) : null
  if (supplyKg < demand.kg) {
    const gapKg = Math.round(demand.kg - supplyKg)
    return { status: 'SHORTFALL', gapKg, coveragePct, message: `Registered supply covers ${coveragePct ?? 0}% of expected demand. Enrol members or partner a neighbouring FPO for about ${gapKg} kg before buyers post orders.` }
  }
  if (supplyKg > demand.highKg) {
    const gapKg = Math.round(supplyKg - demand.highKg)
    return { status: 'SURPLUS', gapKg, coveragePct, message: `About ${gapKg} kg more is registered than even the high demand estimate. Line up household and society buyers or stagger harvests so it does not end in a distress sale at the mandi.` }
  }
  return { status: 'BALANCED', gapKg: 0, coveragePct, message: 'Registered supply sits within the expected demand range.' }
}
