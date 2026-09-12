'use client'

import { Sprout, X } from 'lucide-react'
import { Button } from './ui/button'

export function DeclareHarvestModal({
  isOpen,
  onClose,
  onSubmit,
  crop,
  setCrop,
  qty,
  setQty,
  village,
  setVillage,
  windowDates,
  setWindowDates,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  crop: string
  setCrop: (v: string) => void
  qty: string
  setQty: (v: string) => void
  village: string
  setVillage: (v: string) => void
  windowDates: string
  setWindowDates: (v: string) => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-4 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Sprout className="size-5 sm:size-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Declare Harvest Produce</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Register upcoming yield for direct institutional buyers</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground">Crop Variety</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="PADDY">Paddy (Rice)</option>
              <option value="TOMATO">Tomato</option>
              <option value="WHEAT">Wheat</option>
              <option value="ONION">Onion</option>
              <option value="POTATO">Potato</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Expected Harvest (kg)</label>
              <input
                type="number"
                min="50"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Village / Hub</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Estimated Harvest Window</label>
            <input
              type="text"
              required
              value={windowDates}
              onChange={(e) => setWindowDates(e.target.value)}
              placeholder="e.g. 20–28 Oct 2025"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 leading-relaxed">
            ✓ <strong>AgriLink Farmgate Guarantee:</strong> 30% advance paid instantly upon loading into the FPO vehicle, with balance settled directly to your bank account via e-RUPI DBT upon weighment clearance.
          </div>

          <div className="flex flex-col-reverse min-[380px]:flex-row items-stretch min-[380px]:items-center justify-end gap-2 sm:gap-2.5 pt-3 border-t border-border">
            <Button variant="secondary" type="button" onClick={onClose} className="min-h-[40px]">
              Cancel
            </Button>
            <Button type="submit" className="min-h-[40px] gap-2">
              <Sprout className="size-4" /> Declare Harvest
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
