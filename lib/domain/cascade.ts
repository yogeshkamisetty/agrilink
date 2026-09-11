export type Channel = 'SMS' | 'WHATSAPP' | 'IVR' | 'COORDINATOR'

/**
 * Four-tier notification cascade. SMS and WhatsApp fire together; farmers who
 * have not replied get an IVR voice call after 6 hours, and anyone still
 * silent lands on the coordinator's call list at 12 hours.
 */
export const CASCADE_TIERS: ReadonlyArray<{ tier: number; channel: Channel; offsetHours: number; label: string }> = [
  { tier: 1, channel: 'SMS', offsetHours: 0, label: 'SMS' },
  { tier: 1, channel: 'WHATSAPP', offsetHours: 0, label: 'WhatsApp' },
  { tier: 2, channel: 'IVR', offsetHours: 6, label: 'IVR voice call' },
  { tier: 3, channel: 'COORDINATOR', offsetHours: 12, label: 'Coordinator call list' },
]

/**
 * Real seconds per cascade "hour". 3600 in production; the demo compresses
 * the 12-hour cascade into 12 seconds. Captured on the order when the cascade
 * starts so a config change never re-times a running cascade.
 */
export function cascadeSecondsPerHour(): number {
  const configured = Number(process.env.CASCADE_SECONDS_PER_HOUR)
  return Number.isFinite(configured) && configured > 0 ? configured : 1
}

export function elapsedCascadeHours(notifiedAt: string, now: Date, secondsPerHour: number): number {
  return Math.max(0, (now.getTime() - new Date(notifiedAt).getTime()) / 1000 / secondsPerHour)
}

export function tierDueAt(notifiedAt: string, offsetHours: number, secondsPerHour: number): string {
  return new Date(new Date(notifiedAt).getTime() + offsetHours * secondsPerHour * 1000).toISOString()
}

/** Channels whose escalation time has arrived. */
export function dueChannels(elapsedHours: number): Channel[] {
  return CASCADE_TIERS.filter((t) => elapsedHours >= t.offsetHours).map((t) => t.channel)
}

export function tierOf(channel: Channel): number {
  return CASCADE_TIERS.find((t) => t.channel === channel)!.tier
}
