import type { Channel } from '@/lib/domain/cascade'
import { actingFarmer } from '@/lib/server/actors'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, readJson } from '@/lib/server/http'
import { respond } from '@/lib/server/sourcing'

const CHANNELS: Channel[] = ['SMS', 'WHATSAPP', 'IVR', 'COORDINATOR']

/** A farmer replies to an offer; a coordinator may record a reply taken by phone. Simulated replies only ever come from the demo cascade. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDb()
    const body = await readJson(request)
    const { farmerId, onBehalf } = await actingFarmer(request, db, body.farmerId)
    const response = String(body.response ?? '')
    const channel = String(body.channel ?? '') as Channel
    if (!['ACCEPT', 'DECLINE', 'ACCEPTED', 'DECLINED'].includes(response) || !CHANNELS.includes(channel)) throw new DomainError('Unsupported response or channel.', 400)
    const accept = response === 'ACCEPT' || response === 'ACCEPTED'
    const qtyKg = body.responseQtyKg == null ? 0 : Number(body.responseQtyKg)
    if (!Number.isFinite(qtyKg) || (accept && qtyKg <= 0)) throw new DomainError('A positive response quantity is required when accepting.', 400)
    const result = await respond(db, id, farmerId, { channel, accept, qtyKg, source: onBehalf ? 'COORDINATOR' : 'FARMER' })
    return Response.json(result)
  } catch (error) {
    return errorResponse(error, 'Failed to record the farmer response.')
  }
}
