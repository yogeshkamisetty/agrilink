'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { getAuthClient } from '@/lib/auth-client'

type Data = {
  profiles: Array<{ id: string; full_name: string; role: string; mobile_number: string | null; verification_status: string; last_login_at: string | null; last_logout_at: string | null }>
  activities: Array<{ id: string; user_id: string | null; event_type: string; created_at: string }>
  pending_reviews: Array<{ id: string; crop: string; quantity_kg: number; purpose: string | null; created_at: string }>
}

type DiagnosticsData = {
  status: string
  driver: string
  schemaVersion: string
  tables: Record<string, { exists: boolean; count: number }>
  environment: {
    isVercel: boolean
    hasDatabaseUrl: boolean
    hasSupabaseUrl: boolean
    nodeEnv: string
  }
}

export function AdminPortal() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [diag, setDiag] = useState<DiagnosticsData | null>(null)
  const [error, setError] = useState('')
  const [diagBusy, setDiagBusy] = useState(false)
  const [diagMsg, setDiagMsg] = useState<string | null>(null)

  async function load() {
    try {
      const { data: session } = await getAuthClient().auth.getSession()
      if (!session.session) return router.replace('/login')
      const response = await fetch('/api/admin/reviews', {
        headers: { Authorization: 'Bearer ' + session.session.access_token },
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error)
      setData(json)

      // Also fetch diagnostics
      fetch('/api/admin/diagnostics')
        .then((res) => res.json())
        .then((d) => setDiag(d))
        .catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load admin data.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleResetSchema() {
    setDiagBusy(true)
    setDiagMsg(null)
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDiagMsg(json.message)
      // Reload diagnostics
      const d = await (await fetch('/api/admin/diagnostics')).json()
      setDiag(d)
    } catch (err) {
      setDiagMsg(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setDiagBusy(false)
    }
  }

  async function review(id: string, decision: 'approved' | 'rejected') {
    try {
      const { data: session } = await getAuthClient().auth.getSession()
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + session.session?.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: id, decision }),
      })
      if (!response.ok) setError((await response.json()).error)
      else load()
    } catch {
      setError('Failed to update review status.')
    }
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-5 bg-[#fcfbf7]">
        <div className="rounded-2xl border border-destructive/20 bg-card p-6 text-center max-w-md shadow-sm">
          <p className="font-semibold text-destructive">{error}</p>
          <button
            onClick={() => router.push('/portal')}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Return to workspace
          </button>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fcfbf7] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">AgriLink Control Centre</h2>
            <p className="mt-1 text-sm text-muted-foreground">Loading administration workspace and pending audits…</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-5 py-10 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Control centre</p>
          <h1 className="mt-2 font-serif text-4xl">Admin portal</h1>
        </div>
        <ShieldCheck className="size-10 text-primary" />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card label="Registered users" value={String(data.profiles.length)} />
        <Card label="Verified profiles" value={String(data.profiles.filter((p) => p.verification_status === 'verified').length)} />
        <Card label="Large-order reviews" value={String(data.pending_reviews.length)} />
      </div>

      {/* Database & Cloud Infrastructure Health Card */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold">Database & Cloud Health</h2>
              <p className="text-xs text-muted-foreground">
                Driver: <span className="font-mono font-semibold text-foreground uppercase">{diag?.driver || 'Detecting…'}</span> · Schema Version: <span className="font-mono font-semibold text-primary">{diag?.schemaVersion || '1.0'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSchema}
              disabled={diagBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${diagBusy ? 'animate-spin' : ''}`} /> Verify & Sync Schema
            </button>
          </div>
        </div>

        {diagMsg && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary font-medium">
            {diagMsg}
          </div>
        )}

        {diag && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(diag.tables).map(([tbl, info]) => (
              <div key={tbl} className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-foreground">{tbl}</span>
                  {info.exists ? (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  ) : (
                    <AlertCircle className="size-3.5 text-destructive" />
                  )}
                </div>
                <p className="mt-1 font-mono text-sm font-bold">{info.count} rows</p>
                <p className="text-[10px] text-muted-foreground">{info.exists ? 'Schema Active' : 'Missing'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-2xl">Buyer requests awaiting review</h2>
        <div className="mt-4 space-y-3">
          {data.pending_reviews.length ? (
            data.pending_reviews.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted p-4">
                <div>
                  <p className="font-semibold">
                    {r.quantity_kg} kg · {r.crop}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.purpose}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => review(r.id, 'approved')} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                    Approve
                  </button>
                  <button onClick={() => review(r.id, 'rejected')} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No buyer requests require review.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-2xl">User activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-3">User</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Verification</th>
                <th className="pb-3">Last login</th>
              </tr>
            </thead>
            <tbody>
              {data.profiles.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-3 font-medium">{p.full_name}</td>
                  <td className="py-3 capitalize">{p.role}</td>
                  <td className="py-3 capitalize">{p.verification_status}</td>
                  <td className="py-3">{p.last_login_at ? new Date(p.last_login_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-4xl font-bold">{value}</p>
    </div>
  )
}

