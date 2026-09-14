'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BadgeCheck, Boxes, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock, HelpCircle, Layers, Leaf, MapPin, PhoneCall,
  QrCode, RefreshCw, Route, ShieldCheck, Smartphone, Sparkles, Sprout,
  Star, TrendingUp, Truck, Users, Wallet, Zap, Menu, X
} from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'

const verifiedCrops = [
  { name: 'Tomato', img: '/crops/tomato.png', grade: 'Grade A', volume: '1,200 kg', region: 'Petlad & Boriavi' },
  { name: 'Wheat', img: '/crops/wheat.png', grade: 'Grade A', volume: '1,500 kg', region: 'Vasad & Borsad' },
  { name: 'Paddy (Rice)', img: '/crops/paddy.png', grade: 'Grade A', volume: '1,200 kg', region: 'Anand & Kheda' },
  { name: 'Onion', img: '/crops/onion.png', grade: 'Grade A', volume: '800 kg', region: 'Anklav & Vaso' },
  { name: 'Potato', img: '/crops/potato.png', grade: 'Grade B', volume: '950 kg', region: 'Bakrol & Petlad' },
]

type FeatureTab = 'gradecam' | 'logistics' | 'escrow' | 'trust'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<FeatureTab>('gradecam')
  const [monthlyVolumeKg, setMonthlyVolumeKg] = useState(15000)
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agrilink_user_name')
        if (cached) setLoggedInUser(cached)
        const cachedRole = localStorage.getItem('agrilink_user_role')
        if (cachedRole) setUserRole(cachedRole)
      } catch {}
    }

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
                setLoggedInUser(res.profile.full_name)
                try { localStorage.setItem('agrilink_user_name', res.profile.full_name) } catch {}
              }
              if (res.profile?.role) {
                const mappedRole = res.profile.role === 'admin' ? 'Coordinator' : res.profile.role === 'buyer' ? 'Buyer' : 'Farmer'
                setUserRole(mappedRole)
                try { localStorage.setItem('agrilink_user_role', mappedRole) } catch {}
              }
            })
            .catch(() => {})
        }
      }).catch(() => {})
    } catch {}
  }, [])

  // Dynamic ROI calculations based on monthly procurement volume
  const roi = useMemo(() => {
    const mandiSpoilageLossKg = monthlyVolumeKg * 0.24 // 24% typical mandi transit spoilage
    const agrilinkSpoilageLossKg = monthlyVolumeKg * 0.038 // 3.8% cold-chain direct
    const savedProduceKg = Math.round(mandiSpoilageLossKg - agrilinkSpoilageLossKg)
    const avgPricePerKg = 24 // ₹24 average weighted basket price
    const monthlyCostSavings = Math.round(savedProduceKg * avgPricePerKg)
    const farmerIncomeUplift = Math.round(monthlyVolumeKg * avgPricePerKg * 0.182) // +18.2% direct realization
    const co2AvoidedKg = Math.round(savedProduceKg * 0.62) // greenhouse gas from rot prevention

    return {
      savedProduceKg,
      monthlyCostSavings,
      farmerIncomeUplift,
      co2AvoidedKg,
    }
  }, [monthlyVolumeKg])

  const featureDetails: Record<
    FeatureTab,
    {
      badge: string
      title: string
      subtitle: string
      description: string
      img: string
      stats: Array<{ label: string; val: string }>
      points: string[]
    }
  > = {
    gradecam: {
      badge: 'AI Vision Quality Inspection',
      title: 'GradeCam™ Computer Vision',
      subtitle: 'AI-suggested grades, confirmed by a person at the collection point',
      description:
        'Fewer grading disputes: a vision-language model grades a photo of each lot against AGMARK criteria and lists the defects it can see. Below 60% confidence it steps aside and the FPO coordinator grades by hand; any change to the AI grade is recorded with a reason.',
      img: '/features/ai-gradecam.png',
      stats: [
        { label: 'Grades', val: 'A · B · C' },
        { label: 'Final say', val: 'Coordinator' },
        { label: 'Unsure AI', val: 'Manual grade' },
      ],
      points: [
        'Visible defects listed with a confidence score',
        'Grades mapped to AGMARK classes (A ≈ Class I, B ≈ Class II)',
        'Photo, AI verdict and any override kept with the lot',
      ],
    },
    logistics: {
      badge: 'Dynamic Supply Logistics',
      title: 'Smart Multi-Stop Aggregation',
      subtitle: 'Collection runs planned from farmer commitments',
      description:
        'Orders delivering on the same day share vehicles when that is cheaper. Each run visits every farm before any drop, is sequenced to cut kilometres, and uses the smallest vehicle that carries the load; transport cost is then split across lots by weight.',
      img: '/features/agro-logistics.png',
      stats: [
        { label: 'Sequencing', val: '2-opt' },
        { label: 'Consolidation', val: 'Savings' },
        { label: 'Cost split', val: 'By kg' },
      ],
      points: [
        'Pickups before drops on every vehicle run',
        'Right-sized vehicle class for each consolidated load',
        'Route and cost compared with sending each order alone',
      ],
    },
    escrow: {
      badge: 'Transparent Settlement',
      title: 'Advance & Digital Passbook',
      subtitle: 'Harvest-day advances for farmers, pay-for-what-you-accept for buyers',
      description:
        'Buyers commit an advance to the FPO’s bank account before farmers are asked to harvest. Farmers receive an advance when their lot is accepted at collection and the balance after the buyer’s inspection, with transport shared by weight.',
      img: '/features/digital-escrow.png',
      stats: [
        { label: 'Farmer advance', val: 'At collection' },
        { label: 'Balance', val: 'After inspection' },
        { label: 'Default advance', val: '40%' },
      ],
      points: [
        'Money path per order: buyer → FPO account → farmers and transporter',
        'Every payment line sent to the farmer by SMS in their language',
        'Buyer invoiced only for lots accepted at delivery',
      ],
    },
    trust: {
      badge: 'Traceable Supply',
      title: 'Member Registry & Lot Traceability',
      subtitle: 'Every lot tied to a registered member, a graded photo and a collection point',
      description:
        'Members join through their FPO and sign in with their mobile number. Each lot records who grew it, the collection photo and GPS point, the AI grade, and the coordinator’s decision.',
      img: '/brand/agrilink-seal.png',
      stats: [
        { label: 'Lot record', val: 'Photo + grade' },
        { label: 'Traceability', val: 'Farmer → buyer' },
        { label: 'Price refs', val: 'AGMARKNET · DoCA' },
      ],
      points: [
        'Lot codes linked to farmer, order and collection GPS',
        'Mandi and retail references captured on every order',
        'Prices below the mandi reference are refused',
      ],
    },
  }

  return (
    <main className="min-h-screen bg-background selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Notification Announcement Bar */}
      <div className="bg-[#173b2b] px-4 py-2.5 text-center text-xs font-medium text-emerald-100 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          <strong className="font-semibold text-white">AgriLink 2.0 Live:</strong>
          AI-assisted grading, demand forecasting and consolidated collection runs for FPOs.
          <Link href="/signup" className="ml-2 font-bold text-emerald-300 underline hover:text-white transition-colors">
            Start free pilot &rarr;
          </Link>
        </span>
      </div>

      {/* Main SaaS Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 font-serif text-xl sm:text-2xl font-bold tracking-tight shrink-0">
            <span className="grid size-9 sm:size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sprout className="size-5 sm:size-6" />
            </span>
            <span className="text-foreground">AgriLink</span>
            <span className="hidden rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wide uppercase text-emerald-800 sm:inline-block">
              Direct Market
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Platform
            </Link>
            <Link href="#verified-supply" className="hover:text-foreground transition-colors">
              Live Supply
            </Link>
            <Link href="#roi-calculator" className="hover:text-foreground transition-colors">
              ROI Calculator
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">
              Case Studies
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {loggedInUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-card/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium backdrop-blur-xs">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-muted-foreground truncate max-w-[130px] md:max-w-none">
                    Signed in as <strong className="text-foreground">{loggedInUser}</strong>
                    {userRole && <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{userRole}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const auth = getAuthClient()
                        auth.auth.signOut()
                      } catch {}
                      localStorage.removeItem('agrilink_user_name')
                      localStorage.removeItem('agrilink_user_role')
                      localStorage.removeItem('agrilink_user_phone')
                      localStorage.removeItem('agrilink_session')
                      setLoggedInUser(null)
                      setUserRole(null)
                      window.location.href = '/'
                    }}
                    className="ml-1 text-[11px] text-muted-foreground hover:text-destructive underline transition-colors shrink-0"
                    title="Sign out"
                  >
                    Logout
                  </button>
                </div>
                <Link
                  href={userRole === 'Coordinator' ? '/admin' : '/portal'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity"
                >
                  <span>{userRole === 'Coordinator' ? 'Admin Portal' : 'Dashboard'}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="rounded-xl border border-border px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity"
                >
                  <span className="hidden min-[400px]:inline">Get started free</span>
                  <span className="min-[400px]:hidden">Get started</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Sheet */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-xs lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="h-full w-72 max-w-[85vw] border-r border-border bg-card p-5 shadow-2xl flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2 font-serif text-xl font-bold">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Sprout className="size-5" />
                    </span>
                    AgriLink
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label="Close navigation menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav className="mt-6 flex flex-col gap-1 text-sm font-medium">
                  {[
                    { href: '#features', label: 'Platform Capabilities' },
                    { href: '#verified-supply', label: 'Live Supply Registry' },
                    { href: '#roi-calculator', label: 'ROI & Spoilage Calculator' },
                    { href: '#how-it-works', label: 'How AgriLink Works' },
                    { href: '#testimonials', label: 'Field Case Studies' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3.5 py-2.5 text-foreground hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mt-8 border-t border-border pt-4 space-y-3">
                {loggedInUser ? (
                  <div className="space-y-2.5">
                    <div className="rounded-xl bg-muted/60 p-3 text-xs">
                      <p className="font-semibold text-foreground truncate">{loggedInUser}</p>
                      <p className="text-[11px] text-muted-foreground">{userRole || 'Member'}</p>
                    </div>
                    <Link
                      href={userRole === 'Coordinator' ? '/admin' : '/portal'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                    >
                      <span>{userRole === 'Coordinator' ? 'Admin Portal' : 'Open Dashboard'}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const auth = getAuthClient()
                          auth.auth.signOut()
                        } catch {}
                        localStorage.removeItem('agrilink_user_name')
                        localStorage.removeItem('agrilink_user_role')
                        localStorage.removeItem('agrilink_user_phone')
                        localStorage.removeItem('agrilink_session')
                        setLoggedInUser(null)
                        setUserRole(null)
                        setMobileMenuOpen(false)
                        window.location.href = '/'
                      }}
                      className="w-full rounded-xl border border-border py-2 text-center text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-xl border border-border py-2.5 text-center text-xs font-semibold hover:bg-muted"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-xl bg-primary py-2.5 text-center text-xs font-semibold text-primary-foreground"
                    >
                      Get started free
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 lg:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,197,94,0.12),transparent_70%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs">
              <BadgeCheck className="size-4" /> Direct From Farm to Fair Market
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              From harvest to a fair, verified market.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              AgriLink connects farmers, local farm groups, buyers, and transport into one simple, transparent platform — crop planning, quality grading, pickup routing, and direct bank payments included.
            </p>

            {loggedInUser ? (
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  href={userRole === 'Coordinator' ? '/admin' : '/portal'}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-primary px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity text-center"
                >
                  <span>Welcome back, {loggedInUser} · Open {userRole === 'Coordinator' ? 'Admin Portal' : `${userRole || ''} Dashboard`}</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const auth = getAuthClient()
                      auth.auth.signOut()
                    } catch {}
                    localStorage.removeItem('agrilink_user_name')
                    localStorage.removeItem('agrilink_user_role')
                    localStorage.removeItem('agrilink_user_phone')
                    localStorage.removeItem('agrilink_session')
                    setLoggedInUser(null)
                    setUserRole(null)
                    window.location.href = '/'
                  }}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  href="/signup"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-primary px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
                >
                  <span>Create free FPO / Buyer account</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold hover:bg-muted transition-colors shadow-2xs"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}

            <div className="mt-10 grid grid-cols-1 min-[380px]:grid-cols-3 gap-4 sm:gap-6 border-t border-border pt-8 text-left">
              <div>
                <strong className="font-serif text-2xl min-[380px]:text-3xl sm:text-4xl font-bold text-foreground">~33%</strong>
                <p className="mt-1 text-xs text-muted-foreground">Tomato farmers’ share of what consumers pay today (RBI, 2024)</p>
              </div>
              <div>
                <strong className="font-serif text-2xl min-[380px]:text-3xl sm:text-4xl font-bold text-foreground">₹1.53 L cr</strong>
                <p className="mt-1 text-xs text-muted-foreground">Food lost after harvest each year (NABCONS, 2022)</p>
              </div>
              <div>
                <strong className="font-serif text-2xl min-[380px]:text-3xl sm:text-4xl font-bold text-foreground">≥ mandi</strong>
                <p className="mt-1 text-xs text-muted-foreground">Every order priced at or above the day’s mandi rate</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="flex flex-col gap-5">
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-card to-muted/40 p-6 shadow-sm">
              <div className="flex items-center justify-center py-4">
                <img
                  src="/hero-produce.png"
                  alt="Harvest fresh local farm produce"
                  className="max-h-72 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-700" /> Every lot graded at collection
                </span>
                <span className="font-mono text-muted-foreground">Anand FPO District Node</span>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">The verified supply chain</p>
              <div className="mt-5 space-y-3">
                {[
                  ['Farmer harvest planning', 'Crop volume, harvest window and FPO lot registry'],
                  ['FPO aggregation & route', 'Consolidated multi-stop collection runs'],
                  ['AI visual quality check', 'GradeCam suggests a grade, the coordinator confirms'],
                  ['Buyer fulfillment & payout', 'Binding inspection at delivery, then settlement'],
                ].map(([title, detail], index) => (
                  <div key={title} className="flex gap-3.5 rounded-2xl bg-muted/50 p-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Produce Highlights Strip */}
      <section id="verified-supply" className="border-y border-border bg-[#fcfbf7] py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Live inventory registry</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#173b2b] sm:text-4xl">
                Current Verified Harvests Available Now
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#5f675f]">
                Real-time lots verified by FPO coordinators with visual AI grade confirmation and committed delivery dates.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-900 transition-colors"
            >
              Order from live registry &rarr;
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {verifiedCrops.map((crop) => (
              <div
                key={crop.name}
                className="group relative flex flex-col items-center rounded-2xl border border-[#e0d8c9] bg-white p-3.5 sm:p-5 text-center shadow-xs transition-all hover:border-emerald-700/40 hover:shadow-md"
              >
                <div className="relative mb-2 sm:mb-3 flex size-20 sm:size-28 items-center justify-center p-1">
                  <img
                    src={crop.img}
                    alt={crop.name}
                    className="size-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-serif text-base sm:text-lg font-semibold text-[#173b2b]">{crop.name}</h3>
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-900">
                  {crop.grade}
                </span>
                <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-semibold text-foreground">{crop.volume} committed</p>
                <p className="text-[10px] sm:text-[11px] text-[#68736c] mt-0.5 truncate max-w-full">{crop.region}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Platform Feature Tour */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Platform Capabilities</p>
            <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
              Engineered for Enterprise Agri-Trade
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Experience the core software modules powering accountable aggregation, inspection, routing, and clearing.
            </p>
          </div>

          {/* Feature Tab Switchers */}
          <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {[
              { id: 'gradecam', label: 'AI GradeCam™', icon: Smartphone },
              { id: 'logistics', label: 'Smart Logistics', icon: Truck },
              { id: 'escrow', label: 'Escrow Settlements', icon: Wallet },
              { id: 'trust', label: 'Trust Registry', icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as FeatureTab)}
                className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-2xl px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-3.5 sm:size-4" /> {label}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" /> {featureDetails[activeTab].badge}
                </span>
                <h3 className="mt-4 font-serif text-3xl font-bold sm:text-4xl text-foreground">
                  {featureDetails[activeTab].title}
                </h3>
                <p className="mt-2 text-base font-semibold text-emerald-800">
                  {featureDetails[activeTab].subtitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {featureDetails[activeTab].description}
                </p>

                <div className="mt-8 space-y-3">
                  {featureDetails[activeTab].points.map((pt) => (
                    <div key={pt} className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="size-3.5" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{pt}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 sm:mt-10 grid grid-cols-1 min-[360px]:grid-cols-3 gap-3 sm:gap-4 border-t border-border pt-6">
                  {featureDetails[activeTab].stats.map((s) => (
                    <div key={s.label}>
                      <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">{s.val}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center justify-center rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-8 min-h-[240px] sm:min-h-[380px]">
                <img
                  src={featureDetails[activeTab].img}
                  alt={featureDetails[activeTab].title}
                  className="max-h-60 sm:max-h-80 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Post-Harvest ROI & Spoilage Calculator */}
      <section id="roi-calculator" className="border-y border-border bg-[#fcfbf7] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">Impact Calculator</p>
              <h2 className="mt-3 font-serif text-4xl font-bold text-[#173b2b] sm:text-5xl">
                Quantify Your Direct Procurement Uplift
              </h2>
              <p className="mt-4 text-base text-[#5f675f] leading-relaxed">
                By eliminating intermediate mandi handling and applying cold-chain route scheduling, AgriLink cuts transit spoilage and unlocks direct farmer value.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-white border border-[#e0d8c9] p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="size-5 text-emerald-800" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#173b2b]">Post-harvest transit spoilage</h4>
                      <p className="text-xs text-[#748078]">Traditional Mandi: 24% &rarr; AgriLink: 3.8%</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                    -84% Loss
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-white border border-[#e0d8c9] p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-emerald-800" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#173b2b]">Farm-to-kitchen turnaround</h4>
                      <p className="text-xs text-[#748078]">Average 72 hours &rarr; AgriLink 18 hours</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                    4x Faster
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Widget */}
            <div className="rounded-3xl border border-[#d8cfbd] bg-white p-5 sm:p-9 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Interactive Simulator
                </span>
                <span className="font-mono text-xs text-muted-foreground">Live Model</span>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label htmlFor="volume-slider" className="text-sm font-semibold text-foreground">
                    Monthly Procurement Volume:
                  </label>
                  <strong className="font-mono text-lg font-bold text-emerald-800">
                    {monthlyVolumeKg.toLocaleString()} kg
                  </strong>
                </div>
                <input
                  id="volume-slider"
                  type="range"
                  min="2000"
                  max="50000"
                  step="1000"
                  value={monthlyVolumeKg}
                  onChange={(e) => setMonthlyVolumeKg(Number(e.target.value))}
                  className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-emerald-100 accent-emerald-800"
                />
                <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>2,000 kg</span>
                  <span>25,000 kg</span>
                  <span>50,000 kg</span>
                </div>
              </div>

              {/* Dynamic ROI Metrics Display */}
              <div className="mt-8 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
                  <p className="text-xs text-emerald-900 font-medium">Monthly Produce Saved</p>
                  <strong className="mt-1.5 block font-serif text-xl min-[400px]:text-2xl sm:text-3xl font-bold text-emerald-900">
                    {roi.savedProduceKg.toLocaleString()} kg
                  </strong>
                  <span className="text-[11px] text-emerald-700">Food rot avoided</span>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
                  <p className="text-xs text-emerald-900 font-medium">Estimated Cost Savings</p>
                  <strong className="mt-1.5 block font-serif text-xl min-[400px]:text-2xl sm:text-3xl font-bold text-emerald-900">
                    ₹{roi.monthlyCostSavings.toLocaleString()}
                  </strong>
                  <span className="text-[11px] text-emerald-700">Per month saved</span>
                </div>

                <div className="rounded-2xl border border-[#e8dfcf] bg-[#fbf9f4] p-3.5 sm:p-4">
                  <p className="text-xs text-[#5f675f] font-medium">Farmer Direct Uplift</p>
                  <strong className="mt-1.5 block font-serif text-xl min-[400px]:text-2xl sm:text-3xl font-bold text-[#173b2b]">
                    ₹{roi.farmerIncomeUplift.toLocaleString()}
                  </strong>
                  <span className="text-[11px] text-[#748078]">+18.2% vs Mandi cut</span>
                </div>

                <div className="rounded-2xl border border-[#e8dfcf] bg-[#fbf9f4] p-3.5 sm:p-4">
                  <p className="text-xs text-[#5f675f] font-medium">CO₂e Emissions Prevented</p>
                  <strong className="mt-1.5 block font-serif text-xl min-[400px]:text-2xl sm:text-3xl font-bold text-[#173b2b]">
                    {roi.co2AvoidedKg.toLocaleString()} kg
                  </strong>
                  <span className="text-[11px] text-[#748078]">From spoilage landfill</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Deploy AgriLink for your procurement &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Enterprise Standards & Compliance Grid */}
      <section className="border-t border-border bg-[#fcfbf7] py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-800">
              Interoperability & Standards
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#173b2b]">
              Built on public data and standards
            </h3>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { title: 'AGMARKNET', desc: 'Daily mandi modal prices via data.gov.in' },
              { title: 'DoCA prices', desc: 'Retail reference for the price corridor' },
              { title: 'AGMARK grades', desc: 'Criteria behind GradeCam suggestions' },
              { title: 'SMS · WhatsApp · IVR', desc: 'Offers reach feature-phone farmers' },
              { title: 'OpenStreetMap', desc: 'Collection route maps' },
            ].map((std) => (
              <div
                key={std.title}
                className="rounded-2xl border border-[#e0d8c9] bg-white p-4 text-center shadow-xs"
              >
                <ShieldCheck className="mx-auto size-6 text-emerald-800" />
                <h4 className="mt-2 text-sm font-bold text-[#173b2b]">{std.title}</h4>
                <p className="mt-1 text-[11px] text-[#68736c]">{std.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Case Studies & Testimonials */}
      <section id="testimonials" className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Pilot personas</p>
            <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
              Who the Anand district pilot is designed for
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">Illustrative personas used to shape the pilot — not customer testimonials.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  'I sell tomato to whichever trader comes first. I need a buyer who commits before I pick, a price that cannot fall below the mandi, and an advance the day my crates are accepted.',
                author: 'Smallholder member',
                role: 'Persona · 0.8 ha, tomato and paddy',
                org: 'Anand district FPO',
              },
              {
                quote:
                  'Our kitchen cooks for 1,100 children six days a week. We need volumes planned around the school calendar, graded produce, and an invoice only for what we accept at the gate.',
                author: 'School kitchen buyer',
                role: 'Persona · institutional procurement',
                org: 'Mid-day meal central kitchen',
              },
              {
                quote:
                  'Many of our farmers use basic phones. Offers have to arrive by SMS and voice call in Gujarati or Hindi, with a coordinator calling anyone who does not reply.',
                author: 'FPO coordinator',
                role: 'Persona · member operations',
                org: 'Farmer producer company',
              },
            ].map((t) => (
              <article key={t.author} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
                <div>
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="font-serif text-base font-bold text-foreground">{t.author}</h4>
                  <p className="text-xs text-primary font-medium">{t.role}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.org}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comprehensive SaaS Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Sprout className="size-5" />
                </span>
                AgriLink
              </Link>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
                A farm-to-market platform for FPOs. Connecting farmers, local farm groups, buyers, and transport with quality grading and direct bank payments.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary" /> Anand District Innovation Pilot, Gujarat
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Platform</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">AI GradeCam™</Link></li>
                <li><Link href="#features" className="hover:text-foreground">Multi-Stop Route Optimizer</Link></li>
                <li><Link href="#features" className="hover:text-foreground">Digital Escrow Passbook</Link></li>
                <li><Link href="#verified-supply" className="hover:text-foreground">Live Supply Registry</Link></li>
                <li><Link href="#roi-calculator" className="hover:text-foreground">ROI Calculator</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Solutions</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><Link href="/signup" className="hover:text-foreground">Farmer Producer Orgs (FPOs)</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Institutional Buyers</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Modern Retail Chains</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Food Processors</Link></li>
                <li><Link href="/verify" className="hover:text-foreground">Aadhaar Trust Verification</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Legal & Trust</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><span className="cursor-pointer hover:text-foreground">Privacy Policy</span></li>
                <li><span className="cursor-pointer hover:text-foreground">Terms of Service</span></li>
                <li><span className="cursor-pointer hover:text-foreground">Security Architecture</span></li>
                <li><span className="cursor-pointer hover:text-foreground">AGMARKNET Data Disclaimer</span></li>
                <li><span className="cursor-pointer hover:text-foreground">API Status: Operational</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-border pt-8 text-xs text-muted-foreground gap-4">
            <p>© 2026 AgriLink Technologies. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Built for accountable, transparent farm-to-market commons.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
