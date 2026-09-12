'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users2, Calendar, MapPin, Phone, Building, Sparkles, X, CheckCircle2 } from 'lucide-react'

export interface CommunityDemandModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitCommunityDemand?: (data: {
    eventType: string
    title: string
    crop: string
    qtyKg: number
    deliveryDate: string
    contactName: string
    phone: string
    location: string
  }) => void
}

const EVENT_TYPES = [
  { id: 'MARRIAGE', label: 'Wedding / Reception Function', icon: Users2, defaultVolume: 250 },
  { id: 'TEMPLE', label: 'Temple Prasadam / Bhandara', icon: Building, defaultVolume: 350 },
  { id: 'SOCIETY', label: 'Apartment Society Bulk Group Buy', icon: Users2, defaultVolume: 400 },
  { id: 'EVENT', label: 'Community Festival / Gathering', icon: Sparkles, defaultVolume: 300 },
]

export function CommunityDemandModal({
  isOpen,
  onClose,
  onSubmitCommunityDemand,
}: CommunityDemandModalProps) {
  const [eventType, setEventType] = useState(EVENT_TYPES[0].id)
  const [title, setTitle] = useState('Patel Family Wedding Reception (500 Guests)')
  const [crop, setCrop] = useState('Tomato')
  const [qtyKg, setQtyKg] = useState('250')
  const [deliveryDate, setDeliveryDate] = useState('2025-10-24')
  const [contactName, setContactName] = useState('Kishorbhai Patel')
  const [phone, setPhone] = useState('+91 98250 88210')
  const [location, setLocation] = useState('Anand Town Hall & Banquet, Station Road')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      onSubmitCommunityDemand?.({
        eventType,
        title,
        crop,
        qtyKg: Number(qtyKg),
        deliveryDate,
        contactName,
        phone,
        location,
      })
      setSubmitted(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <Card className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto border-primary/30 p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start sm:items-center gap-2.5">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Users2 className="size-4 sm:size-5" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-primary">COMMUNITY DEMAND POOL</span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
              Post Bulk Event Produce Demand
            </h3>
          </div>
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          Open to marriages, religious functions, festival caterers, and residential welfare associations. Nearby smallholder farmers directly supply freshly harvested crops with zero retail markup.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1.5">Event Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EVENT_TYPES.map((ev) => {
                const isSelected = eventType === ev.id
                const Icon = ev.icon
                return (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => {
                      setEventType(ev.id)
                      setQtyKg(String(ev.defaultVolume))
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary/40'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{ev.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Event / Function Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Required Produce</label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              >
                <option value="Tomato">Tomato</option>
                <option value="Potato">Potato</option>
                <option value="Onion">Onion</option>
                <option value="Spinach">Spinach</option>
                <option value="Paddy (Rice)">Paddy (Rice)</option>
                <option value="Wheat">Wheat</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Target Volume (kg)</label>
              <input
                type="number"
                min="50"
                value={qtyKg}
                onChange={(e) => setQtyKg(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Organizer Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">Organizer Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Delivery Venue Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          {submitted ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 border border-emerald-500/30">
              <CheckCircle2 className="size-4" /> Community Demand posted! Regional farmers notified.
            </div>
          ) : (
            <div className="flex flex-col-reverse min-[380px]:flex-row items-stretch min-[380px]:items-center justify-end gap-2 sm:gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} size="sm" className="min-h-[40px]">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-2 min-h-[40px]">
                <Users2 className="size-4" /> Broadcast to Nearby Farmers
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  )
}
