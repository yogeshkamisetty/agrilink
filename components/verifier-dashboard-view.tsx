'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react'
import type { VerificationRequest } from '@/app/api/farmers/verify-flow/route'

export function VerifierDashboardView() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, moreInfo: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'MORE_INFO_REQUESTED'>('PENDING')
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
  const [verifierNotes, setVerifierNotes] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Active Verifier Identity for this prototype session
  const verifierProfile = {
    id: 'V002',
    name: 'M. Venkateswarlu',
    role: 'Authorized Field Verifier (Assisted Protocol)',
    area: 'Kallur & Tenali Mandal Clusters',
    contact: '+91 94401 22334',
  }

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await fetch('/api/farmers/verify-flow?action=list')
      const data = await res.json()
      if (data.ok) {
        setRequests(data.requests)
        setStats(data.stats)
        if (selectedRequest) {
          const updated = data.requests.find((r: VerificationRequest) => r.id === selectedRequest.id)
          if (updated) setSelectedRequest(updated)
        }
      }
    } catch (err) {
      console.error('Failed to load verification requests', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()

    // Listen for cross-tab updates from farmer registrations
    try {
      const bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = (event) => {
        if (event.data?.type === 'new-assistance-request' || event.data?.type === 'verifier-update') {
          fetchRequests()
        }
      }
      return () => bc.close()
    } catch {}
  }, [])

  async function handleVerifierAction(actionType: 'APPROVE' | 'REQUEST_MORE_INFO' | 'REJECT') {
    if (!selectedRequest) return
    setActionBusy(true)
    setActionSuccess('')

    try {
      const res = await fetch('/api/farmers/verify-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifier_action',
          requestId: selectedRequest.id,
          verifierAction: actionType,
          notes: verifierNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed.')

      // Broadcast update so farmer's waiting screen unlocks immediately
      try {
        const bc = new BroadcastChannel('agrilink_sync')
        bc.postMessage({
          type: 'verifier-update',
          requestId: selectedRequest.id,
          status: data.request?.status,
          farmerPhone: selectedRequest.phone,
        })
        bc.close()
      } catch {}

      setActionSuccess(
        actionType === 'APPROVE'
          ? `Request ${selectedRequest.id} APPROVED! Farmer has been granted Verified Farmer status.`
          : actionType === 'REQUEST_MORE_INFO'
          ? `Request ${selectedRequest.id} marked: More information requested from farmer.`
          : `Request ${selectedRequest.id} marked: Rejected.`
      )

      await fetchRequests()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update request.')
    } finally {
      setActionBusy(false)
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (activeTab !== 'ALL' && r.status !== activeTab) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.id.toLowerCase().includes(q) ||
      r.farmerName.toLowerCase().includes(q) ||
      r.farmerType.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-[#f7f9f7] text-foreground">
      {/* Top Prototype Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/register/farmer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Farmer Portal</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldCheck className="size-3.5" />
                </span>
                <h1 className="font-serif text-lg font-bold">Field Verifier Interface</h1>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                  SIH Screens 1 & 2
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assisted Verification Channel for Cultivators, Tenants & Sharecroppers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-semibold">{verifierProfile.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {verifierProfile.id} · {verifierProfile.area}
                </p>
              </div>
              <div className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-xs">
                V2
              </div>
            </div>
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Verifier Screen 2: Details & Decision Screen */}
        {selectedRequest ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setActionSuccess('')
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="size-4" />
                Back to Verifier Dashboard
              </button>
              <span className="text-xs text-muted-foreground font-mono">Request: {selectedRequest.id}</span>
            </div>

            {/* Success notification banner */}
            {actionSuccess && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* SIH Section 19: Verifier Screen 2 Layout */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Farmer Summary & Supporting Documents */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        SIH Screen 2 · Farmer Verification Review
                      </span>
                      <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">{selectedRequest.farmerName}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {selectedRequest.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {selectedRequest.village}, {selectedRequest.mandal}, {selectedRequest.district},{' '}
                          {selectedRequest.state}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        selectedRequest.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedRequest.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : selectedRequest.status === 'MORE_INFO_REQUESTED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      ● {selectedRequest.status.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <hr className="my-5 border-border" />

                  {/* Core Classification Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Farmer Type
                      </p>
                      <p className="mt-1 font-bold text-foreground text-sm sm:text-base">
                        {selectedRequest.farmerType}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {selectedRequest.farmerType.includes('Tenant') || selectedRequest.farmerType.includes('Sharecropper')
                          ? 'Cultivates without direct survey title in digital registry'
                          : 'Standard cultivator verification route'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Assigned Verifier
                      </p>
                      <p className="mt-1 font-bold text-foreground text-sm sm:text-base">
                        {selectedRequest.assignedVerifier.name} ({selectedRequest.assignedVerifier.id})
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {selectedRequest.assignedVerifier.area}
                      </p>
                    </div>
                  </div>

                  {/* Supporting Information Box (SIH Section 14) */}
                  <div className="mt-5 rounded-2xl border border-border/80 bg-background p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <FileText className="size-4" />
                      <span>Supporting Information & Evidence</span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Evidence Document:</span>
                        <span className="font-semibold text-foreground">
                          {selectedRequest.supportingInfo.documentType}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Reference / Card No:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {selectedRequest.supportingInfo.documentRef}
                        </span>
                      </div>
                      {selectedRequest.supportingInfo.notes && (
                        <div className="pt-2">
                          <span className="text-muted-foreground block text-xs mb-1">Applicant Notes:</span>
                          <p className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-foreground italic">
                            "{selectedRequest.supportingInfo.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Educational Callout from Section 16 & 23 */}
                  <div className="mt-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 text-xs leading-relaxed text-emerald-900">
                    <strong className="font-semibold">Why this assisted route matters:</strong> In government
                    guidelines, landholding registries primarily capture title owners. The assisted verification channel
                    ensures tenant cultivators and sharecroppers are verified through local evidence rather than being
                    excluded from market access.
                  </div>
                </div>
              </div>

              {/* Action Console & Decision Card */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
                  <h3 className="font-serif text-lg font-bold">Verifier Decision Console</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Record your verification observation and update the farmer status.
                  </p>

                  <div className="mt-4">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Verifier Notes / Observations:
                    </label>
                    <textarea
                      rows={4}
                      value={verifierNotes}
                      onChange={(e) => setVerifierNotes(e.target.value)}
                      placeholder="e.g., Verified physical plot cultivation, CCRC certificate, and landowner lease agreement."
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <button
                      onClick={() => handleVerifierAction('APPROVE')}
                      disabled={actionBusy || selectedRequest.status === 'APPROVED'}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>{selectedRequest.status === 'APPROVED' ? 'Already Approved' : 'APPROVE (Mark Verified)'}</span>
                    </button>

                    <button
                      onClick={() => handleVerifierAction('REQUEST_MORE_INFO')}
                      disabled={actionBusy}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
                    >
                      <HelpCircle className="size-4" />
                      <span>REQUEST MORE INFORMATION</span>
                    </button>

                    <button
                      onClick={() => handleVerifierAction('REJECT')}
                      disabled={actionBusy || selectedRequest.status === 'REJECTED'}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="size-3.5" />
                      <span>REJECT APPLICATION</span>
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border text-[11px] text-muted-foreground space-y-1">
                    <p>
                      <strong>Protocol:</strong> Andhra Pradesh Crop Cultivator Rights Act (CCRC) Framework
                    </p>
                    <p>
                      <strong>Real-Time Link:</strong> Approving will immediately unlock the farmer's waiting screen and
                      advance them to Step 6 (FPO Association).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Verifier Screen 1: Dashboard (SIH Section 18) */
          <div className="space-y-6">
            {/* Verifier Dashboard Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  SIH Screen 1 · Verifier Dashboard
                </span>
                <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">Assisted Verification Queue</h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Review applicant cultivators whose digital registry records were not immediately found.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/register/farmer"
                  className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
                >
                  Test Farmer Onboarding &rarr;
                </Link>
              </div>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800">Pending Review</span>
                  <Clock className="size-4 text-amber-600" />
                </div>
                <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-amber-900">{stats.pending}</p>
                <p className="text-[11px] text-amber-700">Awaiting field assessment</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800">Approved</span>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-emerald-900">{stats.approved}</p>
                <p className="text-[11px] text-emerald-700">Verified as cultivators</p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-800">More Info Needed</span>
                  <HelpCircle className="size-4 text-blue-600" />
                </div>
                <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-blue-900">{stats.moreInfo}</p>
                <p className="text-[11px] text-blue-700">Waiting on farmer input</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Total In Queue</span>
                  <FileSearch className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-[11px] text-muted-foreground">Location Cluster V002</p>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['PENDING', 'ALL', 'APPROVED', 'MORE_INFO_REQUESTED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {tab === 'PENDING' ? `Pending (${stats.pending})` : tab === 'ALL' ? `All (${stats.total})` : tab === 'APPROVED' ? `Approved (${stats.approved})` : `More Info (${stats.moreInfo})`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search farmer, village, ID..."
                  className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Requests Cards / Table */}
            {filteredRequests.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-12 text-center">
                <CheckCircle2 className="mx-auto size-10 text-muted-foreground/40" />
                <h3 className="mt-3 font-serif text-lg font-bold">No requests in this view</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  All requests have been processed or none match your search filter.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRequests.map((req) => (
                  <article
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{req.id}</span>
                        <span className="text-muted-foreground">·</span>
                        <h4 className="font-bold text-foreground text-sm sm:text-base">{req.farmerName}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'MORE_INFO_REQUESTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{req.farmerType}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {req.village}, {req.district}
                        </span>
                        <span>•</span>
                        <span>Doc: {req.supportingInfo.documentType}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
                      >
                        VIEW DETAILS & REVIEW
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
