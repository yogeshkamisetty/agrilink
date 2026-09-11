import { generateText } from 'ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const context = typeof body.context === 'string' ? body.context.slice(0, 6000) : ''

    if (!question || question.length > 1000) {
      return Response.json({ error: 'Ask a question between 1 and 1000 characters.' }, { status: 400 })
    }

    const result = await generateText({
      model: process.env.AGRILINK_AI_MODEL || 'openai/gpt-4o-mini',
      system: 'You are AgriLink Copilot, an operations assistant for Indian smallholder procurement. Give concise, practical advice. Never invent live prices, farmer commitments, payments, or delivery facts. Clearly label assumptions and suggest the next operational action.',
      prompt: `Question: ${question}\n\nCurrent workspace context:\n${context || 'No additional context provided.'}`,
      maxOutputTokens: 500,
    })

    return Response.json({ answer: result.text, model: process.env.AGRILINK_AI_MODEL || 'openai/gpt-4o-mini' })
  } catch (error) {
    console.error('[v0] AI advice failed:', error)
    return Response.json({ error: 'AI advice is temporarily unavailable. Check your AI Gateway configuration.' }, { status: 502 })
  }
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN), model: process.env.AGRILINK_AI_MODEL || 'openai/gpt-4o-mini' })
}
