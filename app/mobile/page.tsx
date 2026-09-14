'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  TrendingUp,
  Camera,
  Store,
  Truck,
  Settings,
  ShieldCheck,
  Award,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  RefreshCw,
  LogOut,
  Mic,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

type ViewportMode = 'phone' | 'tablet' | 'desktop'
type ScreenNav = 'dashboard' | 'marketplace' | 'gradecam' | 'logistics' | 'settings'
type UserRole = 'farmer' | 'buyer' | 'coordinator'

export default function MobilePreviewPage() {
  const [viewport, setViewport] = useState<ViewportMode>('phone')
  const [screen, setScreen] = useState<ScreenNav>('dashboard')
  const [role, setRole] = useState<UserRole>('farmer')
  const [isDark, setIsDark] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Interactive Feature States
  const [orderQty, setOrderQty] = useState(500)
  const [selectedCrop, setSelectedCrop] = useState('Tomato')
  const [escrowBalance, setEscrowBalance] = useState(18420)
  const [selectedVehicle, setSelectedVehicle] = useState('Tata Ace (1.5t)')
  const [routeDispatched, setRouteDispatched] = useState(false)
  const [gradeOverride, setGradeOverride] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'community' | 'pro' | 'enterprise'>('pro')
  const [activeTab, setActiveTab] = useState<'All' | 'Vegetables' | 'Grains'>('All')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Calculated values
  const unitPrice = selectedCrop === 'Tomato' ? 26 : selectedCrop === 'Wheat' ? 28 : selectedCrop === 'Paddy' ? 25 : 24
  const isBulk = orderQty >= 50
  const orderTotal = orderQty * unitPrice
  const advanceRequired = orderTotal * 0.40

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-[#0E1310] text-[#E0EAE2]' : 'bg-[#F4F1EA] text-[#16201A]'} font-sans transition-colors duration-200`}>
      {/* Top Device & Simulator Control Bar */}
      <header className={`sticky top-0 z-50 border-b ${isDark ? 'bg-[#18201B] border-[#2C3B32]' : 'bg-white border-[#E5E0D8]'} px-4 py-3 shadow-xs`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B382B] dark:text-[#89D7A5] hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Web App
            </Link>
            <span className="text-xs text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#267A38] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B382B] dark:text-[#89D7A5]">
                Android M3 Adaptive Simulator
              </span>
            </div>
          </div>

          {/* Viewport Form-Factor Toggles */}
          <div className="flex items-center gap-1.5 bg-[#F0ECE3] dark:bg-[#222D26] p-1 rounded-xl">
            <button
              onClick={() => setViewport('phone')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewport === 'phone'
                  ? 'bg-[#1B382B] text-white shadow-xs'
                  : 'text-[#536056] dark:text-[#A3B3A8] hover:text-[#1B382B]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Phone (Compact)
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewport === 'tablet'
                  ? 'bg-[#1B382B] text-white shadow-xs'
                  : 'text-[#536056] dark:text-[#A3B3A8] hover:text-[#1B382B]'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" /> Tablet (Medium)
            </button>
            <button
              onClick={() => setViewport('desktop')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewport === 'desktop'
                  ? 'bg-[#1B382B] text-white shadow-xs'
                  : 'text-[#536056] dark:text-[#A3B3A8] hover:text-[#1B382B]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop (Expanded)
            </button>
          </div>

          {/* Role and Theme Toggles */}
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                isDark
                  ? 'bg-[#222D26] border-[#35453A] text-white'
                  : 'bg-white border-[#D9D2C4] text-[#1B382B]'
              } outline-none`}
            >
              <option value="farmer">🌾 Farmer Persona</option>
              <option value="buyer">🏥 Institutional Buyer</option>
              <option value="coordinator">🏢 FPO Coordinator</option>
            </select>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg border ${
                isDark ? 'border-[#35453A] text-yellow-400 bg-[#222D26]' : 'border-[#D9D2C4] text-[#1B382B] bg-white'
              }`}
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1B382B] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#89D7A5]" />
          {toastMessage}
        </div>
      )}

      {/* Main Simulator Canvas */}
      <main className="p-4 sm:p-8 flex justify-center items-start">
        <div
          className={`transition-all duration-300 ${
            viewport === 'phone'
              ? 'w-[390px] h-[844px] rounded-[44px] border-[10px] border-[#2C3B32] shadow-2xl overflow-hidden flex flex-col bg-[#FBF9F5] dark:bg-[#111613]'
              : viewport === 'tablet'
              ? 'w-[768px] h-[780px] rounded-[32px] border-[8px] border-[#2C3B32] shadow-2xl overflow-hidden flex flex-col bg-[#FBF9F5] dark:bg-[#111613]'
              : 'w-full max-w-[1240px] h-[800px] rounded-2xl border border-[#D9D2C4] dark:border-[#35453A] shadow-xl overflow-hidden flex bg-[#FBF9F5] dark:bg-[#111613]'
          }`}
        >
          {/* Top Speaker / Camera Notch for Phone */}
          {viewport === 'phone' && (
            <div className="h-6 bg-transparent flex justify-between items-center px-7 text-[10px] font-bold shrink-0">
              <span>09:41</span>
              <div className="w-20 h-4 bg-[#2C3B32] rounded-b-xl" />
              <span>5G · 98%</span>
            </div>
          )}

          {/* Viewport Interior Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* 1. TABLET NAVIGATION RAIL (72px) */}
            {viewport === 'tablet' && (
              <aside className="w-[72px] bg-white dark:bg-[#18201B] border-r border-[#E5E0D8] dark:border-[#2C3B32] flex flex-col items-center py-5 shrink-0">
                <div className="w-11 h-11 rounded-xl bg-[#1B382B] flex items-center justify-center text-white text-lg mb-8 shadow-xs">
                  🌾
                </div>
                <div className="flex flex-col gap-6">
                  <button
                    onClick={() => setScreen('dashboard')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                      screen === 'dashboard' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${screen === 'dashboard' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    Home
                  </button>
                  <button
                    onClick={() => setScreen('marketplace')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                      screen === 'marketplace' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${screen === 'marketplace' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                      <Store className="w-5 h-5" />
                    </div>
                    Market
                  </button>
                  <button
                    onClick={() => setScreen('gradecam')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                      screen === 'gradecam' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${screen === 'gradecam' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                      <Camera className="w-5 h-5" />
                    </div>
                    GradeCam
                  </button>
                  <button
                    onClick={() => setScreen('logistics')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                      screen === 'logistics' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${screen === 'logistics' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    Routes
                  </button>
                </div>
                <div className="mt-auto">
                  <button
                    onClick={() => setScreen('settings')}
                    className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                      screen === 'settings' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${screen === 'settings' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                      <Settings className="w-5 h-5" />
                    </div>
                    Account
                  </button>
                </div>
              </aside>
            )}

            {/* 2. DESKTOP PERSISTENT DRAWER (240px) */}
            {viewport === 'desktop' && (
              <aside className="w-[240px] bg-white dark:bg-[#18201B] border-r border-[#E5E0D8] dark:border-[#2C3B32] flex flex-col p-5 shrink-0">
                <div className="flex items-center gap-2.5 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#1B382B] flex items-center justify-center text-white text-xl">
                    🌾
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-[#1B382B] dark:text-[#89D7A5]">AgriLink SaaS</h2>
                    <p className="text-[10px] text-muted-foreground">Android M3 Adaptive</p>
                  </div>
                </div>

                <nav className="flex flex-col gap-1 text-xs font-semibold">
                  {[
                    { id: 'dashboard', label: 'Operational Dashboard', icon: TrendingUp },
                    { id: 'marketplace', label: 'Direct Marketplace', icon: Store },
                    { id: 'gradecam', label: 'AI GradeCam™ QC', icon: Camera },
                    { id: 'logistics', label: 'Logistics & 2-Opt VRP', icon: Truck },
                    { id: 'settings', label: 'SaaS Plan & Account', icon: Settings }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setScreen(item.id as ScreenNav)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                        screen === item.id
                          ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C] text-[#1B382B] dark:text-[#89D7A5] font-bold'
                          : 'text-[#536056] dark:text-[#A3B3A8] hover:bg-[#F0ECE3] dark:hover:bg-[#222D26]'
                      }`}
                    >
                      <item.icon className="w-4 h-4" /> {item.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-[#E5E0D8] dark:border-[#2C3B32]">
                  <div className="flex items-center gap-2.5 bg-[#FBF9F5] dark:bg-[#111613] p-2.5 rounded-xl border border-[#D9D2C4] dark:border-[#35453A]">
                    <div className="w-7 h-7 rounded-full bg-[#E6EFE8] text-[#1B382B] font-bold text-xs flex items-center justify-center">
                      RP
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Ramesh Patel</p>
                      <p className="text-[10px] text-[#267A38] font-semibold">FPO Pro Active</p>
                    </div>
                  </div>
                </div>
              </aside>
            )}

            {/* SCREEN VIEWPORT CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* ========================================================================= */}
              {/* SCREEN 1: DASHBOARD                                                        */}
              {/* ========================================================================= */}
              {screen === 'dashboard' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                        {role === 'farmer' ? 'Hello, Ramesh Bhai 👋' : role === 'buyer' ? 'Akshaya Patra Kitchen 🏥' : 'FPO Command Console 🏢'}
                      </h1>
                      <p className="text-xs text-[#5D6D63] dark:text-[#A3B3A8]">
                        {role === 'farmer' ? 'Petlad Cluster · FPO Pro Member' : 'Anand District Procurement Hub'}
                      </p>
                    </div>
                    <button
                      onClick={() => showToast('Connecting to Bolna Vernacular IVR voice agent...')}
                      className="bg-[#FAF0DB] dark:bg-[#332306] border border-[#846226]/40 text-[#846226] dark:text-[#F0CA86] px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs hover:opacity-90"
                    >
                      <Mic className="w-3.5 h-3.5" /> Bolna Voice
                    </button>
                  </div>

                  {/* AGMARKNET Price Corridor Banner */}
                  <div className="bg-[#E6EFE8] dark:bg-[#1F3B2C] rounded-2xl p-3.5 flex items-center gap-3 border border-[#1B382B]/20">
                    <div className="text-xl">📈</div>
                    <div>
                      <p className="text-xs font-bold text-[#1B382B] dark:text-[#CEEADB]">
                        AGMARKNET Modal Rate: Tomato ₹24.50/kg
                      </p>
                      <p className="text-[11px] text-[#324C3D] dark:text-[#A6CDB6]">
                        AgriLink guaranteed price: ≥ Mandi + 18.2% direct realization
                      </p>
                    </div>
                  </div>

                  {/* Dual Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-3.5 rounded-2xl shadow-2xs">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Escrow Balance</span>
                        <span className="bg-[#E6EFE8] dark:bg-[#1F3B2C] text-[#1B382B] dark:text-[#89D7A5] font-bold px-1.5 py-0.5 rounded text-[10px]">+18%</span>
                      </div>
                      <p className="text-2xl font-extrabold text-[#1B382B] dark:text-[#89D7A5] my-1">
                        ₹{escrowBalance.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">40% harvest advance released</p>
                    </div>

                    <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-3.5 rounded-2xl shadow-2xs">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Transit Loss</span>
                        <span className="bg-[#E6EFE8] dark:bg-[#1F3B2C] text-[#1B382B] dark:text-[#89D7A5] font-bold px-1.5 py-0.5 rounded text-[10px]">-84%</span>
                      </div>
                      <p className="text-2xl font-extrabold text-[#267A38] dark:text-[#7DD88F] my-1">
                        3.2%
                      </p>
                      <p className="text-[10px] text-muted-foreground">vs. Mandi average 24%</p>
                    </div>
                  </div>

                  {/* Field Operations Action Row */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Field Operations</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setScreen('gradecam')}
                        className="bg-[#1B382B] text-white hover:bg-[#254F3D] py-3 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
                      >
                        <Camera className="w-4 h-4" /> AI GradeCam™
                      </button>
                      <button
                        onClick={() => setScreen('marketplace')}
                        className="bg-white dark:bg-[#18201B] border border-[#D9D2C4] dark:border-[#35453A] py-3 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs min-h-[48px]"
                      >
                        <Store className="w-4 h-4" /> Marketplace
                      </button>
                    </div>
                  </div>

                  {/* Live Lots Feed */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Harvest Lots</h3>
                      <button onClick={() => setScreen('logistics')} className="text-xs font-bold text-[#1B382B] dark:text-[#89D7A5] hover:underline">
                        View Routes (3 Stops) &rarr;
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="bg-white dark:bg-[#18201B] border-l-4 border-[#1B382B] border border-[#E5E0D8] dark:border-[#2C3B32] p-3 rounded-xl shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">Tomato · 500 kg Lot</span>
                          <span className="bg-[#E6EFE8] text-[#1B382B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1B382B]/20">
                            ✓ AGMARK Grade A
                          </span>
                        </div>
                        <p className="text-xs text-[#5D6D63] dark:text-[#A3B3A8] mt-1">Pickup: Petlad Node · ₹28/kg Guaranteed</p>
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-[#E5E0D8] dark:border-[#2C3B32] text-xs">
                          <span className="font-bold text-[#846226] dark:text-[#F0CA86]">Advance Paid: ₹5,600 (UPI)</span>
                          <span className="bg-[#FAF0DB] text-[#846226] text-[10px] font-bold px-2 py-0.5 rounded">Tata Ace Run #08</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-3 rounded-xl shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">Wheat · 600 kg Lot</span>
                          <span className="bg-[#E6EFE8] text-[#1B382B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1B382B]/20">
                            ✓ AGMARK Grade A
                          </span>
                        </div>
                        <p className="text-xs text-[#5D6D63] dark:text-[#A3B3A8] mt-1">Pickup: Boriavi Shed · ₹28/kg Guaranteed</p>
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-[#E5E0D8] dark:border-[#2C3B32] text-xs">
                          <span className="font-bold text-[#846226] dark:text-[#F0CA86]">Advance Paid: ₹6,720 (UPI)</span>
                          <span className="bg-[#E6EFE8] text-[#1B382B] text-[10px] font-bold px-2 py-0.5 rounded">Inspected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCREEN 2: DIRECT MARKETPLACE                                               */}
              {/* ========================================================================= */}
              {screen === 'marketplace' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScreen('dashboard')} className="p-1 rounded-lg hover:bg-[#E5E0D8]">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-extrabold">Direct Farm Marketplace</h2>
                  </div>

                  {/* Category Chips */}
                  <div className="flex gap-2">
                    {(['All', 'Vegetables', 'Grains'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === cat
                            ? 'bg-[#1B382B] text-white'
                            : 'bg-white dark:bg-[#18201B] border border-[#D9D2C4] text-[#536056]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Live Catalog Items */}
                  <div className="space-y-2">
                    {[
                      { name: 'Tomato', emoji: '🍅', hindi: 'टमाटर', avail: '1,200 kg', price: 26, mandi: 22 },
                      { name: 'Wheat', emoji: '🌾', hindi: 'गेहूं', avail: '1,500 kg', price: 28, mandi: 24.5 },
                      { name: 'Paddy', emoji: '🍚', hindi: 'धान', avail: '1,200 kg', price: 25, mandi: 21 },
                    ].map((item) => (
                      <div
                        key={item.name}
                        onClick={() => setSelectedCrop(item.name)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedCrop === item.name
                            ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C] border-[#1B382B]'
                            : 'bg-white dark:bg-[#18201B] border-[#E5E0D8] dark:border-[#2C3B32]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.emoji}</span>
                          <div>
                            <p className="text-sm font-bold leading-tight">{item.name} ({item.hindi})</p>
                            <p className="text-[11px] text-muted-foreground">{item.avail} committed · Petlad</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-[#1B382B] dark:text-[#89D7A5]">₹{item.price}/kg</p>
                          <p className="text-[10px] text-muted-foreground">Mandi: ₹{item.mandi}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Builder / Escrow Advance Checkout */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl shadow-sm space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-extrabold">Procure {selectedCrop}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isBulk ? 'bg-[#E6EFE8] text-[#1B382B]' : 'bg-[#FAF0DB] text-[#846226]'
                      }`}>
                        {isBulk ? 'Bulk Pool (≥50kg)' : 'Small Direct (<50kg)'}
                      </span>
                    </div>

                    {/* Stepper */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold">Quantity (kg):</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setOrderQty(Math.max(50, orderQty - 50))}
                          className="w-8 h-8 rounded-full bg-[#F0ECE3] dark:bg-[#222D26] flex items-center justify-center font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="text-base font-extrabold">{orderQty} kg</span>
                        <button
                          onClick={() => setOrderQty(orderQty + 50)}
                          className="w-8 h-8 rounded-full bg-[#F0ECE3] dark:bg-[#222D26] flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Escrow Lock Banner */}
                    <div className="bg-[#FAF0DB] dark:bg-[#332306] p-3 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Total Order Value:</span>
                        <span>₹{orderTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-[#846226] dark:text-[#F0CA86]">
                        <span>40% Advance Locked in Escrow:</span>
                        <span>₹{advanceRequired.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEscrowBalance(escrowBalance + advanceRequired)
                        showToast(`Order placed for ${orderQty}kg ${selectedCrop}! ₹${advanceRequired} advance locked in escrow.`)
                        setScreen('dashboard')
                      }}
                      className="w-full bg-[#1B382B] text-white py-3 rounded-xl text-xs font-bold shadow-md hover:bg-[#254F3D] transition-colors"
                    >
                      Commit ₹{advanceRequired.toLocaleString()} Advance & Place Order
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCREEN 3: AI GRADECAM™ INSPECTION                                          */}
              {/* ========================================================================= */}
              {screen === 'gradecam' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScreen('dashboard')} className="p-1 rounded-lg hover:bg-[#E5E0D8]">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-extrabold">AI GradeCam™ Quality QC</h2>
                  </div>

                  {/* Simulated Camera Viewfinder Frame */}
                  <div className="relative bg-[#18201B] h-52 rounded-2xl border-2 border-[#36B359] overflow-hidden flex flex-col items-center justify-center text-white">
                    <div className="absolute top-2.5 right-2.5 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold">
                      60 FPS · 4K Vision
                    </div>
                    <div className="text-4xl mb-1 animate-pulse">🍅</div>
                    <p className="text-xs font-bold">Tomato Lot #TM-101 in Frame</p>
                    <p className="text-[10px] text-[#A6CDB6]">AGMARK 2024 Schedule III</p>
                  </div>

                  {/* Quality Assessment Card */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">Computer Vision Verdict</p>
                        <p className="text-[11px] text-muted-foreground">Classified against AGMARK Class I</p>
                      </div>
                      <span className="bg-[#E6EFE8] text-[#1B382B] text-xs font-extrabold px-2.5 py-1 rounded-full border border-[#1B382B]/20">
                        ✓ Grade A
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>Model Precision Confidence:</span>
                        <span className="text-[#1B382B] dark:text-[#89D7A5]">94% High</span>
                      </div>
                      <div className="w-full bg-[#EAE5DC] dark:bg-[#2C3B32] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#1B382B] dark:bg-[#89D7A5] h-full w-[94%]" />
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-[#536056] dark:text-[#A3B3A8]">
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#267A38]" /> Uniform color ripeness (96% conforming)</p>
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#267A38]" /> Skin firmness & integrity (Zero rot/punctures)</p>
                      <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#267A38]" /> Surface defect area: 1.2% (AGMARK A threshold ≤ 3%)</p>
                    </div>
                  </div>

                  {/* Coordinator Override Toggle */}
                  <div className="bg-[#F0ECE3] dark:bg-[#222D26] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">Coordinator Manual Override</p>
                      <p className="text-[10px] text-muted-foreground">Logged to immutable FPO audit ledger</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gradeOverride}
                      onChange={(e) => setGradeOverride(e.target.checked)}
                      className="w-4 h-4 accent-[#1B382B]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      showToast('Grade A confirmed! ₹5,600 advance disbursed to farmer UPI.')
                      setScreen('dashboard')
                    }}
                    className="w-full bg-[#1B382B] text-white py-3 rounded-xl text-xs font-bold shadow-md hover:bg-[#254F3D] min-h-[48px]"
                  >
                    ✓ Accept Grade A & Trigger ₹5,600 Advance
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCREEN 4: SMART LOGISTICS & 2-OPT VRP                                      */}
              {/* ========================================================================= */}
              {screen === 'logistics' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScreen('dashboard')} className="p-1 rounded-lg hover:bg-[#E5E0D8]">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-extrabold">Smart 2-Opt Logistics & Fleet</h2>
                  </div>

                  {/* Fleet Selector */}
                  <div className="flex gap-2">
                    {['Tata Ace (1.5t)', 'Eicher 407 (3.5t)', 'Bolero (1.2t)'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVehicle(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedVehicle === v
                            ? 'bg-[#1B382B] text-white'
                            : 'bg-white dark:bg-[#18201B] border border-[#D9D2C4] text-[#536056]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Route Summary Card */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">Anand District Collection Run #08</p>
                        <p className="text-[11px] text-muted-foreground">{selectedVehicle} · 3 Farms Consolidated</p>
                      </div>
                      <span className="bg-[#E6EFE8] text-[#1B382B] text-[10px] font-bold px-2 py-0.5 rounded">
                        Optimal 2-Opt
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 bg-[#FBF9F5] dark:bg-[#111613] rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Total Distance</p>
                        <p className="text-sm font-extrabold">28.4 km</p>
                      </div>
                      <div className="p-2 bg-[#FBF9F5] dark:bg-[#111613] rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Consolidated</p>
                        <p className="text-sm font-extrabold">1,500 kg</p>
                      </div>
                      <div className="p-2 bg-[#FBF9F5] dark:bg-[#111613] rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Freight Rate</p>
                        <p className="text-sm font-extrabold text-[#267A38]">₹1.18 / kg</p>
                      </div>
                    </div>

                    <div className="bg-[#E6EFE8] dark:bg-[#1F3B2C] text-[#1B382B] dark:text-[#89D7A5] text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
                      <span>🌱</span> Saved 37% fuel & 14.2 kg CO₂e vs. separate runs
                    </div>
                  </div>

                  {/* Sequenced Waypoints */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Execution Sequence</h3>
                    {[
                      { step: '1', title: 'Pickup: Ramesh Bhai Patel', sub: 'Petlad Farm · 500 kg Tomato', km: '+6.2 km' },
                      { step: '2', title: 'Pickup: Suresh Bhai Solanki', sub: 'Boriavi Shed · 600 kg Wheat', km: '+8.4 km' },
                      { step: '3', title: 'Pickup: Pravin Bhai Parmar', sub: 'Vaso Center · 400 kg Onion', km: '+5.8 km' },
                      { step: 'D', title: 'Delivery: Akshaya Patra Kitchen', sub: 'Anand Processing Depot Unload', km: '+8.0 km' },
                    ].map((stop) => (
                      <div key={stop.step} className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-3 rounded-xl flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          stop.step === 'D' ? 'bg-[#1B382B] text-white' : 'bg-[#E6EFE8] text-[#1B382B]'
                        }`}>
                          {stop.step}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{stop.title}</p>
                          <p className="text-[10px] text-muted-foreground">{stop.sub}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#536056]">{stop.km}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setRouteDispatched(true)
                      showToast(`Tata Ace (GJ-07-TY-4912) dispatched on 28.4km route!`)
                    }}
                    className="w-full bg-[#1B382B] text-white py-3 rounded-xl text-xs font-bold shadow-md hover:bg-[#254F3D] min-h-[48px]"
                  >
                    {routeDispatched ? '✓ Route Dispatched to Driver' : 'Confirm & Dispatch Collection Run'}
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCREEN 5: SAAS PLAN & ACCOUNT SETTINGS                                     */}
              {/* ========================================================================= */}
              {screen === 'settings' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScreen('dashboard')} className="p-1 rounded-lg hover:bg-[#E5E0D8]">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-extrabold">Account & Subscription</h2>
                  </div>

                  {/* Profile Card */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-[#E6EFE8] text-[#1B382B] font-extrabold text-base flex items-center justify-center">
                      RP
                    </div>
                    <div>
                      <p className="text-sm font-extrabold">Ramesh Bhai Patel</p>
                      <p className="text-xs text-muted-foreground">+91 98765 43210 · Farmer</p>
                      <span className="text-[11px] font-bold text-[#267A38] inline-flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Aadhaar Verified (•••• 9012)
                      </span>
                    </div>
                  </div>

                  {/* SaaS Subscription Card */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-extrabold text-[#1B382B] dark:text-[#89D7A5]">
                          {selectedPlan === 'community' ? 'Free Community Tier' : selectedPlan === 'pro' ? 'FPO Growth Pro' : 'Enterprise Institutional'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedPlan === 'community' ? '₹0 / month' : selectedPlan === 'pro' ? '₹2,499 / month' : '₹9,999 / month'}
                        </p>
                      </div>
                      <span className="bg-[#E6EFE8] text-[#1B382B] text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                    </div>

                    {/* Usage Meters */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>Registered Farmers:</span>
                          <span>24 / Unlimited (Pro)</span>
                        </div>
                        <div className="w-full bg-[#EAE5DC] dark:bg-[#2C3B32] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#1B382B] h-full w-[45%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span>AI GradeCam™ Scans:</span>
                          <span>48 Used (Unlimited)</span>
                        </div>
                        <div className="w-full bg-[#EAE5DC] dark:bg-[#2C3B32] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#4D7C5F] h-full w-[28%]" />
                        </div>
                      </div>
                    </div>

                    {/* Plan Selector */}
                    <div>
                      <p className="text-xs font-bold mb-1.5">Switch SaaS Tier:</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'community', name: 'Free (₹0)' },
                          { id: 'pro', name: 'Pro (₹2.4k)' },
                          { id: 'enterprise', name: 'Enterprise' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPlan(p.id as any)
                              showToast(`Subscription plan updated to ${p.name}!`)
                            }}
                            className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all ${
                              selectedPlan === p.id
                                ? 'bg-[#1B382B] text-white border-[#1B382B]'
                                : 'bg-[#FBF9F5] dark:bg-[#111613] border-[#D9D2C4] text-[#536056]'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Language Preferences */}
                  <div className="bg-white dark:bg-[#18201B] border border-[#E5E0D8] dark:border-[#2C3B32] p-4 rounded-2xl space-y-2 shadow-2xs">
                    <p className="text-xs font-bold">Vernacular Dialect for Bolna IVR</p>
                    <div className="flex gap-2">
                      {['English', 'हिन्दी (Hindi)', 'తెలుగు (Telugu)'].map((l) => (
                        <span key={l} className="bg-[#E6EFE8] text-[#1B382B] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#1B382B]/20">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      showToast('Signed out of AgriLink session.')
                      setScreen('dashboard')
                    }}
                    className="w-full bg-white dark:bg-[#18201B] border border-red-300 text-red-600 py-3 rounded-xl text-xs font-bold min-h-[48px]"
                  >
                    Sign Out of AgriLink
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PHONE BOTTOM NAVIGATION BAR (Compact Form Factor Only) */}
          {viewport === 'phone' && (
            <div className="h-16 bg-white dark:bg-[#18201B] border-t border-[#E5E0D8] dark:border-[#2C3B32] flex items-center justify-around shrink-0 px-2">
              <button
                onClick={() => setScreen('dashboard')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  screen === 'dashboard' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${screen === 'dashboard' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Home</span>
              </button>

              <button
                onClick={() => setScreen('marketplace')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  screen === 'marketplace' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${screen === 'marketplace' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                  <Store className="w-4 h-4" />
                </div>
                <span>Market</span>
              </button>

              <button
                onClick={() => setScreen('gradecam')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  screen === 'gradecam' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${screen === 'gradecam' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                  <Camera className="w-4 h-4" />
                </div>
                <span>GradeCam</span>
              </button>

              <button
                onClick={() => setScreen('logistics')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  screen === 'logistics' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${screen === 'logistics' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                  <Truck className="w-4 h-4" />
                </div>
                <span>Routes</span>
              </button>

              <button
                onClick={() => setScreen('settings')}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  screen === 'settings' ? 'text-[#1B382B] dark:text-[#89D7A5]' : 'text-[#64746A]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${screen === 'settings' ? 'bg-[#E6EFE8] dark:bg-[#1F3B2C]' : ''}`}>
                  <Settings className="w-4 h-4" />
                </div>
                <span>Account</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
