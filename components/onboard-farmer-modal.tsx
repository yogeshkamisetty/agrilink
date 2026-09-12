'use client'

import { Users, X } from 'lucide-react'
import { Button } from './ui/button'

export function OnboardFarmerModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  phone,
  setPhone,
  village,
  setVillage,
  crop,
  setCrop,
  kg,
  setKg,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  name: string
  setName: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  village: string
  setVillage: (v: string) => void
  crop: string
  setCrop: (v: string) => void
  kg: string
  setKg: (v: string) => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Users className="size-6" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground">Onboard Farmer to Cluster</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Register smallholder producer into FPO digital roster</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Farmer Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Govindbhai Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Mobile Number</label>
              <input
                type="tel"
                required
                placeholder="+91 98251 XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Village</label>
              <input
                type="text"
                required
                placeholder="e.g. Boriavi"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Produce Capacity (kg)</label>
              <input
                type="number"
                min="50"
                required
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Registered Crops</label>
            <input
              type="text"
              required
              placeholder="e.g. Paddy / Tomato"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary leading-relaxed">
            ℹ️ Farmer will automatically be enrolled in Bhashini vernacular SMS, WhatsApp, and IVR voice broadcasts with zero app installation needed.
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Users className="size-4" /> Onboard Farmer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
