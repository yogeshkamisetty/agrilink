'use client'

import { useMemo, useState, useEffect } from 'react'
import { Search, Sprout, MapPin, CalendarDays, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'

interface CropItem {
  crop: string
  totalQuantity: number
  lots: number
  farmers: number
  villages: string[]
  grades: Record<string, number>
  harvestDates: string[]
}

interface AvailabilityResponse {
  crops: CropItem[]
  error?: string
}

const cropImages: Record<string, string> = {
  tomato: '/crops/tomato.png',
  wheat: '/crops/wheat.png',
  paddy: '/crops/paddy.png',
  rice: '/crops/paddy.png',
  onion: '/crops/onion.png',
  potato: '/crops/potato.png',
}

export function CropAvailability() {
  const [crop, setCrop] = useState('all')
  const [grade, setGrade] = useState('all')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const url = `/api/availability${
    crop !== 'all' || grade !== 'all'
      ? `?${new URLSearchParams({
          ...(crop !== 'all' ? { crop } : {}),
          ...(grade !== 'all' ? { grade } : {})
        })}`
      : ''
  }`

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    fetch(url)
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json.error || `Server responded with status ${response.status}`)
        }
        return json
      })
      .then((result) => {
        if (active) {
          if (Array.isArray(result.crops)) {
            setData(result)
          } else {
            throw new Error('Malformed supply registry response')
          }
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to connect to live supply registry.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [url, retryKey])

  const crops = useMemo(
    () =>
      (data?.crops ?? []).filter((item) =>
        `${item.crop} ${item.villages.join(' ')}`.toLowerCase().includes(search.toLowerCase())
      ),
    [data, search]
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d8cfbd] bg-[#fffdf8] shadow-sm">
      <div className="border-b border-[#e8dfcf] bg-[#f7f1e4] p-5 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
              <Sprout className="h-4 w-4" /> Live supply board
            </div>
            <h2 className="font-serif text-3xl text-[#173b2b]">Find available crops</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#5f675f]">
              Compare verified lots by crop, grade, village, harvest timing, and total available weight before placing a request.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className="h-10 rounded-md border border-[#d8cfbd] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">All crops</option>
              <option value="paddy">Paddy</option>
              <option value="wheat">Wheat</option>
              <option value="tomato">Tomato</option>
              <option value="onion">Onion</option>
              <option value="potato">Potato</option>
            </select>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="h-10 rounded-md border border-[#d8cfbd] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">All grades</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
            </select>
          </div>
        </div>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#778078]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search crop or village"
            className="h-10 w-full rounded-md border border-[#d8cfbd] bg-white pl-9 pr-3 text-sm outline-none ring-emerald-700 focus:ring-2"
          />
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-center justify-between text-sm text-[#68736c]">
          <span>
            {isLoading
              ? 'Loading supply…'
              : error
              ? 'Error loading supply'
              : `${crops.length} crop${crops.length === 1 ? '' : 's'} available`}
          </span>
          <span className="flex items-center gap-1 text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Verified farmer supply
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-8 text-center text-amber-900">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
            <h3 className="font-serif text-lg font-semibold text-[#173b2b]">Live supply data temporarily unavailable</h3>
            <p className="mt-1 text-sm text-amber-800 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" /> Retry loading supply
            </button>
          </div>
        ) : crops.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-[#d8cfbd] p-10 text-center text-sm text-[#68736c]">
            No verified crop lots match these filters.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {crops.map((item) => {
              const imageSrc = cropImages[item.crop.toLowerCase()]
              return (
                <article
                  key={item.crop}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e0d8c9] bg-white p-5 shadow-sm transition-all hover:border-emerald-700/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        {imageSrc ? (
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-[#ece4d6] bg-[#fcfbf7] p-1 flex items-center justify-center shadow-xs">
                            <img
                              src={imageSrc}
                              alt={item.crop}
                              className="size-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                            <Sprout className="size-7" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-serif text-2xl font-semibold text-[#173b2b]">{item.crop}</h3>
                          <p className="mt-0.5 text-xs text-[#68736c]">
                            {item.lots} verified lot{item.lots === 1 ? '' : 's'} · {item.farmers} farmer{item.farmers === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                        {item.totalQuantity.toLocaleString()} kg
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-[#f7f4ec] p-3">
                        <div className="text-xs text-[#748078]">Quality split</div>
                        <strong className="mt-1 block text-[#173b2b]">
                          {item.grades.A ?? 0} kg A · {item.grades.B ?? 0} kg B
                        </strong>
                      </div>
                      <div className="rounded-xl bg-[#f7f4ec] p-3">
                        <div className="text-xs text-[#748078]">Harvest window</div>
                        <strong className="mt-1 block text-[#173b2b]">
                          {item.harvestDates[0]
                            ? new Date(item.harvestDates[0]).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'To be confirmed'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#68736c] pt-2 border-t border-[#f4eee4]">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-800" /> {item.villages.join(', ') || 'Multiple villages'}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-emerald-800" /> Updated today
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
