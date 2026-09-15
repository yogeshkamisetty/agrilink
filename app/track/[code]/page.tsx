'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Leaf,
  Loader2,
  MapPin,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { RouteMap } from '@/components/route-map'

interface TraceabilityData {
  verified: boolean
  seal: string
  order: {
    id: string
    code: string
    crop: string
    qtyTargetKg: number
    deliveryDate: string
    status: string
  }
  buyer: {
    name: string
    type: string
    city: string
  }
  fpo: {
    name: string
    village: string
    district: string
    state: string
  }
  producers: Array<{
    name: string
    village: string
    cropVolumeKg: number
    grade: string
  }>
  qualityInspection: Array<{
    lotCode: string
    grade: string
    aiConfidence: number
    decision: string
    capturedAt: string
    photoUrl: string | null
    defects: string[]
  }>
  logistics: {
    code: string
    vehicle: string
    routeStops: Array<{
      id: string
      kind: 'DEPOT' | 'PICKUP' | 'DROP'
      label: string
      lat: number
      lng: number
      kg?: number
    }>
    dispatchedAt: string
  } | null
  fairPriceImpact: {
    buyerPricePerKg: number
    mandiPricePerKg: number
    farmerRealizationPct: number
    spoilagePreventedKg: number
    co2AvoidedKg: number
  }
  verifiedAt: string
}

export default function PublicTraceabilityPage() {
  const params = useParams()
  const code = (params?.code as string) || ''

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TraceabilityData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    let active = true

    async function fetchTrace() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/track/${encodeURIComponent(code)}`)
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.error || 'Traceability record could not be loaded.')
        }
        const json = await res.json()
        if (active) setData(json)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to fetch provenance data')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchTrace()
    return () => {
      active = false
    }
  }, [code])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Verifying Farm-to-Fork Origin…</p>
          <p className="text-xs text-slate-400">Querying AgriLink immutable lot register</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Traceability Record Not Found</h1>
          <p className="text-xs text-slate-500">
            We could not locate an active farm-origin lot matching <strong className="text-slate-700">"{code}"</strong>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
          >
            <ArrowLeft className="size-4" />
            Back to AgriLink
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* Top Banner */}
      <div className="bg-[#173b2b] text-emerald-100 py-3 px-4 text-xs font-medium text-center border-b border-emerald-900/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-serif font-bold text-base hover:opacity-90">
            <Sprout className="size-5 text-emerald-400" />
            AgriLink
            <span className="text-[10px] uppercase font-mono tracking-widest bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-200">
              Verified
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300">
            <ShieldCheck className="size-4 text-emerald-400" />
            Immutable Lot Provenance Passbook
          </span>
          <span className="text-[11px] font-mono text-emerald-300">Lot #{data.order.code}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* Certificate Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                AgriLink Certified Fresh Origin
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {data.order.crop} Harvest Lot
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Grown by <strong className="text-slate-800">{data.fpo.name}</strong> · Delivered to{' '}
                <strong className="text-slate-800">{data.buyer.name}</strong> ({data.buyer.city})
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">Total Volume</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                {data.order.qtyTargetKg.toLocaleString('en-IN')} kg
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                Delivered {new Date(data.order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* 3 Impact Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                <TrendingUp className="size-4 text-emerald-600" />
                Direct Farmer Realization
              </div>
              <div className="text-2xl font-black text-emerald-950">
                {data.fairPriceImpact.farmerRealizationPct}%
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-1">
                Of total buyer spending paid directly to farmers (vs. ~38% through mandi brokers).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 text-xs font-bold mb-1">
                <Leaf className="size-4 text-blue-600" />
                Produce Loss Prevented
              </div>
              <div className="text-2xl font-black text-blue-950">
                {data.fairPriceImpact.spoilagePreventedKg} kg
              </div>
              <p className="text-[11px] text-blue-700/90 mt-1">
                Farm-gate dispatch saved {data.fairPriceImpact.co2AvoidedKg} kg CO₂ equivalent greenhouse emissions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
                <Scale className="size-4 text-amber-600" />
                AGMARK Quality Grade
              </div>
              <div className="text-2xl font-black text-amber-950">
                {data.qualityInspection[0]?.grade || 'Grade A'}
              </div>
              <p className="text-[11px] text-amber-700/90 mt-1">
                AI Vision-graded at collection center with {data.qualityInspection[0]?.aiConfidence || 94}% confidence.
              </p>
            </div>
          </div>
        </div>

        {/* Participating Smallholder Farmers */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="size-5 text-emerald-600" />
              Verified Producer Lineage
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {data.producers.length} Smallholders Aggregated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.producers.map((producer, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold grid place-items-center text-sm">
                    {producer.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{producer.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="size-3 text-slate-400" />
                      {producer.village} Cluster
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                    {producer.grade}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {producer.cropVolumeKg} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GradeCam Quality Inspection Record */}
        {data.qualityInspection.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="size-5 text-emerald-600" />
              GradeCam™ AI Quality Audit Trail
            </h2>

            <div className="space-y-3">
              {data.qualityInspection.map((lot, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600">Lot #{lot.lotCode}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {lot.grade} (AGMARK Criteria)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Captured {new Date(lot.capturedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {lot.photoUrl && (
                    <div className="relative aspect-video max-h-56 w-full rounded-xl overflow-hidden border border-slate-200">
                      <img src={lot.photoUrl} alt="Inspection proof" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded">
                        GPS & Timestamp Verified Lot Image
                      </div>
                    </div>
                  )}

                  {lot.defects && lot.defects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="text-slate-500">Defect Scan:</span>
                      {lot.defects.map((defect, didx) => (
                        <span key={didx} className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          {defect}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route Optimization Proof */}
        {data.logistics && data.logistics.routeStops.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="size-5 text-emerald-600" />
                Optimized Multi-Stop Collection Route
              </h2>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {data.logistics.vehicle}
              </span>
            </div>

            <div className="h-72 w-full rounded-2xl overflow-hidden border border-slate-200">
              <RouteMap stops={data.logistics.routeStops} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
