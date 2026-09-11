/** Indirection over the system clock so tests can drive the cascade timers. */
export const clock = {
  now: (): Date => new Date(),
}
