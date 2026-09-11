import type { Channel } from './domain/cascade'
import type { BuyerType, CropId } from './domain/crops'
import type { Grade } from './domain/grading'
import type { Lang, MessageParams, MessageTemplate } from './domain/i18n'
import type { PriceQuote } from './domain/prices'
import type { RoutePlan } from './domain/routing'

/** Records as the app sees them (camelCase, ISO timestamps, 'YYYY-MM-DD' dates). */

export type OrderStatus = 'POSTED' | 'FUNDED' | 'SOURCING' | 'COLLECTING' | 'DISPATCHED' | 'SETTLED'

export type Fpo = { id: string; name: string; village: string; district: string; state: string; lat: number; lng: number; bankAccountRef: string }

export type Farmer = { id: string; fpoId: string; name: string; phone: string; language: Lang; landHectares: number; village: string; lat: number; lng: number }

export type Buyer = { id: string; name: string; type: BuyerType; address: string; city: string; lat: number; lng: number; contactName: string; contactPhone: string; enrolment: number | null }

export type RegistryEntry = { id: string; farmerId: string; crop: CropId; expectedQtyKg: number; harvestWindowStart: string; harvestWindowEnd: string; status: 'ACTIVE' | 'CLOSED'; createdAt: string }

export type Order = {
  id: string
  code: string
  buyerId: string
  fpoId: string
  crop: CropId
  qtyTargetKg: number
  pricePerKg: number
  deliveryDate: string
  advancePct: number
  status: OrderStatus
  mandiRef: PriceQuote | null
  retailRef: PriceQuote | null
  advanceAmount: number | null
  advanceCommittedAt: string | null
  notifiedAt: string | null
  cascadeSecondsPerHour: number | null
  simulateReplies: boolean
  filledNoticeSentAt: string | null
  consignmentId: string | null
  deliveredAt: string | null
  createdAt: string
}

export type NotificationKind = 'OFFER' | 'CONFIRMATION' | 'PROMOTED' | 'FILLED' | 'RELEASED' | 'ADVANCE' | 'REJECTED' | 'SETTLED' | 'WITHDRAWN'

export type Notification = {
  id: string
  orderId: string
  farmerId: string
  channel: Channel
  tier: number
  kind: NotificationKind
  template: MessageTemplate
  params: MessageParams
  body: string
  sentAt: string
  respondedAt: string | null
  response: 'ACCEPTED' | 'DECLINED' | null
  responseQtyKg: number | null
  responseSource: 'FARMER' | 'SIMULATED' | 'COORDINATOR' | null
  externalRef: string | null
}

export type CommitmentStatus = 'ACTIVE' | 'WITHDRAWN' | 'FULFILLED' | 'REJECTED' | 'RELEASED' | 'NO_SHOW'

export type Commitment = { id: string; orderId: string; farmerId: string; registryId: string; qtyCommittedKg: number; isStandby: boolean; status: CommitmentStatus; promotedAt: string | null; createdAt: string }

export type LotDecision = 'ACCEPTED' | 'OVERRIDDEN' | 'MANUAL' | 'REJECTED'

export type Lot = {
  id: string
  code: string
  orderId: string
  farmerId: string
  qtyWeighedKg: number
  qtyAcceptedKg: number
  aiStatus: 'GRADED' | 'LOW_CONFIDENCE' | 'UNAVAILABLE'
  aiGrade: Grade | null
  aiConfidence: number | null
  aiDefects: string[]
  aiReasoning: string | null
  aiModel: string | null
  finalGrade: Grade | null
  decision: LotDecision
  overrideBy: string | null
  overrideReason: string | null
  photoDataUrl: string | null
  capturedAt: string
  lat: number | null
  lng: number | null
  transportShare: number | null
  buyerDecision: 'ACCEPTED' | 'REJECTED' | null
  buyerReason: string | null
}

export type AdvanceRecord = { id: string; orderId: string; farmerId: string; lotId: string; amount: number; disbursedAt: string }

export type Settlement = { id: string; orderId: string; farmerId: string; lotId: string; acceptedKg: number; pricePerKg: number; grossAmount: number; transportShare: number; advanceDeducted: number; netPayable: number; createdAt: string }

export type StoredRoute = RoutePlan & { orderIds: string[] }

export type Consignment = { id: string; code: string; vehicleLabel: string; vehicleCost: number; routeJson: StoredRoute; dispatchedAt: string }
