function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status })
}

function normalizePhone(raw: string): string {
  const clean = raw.trim().replace(/[^\d+]/g, '')
  const digits = clean.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (clean.startsWith('+') && digits.length >= 8) return clean
  return `+${digits}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const rawPhone = typeof body.phone === 'string' ? body.phone : typeof body.recipient_phone_number === 'string' ? body.recipient_phone_number : ''
    const phone = normalizePhone(rawPhone)

    const language = typeof body.language === 'string' ? body.language : 'hi'
    const farmerName = typeof body.farmerName === 'string' ? body.farmerName : typeof body.farmer_name === 'string' ? body.farmer_name : ''
    const crop = typeof body.crop === 'string' ? body.crop : typeof body.crop_name === 'string' ? body.crop_name : 'Produce'
    const orderCode = typeof body.orderCode === 'string' ? body.orderCode : typeof body.order_code === 'string' ? body.order_code : 'AG-1001'
    const allocatedKg = Number(body.allocatedKg || body.allocated_kg || body.quantity_kg || 300)
    const pricePerKg = Number(body.pricePerKg || body.price_per_kg || 28)
    const deliveryDate = typeof body.deliveryDate === 'string' ? body.deliveryDate : typeof body.delivery_date === 'string' ? body.delivery_date : 'Soon'
    const village = typeof body.village === 'string' ? body.village : 'Cluster'
    const buyerName = typeof body.buyerName === 'string' ? body.buyerName : typeof body.buyer_name === 'string' ? body.buyer_name : 'Institutional Buyer'
    const fpoName = typeof body.fpoName === 'string' ? body.fpoName : typeof body.fpo_name === 'string' ? body.fpo_name : 'Mahi Valley FPO'

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return jsonError('Enter a valid 10-digit phone number or international number with country code.')
    }

    const languageNames: Record<string, string> = {
      hi: 'Hindi',
      gu: 'Gujarati',
      te: 'Telugu',
      en: 'English',
    }
    const langName = languageNames[language] || 'Hindi'

    // Construct prompt task if not explicitly passed
    const promptTask =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : `You are the AgriLink AI Voice Agent calling on behalf of ${fpoName} in ${langName}.
You are calling farmer ${farmerName || 'partner'} from village ${village}.
1. Inform them that a new bulk institutional purchase order (${orderCode}) for ${crop} has been created by ${buyerName}.
2. Their farm profile matches this demand. Under the FPO Smart Aggregation plan, their allocation quota is ${allocatedKg} KG at a guaranteed price of ₹${pricePerKg} per KG.
3. The scheduled collection pickup date is ${deliveryDate}.
4. Politely seek their verbal confirmation: "Are you capable and ready to supply ${allocatedKg} KG of ${crop} for this aggregated order?"
5. Listen for their response (Yes/Confirmed vs No/Not Available). Confirm their answer and reassure them that payment will be credited directly to their bank account within 15 seconds of farmgate weighment.`

    // Resolve Bolna endpoint
    let bolnaUrl = (process.env.BOLNA_API_URL || 'https://api.bolna.dev').trim().replace(/\/$/, '')
    const callEndpoint = bolnaUrl.endsWith('/call') ? bolnaUrl : `${bolnaUrl}/call`
    const bolnaKey = process.env.BOLNA_API_KEY
    const bolnaAgentId = process.env.BOLNA_AGENT_ID

    // If Bolna credentials exist, dispatch real outbound call to Bolna AI
    if (bolnaKey && bolnaAgentId) {
      const payload = {
        agent_id: bolnaAgentId,
        recipient_phone_number: phone,
        phone_number: phone,
        user_data: {
          farmer_name: farmerName || 'Farmer Partner',
          village,
          crop,
          allocated_kg: String(allocatedKg),
          price_per_kg: String(pricePerKg),
          order_code: orderCode,
          delivery_date: deliveryDate,
          buyer_name: buyerName,
          fpo_name: fpoName,
          language: langName,
        },
        task: promptTask,
      }

      const response = await fetch(callEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bolnaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('[Bolna] Call initiation error:', data)
        return Response.json(
          {
            ok: false,
            error: data.message || data.error || 'Bolna AI voice provider rejected call.',
            details: data,
            phone,
          },
          { status: response.status >= 400 && response.status < 500 ? 400 : 502 }
        )
      }

      return Response.json({
        ok: true,
        status: 'queued',
        provider: 'bolna',
        callId: data.call_id || data.id || `bolna-${Date.now()}`,
        phone,
        agentId: bolnaAgentId,
        farmerName,
        orderCode,
        allocatedKg,
        message: `Bolna AI calling agent successfully queued outbound call to ${phone} for ${farmerName || 'farmer'}!`,
        call: data,
      })
    }

    // Fallback simulation mode for local testing when keys are only in Vercel
    return Response.json({
      ok: true,
      status: 'simulated',
      provider: 'bolna_simulated',
      phone,
      agentId: bolnaAgentId || 'bolna_agent_demo',
      farmerName,
      orderCode,
      allocatedKg,
      message: `[Bolna Simulation] AI Calling Agent simulated call to ${phone}. In production with Vercel env, Bolna AI dials directly with Agent ID ${bolnaAgentId || 'agnt_bolna_77'}.`,
      task: promptTask,
    })
  } catch (error) {
    console.error('[v0] Voice call failed:', error)
    return jsonError(error instanceof Error ? error.message : 'Unable to start the voice call right now.', 502)
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.BOLNA_API_KEY)
  const hasAgent = Boolean(process.env.BOLNA_AGENT_ID)
  return Response.json({
    provider: hasKey && hasAgent ? 'bolna' : 'pending',
    configured: hasKey && hasAgent,
    agentId: process.env.BOLNA_AGENT_ID ? `${process.env.BOLNA_AGENT_ID.slice(0, 8)}...` : null,
    apiUrl: process.env.BOLNA_API_URL || 'https://api.bolna.dev',
  })
}
