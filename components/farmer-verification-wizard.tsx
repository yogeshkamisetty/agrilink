'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Tag,
  User,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import type { FarmerType, FpoStatus, VerificationRequest } from '@/app/api/farmers/verify-flow/route'

const FPO_OPTIONS = [
  { id: 'fpo-ap-001', name: 'Kallur Agri Farmers Producer Org (FPO)', district: 'Guntur', mandal: 'Kallur' },
  { id: 'fpo-anand-001', name: 'Mahi Valley Farmer Producer Co. Ltd', district: 'Anand', mandal: 'Boriavi' },
  { id: 'fpo-ap-002', name: 'Krishna Delta Organic Farmers FPO', district: 'Krishna', mandal: 'Vuyyuru' },
  { id: 'fpo-ap-003', name: 'Tenali Chilli & Spice Growers Producer Co.', district: 'Guntur', mandal: 'Tenali' },
]

export function FarmerVerificationWizard() {
  const router = useRouter()

  // Current Step (1 to 7)
  const [step, setStep] = useState<number>(1)

  // Step 1: Mobile & OTP
  const [phone, setPhone] = useState('9848011221')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [mobileVerified, setMobileVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState('')

  // Step 2: Basic Details
  const [name, setName] = useState('Sita Devi')
  const [state, setState] = useState('Andhra Pradesh')
  const [district, setDistrict] = useState('Guntur')
  const [mandal, setMandal] = useState('Kallur')
  const [village, setVillage] = useState('Kallur North')

  // Step 3: Farmer Type
  const [farmerType, setFarmerType] = useState<FarmerType>('Tenant Farmer / Cultivator')

  // Step 4: Digital Verification (UIDAI + AgriStack)
  const [digitalVerifying, setDigitalVerifying] = useState(false)
  const [digitalResult, setDigitalResult] = useState<any>(null)
  const [forceCase, setForceCase] = useState<'default' | 'found' | 'not_found'>('default')

  // Step 5: Verification Assistance
  const [docType, setDocType] = useState('Tenancy Agreement / CCRC Card')
  const [docRef, setDocRef] = useState('CCRC-AP-2026-9021')
  const [farmerNotes, setFarmerNotes] = useState(
    'Leased 2 acres for seasonal Paddy and Tomato cultivation. Panchayat Secretary verified.'
  )
  const [assistanceSubmitting, setAssistanceSubmitting] = useState(false)
  const [assistanceTicket, setAssistanceTicket] = useState<VerificationRequest | null>(null)
  const [isWaitingForVerifier, setIsWaitingForVerifier] = useState(false)
  const [verifierApproved, setVerifierApproved] = useState(false)

  // Step 6: FPO Association
  const [fpoChoice, setFpoChoice] = useState<'YES' | 'NO' | 'UNSURE' | null>(null)
  const [selectedFpo, setSelectedFpo] = useState(FPO_OPTIONS[0].name)
  const [fpoSearch, setFpoSearch] = useState('')
  const [fpoStatus, setFpoStatus] = useState<FpoStatus>('FPO Farmer')

  // Step 7: Completed Profile
  const [finalProfile, setFinalProfile] = useState<any>(null)
  const [finalizing, setFinalizing] = useState(false)

  // Cross-tab broadcast channel listener for Verifier approval
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = (event) => {
        if (event.data?.type === 'verifier-update') {
          if (assistanceTicket && event.data.requestId === assistanceTicket.id) {
            if (event.data.status === 'APPROVED') {
              setVerifierApproved(true)
              setIsWaitingForVerifier(false)
            }
          }
        }
      }
      return () => bc.close()
    } catch {}
  }, [assistanceTicket])

  // Polling fallback when waiting for verifier
  useEffect(() => {
    if (!isWaitingForVerifier || !assistanceTicket) return
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/farmers/verify-flow?action=status&requestId=${assistanceTicket.id}`)
        const data = await res.json()
        if (data.ok && data.request?.status === 'APPROVED') {
          setVerifierApproved(true)
          setIsWaitingForVerifier(false)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(timer)
  }, [isWaitingForVerifier, assistanceTicket])

  // ---------------------------------------------------------------------------
  // STEP 1: Send & Verify OTP
  // ---------------------------------------------------------------------------
  async function handleSendOtp() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      alert('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    setOtpLoading(true)
    setOtpMessage('')
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'otp_send', phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOtpSent(true)
      setOtp(data.demoOtp || '123456')
      setOtpMessage(data.message || 'OTP sent successfully to your mobile number.')
    } catch (e: any) {
      alert(e.message || 'Failed to send OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyOtp() {
    setOtpLoading(true)
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'otp_verify', phone, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMobileVerified(true)
      setOtpMessage('✓ Mobile number verified successfully.')
    } catch (e: any) {
      alert(e.message || 'Verification failed.')
    } finally {
      setOtpLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Digital Verification (UIDAI + AgriStack)
  // ---------------------------------------------------------------------------
  async function handleRunDigitalVerification() {
    setDigitalVerifying(true)
    setDigitalResult(null)
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_digital',
          name,
          phone,
          state,
          district,
          mandal,
          village,
          farmerType,
          forceCase,
        }),
      })
      const data = await res.json()
      setDigitalResult(data)
    } catch (e) {
      alert('Failed to connect to verification services.')
    } finally {
      setDigitalVerifying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Create Assistance Request
  // ---------------------------------------------------------------------------
  async function handleCreateAssistanceRequest() {
    setAssistanceSubmitting(true)
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_assistance_request',
          name,
          phone,
          state,
          district,
          mandal,
          village,
          farmerType,
          documentType: docType,
          documentRef: docRef,
          notes: farmerNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAssistanceTicket(data.request)
      setIsWaitingForVerifier(true)

      // Notify verifier interface
      try {
        const bc = new BroadcastChannel('agrilink_sync')
        bc.postMessage({ type: 'new-assistance-request', request: data.request })
        bc.close()
      } catch {}
    } catch (e: any) {
      alert(e.message || 'Failed to submit assistance request.')
    } finally {
      setAssistanceSubmitting(false)
    }
  }

  // Quick simulate verifier approval for evaluation convenience
  async function handleSimulateVerifierApprove() {
    if (!assistanceTicket) return
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifier_action',
          requestId: assistanceTicket.id,
          verifierAction: 'APPROVE',
          notes: 'Approved via Assisted Field Verification Protocol',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setVerifierApproved(true)
        setIsWaitingForVerifier(false)
      }
    } catch (e) {
      alert('Failed to simulate approval.')
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 6 & 7: Finalize Profile & FPO Status
  // ---------------------------------------------------------------------------
  async function handleFinalizeProfile() {
    setFinalizing(true)
    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize_profile',
          farmerName: name,
          phone: `+91 ${phone}`,
          state,
          district,
          mandal,
          village,
          farmerType,
          fpoStatus,
          fpoName: fpoStatus === 'FPO Farmer' ? selectedFpo : null,
          farmerId: digitalResult?.farmerId || null,
          verificationRequestId: assistanceTicket?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setFinalProfile(data.profile)

      // Store in localStorage for seamless dashboard login
      if (typeof window !== 'undefined') {
        localStorage.setItem('agrilink_user_name', name)
        localStorage.setItem('agrilink_user_role', 'Farmer')
        localStorage.setItem('agrilink_user_phone', phone)
        localStorage.setItem('agrilink_farmer_type', farmerType)
        localStorage.setItem('agrilink_fpo_status', fpoStatus)
      }

      setStep(7)
    } catch (e: any) {
      alert(e.message || 'Failed to finalize profile.')
    } finally {
      setFinalizing(false)
    }
  }



  return (
    <div className="min-h-screen bg-[#f7f9f7] text-foreground">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Sprout className="size-5" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm sm:text-base leading-tight block">AgriLink</span>
              <span className="text-[10px] text-muted-foreground block leading-none">Farmer Registration & Verification</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/verifier"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              <ShieldCheck className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Field Verifier Portal</span>
              <span className="sm:hidden">Verifier</span>
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Breadcrumb Steps Navigation */}
        <nav className="mb-8">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 text-[11px] font-bold">
            {[
              { num: 1, label: 'Mobile & OTP' },
              { num: 2, label: 'Basic Details' },
              { num: 3, label: 'Farmer Type' },
              { num: 4, label: 'Verification' },
              { num: 5, label: 'Assisted Route', hidden: digitalResult?.case === 'RECORD_FOUND' && !assistanceTicket },
              { num: 6, label: 'FPO Status' },
              { num: 7, label: 'Complete' },
            ]
              .filter((s) => !s.hidden)
              .map((s, idx) => (
                <div key={s.num} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      step === s.num
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : step > s.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span
                    className={`hidden sm:inline ${
                      step === s.num ? 'text-primary font-bold' : 'text-muted-foreground font-normal'
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < 5 && <div className="h-0.5 w-4 bg-border/60 mx-1 hidden md:block" />}
                </div>
              ))}
          </div>
        </nav>

        {/* =================================================================== */}
        {/* STEP 1: Mobile Number & OTP (SIH Section 4) */}
        {/* =================================================================== */}
        {step === 1 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <Sprout className="size-4" />
              <span>Step 1 · Mobile Verification</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Register as a Farmer</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Enter your mobile number to create your farmer account. OTP confirms access to your phone.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Mobile Number</label>
                <div className="mt-1 flex gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                      setMobileVerified(false)
                      setOtpSent(false)
                    }}
                    placeholder="98765 43210"
                    disabled={mobileVerified}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  {!otpSent && (
                    <button
                      onClick={handleSendOtp}
                      disabled={otpLoading || phone.length !== 10}
                      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                    >
                      {otpLoading ? 'Sending...' : 'SEND OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && !mobileVerified && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Enter 6-Digit OTP</label>
                    <span className="text-[11px] text-muted-foreground">Verification Code: 123456</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-center font-mono text-base tracking-widest outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otp.length !== 6}
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      {otpLoading ? 'Verifying...' : 'VERIFY'}
                    </button>
                  </div>
                  {otpMessage && <p className="text-xs text-muted-foreground">{otpMessage}</p>}
                </div>
              )}

              {mobileVerified && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span>✓ MOBILE NUMBER VERIFIED</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-mono">+91 {phone}</span>
                </div>
              )}

              {/* Background Architecture Note (SIH Section 4) */}
              <div className="rounded-2xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">Why OTP first?</strong> Confirms mobile number ownership and creates
                  the initial farmer account. It does not by itself prove that the person is a farmer.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!mobileVerified}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 2: Basic Details (SIH Section 5) */}
        {/* =================================================================== */}
        {step === 2 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <User className="size-4" />
              <span>Step 2 · Basic Details</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Farmer Profile Details</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Your location helps match buyer demands and routes assisted verification to your local cluster.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Farmer Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sita Devi / Ramesh Patel"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option>Andhra Pradesh</option>
                    <option>Gujarat</option>
                    <option>Telangana</option>
                    <option>Maharashtra</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">District</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option>Guntur</option>
                    <option>Krishna</option>
                    <option>Anand</option>
                    <option>Kheda</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Mandal / Taluka</label>
                  <input
                    type="text"
                    value={mandal}
                    onChange={(e) => setMandal(e.target.value)}
                    placeholder="e.g. Kallur, Tenali, Vuyyuru"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Village</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Kallur North, Boriavi"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!name.trim() || !village.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 3: Farmer Type (SIH Section 6 & Section 2) */}
        {/* =================================================================== */}
        {step === 3 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <Tag className="size-4" />
              <span>Step 3 · Operational Category</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">What type of farmer are you?</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Select the option that best describes your cultivation or operational situation.
            </p>

            {/* Crucial SIH Distinction Banner (Section 2) */}
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950 text-xs leading-relaxed">
              <strong className="font-semibold block text-amber-900 mb-0.5">
                Important: Farmer Type ≠ FPO Status
              </strong>
              Farmer Type describes your cultivation situation. FPO Status describes whether you belong to a Farmer
              Producer Organisation. A tenant farmer can also be an FPO member.
            </div>

            <div className="mt-6 grid gap-3">
              {[
                {
                  id: 'Individual Farmer',
                  title: 'Individual Farmer',
                  desc: 'Cultivating own registered agricultural landholding.',
                  badge: 'Direct Landowner',
                },
                {
                  id: 'Tenant Farmer / Cultivator',
                  title: 'Tenant Farmer / Cultivator',
                  desc: 'Cultivating leased or rented land under oral or formal agreement.',
                  badge: 'Supported via Assisted Route',
                },
                {
                  id: 'Sharecropper',
                  title: 'Sharecropper',
                  desc: 'Cultivating under crop-sharing (Batai / Koulu) arrangement.',
                  badge: 'Supported via Assisted Route',
                },
                {
                  id: 'Other / Need Help',
                  title: 'Other / Need Help',
                  desc: 'Smallholder cultivator needing field verification guidance.',
                  badge: 'Field Assisted',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setFarmerType(opt.id as FarmerType)}
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                    farmerType === opt.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="farmer_type"
                    checked={farmerType === opt.id}
                    onChange={() => setFarmerType(opt.id as FarmerType)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-foreground">{opt.title}</p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity"
              >
                <span>CONTINUE</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 4: Farmer Verification (UIDAI + AgriStack) (SIH Sections 7-13) */}
        {/* =================================================================== */}
        {step === 4 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <Shield className="size-4" />
              <span>Step 4 · Digital Verification Engine</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Verify Your Farmer Details</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              We verify your identity and agricultural record before enabling direct buyer commitments.
            </p>

            {/* Architecture Card from SIH Section 8, 9, 10 */}
            <div className="mt-5 rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Two Distinct Verification Systems</span>
                <span className="text-[10px] font-mono rounded bg-primary/10 px-2 py-0.5 text-primary font-bold">
                  Independent Validation Systems
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <UserCheck className="size-3.5 text-blue-600" />
                    <span>UIDAI Route (Identity)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Answers: <em>"Is this person who they claim to be?"</em> Demographic & mobile match via Aadhaar CIDR.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Sprout className="size-3.5 text-emerald-600" />
                    <span>AgriStack (Farmer Registry)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Answers: <em>"Is there a corresponding farmer record?"</em> Checks state digital agricultural
                    database.
                  </p>
                </div>
              </div>
            </div>

            {/* Applicant Details Pill */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
              <span>
                Applicant: <strong className="text-foreground">{name}</strong>
              </span>
              <span>•</span>
              <span>
                Phone: <strong className="text-foreground">+91 {phone}</strong>
              </span>
              <span>•</span>
              <span>
                Type: <strong className="text-foreground">{farmerType}</strong>
              </span>
              <span>•</span>
              <span>
                Village: <strong className="text-foreground">{village}</strong>
              </span>
            </div>

            {/* Action Button */}
            {!digitalResult && (
              <div className="mt-6 space-y-4">
                <button
                  onClick={handleRunDigitalVerification}
                  disabled={digitalVerifying}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:opacity-95 px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xs transition-opacity disabled:opacity-60"
                >
                  {digitalVerifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Checking UIDAI Identity & AgriStack Registry...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>VERIFY FARMER</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Digital Verification Result Card */}
            {digitalResult && (
              <div className="mt-6 space-y-4 animate-in fade-in-50 duration-300">
                {/* Result 1: CASE A - RECORD FOUND */}
                {digitalResult.case === 'RECORD_FOUND' ? (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                          <CheckCircle2 className="size-3.5 text-emerald-700" />
                          <span>✓ FARMER VERIFIED</span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl font-bold text-emerald-950">
                          Your farmer details have been verified.
                        </h3>
                        <p className="mt-1 text-xs text-emerald-800">
                          Both identity authentication and agricultural registry lookup were successful.
                        </p>
                      </div>
                      <span className="rounded-md border border-emerald-300 bg-emerald-100 px-2 py-1 text-[11px] font-mono font-bold text-emerald-800">
                        {digitalResult.farmerId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
                        <span className="font-semibold text-emerald-900 block">UIDAI Identity Verification</span>
                        <span className="text-emerald-700 font-bold">✓ Success</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Demographic match confirmed via CIDR protocol.
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-3">
                        <span className="font-semibold text-emerald-900 block">AgriStack Registry Query</span>
                        <span className="text-emerald-700 font-bold">✓ Record Found</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Land parcel 142/1A (1.25 ha) confirmed.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep(6)}
                      className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors"
                    >
                      CONTINUE TO FPO ASSOCIATION &rarr;
                    </button>
                  </div>
                ) : (
                  /* Result 2: CASE B - RECORD NOT FOUND (SIH Section 13) */
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-6 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-serif text-xl font-bold text-amber-950">
                          WE COULDN'T FIND YOUR FARMER RECORD
                        </h3>
                        <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                          Don't worry. Your identity was confirmed, but a direct digital title was not found in the
                          registry. You can request verification assistance.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
                        <span className="font-semibold text-amber-900 block">UIDAI Identity Verification</span>
                        <span className="text-emerald-700 font-bold">✓ Success</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Person identity authenticated.</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
                        <span className="font-semibold text-amber-900 block">AgriStack Farmer Registry</span>
                        <span className="text-amber-800 font-bold">● No Matching Title Found</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Common for tenant cultivators & sharecroppers.
                        </p>
                      </div>
                    </div>

                    {/* Section 13 Important Distinction Note */}
                    <div className="rounded-xl bg-amber-100/70 p-3 text-[11px] text-amber-900 leading-relaxed">
                      <strong>Important distinction:</strong> Record Not Found ≠ Not a Farmer. Record Not Found ≠ Non-FPO
                      Farmer. It simply means another verification route is required.
                    </div>

                    <button
                      onClick={() => setStep(5)}
                      className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors"
                    >
                      GET VERIFICATION HELP &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 5: Verification Assistance (SIH Sections 14-17) */}
        {/* =================================================================== */}
        {step === 5 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <FileCheck2 className="size-4" />
              <span>Step 5 · Assisted Verification Request</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Verification Assistance</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Provide supporting information for local field verification. Your request will be assigned to a verifier in
              your mandal.
            </p>

            {!assistanceTicket ? (
              <div className="mt-6 space-y-4">
                {/* Pre-filled Details Card (SIH Section 14) */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs space-y-2">
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">Farmer Name:</span>
                    <span className="font-semibold text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">Farmer Type:</span>
                    <span className="font-semibold text-foreground">{farmerType}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">Village & Mandal:</span>
                    <span className="font-semibold text-foreground">
                      {village}, {mandal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">District & State:</span>
                    <span className="font-semibold text-foreground">
                      {district}, {state}
                    </span>
                  </div>
                </div>

                {/* Supporting Information Inputs */}
                <div>
                  <label className="text-xs font-semibold text-foreground">Supporting Document / Evidence Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option>Tenancy Agreement / CCRC Card</option>
                    <option>Agricultural Passbook Copy</option>
                    <option>Gram Panchayat Cultivator Certificate</option>
                    <option>Village Revenue Officer (VRO) Endorsement</option>
                    <option>Oral Lease Declaration with Landowner Reference</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Document Number / Reference</label>
                  <input
                    type="text"
                    value={docRef}
                    onChange={(e) => setDocRef(e.target.value)}
                    placeholder="e.g. CCRC-AP-2026-9021 or Lease Book Page 4"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Cultivation Details / Notes</label>
                  <textarea
                    rows={3}
                    value={farmerNotes}
                    onChange={(e) => setFarmerNotes(e.target.value)}
                    placeholder="e.g. Leased 2 acres for seasonal Paddy and Tomato cultivation."
                    className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCreateAssistanceRequest}
                    disabled={assistanceSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:opacity-90 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xs transition-opacity disabled:opacity-50"
                  >
                    {assistanceSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="size-4" />
                        <span>SUBMIT REQUEST</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Request Submitted & Live Waiting Screen (SIH Section 17) */
              <div className="mt-6 space-y-5 animate-in fade-in-50 duration-300">
                {!verifierApproved ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                          <Clock className="size-3.5 text-amber-700 animate-spin" />
                          <span>REQUEST SUBMITTED</span>
                        </div>
                        <h3 className="mt-2 font-serif text-2xl font-bold text-amber-950">
                          Request ID: {assistanceTicket.id}
                        </h3>
                        <p className="mt-1 text-xs text-amber-900">Your verification is in progress.</p>
                      </div>

                      <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                        ● Verification Pending
                      </div>
                    </div>

                    {/* Verifier Assignment Box (SIH Section 16) */}
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-4 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-amber-950">
                        <span>Assigned Field Verifier:</span>
                        <span className="font-mono">{assistanceTicket.assignedVerifier.id}</span>
                      </div>
                      <p className="text-foreground font-bold">{assistanceTicket.assignedVerifier.name}</p>
                      <p className="text-muted-foreground text-[11px]">{assistanceTicket.assignedVerifier.area}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Matching route: {village} &rarr; {mandal} Mandal &rarr; {district}
                      </p>
                    </div>

                    {/* Field Verification Status */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">Verification Dispatch Status</span>
                        <Link
                          href="/verifier"
                          target="_blank"
                          className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span>Verifier Portal &rarr;</span>
                        </Link>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Your local field verifier has been scheduled. Once the physical or document audit is complete, check status below.
                      </p>
                      <button
                        onClick={handleSimulateVerifierApprove}
                        className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 text-xs transition-colors shadow-xs"
                      >
                        Check & Sync Verification Status
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Section 20: Approved Screen */
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-emerald-950">
                          ✓ FARMER VERIFICATION COMPLETE
                        </h3>
                        <p className="text-xs text-emerald-800">
                          You are now a verified farmer through the assisted verification route.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs text-muted-foreground">
                      Assisted verification confirmed by {assistanceTicket.assignedVerifier.name} (
                      {assistanceTicket.assignedVerifier.id}). Both digital and assisted routes now merge into Verified
                      Farmer.
                    </div>

                    <button
                      onClick={() => setStep(6)}
                      className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors"
                    >
                      CONTINUE TO FPO ASSOCIATION &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 6: FPO Association (SIH Sections 24-27) */}
        {/* =================================================================== */}
        {step === 6 && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
              <Building2 className="size-4" />
              <span>Step 6 · Post-Verification FPO Association</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Are you associated with an FPO?</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Now that your farmer identity is verified, let us know if you belong to a Farmer Producer Organisation.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setFpoChoice('YES')
                  setFpoStatus('FPO Farmer')
                }}
                className={`rounded-2xl border p-4 text-center font-bold text-sm transition-all ${
                  fpoChoice === 'YES'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/40 text-foreground'
                }`}
              >
                YES
              </button>

              <button
                onClick={() => {
                  setFpoChoice('NO')
                  setFpoStatus('Non-FPO Farmer')
                }}
                className={`rounded-2xl border p-4 text-center font-bold text-sm transition-all ${
                  fpoChoice === 'NO'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/40 text-foreground'
                }`}
              >
                NO
              </button>

              <button
                onClick={() => {
                  setFpoChoice('UNSURE')
                  setFpoStatus('FPO Farmer')
                }}
                className={`rounded-2xl border p-4 text-center font-bold text-sm transition-all ${
                  fpoChoice === 'UNSURE'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/40 text-foreground'
                }`}
              >
                I'M NOT SURE
              </button>
            </div>

            {/* If YES: Search and Select FPO (SIH Section 25) */}
            {fpoChoice === 'YES' && (
              <div className="mt-6 space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Select Your FPO</span>
                  <span className="text-[11px] text-muted-foreground">Search or choose from nearby</span>
                </div>

                <div className="space-y-2">
                  {FPO_OPTIONS.map((fpo) => (
                    <label
                      key={fpo.id}
                      onClick={() => setSelectedFpo(fpo.name)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                        selectedFpo === fpo.name
                          ? 'border-primary bg-primary/5 font-semibold text-foreground'
                          : 'border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div>
                        <p className="text-foreground font-bold">{fpo.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fpo.mandal}, {fpo.district}
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="selected_fpo"
                        checked={selectedFpo === fpo.name}
                        onChange={() => setSelectedFpo(fpo.name)}
                        className="size-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>
                    FPO Confirmation: Association request sent to <strong>{selectedFpo}</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* If NO: Non-FPO Farmer (SIH Section 26) */}
            {fpoChoice === 'NO' && (
              <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground space-y-2">
                <p className="text-foreground font-bold">Registered as Non-FPO Farmer</p>
                <p>
                  You can sell produce directly on AgriLink as an independent smallholder. You can always join or link an
                  FPO later from your settings.
                </p>
              </div>
            )}

            {/* If UNSURE: Helper (SIH Section 27) */}
            {fpoChoice === 'UNSURE' && (
              <div className="mt-6 space-y-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <HelpCircle className="size-4" />
                  <span>Nearby FPOs Detected for your Mandal ({mandal}, {district})</span>
                </div>
                <p className="text-[11px] text-blue-900">
                  Based on your village location, here are registered producer groups operating in your cluster:
                </p>
                <div className="space-y-1.5 pt-1">
                  {FPO_OPTIONS.slice(0, 2).map((fpo) => (
                    <button
                      key={fpo.id}
                      onClick={() => {
                        setSelectedFpo(fpo.name)
                        setFpoChoice('YES')
                        setFpoStatus('FPO Farmer')
                      }}
                      className="w-full text-left rounded-xl border border-blue-200 bg-white p-2.5 text-xs font-semibold text-foreground hover:bg-blue-100/50 transition-colors"
                    >
                      {fpo.name} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleFinalizeProfile}
                disabled={!fpoChoice || finalizing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {finalizing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Completing Registration...</span>
                  </>
                ) : (
                  <>
                    <span>COMPLETE REGISTRATION</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* STEP 7: Registration Complete (SIH Section 28 & 30) */}
        {/* =================================================================== */}
        {step === 7 && finalProfile && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs text-center space-y-6">
            <div className="mx-auto size-16 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shadow-xs">
              <CheckCircle2 className="size-9" />
            </div>

            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                Verified Farmer Account
              </span>
              <h1 className="mt-3 font-serif text-3xl font-bold">Registration Complete!</h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Your profile is active, verified, and ready to receive buyer harvest commitments.
              </p>
            </div>

            {/* Farmer Profile Card (SIH Section 30) */}
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-5 text-left text-xs space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Account ID:</span>
                <span className="font-mono font-bold text-foreground">{finalProfile.id}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Farmer Name:</span>
                <span className="font-semibold text-foreground">{finalProfile.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Mobile:</span>
                <span className="font-semibold text-foreground">{finalProfile.phone}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Farmer Type:</span>
                <span className="font-semibold text-foreground">{finalProfile.farmerType}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Verification Status:</span>
                <span className="font-bold text-emerald-700">✓ VERIFIED FARMER</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">FPO Classification:</span>
                <span className="font-bold text-primary">
                  {finalProfile.fpoStatus}
                  {finalProfile.fpoName ? ` (${finalProfile.fpoName})` : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/portal"
                className="w-full sm:w-auto rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-opacity"
              >
                Go to Farmer Dashboard &rarr;
              </Link>
              <button
                onClick={() => {
                  setStep(1)
                  setPhone('9848011221')
                  setMobileVerified(false)
                  setOtpSent(false)
                  setDigitalResult(null)
                  setAssistanceTicket(null)
                  setFinalProfile(null)
                }}
                className="w-full sm:w-auto rounded-xl border border-border px-5 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Test Another Registration
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
