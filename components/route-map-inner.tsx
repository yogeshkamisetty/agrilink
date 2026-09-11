'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'

// Fix Leaflet default icon paths in Next.js
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const dropIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const depotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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

export default function RouteMapInner({ stops }: Props) {
  if (!stops || stops.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl bg-secondary/50 p-6 text-sm text-muted-foreground">
        No route coordinates available.
      </div>
    )
  }

  // Calculate center of stops
  const centerLat = stops.reduce((s, st) => s + st.lat, 0) / stops.length
  const centerLng = stops.reduce((s, st) => s + st.lng, 0) / stops.length
  const positions: [number, number][] = stops.map((st) => [st.lat, st.lng])

  return (
    <div className="h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer center={[centerLat, centerLng]} zoom={11} scrollWheelZoom={false} className="h-full min-h-[320px] w-full z-10">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline positions={positions} color="#16a34a" weight={4} opacity={0.8} dashArray="6, 8" />

        {stops.map((stop, idx) => {
          const icon = stop.kind === 'DROP' ? dropIcon : stop.kind === 'DEPOT' ? depotIcon : pickupIcon
          return (
            <Marker key={`${stop.id}-${idx}`} position={[stop.lat, stop.lng]} icon={icon}>
              <Popup>
                <div className="p-1">
                  <span className="font-sans text-xs font-semibold text-foreground">
                    #{idx + 1} {stop.label}
                  </span>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">{stop.detail}</p>
                  {stop.kg && <p className="mt-0.5 font-mono text-xs font-bold text-primary">{stop.kg} kg produce</p>}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
