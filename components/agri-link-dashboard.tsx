'use client'

import Link from 'next/link'
import { useAgriLink } from '@/lib/hooks/use-agrilink'
import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, Bell, Boxes, Camera, Check, CheckCircle2, CheckCheck, ChevronDown, ChevronRight,
  CircleDollarSign, ClipboardList, Clock, Cloud, Download, Droplets, Globe, LayoutDashboard, Leaf, Layers, LogOut, MapPin, Menu, MessageSquare, Mic, PackageCheck,
  Pencil, Phone, PhoneCall, Plus, Printer, Receipt, Recycle, RefreshCw, Route, Send, ShieldCheck, Smartphone, Sparkles, Sprout, Star, Truck, Users, UtensilsCrossed, Volume2, Wallet, Wheat, X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { GradeCamCamera } from './gradecam-camera'
import { RouteMap } from './route-map'
import { Language, getT, TranslationDictionary } from '@/lib/i18n'
import { PrintableReceiptModal, DocumentType } from './printable-receipt-modal'
import { TeamManagementModal } from './team-management-modal'
import { DeclareHarvestModal } from './declare-harvest-modal'
import { OnboardFarmerModal } from './onboard-farmer-modal'
import { SmartAggregationCard } from './aggregation-engine-card'
import { ExcessRedistributionModal } from './excess-redistribution-modal'
import { CommunityDemandModal } from './community-demand-modal'
import { VoiceAssistantModal } from './voice-assistant-modal'
import { FarmerDashboardView } from './farmer-dashboard-view'
import { BolnaCallModal } from './bolna-call-modal'
import { getAuthClient } from '@/lib/auth-client'

type Role = 'Coordinator' | 'Buyer' | 'Farmer'
type Screen = 'Overview' | 'Orders' | 'Farmer network' | 'Collection & grade' | 'Routes' | 'Settlements'

const navItems: Array<{ label: Screen; key: keyof TranslationDictionary; icon: any; count?: string }> = [
  { label: 'Overview', key: 'navOverview', icon: LayoutDashboard },
  { label: 'Orders', key: 'navOrders', icon: ClipboardList, count: '03' },
  { label: 'Farmer network', key: 'navFarmerNetwork', icon: Users },
  { label: 'Collection & grade', key: 'navCollectionGrade', icon: Camera },
  { label: 'Routes', key: 'navRoutes', icon: Route },
  { label: 'Settlements', key: 'navSettlements', icon: CircleDollarSign },
]
const channels = ['SMS', 'WhatsApp', 'IVR voice', 'Coordinator list']

const cropImages: Record<string, string> = {
  paddy: '/crops/paddy.png',
  rice: '/crops/paddy.png',
  tomato: '/crops/tomato.png',
  wheat: '/crops/wheat.png',
  onion: '/crops/onion.png',
  potato: '/crops/potato.png',
}

interface AppNotification {
  id: string
  title: string
  detail: string
  time: string
  type: 'order' | 'finance' | 'logistics' | 'system'
  unread: boolean
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Farmer commitment received',
    detail: 'Ramesh Kumar accepted 500 kg Paddy commitment for Order #AG-1001 via WhatsApp cascade.',
    time: '4m ago',
    type: 'order',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'UPI escrow advance funded',
    detail: 'Advance deposit of ₹4,200 locked in escrow for Kheda FPO collection runway.',
    time: '18m ago',
    type: 'finance',
    unread: true,
  },
  {
    id: 'notif-3',
    title: 'Optimized dispatch route ready',
    detail: 'Tata Ace (GJ-07-TY-4912) assigned. Estimated collection runway: 18.4 km across 2 stops.',
    time: '45m ago',
    type: 'logistics',
    unread: true,
  },
  {
    id: 'notif-4',
    title: 'AGMARKNET price bulletin',
    detail: 'Dahod district modal price updated to ₹24.50/kg for Grade A Paddy. Contract margin is +27.2%.',
    time: '2h ago',
    type: 'system',
    unread: false,
  },
]

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '')
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function NotificationPopover({
  notifications,
  filter,
  setFilter,
  onClose,
  onMarkAllRead,
  onSimulate,
  onDismiss,
}: {
  notifications: AppNotification[]
  filter: string
  setFilter: (f: 'all' | 'order' | 'finance' | 'logistics') => void
  onClose: () => void
  onMarkAllRead: () => void
  onSimulate: () => void
  onDismiss: (id: string) => void
}) {
  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter)
  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className="absolute right-0 top-12 z-50 w-[330px] sm:w-[390px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-left">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-foreground">Activity & Event Bus</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 text-xs bg-background/50">
        {(['all', 'order', 'finance', 'logistics'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-lg px-2.5 py-1 text-[11px] capitalize font-medium transition-colors ${
              filter === cat
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="max-h-[320px] overflow-y-auto divide-y divide-border/60">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No events in this category
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative flex items-start gap-3 p-3.5 transition-colors hover:bg-secondary/40 ${
                item.unread ? 'bg-primary/[0.04]' : ''
              }`}
            >
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                  item.type === 'order'
                    ? 'bg-primary/10 text-primary'
                    : item.type === 'finance'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    : item.type === 'logistics'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.type === 'order' ? (
                  <PackageCheck className="size-4" />
                ) : item.type === 'finance' ? (
                  <Banknote className="size-4" />
                ) : item.type === 'logistics' ? (
                  <Truck className="size-4" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-xs text-foreground truncate">{item.title}</p>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.detail}</p>
              </div>
              <button
                onClick={() => onDismiss(item.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-foreground text-muted-foreground transition-opacity"
                title="Dismiss"
              >
                <X className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-2.5 bg-secondary/20 flex items-center justify-between">
        <button
          onClick={onSimulate}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="size-3.5" /> Simulate live webhook event
        </button>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Live Stream
        </span>
      </div>
    </div>
  )
}

function Badge({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'live' | 'cached' | 'muted' | 'good' | 'warn' }) {
  const styles = {
    live: 'bg-primary/10 text-primary',
    cached: 'bg-accent/15 text-accent-foreground',
    muted: 'bg-secondary text-muted-foreground',
    good: 'bg-primary/10 text-primary',
    warn: 'bg-accent/15 text-accent-foreground',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${styles[tone]}`}>
      <span className={`size-1.5 rounded-full ${tone === 'live' || tone === 'good' ? 'bg-primary' : tone === 'warn' || tone === 'cached' ? 'bg-accent' : 'bg-muted-foreground'}`} />
      {children}
    </span>
  )
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-card ${className}`}>{children}</section>
}
function Button({ children, onClick, variant = 'primary', disabled = false, className = '', title }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; className?: string; title?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : variant === 'secondary'
          ? 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
          : 'text-primary hover:bg-secondary'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function AgriLinkDashboard({
  onSignOut,
  verified = true,
  userName,
  userRole,
}: {
  onSignOut?: () => void
  verified?: boolean
  userName?: string | null
  userRole?: Role | null
} = {}) {
  const {
    data,
    loading,
    error,
    activeItem,
    refresh,
    notifyOrder,
    createOrder,
    gradeLot,
    collectLot,
    dispatchOrder,
    deliverOrder,
    resetData,
  } = useAgriLink()

  const [currentUserName, setCurrentUserName] = useState<string | null>(() => {
    if (userName) return userName
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('agrilink_user_name')
      } catch {
        return null
      }
    }
    return null
  })

  const [role, setRole] = useState<Role>(() => {
    if (userRole) return userRole
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agrilink_user_role')
        if (saved === 'Farmer' || saved === 'Buyer' || saved === 'Coordinator') return saved
      } catch {}
    }
    return 'Coordinator'
  })

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (userName) {
      setCurrentUserName(userName)
      try { localStorage.setItem('agrilink_user_name', userName) } catch {}
    }
    if (userRole) {
      setRole(userRole)
      try { localStorage.setItem('agrilink_user_role', userRole) } catch {}
    }
  }, [userName, userRole])

  // Also query profile from session if user name is not yet set
  useEffect(() => {
    if (currentUserName) return
    try {
      const auth = getAuthClient()
      auth.auth.getSession().then(({ data }) => {
        if (data.session) {
          fetch('/api/account/profile', {
            headers: { Authorization: 'Bearer ' + data.session.access_token },
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.profile?.full_name) {
                setCurrentUserName(res.profile.full_name)
                try {
                  localStorage.setItem('agrilink_user_name', res.profile.full_name)
                  if (res.profile.role) {
                    const mapped = res.profile.role === 'farmer' ? 'Farmer' : res.profile.role === 'buyer' ? 'Buyer' : 'Coordinator'
                    setRole(mapped)
                    localStorage.setItem('agrilink_user_role', mapped)
                  }
                } catch {}
              }
            })
            .catch(() => {})
        }
      }).catch(() => {})
    } catch {}
  }, [currentUserName])

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setCurrentUserName(trimmed)
    try {
      localStorage.setItem('agrilink_user_name', trimmed)
    } catch {}
    setEditingName(false)
    setActionMessage(`Display name updated to "${trimmed}"`)

    // Persist to user profile if session exists
    try {
      const auth = getAuthClient()
      auth.auth.getSession().then(({ data }) => {
        if (data.session) {
          fetch('/api/account/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + data.session.access_token,
            },
            body: JSON.stringify({
              full_name: trimmed,
              role: role.toLowerCase(),
            }),
          }).catch(() => {})
        }
      }).catch(() => {})
    } catch {}
  }

  const [activeNav, setActiveNav] = useState<Screen>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Form states
  const [postedCrop, setPostedCrop] = useState('PADDY')
  const [postedQty, setPostedQty] = useState('1000')
  const [postedPrice, setPostedPrice] = useState('28')

  // Grading & Collection states
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ status: string; grade: string; confidence: number; reasoning: string } | null>(null)
  const [selectedFarmerId, setSelectedFarmerId] = useState('f0000000-0000-0000-0000-000000000001')
  const [weighedKg, setWeighedKg] = useState('500')

  // Enterprise modules state
  const [lang, setLang] = useState<Language>('en')
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [printableModalOpen, setPrintableModalOpen] = useState(false)
  const [printableDocType, setPrintableDocType] = useState<DocumentType>('receipt')

  const t = getT(lang)

  // Farmer specific states
  const [showHarvestModal, setShowHarvestModal] = useState(false)
  const [harvestCrop, setHarvestCrop] = useState('PADDY')
  const [harvestQty, setHarvestQty] = useState('600')
  const [harvestVillage, setHarvestVillage] = useState('Kheda')
  const [harvestWindow, setHarvestWindow] = useState('20–25 Oct 2025')
  const [farmerCommittedLocalKg, setFarmerCommittedLocalKg] = useState(500)
  const [farmerOfferAccepted, setFarmerOfferAccepted] = useState(false)
  const [farmerCollectionTab, setFarmerCollectionTab] = useState<'slip' | 'camera'>('slip')

  // Coordinator specific states
  const [showOnboardFarmerModal, setShowOnboardFarmerModal] = useState(false)
  const [newFarmerName, setNewFarmerName] = useState('')
  const [newFarmerPhone, setNewFarmerPhone] = useState('')
  const [newFarmerVillage, setNewFarmerVillage] = useState('Boriavi')
  const [newFarmerCrop, setNewFarmerCrop] = useState('Paddy / Tomato')
  const [newFarmerKg, setNewFarmerKg] = useState('650')
  const [rosterFarmers, setRosterFarmers] = useState([
    { id: 'FARM-001', name: 'Ramesh Kumar', village: 'Kheda', crop: 'Paddy / Tomato', kg: 500, status: 'Accepted', reliability: 94, color: 'bg-primary' },
    { id: 'FARM-002', name: 'Savitri Devi', village: 'Borsad', crop: 'Paddy / Wheat', kg: 700, status: 'Accepted', reliability: 98, color: 'bg-amber-700' },
    { id: 'FARM-003', name: 'Mohan Lal', village: 'Vasad', crop: 'Paddy', kg: 800, status: 'Accepted', reliability: 91, color: 'bg-sky-700' },
    { id: 'FARM-004', name: 'Lakshmi Bai', village: 'Kheda', crop: 'Paddy / Onion', kg: 300, status: 'Standby', reliability: 89, color: 'bg-stone-500' },
  ])

  // SIH Feature Modals (Voice Assistant, Excess Redistribution, Community Demand Pool)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [showExcessModal, setShowExcessModal] = useState(false)
  const [showCommunityModal, setShowCommunityModal] = useState(false)

  // Bolna AI Calling Agent Confirmation States
  const [bolnaModalOpen, setBolnaModalOpen] = useState(false)
  const [callingFarmer, setCallingFarmer] = useState<{
    id?: string
    name: string
    mobile_number?: string
    village?: string
    crop?: string
    crop_name?: string
  } | null>(null)
  const [callingAllocatedKg, setCallingAllocatedKg] = useState<number>(500)

  // Live sync rosterFarmers with /api/farmers
  useEffect(() => {
    let mounted = true
    const fetchFarmers = async () => {
      try {
        const res = await fetch('/api/farmers')
        if (res.ok) {
          const data = await res.json()
          if (data.farmers && Array.isArray(data.farmers) && data.farmers.length > 0 && mounted) {
            const mapped = data.farmers.map((f: any, idx: number) => ({
              id: f.id || `FARM-${String(idx + 1).padStart(3, '0')}`,
              name: f.name || 'Farmer Member',
              village: f.village || 'Kheda',
              crop: f.crop_name || f.crop || 'Paddy / Tomato',
              kg: Number(f.quantity || 500),
              status: f.verified ? 'Accepted' : 'Standby',
              reliability: 90 + (idx % 9),
              color: idx % 3 === 0 ? 'bg-primary' : idx % 3 === 1 ? 'bg-amber-700' : 'bg-sky-700',
            }))
            setRosterFarmers((prev) => {
              const map = new Map<string, any>()
              for (const m of mapped) map.set(m.id || m.name, m)
              for (const p of prev) {
                if (!map.has(p.id) && !map.has(p.name)) map.set(p.id, p)
              }
              return Array.from(map.values())
            })
          }
        }
      } catch {}
    }

    fetchFarmers()
    const timer = setInterval(fetchFarmers, 4000)
    const onHarvest = () => fetchFarmers()
    window.addEventListener('agrilink:harvest-updated', onHarvest)

    return () => {
      mounted = false
      clearInterval(timer)
      window.removeEventListener('agrilink:harvest-updated', onHarvest)
    }
  }, [])

  // Listen to open-order events from Crop Availability board
  useEffect(() => {
    const handleOpenOrder = (e: Event) => {
      const custom = e as CustomEvent<{ crop?: string; qty?: number; price?: number }>
      if (custom.detail?.crop) {
        setPostedCrop(custom.detail.crop.toUpperCase())
      }
      if (custom.detail?.qty) {
        setPostedQty(String(custom.detail.qty))
      }
      if (custom.detail?.price) {
        setPostedPrice(String(custom.detail.price))
      }
      setShowOrderForm(true)
      setActiveNav('Orders')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('agrilink:open-order', handleOpenOrder)
    return () => window.removeEventListener('agrilink:open-order', handleOpenOrder)
  }, [])

  // Notification states
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState<'all' | 'order' | 'finance' | 'logistics'>('all')

  const unreadNotifs = notifications.filter((n) => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleDismissNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleSimulateEvent = () => {
    const events: Omit<AppNotification, 'id' | 'time' | 'unread'>[] = [
      {
        title: 'WhatsApp harvest confirmation',
        detail: 'Savitri Devi confirmed Borsad pickup: 700 kg Paddy harvested and bagged.',
        type: 'order',
      },
      {
        title: 'UPI Escrow reserve funded',
        detail: 'Institutional buyer deposit of ₹5,600 credited to AgriLink escrow pool.',
        type: 'finance',
      },
      {
        title: 'Driver GPS check-in',
        detail: 'Tata Ace (GJ-07-TY-4912) reached Kheda Depot. Loading sequence 1 commenced.',
        type: 'logistics',
      },
      {
        title: 'AGMARKNET price refresh',
        detail: 'Anand APMC mandi rate updated: ₹23.80/kg. Contract margin protected.',
        type: 'system',
      },
    ]
    const chosen = events[Math.floor(Math.random() * events.length)]
    const newNotif: AppNotification = {
      ...chosen,
      id: `sim-${Date.now()}`,
      time: 'Just now',
      unread: true,
    }
    setNotifications((prev) => [newNotif, ...prev])
  }

  const activeOrder = activeItem?.order
  const activeBuyer = activeItem?.buyer
  const activeTotals = activeItem?.totals

  const committed = activeTotals?.primaryKg || 0
  const target = activeOrder?.qtyTargetKg || 1000
  const progress = Math.min(100, Math.round((committed / target) * 100))

  const go = (screen: Screen) => {
    setActiveNav(screen)
    setMenuOpen(false)
  }
  const roleNav: Record<Role, Screen[]> = {
    Coordinator: navItems.map((item) => item.label as Screen),
    Buyer: ['Overview', 'Orders', 'Routes', 'Settlements'],
    Farmer: ['Overview', 'Orders', 'Collection & grade', 'Settlements'],
  }

  useEffect(() => {
    const allowed = roleNav[role] || ['Overview']
    if (!allowed.includes(activeNav)) {
      setActiveNav('Overview')
    }
  }, [role, activeNav])

  const handleNotify = async () => {
    if (!activeOrder) return
    setActionBusy(true)
    try {
      await notifyOrder(activeOrder.id)
      setActionMessage('Four-tier notification cascade dispatched to matched farmers!')
      setNotifications((prev) => [
        {
          id: `cascade-${Date.now()}`,
          title: 'Notification cascade dispatched',
          detail: `SMS, WhatsApp, and IVR broadcasts sent to 12 matched farmers for ${activeOrder.crop || 'PADDY'}.`,
          time: 'Just now',
          type: 'order',
          unread: true,
        },
        ...prev,
      ])
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Notification failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleCreateOrder = async () => {
    setActionBusy(true)
    setOrderError(null)
    try {
      await createOrder({
        crop: postedCrop,
        qtyTargetKg: Number(postedQty),
        pricePerKg: Number(postedPrice),
        deliveryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      })
      setShowOrderForm(false)
      setActionMessage('New order posted successfully to AgriLink registry!')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrilink:order-created'))
      }
      setNotifications((prev) => [
        {
          id: `order-${Date.now()}`,
          title: 'New buyer contract committed',
          detail: `Committed ${postedQty} kg ${postedCrop} at ₹${postedPrice}/kg with 15% buffer reservation.`,
          time: 'Just now',
          type: 'order',
          unread: true,
        },
        ...prev,
      ])
      go('Orders')
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Order posting failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleFundAdvance = async () => {
    if (!activeOrder) return
    setActionBusy(true)
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: activeBuyer?.id }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to fund escrow advance')
      }
      await refresh()
      setActionMessage('15% Escrow advance funded! Demand order is now active and sourcing.')
      setNotifications((prev) => [
        {
          id: `escrow-${Date.now()}`,
          title: 'Escrow Advance Funded',
          detail: `15% escrow advance locked for order #${activeOrder.code || 'AG-1001'}. Farmer allocation underway.`,
          time: 'Just now',
          type: 'finance',
          unread: true,
        },
        ...prev,
      ])
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Escrow advance deposit failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeclareHarvest = async (e: React.FormEvent) => {
    e.preventDefault()
    setFarmerCommittedLocalKg(Number(harvestQty))
    setShowHarvestModal(false)
    setActionBusy(true)

    const phone = typeof window !== 'undefined' ? localStorage.getItem('agrilink_user_phone') || '+919825144102' : '+919825144102'
    try {
      await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUserName || 'Farmer Member',
          village: harvestVillage || 'Kheda',
          crop_name: harvestCrop,
          quantity: Number(harvestQty),
          mobile_number: phone,
          quality_grade: 'A',
          harvest_date: harvestWindow,
        }),
      })
      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrilink:harvest-updated'))
      }
    } catch (err) {
      console.warn('Harvest declare non-fatal error:', err)
    } finally {
      setActionBusy(false)
    }

    setActionMessage(`Harvest declared! ${harvestQty} kg of ${harvestCrop} registered in live FPO supply board.`)
    setNotifications((prev) => [
      {
        id: `harvest-${Date.now()}`,
        title: 'Harvest produce declared',
        detail: `${currentUserName || 'Farmer'} registered ${harvestQty} kg ${harvestCrop} in ${harvestVillage} village.`,
        time: 'Just now',
        type: 'order',
        unread: true,
      },
      ...prev,
    ])
  }

  const handleAcceptCommitment = () => {
    setFarmerOfferAccepted(true)
    setActionMessage('Offer accepted! Official APMC model agreement confirmed for this harvest.')
    setNotifications((prev) => [
      {
        id: `accept-${Date.now()}`,
        title: 'Commitment offer confirmed',
        detail: `You accepted 500 kg commitment for ${activeOrder?.crop || 'Paddy'} at ₹${activeOrder?.pricePerKg || 28}/kg.`,
        time: 'Just now',
        type: 'order',
        unread: true,
      },
      ...prev,
    ])
  }

  const handleOnboardFarmer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFarmerName.trim()) return
    const newEntry = {
      id: `FARM-${String(rosterFarmers.length + 1).padStart(3, '0')}`,
      name: newFarmerName.trim(),
      village: newFarmerVillage.trim() || 'Anand',
      crop: newFarmerCrop,
      kg: Number(newFarmerKg) || 500,
      status: 'Standby',
      reliability: 90,
      color: 'bg-emerald-700',
    }
    setRosterFarmers((prev) => [newEntry, ...prev])
    setShowOnboardFarmerModal(false)

    try {
      await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFarmerName.trim(),
          village: newFarmerVillage.trim() || 'Anand',
          crop_name: newFarmerCrop.split('/')[0].trim(),
          quantity: Number(newFarmerKg) || 500,
          mobile_number: newFarmerPhone.trim() || '+919825144102',
          quality_grade: 'A',
          harvest_date: 'Upcoming Harvest',
        }),
      })
      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrilink:harvest-updated'))
      }
    } catch {}

    setActionMessage(`Farmer ${newFarmerName} onboarded to FPO cluster! Welcome SMS dispatched.`)
    setNotifications((prev) => [
      {
        id: `onboard-${Date.now()}`,
        title: 'New farmer onboarded',
        detail: `${newFarmerName} (${newFarmerVillage}) added with ${newFarmerKg} kg ${newFarmerCrop} capacity.`,
        time: 'Just now',
        type: 'order',
        unread: true,
      },
      ...prev,
    ])
    setNewFarmerName('')
    setNewFarmerPhone('')
  }

  const handleGradePhoto = async (dataUrl: string) => {
    setPhotoDataUrl(dataUrl)
    if (!activeOrder) return
    setActionBusy(true)
    try {
      const res = await gradeLot(activeOrder.id, selectedFarmerId, dataUrl)
      if (res.attempt) {
        setAiResult({
          status: res.attempt.aiStatus,
          grade: res.attempt.aiGrade || 'A',
          confidence: Math.round((res.attempt.aiConfidence || 0.92) * 100),
          reasoning: res.attempt.aiReasoning || 'Produce displays uniform color and size within Grade A standards.',
        })
      }
    } catch (err) {
      setAiResult({ status: 'GRADED', grade: 'A', confidence: 91, reasoning: 'Simulated AI inspection passed.' })
    } finally {
      setActionBusy(false)
    }
  }

  const handleCollectLot = async () => {
    if (!activeOrder) return
    setActionBusy(true)
    try {
      await collectLot(activeOrder.id, {
        farmerId: selectedFarmerId,
        weighedKg: Number(weighedKg),
        decision: 'ACCEPT',
        grade: aiResult?.grade || 'A',
      })
      setActionMessage('Lot accepted! Advance payment disbursed to farmer account.')
      setNotifications((prev) => [
        {
          id: `lot-${Date.now()}`,
          title: 'Lot collected & 30% advance disbursed',
          detail: `Weighed ${weighedKg} kg Grade ${aiResult?.grade || 'A'} ${activeOrder.crop || 'Paddy'}. Advance disbursed via e-RUPI.`,
          time: 'Just now',
          type: 'finance',
          unread: true,
        },
        ...prev,
      ])
      go('Settlements')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Lot collection failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDispatch = async () => {
    if (!activeOrder) return
    setActionBusy(true)
    try {
      await dispatchOrder(activeOrder.id, 1200, 'Tata Ace Pickup')
      setActionMessage('Consignment dispatched! Route optimization & cost allocation saved.')
      setNotifications((prev) => [
        {
          id: `dispatch-${Date.now()}`,
          title: 'Consignment vehicle dispatched',
          detail: 'Tata Ace (GJ-07-TY-4912) underway on 18.4 km multi-stop collection route.',
          time: 'Just now',
          type: 'logistics',
          unread: true,
        },
        ...prev,
      ])
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Dispatch failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeliver = async () => {
    if (!activeOrder || !activeBuyer) return
    setActionBusy(true)
    try {
      await deliverOrder(activeOrder.id, activeBuyer.id)
      setActionMessage('Delivery confirmed by buyer! Settlement receipt generated.')
      setNotifications((prev) => [
        {
          id: `deliver-${Date.now()}`,
          title: 'Buyer delivery confirmed',
          detail: `${activeBuyer.name} confirmed drop receipt. Final farmer escrow payout unlocked.`,
          time: 'Just now',
          type: 'finance',
          unread: true,
        },
        ...prev,
      ])
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Delivery confirmation failed')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Brand t={t} />
        <Sidebar activeNav={activeNav} role={role} go={go} roleNav={roleNav} volumePct={data?.metrics.pilotVolumePct || 77} onSignOut={onSignOut} t={t} userName={currentUserName} verified={verified} lang={lang} />
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button className="lg:hidden shrink-0" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">AgriLink Pilot · Live Engine</p>
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-0.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    className="rounded-lg border border-primary bg-background px-2.5 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 max-w-[180px] sm:max-w-[220px]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <h1 className="group flex items-center gap-2 font-serif text-lg font-bold tracking-tight sm:text-2xl truncate">
                  <span className="truncate">
                    {t.goodMorning}, {currentUserName?.trim() || (role === 'Farmer' ? 'Ramesh' : role === 'Buyer' ? 'Meera' : 'Anita')}
                  </span>
                  <button
                    onClick={() => {
                      setNameInput(currentUserName?.trim() || (role === 'Farmer' ? 'Ramesh' : role === 'Buyer' ? 'Meera' : 'Anita'))
                      setEditingName(true)
                    }}
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors shrink-0"
                    title="Change display name"
                    aria-label="Change display name"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Indic Language Switcher */}
            <div className="flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLang('en')}
                className={`rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono transition-colors ${
                  lang === 'en' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-sans transition-colors ${
                  lang === 'hi' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="हिंदी (Hindi)"
              >
                हिं
              </button>
              <button
                onClick={() => setLang('te')}
                className={`rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-sans transition-colors ${
                  lang === 'te' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="తెలుగు (Telugu)"
              >
                తె
              </button>
            </div>

            {/* Team & Access RBAC */}
            <button
              onClick={() => setTeamModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              title="Team & Access Control"
            >
              <Users className="size-3.5 text-primary" />
              <span>{t.teamAccess}</span>
            </button>

            {/* Voice-Based Digital Assistant */}
            <button
              onClick={() => setShowVoiceModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2 sm:px-3 py-1.5 text-xs font-semibold text-primary transition-colors cursor-pointer shadow-xs min-h-[32px]"
              title="Open Voice-Based Digital Assistant (Bhashini AI)"
            >
              <Mic className="size-3.5 animate-pulse text-primary" />
              <span className="hidden lg:inline">Voice Assistant</span>
            </button>

            <button onClick={() => refresh()} className="rounded-full p-1.5 sm:p-2 text-muted-foreground hover:bg-secondary" title={t.refresh}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative rounded-full p-1.5 sm:p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title={t.notifications}
                aria-label="Toggle notifications"
              >
                <Bell className="size-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {unreadNotifs}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPopover
                  notifications={notifications}
                  filter={notifFilter}
                  setFilter={setNotifFilter}
                  onClose={() => setNotificationsOpen(false)}
                  onMarkAllRead={handleMarkAllRead}
                  onSimulate={handleSimulateEvent}
                  onDismiss={handleDismissNotif}
                />
              )}
            </div>

            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-card px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold" title={role === 'Farmer' ? 'Farmer Workspace' : role === 'Buyer' ? 'Buyer Workspace' : 'FPO Coordinator'}>
              <span className={`size-2 rounded-full ${role === 'Farmer' ? 'bg-emerald-500' : role === 'Buyer' ? 'bg-blue-500' : 'bg-purple-500'}`} />
              <span className="hidden sm:inline text-foreground">
                {role === 'Farmer' ? '🌾 Farmer' : role === 'Buyer' ? '🏢 Buyer' : '🛡️ Coordinator'}
              </span>
              <span className="sm:hidden text-foreground text-xs">
                {role === 'Farmer' ? '🌾' : role === 'Buyer' ? '🏢' : '🛡️'}
              </span>
            </div>
            {role === 'Coordinator' && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-500/20 transition-colors"
                title="Open FPO Admin Control Centre"
              >
                <ShieldCheck className="size-3.5" />
                <span className="hidden md:inline">Admin Console</span>
              </Link>
            )}
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Return to Main Landing Page"
            >
              <span>Home</span>
            </Link>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                title="Sign out of workspace"
              >
                <LogOut className="size-3.5" />
                <span className="hidden xl:inline">{t.signOut}</span>
              </button>
            )}
          </div>
        </header>

        {!verified && (
          <div className="mx-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-4 text-xs text-accent-foreground sm:mx-8 lg:mx-10 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-5 shrink-0 text-accent-foreground mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Identity Verification Pending</p>
                <p className="mt-0.5 text-muted-foreground leading-5">Your mobile number is verified. Complete optional Aadhaar trust verification to unlock official verified badges across all transactions.</p>
              </div>
            </div>
            <Link
              href="/verify"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Verify identity &rarr;
            </Link>
          </div>
        )}

        {actionMessage && (
          <div className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium sm:mx-8 lg:mx-10">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-primary hover:opacity-70">
              <X className="size-4" />
            </button>
          </div>
        )}

        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-xs lg:hidden" onClick={() => setMenuOpen(false)}>
            <div className="h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-8 flex items-center gap-3">
                <Brand t={t} />
                <button className="ml-auto" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <Sidebar activeNav={activeNav} role={role} go={go} roleNav={roleNav} volumePct={data?.metrics.pilotVolumePct || 77} mobile onSignOut={onSignOut} t={t} userName={currentUserName} verified={verified} lang={lang} />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
          <DeclareHarvestModal
            isOpen={showHarvestModal}
            onClose={() => setShowHarvestModal(false)}
            onSubmit={handleDeclareHarvest}
            crop={harvestCrop}
            setCrop={setHarvestCrop}
            qty={harvestQty}
            setQty={setHarvestQty}
            village={harvestVillage}
            setVillage={setHarvestVillage}
            windowDates={harvestWindow}
            setWindowDates={setHarvestWindow}
          />

          <OnboardFarmerModal
            isOpen={showOnboardFarmerModal}
            onClose={() => setShowOnboardFarmerModal(false)}
            onSubmit={handleOnboardFarmer}
            name={newFarmerName}
            setName={setNewFarmerName}
            phone={newFarmerPhone}
            setPhone={setNewFarmerPhone}
            village={newFarmerVillage}
            setVillage={setNewFarmerVillage}
            crop={newFarmerCrop}
            setCrop={setNewFarmerCrop}
            kg={newFarmerKg}
            setKg={setNewFarmerKg}
          />

          {showOrderForm && (
            <OrderForm
              crop={postedCrop}
              setCrop={setPostedCrop}
              qty={postedQty}
              setQty={setPostedQty}
              price={postedPrice}
              setPrice={setPostedPrice}
              onClose={() => {
                setShowOrderForm(false)
                setOrderError(null)
              }}
              onPost={handleCreateOrder}
              busy={actionBusy}
              error={orderError}
            />
          )}

          {role === 'Farmer' ? (
            <FarmerDashboardView
              order={activeOrder}
              buyer={activeBuyer}
              currentUserName={currentUserName}
              lang={lang}
              activeNav={activeNav}
              onNavigate={(tab) => go(tab)}
              farmerOfferAccepted={farmerOfferAccepted}
              onAcceptCommitment={handleAcceptCommitment}
              onDeclareHarvest={() => setShowHarvestModal(true)}
              onOpenVoice={() => setShowVoiceModal(true)}
              onOpenReceipt={() => {
                setPrintableDocType('receipt')
                setPrintableModalOpen(true)
              }}
              onRedistributeExcess={() => setShowExcessModal(true)}
              onCapturePhoto={handleGradePhoto}
              aiResult={aiResult}
              busy={actionBusy}
              farmerTab={farmerCollectionTab}
              setFarmerTab={setFarmerCollectionTab}
            />
          ) : (
            <>
              <ScreenHeader
                role={role}
                activeNav={activeNav}
                onNew={() => setShowOrderForm(true)}
                onDeclareHarvest={() => setShowHarvestModal(true)}
                onOnboardFarmer={() => setShowOnboardFarmerModal(true)}
                onReset={resetData}
                t={t}
              />

              {activeNav === 'Overview' && (
                <Overview
                  role={role}
                  order={activeOrder}
                  buyer={activeBuyer}
                  committed={committed}
                  target={target}
                  progress={progress}
                  notified={activeOrder?.status !== 'POSTED'}
                  onNotify={handleNotify}
                  onOrder={() => setShowOrderForm(true)}
                  onDeclareHarvest={() => setShowHarvestModal(true)}
                  onRoute={() => go('Routes')}
                  busy={actionBusy}
                  t={t}
                />
              )}

              {activeNav === 'Orders' && (
                <Orders
                  role={role}
                  order={activeOrder}
                  buyer={activeBuyer}
                  onNew={() => setShowOrderForm(true)}
                  onDeclareHarvest={() => setShowHarvestModal(true)}
                  onFundAdvance={handleFundAdvance}
                  onAcceptCommitment={handleAcceptCommitment}
                  onRedistributeExcess={() => setShowExcessModal(true)}
                  farmerOfferAccepted={farmerOfferAccepted}
                  notified={activeOrder?.status !== 'POSTED'}
                  onNotify={handleNotify}
                  busy={actionBusy}
                  t={t}
                />
              )}

              {activeNav === 'Farmer network' && (
                <div className="space-y-6">
                  <SmartAggregationCard
                    orderCode={activeOrder?.code || 'AG-1001'}
                    crop={activeOrder?.crop || 'Paddy (Rice)'}
                    targetKg={Number((activeOrder as any)?.targetKg || activeOrder?.qtyTargetKg || 1000)}
                    pricePerKg={activeOrder?.pricePerKg || 28}
                    deliveryDate={activeOrder?.deliveryDate || '2025-10-20'}
                    buyerName={activeBuyer?.name || 'PM POSHAN Central Kitchen'}
                  />
                  <Network
                    order={activeOrder}
                    notified={activeOrder?.status !== 'POSTED'}
                    onNotify={handleNotify}
                    onOnboard={() => setShowOnboardFarmerModal(true)}
                    farmers={rosterFarmers}
                    busy={actionBusy}
                    t={t}
                    onCallFarmer={(farmer: any, allocatedKg?: number) => {
                      setCallingFarmer(farmer)
                      setCallingAllocatedKg(allocatedKg || 500)
                      setBolnaModalOpen(true)
                    }}
                  />
                </div>
              )}

              {activeNav === 'Collection & grade' && (
                <Collection
                  role={role}
                  order={activeOrder}
                  farmerId={selectedFarmerId}
                  setFarmerId={setSelectedFarmerId}
                  weighedKg={weighedKg}
                  setWeighedKg={setWeighedKg}
                  aiResult={aiResult}
                  onCapturePhoto={handleGradePhoto}
                  onCollect={handleCollectLot}
                  farmerTab={farmerCollectionTab}
                  setFarmerTab={setFarmerCollectionTab}
                  busy={actionBusy}
                  t={t}
                />
              )}

              {activeNav === 'Routes' && (
                <RoutesScreen
                  role={role}
                  order={activeOrder}
                  onDispatch={handleDispatch}
                  onDeliver={handleDeliver}
                  busy={actionBusy}
                  onPrintWaybill={() => {
                    setPrintableDocType('waybill')
                    setPrintableModalOpen(true)
                  }}
                  t={t}
                />
              )}

              {activeNav === 'Settlements' && (
                <Settlements
                  role={role}
                  order={activeOrder}
                  buyer={activeBuyer}
                  onPrintInvoice={() => {
                    setPrintableDocType('receipt')
                    setPrintableModalOpen(true)
                  }}
                  t={t}
                />
              )}
            </>
          )}
        </div>

        {/* Advanced Enterprise Modals */}
        <TeamManagementModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
        />
        <PrintableReceiptModal
          type={printableDocType}
          isOpen={printableModalOpen}
          onClose={() => setPrintableModalOpen(false)}
          order={activeOrder}
          buyer={activeBuyer}
        />

        {/* SIH Innovation Modals */}
        <VoiceAssistantModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          userRole={role}
        />
        <ExcessRedistributionModal
          isOpen={showExcessModal}
          onClose={() => setShowExcessModal(false)}
          orderCode={activeOrder?.code || 'AG-1001'}
          crop={activeOrder?.crop || 'Paddy (Rice)'}
          surplusKg={80}
          pricePerKg={activeOrder?.pricePerKg || 28}
          onConfirmRedistribution={(res) => {
            setActionMessage(`Surplus ${res.qtyKg} kg ${activeOrder?.crop || 'produce'} successfully redirected to ${res.recipientName} at ₹${res.discountedPrice}/kg! Zero waste recorded.`)
          }}
        />
        <CommunityDemandModal
          isOpen={showCommunityModal}
          onClose={() => setShowCommunityModal(false)}
          onSubmitCommunityDemand={(comm) => {
            setActionMessage(`Community demand for ${comm.qtyKg} kg ${comm.crop} ("${comm.title}") posted! Nearby cluster farmers notified.`)
          }}
        />

        {/* Bolna AI Voice Confirmation Modal */}
        <BolnaCallModal
          isOpen={bolnaModalOpen}
          onClose={() => setBolnaModalOpen(false)}
          farmer={callingFarmer}
          order={activeOrder}
          allocatedKg={callingAllocatedKg}
          onCallSuccess={(farmerId) => {
            setActionMessage('Bolna AI Agent call initiated successfully! Farmer confirmation logged.')
          }}
        />
      </main>
    </div>
  )
}

function Brand({ t }: { t?: TranslationDictionary }) {
  return (
    <div className="flex items-center gap-3 p-6 border-b border-border">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Sprout className="size-6" />
      </div>
      <div>
        <div className="font-serif text-xl font-bold tracking-tight text-foreground">{t?.appName || 'AgriLink'}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{t?.tagline || 'FARM TO COMMONS'}</div>
      </div>
    </div>
  )
}

function Sidebar({
  activeNav,
  role,
  go,
  roleNav,
  volumePct,
  mobile = false,
  onSignOut,
  t,
  userName,
  verified = true,
  lang = 'en',
}: {
  activeNav: Screen
  role: Role
  go: (s: Screen) => void
  roleNav: Record<Role, Screen[]>
  volumePct: number
  mobile?: boolean
  onSignOut?: () => void
  t?: TranslationDictionary
  userName?: string | null
  verified?: boolean
  lang?: Language
}) {
  const [ordersExpanded, setOrdersExpanded] = useState(false)

  const farmerNavLabels: Partial<Record<Screen, { en: string; hi: string; te: string }>> = {
    Overview: { en: 'My Harvest & Pickup', hi: 'मेरी फसल और उठाव', te: 'నా పంట & పికప్' },
    Orders: { en: 'Buyer Demands', hi: 'खरीदार मांग', te: 'కొనుగోలుదారు డిమాండ్లు' },
    'Farmer network': { en: 'Farmer network', hi: 'किसान नेटवर्क', te: 'రైతు నెట్‌వర్క్' },
    'Collection & grade': { en: 'Quality Check', hi: 'क्वालिटी जांच', te: 'నాణ్యత తనిఖీ' },
    Routes: { en: 'Routes', hi: 'वाहन मार्ग', te: 'వాహన మార్గాలు' },
    Settlements: { en: 'Passbook & Payments', hi: 'खाता पासबुक', te: 'పాస్‌బుక్ & చెల్లింపులు' },
  }

  return (
    <div className={`flex ${mobile ? 'flex-col' : 'flex-1 flex-col justify-between'} px-3 py-6`}>
      <nav className="space-y-1">
        <div className="mb-4 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {role === 'Farmer' ? '🌾 Kisan Portal' : `${role} workspace`}
        </div>
        {navItems
          .filter((item) => roleNav[role].includes(item.label as Screen))
          .map(({ label, key, icon: Icon, count }) => {
            const isBuyerOrders = role === 'Buyer' && label === 'Orders'
            let displayLabel = (t && t[key]) ? t[key] : label
            if (role === 'Farmer' && farmerNavLabels[label as Screen]) {
              const fL = farmerNavLabels[label as Screen]!
              displayLabel = lang === 'hi' ? fL.hi : lang === 'te' ? fL.te : fL.en
            }
            return (
              <div key={label}>
                <button
                  onClick={() => {
                    go(label as Screen)
                    if (isBuyerOrders) setOrdersExpanded((expanded) => !expanded)
                  }}
                  aria-expanded={isBuyerOrders ? ordersExpanded : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                    activeNav === label
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {displayLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    {count && <span className="font-mono text-[10px]">{count}</span>}
                    {isBuyerOrders && (ordersExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}
                  </span>
                </button>
                {isBuyerOrders && ordersExpanded && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-border pl-3" aria-label="Order Categories">
                    <div className="rounded-lg px-3 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Users className="size-3.5 text-primary" /> Low Order</div>
                      <div className="mt-1 pl-5 text-[10px] leading-4">Individual · 1–50 cages</div>
                    </div>
                    <div className="rounded-lg px-3 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><PackageCheck className="size-3.5 text-accent-foreground" /> Medium Order</div>
                      <div className="mt-1 pl-5 text-[10px] leading-4">Institutional · 51–300 cages</div>
                    </div>
                    <div className="rounded-lg px-3 py-2.5 text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Truck className="size-3.5 text-blue-600" /> Bulk Order</div>
                      <div className="mt-1 pl-5 text-[10px] leading-4">Industrial · measured in tons</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        {!mobile && (
          role === 'Farmer' ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">FPO Sahayak Help</span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-foreground">Anita Desai</p>
              <p className="text-[11px] text-muted-foreground">Kheda Village Coordinator</p>
              <a
                href="tel:+919825012345"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Phone className="size-3.5 text-emerald-600" />
                <span>Call +91 98250 12345</span>
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-secondary/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t?.statPilotVolume || 'Pilot volume'}</span>
                <span className="size-2 rounded-full bg-primary" />
              </div>
              <div className="mb-2 text-2xl font-semibold tracking-tight">{volumePct}%</div>
              <p className="text-xs leading-5 text-muted-foreground">of weekly FPO produce volume moved through AgriLink.</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${volumePct}%` }} />
              </div>
            </div>
          )
        )}

        {userName && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-serif font-bold text-primary">
              {userName[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{userName}</p>
              <p className="truncate text-[10px] text-muted-foreground font-mono">
                {role === 'Farmer' ? '🌾 Verified Farmer' : `${role} Account`}
              </p>
            </div>
            {verified && <ShieldCheck className="size-4 shrink-0 text-primary" />}
          </div>
        )}

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shadow-sm"
          >
            <LogOut className="size-4" />
            <span>{t?.signOut || 'Sign out of workspace'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function ScreenHeader({
  role,
  activeNav,
  onNew,
  onDeclareHarvest,
  onOnboardFarmer,
  onReset,
  t,
}: {
  role: Role
  activeNav: Screen
  onNew: () => void
  onDeclareHarvest?: () => void
  onOnboardFarmer?: () => void
  onReset: () => void
  t?: TranslationDictionary
}) {
  const coordinatorCopy: Record<Screen, string> = {
    Overview: t?.titleOverview || 'Demand finds the harvest.',
    Orders: t?.titleOrders || 'Orders before harvest.',
    'Farmer network': t?.titleFarmerNetwork || 'The crop registry, activated.',
    'Collection & grade': t?.titleCollectionGrade || 'Trust at the collection point.',
    Routes: t?.titleRoutes || 'Every lot has a route.',
    Settlements: t?.titleSettlements || 'Transparent money movement.',
  }

  const buyerCopy: Record<Screen, string> = {
    Overview: 'Direct farmgate sourcing & institutional procurement.',
    Orders: 'Active purchase orders & crop contracts.',
    'Farmer network': 'Aggregated FPO supply board.',
    'Collection & grade': 'Quality inspection & AGMARK assurance.',
    Routes: 'Consignment manifests & cold-chain tracking.',
    Settlements: 'APMC invoices & escrow payments.',
  }

  const farmerCopy: Record<Screen, string> = {
    Overview: 'My harvest commitments & scheduled pickups.',
    Orders: 'My accepted sale orders & contract history.',
    'Farmer network': 'FPO village cluster network.',
    'Collection & grade': 'GradeCam digital quality lot slips.',
    Routes: 'Farmgate collection route & vehicle arrival.',
    Settlements: 'My passbook, e-RUPI vouchers & DBT payouts.',
  }

  const copy = role === 'Farmer' ? farmerCopy : role === 'Buyer' ? buyerCopy : coordinatorCopy
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
          <span className="size-2 rounded-full bg-primary" />
          {role} workspace · live backend engine
        </div>
        <h2 className="max-w-2xl font-serif text-4xl font-bold tracking-tight text-balance sm:text-5xl">{copy[activeNav]}</h2>
      </div>
      <div className="flex items-center gap-3">
        {role === 'Coordinator' && (
          <button
            onClick={onReset}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
            title="Reset database seed data"
          >
            {t?.resetSeed || 'Reset seed'}
          </button>
        )}
        {role === 'Farmer' && onDeclareHarvest && (
          <Button onClick={onDeclareHarvest}>
            <Sprout className="size-4" /> Declare Harvest
          </Button>
        )}
        {role === 'Coordinator' && activeNav === 'Farmer network' && onOnboardFarmer && (
          <Button onClick={onOnboardFarmer}>
            <Users className="size-4" /> Onboard Farmer
          </Button>
        )}
        {(role === 'Buyer' || (role === 'Coordinator' && activeNav !== 'Farmer network')) && (
          <Button onClick={onNew}>
            <Plus className="size-4" /> {t?.newOrder || 'New order'}
          </Button>
        )}
      </div>
    </div>
  )
}

function Overview({
  role,
  order,
  buyer,
  committed,
  target,
  progress,
  notified,
  onNotify,
  onOrder,
  onDeclareHarvest,
  onRoute,
  busy,
  t,
}: {
  role: Role
  order: any
  buyer: any
  committed: number
  target: number
  progress: number
  notified: boolean
  onNotify: () => void
  onOrder: () => void
  onDeclareHarvest?: () => void
  onRoute: () => void
  busy: boolean
  t?: TranslationDictionary
}) {
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const farmerCommittedKg = 500
  const farmerGrossPayout = farmerCommittedKg * price

  return (
    <>
      {role === 'Farmer' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            title="My Committed Harvest"
            value={`${farmerCommittedKg} kg`}
            detail={`${crop} · Grade A Standard`}
            trend="Offer Confirmed"
            icon={<Wheat className="size-5" />}
          />
          <Stat
            title="Agreed Mandi Premium"
            value={`₹${price}/kg`}
            detail="vs ₹22 AGMARKNET mandi price"
            trend="+27.2% uplift"
            icon={<Leaf className="size-5" />}
          />
          <Stat
            title="Projected Direct Payout"
            value={`₹${farmerGrossPayout.toLocaleString()}`}
            detail="Direct to Jan Dhan DBT account"
            trend="e-RUPI Escrow"
            icon={<CircleDollarSign className="size-5" />}
          />
        </div>
      ) : role === 'Buyer' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            title="Total Order Value"
            value={`₹${(target * price).toLocaleString()}`}
            detail={`${buyer?.name || 'Institutional Kitchen'} · ${target} kg`}
            trend="Active Contract"
            icon={<CircleDollarSign className="size-5" />}
          />
          <Stat
            title="FPO Aggregated Volume"
            value={`${committed} kg`}
            detail={`${target} kg target · 15% buffer included`}
            trend={`${progress}% fulfilled`}
            icon={<Boxes className="size-5" />}
          />
          <Stat
            title="Escrow Advance Reserved"
            value={`₹${Math.round(target * price * 0.15).toLocaleString()}`}
            detail="Protected by NPCI digital escrow"
            trend="Funds Secured"
            icon={<Wallet className="size-5" />}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            title={t?.statActiveOrderValue || 'Active order value'}
            value={`₹${(target * price).toLocaleString()}`}
            detail={`${buyer?.name || 'School Kitchen'} · ${target} kg`}
            trend="Live order"
            icon={<CircleDollarSign className="size-5" />}
          />
          <Stat
            title={t?.statCommittedVolume || 'Committed volume'}
            value={`${committed} kg`}
            detail={`${target} kg target · 15% buffer`}
            trend={`${progress}% filled`}
            icon={<Wheat className="size-5" />}
          />
          <Stat
            title={t?.statFarmerRealised || 'Farmer realised'}
            value={`₹${price}/kg`}
            detail="vs ₹22 AGMARKNET mandi price"
            trend="+27.2%"
            icon={<Leaf className="size-5" />}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex flex-col justify-between gap-4 border-b border-border p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
                <img
                  src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                  alt={crop}
                  className="size-full object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge>{order?.code || '#AG-1001'}</Badge>
                  <Badge tone="live">
                    {role === 'Farmer' ? 'MY COMMITTED LOT' : role === 'Buyer' ? 'ACTIVE PURCHASE DEMAND' : order?.status || 'POSTED'}
                  </Badge>
                </div>
                <h3 className="font-serif text-2xl font-bold">
                  {role === 'Farmer' ? `${crop} Harvest Lot · Kheda Village` : `${crop} · ${buyer?.name || 'Institutional Kitchen'}`}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {role === 'Farmer'
                    ? `Collection scheduled for ${order?.deliveryDate || '2025-10-20'} · ${farmerCommittedKg} kg at ₹${price}/kg`
                    : `Delivery ${order?.deliveryDate || '2025-10-20'} · ${target} kg at ₹${price}/kg`}
                </p>
              </div>
            </div>

            {role === 'Farmer' ? (
              <div className="flex items-center gap-2">
                {onDeclareHarvest && (
                  <Button variant="secondary" onClick={onDeclareHarvest}>
                    <Sprout className="size-4" /> Declare Produce
                  </Button>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700">
                  <Check className="size-4" /> Commitment Confirmed
                </span>
              </div>
            ) : role === 'Buyer' ? (
              <Button onClick={onOrder}>
                <Plus className="size-4" /> Post New Demand
              </Button>
            ) : (
              <Button onClick={onNotify} disabled={notified || busy}>
                {notified ? (
                  <>
                    <Check className="size-4" /> {t?.actionFarmersNotified || 'Farmers notified'}
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> {t?.actionNotifyFarmers || 'Notify matched farmers'}
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {role === 'Farmer' ? 'Personal lot commitment status' : 'Commitment tracker'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {role === 'Farmer' ? 'Pre-harvest agreement with 15% standby reserve' : 'Target volume with 15% standby buffer'}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-primary">
                {role === 'Farmer' ? `${farmerCommittedKg} / ${farmerCommittedKg} kg` : `${committed} / ${target} kg`}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${role === 'Farmer' ? 100 : progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0 kg</span>
              <span>{role === 'Farmer' ? 'Committed 500 kg' : `Target ${target}`}</span>
              <span>Buffer {Math.round((role === 'Farmer' ? farmerCommittedKg : target) * 1.15)}</span>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Mini label="Accepted" value={`${role === 'Farmer' ? farmerCommittedKg : committed} kg`} />
              <Mini label="Standby buffer" value={`${Math.round((role === 'Farmer' ? farmerCommittedKg : target) * 0.15)} kg`} />
              <Mini label={role === 'Farmer' ? 'Lot ID' : 'Cascade response'} value={role === 'Farmer' ? 'LOT-1001' : '94%'} />
            </div>
          </div>
        </Card>

        {role === 'Farmer' ? (
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Notification Channels</p>
                  <h3 className="mt-1 font-serif text-xl font-bold">Direct SMS & WhatsApp Alerts</h3>
                </div>
                <Smartphone className="size-6 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You receive order notifications in your vernacular language without needing a smartphone app.
              </p>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-xs">
                  <span className="font-medium">GSM SMS Alerts</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-xs">
                  <span className="font-medium">WhatsApp Updates</span>
                  <span className="font-semibold text-emerald-600">Verified</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-xs">
                  <span className="font-medium">IVR Voice Call Alert</span>
                  <span className="font-semibold text-emerald-600">Enabled</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary font-medium">
              Reply &apos;1&apos; via SMS or WhatsApp to confirm harvest availability anytime.
            </div>
          </div>
        ) : role === 'Buyer' ? (
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Quality & Trust</p>
                  <h3 className="mt-1 font-serif text-xl font-bold">Procurement Guarantee</h3>
                </div>
                <ShieldCheck className="size-6 text-primary" />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 rounded-xl bg-secondary/60 p-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>AI GradeCam:</strong> 98.4% visual accuracy against AGMARKNET Grade A standards.</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-secondary/60 p-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Zero Middleman Markups:</strong> 27.2% fair value shift directly to farming clusters.</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-secondary/60 p-3">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Escrow Auto-Settlement:</strong> Funds released only upon buyer drop-point acceptance.</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              Direct-from-farm contracts legally backed under APMC model bylaws.
            </div>
          </div>
        ) : (
          <Cascade notified={notified} onNotify={onNotify} busy={busy} />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <PriceProof crop={crop} price={price} />
        {role === 'Farmer' ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Logistics Schedule</p>
                <h3 className="mt-1 font-serif text-xl font-bold">Next Farmgate Pickup</h3>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> 07:15 AM
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Collection Vehicle</span>
                <span className="font-semibold">Tata Ace (GJ-07-TY-4912)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pickup Location</span>
                <span className="font-semibold">Kheda Village Collection Center</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Scheduled Weight</span>
                <span className="font-semibold">500 kg {crop}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              FPO collection driver will inspect produce with GradeCam visual scanner and disburse 30% advance on bag handover.
            </p>
          </Card>
        ) : (
          <CollectionRunway onRoute={onRoute} />
        )}
      </div>
    </>
  )
}

function Stat({ title, value, detail, trend, icon }: { title: string; value: string; detail: string; trend: string; icon: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="font-serif text-3xl font-bold">{value}</span>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="text-xs font-semibold text-primary">{trend}</span>
      </div>
    </Card>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function Cascade({ notified, onNotify, busy }: { notified: boolean; onNotify: () => void; busy: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">Notification cascade</p>
          <h3 className="mt-2 font-serif text-xl font-bold">Order finds the farmer.</h3>
        </div>
        <Bell className="size-5" />
      </div>
      <div className="space-y-4">
        {channels.map((channel, index) => (
          <div key={channel} className="flex items-center gap-3">
            <div
              className={`flex size-8 items-center justify-center rounded-full border ${
                index < (notified ? 4 : 1) ? 'border-primary-foreground/30 bg-primary-foreground/15' : 'border-primary-foreground/15'
              }`}
            >
              {index < (notified ? 4 : 1) ? <Check className="size-3.5" /> : <span className="font-mono text-[10px]">{index + 1}</span>}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span>{channel}</span>
                <span className="text-primary-foreground/50">{index < (notified ? 4 : 1) ? 'completed' : 'pending'}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-primary-foreground/10">
                <div
                  className={`h-full rounded-full bg-accent transition-all duration-500 ${index < (notified ? 4 : 1) ? 'w-full' : 'w-0'}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-primary-foreground/15 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-primary-foreground/60">Matched farmers in registry</span>
          <span className="font-mono font-semibold">12 nearby</span>
        </div>
        {!notified && (
          <button onClick={onNotify} disabled={busy} className="mt-4 text-xs font-semibold text-accent hover:underline">
            Run next cascade step <ChevronRight className="ml-1 inline size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function PriceProof({ crop = 'PADDY', price = 28 }: { crop?: string; price?: number }) {
  const mandi = Math.round(price * 0.75)
  const retail = Math.round(price * 1.4)
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Price proof · AGMARKNET</p>
          <h3 className="mt-2 font-serif text-xl font-bold">Both sides gain.</h3>
        </div>
        <ShieldCheck className="size-6 text-primary" />
      </div>
      <div className="space-y-4">
        {[
          ['AGMARKNET mandi price', `₹${mandi}`, 'Live · data.gov.in', 'live'],
          ['Farmer realised price', `₹${price}`, 'AgriLink collection price', 'good'],
          ['DoCA retail price', `₹${retail}`, 'Published · today', 'cached'],
          ['Buyer paid price', `₹${Math.round(price * 1.15)}`, 'Institutional contract', 'good'],
        ].map(([label, value, detail, tone]) => (
          <div key={label} className="flex items-center justify-between border-b border-border pb-3.5">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
            </div>
            <span className={`font-serif text-2xl font-bold ${tone === 'good' ? 'text-primary' : ''}`}>{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-secondary p-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Intermediary margin compressed by </span>
        <span className="font-semibold text-primary">42%</span>
      </div>
    </Card>
  )
}

function CollectionRunway({ onRoute }: { onRoute: () => void }) {
  const sampleStops = [
    { id: 'f1', kind: 'PICKUP' as const, label: 'Kheda Village', detail: 'Ramesh Kumar · 500 kg', lat: 22.75, lng: 72.68, kg: 500 },
    { id: 'f2', kind: 'PICKUP' as const, label: 'Borsad Village', detail: 'Savitri Devi · 700 kg', lat: 22.41, lng: 72.9, kg: 700 },
    { id: 'drop', kind: 'DROP' as const, label: 'Central Kitchen', detail: 'PM POSHAN Drop point', lat: 22.57, lng: 72.95, kg: 1200 },
  ]
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s movement</p>
          <h3 className="mt-2 font-serif text-xl font-bold">Collection & route map</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          <Cloud className="size-3.5" /> 28°C · clear
        </div>
      </div>
      <div className="h-[220px] w-full mb-4">
        <RouteMap stops={sampleStops} />
      </div>
      <Button variant="ghost" onClick={onRoute}>
        View full route manifest <ChevronRight className="size-4" />
      </Button>
    </Card>
  )
}

function OrderForm({
  crop,
  setCrop,
  qty,
  setQty,
  price,
  setPrice,
  onClose,
  onPost,
  busy,
  error,
}: {
  crop: string
  setCrop: (v: string) => void
  qty: string
  setQty: (v: string) => void
  price: string
  setPrice: (v: string) => void
  onClose: () => void
  onPost: () => void
  busy: boolean
  error?: string | null
}) {
  return (
    <Card className="mb-8 border-primary/40 p-4 sm:p-6 shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <Badge tone="live">AGMARKNET live adapter</Badge>
          <h3 className="mt-3 font-serif text-2xl font-bold">Post committed buyer demand</h3>
          <p className="mt-1 text-sm text-muted-foreground">Demand is posted before harvest. Matched farmers commit volume with 15% buffer.</p>
        </div>
        <button onClick={onClose} aria-label="Close order form">
          <X className="size-5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive" role="alert">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:gap-5 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Crop
          <div className="mt-2 flex items-center gap-2">
            <div className="size-11 shrink-0 rounded-xl bg-secondary/80 border border-border p-1.5 flex items-center justify-center overflow-hidden">
              <img
                src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                alt={crop}
                className="size-full object-contain"
              />
            </div>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-primary">
              <option value="PADDY">Paddy (Rice)</option>
              <option value="TOMATO">Tomato</option>
              <option value="WHEAT">Wheat</option>
              <option value="ONION">Onion</option>
              <option value="POTATO">Potato</option>
            </select>
          </div>
        </label>
        <label className="text-sm font-medium">
          Target volume (kg)
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="10" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-primary" />
        </label>
        <label className="text-sm font-medium">
          Price per kg (₹)
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="1" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-primary" />
        </label>
      </div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
          Cancel
        </Button>
        <Button onClick={onPost} disabled={busy} className="w-full sm:w-auto min-h-[44px]">
          <ClipboardList className="size-4" /> {busy ? 'Posting order…' : 'Post order to registry'}
        </Button>
      </div>
    </Card>
  )
}

function Orders({
  role,
  order,
  buyer,
  onNew,
  onDeclareHarvest,
  onFundAdvance,
  onAcceptCommitment,
  onRedistributeExcess,
  farmerOfferAccepted,
  notified,
  onNotify,
  busy,
  t,
}: any) {
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const target = order?.qtyTargetKg || 1000

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="border-b border-border p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative size-14 sm:size-16 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
                  <img
                    src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                    alt={crop}
                    className="size-full object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="live">{order?.code || 'Order #AG-1001'}</Badge>
                    <Badge tone="good">{role === 'Farmer' ? 'Personal Commitment' : 'Aadhaar Verified'}</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      {buyer?.rating || 4.9} ★ ({buyer?.completedOrders || 24} settled · 0 disputes)
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-serif text-2xl font-bold">
                    {role === 'Farmer' ? `${crop} Sale Contract` : `${crop} · ${buyer?.name || 'School Kitchen'}`}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {role === 'Farmer'
                      ? `500 kg committed · delivery ${order?.deliveryDate || '2025-10-20'} · ₹${price}/kg guaranteed`
                      : `${target} kg · delivery ${order?.deliveryDate || '2025-10-20'} · ₹${price}/kg`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {role === 'Buyer' && (
                  <Button onClick={onNew}>
                    <Plus className="size-4" /> New Order
                  </Button>
                )}
                {role === 'Farmer' && onDeclareHarvest && (
                  <Button variant="secondary" onClick={onDeclareHarvest}>
                    <Sprout className="size-4" /> Declare Harvest
                  </Button>
                )}
                {onRedistributeExcess && (
                  <Button
                    variant="secondary"
                    onClick={onRedistributeExcess}
                    className="border-emerald-600/30 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20"
                    title="Route surplus produce to student hostels & local canteens"
                  >
                    <Recycle className="size-4" /> Redistribute Surplus
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    downloadCsv(`agrilink-order-${order?.code || 'AG-1001'}.csv`, [
                      'Order Code',
                      'Crop',
                      'Target Volume (kg)',
                      'Committed Price (INR/kg)',
                      'Total Order Value (INR)',
                      'Buyer Name',
                      'Delivery Date',
                      'Status',
                      'Quality Standard',
                    ], [
                      [
                        order?.code || 'AG-1001',
                        crop,
                        role === 'Farmer' ? 500 : target,
                        price,
                        (role === 'Farmer' ? 500 : target) * price,
                        buyer?.name || 'PM POSHAN Kitchen',
                        order?.deliveryDate || '2025-10-20',
                        order?.status || 'POSTED',
                        'AGMARKNET Grade A Assured',
                      ],
                    ])
                  }}
                >
                  <Download className="size-4" /> {t?.actionExportOrder || 'Export Order (CSV)'}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {role === 'Farmer' ? (
              <>
                {!farmerOfferAccepted ? (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="live">New Demand Offer</Badge>
                          <span className="text-xs font-semibold text-primary">Pre-Harvest Contract</span>
                        </div>
                        <h4 className="mt-1 font-serif text-lg font-bold">500 kg {crop} · ₹{price}/kg Guaranteed</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PM POSHAN Kitchen committed demand. Doorstep village collection with 30% advance on bag handover.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={onAcceptCommitment} disabled={busy}>
                          <Check className="size-4" /> Accept Commitment
                        </Button>
                        {onDeclareHarvest && (
                          <Button variant="secondary" onClick={onDeclareHarvest}>
                            <Sprout className="size-4" /> Declare More
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">Harvest Commitment Confirmed (500 kg)</p>
                        <p className="text-[11px] text-emerald-700/80">Vernacular WhatsApp and SMS contract details sent to registered mobile.</p>
                      </div>
                    </div>
                    <Badge tone="good">Locked</Badge>
                  </div>
                )}
                <Step done={true} title="Demand contract locked" detail="Institutional buyer contract committed before harvest" />
                <Step done={farmerOfferAccepted} title="Commitment confirmed" detail="Your 500 kg allocation confirmed via WhatsApp / SMS" />
                <Step done={false} title="Farmgate GradeCam inspection" detail="Visual QC and weight confirmation during pickup" />
                <Step done={false} title="e-RUPI direct bank payout" detail="Final balance credited directly to bank account upon delivery" />
              </>
            ) : role === 'Buyer' ? (
              <>
                {order?.status === 'POSTED' && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="warn">Escrow Deposit Pending</Badge>
                          <span className="text-xs font-semibold text-amber-800">15% Security Advance</span>
                        </div>
                        <h4 className="mt-1 font-serif text-lg font-bold">Lock ₹{Math.round(target * price * 0.15).toLocaleString()} Escrow Advance</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Deposit 15% into NPCI digital escrow to unlock farmer cluster harvesting and guaranteed delivery.
                        </p>
                      </div>
                      <Button onClick={onFundAdvance} disabled={busy}>
                        <Wallet className="size-4" /> Deposit Escrow Advance
                      </Button>
                    </div>
                  </div>
                )}
                <Step done={true} title="Purchase demand posted" detail="Contract locked with 15% escrow deposit reserved" />
                <Step done={order?.status !== 'POSTED'} title="Supply matched & aggregated" detail="1,200 kg committed across verified smallholder clusters" />
                <Step done={true} title="GradeCam inspection passed" detail="Visual computer vision verified against AGMARKNET Grade A" />
                <Step done={false} title="Consignment delivery & escrow release" detail="Track delivery in Routes and release payment on drop-off" />
              </>
            ) : (
              <>
                <Step done={true} title="Demand committed" detail="Buyer contract posted & 15% advance reserved" />
                <Step
                  done={notified}
                  title="Farmers notified"
                  detail={notified ? 'Four-tier notification cascade completed' : 'Trigger SMS, WhatsApp & IVR to nearby registered farmers'}
                  action={!notified ? <Button onClick={onNotify} disabled={busy}><Send className="size-4" /> Notify</Button> : undefined}
                />
                <Step done={false} title="GradeCam inspection" detail="Collection point visual quality assessment" />
                <Step done={false} title="Delivery inspection" detail="Binding buyer acceptance at drop point" />
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {role === 'Farmer' ? 'Contract Protections' : 'Order details'}
          </p>
          <h3 className="mt-2 font-serif text-xl font-bold">
            {role === 'Farmer' ? 'Guaranteed Farmgate Price' : 'Demand before harvest'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {role === 'Farmer'
              ? 'Your agreed price of ₹28/kg is protected against mandi spot-market crashes. The FPO collection vehicle arrives directly at your village center.'
              : 'AgriLink matches buyer commitments to smallholder plot harvest windows before produce is picked, cutting transit spoilage to 3.8%.'}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Mini label={role === 'Farmer' ? 'Advance on loading' : 'Buyer type'} value={role === 'Farmer' ? '₹4,200 (30%)' : (buyer?.type || 'Institutional')} />
            <Mini label={role === 'Farmer' ? 'Net balance payable' : 'Status'} value={role === 'Farmer' ? '₹9,240' : (order?.status || 'POSTED')} />
            <Mini label="Buyer Reliability" value={`${buyer?.rating || 4.9} ★ (${buyer?.completedOrders || 24} settled)`} />
            <Mini label="Dispute History" value={`${buyer?.disputeCount || 0} disputes (Clean)`} />
          </div>
        </Card>
      </div>

      {/* Smart Aggregation Engine (Multi-Smallholder Pooling + Standby Buffer) */}
      <SmartAggregationCard
        orderCode={order?.code || 'AG-1001'}
        crop={crop}
        targetKg={target}
        pricePerKg={price}
        deliveryDate={order?.deliveryDate || '2025-10-20'}
        buyerName={buyer?.name || 'PM POSHAN Central Kitchen'}
      />
    </div>
  )
}

function Step({ done, title, detail, action }: { done: boolean; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
        {done ? <Check className="size-4" /> : <span className="font-mono text-xs">•</span>}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  )
}

function Network({ notified, onNotify, busy, t, order, onOnboard, farmers, onCallFarmer }: any) {
  const [cascadeTier, setCascadeTier] = useState<'sms' | 'whatsapp' | 'call'>('sms')
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const smsMessage = (t?.smsSampleOrder || 'AgriLink Alert: Buyer demand committed for {crop}. Price: ₹{price}/kg. Reply 1 to accept {qty}kg.')
    .replace('{crop}', crop)
    .replace('{price}', String(price))
    .replace('{qty}', '500')

  const farmerList = farmers || [
    { name: 'Ramesh Kumar', village: 'Kheda', crop: 'Paddy / Tomato', kg: 500, status: 'Accepted', reliability: 94, color: 'bg-primary' },
    { name: 'Savitri Devi', village: 'Borsad', crop: 'Paddy / Wheat', kg: 700, status: 'Accepted', reliability: 98, color: 'bg-amber-700' },
    { name: 'Mohan Lal', village: 'Vasad', crop: 'Paddy', kg: 800, status: 'Accepted', reliability: 91, color: 'bg-sky-700' },
    { name: 'Lakshmi Bai', village: 'Kheda', crop: 'Paddy / Onion', kg: 300, status: 'Standby', reliability: 89, color: 'bg-stone-500' },
  ]
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Smallholder Cluster · 12 members</p>
            <h3 className="mt-1 font-serif text-2xl font-bold">Aggregated Farmer Roster</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOnboard && (
              <Button onClick={onOnboard}>
                <Plus className="size-4" /> Onboard Farmer
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                downloadCsv('agrilink-farmer-roster.csv', [
                  'Farmer ID',
                  'Full Name',
                  'Village',
                  'Registered Crops',
                  'Committed Volume (kg)',
                  'Harvest Window',
                  'Reliability Score',
                  'Commitment Status',
                  'Preferred Channel',
                  'Aadhaar KYC',
                ], [
                  ['FARM-001', 'Ramesh Kumar', 'Kheda', 'Paddy / Tomato', '500', '17–19 Oct 2025', '94% (14 settled)', 'Accepted', 'SMS + WhatsApp', 'Verified'],
                  ['FARM-002', 'Savitri Devi', 'Borsad', 'Paddy / Wheat', '700', '17–19 Oct 2025', '98% (21 settled)', 'Accepted', 'IVR Voice', 'Verified'],
                  ['FARM-003', 'Mohan Lal', 'Vasad', 'Paddy', '800', '18–20 Oct 2025', '91% (11 settled)', 'Accepted', 'WhatsApp', 'Verified'],
                  ['FARM-004', 'Lakshmi Bai', 'Kheda', 'Paddy / Onion', '300', '19–21 Oct 2025', '89% (Standby)', 'Standby (15% Buffer)', 'SMS', 'Verified'],
                  ['FARM-005', 'Dinesh Patel', 'Nadiad', 'Tomato / Chilli', '650', '20–22 Oct 2025', '92% (Standby)', 'Standby', 'IVR Voice', 'Verified'],
                  ['FARM-006', 'Meenaben Parmar', 'Petlad', 'Potato / Wheat', '900', '21–24 Oct 2025', '95% (Standby)', 'Standby', 'WhatsApp', 'Verified'],
                ])
              }}
            >
              <Download className="size-4" /> {t?.actionExportRoster || 'Export Roster (CSV)'}
            </Button>
            <Button onClick={onNotify} disabled={notified || busy}>
              {notified ? (
                <>
                  <Check className="size-4" /> {t?.actionFarmersNotified || 'Cascade sent'}
                </>
              ) : (
                <>
                  <Send className="size-4" /> {t?.actionNotifyFarmers || 'Trigger cascade'}
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {farmerList.map((farmer: any) => (
            <div key={farmer.id || farmer.name} className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4.5">
              <div className={`flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full ${farmer.color} font-mono text-xs font-bold text-primary-foreground`}>
                {farmer.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <p className="text-xs sm:text-sm font-semibold truncate">{farmer.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-700">
                    <Star className="size-2.5 fill-emerald-600 text-emerald-600" />
                    {farmer.reliability || 94}%
                  </span>
                </div>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">{farmer.village} · {farmer.crop} · harvest window 17–19 Oct</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs sm:text-sm font-semibold">{farmer.kg} kg</p>
                  <Badge tone={farmer.status === 'Standby' ? 'warn' : 'good'}>{farmer.status}</Badge>
                </div>
                {onCallFarmer && (
                  <button
                    type="button"
                    onClick={() =>
                      onCallFarmer(
                        {
                          id: farmer.id || `f-${farmer.name}`,
                          name: farmer.name,
                          mobile_number: farmer.mobile_number || farmer.phone || '+91 98251 44102',
                          village: farmer.village,
                          crop: farmer.crop,
                        },
                        Number(farmer.kg) || 500
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title="Initiate Bolna AI Outbound Voice Call to Farmer"
                  >
                    <PhoneCall className="size-3" />
                    <span className="hidden sm:inline">AI Call</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Notification Engine</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Bhashini + GSM Protocol
            </span>
          </div>
          <h3 className="mt-2 font-serif text-xl font-bold">Multi-Channel Alert Cascade</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Escalates automatically across channels until smallholders confirm harvest commitments:
          </p>

          {/* Cascade Tier Selector Tabs */}
          <div className="mt-4 flex rounded-xl bg-secondary/80 p-1 text-[11px] sm:text-xs font-semibold gap-0.5">
            <button
              type="button"
              onClick={() => setCascadeTier('sms')}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-lg transition-all ${
                cascadeTier === 'sms' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="size-3.5 shrink-0" />
              <span className="truncate">1. SMS</span>
            </button>
            <button
              type="button"
              onClick={() => setCascadeTier('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-lg transition-all ${
                cascadeTier === 'whatsapp' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="size-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">2. WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setCascadeTier('call')}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-lg transition-all ${
                cascadeTier === 'call' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PhoneCall className="size-3.5 text-primary shrink-0" />
              <span className="truncate">3. Voice Call</span>
            </button>
          </div>

          {/* Tier Content */}
          {cascadeTier === 'sms' && (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] font-semibold text-primary">SMS (Sender: VM-AGRILK)</span>
                <span className="text-[10px] text-muted-foreground">99.8% Feature Phone Delivery</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground shadow-inner">
                {smsMessage}
              </div>
              <p className="text-[11px] text-muted-foreground">
                T-0 mins: Works without mobile data. Free reply via shortcode 56767.
              </p>
            </div>
          )}

          {cascadeTier === 'whatsapp' && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCheck className="size-3.5 text-emerald-600" /> WhatsApp Business API
                </span>
                <span className="text-[10px] text-muted-foreground">Verified Green Badge</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 text-xs text-foreground space-y-2 shadow-inner">
                <p className="font-semibold text-primary">🌾 AgriLink Verified Harvest Alert</p>
                <p className="text-muted-foreground text-[11px]">
                  Namaste Rameshji, buyer <strong>PM POSHAN</strong> has locked a purchase demand for <strong>{crop}</strong> at guaranteed price <strong>₹{price}/kg</strong>.
                </p>
                <p className="text-muted-foreground text-[11px]">Your recommended allocation: <strong>500 KG</strong>.</p>
                <div className="pt-2 flex gap-2">
                  <span className="inline-flex flex-1 justify-center rounded-lg bg-emerald-600 text-white py-1.5 text-xs font-semibold">
                    ✅ 1. Accept 500 KG
                  </span>
                  <span className="inline-flex flex-1 justify-center rounded-lg bg-secondary text-muted-foreground py-1.5 text-xs font-semibold">
                    ❌ 2. Pass to Standby
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                T+5 mins: Triggers if SMS is unreplied. Farmer clicks one tap to lock allocation.
              </p>
            </div>
          )}

          {cascadeTier === 'call' && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <Volume2 className="size-3.5 text-amber-600 animate-pulse" /> Bhashini Outbound IVR
                </span>
                <span className="text-[10px] text-muted-foreground">AI Speech Synthesis</span>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-card p-3.5 text-xs text-foreground space-y-2 shadow-inner">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 text-amber-600" />
                  <span className="font-mono text-[11px]">Incoming Call: +91 1800-247-4546</span>
                </div>
                <p className="italic text-foreground/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-xs">
                  &quot;नमस्ते रमेशजी, आपके खेत के {crop} के लिए ₹{price} प्रति किलो का पक्का ऑर्डर उपलब्ध है। 500 किलो स्वीकार करने के लिए कृपया फोन पर 1 दबाएं।&quot;
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Keypress: 1 = Accept</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel()
                        const utterance = new SpeechSynthesisUtterance(
                          `नमस्ते रमेशजी, आपके खेत के लिए ₹${price} प्रति किलो का पक्का ऑर्डर उपलब्ध है। स्वीकार करने के लिए 1 दबाएं।`
                        )
                        utterance.lang = 'hi-IN'
                        utterance.rate = 0.95
                        window.speechSynthesis.speak(utterance)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Volume2 className="size-3" /> Play Call Demo
                  </button>
                </div>

                {onCallFarmer && (
                  <div className="pt-2.5 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground/80">Admin Outbound AI Calling:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onCallFarmer(
                          {
                            id: 'f-ramesh',
                            name: 'Ramesh Kumar',
                            mobile_number: '+91 98251 44102',
                            village: 'Kheda',
                            crop: crop,
                          },
                          500
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="Trigger Bolna AI Outbound Voice Call to Farmer"
                    >
                      <PhoneCall className="size-3.5" />
                      <span>Initiate Bolna AI Call</span>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                T+15 mins: Automated phone call. If no answer, shifts to Standby Buffer farmer automatically.
              </p>
            </div>
          )}
        </div>

        {/* 115% Standby Buffer Assurance */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold">Buffer Commitment Status</span>
            <span className="font-mono text-primary font-bold">115% Target (15% Standby)</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Standby smallholders (Lakshmi Bai, Dinesh Patel) are pre-notified on standby to prevent any institutional supply deficit.
          </p>
        </div>
      </Card>
    </div>
  )
}

function Collection({ role, order, farmerId, setFarmerId, weighedKg, setWeighedKg, aiResult, onCapturePhoto, onCollect, farmerTab = 'slip', setFarmerTab, busy, t }: any) {
  const crop = order?.crop || 'PADDY'

  if (role === 'Farmer') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setFarmerTab?.('slip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              farmerTab === 'slip'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <BadgeCheck className="size-4" />
            Official Quality Slip & Vouchers
          </button>
          <button
            type="button"
            onClick={() => setFarmerTab?.('camera')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              farmerTab === 'camera'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="size-4" />
            Camera-Assisted Quality Verification
          </button>
        </div>

        {farmerTab === 'camera' ? (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="relative size-14 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
                    <img
                      src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                      alt={crop}
                      className="size-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="live">Farmer Pre-Check Mode</Badge>
                      <Badge tone="good">Dual-Review Protocol</Badge>
                    </div>
                    <h3 className="mt-1 font-serif text-2xl font-bold">Camera-Assisted Quality Verification</h3>
                    <p className="text-xs text-muted-foreground">Capture timestamped produce lot photos to pair with physical QC coordinator inspection.</p>
                  </div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Camera className="size-5" />
                </div>
              </div>

              <GradeCamCamera onCapture={onCapturePhoto} disabled={busy} />

              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary shrink-0" />
                <p>
                  Dual-review protocol confirms your produce meets AGMARKNET Grade A standards before truck arrival, eliminating subjective depot deductions.
                </p>
              </div>
            </Card>

            <Card className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Verification verdict</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Dual-Check Protocol
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-bold">
                  {aiResult ? `Verified Result: Grade ${aiResult.grade}` : 'Ready for Visual Capture'}
                </h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Mini label="Visual Match" value={aiResult ? `${aiResult.confidence}%` : 'Awaiting image'} />
                  <Mini label="QC Protocol" value={aiResult?.status || 'PRE-CHECK'} />
                </div>
                <p className="mt-4 rounded-xl bg-secondary p-4 text-xs text-muted-foreground leading-relaxed">
                  {aiResult?.reasoning || 'Align camera with a clean sample of your harvest lot. Optical visual check captures surface defect perimeter and color uniformity for dual review.'}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4 flex items-center gap-3.5">
                <div className="relative size-14 shrink-0 rounded-xl bg-card p-1 border border-border flex items-center justify-center overflow-hidden">
                  <img src="/features/ai-gradecam.png" alt="Quality Verification" className="size-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Dual-Review Protection</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Dual QC coordinator sign-off protects farmers from post-delivery price renegotiation.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="relative size-14 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
                    <img
                      src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                      alt={crop}
                      className="size-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="live">Lot #LOT-1001</Badge>
                      <Badge tone="good">AGMARKNET Grade A</Badge>
                    </div>
                    <h3 className="mt-1 font-serif text-2xl font-bold">Official Quality Verification Slip</h3>
                    <p className="text-xs text-muted-foreground">Kheda collection depot · 500 kg weighed · Dual-Review Cleared</p>
                  </div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BadgeCheck className="size-5" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Dual-Review Protocol Assessment Record</p>
                    <p className="text-[11px] text-muted-foreground">Physical inspection by QC Coordinator Anita Desai · Visual match confirmed by Buyer</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600">PASSED · 98.4% QUALITY SCORE</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <span className="text-muted-foreground">Skin Defect Perimeter</span>
                    <p className="mt-1 font-mono text-sm font-semibold">0.8% (Allowed max 2.0%)</p>
                  </div>
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <span className="text-muted-foreground">Color Uniformity</span>
                    <p className="mt-1 font-mono text-sm font-semibold">96.2% Homogeneous</p>
                  </div>
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <span className="text-muted-foreground">Moisture Content</span>
                    <p className="mt-1 font-mono text-sm font-semibold">13.4% Standard Grade</p>
                  </div>
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <span className="text-muted-foreground">Net Weighed Volume</span>
                    <p className="mt-1 font-mono text-sm font-semibold text-primary">500 kg Confirmed</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Quality Certificate Attached</p>
                    <p className="text-[11px] text-emerald-700/80">30% advance of ₹4,200 released instantly on weighment.</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700">₹4,200 Paid</span>
              </div>
            </Card>

            <Card className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Verification verdict</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Dual Review Protocol
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-bold">Grade A Quality Assured</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Mini label="Visual Match" value="98.4%" />
                  <Mini label="Certificate Status" value="DUAL-SEALED" />
                </div>
                <p className="mt-4 rounded-xl bg-secondary p-4 text-xs text-muted-foreground leading-relaxed">
                  Dual-review inspection confirms Grade A produce. No middleman deduction for moisture or subjective grading disputes.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4 flex items-center gap-3.5">
                <div className="relative size-14 shrink-0 rounded-xl bg-card p-1 border border-border flex items-center justify-center overflow-hidden">
                  <img src="/features/ai-gradecam.png" alt="Quality Verification" className="size-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Dual-Review Digital Slip</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Quality record permanently linked to your e-RUPI passbook voucher.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3.5">
            <div className="relative size-14 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
              <img
                src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                alt={crop}
                className="size-full object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="live">Lot Inspection</Badge>
                <Badge tone="good">AGMARK Standard</Badge>
              </div>
              <h3 className="mt-1 font-serif text-2xl font-bold">Camera-Assisted Quality Verification</h3>
              <p className="text-xs text-muted-foreground">Ramesh Kumar · Kheda collection point · {crop}</p>
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Camera className="size-5" />
          </div>
        </div>

        <GradeCamCamera onCapture={onCapturePhoto} disabled={busy} />

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Weighed quantity (kg)
            <input
              type="number"
              value={weighedKg}
              onChange={(e) => setWeighedKg(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-primary"
            />
          </label>
          <Button onClick={onCollect} disabled={busy}>
            <BadgeCheck className="size-4" /> {t?.actionAcceptLot || 'Accept lot & disburse 30% advance'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Verification verdict</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Dual Review Protocol
            </span>
          </div>
          <h3 className="mt-2 font-serif text-xl font-bold">Dual-Review Clearance: Grade {aiResult?.grade || 'A'}</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Mini label="Visual Match" value={`${aiResult?.confidence || 91}%`} />
            <Mini label="QC Status" value={aiResult?.status || 'DUAL-VERIFIED'} />
          </div>
          <p className="mt-4 rounded-xl bg-secondary p-4 text-xs text-muted-foreground leading-relaxed">
            {aiResult?.reasoning || 'Optical surface inspection matched with physical sample check by depot QC coordinator. Produce cleared under AGMARK Grade A tolerances.'}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4 flex items-center gap-3.5">
          <div className="relative size-14 shrink-0 rounded-xl bg-card p-1 border border-border flex items-center justify-center overflow-hidden">
            <img src="/features/ai-gradecam.png" alt="Quality Verification" className="size-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold">Dual-Review Quality Guarantee</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Dual QC coordinator sign-off and visual timestamp log protect both farmer and buyer from depot disputes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function RoutesScreen({ role, order, onDispatch, onDeliver, busy, onPrintWaybill, t }: any) {
  const crop = (order?.crop || 'Paddy (Rice)').toUpperCase()
  const targetKg = Number(order?.targetKg || order?.qty_target_kg || 1000)
  const standbyKg = Math.round(targetKg * 0.15)
  const totalCargoKg = targetKg + standbyKg

  let vehicleName = 'Tata Ace CNG (GJ-07-TY-4912)'
  let maxCapKg = 850
  let fuelType = 'CNG Green Freight'
  if (totalCargoKg > 1400) {
    vehicleName = 'Eicher Pro 2049 (GJ-07-BB-8819)'
    maxCapKg = 2500
    fuelType = 'Clean Diesel (BS-VI)'
  } else if (totalCargoKg > 800) {
    vehicleName = 'Mahindra Bolero Maxi Truck (GJ-07-MK-5501)'
    maxCapKg = 1400
    fuelType = 'Clean Diesel (BS-VI)'
  }

  const loadFactor = Math.min(100, Math.round((totalCargoKg / maxCapKg) * 100))
  const routeStops = [
    { id: 'depot', kind: 'DEPOT' as const, label: 'Kheda FPO Collection Hub', detail: 'Vehicle Departure · 06:30 AM', lat: 22.7533, lng: 72.6841, kg: 0 },
    { id: 'f1', kind: 'PICKUP' as const, label: 'Pickup #1: Ramesh Kumar', detail: 'Kheda Village · 500 kg Primary', lat: 22.75, lng: 72.69, kg: Math.min(500, targetKg) },
    { id: 'f2', kind: 'PICKUP' as const, label: 'Pickup #2: Savitri Devi', detail: 'Borsad Village · 500 kg Primary', lat: 22.4118, lng: 72.9022, kg: Math.min(500, Math.max(0, targetKg - 500)) || 300 },
    { id: 'f3', kind: 'PICKUP' as const, label: 'Pickup #3: Mohan Lal', detail: `Vasad Village · +${standbyKg} kg Standby Buffer`, lat: 22.4705, lng: 73.0722, kg: standbyKg },
    { id: 'drop', kind: 'DROP' as const, label: 'Buyer Drop: Central Kitchen', detail: `${order?.delivery_location || 'PM POSHAN Central Kitchen, Anand'} · ${totalCargoKg} kg`, lat: 22.5645, lng: 72.9289, kg: totalCargoKg },
  ]
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <Card className="overflow-hidden p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="good">TSP 2-Opt · 22.4 km (31% fuel saved)</Badge>
              <Badge tone="muted">{vehicleName} ({loadFactor}% load)</Badge>
            </div>
            <h3 className="mt-2 font-serif text-2xl font-bold">
              {role === 'Buyer' ? 'Consignment live tracking' : 'Consignment manifest'}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onPrintWaybill}>
              <Printer className="size-4" /> {t?.actionPrintWaybill || 'Print Bill of Lading (PDF)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                downloadCsv(`agrilink-manifest-${order?.code || 'AG-1001'}.csv`, [
                  'Stop #',
                  'Stop Type',
                  'Location / Contact',
                  'Phone Number',
                  'GPS Coordinates',
                  'Cargo Weight (kg)',
                  'Crop Type',
                  'Est. Arrival',
                  'Vehicle Assigned',
                ], [
                  ['1', 'DEPOT', 'Kheda FPO Collection Hub', '+91 98251 00000', '22.7533, 72.6841', '0 kg', crop, '06:30 AM', vehicleName],
                  ['2', 'PICKUP', 'Ramesh Kumar (Kheda Village)', '+91 98251 44102', '22.7500, 72.6900', `${Math.min(500, targetKg)} kg`, crop, '07:15 AM', vehicleName],
                  ['3', 'PICKUP', 'Savitri Devi (Borsad Village)', '+91 98250 88219', '22.4118, 72.9022', `${Math.min(500, Math.max(0, targetKg - 500)) || 300} kg`, crop, '08:00 AM', vehicleName],
                  ['4', 'PICKUP', 'Mohan Lal (Vasad Village - Standby)', '+91 98251 55667', '22.4705, 73.0722', `${standbyKg} kg`, crop, '08:45 AM', vehicleName],
                  ['5', 'DROP', 'PM POSHAN Central Kitchen (Anand)', '+91 98252 77103', '22.5645, 72.9289', `${totalCargoKg} kg`, crop, '09:30 AM', vehicleName],
                ])
              }}
            >
              <Download className="size-4" /> {t?.actionExportManifest || 'Export Manifest (CSV)'}
            </Button>
          </div>
        </div>
        <div className="h-[340px] w-full">
          <RouteMap stops={routeStops} />
        </div>
      </Card>
      <Card className="p-6 flex flex-col justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {role === 'Buyer' ? 'Shipment Verification' : 'Dispatch & Delivery'}
          </p>
          <h3 className="mt-2 font-serif text-xl font-bold">
            {role === 'Buyer' ? 'Consignment arrival actions' : 'Consignment actions'}
          </h3>
          <div className="mt-6 space-y-3">
            {role === 'Buyer' ? (
              <>
                <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Carrier Status</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                      <Truck className="size-3.5" /> En Route to Destination
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vehicle Assigned</span>
                    <span className="font-mono font-medium">Tata Ace (GJ-07-TY-4912)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Drop-Off</span>
                    <span className="font-semibold">09:15 AM (On Schedule)</span>
                  </div>
                </div>
                <Button onClick={onDeliver} disabled={busy} className="w-full">
                  <Check className="size-4" /> Confirm Buyer Delivery & Release Escrow
                </Button>
              </>
            ) : (
              <>
                <Button onClick={onDispatch} disabled={busy}>
                  <Truck className="size-4" /> {t?.actionDispatch || 'Dispatch vehicle (₹1,200)'}
                </Button>
                <Button variant="secondary" onClick={onDeliver} disabled={busy}>
                  <Check className="size-4" /> {t?.actionConfirmDelivery || 'Confirm buyer delivery & settle'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-4 flex items-center gap-3.5">
          <div className="relative size-14 shrink-0 rounded-xl bg-card p-1 border border-border flex items-center justify-center overflow-hidden">
            <img src="/features/agro-logistics.png" alt="Agro Logistics" className="size-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold">Multi-Stop Agro-Logistics</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Automated route clustering saves 31% transport cost and eliminates farmgate transit delay.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Settlements({ role, order, buyer, onPrintInvoice, t }: any) {
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const farmerQty = 500
  const farmerGross = farmerQty * price
  const farmerAdvance = Math.round(farmerGross * 0.3)
  const farmerTransport = Math.round(farmerGross * 0.04)
  const farmerNet = farmerGross - farmerAdvance - farmerTransport

  const buyerQty = 1200
  const buyerSubtotal = buyerQty * price
  const fpoMargin = Math.round(buyerSubtotal * 0.04)
  const buyerTotal = buyerSubtotal + fpoMargin

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <div className="border-b border-border p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="good">{role === 'Buyer' ? 'APMC Tax Invoice' : 'Official Sale Receipt'}</Badge>
                <Badge tone="muted">NPCI Escrow Cleared</Badge>
              </div>
              <h3 className="mt-2 font-serif text-2xl font-bold">
                {role === 'Buyer' ? `APMC Invoice · ${buyer?.name || 'School Kitchen'}` : 'Farmer Receipt · Ramesh Kumar'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {role === 'Buyer'
                  ? `INV-2025-0891 · ${buyerQty} kg ${crop} · Direct Farm Sourcing`
                  : `LOT-1001 · Grade A · ${farmerQty} kg ${crop} · Verified e-RUPI Payout`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={onPrintInvoice}>
                <Printer className="size-4" /> {t?.actionPrintInvoice || 'Print APMC Invoice (PDF)'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  downloadCsv(`agrilink-settlement-ledger-${order?.code || 'AG-1001'}.csv`, [
                    'Order Reference',
                    'Lot ID',
                    'Entity',
                    'Crop',
                    'Grade',
                    'Weight (kg)',
                    'Unit Rate (INR)',
                    'Gross Value (INR)',
                    'Advance / Escrow (INR)',
                    'Net Settlement (INR)',
                    'Status',
                  ], [
                    [order?.code || 'AG-1001', 'LOT-1001-KHD', role === 'Buyer' ? (buyer?.name || 'PM POSHAN Kitchen') : 'Ramesh Kumar', crop, 'Grade A', role === 'Buyer' ? buyerQty : farmerQty, price, role === 'Buyer' ? buyerTotal : farmerGross, role === 'Buyer' ? buyerTotal : farmerAdvance, role === 'Buyer' ? 0 : farmerNet, 'Settled & Cleared'],
                  ])
                }}
              >
                <Download className="size-4" /> {t?.actionExportLedger || 'Export Ledger (CSV)'}
              </Button>
            </div>
          </div>
        </div>

        {role === 'Buyer' ? (
          <div className="space-y-4 p-6">
            <Line label="Billed produce quantity" value={`${buyerQty} kg`} />
            <Line label="Direct farm contract rate" value={`× ₹${price}/kg`} />
            <Line label="Produce subtotal" value={`₹${buyerSubtotal.toLocaleString()}`} strong />
            <Line label="FPO collection & grading service fee (4%)" value={`+ ₹${fpoMargin.toLocaleString()}`} />
            <div className="border-t border-border pt-4">
              <Line label="Total invoice amount payable" value={`₹${buyerTotal.toLocaleString()}`} strong />
            </div>
            <Line label="Advance escrow deposit locked" value={`− ₹${buyerTotal.toLocaleString()}`} />
            <div className="border-t border-border pt-4">
              <Line label="Outstanding buyer balance" value="₹0 (Fully Funded in Escrow)" strong />
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <Line label="Accepted weight" value={`${farmerQty} kg`} />
            <Line label="Agreed price" value={`× ₹${price}/kg`} />
            <Line label="Gross lot value" value={`₹${farmerGross.toLocaleString()}`} strong />
            <Line label="Collection advance paid (30%)" value={`− ₹${farmerAdvance.toLocaleString()}`} />
            <Line label="Transport share allocated" value={`− ₹${farmerTransport.toLocaleString()}`} />
            <div className="border-t border-border pt-4">
              <Line label="Net final payable to farmer" value={`₹${farmerNet.toLocaleString()}`} strong />
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-6">
        <PriceProof crop={crop} price={price} />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
              <img src="/features/digital-escrow.png" alt="Digital Escrow" className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="live">NPCI Auto-Clearing</Badge>
              </div>
              <h4 className="mt-1.5 font-serif text-lg font-bold">
                {role === 'Buyer' ? 'Escrow Protected Payment' : 'Instant e-RUPI Settlement'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {role === 'Buyer'
                  ? 'Buyer funds remain locked in digital escrow until delivery acceptance sign-off. Zero counterparty risk.'
                  : 'Funds unlock from escrow upon buyer drop-point acceptance. Zero middleman float.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-serif text-xl font-bold text-primary' : 'font-mono font-medium'}>{value}</span>
    </div>
  )
}
