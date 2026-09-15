'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Home,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  UploadCloud,
  User,
  Utensils,
  X,
  XCircle,
} from 'lucide-react'
import type { IncomingBuyerTier } from '@/app/api/buyer/register/route'

export type BuyerTierKey = 'HOUSEHOLD' | 'RETAILER' | 'RESTAURANT' | 'INSTITUTIONAL'

export type VerificationState = 'pending' | 'under_review' | 'verified' | 'needs_correction' | 'rejected'

export interface BuyerTierConfig {
  key: BuyerTierKey
  label: string
  subtitle: string
  procurementGuidance: string
  guidanceNote: string
  icon: typeof Home
  accentColor: string
  badgeClass: string
  requiresDocs: boolean
}

export const BUYER_TIERS: BuyerTierConfig[] = [
  {
    key: 'HOUSEHOLD',
    label: 'Household',
    subtitle: 'Fresh farm produce, grains, and kitchen staples for domestic consumption',
    procurementGuidance: '1–20 kg/order',
    guidanceNote: 'Typical platform procurement guidance (not legal limits)',
    icon: Home,
    accentColor: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
    requiresDocs: false,
  },
  {
    key: 'RETAILER',
    label: 'Retailer',
    subtitle: 'Local vegetable vendors, kirana stores, fair price shops & retail grocers',
    procurementGuidance: '20–500 kg',
    guidanceNote: 'Typical platform procurement guidance (not legal limits)',
    icon: Store,
    accentColor: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
    requiresDocs: true,
  },
  {
    key: 'RESTAURANT',
    label: 'Restaurant / Food Service',
    subtitle: 'Cafes, cloud kitchens, hotels, catering enterprises, and community messes',
    procurementGuidance: '100–2,000 kg',
    guidanceNote: 'Typical platform procurement guidance (not legal limits)',
    icon: Utensils,
    accentColor: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
    requiresDocs: true,
  },
  {
    key: 'INSTITUTIONAL',
    label: 'Processor / Institution',
    subtitle: 'Food processing facilities, mills, hospital/hostel kitchens, and bulk aggregators',
    procurementGuidance: '500 kg+',
    guidanceNote: 'Typical platform procurement guidance (not legal limits)',
    icon: Building2,
    accentColor: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
    requiresDocs: true,
  },
]

export interface UploadedDoc {
  type: string
  name: string
  size: string
  uploadedAt: string
}

export function BuyerRegistrationWizard() {
  const router = useRouter()

  // 4 Primary Steps:
  // 1: Account (Name, Mobile, Email, Password, OTP verification)
  // 2: Buyer Type (Household, Retailer, Restaurant, Processor/Institution)
  // 3: Type-Specific Details (Household address only; Business proof, authorized person, licenses)
  // 4: Review & Submit
  // 5: Post-Submission Verification State Screen
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  // Step 1: Account
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP Auth States
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpTimer, setOtpTimer] = useState(45)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  // Step 2: Buyer Type
  const [selectedTier, setSelectedTier] = useState<BuyerTierKey>('HOUSEHOLD')

  // Step 3: Type-Specific Details
  // Common Location Details
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Anand')
  const [state, setState] = useState('Gujarat')
  const [pinCode, setPinCode] = useState('388001')

  // Business / Retailer / Restaurant / Processor Fields
  const [businessName, setBusinessName] = useState('')
  const [authorizedPerson, setAuthorizedPerson] = useState('')
  const [organizationType, setOrganizationType] = useState('Food Processing Unit')
  const [gstin, setGstin] = useState('')
  const [pan, setPan] = useState('')
  const [fssai, setFssai] = useState('')

  // Document Uploads (strictly business tiers only)
  const [documents, setDocuments] = useState<UploadedDoc[]>([])
  const [isSimulatingUpload, setIsSimulatingUpload] = useState<string | null>(null)

  // Form Validation & Submission
  const [stepError, setStepError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredBuyerData, setRegisteredBuyerData] = useState<any>(null)

  // Verification States: Pending, Under Review, Verified, Needs Correction, Rejected
  const [verificationStatus, setVerificationStatus] = useState<VerificationState>('under_review')
  const [reviewerNotes, setReviewerNotes] = useState<string>(
    'Application received. Documents are queued for review by the local FPO administrative desk.'
  )
  const [isSimulatingReview, setIsSimulatingReview] = useState(false)

  // Countdown timer for OTP
  useEffect(() => {
    if (otpSent && otpTimer > 0 && !otpVerified) {
      const timer = setTimeout(() => setOtpTimer((t) => t - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpSent, otpTimer, otpVerified])

  const activeTier = BUYER_TIERS.find((t) => t.key === selectedTier) || BUYER_TIERS[0]

  // OTP handlers
  const handleSendOtp = () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setStepError('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    setStepError(null)
    setIsSendingOtp(true)
    setTimeout(() => {
      setIsSendingOtp(false)
      setOtpSent(true)
      setOtpTimer(45)
      setOtpError(null)
    }, 500)
  }

  const handleVerifyOtp = () => {
    const cleanOtp = otp.trim()
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Please enter the complete 6-digit OTP.')
      return
    }
    setIsVerifyingOtp(true)
    setOtpError(null)
    setTimeout(() => {
      setIsVerifyingOtp(false)
      setOtpVerified(true)
    }, 400)
  }

  const handleFillDemoOtp = () => {
    setOtp('123456')
    setOtpError(null)
  }

  // File Upload Handlers (Simulated safe local attachment)
  const handleAttachDoc = (docType: string) => {
    setIsSimulatingUpload(docType)
    setTimeout(() => {
      const fileSlug = docType.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const newDoc: UploadedDoc = {
        type: docType,
        name: `${fileSlug}_verified.pdf`,
        size: '1.2 MB',
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setDocuments((prev) => [...prev.filter((d) => d.type !== docType), newDoc])
      setIsSimulatingUpload(null)
    }, 600)
  }

  const handleRemoveDoc = (docType: string) => {
    setDocuments((prev) => prev.filter((d) => d.type !== docType))
  }

  // Pre-fill demo data for instant evaluator convenience
  const handlePrefillDemo = (tier: BuyerTierKey) => {
    setSelectedTier(tier)
    setPassword('1234')
    setOtp('123456')
    setOtpSent(true)
    setOtpVerified(true)
    setAddress('Survey 104, Sardar Patel Road')
    setCity('Anand')
    setState('Gujarat')
    setPinCode('388001')

    if (tier === 'HOUSEHOLD') {
      setFullName('Ananya Sharma')
      setPhone('9825277103')
      setEmail('ananya.sharma@example.in')
      setBusinessName('')
      setAuthorizedPerson('')
      setGstin('')
      setPan('')
      setFssai('')
      setDocuments([])
    } else if (tier === 'RETAILER') {
      setFullName('Rameshchandra Patel')
      setPhone('9825144102')
      setEmail('patel.grocers@example.in')
      setBusinessName('Patel Daily Fresh & Kirana')
      setAuthorizedPerson('Rameshchandra Patel (Proprietor)')
      setGstin('24AAAAA1234A1Z5')
      setPan('')
      setFssai('')
      setDocuments([
        {
          type: 'Shop & Establishment License',
          name: 'patel_grocers_shop_act.pdf',
          size: '1.1 MB',
          uploadedAt: '10:15 AM',
        },
      ])
    } else if (tier === 'RESTAURANT') {
      setFullName('Chef Tushar Joshi')
      setPhone('9848033445')
      setEmail('procurement@swadkitchens.in')
      setBusinessName('Swad Cloud Kitchens & Caterers')
      setAuthorizedPerson('Tushar Joshi (Executive Chef & Partner)')
      setFssai('10826001000941')
      setGstin('24BBBBB5678B2Z1')
      setPan('')
      setDocuments([
        {
          type: 'FSSAI License / Registration',
          name: 'fssai_cert_swad_2026.pdf',
          size: '1.8 MB',
          uploadedAt: '11:00 AM',
        },
        {
          type: 'Business / Address Proof',
          name: 'commercial_kitchen_lease.pdf',
          size: '2.3 MB',
          uploadedAt: '11:02 AM',
        },
      ])
    } else {
      setFullName('Suresh Varma')
      setPhone('9848077889')
      setEmail('procurement@mahigrains.com')
      setBusinessName('Mahi Agro Processing Industries Ltd.')
      setOrganizationType('Food Processing Unit')
      setAuthorizedPerson('Suresh Varma (Head of Procurement)')
      setPan('AACCM1234P')
      setGstin('24CCCC1234C1Z9')
      setFssai('10025002000512')
      setDocuments([
        {
          type: 'Organization Registration Proof',
          name: 'certificate_of_incorporation.pdf',
          size: '3.1 MB',
          uploadedAt: '09:20 AM',
        },
        {
          type: 'FSSAI Manufacturing License',
          name: 'fssai_central_license.pdf',
          size: '2.4 MB',
          uploadedAt: '09:22 AM',
        },
      ])
    }
  }

  // Navigation Validation
  const handleProceedFromStep1 = () => {
    setStepError(null)
    if (!fullName.trim() || fullName.trim().length < 2) {
      setStepError('Please enter your full name.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setStepError('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStepError('Please enter a valid email address.')
      return
    }
    if (!password || password.length < 4) {
      setStepError('Please enter a password or MPIN of at least 4 characters.')
      return
    }
    if (!otpVerified) {
      setStepError('Please verify your mobile number with the one-time password.')
      return
    }
    setStep(2)
  }

  const handleProceedFromStep2 = () => {
    setStepError(null)
    setStep(3)
  }

  const handleProceedFromStep3 = () => {
    setStepError(null)
    if (!address.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      setStepError('Please fill in complete address, city, state, and PIN code.')
      return
    }
    if (!/^\d{6}$/.test(pinCode.trim())) {
      setStepError('Please enter a valid 6-digit postal PIN code.')
      return
    }

    if (selectedTier === 'RETAILER') {
      if (!businessName.trim()) {
        setStepError('Please enter your shop or business name.')
        return
      }
      if (!authorizedPerson.trim()) {
        setStepError('Please enter the name of the authorized contact person.')
        return
      }
    } else if (selectedTier === 'RESTAURANT') {
      if (!businessName.trim()) {
        setStepError('Please enter your restaurant, kitchen, or business name.')
        return
      }
      if (!fssai.trim()) {
        setStepError('Please enter your FSSAI registration or license number.')
        return
      }
      if (!authorizedPerson.trim()) {
        setStepError('Please enter the authorized contact person.')
        return
      }
    } else if (selectedTier === 'INSTITUTIONAL') {
      if (!businessName.trim()) {
        setStepError('Please enter your organization or company name.')
        return
      }
      if (!authorizedPerson.trim()) {
        setStepError('Please enter the authorized signatory or procurement head.')
        return
      }
    }

    setStep(4)
  }

  // Final Submission
  const handleSubmitRegistration = async () => {
    setIsSubmitting(true)
    setStepError(null)

    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, '').slice(-10),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        pin: password.trim(),
        buyerType: selectedTier,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        businessName: selectedTier === 'HOUSEHOLD' ? undefined : businessName.trim(),
        organizationType: selectedTier === 'INSTITUTIONAL' ? organizationType : undefined,
        authorizedPerson: selectedTier === 'HOUSEHOLD' ? fullName.trim() : authorizedPerson.trim() || fullName.trim(),
        gstin: selectedTier === 'HOUSEHOLD' ? undefined : gstin.trim() || undefined,
        pan: selectedTier === 'INSTITUTIONAL' ? pan.trim() || undefined : undefined,
        fssai: selectedTier === 'HOUSEHOLD' ? undefined : fssai.trim() || undefined,
        documents: selectedTier === 'HOUSEHOLD' ? [] : documents,
      }

      const res = await fetch('/api/buyer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete buyer registration.')
      }

      setRegisteredBuyerData(data)

      if (selectedTier === 'HOUSEHOLD') {
        setVerificationStatus('verified')
        setReviewerNotes('Account verified instantly via mobile OTP.')
      } else {
        setVerificationStatus('under_review')
        setReviewerNotes(
          'Your business application and uploaded proofs have been submitted to the local FPO administrative desk for review.'
        )
      }

      setStep(5)
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Registration error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Evaluator status switcher to simulate all 5 verification states
  const handleSimulateStatusChange = async (targetStatus: VerificationState) => {
    setIsSimulatingReview(true)
    try {
      const actionMap: Record<VerificationState, string> = {
        verified: 'simulate_approve',
        rejected: 'simulate_reject',
        needs_correction: 'simulate_needs_correction',
        under_review: 'simulate_under_review',
        pending: 'simulate_pending',
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10) || '9825144102'
      const res = await fetch('/api/buyer/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionMap[targetStatus],
          phone: cleanPhone,
          decision: targetStatus,
        }),
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        setVerificationStatus(targetStatus)
        setReviewerNotes(data.notes || 'Status updated by FPO administrative desk.')
      } else {
        setVerificationStatus(targetStatus)
      }
    } catch {
      setVerificationStatus(targetStatus)
    } finally {
      setIsSimulatingReview(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 font-sans">
      {/* Main Container */}
      <div className="bg-white dark:bg-card rounded-3xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
        {/* Progress Bar & Stepper (Steps 1 to 4) */}
        {step >= 1 && step <= 4 && (
          <div className="border-b border-slate-100 dark:border-border bg-slate-50/70 dark:bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {[
                { num: 1, title: 'Account' },
                { num: 2, title: 'Buyer Type' },
                { num: 3, title: 'Details' },
                { num: 4, title: 'Review' },
              ].map((item, idx) => {
                const isCurrent = step === item.num
                const isPassed = step > item.num
                return (
                  <div key={item.num} className="flex items-center gap-2">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-emerald-800 text-white ring-2 ring-emerald-200 dark:ring-emerald-900'
                          : 'bg-slate-200 dark:bg-muted text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check className="size-3.5" /> : item.num}
                    </div>
                    <span
                      className={`text-xs font-bold hidden sm:inline ${
                        isCurrent ? 'text-slate-900 dark:text-foreground' : 'text-slate-500'
                      }`}
                    >
                      {item.title}
                    </span>
                    {idx < 3 && <div className="w-6 sm:w-10 h-0.5 bg-slate-200 dark:bg-border ml-1" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Wizard Form Content */}
        <div className="p-6 sm:p-10">
          {/* ========================================================================= */}
          {/* STEP 1: ACCOUNT DETAILS & OTP AUTH                                         */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                    Step 1 of 4
                  </span>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-foreground mt-2">
                    Create Buyer Account
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter your name, mobile, email, and password to establish your verified procurement identity.
                  </p>
                </div>

                {/* 1-Click Demo Pre-fills */}
                <div className="hidden sm:block text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Sample Profiles
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePrefillDemo('HOUSEHOLD')}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
                    >
                      Household
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrefillDemo('RETAILER')}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
                    >
                      Retailer
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrefillDemo('RESTAURANT')}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition"
                    >
                      Restaurant
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <span className="grid place-items-center pl-3.5 text-slate-400">
                      <User className="size-4" />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <span className="grid place-items-center pl-3.5 text-slate-400">
                      <Mail className="size-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ananya@example.com"
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Mobile Number & OTP Trigger */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    {otpVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5" /> Mobile Verified
                      </span>
                    )}
                  </div>
                  <div className="flex rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <span className="border-r border-slate-200 dark:border-border px-3 py-2.5 text-sm font-mono text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        setOtpVerified(false)
                        setOtpSent(false)
                      }}
                      placeholder="98251 44102"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-mono outline-none font-medium"
                    />
                    {!otpVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || phone.length < 10}
                        className="px-3 text-xs font-bold text-emerald-800 hover:text-emerald-950 disabled:opacity-40 transition"
                      >
                        {isSendingOtp ? 'Sending…' : otpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Password / MPIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password / MPIN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                    <span className="grid place-items-center pl-3.5 text-slate-400">
                      <Lock className="size-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 4 characters (e.g. 1234)"
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* OTP Verification Box */}
              {otpSent && !otpVerified && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                        Enter 6-digit OTP sent to +91 {phone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFillDemoOtp}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Auto-fill Code (123456)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-40 px-3 py-2 rounded-xl border border-emerald-300 bg-white dark:bg-card text-sm font-mono tracking-widest outline-none text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otp.length < 6}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {isVerifyingOtp ? 'Verifying…' : 'Verify OTP'}
                    </button>
                    <span className="text-xs text-slate-500 ml-2">
                      {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'You can resend now'}
                    </span>
                  </div>

                  {otpError && <p className="text-xs font-semibold text-red-600">{otpError}</p>}
                </div>
              )}

              {/* Error Notice */}
              {stepError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{stepError}</span>
                </div>
              )}

              {/* Navigation Action */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-border">
                <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800">
                  Already registered? Sign in &rarr;
                </Link>
                <button
                  type="button"
                  onClick={handleProceedFromStep1}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-xs transition"
                >
                  Continue to Buyer Type
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: BUYER TYPE SELECTION                                               */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  Step 2 of 4
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-foreground mt-2">
                  Select Buyer Profile
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Choose your procurement profile. Typical platform guidance indicates expected order sizes (not legal limits).
                </p>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUYER_TIERS.map((tier) => {
                  const isSelected = selectedTier === tier.key
                  const Icon = tier.icon
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setSelectedTier(tier.key)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-600'
                          : 'border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`size-10 rounded-xl grid place-items-center ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-muted text-slate-700'
                            }`}
                          >
                            <Icon className="size-5" />
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tier.badgeClass}`}
                          >
                            {tier.procurementGuidance}
                          </span>
                        </div>

                        <h2 className="text-base font-black text-slate-900 dark:text-foreground">
                          {tier.label}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {tier.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border/60">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {tier.guidanceNote}
                        </span>
                        {!tier.requiresDocs && (
                          <span className="block text-[11px] font-bold text-emerald-700 mt-0.5">
                            ✓ Instant mobile activation · No business documents
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Guidance Explanation Alert */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <Info className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Procurement Guidance Notice:</strong> Typical platform procurement guidance helps FPO clusters allocate vehicle capacities (e.g. Tata Ace, Dost, or Eicher). These reflect customary basket volumes and are not statutory legal limits.
                </div>
              </div>

              {/* Navigation Action */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-border">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="size-4" /> Back to Account
                </button>
                <button
                  type="button"
                  onClick={handleProceedFromStep2}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-xs transition"
                >
                  Continue to Details
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: TYPE-SPECIFIC DETAILS & VERIFICATION PROOF                         */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  Step 3 of 4 · {activeTier.label} Profile
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-foreground mt-2">
                  {selectedTier === 'HOUSEHOLD'
                    ? 'Delivery Address'
                    : selectedTier === 'RETAILER'
                    ? 'Retailer & Shop Details'
                    : selectedTier === 'RESTAURANT'
                    ? 'Restaurant & Kitchen Details'
                    : 'Organization & Facility Details'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {selectedTier === 'HOUSEHOLD'
                    ? 'Enter your residential delivery address. No business documents are requested from households.'
                    : 'Provide business credentials and registration proof for FPO desk verification.'}
                </p>
              </div>

              {/* Notice for Household */}
              {selectedTier === 'HOUSEHOLD' && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    <strong className="block font-bold mb-0.5">Instant Household Activation</strong>
                    As a household buyer, no commercial registration, GSTIN, or trade proof is required. Your account activates immediately upon registration with full farm-gate market access (1–20 kg/order).
                  </div>
                </div>
              )}

              {/* Business-Specific Inputs */}
              {selectedTier !== 'HOUSEHOLD' && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-50/60 dark:bg-muted/30 border border-slate-200 dark:border-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Business Identification
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Business / Shop / Org Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {selectedTier === 'RETAILER'
                          ? 'Shop / Business Name'
                          : selectedTier === 'RESTAURANT'
                          ? 'Restaurant / Kitchen Name'
                          : 'Organization / Mill Name'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder={
                          selectedTier === 'RETAILER'
                            ? 'e.g. Patel Daily Fresh Vegetables'
                            : selectedTier === 'RESTAURANT'
                            ? 'e.g. Swad Cloud Kitchens'
                            : 'e.g. Mahi Agro Processing Ltd.'
                        }
                        className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {/* Authorized Person */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Authorized Person <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={authorizedPerson}
                        onChange={(e) => setAuthorizedPerson(e.target.value)}
                        placeholder="e.g. Ramesh Patel (Owner / Manager)"
                        className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {/* Processor Organization Type */}
                    {selectedTier === 'INSTITUTIONAL' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Organization Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={organizationType}
                          onChange={(e) => setOrganizationType(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600"
                        >
                          <option value="Food Processing Unit">Food Processing Unit</option>
                          <option value="Dal & Flour Mill">Dal & Flour Mill</option>
                          <option value="Hospital / Healthcare Canteen">Hospital / Healthcare Canteen</option>
                          <option value="Hostel / Educational Mess">Hostel / Educational Mess</option>
                          <option value="Wholesale Exporter / Aggregator">Wholesale Exporter / Aggregator</option>
                          <option value="Cooperative Society">Cooperative Society</option>
                        </select>
                      </div>
                    )}

                    {/* FSSAI License (Restaurant / Processor) */}
                    {(selectedTier === 'RESTAURANT' || selectedTier === 'INSTITUTIONAL') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          FSSAI License / Registration No.{' '}
                          {selectedTier === 'RESTAURANT' ? (
                            <span className="text-red-500">*</span>
                          ) : (
                            <span className="text-slate-400 font-normal">(where applicable)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          maxLength={14}
                          value={fssai}
                          onChange={(e) => setFssai(e.target.value.replace(/\D/g, '').slice(0, 14))}
                          placeholder="14-digit FSSAI Number"
                          className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm font-mono outline-none font-medium focus:border-emerald-600"
                        />
                      </div>
                    )}

                    {/* GSTIN (where applicable) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        GSTIN <span className="text-slate-400 font-normal">(if applicable)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 24AAAAA0000A1Z5"
                        className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm font-mono outline-none font-medium uppercase focus:border-emerald-600"
                      />
                    </div>

                    {/* PAN (Processor/Institution where applicable) */}
                    {selectedTier === 'INSTITUTIONAL' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Company / Trust PAN{' '}
                          <span className="text-slate-400 font-normal">(where applicable)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          placeholder="e.g. AABBC1234D"
                          className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm font-mono outline-none font-medium uppercase focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location & Address */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {selectedTier === 'HOUSEHOLD' ? 'Delivery Location' : 'Facility / Commercial Address'}
                </h2>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Street Address & Landmark <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Green Meadows, Sardar Patel Road"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      City / District <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Anand"
                      className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Gujarat"
                      className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background px-3 py-2.5 text-sm outline-none font-medium focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="388001"
                      className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background px-3 py-2.5 text-sm font-mono outline-none font-medium focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Document Uploads (Strictly Business Tiers Only) */}
              {selectedTier !== 'HOUSEHOLD' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Required Business Proofs
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Reviewed by the local FPO administrative desk. No live government KYC/API integration is claimed.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTier === 'RETAILER' && (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            Shop & Establishment / Trade License
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Municipal certificate or commercial electricity bill
                          </span>
                        </div>
                        <div className="mt-3">
                          {documents.some((d) => d.type.includes('Shop')) ? (
                            <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                              <span>✓ Attached</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc('Shop & Establishment License')}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAttachDoc('Shop & Establishment License')}
                              className="w-full py-2 rounded-xl bg-white dark:bg-card border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition"
                            >
                              {isSimulatingUpload === 'Shop & Establishment License'
                                ? 'Uploading…'
                                : '+ Attach License Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedTier === 'RESTAURANT' && (
                      <>
                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              FSSAI Food License Certificate
                            </span>
                            <span className="text-[11px] text-slate-500">
                              State or Central FSSAI registration certificate
                            </span>
                          </div>
                          <div className="mt-3">
                            {documents.some((d) => d.type.includes('FSSAI')) ? (
                              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                                <span>✓ Attached</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc('FSSAI Food License Certificate')}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAttachDoc('FSSAI Food License Certificate')}
                                className="w-full py-2 rounded-xl bg-white dark:bg-card border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition"
                              >
                                {isSimulatingUpload === 'FSSAI Food License Certificate'
                                  ? 'Uploading…'
                                  : '+ Attach FSSAI Certificate'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              Commercial Lease or Utility Bill
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Kitchen premises address verification
                            </span>
                          </div>
                          <div className="mt-3">
                            {documents.some((d) => d.type.includes('Lease') || d.type.includes('Business')) ? (
                              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                                <span>✓ Attached</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc('Commercial Lease Agreement')}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAttachDoc('Commercial Lease Agreement')}
                                className="w-full py-2 rounded-xl bg-white dark:bg-card border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition"
                              >
                                {isSimulatingUpload === 'Commercial Lease Agreement'
                                  ? 'Uploading…'
                                  : '+ Attach Lease / Utility Bill'}
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedTier === 'INSTITUTIONAL' && (
                      <>
                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              Organization Registration Proof
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Certificate of Incorporation, Society Registration, or Partnership Deed
                            </span>
                          </div>
                          <div className="mt-3">
                            {documents.some((d) => d.type.includes('Registration')) ? (
                              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                                <span>✓ Attached</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc('Organization Registration Proof')}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAttachDoc('Organization Registration Proof')}
                                className="w-full py-2 rounded-xl bg-white dark:bg-card border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition"
                              >
                                {isSimulatingUpload === 'Organization Registration Proof'
                                  ? 'Uploading…'
                                  : '+ Attach Registration Proof'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-border bg-slate-50/50 dark:bg-muted/20 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              FSSAI / Tax Certificate (if applicable)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Manufacturing license, GSTIN or PAN card copy
                            </span>
                          </div>
                          <div className="mt-3">
                            {documents.some((d) => d.type.includes('FSSAI') || d.type.includes('Tax')) ? (
                              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
                                <span>✓ Attached</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc('FSSAI Manufacturing License')}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAttachDoc('FSSAI Manufacturing License')}
                                className="w-full py-2 rounded-xl bg-white dark:bg-card border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition"
                              >
                                {isSimulatingUpload === 'FSSAI Manufacturing License'
                                  ? 'Uploading…'
                                  : '+ Attach FSSAI / Tax Proof'}
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {stepError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{stepError}</span>
                </div>
              )}

              {/* Navigation Action */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-border">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="size-4" /> Back to Buyer Type
                </button>
                <button
                  type="button"
                  onClick={handleProceedFromStep3}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-xs transition"
                >
                  Continue to Review
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: REVIEW & SUBMIT                                                    */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  Step 4 of 4 · Verification Review
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-foreground mt-2">
                  Review & Submit Registration
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Please review your credentials and profile details before submitting to the AgriLink platform.
                </p>
              </div>

              {/* Review Sections */}
              <div className="space-y-4">
                {/* 1. Account Summary */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="size-3.5 text-emerald-700" /> Account Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Name</span>
                      <strong className="text-slate-900 dark:text-foreground font-semibold">{fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mobile</span>
                      <strong className="text-slate-900 dark:text-foreground font-semibold flex items-center gap-1">
                        +91 {phone} <CheckCircle2 className="size-3.5 text-emerald-600 inline" />
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email</span>
                      <strong className="text-slate-900 dark:text-foreground font-semibold">{email}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Buyer Profile & Guidance */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <activeTier.icon className="size-3.5 text-emerald-700" /> Buyer Profile & Guidance
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Category</span>
                      <strong className="text-slate-900 dark:text-foreground font-semibold">
                        {activeTier.label}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Typical Platform Procurement Guidance</span>
                      <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                        {activeTier.procurementGuidance}
                      </strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        (Not legal limits; standard operational vehicle corridor capacity)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Business & Type Specific Details */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-emerald-700" />
                      {selectedTier === 'HOUSEHOLD' ? 'Delivery Address' : 'Business & Facility Info'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    {selectedTier !== 'HOUSEHOLD' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-slate-200/60 dark:border-border/60">
                        <div>
                          <span className="text-slate-400 block">Business Name</span>
                          <strong className="text-slate-900 dark:text-foreground font-semibold">{businessName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Authorized Contact</span>
                          <strong className="text-slate-900 dark:text-foreground font-semibold">{authorizedPerson}</strong>
                        </div>
                        {fssai && (
                          <div>
                            <span className="text-slate-400 block">FSSAI Registration</span>
                            <strong className="text-slate-900 dark:text-foreground font-mono">{fssai}</strong>
                          </div>
                        )}
                        {gstin && (
                          <div>
                            <span className="text-slate-400 block">GSTIN</span>
                            <strong className="text-slate-900 dark:text-foreground font-mono">{gstin}</strong>
                          </div>
                        )}
                        {pan && (
                          <div>
                            <span className="text-slate-400 block">PAN</span>
                            <strong className="text-slate-900 dark:text-foreground font-mono">{pan}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block">Address</span>
                      <strong className="text-slate-900 dark:text-foreground font-semibold">
                        {address}, {city}, {state} - {pinCode}
                      </strong>
                    </div>

                    {/* Attached Proofs */}
                    {selectedTier !== 'HOUSEHOLD' && (
                      <div className="pt-2">
                        <span className="text-slate-400 block mb-1">Attached Verification Documents</span>
                        {documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {documents.map((d, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200"
                              >
                                <FileCheck2 className="size-3" />
                                {d.type} ({d.size})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            No documents attached yet (can be provided upon FPO desk request).
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance & Verification Disclaimer */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-200 dark:border-border text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-foreground">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  <span>Administrative Verification Protocol</span>
                </div>
                <p className="text-[11px]">
                  Verification is conducted directly by the local FPO administrative desk. AgriLink does not claim automated government KYC or GSTIN portal integrations.
                  {selectedTier === 'HOUSEHOLD'
                    ? ' Household buyers are activated instantly with mobile verification.'
                    : ' Commercial buyer accounts are subject to administrative review within 24–48 hours.'}
                </p>
              </div>

              {/* Error Notice */}
              {stepError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{stepError}</span>
                </div>
              )}

              {/* Navigation Action */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-border">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="size-4" /> Back to Details
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitRegistration}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    'Submitting to FPO Registry…'
                  ) : (
                    <>
                      Confirm & Submit Registration
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: VERIFICATION STATUS & POST-SUBMISSION DASHBOARD                    */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="text-center max-w-lg mx-auto space-y-3 pt-2">
                {/* State Badge & Icon */}
                {verificationStatus === 'verified' && (
                  <div className="size-16 rounded-3xl bg-emerald-100 text-emerald-700 grid place-items-center mx-auto shadow-2xs">
                    <CheckCircle2 className="size-8" />
                  </div>
                )}
                {verificationStatus === 'under_review' && (
                  <div className="size-16 rounded-3xl bg-blue-100 text-blue-700 grid place-items-center mx-auto shadow-2xs animate-pulse">
                    <Clock className="size-8" />
                  </div>
                )}
                {verificationStatus === 'pending' && (
                  <div className="size-16 rounded-3xl bg-slate-100 text-slate-600 grid place-items-center mx-auto shadow-2xs">
                    <FileText className="size-8" />
                  </div>
                )}
                {verificationStatus === 'needs_correction' && (
                  <div className="size-16 rounded-3xl bg-amber-100 text-amber-700 grid place-items-center mx-auto shadow-2xs">
                    <ShieldAlert className="size-8" />
                  </div>
                )}
                {verificationStatus === 'rejected' && (
                  <div className="size-16 rounded-3xl bg-red-100 text-red-700 grid place-items-center mx-auto shadow-2xs">
                    <XCircle className="size-8" />
                  </div>
                )}

                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                      verificationStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : verificationStatus === 'under_review'
                        ? 'bg-blue-100 text-blue-800'
                        : verificationStatus === 'needs_correction'
                        ? 'bg-amber-100 text-amber-800'
                        : verificationStatus === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    Verification Status:{' '}
                    {verificationStatus === 'under_review'
                      ? 'Under Review'
                      : verificationStatus === 'needs_correction'
                      ? 'Needs Correction'
                      : verificationStatus.toUpperCase()}
                  </span>

                  <h1 className="text-2xl font-black text-slate-900 dark:text-foreground">
                    {verificationStatus === 'verified'
                      ? 'Account Verified & Active'
                      : verificationStatus === 'under_review'
                      ? 'Application Under Review'
                      : verificationStatus === 'needs_correction'
                      ? 'Action Required: Needs Correction'
                      : verificationStatus === 'rejected'
                      ? 'Verification Declined'
                      : 'Application Pending'}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {reviewerNotes}
                  </p>
                </div>
              </div>

              {/* Registration Receipt Summary */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/20 max-w-xl mx-auto space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-border">
                  <span className="text-slate-500">Buyer Entity</span>
                  <strong className="text-slate-900 dark:text-foreground font-bold">
                    {businessName || fullName}
                  </strong>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-border">
                  <span className="text-slate-500">Buyer Tier</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{activeTier.label}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-border">
                  <span className="text-slate-500">Procurement Guidance</span>
                  <span className="font-bold text-emerald-700">{activeTier.procurementGuidance}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-border">
                  <span className="text-slate-500">Delivery Location</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {city}, {state}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Authorized Phone</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">+91 {phone}</span>
                </div>
              </div>

              {/* Actions & Next Steps */}
              <div className="max-w-md mx-auto space-y-3 pt-2">
                <Link
                  href="/portal"
                  className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2"
                >
                  Enter AgriLink Buyer Portal
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/portal/purchase"
                  className="w-full py-3 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  Browse Direct Farm Marketplace
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
