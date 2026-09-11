/** Date helpers that work on calendar dates ('YYYY-MM-DD') in IST, the pilot's timezone. */

export const PILOT_TIMEZONE = 'Asia/Kolkata'

const DAY_MS = 86_400_000

export function isoDate(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: PILOT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS)
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay()
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const offset = (weekday(day) + 6) % 7
  return addDays(day, -offset)
}

/** First Monday strictly after `day`. */
export function nextMonday(day: string): string {
  const offset = ((8 - weekday(day)) % 7) || 7
  return addDays(day, offset)
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: PILOT_TIMEZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
