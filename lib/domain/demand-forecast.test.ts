import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { backtest, forecastWeeklyDemand, MIN_HISTORY_WEEKS, projectSupply, sumForecasts, supplyBalance, type SeriesForecast, type WeeklyPoint } from './demand-forecast'

const START = '2026-03-02'
const weeks = (n: number, from = START) => Array.from({ length: n }, (_, i) => addDays(from, 7 * i))
/** The weeks straight after an n-week history. */
const after = (n: number, horizon: number, servingDays: number | null = null) => weeks(horizon, addDays(START, 7 * n)).map((weekStart) => ({ weekStart, servingDays }))

describe('weekly demand forecast', () => {
  it('follows a steady trend and beats the naive last-week baseline', () => {
    const history: WeeklyPoint[] = weeks(20).map((weekStart, t) => ({ weekStart, qtyKg: 100 + 10 * t }))
    const forecast = forecastWeeklyDemand(history, after(20, 4))!
    expect(forecast.points[0].kg).toBeGreaterThanOrEqual(290)
    expect(forecast.points[0].kg).toBeLessThanOrEqual(310)
    expect(forecast.points[3].kg).toBeGreaterThanOrEqual(315)
    expect(forecast.points[3].kg).toBeLessThanOrEqual(340)
    expect(forecast.backtest!.skillPct!).toBeGreaterThan(50)
  })

  it('stays near the level of a flat, noisy series, with an interval around it', () => {
    const noise = [15, -10, 5, -20, 12, -8, 18, -5, 3, -15, 9, -12]
    const history = weeks(noise.length).map((weekStart, i) => ({ weekStart, qtyKg: 500 + noise[i] }))
    const [next] = forecastWeeklyDemand(history, after(noise.length, 1))!.points
    expect(next.kg).toBeGreaterThan(470)
    expect(next.kg).toBeLessThan(530)
    expect(next.lowKg).toBeLessThan(next.kg)
    expect(next.highKg).toBeGreaterThan(next.kg)
  })

  it('normalises school holidays out of the history and back into the forecast week', () => {
    const history = weeks(12).map((weekStart, i) => (i === 4 || i === 8 ? { weekStart, qtyKg: 300, servingDays: 3 } : { weekStart, qtyKg: 600, servingDays: 6 }))
    const [full, holidayWeek] = weeks(2, addDays(START, 7 * 12))
    const forecast = forecastWeeklyDemand(history, [{ weekStart: full, servingDays: 6 }, { weekStart: holidayWeek, servingDays: 3 }])!
    expect(forecast.points[0].kg).toBe(600)
    expect(forecast.points[1].kg).toBe(300)
    expect(forecast.method).toMatch(/serving days/)
  })

  it('declines to forecast from fewer than eight weeks', () => {
    const history = weeks(MIN_HISTORY_WEEKS - 1).map((weekStart) => ({ weekStart, qtyKg: 100 }))
    expect(forecastWeeklyDemand(history, after(MIN_HISTORY_WEEKS - 1, 2))).toBeNull()
    expect(backtest(history)).toBeNull()
  })

  it('adds buyer forecasts, combining their intervals in quadrature', () => {
    const one: SeriesForecast = { points: [{ weekStart: START, kg: 100, lowKg: 70, highKg: 130, servingDays: null }], params: { alpha: 0.5, beta: 0, phi: 0.9 }, residualSdKg: 23, basisWeeks: 10, backtest: null, method: '' }
    expect(sumForecasts([one, one], [START])).toEqual([{ weekStart: START, kg: 200, lowKg: 158, highKg: 242, servingDays: null }])
  })
})

describe('registered supply against demand', () => {
  const windows = [{ availableKg: 1400, start: '2026-09-14', end: '2026-09-27' }]
  const horizon = ['2026-09-14', '2026-09-21', '2026-09-28']

  it('spreads a perishable harvest across its window', () => {
    expect(projectSupply(windows, horizon, 'flow')).toEqual({ weekly: [700, 700, 0], horizonKg: 1400 })
  })

  it('counts a storable harvest as stock, once over the horizon', () => {
    expect(projectSupply(windows, horizon, 'stock')).toEqual({ weekly: [1400, 1400, 0], horizonKg: 1400 })
  })

  it('flags shortfalls and gluts, with the size of the gap', () => {
    const demand = { kg: 1000, lowKg: 800, highKg: 1200 }
    expect(supplyBalance(demand, 600)).toMatchObject({ status: 'SHORTFALL', gapKg: 400, coveragePct: 60 })
    expect(supplyBalance(demand, 1500)).toMatchObject({ status: 'SURPLUS', gapKg: 300 })
    expect(supplyBalance(demand, 1100)).toMatchObject({ status: 'BALANCED', gapKg: 0 })
  })
})
