export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload) return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 })

  console.log('[v0] Voice webhook received:', { event: payload.event, callId: payload.call_id || payload.id })
  return Response.json({ received: true })
}

export async function GET() {
  return Response.json({ ok: true, service: 'agrilink-voice-webhook' })
}
