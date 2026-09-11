'use client'

import { useCallback, useEffect, useState } from 'react'

export type OverviewData = {
  orders: Array<{
    order: {
      id: string
      code: string
      crop: string
      qtyTargetKg: number
      pricePerKg: number
      deliveryDate: string
      status: string
      buyerId: string
      fpoId: string
      advancePct: number
      created_at?: string
    }
    buyer: {
      id: string
      name: string
      type: string
      location: string
    }
    totals: {
      capKg: number
      primaryKg: number
      standbyKg: number
      acceptedKg: number
    }
  }>
  metrics: {
    pilotVolumePct: number
    activeOrdersCount: number
    totalVolumeKg: number
  }
}

export function useAgriLink() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeOrderIndex, setActiveOrderIndex] = useState(0)

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/overview')
      if (!res.ok) throw new Error('Failed to fetch overview data')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const activeItem = data?.orders[activeOrderIndex] ?? data?.orders[0] ?? null

  const notifyOrder = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulateReplies: true }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to notify farmers')
    }
    await fetchOverview()
    return res.json()
  }

  const createOrder = async (orderData: { buyerId?: string; crop: string; qtyTargetKg: number; pricePerKg: number; deliveryDate: string }) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create order')
    }
    await fetchOverview()
    return res.json()
  }

  const gradeLot = async (orderId: string, farmerId: string, photoDataUrl: string) => {
    const res = await fetch(`/api/orders/${orderId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId, photoDataUrl }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to grade lot')
    }
    return res.json()
  }

  const collectLot = async (orderId: string, lotData: { farmerId: string; attemptId?: string; weighedKg: number; decision: string; grade?: string; reason?: string }) => {
    const res = await fetch(`/api/orders/${orderId}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lotData),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to collect lot')
    }
    await fetchOverview()
    return res.json()
  }

  const dispatchOrder = async (orderId: string, vehicleCost: number, vehicleLabel?: string) => {
    const res = await fetch(`/api/orders/${orderId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleCost, vehicleLabel }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to dispatch order')
    }
    await fetchOverview()
    return res.json()
  }

  const deliverOrder = async (orderId: string, buyerId: string, rejections?: Array<{ lotId: string; reason: string }>) => {
    const res = await fetch(`/api/orders/${orderId}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerId, rejections }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to confirm delivery')
    }
    await fetchOverview()
    return res.json()
  }

  const resetData = async () => {
    const res = await fetch('/api/seed/reset', { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to reset seed data')
    }
    await fetchOverview()
  }

  return {
    data,
    loading,
    error,
    activeItem,
    activeOrderIndex,
    setActiveOrderIndex,
    refresh: fetchOverview,
    notifyOrder,
    createOrder,
    gradeLot,
    collectLot,
    dispatchOrder,
    deliverOrder,
    resetData,
  }
}
