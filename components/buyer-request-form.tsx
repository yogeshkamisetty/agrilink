'use client'

import { FormEvent, useState } from 'react'
import { getAuthClient } from '@/lib/auth-client'

const input = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function BuyerRequestForm() {
  const [crop, setCrop] = useState('TOMATO')
  const [quantity, setQuantity] = useState('')
  const [purpose, setPurpose] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const large = Number(quantity) > 50

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setBusy(true)

    try {
      const { data } = await getAuthClient().auth.getSession()
      const res = await fetch('/api/buyer-requests', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + data.session?.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crop, quantity_kg: Number(quantity), purpose }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage(
          json.request?.review_required
            ? 'Request sent for administrator review.'
            : 'Request created. No additional review is required.'
        )
      } else {
        setMessage(json.error || 'Failed to submit request.')
      }
    } catch {
      setMessage('Network error submitting your request. Please retry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl p-5 py-12">
      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Buyer workspace</p>
        <h1 className="mt-2 font-serif text-4xl">Request verified produce</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Orders up to 50 kg can proceed normally. Larger requests need a purpose and administrator approval.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Crop
            <select
              className={input}
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              <option value="TOMATO">Tomato</option>
              <option value="ONION">Onion</option>
              <option value="POTATO">Potato</option>
              <option value="PADDY">Paddy</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Quantity (kg)
            <input
              required
              min="1"
              type="number"
              className={input}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-describedby={large ? 'large-order-hint' : undefined}
            />
          </label>

          <div aria-live="polite" aria-atomic="true">
            {large && (
              <label id="large-order-hint" className="block text-sm font-medium animate-fadeIn">
                Purpose for this large order (&gt;50 kg)
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Required for administrator compliance review
                </span>
                <textarea
                  required
                  minLength={12}
                  className={input}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="For example: weekly kitchen supply for a hostel of 300 students."
                  rows={3}
                />
              </label>
            )}
          </div>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-60"
          >
            {busy ? 'Submitting request…' : 'Submit request'}
          </button>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-xl border border-border bg-muted p-3.5 text-sm font-medium"
            >
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  )
}
