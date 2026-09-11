'use client'

import { useAgriLink } from '@/lib/hooks/use-agrilink'
import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, Bell, Camera, Check, ChevronDown, ChevronRight,
  CircleDollarSign, ClipboardList, Cloud, Droplets, LayoutDashboard, Leaf, MapPin, Menu, PackageCheck,
  Phone, Plus, Receipt, RefreshCw, Route, Send, ShieldCheck, Smartphone, Sprout, Truck, Users, Wheat, X
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { GradeCamCamera } from './gradecam-camera'
import { RouteMap } from './route-map'

type Role = 'Coordinator' | 'Buyer' | 'Farmer'
type Screen = 'Overview' | 'Orders' | 'Farmer network' | 'Collection & grade' | 'Routes' | 'Settlements'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Orders', icon: ClipboardList, count: '03' },
  { label: 'Farmer network', icon: Users },
  { label: 'Collection & grade', icon: Camera },
  { label: 'Routes', icon: Route },
  { label: 'Settlements', icon: CircleDollarSign },
]
const channels = ['SMS', 'WhatsApp', 'IVR voice', 'Coordinator list']

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
function Button({ children, onClick, variant = 'primary', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : variant === 'secondary'
          ? 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
          : 'text-primary hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export function AgriLinkDashboard() {
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

  const [role, setRole] = useState<Role>('Coordinator')
  const [activeNav, setActiveNav] = useState<Screen>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  // Form states
  const [postedCrop, setPostedCrop] = useState('PADDY')
  const [postedQty, setPostedQty] = useState('1000')
  const [postedPrice, setPostedPrice] = useState('28')

  // Grading & Collection states
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ status: string; grade: string; confidence: number; reasoning: string } | null>(null)
  const [selectedFarmerId, setSelectedFarmerId] = useState('f0000000-0000-0000-0000-000000000001')
  const [weighedKg, setWeighedKg] = useState('500')

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
    Buyer: ['Overview', 'Orders', 'Settlements'],
    Farmer: ['Overview', 'Farmer network', 'Collection & grade', 'Settlements'],
  }

  const handleNotify = async () => {
    if (!activeOrder) return
    setActionBusy(true)
    try {
      await notifyOrder(activeOrder.id)
      setActionMessage('Four-tier notification cascade dispatched to matched farmers!')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Notification failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleCreateOrder = async () => {
    setActionBusy(true)
    try {
      await createOrder({
        crop: postedCrop,
        qtyTargetKg: Number(postedQty),
        pricePerKg: Number(postedPrice),
        deliveryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      })
      setShowOrderForm(false)
      setActionMessage('New order posted successfully to AgriLink registry!')
      go('Orders')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Order posting failed')
    } finally {
      setActionBusy(false)
    }
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
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Delivery confirmation failed')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Brand />
        <Sidebar activeNav={activeNav} role={role} go={go} roleNav={roleNav} volumePct={data?.metrics.pilotVolumePct || 77} />
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AgriLink Pilot · Live Engine</p>
              <h1 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
                Good morning, {role === 'Farmer' ? 'Ramesh' : role === 'Buyer' ? 'Meera' : 'Anita'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => refresh()} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" title="Refresh data">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <label className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3 pr-2 text-sm">
              <span className="hidden sm:inline text-muted-foreground">View as</span>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role)
                  setActiveNav('Overview')
                }}
                className="bg-transparent font-semibold outline-none"
              >
                <option>Coordinator</option>
                <option>Buyer</option>
                <option>Farmer</option>
              </select>
              <ChevronDown className="size-3 text-muted-foreground" />
            </label>
          </div>
        </header>

        {actionMessage && (
          <div className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium sm:mx-8 lg:mx-10">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-primary hover:opacity-70">
              <X className="size-4" />
            </button>
          </div>
        )}

        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMenuOpen(false)}>
            <div className="h-full w-72 border-r border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-8 flex items-center gap-3">
                <Brand />
                <button className="ml-auto" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <Sidebar activeNav={activeNav} role={role} go={go} roleNav={roleNav} volumePct={data?.metrics.pilotVolumePct || 77} mobile />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
          <ScreenHeader role={role} activeNav={activeNav} onNew={() => setShowOrderForm(true)} onReset={resetData} />

          {showOrderForm && (
            <OrderForm
              crop={postedCrop}
              setCrop={setPostedCrop}
              qty={postedQty}
              setQty={setPostedQty}
              price={postedPrice}
              setPrice={setPostedPrice}
              onClose={() => setShowOrderForm(false)}
              onPost={handleCreateOrder}
              busy={actionBusy}
            />
          )}

          {activeNav === 'Overview' && (
            <Overview
              order={activeOrder}
              buyer={activeBuyer}
              committed={committed}
              target={target}
              progress={progress}
              notified={activeOrder?.status !== 'POSTED'}
              onNotify={handleNotify}
              onOrder={() => setShowOrderForm(true)}
              onRoute={() => go('Routes')}
              busy={actionBusy}
            />
          )}

          {activeNav === 'Orders' && (
            <Orders
              role={role}
              order={activeOrder}
              buyer={activeBuyer}
              onNew={() => setShowOrderForm(true)}
              notified={activeOrder?.status !== 'POSTED'}
              onNotify={handleNotify}
              busy={actionBusy}
            />
          )}

          {activeNav === 'Farmer network' && (
            <Network notified={activeOrder?.status !== 'POSTED'} onNotify={handleNotify} busy={actionBusy} />
          )}

          {activeNav === 'Collection & grade' && (
            <Collection
              order={activeOrder}
              farmerId={selectedFarmerId}
              setFarmerId={setSelectedFarmerId}
              weighedKg={weighedKg}
              setWeighedKg={setWeighedKg}
              aiResult={aiResult}
              onCapturePhoto={handleGradePhoto}
              onCollect={handleCollectLot}
              busy={actionBusy}
            />
          )}

          {activeNav === 'Routes' && (
            <RoutesScreen order={activeOrder} onDispatch={handleDispatch} onDeliver={handleDeliver} busy={actionBusy} />
          )}

          {activeNav === 'Settlements' && <Settlements role={role} order={activeOrder} buyer={activeBuyer} />}
        </div>
      </main>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 p-6 border-b border-border">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Sprout className="size-6" />
      </div>
      <div>
        <div className="font-serif text-xl font-bold tracking-tight text-foreground">AgriLink</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">FARM TO COMMONS</div>
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
}: {
  activeNav: Screen
  role: Role
  go: (s: Screen) => void
  roleNav: Record<Role, Screen[]>
  volumePct: number
  mobile?: boolean
}) {
  const [ordersExpanded, setOrdersExpanded] = useState(false)

  return (
    <div className={`flex ${mobile ? 'flex-col' : 'flex-1 flex-col justify-between'} px-3 py-6`}>
      <nav className="space-y-1">
        <div className="mb-4 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {role} workspace
        </div>
        {navItems
          .filter((item) => roleNav[role].includes(item.label as Screen))
          .map(({ label, icon: Icon, count }) => {
            const isBuyerOrders = role === 'Buyer' && label === 'Orders'
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
                    {label}
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

      {!mobile && (
        <div className="rounded-2xl border border-border bg-secondary/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pilot volume</span>
            <span className="size-2 rounded-full bg-primary" />
          </div>
          <div className="mb-2 text-2xl font-semibold tracking-tight">{volumePct}%</div>
          <p className="text-xs leading-5 text-muted-foreground">of weekly FPO produce volume moved through AgriLink.</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${volumePct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function ScreenHeader({
  role,
  activeNav,
  onNew,
  onReset,
}: {
  role: Role
  activeNav: Screen
  onNew: () => void
  onReset: () => void
}) {
  const copy: Record<Screen, string> = {
    Overview: 'Demand finds the harvest.',
    Orders: 'Orders before harvest.',
    'Farmer network': 'The crop registry, activated.',
    'Collection & grade': 'Trust at the collection point.',
    Routes: 'Every lot has a route.',
    Settlements: 'Transparent money movement.',
  }
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
        <button
          onClick={onReset}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
          title="Reset database seed data"
        >
          Reset seed
        </button>
        {(role === 'Buyer' || role === 'Coordinator') && (
          <Button onClick={onNew}>
            <Plus className="size-4" /> New order
          </Button>
        )}
      </div>
    </div>
  )
}

function Overview({
  order,
  buyer,
  committed,
  target,
  progress,
  notified,
  onNotify,
  onOrder,
  onRoute,
  busy,
}: {
  order: any
  buyer: any
  committed: number
  target: number
  progress: number
  notified: boolean
  onNotify: () => void
  onOrder: () => void
  onRoute: () => void
  busy: boolean
}) {
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          title="Active order value"
          value={`₹${(target * price).toLocaleString()}`}
          detail={`${buyer?.name || 'School Kitchen'} · ${target} kg`}
          trend="Live order"
          icon={<CircleDollarSign className="size-5" />}
        />
        <Stat
          title="Committed volume"
          value={`${committed} kg`}
          detail={`${target} kg target · 15% buffer`}
          trend={`${progress}% filled`}
          icon={<Wheat className="size-5" />}
        />
        <Stat
          title="Farmer realised"
          value={`₹${price}/kg`}
          detail="vs ₹22 AGMARKNET mandi price"
          trend="+27.2%"
          icon={<Leaf className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex flex-col justify-between gap-3 border-b border-border p-6 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge>{order?.code || '#AG-1001'}</Badge>
                <Badge tone="live">{order?.status || 'POSTED'}</Badge>
              </div>
              <h3 className="font-serif text-2xl font-bold">{crop} · {buyer?.name || 'Institutional Kitchen'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Delivery {order?.deliveryDate || '2025-10-20'} · {target} kg at ₹{price}/kg
              </p>
            </div>
            <Button onClick={onNotify} disabled={notified || busy}>
              {notified ? (
                <>
                  <Check className="size-4" /> Farmers notified
                </>
              ) : (
                <>
                  <Send className="size-4" /> Notify matched farmers
                </>
              )}
            </Button>
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Commitment tracker</p>
                <p className="mt-1 text-xs text-muted-foreground">Target volume with 15% standby buffer</p>
              </div>
              <span className="font-mono text-sm font-semibold text-primary">
                {committed} / {target} kg
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0 kg</span>
              <span>Target {target}</span>
              <span>Buffer {Math.round(target * 1.15)}</span>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Mini label="Accepted" value={`${committed} kg`} />
              <Mini label="Standby buffer" value={`${Math.round(target * 0.15)} kg`} />
              <Mini label="Cascade response" value="94%" />
            </div>
          </div>
        </Card>

        <Cascade notified={notified} onNotify={onNotify} busy={busy} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <PriceProof crop={crop} price={price} />
        <CollectionRunway onRoute={onRoute} />
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
}) {
  return (
    <Card className="mb-8 border-primary/40 p-6 shadow-md">
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
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Crop
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none focus:border-primary">
            <option value="PADDY">Paddy (Rice)</option>
            <option value="TOMATO">Tomato</option>
            <option value="MAIZE">Maize</option>
            <option value="CHILLI">Chilli</option>
            <option value="GROUNDNUT">Groundnut</option>
          </select>
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
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onPost} disabled={busy}>
          <ClipboardList className="size-4" /> {busy ? 'Posting order…' : 'Post order to registry'}
        </Button>
      </div>
    </Card>
  )
}

function Orders({ role, order, buyer, onNew, notified, onNotify, busy }: any) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card>
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge tone="live">{order?.code || 'Order #AG-1001'}</Badge>
              <h3 className="mt-3 font-serif text-2xl font-bold">{order?.crop || 'PADDY'} · {buyer?.name || 'School Kitchen'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {order?.qtyTargetKg || 1000} kg · delivery {order?.deliveryDate || '2025-10-20'} · ₹{order?.pricePerKg || 28}/kg
              </p>
            </div>
            <PackageCheck className="size-8 text-primary" />
          </div>
        </div>
        <div className="space-y-4 p-6">
          <Step done={true} title="Demand committed" detail="Buyer contract posted & 15% advance reserved" />
          <Step
            done={notified}
            title="Farmers notified"
            detail={notified ? 'Four-tier notification cascade completed' : 'Trigger SMS, WhatsApp & IVR to nearby registered farmers'}
            action={!notified ? <Button onClick={onNotify} disabled={busy}><Send className="size-4" /> Notify</Button> : undefined}
          />
          <Step done={false} title="GradeCam inspection" detail="Collection point visual quality assessment" />
          <Step done={false} title="Delivery inspection" detail="Binding buyer acceptance at drop point" />
        </div>
      </Card>

      <Card className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Order details</p>
        <h3 className="mt-2 font-serif text-xl font-bold">Demand before harvest</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          AgriLink matches buyer commitments to smallholder plot harvest windows before produce is picked.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Mini label="Buyer type" value={buyer?.type || 'Institutional'} />
          <Mini label="Status" value={order?.status || 'POSTED'} />
        </div>
      </Card>
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

function Network({ notified, onNotify, busy }: any) {
  const farmers = [
    { name: 'Ramesh Kumar', village: 'Kheda', kg: 500, status: 'Accepted', color: 'bg-primary' },
    { name: 'Savitri Devi', village: 'Borsad', kg: 700, status: 'Accepted', color: 'bg-amber-700' },
    { name: 'Mohan Lal', village: 'Vasad', kg: 800, status: 'Accepted', color: 'bg-sky-700' },
    { name: 'Lakshmi Bai', village: 'Kheda', kg: 300, status: 'Standby', color: 'bg-stone-500' },
  ]
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card>
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Crop registry · 12 members</p>
            <h3 className="mt-2 font-serif text-2xl font-bold">Matched farmers</h3>
          </div>
          <Button onClick={onNotify} disabled={notified || busy}>
            {notified ? (
              <>
                <Check className="size-4" /> Cascade sent
              </>
            ) : (
              <>
                <Send className="size-4" /> Notify matched
              </>
            )}
          </Button>
        </div>
        <div className="divide-y divide-border">
          {farmers.map((farmer) => (
            <div key={farmer.name} className="flex items-center gap-4 p-4.5">
              <div className={`flex size-10 items-center justify-center rounded-full ${farmer.color} font-mono text-xs font-bold text-primary-foreground`}>
                {farmer.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{farmer.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{farmer.village} · harvest window 17–19 Oct</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold">{farmer.kg} kg</p>
                <Badge tone={farmer.status === 'Standby' ? 'warn' : 'good'}>{farmer.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Matching engine</p>
        <h3 className="mt-2 font-serif text-xl font-bold">115% commitment cascade</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Commitments accumulate to 115% of buyer demand. The extra 15% forms a standby buffer so buyers never face shortfalls.
        </p>
      </Card>
    </div>
  )
}

function Collection({ order, farmerId, setFarmerId, weighedKg, setWeighedKg, aiResult, onCapturePhoto, onCollect, busy }: any) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Badge>Lot Inspection</Badge>
            <h3 className="mt-3 font-serif text-2xl font-bold">GradeCam visual quality check</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ramesh Kumar · Kheda collection point</p>
          </div>
          <Camera className="size-7 text-primary" />
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
            <BadgeCheck className="size-4" /> Accept lot & disburse 30% advance
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">GradeCam verdict</p>
        <h3 className="mt-2 font-serif text-xl font-bold">AI Proposed: Grade {aiResult?.grade || 'A'}</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Mini label="Confidence" value={`${aiResult?.confidence || 91}%`} />
          <Mini label="Status" value={aiResult?.status || 'GRADED'} />
        </div>
        <p className="mt-4 rounded-xl bg-secondary p-4 text-xs text-muted-foreground">
          {aiResult?.reasoning || 'Optical surface inspection confirms uniform size and quality meeting AGMARK Grade A standards.'}
        </p>
      </Card>
    </div>
  )
}

function RoutesScreen({ order, onDispatch, onDeliver, busy }: any) {
  const routeStops = [
    { id: 'depot', kind: 'DEPOT' as const, label: 'Kheda FPO Depot', detail: 'Collection Depot', lat: 22.75, lng: 72.68 },
    { id: 'f1', kind: 'PICKUP' as const, label: 'Pickup #1', detail: 'Ramesh Kumar · 500 kg', lat: 22.72, lng: 72.71, kg: 500 },
    { id: 'f2', kind: 'PICKUP' as const, label: 'Pickup #2', detail: 'Savitri Devi · 700 kg', lat: 22.41, lng: 72.9, kg: 700 },
    { id: 'drop', kind: 'DROP' as const, label: 'Buyer Drop Point', detail: 'Central Kitchen', lat: 22.57, lng: 72.95, kg: 1200 },
  ]
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <Card className="overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Badge tone="good">Optimised Route · 18.4 km</Badge>
            <h3 className="mt-2 font-serif text-2xl font-bold">Consignment manifest</h3>
          </div>
          <Route className="size-7 text-primary" />
        </div>
        <div className="h-[340px] w-full">
          <RouteMap stops={routeStops} />
        </div>
      </Card>
      <Card className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dispatch & Delivery</p>
        <h3 className="mt-2 font-serif text-xl font-bold">Consignment actions</h3>
        <div className="mt-6 space-y-3">
          <Button onClick={onDispatch} disabled={busy}>
            <Truck className="size-4" /> Dispatch vehicle (₹1,200)
          </Button>
          <Button variant="secondary" onClick={onDeliver} disabled={busy}>
            <Check className="size-4" /> Confirm buyer delivery & settle
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Settlements({ role, order, buyer }: any) {
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const qty = 500
  const gross = qty * price
  const advance = Math.round(gross * 0.3)
  const transport = Math.round(gross * 0.04)
  const net = gross - advance - transport

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge tone="good">Official Sale Receipt</Badge>
              <h3 className="mt-3 font-serif text-2xl font-bold">Farmer Receipt · Ramesh Kumar</h3>
              <p className="mt-1 text-sm text-muted-foreground">LOT-1001 · Grade A · {qty} kg {crop}</p>
            </div>
            <Receipt className="size-8 text-primary" />
          </div>
        </div>
        <div className="space-y-4 p-6">
          <Line label="Accepted weight" value={`${qty} kg`} />
          <Line label="Agreed price" value={`× ₹${price}/kg`} />
          <Line label="Gross lot value" value={`₹${gross.toLocaleString()}`} strong />
          <Line label="Collection advance paid (30%)" value={`− ₹${advance.toLocaleString()}`} />
          <Line label="Transport share allocated" value={`− ₹${transport.toLocaleString()}`} />
          <div className="border-t border-border pt-4">
            <Line label="Net final payable to farmer" value={`₹${net.toLocaleString()}`} strong />
          </div>
        </div>
      </Card>
      <PriceProof crop={crop} price={price} />
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
