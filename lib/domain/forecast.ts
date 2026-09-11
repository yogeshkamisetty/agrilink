import { addDays, weekStart } from './dates'

export type HistoryWeek = { weekStart: string; schoolDays: number; qtyKg: number }
export type CalendarDay = { day: string; kind: 'HOLIDAY' | 'EXAM'; label: string }

/** Kitchens serve Monday–Saturday. */
export const SERVING_DAYS_PER_WEEK = 6
/** Attendance on exam days, relative to a normal school day. */
export const EXAM_DAY_FACTOR = 0.85
const BASIS_WEEKS = 8

export type Forecast = {
  forecastKg: number
  kgPerSchoolDay: number
  schoolDays: number
  examDays: number
  holidays: string[]
  basisWeeks: number
  weekStart: string
  method: string
}

export function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Serving days and exam days in the Mon–Sat week containing `day`, from the academic calendar. */
export function schoolWeek(day: string, calendar: CalendarDay[]) {
  const start = weekStart(day)
  const days = Array.from({ length: SERVING_DAYS_PER_WEEK }, (_, i) => addDays(start, i))
  const byDay = new Map(calendar.map((c) => [c.day, c]))
  const holidays = days.filter((d) => byDay.get(d)?.kind === 'HOLIDAY')
  const examDays = days.filter((d) => byDay.get(d)?.kind === 'EXAM').length
  return { weekStart: start, schoolDays: days.length - holidays.length, examDays, holidays: holidays.map((d) => `${d} · ${byDay.get(d)!.label}`) }
}

/**
 * Consumption per school day (median of recent full weeks) × the school
 * days in the delivery week, discounted for exam days. Deliberately simple:
 * on synthetic history an accuracy figure would be meaningless, so none is
 * quoted — the method and its inputs are what is real.
 */
export function forecastWeek(history: HistoryWeek[], deliveryDate: string, calendar: CalendarDay[]): Forecast | null {
  const basis = history
    .filter((h) => h.weekStart < weekStart(deliveryDate) && h.schoolDays >= 4)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, BASIS_WEEKS)
  if (basis.length < 3) return null
  const kgPerSchoolDay = median(basis.map((h) => h.qtyKg / h.schoolDays))
  const week = schoolWeek(deliveryDate, calendar)
  const effectiveDays = week.schoolDays - week.examDays * (1 - EXAM_DAY_FACTOR)
  return {
    forecastKg: Math.round((kgPerSchoolDay * effectiveDays) / 10) * 10,
    kgPerSchoolDay: Math.round(kgPerSchoolDay * 10) / 10,
    schoolDays: week.schoolDays,
    examDays: week.examDays,
    holidays: week.holidays,
    basisWeeks: basis.length,
    weekStart: week.weekStart,
    method: `median kg per school day over the last ${basis.length} full weeks × school days in the delivery week (exam days at ${Math.round(EXAM_DAY_FACTOR * 100)}% attendance)`,
  }
}
