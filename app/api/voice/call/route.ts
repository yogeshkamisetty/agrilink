function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const language = typeof body.language === 'string' ? body.language : 'te'
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) return jsonError('Enter a valid phone number with country code.')
    if (!message || message.length > 1200) return jsonError('Add a call message between 1 and 1200 characters.')

    const bolnaUrl = process.env.BOLNA_API_URL
    const bolnaKey = process.env.BOLNA_API_KEY
    if (bolnaUrl && bolnaKey) {
      const response = await fetch(`${bolnaUrl.replace(/\/$/, '')}/call`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bolnaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, language, task: message, agent_id: process.env.BOLNA_AGENT_ID }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return Response.json({ error: data.message || 'Voice provider rejected the call.' }, { status: 502 })
      return Response.json({ status: 'queued', provider: 'bolna', call: data })
    }

    return Response.json({ status: 'ready', provider: 'pending', message: 'Add BOLNA_API_URL, BOLNA_API_KEY, and BOLNA_AGENT_ID to enable outbound calls.', phone, language })
  } catch (error) {
    console.error('[v0] Voice call failed:', error)
    return jsonError('Unable to start the voice call right now.', 502)
  }
}

export async function GET() {
  return Response.json({ provider: process.env.BOLNA_API_KEY ? 'bolna' : 'pending', configured: Boolean(process.env.BOLNA_API_KEY && process.env.BOLNA_API_URL) })
}
