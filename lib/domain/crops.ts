export type BuyerType = 'INSTITUTIONAL' | 'FAIR_PRICE_SHOP' | 'RESIDENTIAL_SOCIETY'
export type CropId = 'TOMATO' | 'SPINACH' | 'ONION' | 'POTATO' | 'BAJRA' | 'TUR'
export type ShelfClass = 'perishable' | 'semiPerishable' | 'shelfStable'

/**
 * Crop-to-channel routing. This is the rule that keeps ration shops from
 * becoming a spoilage trap: perishables only go to kitchens that cook them
 * the same day; shelf-stable crops can go anywhere.
 *
 * shelf life in days → permitted buyer channels
 */
export const SHELF_LIFE_ROUTING = {
  perishable: { maxDays: 5, channels: ['INSTITUTIONAL'] },
  semiPerishable: { maxDays: 60, channels: ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY'] },
  shelfStable: { maxDays: 999, channels: ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY'] },
} as const satisfies Record<ShelfClass, { maxDays: number; channels: readonly BuyerType[] }>

export type Crop = {
  id: CropId
  name: string
  /** Days the crop stays saleable after harvest without cold storage. */
  shelfLifeDays: number
  /** Commodity name as published in the AGMARKNET daily mandi feed. */
  agmarknetCommodity: string
  /** DoCA Price Monitoring commodity, or null when DoCA does not track it. */
  docaCommodity: string | null
}

export const CROPS: Record<CropId, Crop> = {
  TOMATO: { id: 'TOMATO', name: 'Tomato', shelfLifeDays: 4, agmarknetCommodity: 'Tomato', docaCommodity: 'Tomato' },
  SPINACH: { id: 'SPINACH', name: 'Spinach', shelfLifeDays: 2, agmarknetCommodity: 'Spinach', docaCommodity: null },
  ONION: { id: 'ONION', name: 'Onion', shelfLifeDays: 45, agmarknetCommodity: 'Onion', docaCommodity: 'Onion' },
  POTATO: { id: 'POTATO', name: 'Potato', shelfLifeDays: 60, agmarknetCommodity: 'Potato', docaCommodity: 'Potato' },
  BAJRA: { id: 'BAJRA', name: 'Bajra (pearl millet)', shelfLifeDays: 180, agmarknetCommodity: 'Bajra(Pearl Millet/Cumbu)', docaCommodity: 'Bajra' },
  TUR: { id: 'TUR', name: 'Tur (whole pigeon pea)', shelfLifeDays: 365, agmarknetCommodity: 'Arhar (Tur/Red Gram)(Whole)', docaCommodity: null },
}

export const CROP_IDS = Object.keys(CROPS) as CropId[]

export const BUYER_TYPE_LABEL: Record<BuyerType, string> = {
  INSTITUTIONAL: 'Institutional kitchen',
  FAIR_PRICE_SHOP: 'Jan Poshan Kendra / Fair Price Shop',
  RESIDENTIAL_SOCIETY: 'Residential society',
}

export function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && value in CROPS
}

export function shelfClassOf(crop: CropId): ShelfClass {
  const days = CROPS[crop].shelfLifeDays
  if (days <= SHELF_LIFE_ROUTING.perishable.maxDays) return 'perishable'
  if (days <= SHELF_LIFE_ROUTING.semiPerishable.maxDays) return 'semiPerishable'
  return 'shelfStable'
}

const SHELF_CLASS_LABEL: Record<ShelfClass, string> = {
  perishable: 'perishable',
  semiPerishable: 'semi-perishable',
  shelfStable: 'shelf-stable',
}

export function channelCheck(crop: CropId, buyerType: BuyerType): { allowed: boolean; reason: string } {
  const shelfClass = shelfClassOf(crop)
  const rule = SHELF_LIFE_ROUTING[shelfClass]
  const days = CROPS[crop].shelfLifeDays
  const allowed = (rule.channels as readonly BuyerType[]).includes(buyerType)
  const reason = allowed
    ? `${CROPS[crop].name} is ${SHELF_CLASS_LABEL[shelfClass]} (${days}-day shelf life) — permitted for ${BUYER_TYPE_LABEL[buyerType].toLowerCase()}.`
    : `${CROPS[crop].name} is ${SHELF_CLASS_LABEL[shelfClass]} (${days}-day shelf life) and routes to institutional kitchens only, which cook it the same day. ${BUYER_TYPE_LABEL[buyerType]} outlets have no cold storage.`
  return { allowed, reason }
}

/**
 * How many days before delivery a lot may be harvested and still arrive
 * saleable. Tomato (4-day shelf life) must be harvested within 3 days of
 * delivery; stored onion or millet can come from a much older harvest.
 */
export function harvestLeadDays(crop: CropId): number {
  return Math.max(0, CROPS[crop].shelfLifeDays - 1)
}
