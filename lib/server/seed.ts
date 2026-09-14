import type { BuyerType, CropId } from '@/lib/domain/crops'
import { addDays, isoDate, nextMonday, weekStart } from '@/lib/domain/dates'
import type { Lang } from '@/lib/domain/i18n'
import { buyerAdvance, DEFAULT_ADVANCE_PCT } from '@/lib/domain/money'
import { clock } from './clock'
import type { Db } from './db'

/**
 * Seed data for the pilot: one FPO in Anand district, Gujarat, with 12
 * members; three buyers (one per channel); synthetic order history and
 * academic calendar for the forecast; seeded price snapshots used only when
 * the live feeds are unreachable. All dates are relative to the day the seed
 * runs so the demo works on any day.
 *
 * Names, phone numbers and bank references are fictional.
 */

type FarmerSeed = {
  key: string
  name: string
  phone: string
  language: Lang
  landHectares: number
  village: string
  lat: number
  lng: number
  crops: Array<{ crop: CropId; kg: number; window: [number, number] }>
  reply?: { afterHours: number; response: 'ACCEPT' | 'DECLINE' | 'NONE'; qty?: number }
}

/** First Monday at least two days out: the default delivery date for new orders. */
export function defaultDeliveryDate(today: string): string {
  const monday = nextMonday(today)
  return monday >= addDays(today, 2) ? monday : nextMonday(monday)
}

// Harvest windows are day offsets from the seed date. Tomato is picked
// continuously over several weeks, so most windows are long; Harshad's crop
// was planted late and cannot reach a delivery in the next three weeks.
const FARMERS: FarmerSeed[] = [
  { key: 'ramesh', name: 'Rameshbhai Patel', phone: '+91 98251 44102', language: 'hi', landHectares: 0.8, village: 'Boriavi', lat: 22.6167, lng: 72.9333, crops: [{ crop: 'TOMATO', kg: 50, window: [-7, 30] }, { crop: 'PADDY', kg: 500, window: [-10, 60] }], reply: { afterHours: 0.8, response: 'ACCEPT', qty: 50 } },
  { key: 'savita', name: 'Savitaben Parmar', phone: '+91 90000 10102', language: 'te', landHectares: 1.2, village: 'Petlad', lat: 22.4768, lng: 72.7998, crops: [{ crop: 'TOMATO', kg: 70, window: [-7, 30] }, { crop: 'POTATO', kg: 400, window: [-20, 30] }, { crop: 'WHEAT', kg: 700, window: [-10, 60] }], reply: { afterHours: 1.6, response: 'ACCEPT', qty: 70 } },
  { key: 'mohan', name: 'Mohanbhai Solanki', phone: '+91 90000 10103', language: 'hi', landHectares: 1.5, village: 'Sojitra', lat: 22.5387, lng: 72.7195, crops: [{ crop: 'TOMATO', kg: 80, window: [-5, 30] }, { crop: 'PADDY', kg: 800, window: [-10, 60] }], reply: { afterHours: 2.4, response: 'ACCEPT', qty: 80 } },
  { key: 'jignesh', name: 'Jignesh Chauhan', phone: '+91 90000 10104', language: 'hi', landHectares: 1.0, village: 'Bakrol', lat: 22.5796, lng: 72.958, crops: [{ crop: 'TOMATO', kg: 60, window: [-7, 30] }, { crop: 'POTATO', kg: 300, window: [-20, 30] }, { crop: 'WHEAT', kg: 600, window: [-10, 60] }], reply: { afterHours: 3.0, response: 'DECLINE' } },
  { key: 'laxmi', name: 'Laxmiben Vaghela', phone: '+91 90000 10105', language: 'te', landHectares: 0.4, village: 'Umreth', lat: 22.6986, lng: 73.1149, crops: [{ crop: 'TOMATO', kg: 30, window: [-3, 30] }, { crop: 'PADDY', kg: 300, window: [-10, 60] }], reply: { afterHours: 7.0, response: 'ACCEPT', qty: 30 } },
  { key: 'kokila', name: 'Kokilaben Rathod', phone: '+91 90000 10106', language: 'hi', landHectares: 0.6, village: 'Karamsad', lat: 22.5433, lng: 72.9046, crops: [{ crop: 'TOMATO', kg: 40, window: [-7, 30] }], reply: { afterHours: 99, response: 'NONE' } },
  { key: 'harshad', name: 'Harshad Makwana', phone: '+91 90000 10107', language: 'hi', landHectares: 0.9, village: 'Mahudha', lat: 22.8205, lng: 72.9406, crops: [{ crop: 'TOMATO', kg: 45, window: [25, 60] }] },
  { key: 'suresh', name: 'Suresh Yadav', phone: '+91 90000 10108', language: 'hi', landHectares: 0.5, village: 'Kheda', lat: 22.7507, lng: 72.6847, crops: [{ crop: 'TOMATO', kg: 55, window: [-7, 30] }, { crop: 'PADDY', kg: 400, window: [-10, 60] }] },
  { key: 'bhavna', name: 'Bhavnaben Thakor', phone: '+91 90000 10109', language: 'hi', landHectares: 1.8, village: 'Borsad', lat: 22.4078, lng: 72.8988, crops: [{ crop: 'ONION', kg: 300, window: [-30, 30] }], reply: { afterHours: 1.2, response: 'ACCEPT', qty: 200 } },
  { key: 'pooja', name: 'Pooja Devi Kushwaha', phone: '+91 90000 10110', language: 'hi', landHectares: 0.7, village: 'Vasad', lat: 22.455, lng: 73.0697, crops: [{ crop: 'ONION', kg: 250, window: [-30, 30] }], reply: { afterHours: 2.0, response: 'ACCEPT', qty: 150 } },
  { key: 'nitin', name: 'Nitin Dabhi', phone: '+91 90000 10111', language: 'en', landHectares: 1.1, village: 'Anklav', lat: 22.3833, lng: 73.0, crops: [{ crop: 'ONION', kg: 200, window: [-30, 30] }, { crop: 'BAJRA', kg: 150, window: [-90, 60] }], reply: { afterHours: 6.5, response: 'ACCEPT', qty: 150 } },
  { key: 'manjula', name: 'Manjulaben Rabari', phone: '+91 90000 10112', language: 'hi', landHectares: 1.3, village: 'Vaso', lat: 22.66, lng: 72.755, crops: [{ crop: 'ONION', kg: 150, window: [-30, 30] }, { crop: 'BAJRA', kg: 120, window: [-90, 60] }], reply: { afterHours: 8.0, response: 'ACCEPT', qty: 100 } },
]

const BUYERS: Array<{ key: string; name: string; type: BuyerType; address: string; city: string; lat: number; lng: number; contactName: string; contactPhone: string; enrolment?: number }> = [
  { key: 'school', name: 'PM POSHAN Central Kitchen, Vallabh Vidyanagar', type: 'INSTITUTIONAL', address: 'Kitchen block, Nana Bazaar, Vallabh Vidyanagar', city: 'Anand', lat: 22.553, lng: 72.923, contactName: 'Meera Joshi', contactPhone: '+91 98252 77103', enrolment: 1100 },
  { key: 'jpk', name: 'Jan Poshan Kendra · FPS No. 214, Anand', type: 'FAIR_PRICE_SHOP', address: 'Shop 214, Ganesh Chowkdi, Anand', city: 'Anand', lat: 22.562, lng: 72.958, contactName: 'Dinesh Prajapati', contactPhone: '+91 90000 20202' },
  { key: 'rwa', name: "Shreeji Heights Residents' Association, Karamsad", type: 'RESIDENTIAL_SOCIETY', address: 'Main gate, Shreeji Heights, Karamsad', city: 'Anand', lat: 22.5405, lng: 72.9105, contactName: 'Hetal Shah', contactPhone: '+91 90000 20203' },
]

/** Illustrative prices for offline use. Clearly labelled SEEDED in the UI — never presented as a published figure. */
const SEEDED_PRICES: Array<{ kind: 'MANDI' | 'RETAIL'; crop: CropId; price: number; market: string }> = [
  { kind: 'MANDI', crop: 'PADDY', price: 22, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'WHEAT', price: 24, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'TOMATO', price: 13, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'ONION', price: 14, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'POTATO', price: 11, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'BAJRA', price: 25, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'SPINACH', price: 12, market: 'Anand APMC' },
  { kind: 'MANDI', crop: 'TUR', price: 72, market: 'Anand APMC' },
  { kind: 'RETAIL', crop: 'PADDY', price: 34, market: 'Ahmedabad' },
  { kind: 'RETAIL', crop: 'WHEAT', price: 38, market: 'Ahmedabad' },
  { kind: 'RETAIL', crop: 'TOMATO', price: 28, market: 'Ahmedabad' },
  { kind: 'RETAIL', crop: 'ONION', price: 30, market: 'Ahmedabad' },
  { kind: 'RETAIL', crop: 'POTATO', price: 22, market: 'Ahmedabad' },
  { kind: 'RETAIL', crop: 'BAJRA', price: 34, market: 'Ahmedabad' },
]

/** Deterministic pseudo-random numbers so every reset produces the same history. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export async function seed(db: Db) {
  const today = isoDate(clock.now())
  const delivery = defaultDeliveryDate(today)

  await db.tx(async (tx) => {
    const [fpo] = await tx.query<{ id: string }>(
      `insert into agrilink.fpos (name, village, district, state, lat, lng, bank_account_ref)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      ['Mahi Valley Farmer Producer Co. Ltd', 'Boriavi', 'Anand', 'Gujarat', 22.613, 72.936, 'FPO current account ••••4417'],
    )

    for (const f of FARMERS) {
      const [farmer] = await tx.query<{ id: string }>(
        `insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [fpo.id, f.name, f.phone, f.language, f.landHectares, f.village, f.lat, f.lng],
      )
      for (const c of f.crops) {
        await tx.query(
          `insert into agrilink.crop_registry (farmer_id, crop, expected_qty_kg, harvest_window_start, harvest_window_end)
           values ($1, $2, $3, $4::date, $5::date)`,
          [farmer.id, c.crop, c.kg, addDays(today, c.window[0]), addDays(today, c.window[1])],
        )
      }
      if (f.reply) {
        await tx.query(`insert into agrilink.demo_reply_profiles (farmer_id, reply_after_hours, response, qty_kg) values ($1, $2, $3, $4)`, [
          farmer.id,
          f.reply.afterHours,
          f.reply.response,
          f.reply.qty ?? null,
        ])
      }
    }

    const buyerIds: Record<string, string> = {}
    for (const b of BUYERS) {
      const [buyer] = await tx.query<{ id: string }>(
        `insert into agrilink.buyers (name, type, address, city, lat, lng, contact_name, contact_phone, enrolment)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [b.name, b.type, b.address, b.city, b.lat, b.lng, b.contactName, b.contactPhone, b.enrolment ?? null],
      )
      buyerIds[b.key] = buyer.id
    }

    for (const p of SEEDED_PRICES) {
      await tx.query(
        `insert into agrilink.price_refs (kind, crop, market, price_date, price_per_kg, source, tier, detail)
         values ($1, $2, $3, $4::date, $5, $6, 'seeded', $7)`,
        [p.kind, p.crop, p.market, addDays(today, -1), p.price, p.kind === 'MANDI' ? 'AGMARKNET' : 'DOCA', 'Illustrative figure seeded for offline use — not a published price'],
      )
    }

    // Synthetic academic calendar: a vacation block, two exam weeks and a few
    // one-day holidays in the past, plus one holiday the week after delivery
    // so the forecast visibly responds to the calendar.
    const thisWeek = weekStart(today)
    const calendar: Array<{ day: string; kind: 'HOLIDAY' | 'EXAM'; label: string }> = []
    for (let w = 15; w <= 19; w++) for (let d = 0; d < 6; d++) calendar.push({ day: addDays(thisWeek, -7 * w + d), kind: 'HOLIDAY', label: 'Summer vacation' })
    for (const w of [22, 3]) for (let d = 0; d < 5; d++) calendar.push({ day: addDays(thisWeek, -7 * w + d), kind: 'EXAM', label: 'Term exams' })
    for (const w of [9, 12]) calendar.push({ day: addDays(thisWeek, -7 * w + 2), kind: 'HOLIDAY', label: 'Public holiday' })
    calendar.push({ day: addDays(weekStart(delivery), 8), kind: 'HOLIDAY', label: 'Local festival holiday' })
    for (const c of calendar) {
      await tx.query(`insert into agrilink.academic_calendar (day, kind, label) values ($1::date, $2, $3) on conflict (day) do nothing`, [c.day, c.kind, c.label])
    }

    // 26 weeks of synthetic tomato orders for the school kitchen:
    // ~1,100 students × ~30 g tomato per school day, ±8% noise.
    const random = mulberry32(1042)
    const byDay = new Map(calendar.map((c) => [c.day, c.kind]))
    for (let w = 1; w <= 26; w++) {
      const start = addDays(thisWeek, -7 * w)
      const days = Array.from({ length: 6 }, (_, d) => addDays(start, d))
      const schoolDays = days.filter((d) => byDay.get(d) !== 'HOLIDAY').length
      const examDays = days.filter((d) => byDay.get(d) === 'EXAM').length
      if (schoolDays === 0) continue
      const effectiveDays = schoolDays - examDays * 0.15
      const qty = Math.round((33 * effectiveDays * (0.92 + random() * 0.16)) / 5) * 5
      await tx.query(`insert into agrilink.order_history (buyer_id, crop, week_start, school_days, qty_kg) values ($1, 'TOMATO', $2::date, $3, $4)`, [buyerIds.school, start, schoolDays, qty])
    }

    // Member sales outside AgriLink this week — the denominator of the
    // volume-shift metric. Jignesh sold his tomato to the village trader,
    // which is why he declines the kitchen's order.
    const [jignesh] = await tx.query<{ id: string }>(`select id from agrilink.farmers where name = 'Jignesh Chauhan'`)
    await tx.query(
      `insert into agrilink.channel_sales_log (fpo_id, farmer_id, crop, qty_kg, channel, sold_on, note, synthetic) values ($1, $2, 'TOMATO', 60, 'TRADER', $3::date, $4, true)`,
      [fpo.id, jignesh.id, today, 'Sold to the village trader who financed his inputs'],
    )

    // Standing orders from the other two channels. The school kitchen's
    // tomato order is posted live during the demo.
    const jpkPrice = 22
    await tx.query(
      `insert into agrilink.orders (buyer_id, fpo_id, crop, qty_target_kg, price_per_kg, delivery_date, advance_pct, status, mandi_ref, retail_ref, advance_amount, advance_committed_at, created_at)
       values ($1, $2, 'ONION', 500, $3, $4::date, $5, 'FUNDED', $6::jsonb, $7::jsonb, $8, now() - interval '20 hours', now() - interval '22 hours')`,
      [
        buyerIds.jpk,
        fpo.id,
        jpkPrice,
        delivery,
        DEFAULT_ADVANCE_PCT,
        JSON.stringify(seededQuote('MANDI', 'ONION', 14, 'Anand APMC', addDays(today, -1))),
        JSON.stringify(seededQuote('RETAIL', 'ONION', 30, 'Ahmedabad', addDays(today, -1))),
        buyerAdvance(500, jpkPrice, DEFAULT_ADVANCE_PCT),
      ],
    )
    await tx.query(
      `insert into agrilink.orders (buyer_id, fpo_id, crop, qty_target_kg, price_per_kg, delivery_date, advance_pct, status, mandi_ref, retail_ref, created_at)
       values ($1, $2, 'POTATO', 150, 17, $3::date, $4, 'POSTED', $5::jsonb, $6::jsonb, now() - interval '3 hours')`,
      [
        buyerIds.rwa,
        fpo.id,
        addDays(delivery, 1),
        DEFAULT_ADVANCE_PCT,
        JSON.stringify(seededQuote('MANDI', 'POTATO', 11, 'Anand APMC', addDays(today, -1))),
        JSON.stringify(seededQuote('RETAIL', 'POTATO', 22, 'Ahmedabad', addDays(today, -1))),
      ],
    )
  })
}

type HistoryPlan = { buyerType: BuyerType; crop: CropId; kgPerServingDay: number; weeklyGrowth: number; noise: number; followsSchoolCalendar: boolean; seed: number }

/**
 * Synthetic weekly purchase history for the demand forecast, beyond the
 * school kitchen's tomato. Illustrative volumes with a gentle trend and
 * noise; every row is flagged synthetic and the forecast says so.
 */
const HISTORY_PLANS: HistoryPlan[] = [
  { buyerType: 'INSTITUTIONAL', crop: 'PADDY', kgPerServingDay: 80, weeklyGrowth: 0, noise: 0.06, followsSchoolCalendar: true, seed: 2042 },
  { buyerType: 'INSTITUTIONAL', crop: 'ONION', kgPerServingDay: 12, weeklyGrowth: 0, noise: 0.1, followsSchoolCalendar: true, seed: 3042 },
  { buyerType: 'FAIR_PRICE_SHOP', crop: 'ONION', kgPerServingDay: 50, weeklyGrowth: 0.006, noise: 0.12, followsSchoolCalendar: false, seed: 4042 },
  { buyerType: 'FAIR_PRICE_SHOP', crop: 'WHEAT', kgPerServingDay: 140, weeklyGrowth: 0.002, noise: 0.08, followsSchoolCalendar: false, seed: 5042 },
  { buyerType: 'RESIDENTIAL_SOCIETY', crop: 'POTATO', kgPerServingDay: 20, weeklyGrowth: 0.01, noise: 0.15, followsSchoolCalendar: false, seed: 6042 },
]

/** Idempotent: only fills buyer × crop series that have no history yet, so it also upgrades databases seeded before it existed. */
export async function ensureDemandHistory(db: Db) {
  const buyers = await db.query<{ id: string; type: BuyerType }>(`select id, type from agrilink.buyers order by created_at`)
  if (!buyers.length) return
  const calendar = await db.query<{ day: string; kind: 'HOLIDAY' | 'EXAM' }>(`select day, kind from agrilink.academic_calendar`)
  const byDay = new Map(calendar.map((c) => [c.day, c.kind]))
  const thisWeek = weekStart(isoDate(clock.now()))

  for (const plan of HISTORY_PLANS) {
    const buyer = buyers.find((b) => b.type === plan.buyerType)
    if (!buyer) continue
    const [existing] = await db.query<{ n: number }>(`select count(*)::int as n from agrilink.order_history where buyer_id = $1 and crop = $2`, [buyer.id, plan.crop])
    if ((existing?.n ?? 0) > 0) continue
    const random = mulberry32(plan.seed)
    for (let w = 26; w >= 1; w--) {
      const start = addDays(thisWeek, -7 * w)
      const days = Array.from({ length: 6 }, (_, d) => addDays(start, d))
      const servingDays = plan.followsSchoolCalendar ? days.filter((d) => byDay.get(d) !== 'HOLIDAY').length : 6
      if (servingDays === 0) continue
      const examDays = plan.followsSchoolCalendar ? days.filter((d) => byDay.get(d) === 'EXAM').length : 0
      const growth = 1 + plan.weeklyGrowth * (26 - w)
      const jitter = 1 - plan.noise + random() * 2 * plan.noise
      const qty = Math.round((plan.kgPerServingDay * (servingDays - examDays * 0.15) * growth * jitter) / 5) * 5
      await db.query(
        `insert into agrilink.order_history (buyer_id, crop, week_start, school_days, qty_kg) values ($1, $2, $3::date, $4, $5) on conflict (buyer_id, crop, week_start) do nothing`,
        [buyer.id, plan.crop, start, servingDays, qty],
      )
    }
  }
}

function seededQuote(kind: 'MANDI' | 'RETAIL', crop: CropId, price: number, market: string, date: string) {
  return {
    kind,
    crop,
    pricePerKg: price,
    market,
    date,
    source: kind === 'MANDI' ? 'AGMARKNET' : 'DOCA',
    tier: 'seeded',
    fetchedAt: new Date(`${date}T03:00:00Z`).toISOString(),
    detail: 'Illustrative figure seeded for offline use — not a published price',
  }
}
