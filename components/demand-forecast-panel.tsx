'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Table2, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react'
import type { CropForecast, ForecastOverview } from '@/lib/server/forecasting'

type Balance = NonNullable<CropForecast['balance']>

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const kg = (value: number) => `${nf.format(Math.round(value))} kg`
const weekLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/** Status colours carry state only, always beside an icon and a label. */
const STATUS: Record<Balance['status'], { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  BALANCED: { label: 'Balanced', color: '#0ca30c', Icon: CheckCircle2 },
  SHORTFALL: { label: 'Shortfall', color: '#ec835a', Icon: TrendingDown },
  SURPLUS: { label: 'Glut risk', color: '#fab219', Icon: AlertTriangle },
}

function StatusBadge({ balance }: { balance: CropForecast['balance'] }) {
  if (!balance) return <span className="text-xs text-muted-foreground">No demand signal</span>
  const { label, color, Icon } = STATUS[balance.status]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />
      {label}
      {balance.gapKg > 0 && <span className="font-normal text-muted-foreground">· {kg(balance.gapKg)}</span>}
    </span>
  )
}

function niceCeil(value: number) {
  if (value <= 0) return 10
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const n = value / magnitude
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude
}

const PLOT_HEIGHT = 200

/** Grouped columns per week: expected demand (with its 80% range and booked orders) beside registered supply. One axis, two series. */
function WeeklyChart({ forecast }: { forecast: CropForecast }) {
  const [hover, setHover] = useState<number | null>(null)
  const top = niceCeil(Math.max(...forecast.weeks.flatMap((w) => [w.highKg, w.supplyKg, w.bookedKg, w.demandKg])))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  const pct = (value: number) => `${Math.min(100, (value / top) * 100)}%`

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-[#2a78d6] dark:bg-[#3987e5]" />Expected demand</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-[#eb6834] dark:bg-[#d95926]" />Registered supply</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-foreground/60" />80% demand range</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-foreground" />Already booked</span>
      </div>
      <div className="flex">
        <div className="relative w-14 shrink-0" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ bottom: pct(t) }}>
              {nf.format(t)}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <div className="relative border-b border-border" style={{ height: PLOT_HEIGHT }}>
            {ticks.slice(1).map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-border/70" style={{ bottom: pct(t) }} />
            ))}
            <div className="absolute inset-0 flex">
              {forecast.weeks.map((w, i) => (
                <div
                  key={w.weekStart}
                  tabIndex={0}
                  role="img"
                  aria-label={`Week of ${weekLabel(w.weekStart)}: expected demand ${kg(w.demandKg)} (range ${kg(w.lowKg)} to ${kg(w.highKg)}), booked ${kg(w.bookedKg)}, registered supply ${kg(w.supplyKg)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className={`relative flex flex-1 items-end justify-center gap-0.5 outline-none transition-colors ${hover === i ? 'bg-foreground/[0.04]' : ''}`}
                >
                  <div className="relative w-5 max-w-[24px]" style={{ height: pct(w.demandKg) }}>
                    <div className="absolute inset-0 rounded-t-[4px] bg-[#2a78d6] dark:bg-[#3987e5]" />
                    {w.bookedKg > 0 && <div className="absolute left-1/2 h-0.5 w-6 -translate-x-1/2 bg-foreground" style={{ bottom: `${(w.bookedKg / Math.max(w.demandKg, 1)) * 100}%` }} />}
                  </div>
                  <div className="w-5 max-w-[24px] rounded-t-[4px] bg-[#eb6834] dark:bg-[#d95926]" style={{ height: pct(w.supplyKg) }} />
                  {w.highKg > w.lowKg && (
                    <div className="pointer-events-none absolute w-0.5 bg-foreground/60" style={{ bottom: pct(w.lowKg), height: `calc(${pct(w.highKg)} - ${pct(w.lowKg)})`, left: 'calc(50% - 11px)' }} />
                  )}
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-20 mb-2 w-52 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg">
                      <p className="mb-1.5 text-muted-foreground">Week of {weekLabel(w.weekStart)}</p>
                      <p className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-0.5 w-3 bg-[#2a78d6] dark:bg-[#3987e5]" />Expected demand</span><strong className="text-foreground">{kg(w.demandKg)}</strong></p>
                      <p className="flex items-center justify-between gap-2"><span className="pl-[18px] text-muted-foreground">80% range</span><span className="text-foreground">{nf.format(w.lowKg)}–{nf.format(w.highKg)}</span></p>
                      <p className="flex items-center justify-between gap-2"><span className="pl-[18px] text-muted-foreground">Booked</span><span className="text-foreground">{kg(w.bookedKg)}</span></p>
                      <p className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-0.5 w-3 bg-[#eb6834] dark:bg-[#d95926]" />Registered supply</span><strong className="text-foreground">{kg(w.supplyKg)}</strong></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex pt-2">
            {forecast.weeks.map((w) => (
              <span key={w.weekStart} className="flex-1 text-center text-[11px] text-muted-foreground">
                {weekLabel(w.weekStart)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function WeeklyTable({ forecast }: { forecast: CropForecast }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-semibold">Week of</th>
            <th className="py-2 pr-3 text-right font-semibold">Forecast</th>
            <th className="py-2 pr-3 text-right font-semibold">80% range</th>
            <th className="py-2 pr-3 text-right font-semibold">Booked</th>
            <th className="py-2 pr-3 text-right font-semibold">Expected demand</th>
            <th className="py-2 text-right font-semibold">Registered supply</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border tabular-nums">
          {forecast.weeks.map((w) => (
            <tr key={w.weekStart}>
              <td className="py-2 pr-3 text-foreground">{weekLabel(w.weekStart)}</td>
              <td className="py-2 pr-3 text-right">{kg(w.forecastKg)}</td>
              <td className="py-2 pr-3 text-right text-muted-foreground">{nf.format(w.lowKg)}–{nf.format(w.highKg)}</td>
              <td className="py-2 pr-3 text-right">{kg(w.bookedKg)}</td>
              <td className="py-2 pr-3 text-right font-semibold text-foreground">{kg(w.demandKg)}</td>
              <td className="py-2 text-right">{kg(w.supplyKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DemandForecastPanel() {
  const [weeks, setWeeks] = useState(4)
  const [overview, setOverview] = useState<ForecastOverview | null>(null)
  const [crop, setCrop] = useState<string | null>(null)
  const [detail, setDetail] = useState<CropForecast | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forecast?weeks=${weeks}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Forecast unavailable')
      setOverview(json)
      setError(null)
      setCrop((current) => current ?? [...(json as ForecastOverview).crops].sort((a, b) => b.demandKg - a.demandKg)[0]?.crop ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Forecast unavailable')
    } finally {
      setLoading(false)
    }
  }, [weeks])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!crop) return
    let live = true
    fetch(`/api/forecast?crop=${crop}&weeks=${weeks}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Forecast unavailable')
        if (live) setDetail(json)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Forecast unavailable'))
    return () => {
      live = false
    }
  }, [crop, weeks])

  const crops = useMemo(() => [...(overview?.crops ?? [])].sort((a, b) => b.demandKg - a.demandKg), [overview])

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <TrendingUp className="size-4" /> Demand forecasting
          </p>
          <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">What buyers will need, against what members have registered</h3>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            A model per buyer on its weekly purchases, summed per crop. Use it to enrol members or line up buyers before a shortfall or a glut shows up at the mandi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="forecast-weeks">Horizon</label>
          <select id="forecast-weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold">
            {[4, 6, 8].map((w) => (
              <option key={w} value={w}>Next {w} weeks</option>
            ))}
          </select>
          <button onClick={load} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-foreground hover:bg-secondary/80">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}

      <div className={`overflow-x-auto transition-opacity ${loading && overview ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-2.5 pr-3 font-semibold">Crop</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Next week</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Next {overview?.horizonWeeks ?? weeks} weeks</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Registered supply</th>
              <th className="py-2.5 font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular-nums">
            {crops.map((c) => (
              <tr key={c.crop} onClick={() => setCrop(c.crop)} className={`cursor-pointer transition-colors ${crop === c.crop ? 'bg-primary/5' : 'hover:bg-secondary/40'}`}>
                <td className="py-2.5 pr-3 font-semibold text-foreground">
                  {c.cropName}
                  {c.status === 'INSUFFICIENT_HISTORY' && <span className="ml-2 text-[11px] font-normal text-muted-foreground">not enough history</span>}
                </td>
                <td className="py-2.5 pr-3 text-right">{kg(c.nextWeekKg)}</td>
                <td className="py-2.5 pr-3 text-right">
                  {kg(c.demandKg)} <span className="text-muted-foreground">({nf.format(c.lowKg)}–{nf.format(c.highKg)})</span>
                </td>
                <td className="py-2.5 pr-3 text-right">{kg(c.supplyKg)}</td>
                <td className="py-2.5"><StatusBadge balance={c.balance} /></td>
              </tr>
            ))}
            {!crops.length && !loading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">No crops with purchase history or registered harvests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="space-y-5 rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-serif text-xl font-bold text-foreground">{detail.cropName}</h4>
            <div className="inline-flex rounded-xl border border-border p-0.5 text-xs font-semibold">
              <button onClick={() => setView('chart')} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${view === 'chart' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}><BarChart3 className="size-3.5" />Chart</button>
              <button onClick={() => setView('table')} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${view === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}><Table2 className="size-3.5" />Table</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Expected demand</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{kg(detail.totals.demandKg)}</p>
              <p className="text-[11px] text-muted-foreground">80% range {nf.format(detail.totals.lowKg)}–{nf.format(detail.totals.highKg)} kg</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Already booked</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{kg(detail.totals.bookedKg)}</p>
              <p className="text-[11px] text-muted-foreground">orders delivering in these weeks</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Registered supply</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{kg(detail.totals.supplyKg)}</p>
              <p className="text-[11px] text-muted-foreground">{detail.supplyMode === 'flow' ? 'harvest spread across its window' : 'uncommitted stock'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Coverage</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{detail.balance?.coveragePct != null ? `${detail.balance.coveragePct}%` : '—'}</p>
              <StatusBadge balance={detail.balance} />
            </div>
          </div>

          {detail.balance && <p className="text-xs text-foreground">{detail.balance.message}</p>}

          {detail.status === 'INSUFFICIENT_HISTORY' ? (
            <p className="rounded-xl bg-secondary/60 p-4 text-xs text-muted-foreground">No buyer has at least eight weeks of {detail.cropName.toLowerCase()} purchases yet, so there is nothing to forecast from. Booked orders and registered supply still appear in the table.</p>
          ) : view === 'chart' ? (
            <WeeklyChart forecast={detail} />
          ) : (
            <WeeklyTable forecast={detail} />
          )}

          {detail.buyers.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Models behind this forecast</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Buyer</th>
                      <th className="py-2 pr-3 text-right font-semibold">Next week</th>
                      <th className="py-2 pr-3 text-right font-semibold">History</th>
                      <th className="py-2 pr-3 text-right font-semibold">Backtest error</th>
                      <th className="py-2 text-right font-semibold">vs last-week guess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    {detail.buyers.map((b) => (
                      <tr key={b.buyerId} title={b.method}>
                        <td className="py-2 pr-3 text-foreground">{b.buyerName}</td>
                        <td className="py-2 pr-3 text-right">{kg(b.nextWeekKg)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {b.basisWeeks} wk{b.syntheticWeeks > 0 ? ` (${b.syntheticWeeks} synthetic)` : ''}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {b.backtest ? `±${nf.format(b.backtest.maeKg)} kg${b.backtest.mapePct != null ? ` · ${b.backtest.mapePct}%` : ''}` : '—'}
                        </td>
                        <td className="py-2 text-right">{b.backtest?.skillPct != null ? `${b.backtest.skillPct > 0 ? '+' : ''}${b.backtest.skillPct}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {detail.method} Backtest: one-week-ahead error on the most recent weeks; the last column is how much smaller that error is than simply repeating last week.
                {detail.syntheticHistory && ' Pilot history is synthetic, so these accuracy figures describe the method, not real-world performance.'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
