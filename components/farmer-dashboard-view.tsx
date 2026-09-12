'use client'

import { useState } from 'react'
import {
  Wheat,
  CircleDollarSign,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  PhoneCall,
  Camera,
  BadgeCheck,
  Printer,
  ShieldCheck,
  Sprout,
  Mic,
  Receipt,
  Check,
  RefreshCw,
  ShoppingBag
} from 'lucide-react'
import { Language, getT } from '@/lib/i18n'
import { GradeCamCamera } from './gradecam-camera'

interface FarmerDashboardViewProps {
  order: any
  buyer: any
  currentUserName: string | null
  lang: Language
  activeNav: string
  onNavigate: (tab: 'Overview' | 'Orders' | 'Collection & grade' | 'Settlements') => void
  farmerOfferAccepted: boolean
  onAcceptCommitment: () => void
  onDeclareHarvest: () => void
  onOpenVoice: () => void
  onOpenReceipt: () => void
  onRedistributeExcess?: () => void
  onCapturePhoto: (dataUrl: string) => void
  aiResult: { status: string; grade: string; confidence: number; reasoning: string } | null
  busy: boolean
  farmerTab?: 'slip' | 'camera'
  setFarmerTab?: (tab: 'slip' | 'camera') => void
}

const cropImages: Record<string, string> = {
  paddy: '/crops/paddy.png',
  rice: '/crops/paddy.png',
  tomato: '/crops/tomato.png',
  wheat: '/crops/wheat.png',
  onion: '/crops/onion.png',
  potato: '/crops/potato.png',
}

export function FarmerDashboardView({
  order,
  buyer,
  currentUserName,
  lang,
  activeNav,
  onNavigate,
  farmerOfferAccepted,
  onAcceptCommitment,
  onDeclareHarvest,
  onOpenVoice,
  onOpenReceipt,
  onRedistributeExcess,
  onCapturePhoto,
  aiResult,
  busy,
  farmerTab = 'slip',
  setFarmerTab,
}: FarmerDashboardViewProps) {
  const [demandCommitted, setDemandCommitted] = useState<Record<string, boolean>>({})
  const [committingId, setCommittingId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const t = getT(lang)
  const farmerName = currentUserName?.trim() || 'Ramesh Kumar'
  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const mandiPrice = 22
  const farmerCommittedKg = 500
  const grossValue = farmerCommittedKg * price
  const advanceAmount = Math.round(grossValue * 0.3)
  const transportCost = 560
  const balanceAmount = grossValue - advanceAmount - transportCost
  const extraIncome = (price - mandiPrice) * farmerCommittedKg

  const buyerDemands = [
    {
      id: 'dem-tomato',
      crop: 'Tomato',
      buyer: 'Civil Hospital Trust Kitchen',
      targetKg: 500,
      stillNeededKg: 150,
      pricePerKg: 24,
      deliveryDate: '18 Oct 2025',
      badge: 'Urgent Need',
      image: '/crops/tomato.png',
    },
    {
      id: 'dem-wheat',
      crop: 'Wheat',
      buyer: 'Jan Poshan Kendra · FPS 214',
      targetKg: 1200,
      stillNeededKg: 300,
      pricePerKg: 26,
      deliveryDate: '25 Oct 2025',
      badge: 'Bulk Sourcing',
      image: '/crops/wheat.png',
    },
    {
      id: 'dem-onion',
      crop: 'Onion',
      buyer: 'Kheda Community Hostel Mess',
      targetKg: 400,
      stillNeededKg: 180,
      pricePerKg: 22,
      deliveryDate: '22 Oct 2025',
      badge: 'Community Pool',
      image: '/crops/onion.png',
    },
  ]

  const handleCommitDemand = (demandId: string, cropName: string, rate: number) => {
    setCommittingId(demandId)
    setTimeout(() => {
      setDemandCommitted((prev) => ({ ...prev, [demandId]: true }))
      setCommittingId(null)
      setSuccessToast(`Harvest allocation confirmed for ${cropName} at ₹${rate}/kg! Confirmation SMS sent.`)
      setTimeout(() => setSuccessToast(null), 5000)
    }, 600)
  }

  // Bilingual UI labels for Farmer clarity
  const labels = {
    greeting: lang === 'hi' ? 'नमस्ते' : lang === 'te' ? 'నమస్కారం' : 'Welcome back',
    kycBadge: lang === 'hi' ? 'आधार सत्यापित किसान' : lang === 'te' ? 'ఆధార్ ధృవీకరించబడిన రైతు' : 'Aadhaar KYC Verified',
    village: lang === 'hi' ? 'खेड़ा ग्राम क्लस्टर · आणंद, गुजरात' : lang === 'te' ? 'ఖేడా గ్రామ క్లస్టర్ · ఆనంద్' : 'Kheda Village Cluster · Anand, Gujarat',
    btnDeclare: lang === 'hi' ? 'नई फसल दर्ज करें' : lang === 'te' ? 'కొత్త పంటను నమోదు చేయండి' : 'Declare New Harvest',
    btnVoice: lang === 'hi' ? 'बोलकर पूछें' : lang === 'te' ? 'మాట్లాడి సహాయం పొందండి' : 'Voice Assistant',
    btnCall: lang === 'hi' ? 'समन्वयक को कॉल करें' : lang === 'te' ? 'కోఆర్డినేటర్‌కు కాల్ చేయండి' : 'Call Coordinator',
    totalPayoutTitle: lang === 'hi' ? 'कुल सुनिश्चित भुगतान' : lang === 'te' ? 'మొత్తం హామీ చెల్లింపు' : 'Total Guaranteed Payout',
    activeCropTitle: lang === 'hi' ? 'मेरी पक्की फसल' : lang === 'te' ? 'నా ఖరారైన పంట' : 'My Committed Produce',
    pickupTitle: lang === 'hi' ? 'गाड़ी का समय (उठाव)' : lang === 'te' ? 'వాహనం వచ్చే సమయం' : 'Scheduled Pickup',
    qualityTitle: lang === 'hi' ? 'क्वालिटी दर्जा (ग्रेड)' : lang === 'te' ? 'నాణ్యత గ్రేడ్' : 'Quality Clearance',
    advancePaid: lang === 'hi' ? 'अग्रिम प्राप्त' : lang === 'te' ? 'అడ్వాన్స్ చెల్లించబడింది' : 'Advance Paid',
    balanceDue: lang === 'hi' ? 'बाकी भुगतान' : lang === 'te' ? 'మిగిలిన బ్యాలెన్స్' : 'Balance on Pickup',
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="size-5 shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* 1. Farmer Welcome & Action Banner */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-serif text-2xl font-bold border border-primary/20 shadow-xs">
              🌾
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="size-3.5" />
                  {labels.kycBadge}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
                  {labels.village}
                </span>
              </div>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {labels.greeting}, {farmerName}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {lang === 'hi'
                  ? 'आपकी फसल का उचित मूल्य सीधे आपके खाते में। कोई बिचौलिया नहीं, कोई अनुचित कटौती नहीं।'
                  : lang === 'te'
                  ? 'మీ పంటకు సరైన ధర నేరుగా మీ బ్యాంక్ ఖాతాలో జమ అవుతుంది.'
                  : 'Guaranteed farmgate procurement directly connected to verified buyers. Zero middleman cuts.'}
              </p>
            </div>
          </div>

          {/* Quick tactile action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={onDeclareHarvest}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
              title="Declare upcoming crop harvest"
            >
              <Sprout className="size-4" />
              <span>{labels.btnDeclare}</span>
            </button>

            <button
              onClick={onOpenVoice}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20 active:scale-[0.98]"
              title="Open Voice Assistant in your language"
            >
              <Mic className="size-4 animate-pulse text-primary" />
              <span>{labels.btnVoice}</span>
            </button>

            <a
              href="tel:+919825012345"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/80 active:scale-[0.98]"
              title="Call Village Coordinator (Anita Desai: 98250 12345)"
            >
              <Phone className="size-4 text-emerald-600" />
              <span className="hidden sm:inline">{labels.btnCall}</span>
              <span className="sm:hidden">Call</span>
            </a>
          </div>
        </div>

        {/* 2. Four Key Farmer Stat Cards */}
        <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 pt-6 border-t border-border">
          {/* Stat 1: Total Payout */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{labels.totalPayoutTitle}</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <CircleDollarSign className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                ₹{grossValue.toLocaleString()}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-700">₹{advanceAmount.toLocaleString()}</span> {labels.advancePaid} · <span className="font-semibold text-foreground">₹{balanceAmount.toLocaleString()}</span> {labels.balanceDue}
              </p>
            </div>
          </div>

          {/* Stat 2: Active Crop */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{labels.activeCropTitle}</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wheat className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {farmerCommittedKg} KG
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {crop} at <span className="font-bold text-primary">₹{price}/kg</span> (+27% vs mandi)
              </p>
            </div>
          </div>

          {/* Stat 3: Next Pickup */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{labels.pickupTitle}</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-700">
                <Truck className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                07:15 AM
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tomorrow · Tata Ace (GJ-07)
              </p>
            </div>
          </div>

          {/* Stat 4: Quality */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{labels.qualityTitle}</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <BadgeCheck className="size-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400">
                Grade A
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                98.4% Purity · Zero Price Cut
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Farmer Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onNavigate('Overview')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeNav === 'Overview'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Wheat className="size-4" />
          <span>{lang === 'hi' ? 'मेरी फसल और उठाव' : lang === 'te' ? 'నా పంట & పికప్' : 'My Harvest & Pickup'}</span>
        </button>

        <button
          onClick={() => onNavigate('Orders')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeNav === 'Orders'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>{lang === 'hi' ? 'खरीदार मांग (ऑर्डर्स)' : lang === 'te' ? 'కొనుగోలుదారు డిమాండ్లు' : 'Buyer Demands'}</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
            3 Live
          </span>
        </button>

        <button
          onClick={() => onNavigate('Collection & grade')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeNav === 'Collection & grade'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <BadgeCheck className="size-4" />
          <span>{lang === 'hi' ? 'क्वालिटी जांच व पर्ची' : lang === 'te' ? 'నాణ్యత తనిఖీ' : 'Quality Check & Camera'}</span>
        </button>

        <button
          onClick={() => onNavigate('Settlements')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeNav === 'Settlements'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Receipt className="size-4" />
          <span>{lang === 'hi' ? 'खाता पासबुक और रसीद' : lang === 'te' ? 'పాస్‌బుక్ & రసీదు' : 'Passbook & Payments'}</span>
        </button>
      </div>

      {/* 4. Tab 1: MY HARVEST & PICKUP */}
      {activeNav === 'Overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Active Lot Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl bg-secondary/80 p-2.5 border border-border flex items-center justify-center overflow-hidden">
                      <img
                        src={cropImages[crop.toLowerCase()] || '/hero-produce.png'}
                        alt={crop}
                        className="size-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                          Lot #LOT-1001
                        </span>
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Pre-Harvest Locked
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                        {crop} (धान) · {farmerCommittedKg} KG
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                        Buyer: <strong>{buyer?.name || 'PM POSHAN Central Kitchen'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground">Guaranteed Rate</span>
                    <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                      ₹{price}<span className="text-xs font-sans text-muted-foreground">/kg</span>
                    </p>
                  </div>
                </div>

                {/* 4-Step Farmgate Progress Track */}
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {lang === 'hi' ? 'खेत से भुगतान तक की प्रगति' : 'Harvest to Payout Progress'}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300">1. Harvest Produce Declared</p>
                        <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                          500 KG {crop} registered from your Kheda farm plot.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 font-semibold">Done</span>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300">2. Contract Sourced & Price Locked</p>
                        <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Agreed rate ₹28/kg is 100% protected against mandi crash.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 font-semibold">Done</span>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-primary/10 border border-primary/30 p-3">
                      <Clock className="size-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-primary">3. Collection Vehicle Arrival (Next Step)</p>
                        <p className="text-muted-foreground mt-0.5">
                          Tata Ace arrives tomorrow at <strong>07:15 AM</strong>. Weighment & 30% advance on bag loading.
                        </p>
                      </div>
                      <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                        Tomorrow
                      </span>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 border border-border p-3 opacity-80">
                      <div className="size-5 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
                        4
                      </div>
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-foreground">4. Direct Bank Account Payout (DBT)</p>
                        <p className="text-muted-foreground mt-0.5">
                          Remaining ₹{balanceAmount.toLocaleString()} credited directly to Jan Dhan SBI account upon delivery.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">Pending Drop</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Excess Surplus Action */}
              <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Have more crop harvested than committed?
                </div>
                {onRedistributeExcess && (
                  <button
                    onClick={onRedistributeExcess}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Sprout className="size-3.5" />
                    <span>Redistribute Surplus Produce</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Driver Card & Price Comparison */}
            <div className="space-y-6">
              {/* Driver & Pickup Card */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="font-serif text-xl font-bold text-foreground">
                      {lang === 'hi' ? 'वाहन व चालक विवरण' : 'Vehicle & Driver Details'}
                    </h4>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-mono font-medium text-muted-foreground">
                    Tata Ace
                  </span>
                </div>

                <div className="flex items-center gap-4 rounded-2xl bg-secondary/60 p-4 border border-border">
                  <div className="relative size-14 shrink-0 rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center">
                    <img src="/features/agro-logistics.png" alt="Pickup Truck" className="size-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">Rajesh Patel (Driver)</p>
                    <p className="text-xs text-muted-foreground font-mono">Tata Ace · GJ-07-TY-4912</p>
                    <p className="text-xs text-primary font-semibold mt-0.5 flex items-center gap-1">
                      <Clock className="size-3" /> Pickup: 07:15 AM Tomorrow
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span>Meeting Point:</span>
                    <span className="font-semibold text-foreground">Kheda Village Primary School Yard</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span>Bags to Load:</span>
                    <span className="font-semibold text-foreground">10 Bags (50 kg each)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Advance at Loading:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">₹{advanceAmount.toLocaleString()} (Instant e-RUPI)</span>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href="tel:+919825144102"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <PhoneCall className="size-4" />
                    <span>Call Driver Rajesh (+91 98251 44102)</span>
                  </a>
                </div>
              </div>

              {/* Price Proof / Extra Income Card */}
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                    Fair Price Guarantee
                  </span>
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                    +27.2% More
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-foreground">
                  {lang === 'hi' ? 'मंडी से ज्यादा कमाई' : 'You Earn More Than Local Mandi'}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Local APMC Mandi rate today: <strong>₹{mandiPrice}/kg</strong>. AgriLink pre-harvest contracted rate: <strong>₹{price}/kg</strong>.
                </p>

                <div className="mt-4 rounded-2xl border border-primary/20 bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Mandi Payout (at ₹{mandiPrice}):</span>
                    <span className="font-mono font-medium text-muted-foreground">₹{(farmerCommittedKg * mandiPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">AgriLink Payout (at ₹{price}):</span>
                    <span className="font-serif text-base font-bold text-primary">₹{grossValue.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Extra Money in Your Pocket:</span>
                    <span>+₹{extraIncome.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Check className="size-3.5 text-primary shrink-0" />
                  <span>Zero commission deduction (No Arhatiya fee)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: BUYER DEMANDS (Demand Forecast Board for Farmer) */}
      {activeNav === 'Orders' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {lang === 'hi' ? 'सत्यापित खरीदार मांग' : 'Direct Buyer Sourcing Board'}
                </span>
                <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">
                  {lang === 'hi' ? 'आगामी फसलों की मांग और अग्रिम अनुबंध' : 'Upcoming Buyer Demands Waiting for Crops'}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {lang === 'hi'
                    ? 'स्कूलों, अस्पतालों और संस्थानों को अपनी फसल बेचें। फसल काटने से पहले भाव पक्का करें।'
                    : 'Commit your upcoming harvest to institutional buyers at pre-agreed guaranteed prices.'}
                </p>
              </div>

              <button
                onClick={onDeclareHarvest}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
              >
                <Sprout className="size-4" />
                <span>{labels.btnDeclare}</span>
              </button>
            </div>

            {/* Demand Cards Grid */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {buyerDemands.map((demand) => {
                const isCommitted = demandCommitted[demand.id] || false
                const isCommitting = committingId === demand.id

                return (
                  <div
                    key={demand.id}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="relative size-14 shrink-0 rounded-2xl bg-secondary/80 p-2 border border-border flex items-center justify-center overflow-hidden">
                          <img src={demand.image} alt={demand.crop} className="size-full object-contain" />
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {demand.badge}
                        </span>
                      </div>

                      <h4 className="mt-3 font-serif text-xl font-bold text-foreground">
                        {demand.crop}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">
                        {demand.buyer}
                      </p>

                      <div className="mt-4 rounded-xl bg-secondary/60 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Guaranteed Rate:</span>
                          <span className="font-serif font-bold text-primary text-base">₹{demand.pricePerKg}/kg</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Needed by:</span>
                          <span className="font-semibold text-foreground">{demand.deliveryDate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Open Capacity:</span>
                          <span className="font-semibold text-foreground">{demand.stillNeededKg} KG remaining</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border">
                      {isCommitted ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" />
                          <span>Allocation Confirmed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCommitDemand(demand.id, demand.crop, demand.pricePerKg)}
                          disabled={isCommitting}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
                        >
                          {isCommitting ? (
                            <RefreshCw className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          <span>Commit My {demand.crop}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: QUALITY CHECK & CAM (Grade A Certification) */}
      {activeNav === 'Collection & grade' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              onClick={() => setFarmerTab?.('slip')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                farmerTab === 'slip'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <BadgeCheck className="size-4" />
              <span>Official Grade A Quality Certificate</span>
            </button>

            <button
              onClick={() => setFarmerTab?.('camera')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                farmerTab === 'camera'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="size-4" />
              <span>Test Crop with GradeCam Camera</span>
            </button>
          </div>

          {farmerTab === 'slip' ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              {/* Quality Certificate */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between pb-5 border-b border-border">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      APMC Grade A Standard
                    </span>
                    <h3 className="mt-2 font-serif text-2xl font-bold text-foreground">
                      Digital Quality Inspection Slip
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lot #LOT-1001 · 500 KG {crop} · Verified by QC Coordinator Anita Desai
                    </p>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700">
                    <BadgeCheck className="size-6" />
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl bg-secondary/60 p-3.5 border border-border">
                      <span className="text-muted-foreground">Overall Purity:</span>
                      <p className="font-serif text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">98.4%</p>
                      <p className="text-[10px] text-muted-foreground">Grade A standard</p>
                    </div>

                    <div className="rounded-2xl bg-secondary/60 p-3.5 border border-border">
                      <span className="text-muted-foreground">Moisture Content:</span>
                      <p className="font-serif text-lg font-bold text-foreground mt-1">13.4%</p>
                      <p className="text-[10px] text-muted-foreground">Within 14% max limit</p>
                    </div>

                    <div className="rounded-2xl bg-secondary/60 p-3.5 border border-border col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground">Foreign Matter:</span>
                      <p className="font-serif text-lg font-bold text-foreground mt-1">0.8%</p>
                      <p className="text-[10px] text-muted-foreground">Allowed max 2.0%</p>
                    </div>
                  </div>

                  {/* Protection Banner */}
                  <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                    <ShieldCheck className="size-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        Zero Price Cut Guarantee
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed mt-0.5">
                        Because your produce is certified Grade A prior to loading, the collection driver and buyer cannot make subjective deductions for moisture, dust, or size.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector & Receipt Preview */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-serif text-xl font-bold text-foreground">
                    Inspector & Dual-Signoff
                  </h4>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                      <span className="text-muted-foreground">FPO Inspector:</span>
                      <span className="font-bold text-foreground">Anita Desai (Anand Cluster)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                      <span className="text-muted-foreground">Inspection Method:</span>
                      <span className="font-bold text-foreground">Visual GradeCam + Physical Sample</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                      <span className="text-muted-foreground">Pass Certificate ID:</span>
                      <span className="font-mono font-bold text-primary">QC-KHD-2025-081</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-border">
                  <button
                    onClick={onOpenReceipt}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-foreground py-3 text-xs font-bold hover:bg-secondary/80 transition-colors border border-border"
                  >
                    <Printer className="size-4 text-primary" />
                    <span>Print Quality & Weighment Slip</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  GradeCam AI Visual Quality Scanner
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Point camera at a sample of your harvest lot to verify Grade A quality before vehicle arrives.
                </p>
              </div>

              <GradeCamCamera onCapture={onCapturePhoto} disabled={busy} />

              {aiResult && (
                <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800">Scanned Result: Grade {aiResult.grade}</span>
                    <p className="text-xs text-muted-foreground">{aiResult.reasoning}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-700">{aiResult.confidence}% Match</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. Tab 4: PASSBOOK & PAYMENTS (Kisan Digital Passbook) */}
      {activeNav === 'Settlements' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Indian Passbook Card */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      NPCI e-RUPI DBT Active
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">Jan Dhan Linked</span>
                  </div>
                  <h3 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">
                    Kisan Digital Passbook (किसान पासबुक)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Account Holder: <strong>{farmerName}</strong> · Bank: State Bank of India (A/C: *******4519)
                  </p>
                </div>

                <button
                  onClick={onOpenReceipt}
                  className="inline-flex items-center gap-2 rounded-2xl bg-secondary border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors shrink-0"
                >
                  <Printer className="size-4 text-primary" />
                  <span>Download Passbook Slip</span>
                </button>
              </div>

              {/* Current Active Lot Calculation */}
              <div className="mt-6 rounded-2xl bg-secondary/50 p-5 border border-border space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Current Sourcing Settlement (#LOT-1001)
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gross Produce Value (500 KG × ₹28/kg):</span>
                    <span className="font-serif font-bold text-foreground text-base">₹{grossValue.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="size-4" /> 30% Advance on Loading (e-RUPI):
                    </span>
                    <span className="font-mono font-bold">+₹{advanceAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>FPO Shared Route Transport Share:</span>
                    <span className="font-mono">-₹{transportCost.toLocaleString()}</span>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-base font-bold text-primary">
                    <span>Final Balance Payable on Delivery:</span>
                    <span className="font-serif text-2xl">₹{balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Passbook Transaction History Table */}
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Recent Direct Bank Transfers (DBT)
                </p>

                <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden text-xs">
                  <div className="p-3.5 flex items-center justify-between bg-card">
                    <div>
                      <p className="font-bold text-foreground">30% Advance Deposit (Lot #LOT-1001)</p>
                      <p className="text-[11px] text-muted-foreground">18 Oct 2025 · e-RUPI Voucher credited to Jan Dhan</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-emerald-600">+₹{advanceAmount.toLocaleString()}</span>
                      <p className="text-[10px] text-emerald-700 font-semibold">Credited</p>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between bg-card">
                    <div>
                      <p className="font-bold text-foreground">Wheat Pilot Harvest Settlement</p>
                      <p className="text-[11px] text-muted-foreground">12 Oct 2025 · Direct NEFT payout (400 KG Wheat)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-emerald-600">+₹10,400</span>
                      <p className="text-[10px] text-emerald-700 font-semibold">Settled</p>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between bg-card">
                    <div>
                      <p className="font-bold text-foreground">Tomato Sourcing Balance Payout</p>
                      <p className="text-[11px] text-muted-foreground">28 Sep 2025 · UPI Payout (Civil Hospital contract)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-emerald-600">+₹6,720</span>
                      <p className="text-[10px] text-emerald-700 font-semibold">Settled</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow & Bank Trust Card */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 rounded-2xl bg-secondary p-1 border border-border flex items-center justify-center overflow-hidden">
                      <img src="/features/digital-escrow.png" alt="Digital Escrow" className="size-full object-contain" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-foreground">
                        NPCI Escrow Guaranteed
                      </h4>
                      <p className="text-xs text-muted-foreground">No payment default risk</p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                    Buyer payment is locked in an official NPCI digital escrow prior to crop collection. Once the produce is dropped off at the school kitchen, the remaining ₹{balanceAmount.toLocaleString()} is immediately wired to your account.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
                  <ShieldCheck className="size-5 text-primary shrink-0" />
                  <p className="text-[11px] text-muted-foreground">
                    100% legal backing under APMC model bylaws & e-RUPI framework.
                  </p>
                </div>
              </div>

              {/* Village Coordinator Support */}
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                <h4 className="font-serif text-lg font-bold text-foreground">
                  Village FPO Sahayak
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Need assistance with your bank account, passbook, or pickup?
                </p>

                <div className="mt-4 rounded-2xl bg-card p-3.5 border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coordinator:</span>
                    <span className="font-bold text-foreground">Anita Desai</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contact Phone:</span>
                    <span className="font-mono font-bold text-primary">+91 98250 12345</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kisan Call Center:</span>
                    <span className="font-mono text-muted-foreground">1800-180-1551 (Toll Free)</span>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href="tel:+919825012345"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="size-3.5" />
                    <span>Call Coordinator Anita</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
