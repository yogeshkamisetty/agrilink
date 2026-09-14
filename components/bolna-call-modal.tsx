'use client'

import { useState, useEffect } from 'react'
import {
  X,
  PhoneCall,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  Bot,
  User,
  MapPin,
  Check,
} from 'lucide-react'

export interface BolnaCallModalProps {
  isOpen: boolean
  onClose: () => void
  farmer: {
    id?: string
    name: string
    mobile_number?: string
    village?: string
    crop?: string
    crop_name?: string
  } | null
  order?: {
    id?: string
    code?: string
    crop?: string
    crop_required?: string
    qty_target_kg?: number
    quantity_required?: number
    price_per_kg?: number
    delivery_date?: string
    delivery_location?: string
    buyer_name?: string
  } | null
  allocatedKg?: number
  onCallSuccess?: (farmerId: string, details: any) => void
}

export function BolnaCallModal({
  isOpen,
  onClose,
  farmer,
  order,
  allocatedKg = 300,
  onCallSuccess,
}: BolnaCallModalProps) {
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState<'hi' | 'gu' | 'te' | 'en'>('hi')
  const [isCalling, setIsCalling] = useState(false)
  const [callResult, setCallResult] = useState<{
    ok: boolean
    status?: string
    message: string
    callId?: string
    provider?: string
  } | null>(null)
  const [confirmedStatus, setConfirmedStatus] = useState<boolean>(false)

  // Initialize or reset phone number when modal opens or farmer changes
  useEffect(() => {
    if (farmer?.mobile_number) {
      setPhone(farmer.mobile_number)
    } else {
      setPhone('+91 98251 44102')
    }
    setCallResult(null)
    setConfirmedStatus(false)
  }, [farmer, isOpen])

  if (!isOpen || !farmer) return null

  const cropName = order?.crop || order?.crop_required || farmer.crop_name || farmer.crop || 'Produce'
  const orderCode = order?.code || `AG-${String(order?.id || '1001').slice(-4).toUpperCase()}`
  const buyerName = order?.buyer_name || order?.delivery_location || 'Institutional Kitchen'
  const pricePerKg = order?.price_per_kg || 28
  const deliveryDate = order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '18 Oct 2025'
  const village = farmer.village || 'Kheda'

  // Script preview in selected language
  const scriptPreviews = {
    hi: `नमस्ते ${farmer.name} जी! मैं माही वैली एफपीओ से एग्रीलिंक एआई कॉलिंग एजेंट बात कर रहा हूँ। ${buyerName} द्वारा ${cropName} का एक नया बल्क ऑर्डर (${orderCode}) जारी किया गया है। आपके प्रोफाइल और विलेज क्लस्टर (${village}) के आधार पर आपका आवंटन ${allocatedKg} किलो है, जिसकी गारंटीड कीमत ₹${pricePerKg}/किलो है। क्या आप ${deliveryDate} को पिकअप के लिए यह मात्रा देने में सक्षम हैं?`,
    gu: `નમસ્તે ${farmer.name} ભાઈ! હું માહી વેલી એફપીઓ તરફથી એગ્રીલિંક એઆઈ કોલિંગ એજન્ટ વાત કરું છું. ${buyerName} દ્વારા ${cropName} માટે નવો બલ્ક ઓર્ડર (${orderCode}) મૂકવામાં આવ્યો છે. તમારી પ્રોફાઇલ મુજબ તમારો ક્વોટા ${allocatedKg} કિલો અને ખાતરીપૂર્વકનો ભાવ ₹${pricePerKg}/કિલો છે. શું તમે ${deliveryDate} સુધીમાં આ સપ્લાય કરવા સક્ષમ છો?`,
    te: `నమస్కారం ${farmer.name} గారు! నేను మాహి వ్యాలీ FPO నుండి అగ్రిలింక్ AI కాలింగ్ ఏజెంట్‌ని మాట్లాడుతున్నాను. ${buyerName} ద్వారా ${cropName} కోసం కొత్త ఆర్డర్ (${orderCode}) ఇవ్వబడింది. మీ ప్రొఫైల్ ప్రకారం మీ కేటాయింపు ${allocatedKg} కిలోలు మరియు కనీస ధర ₹${pricePerKg}/కిలో. మీరు ${deliveryDate} నాటికి ఈ పరిమాణాన్ని సరఫరా చేయగలరా?`,
    en: `Hello ${farmer.name}! This is the AgriLink AI Voice Agent calling on behalf of Mahi Valley FPO. A new bulk procurement order (${orderCode}) for ${cropName} has been confirmed by ${buyerName}. Your farm allocation under our aggregation plan is ${allocatedKg} KG at the agreed order price of ₹${pricePerKg}/kg. Can you please confirm if you are capable of supplying this harvest for collection on ${deliveryDate}?`,
  }

  async function handleTriggerCall() {
    if (!farmer) return

    if (!phone.trim()) {
      alert('Please specify a destination phone number.')
      return
    }

    setIsCalling(true)
    setCallResult(null)

    try {
      const res = await fetch('/api/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          farmerName: farmer.name,
          village: farmer.village,
          crop: cropName,
          orderCode,
          allocatedKg,
          pricePerKg,
          deliveryDate,
          buyerName,
          language,
          fpoName: 'Mahi Valley FPO',
          message: scriptPreviews[language],
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setCallResult({
          ok: false,
          message: data.error || 'Voice call provider rejected the request.',
        })
      } else {
        setCallResult({
          ok: true,
          status: data.status,
          callId: data.callId || data.call?.id,
          provider: data.provider || 'bolna',
          message: data.message || `Call dispatched to ${phone} via Bolna AI Agent.`,
        })

        if (onCallSuccess && farmer.id) {
          onCallSuccess(farmer.id, data)
        }
      }
    } catch (err) {
      setCallResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Network error initiating voice call.',
      })
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Bot className="size-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Bolna AI Calling Agent
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  Outbound Voice Bridge
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mt-0.5">
                Farmer Order Confirmation Call
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Farmer & Sourcing Context Card */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <User className="size-3.5 text-primary" />
              <span>{farmer.name}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3.5 text-primary" />
              <span>{farmer.village || 'Kheda Cluster'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-muted-foreground">Target Demand: </span>
              <strong className="text-foreground">{cropName} ({orderCode})</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Buyer: </span>
              <strong className="text-foreground">{buyerName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Aggregation Allotment: </span>
              <strong className="text-primary font-mono">{allocatedKg} KG</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Contract Price: </span>
              <strong className="text-foreground font-mono">₹{pricePerKg}/kg</strong>
            </div>
          </div>
        </div>

        {/* Specified Phone Number & Overrides */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <PhoneCall className="size-3.5 text-primary" />
              <span>Destination Phone Number to Call:</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-medium">
              Admin-specified destination
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98251 44102"
              className="flex-1 h-11 rounded-xl border border-border bg-background px-3.5 text-sm font-mono font-bold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
            {farmer.mobile_number && phone !== farmer.mobile_number && (
              <button
                type="button"
                onClick={() => setPhone(farmer.mobile_number!)}
                className="h-11 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors shrink-0 cursor-pointer"
                title="Reset to farmer's registered number"
              >
                Farmer Mobile
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Calls are only placed to the exact number specified above. Enter your personal phone number to test and verify the live AI agent call yourself.
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Volume2 className="size-3.5 text-primary" />
            <span>Agent Spoken Language:</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'hi', label: 'Hindi (हिंदी)' },
              { id: 'gu', label: 'Gujarati (ગુજરાતી)' },
              { id: 'te', label: 'Telugu (తెలుగు)' },
              { id: 'en', label: 'English' },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id as any)}
                className={`h-9 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  language === lang.id
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Agent Script Preview */}
        <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Bolna AI Agent Dialogue Preview:
            </span>
            <span className="capitalize text-primary font-mono">{language}</span>
          </div>
          <p className="text-xs text-foreground/90 font-sans italic leading-relaxed bg-background/50 rounded-xl p-3 border border-border/40">
            &ldquo;{scriptPreviews[language]}&rdquo;
          </p>
        </div>

        {/* Live Call Result / Status Banner */}
        {callResult && (
          <div
            className={`rounded-2xl border p-4 flex items-start gap-3 animate-in fade-in duration-150 ${
              callResult.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {callResult.ok ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold">{callResult.message}</p>
              {callResult.callId && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  Call ID: {callResult.callId} · Provider: {callResult.provider}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmedStatus(!confirmedStatus)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                confirmedStatus
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'border-border bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              <Check className={`size-3.5 ${confirmedStatus ? 'text-emerald-600' : ''}`} />
              <span>{confirmedStatus ? 'Farmer Confirmed ✓' : 'Mark as Confirmed'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-border bg-background text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleTriggerCall}
              disabled={isCalling || !phone.trim()}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground px-5 text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isCalling ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Connecting to Bolna...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="size-3.5" />
                  <span>Call Farmer with Bolna AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
