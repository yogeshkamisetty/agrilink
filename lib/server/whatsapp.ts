/**
 * One real WhatsApp message per cascade, to the team's verified test number
 * (WhatsApp Cloud API test numbers). Everything else is rendered on screen:
 * sending SMS/WhatsApp to arbitrary Indian numbers needs DLT registration
 * and business verification, which is a commercial onboarding step.
 *
 * Never throws; the cascade does not depend on this succeeding.
 */
export async function sendTestWhatsApp(text: string): Promise<{ sent: boolean; detail: string }> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const to = process.env.WHATSAPP_TEST_RECIPIENT
  if (!token || !phoneNumberId || !to) return { sent: false, detail: 'WhatsApp test number not configured' }
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/[^\d]/g, ''), type: 'text', text: { body: text.slice(0, 4000) } }),
      signal: AbortSignal.timeout(8000),
    })
    const data = (await response.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string } }
    if (!response.ok) return { sent: false, detail: data.error?.message ?? `WhatsApp API returned ${response.status}` }
    return { sent: true, detail: data.messages?.[0]?.id ?? 'sent' }
  } catch (error) {
    return { sent: false, detail: `WhatsApp request failed: ${(error as Error).message}` }
  }
}
