'use client'

import { useState } from 'react'
import { Users, X, Plus, ShieldCheck, Camera, Truck, CircleDollarSign, Check, Phone, MapPin, UserPlus } from 'lucide-react'

export type FpoRole = 'Coordinator' | 'QC Inspector' | 'Logistics Manager' | 'Accounts Manager'

export interface TeamMember {
  id: string
  name: string
  role: FpoRole
  mobile: string
  hub: string
  status: 'Active' | 'Invited'
}

const INITIAL_TEAM: TeamMember[] = [
  { id: 'tm-1', name: 'Anita Desai', role: 'Coordinator', mobile: '+91 98251 11001', hub: 'Anand District Hub', status: 'Active' },
  { id: 'tm-2', name: 'Rajesh Patel', role: 'QC Inspector', mobile: '+91 98251 22002', hub: 'Kheda Collection Center', status: 'Active' },
  { id: 'tm-3', name: 'Vikram Solanki', role: 'Logistics Manager', mobile: '+91 98251 33003', hub: 'Kheda FPO Depot', status: 'Active' },
  { id: 'tm-4', name: 'Meera Shah', role: 'Accounts Manager', mobile: '+91 98251 44004', hub: 'Anand Central Escrow', status: 'Active' },
]

export function TeamManagementModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState<FpoRole>('QC Inspector')
  const [hub, setHub] = useState('Kheda Collection Center')
  const [invitedMessage, setInvitedMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !mobile.trim()) return

    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      role,
      hub,
      status: 'Invited',
    }

    setTeam((prev) => [newMember, ...prev])
    setInvitedMessage(`Access invite sent to ${name} (${mobile}) for role ${role}!`)
    setName('')
    setMobile('')
    setShowInviteForm(false)
    setTimeout(() => setInvitedMessage(null), 4000)
  }

  const getRoleIcon = (r: FpoRole) => {
    switch (r) {
      case 'Coordinator':
        return <Users className="size-4 text-primary" />
      case 'QC Inspector':
        return <Camera className="size-4 text-amber-600" />
      case 'Logistics Manager':
        return <Truck className="size-4 text-blue-600" />
      case 'Accounts Manager':
        return <CircleDollarSign className="size-4 text-emerald-600" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-secondary/40">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">FPO Team & Access Control (RBAC)</h3>
              <p className="text-xs text-muted-foreground">Manage staff authorization across collection hubs and dispatch depots</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {invitedMessage && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary font-medium flex items-center gap-2">
              <Check className="size-4" />
              <span>{invitedMessage}</span>
            </div>
          )}

          {/* Role Permissions Matrix Preview */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-foreground"><Users className="size-3.5 text-primary" /> Coordinator</p>
              <p className="text-[11px] text-muted-foreground mt-1">Orders, cascades, member registry</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-foreground"><Camera className="size-3.5 text-amber-600" /> QC Inspector</p>
              <p className="text-[11px] text-muted-foreground mt-1">AI GradeCam, weighing, lot acceptance</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-foreground"><Truck className="size-3.5 text-blue-600" /> Fleet Lead</p>
              <p className="text-[11px] text-muted-foreground mt-1">Route clustering, vehicle dispatch</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-foreground"><CircleDollarSign className="size-3.5 text-emerald-600" /> Accounts</p>
              <p className="text-[11px] text-muted-foreground mt-1">30% advances, escrow & APMC bills</p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg font-bold">Authorized Staff ({team.length})</h4>
            <button
              onClick={() => setShowInviteForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-opacity"
            >
              <UserPlus className="size-3.5" /> {showInviteForm ? 'Cancel' : 'Invite Member'}
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <form onSubmit={handleInvite} className="rounded-xl border border-primary/30 bg-primary/[0.02] p-4 space-y-4">
              <h5 className="font-semibold text-xs uppercase tracking-wider text-primary">Invite New Operator</h5>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  Full Name
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </label>
                <label className="text-xs font-medium">
                  Mobile Number
                  <input
                    type="tel"
                    required
                    placeholder="+91 98250 12345"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium">
                  Assigned Operational Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as FpoRole)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  >
                    <option value="Coordinator">Coordinator</option>
                    <option value="QC Inspector">QC Inspector</option>
                    <option value="Logistics Manager">Logistics Manager</option>
                    <option value="Accounts Manager">Accounts Manager</option>
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Assigned Collection Hub
                  <select
                    value={hub}
                    onChange={(e) => setHub(e.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  >
                    <option value="Kheda Collection Center">Kheda Collection Center</option>
                    <option value="Anand District Hub">Anand District Hub</option>
                    <option value="Kheda FPO Depot">Kheda FPO Depot</option>
                    <option value="Borsad Cluster Center">Borsad Cluster Center</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                >
                  Send SMS Invitation
                </button>
              </div>
            </form>
          )}

          {/* Roster list */}
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {team.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-secondary border border-border">
                    {getRoleIcon(m.role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-foreground">{m.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${
                          m.status === 'Active'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent/20 text-accent-foreground'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{m.role}</span> · <span>{m.hub}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {m.mobile}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
