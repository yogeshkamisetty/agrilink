import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Users,
  Utensils,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Join AgriLink · Register as Farmer or Buyer',
  description: 'Choose your role on AgriLink: Register as a producer farmer or verified buyer.',
}

export default function RegisterIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-slate-50 to-white py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          AgriLink Direct Agri-Commerce Network
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Join AgriLink Today
        </h1>
        <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto mb-10">
          Whether you cultivate harvests or purchase fresh produce for your kitchen, store, or food business — select your role to get started.
        </p>

        {/* 2 Big Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
          {/* Card 1: Farmer Registration */}
          <Link
            href="/register/farmer"
            className="group relative rounded-2xl p-6 md:p-8 bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sprout className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">For Producers</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1 mb-2">Register as Farmer</h2>
              <p className="text-slate-600 text-xs md:text-sm mb-6 leading-relaxed">
                For individual landholders, tenant cultivators, and sharecroppers. Connect with your local FPO, declare harvests, and access guaranteed MSP-linked market demand.
              </p>

              <div className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aadhaar + AgriStack digital verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Assisted physical verification for tenant farmers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Direct FPO cluster collection & prompt payments</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-emerald-700 font-bold text-sm">
              <span>Start Farmer Onboarding</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Buyer Registration */}
          <Link
            href="/register/buyer"
            className="group relative rounded-2xl p-6 md:p-8 bg-white border-2 border-emerald-600/60 hover:border-emerald-700 hover:shadow-xl transition-all flex flex-col justify-between ring-2 ring-emerald-100"
          >
            <div className="absolute top-4 right-4">
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                New Tiered Flow
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">For Conscious Buyers</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1 mb-2">Register as Buyer</h2>
              <p className="text-slate-600 text-xs md:text-sm mb-6 leading-relaxed">
                For households, retail vendors, cloud kitchens, and institutional processors. Sourced farm-gate fresh with tiered verification and transparent weight allocations.
              </p>

              <div className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span><strong>Household (1–20 kg):</strong> Instant OTP activation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span><strong>Retailer (up to 500 kg):</strong> Shop license verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span><strong>Restaurant & Processor:</strong> FSSAI bulk quotas</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-emerald-800 font-bold text-sm">
              <span>Start Buyer Registration</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Existing User Login Link */}
        <div className="text-xs text-slate-500">
          Already registered on AgriLink?{' '}
          <Link href="/login" className="text-emerald-700 font-bold hover:underline">
            Sign In with Phone & MPIN
          </Link>
        </div>
      </div>
    </main>
  )
}
