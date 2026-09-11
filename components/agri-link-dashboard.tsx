'use client'

import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  Droplets,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  PackageCheck,
  Route,
  Send,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
  Wheat,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Orders', icon: ClipboardList, count: '03' },
  { label: 'Farmer network', icon: Users },
  { label: 'Collection & grade', icon: Camera },
  { label: 'Routes', icon: Route },
  { label: 'Settlements', icon: CircleDollarSign },
]

const notifications = [
  { name: 'Ramesh Kumar', detail: 'accepted · 50 kg', time: 'just now', color: 'bg-primary' },
  { name: 'Savitri Devi', detail: 'accepted · 70 kg', time: '12 sec ago', color: 'bg-amber-700' },
  { name: 'Mohan Lal', detail: 'accepted · 80 kg', time: '24 sec ago', color: 'bg-sky-700' },
  { name: 'Lakshmi Bai', detail: 'standby · 30 kg', time: '31 sec ago', color: 'bg-stone-500' },
]

export function AgriLinkDashboard() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)

  function runNotify() {
    setNotifying(true)
    window.setTimeout(() => {
      setNotifying(false)
      setNotified(true)
    }, 1100)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border px-7">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sprout className="size-5" /></div>
          <div><div className="font-serif text-xl font-bold tracking-tight">AgriLink</div><div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">FARM TO COMMONS</div></div>
        </div>
        <div className="flex flex-1 flex-col justify-between px-3 py-6">
          <nav className="space-y-1">
            <div className="mb-4 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspace</div>
            {navItems.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => setActiveNav(label)} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors ${activeNav === label ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><span className="flex items-center gap-3"><Icon className="size-4" />{label}</span>{count && <span className={`font-mono text-[10px] ${activeNav === label ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{count}</span>}</button>)}
          </nav>
          <div className="rounded-xl border border-border bg-secondary/60 p-4"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Network health</span><span className="size-2 rounded-full bg-primary" /></div><div className="mb-2 text-2xl font-semibold tracking-tight">77%</div><p className="text-xs leading-5 text-muted-foreground">of this week&apos;s volume moved through confirmed orders.</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full w-[77%] rounded-full bg-primary" /></div></div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu className="size-5" /></button><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tuesday · 14 October 2025</p><h1 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">Good morning, Anita</h1></div></div>
          <div className="flex items-center gap-3"><button className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Notifications"><Bell className="size-5" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></button><div className="hidden h-8 w-px bg-border sm:block" /><button className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-accent-foreground">AK</span><span className="hidden sm:inline">Coordinator</span><ChevronDown className="size-3 text-muted-foreground" /></button></div>
        </header>

        {menuOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMenuOpen(false)}><div className="h-full w-72 border-r border-border bg-card p-5" onClick={(e) => e.stopPropagation()}><div className="mb-8 flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sprout className="size-5" /></div><span className="font-serif text-xl font-bold">AgriLink</span><button className="ml-auto" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="size-5" /></button></div>{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setMenuOpen(false) }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm ${activeNav === label ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Icon className="size-4" />{label}</button>)}</div></div>}

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-2 rounded-full bg-primary" />Live operations</div><h2 className="max-w-2xl font-serif text-4xl font-bold tracking-tight text-balance sm:text-5xl">Demand finds the harvest.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">One order, many small plots. Today&apos;s tomato consignment is on track for the school kitchen.</p></div><button className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"><ClipboardList className="size-4" /> New order</button></div>

          <section className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5"><div className="mb-7 flex items-center justify-between"><span className="text-sm text-muted-foreground">Active order value</span><div className="rounded-lg bg-secondary p-2 text-primary"><CircleDollarSign className="size-4" /></div></div><div className="flex items-end justify-between"><div><span className="font-serif text-3xl font-bold">₹36,000</span><p className="mt-1 text-xs text-muted-foreground">School kitchen · 200 kg</p></div><span className="flex items-center gap-1 text-xs font-semibold text-primary"><ArrowUpRight className="size-3" /> +12.4%</span></div></div><div className="rounded-xl border border-border bg-card p-5"><div className="mb-7 flex items-center justify-between"><span className="text-sm text-muted-foreground">Committed volume</span><div className="rounded-lg bg-secondary p-2 text-primary"><Wheat className="size-4" /></div></div><div className="flex items-end justify-between"><div><span className="font-serif text-3xl font-bold">230 <small className="font-sans text-base font-normal text-muted-foreground">kg</small></span><p className="mt-1 text-xs text-muted-foreground">115% of target · buffer ready</p></div><span className="text-xs font-semibold text-accent">On track</span></div></div><div className="rounded-xl border border-border bg-card p-5"><div className="mb-7 flex items-center justify-between"><span className="text-sm text-muted-foreground">Farmer realised</span><div className="rounded-lg bg-secondary p-2 text-primary"><Leaf className="size-4" /></div></div><div className="flex items-end justify-between"><div><span className="font-serif text-3xl font-bold">₹18</span><small className="ml-1 text-base font-normal text-muted-foreground">/kg</small><p className="mt-1 text-xs text-muted-foreground">vs ₹13 mandi price</p></div><span className="flex items-center gap-1 text-xs font-semibold text-primary"><ArrowUpRight className="size-3" /> +₹5</span></div></div></section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><div className="rounded-xl border border-border bg-card"><div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-start"><div><div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">Order #AG-1042</span><span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent"><span className="size-1.5 rounded-full bg-accent" />Live</span></div><h3 className="font-serif text-xl font-bold">Fresh tomato · School kitchen</h3><p className="mt-1 text-sm text-muted-foreground">Delivery Monday, 20 October · 200 kg at ₹18/kg</p></div><button onClick={runNotify} disabled={notifying || notified} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-70">{notified ? <Check className="size-4" /> : <Send className="size-4" />}{notifying ? 'Sending cascade...' : notified ? 'Farmers notified' : 'Notify matched farmers'}</button></div><div className="p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold">Commitment tracker</p><p className="mt-1 text-xs text-muted-foreground">Target volume with 15% standby buffer</p></div><span className="font-mono text-sm font-semibold text-primary">230 / 200 kg</span></div><div className="relative h-3 overflow-hidden rounded-full bg-secondary"><div className="absolute inset-y-0 left-0 w-[87%] rounded-full bg-primary transition-all duration-700" /><div className="absolute inset-y-0 left-[77%] w-px bg-background" /></div><div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>0 kg</span><span>Target 200</span><span>Buffer 230</span></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-secondary/60 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary" />Confirmed</div><div className="font-serif text-2xl font-bold">200 kg</div><div className="mt-1 text-[11px] text-muted-foreground">3 farmers</div></div><div className="rounded-lg bg-secondary/60 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-amber-600" />Standby</div><div className="font-serif text-2xl font-bold">30 kg</div><div className="mt-1 text-[11px] text-muted-foreground">1 farmer</div></div><div className="rounded-lg bg-secondary/60 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-border" />Gap to target</div><div className="font-serif text-2xl font-bold text-primary">0 kg</div><div className="mt-1 text-[11px] text-muted-foreground">fully covered</div></div></div></div></div>

            <div className="rounded-xl border border-border bg-primary p-5 text-primary-foreground"><div className="mb-8 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">Notification cascade</p><h3 className="mt-2 font-serif text-xl font-bold">Order finds the farmer.</h3></div><div className="rounded-lg bg-primary-foreground/10 p-2"><Bell className="size-4" /></div></div><div className="space-y-4">{['SMS', 'WhatsApp', 'IVR voice', 'Coordinator list'].map((channel, index) => <div key={channel} className="flex items-center gap-3"><div className={`flex size-8 items-center justify-center rounded-full border ${index < (notified ? 4 : 3) ? 'border-primary-foreground/30 bg-primary-foreground/15' : 'border-primary-foreground/15 bg-primary-foreground/5'}`}>{index < (notified ? 4 : 3) ? <Check className="size-3.5" /> : <span className="font-mono text-[10px]">{index + 1}</span>}</div><div className="flex-1"><div className="flex items-center justify-between text-xs"><span className="font-medium">{channel}</span><span className="text-primary-foreground/50">{index < (notified ? 4 : 3) ? 'complete' : 'ready'}</span></div><div className="mt-1.5 h-1 rounded-full bg-primary-foreground/10"><div className={`h-full rounded-full bg-accent transition-all duration-500 ${index < (notified ? 4 : 3) ? 'w-full' : 'w-0'}`} /></div></div></div>)}</div><div className="mt-8 border-t border-primary-foreground/15 pt-4"><div className="flex items-center justify-between text-xs"><span className="text-primary-foreground/60">Matched farmers</span><span className="font-mono font-semibold">12 nearby</span></div><div className="mt-3 flex -space-x-2">{notifications.map((item) => <div key={item.name} title={item.name} className={`flex size-8 items-center justify-center rounded-full border-2 border-primary font-mono text-[10px] text-primary-foreground ${item.color}`}>{item.name.split(' ').map((n) => n[0]).join('')}</div>)}<div className="flex size-8 items-center justify-center rounded-full border-2 border-primary bg-primary-foreground/10 font-mono text-[10px]">+8</div></div></div></div></section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]"><div className="rounded-xl border border-border bg-card p-5"><div className="mb-5 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Price proof</p><h3 className="mt-2 font-serif text-xl font-bold">Both sides gain.</h3></div><ShieldCheck className="size-5 text-primary" /></div><div className="space-y-4"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-sm font-medium">AGMARKNET mandi</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />Live · today, 08:42</p></div><span className="font-serif text-2xl font-bold">₹13</span></div><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-sm font-medium">Farmer realised</p><p className="mt-1 text-xs text-muted-foreground">AgriLink collection price</p></div><span className="flex items-center gap-1 font-serif text-2xl font-bold text-primary">₹18 <ArrowUpRight className="size-4" /></span></div><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-sm font-medium">DoCA retail</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-accent" />Published · today</p></div><span className="font-serif text-2xl font-bold">₹28</span></div><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Buyer paid</p><p className="mt-1 text-xs text-muted-foreground">School kitchen contract</p></div><span className="flex items-center gap-1 font-serif text-2xl font-bold text-primary">₹21 <ArrowDownRight className="size-4" /></span></div></div><div className="mt-5 rounded-lg bg-secondary p-3 text-center"><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chain margin compressed</span><div className="mt-1 font-serif text-xl font-bold">₹15 <span className="px-2 text-muted-foreground">→</span> ₹3 <span className="ml-1 text-sm font-sans font-normal text-primary">per kg</span></div></div></div>

            <div className="rounded-xl border border-border bg-card p-5"><div className="mb-5 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s movement</p><h3 className="mt-2 font-serif text-xl font-bold">Collection runway</h3></div><div className="flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"><Cloud className="size-3.5" /> 28°C · clear</div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border p-3"><MapPin className="mb-5 size-4 text-primary" /><div className="font-serif text-2xl font-bold">04</div><p className="mt-1 text-xs text-muted-foreground">village pickups</p></div><div className="rounded-lg border border-border p-3"><Truck className="mb-5 size-4 text-primary" /><div className="font-serif text-2xl font-bold">18.4</div><p className="mt-1 text-xs text-muted-foreground">km optimised route</p></div><div className="rounded-lg border border-border p-3"><PackageCheck className="mb-5 size-4 text-primary" /><div className="font-serif text-2xl font-bold">09:30</div><p className="mt-1 text-xs text-muted-foreground">collection starts</p></div></div><div className="mt-5 flex items-center gap-3 rounded-lg bg-secondary/60 p-3"><div className="flex size-9 items-center justify-center rounded-lg bg-card text-primary"><Droplets className="size-4" /></div><div className="flex-1"><p className="text-xs font-semibold">Route is ready to dispatch</p><p className="mt-0.5 text-[11px] text-muted-foreground">Manifest includes 4 lots · 230 kg total</p></div><button className="text-xs font-semibold text-primary">View route →</button></div></div></section>
        </div>
      </main>
    </div>
  )
}
