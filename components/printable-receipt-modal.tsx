'use client'

import { Printer, X, ShieldCheck, CheckCircle2, Download, Building2, Truck, FileText } from 'lucide-react'

export type DocumentType = 'receipt' | 'waybill'

interface PrintableDocumentProps {
  type: DocumentType
  isOpen: boolean
  onClose: () => void
  order?: any
  buyer?: any
}

export function PrintableReceiptModal({
  type,
  isOpen,
  onClose,
  order,
  buyer,
}: PrintableDocumentProps) {
  if (!isOpen) return null

  const crop = order?.crop || 'PADDY'
  const price = order?.pricePerKg || 28
  const qty = 500
  const gross = qty * price
  const advance = Math.round(gross * 0.3)
  const transport = Math.round(gross * 0.04)
  const net = gross - advance - transport
  const orderCode = order?.code || '#AG-1001'
  const deliveryDate = order?.deliveryDate || '2025-10-20'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-3 sm:p-6 backdrop-blur-sm print:p-0 print:bg-transparent">
      {/* Container Dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden print:max-h-none print:w-full print:border-none print:shadow-none">
        {/* Modal Header Controls (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-3.5 sm:px-6 py-3 sm:py-4 print:hidden">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
            <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {type === 'receipt' ? <FileText className="size-4 sm:size-5" /> : <Truck className="size-4 sm:size-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm truncate">
                {type === 'receipt' ? 'Settlement slip (sample layout)' : 'Collection waybill (sample layout)'}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Illustrative figures — not an invoice or official record</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-opacity min-h-[36px]"
            >
              <Printer className="size-3.5" />
              <span className="hidden min-[480px]:inline">Print / Save as PDF</span>
              <span className="min-[480px]:hidden">Print</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 sm:p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Canvas */}
        <div className="overflow-y-auto p-3.5 sm:p-10 bg-background text-foreground print:p-0 print:overflow-visible">
          {type === 'receipt' ? (
            /* =================== APMC SALE RECEIPT =================== */
            <div className="printable-document-sheet space-y-6 text-xs sm:text-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg font-serif">
                      A
                    </div>
                    <div>
                      <h1 className="font-serif text-xl font-bold tracking-tight">FPO settlement slip</h1>
                      <p className="text-xs text-muted-foreground font-mono">Registration and tax details come from the FPO’s own records</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sample layout — the figures below are illustrative, not taken from an order
                  </p>
                </div>
                <div className="flex sm:flex-col sm:items-end items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary border border-primary/20">
                    SAMPLE
                  </span>
                  <p className="font-mono text-xs text-muted-foreground">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Reference Grid */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-secondary/30 p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Beneficiary Farmer</p>
                  <p className="mt-1 font-semibold text-sm">Ramesh Kumar</p>
                  <p className="text-xs text-muted-foreground">Kheda Village, Anand Cluster, Gujarat</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Phone: +91 98251 44102</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <ShieldCheck className="size-3" /> FPO member
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Order & Buyer Details</p>
                  <p className="mt-1 font-semibold text-sm">{buyer?.name || 'PM POSHAN Central Kitchen'}</p>
                  <p className="text-xs text-muted-foreground">Order Ref: {orderCode} · Lot #LOT-1001-KHD</p>
                  <p className="text-xs text-muted-foreground">Delivery Window: {deliveryDate}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">Paid by bank transfer from the FPO account</p>
                </div>
              </div>

              {/* Quality Certification Box */}
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 rounded-xl bg-card p-1 border border-border flex items-center justify-center overflow-hidden">
                    <img src="/brand/agrilink-seal.png" alt="AgriLink Seal" className="size-full object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">Collection grade</span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        Grade A
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade and weight as recorded by the coordinator at collection.
                    </p>
                  </div>
                </div>
                <div className="font-mono text-xs text-right sm:border-l sm:border-border sm:pl-4">
                  <p className="text-muted-foreground">Lot</p>
                  <p className="font-bold text-foreground">Sample</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left">
                  <thead className="bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Qty (kg)</th>
                      <th className="px-4 py-3 text-right">Agreed Rate</th>
                      <th className="px-4 py-3 text-right">Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs sm:text-sm">
                    <tr>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold">{crop} (Grade A Table Produce)</p>
                        <p className="text-[11px] text-muted-foreground">Weighed at the FPO collection point</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">{qty} kg</td>
                      <td className="px-4 py-3.5 text-right font-mono">₹{price.toFixed(2)}/kg</td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold">₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Deductions & Net Breakdown */}
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2.5 rounded-xl border border-border bg-secondary/20 p-4 font-mono text-xs sm:text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Produce Value:</span>
                    <span>₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Less: advance paid at collection:</span>
                    <span>− ₹{advance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Less: share of transport:</span>
                    <span>− ₹{transport.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-primary text-base">
                    <span>Net Final Payout:</span>
                    <span>₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Proof & Clearing Footer */}
              <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Payment reference</p>
                  <p className="font-mono text-xs text-foreground font-medium mt-1">Bank transfer reference from the FPO account</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Sample layout.</p>
                </div>
                <div className="flex gap-8 text-center text-xs">
                  <div>
                    <div className="h-10 border-b border-border w-28" />
                    <p className="mt-1 font-medium text-muted-foreground">FPO Secretary</p>
                  </div>
                  <div>
                    <div className="h-10 border-b border-border w-28" />
                    <p className="mt-1 font-medium text-muted-foreground">Farmer Signature</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== BILL OF LADING / WAYBILL =================== */
            <div className="printable-document-sheet space-y-6 text-xs sm:text-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg font-serif">
                      W
                    </div>
                    <div>
                      <h1 className="font-serif text-xl font-bold tracking-tight">Collection waybill (sample layout)</h1>
                      <p className="text-xs text-muted-foreground font-mono">Consignment Manifest #{orderCode}-BOL</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Multi-Stop Agro-Logistics Waypoint Routing</p>
                </div>
                <div className="flex sm:flex-col sm:items-end items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 font-mono text-xs font-bold text-blue-600 border border-blue-500/20">
                    DISPATCH WAYBILL
                  </span>
                  <p className="font-mono text-xs text-muted-foreground">Generated: {new Date().toLocaleTimeString('en-IN')}</p>
                </div>
              </div>

              {/* Carrier & Vehicle Details */}
              <div className="grid gap-4 sm:grid-cols-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs sm:text-sm">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Transporter</p>
                  <p className="mt-1 font-semibold">Hired vehicle</p>
                  <p className="text-xs text-muted-foreground">Recorded by the coordinator at dispatch</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Vehicle</p>
                  <p className="mt-1 font-semibold font-mono">As entered at dispatch</p>
                  <p className="text-xs text-muted-foreground">Class chosen by load</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Driver</p>
                  <p className="mt-1 font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">Sample layout</p>
                </div>
              </div>

              {/* Waypoint Stops Manifest */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                  Stop sequence (sample stops)
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3.5 py-2.5">Stop</th>
                        <th className="px-3.5 py-2.5">Location & Contact</th>
                        <th className="px-3.5 py-2.5">GPS Coords</th>
                        <th className="px-3.5 py-2.5 text-right">Payload</th>
                        <th className="px-3.5 py-2.5 text-right">ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3.5 py-3 font-mono font-bold">1 (Depot)</td>
                        <td className="px-3.5 py-3">Kheda FPO Depot (Departure)</td>
                        <td className="px-3.5 py-3 font-mono text-xs">22.7500, 72.6800</td>
                        <td className="px-3.5 py-3 text-right font-mono">0 kg</td>
                        <td className="px-3.5 py-3 text-right font-mono">06:30 AM</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-3 font-mono font-bold">2 (Pickup)</td>
                        <td className="px-3.5 py-3">Member farmer (sample)</td>
                        <td className="px-3.5 py-3 font-mono text-xs">22.7200, 72.7100</td>
                        <td className="px-3.5 py-3 text-right font-mono font-semibold">+500 kg</td>
                        <td className="px-3.5 py-3 text-right font-mono">07:15 AM</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-3 font-mono font-bold">3 (Pickup)</td>
                        <td className="px-3.5 py-3">Member farmer (sample)</td>
                        <td className="px-3.5 py-3 font-mono text-xs">22.4100, 72.9000</td>
                        <td className="px-3.5 py-3 text-right font-mono font-semibold">+700 kg</td>
                        <td className="px-3.5 py-3 text-right font-mono">08:00 AM</td>
                      </tr>
                      <tr className="bg-secondary/20">
                        <td className="px-3.5 py-3 font-mono font-bold text-primary">4 (Drop)</td>
                        <td className="px-3.5 py-3 font-semibold">PM POSHAN Central Kitchen (Anand Hub)</td>
                        <td className="px-3.5 py-3 font-mono text-xs">22.5700, 72.9500</td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-primary">1,200 kg Total</td>
                        <td className="px-3.5 py-3 text-right font-mono">09:15 AM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chain of Custody & Receiver Sign-off */}
              <div className="border-t border-border pt-6 grid gap-6 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-border p-4 bg-secondary/15">
                  <p className="font-semibold text-foreground">Chain of custody</p>
                  <p className="text-muted-foreground mt-1">
                    Lot codes on the manifest are checked against the lots unloaded at the drop point.
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4 flex flex-col justify-between">
                  <p className="font-semibold">Drop-Point Receiving Verification</p>
                  <div className="mt-6 border-b border-border w-full" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Receiving Officer Signature · PM POSHAN Kitchen
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
