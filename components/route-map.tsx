'use client'

import dynamic from 'next/dynamic'

type Stop = {
  id: string
  kind: 'DEPOT' | 'PICKUP' | 'DROP'
  label: string
  detail: string
  lat: number
  lng: number
  kg?: number
}

type Props = {
  stops: Stop[]
}

const RouteMapInner = dynamic(() => import('./route-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-2xl border border-border bg-secondary/40 text-sm font-medium text-muted-foreground animate-pulse">
      Loading interactive route map…
    </div>
  ),
})

export function RouteMap({ stops }: Props) {
  return <RouteMapInner stops={stops} />
}
