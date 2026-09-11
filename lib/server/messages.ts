import { tierOf, type Channel } from '@/lib/domain/cascade'
import { renderMessage, type MessageParams, type MessageTemplate } from '@/lib/domain/i18n'
import type { Farmer, NotificationKind } from '@/lib/types'
import type { Db } from './db'

type Send = {
  orderId: string
  farmer: Pick<Farmer, 'id' | 'language'>
  channel: Channel
  kind: NotificationKind
  template: MessageTemplate
  params: MessageParams
  at: Date
}

/**
 * Record a message to a farmer. The body is rendered in the farmer's
 * preferred language — that is what was "sent"; the template and params
 * are kept so the phone view can re-render it in another language.
 * Offers are idempotent per (order, farmer, channel).
 */
export async function sendMessage(db: Db, m: Send): Promise<boolean> {
  const body = renderMessage(m.template, m.params, m.farmer.language)
  const tier = m.kind === 'OFFER' ? tierOf(m.channel) : 0
  const conflict = m.kind === 'OFFER' ? `on conflict (order_id, farmer_id, channel) where kind = 'OFFER' do nothing` : ''
  const rows = await db.query(
    `insert into agrilink.notifications (order_id, farmer_id, channel, tier, kind, template, params, body, sent_at)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) ${conflict} returning id`,
    [m.orderId, m.farmer.id, m.channel, tier, m.kind, m.template, JSON.stringify(m.params), body, m.at],
  )
  return rows.length > 0
}
