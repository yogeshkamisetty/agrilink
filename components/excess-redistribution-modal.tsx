'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UtensilsCrossed, Store, HeartHandshake, Building2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react'

export interface ExcessRedistributionModalProps {
  isOpen: boolean
  onClose: () => void
  orderCode?: string
  crop?: string
  surplusKg?: number
  pricePerKg?: number
  onConfirmRedistribution?: (data: { destination: string; recipientName: string; qtyKg: number; discountedPrice: number }) => void
}

const REDISTRIBUTION_CHANNELS = [
  {
    id: 'HOSTEL',
    label: 'Student Hostels & PG Canteens',
    desc: 'Bulk preparation for 350+ hostel students. Immediate same-day consumption.',
    discount: 15,
    icon: Building2,
    defaultRecipient: 'Sardar Patel University Boys Hostel #3',
  },
  {
    id: 'KIRANA',
    label: 'Local Kirana & Vegetable Retailers',
    desc: 'Supplied directly to neighborhood grocers at fair wholesale margin.',
    discount: 10,
    icon: Store,
    defaultRecipient: 'Shree Krishna Veg Mart, Boriavi',
  },
  {
    id: 'COMMUNITY_KITCHEN',
    label: 'Community Kitchen / NGO Food Bank',
    desc: 'Redirected to charitable meal programs with zero post-harvest food waste.',
    discount: 25,
    icon: HeartHandshake,
    defaultRecipient: 'Anand Annapurna Community Kitchen Trust',
  },
  {
    id: 'RESTAURANT',
    label: 'Local Affordable Dining & Canteens',
    desc: 'High-turnover fresh dining venues requiring same-day farmgate harvest.',
    discount: 12,
    icon: UtensilsCrossed,
    defaultRecipient: 'Tulsi Kathiyawadi Dhaba, NH-48',
  },
]

export function ExcessRedistributionModal({
  isOpen,
  onClose,
  orderCode = 'AG-1001',
  crop = 'Tomato',
  surplusKg = 80,
  pricePerKg = 24,
  onConfirmRedistribution,
}: ExcessRedistributionModalProps) {
  const [selectedChannel, setSelectedChannel] = useState(REDISTRIBUTION_CHANNELS[0])
  const [qtyToRedistribute, setQtyToRedistribute] = useState(surplusKg)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const discountedPrice = Math.round(pricePerKg * (1 - selectedChannel.discount / 100))
  const totalValue = qtyToRedistribute * discountedPrice

  const handleConfirm = () => {
    setIsSuccess(true)
    setTimeout(() => {
      onConfirmRedistribution?.({
        destination: selectedChannel.id,
        recipientName: selectedChannel.defaultRecipient,
        qtyKg: qtyToRedistribute,
        discountedPrice,
      })
      setIsSuccess(false)
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
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Sparkles className="size-4 sm:size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-xs font-bold text-emerald-600">SDG 12.3 ZERO-WASTE</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Order {orderCode}
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
              Excess Crop Redistribution Engine
            </h3>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Primary buyer requirement fulfilled! Rather than returning or dumping surplus produce, AgriLink dynamically routes remaining harvest to vetted local consumers, student hostels, and neighborhood shops.
        </p>

        {/* Surplus Metric Card */}
        <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3 rounded-2xl border border-border bg-secondary/40 p-3 sm:p-3.5 text-center">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Surplus Crop</span>
            <p className="font-semibold text-sm text-foreground">{crop}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Available Volume</span>
            <p className="font-mono font-bold text-base text-primary">{surplusKg} kg</p>
          </div>
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Base Contract Rate</span>
            <p className="font-mono font-bold text-base text-foreground">₹{pricePerKg}/kg</p>
          </div>
        </div>

        {/* Redistribution Channel Picker */}
        <div className="mt-5 space-y-2.5">
          <label className="text-xs font-semibold text-foreground">
            Select Verified Local Redistribution Channel:
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {REDISTRIBUTION_CHANNELS.map((ch) => {
              const Icon = ch.icon
              const isSelected = selectedChannel.id === ch.id
              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-secondary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-semibold">{ch.label}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      -{ch.discount}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{ch.desc}</p>
                  <p className="mt-1.5 text-[10px] font-medium text-foreground truncate">
                    Assigned: {ch.defaultRecipient}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financial Summary & Dispatch */}
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-3.5 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Redistributed Rate:</span>
            <span className="ml-1 font-mono font-bold text-emerald-700">₹{discountedPrice}/kg</span>
            <span className="ml-2 text-[10px] text-muted-foreground">(Direct DBT to farmer)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Recovered:</span>
            <span className="ml-1 font-mono font-bold text-foreground text-sm">₹{totalValue.toLocaleString()}</span>
          </div>
        </div>

        {isSuccess ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 border border-emerald-500/30">
            <CheckCircle2 className="size-4" /> Surplus allocated successfully! Delivery waybill updated.
          </div>
        ) : (
          <div className="mt-5 flex flex-col-reverse min-[380px]:flex-row items-stretch min-[380px]:items-center justify-end gap-2 sm:gap-2.5">
            <Button variant="secondary" onClick={onClose} size="sm" className="min-h-[40px]">
              Cancel
            </Button>
            <Button onClick={handleConfirm} size="sm" className="gap-2 min-h-[40px]">
              <CheckCircle2 className="size-4" /> Confirm & Dispatch Surplus
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
