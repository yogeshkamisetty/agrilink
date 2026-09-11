'use client'

import { useState } from 'react'
import { Bot, Loader2, PhoneCall, Send, Sparkles, Volume2 } from 'lucide-react'

export function AICopilotPanel() {
  const [question, setQuestion] = useState('Which farmers should I call first for tomorrow\'s tomato pickup?')
  const [answer, setAnswer] = useState('')
  const [phone, setPhone] = useState('+919876543210')
  const [callStatus, setCallStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function askCopilot() {
    setBusy(true)
    setAnswer('')
    try {
      const response = await fetch('/api/ai/advice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: 'Order AG-1042: tomato, 200 kg target, 230 kg committed across Kheda, Borsad, and Vasad. Collection starts 09:30.' }) })
      const data = await response.json()
      setAnswer(data.answer || data.error || 'No answer returned.')
    } catch {
      setAnswer('Could not reach the AI service. Add your AI Gateway credentials in project variables.')
    } finally { setBusy(false) }
  }

  async function startCall() {
    setBusy(true)
    setCallStatus('')
    try {
      const response = await fetch('/api/voice/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, language: 'te', message: 'AgriLink pickup reminder: please confirm your tomato quantity and collection time for tomorrow.' }) })
      const data = await response.json()
      setCallStatus(data.status === 'queued' ? 'Call queued with Bolna.' : data.message || data.error || 'Call request processed.')
    } catch { setCallStatus('Could not reach the voice service.') } finally { setBusy(false) }
  }

  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
    <div className="rounded-xl border border-primary/30 bg-primary p-5 text-primary-foreground">
      <div className="mb-5 flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2"><Sparkles className="size-4 text-accent" /><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">AI operations copilot</span></div><h3 className="font-serif text-2xl font-bold">Ask the next best action.</h3></div><Bot className="size-6 text-accent" /></div>
      <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-24 w-full resize-none rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3 text-sm outline-none placeholder:text-primary-foreground/50" aria-label="Ask AgriLink Copilot" />
      <button onClick={askCopilot} disabled={busy || !question.trim()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Ask Copilot</button>
      {answer && <div className="mt-4 rounded-lg bg-primary-foreground/10 p-4 text-sm leading-6 text-primary-foreground/90"><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">AI response</p>{answer}</div>}
    </div>
    <div className="rounded-xl border border-border bg-card p-5"><div className="mb-5 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Voice bridge</p><h3 className="mt-2 font-serif text-2xl font-bold">Call a farmer in Telugu.</h3></div><Volume2 className="size-5 text-primary" /></div><p className="mb-4 text-sm leading-6 text-muted-foreground">Bolna handles the outbound call; Sarvam can power the Telugu voice layer in your agent configuration.</p><label className="text-sm font-medium">Farmer phone<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label><button onClick={startCall} disabled={busy || !phone.trim()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />} Start Telugu call</button>{callStatus && <p className="mt-3 rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground">{callStatus}</p>}<div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><span className="size-1.5 rounded-full bg-accent" /> Provider-ready · keys stay server-side</div></div>
  </section>
}
