import { isCropId } from '@/lib/domain/crops'
import { isIsoDate, isoDate } from '@/lib/domain/dates'
import type { Lang } from '@/lib/domain/i18n'
import { userName, userPhone } from '@/lib/server/actors'
import { requireRole } from '@/lib/server/auth'
import { clock } from '@/lib/server/clock'
import { getDb } from '@/lib/server/db'
import { DomainError } from '@/lib/server/errors'
import { errorResponse, optionalString, readJson } from '@/lib/server/http'
import { declareHarvest } from '@/lib/server/marketplace'
import { getAllUsers } from '@/lib/server/pin-auth'

type SupplyRow = {
  id: string
  name: string
  phone: string
  village: string
  lat: number
  lng: number
  created_at: Date | string
  registry_id: string | null
  crop: string | null
  expected_qty_kg: number | null
  harvest_window_start: string | null
  harvest_window_end: string | null
  available_kg: number
  delivered_lots: number
  no_shows: number
  last_grade: 'A' | 'B' | 'C' | null
}

const lastTen = (value: string) => value.replace(/\D/g, '').slice(-10)

/**
 * Share of commitments delivered, smoothed with a prior of nine deliveries
 * and one no-show so a new member starts at 90% rather than an unearned 100%
 * or a punitive 0%. Withdrawing early carries no penalty, so it does not count.
 */
function reliabilityScore(delivered: number, noShows: number) {
  return Math.round(((delivered + 9) / (delivered + noShows + 10)) * 100)
}

/** Member supply: one row per farmer and live registry entry, with uncommitted quantity and track record. */
export async function GET() {
  try {
    const db = await getDb()
    const rows = await db.query<SupplyRow>(
      `select f.id, f.name, f.phone, f.village, f.lat, f.lng, f.created_at,
              r.id as registry_id, r.crop, r.expected_qty_kg, r.harvest_window_start, r.harvest_window_end,
              greatest(0, coalesce(r.expected_qty_kg, 0) - coalesce((select sum(c.qty_committed_kg) from agrilink.commitments c
                                                                   where c.registry_id = r.id and c.status in ('ACTIVE', 'FULFILLED')), 0)) as available_kg,
              (select count(*)::int from agrilink.lots l where l.farmer_id = f.id and l.qty_accepted_kg > 0) as delivered_lots,
              (select count(*)::int from agrilink.commitments c where c.farmer_id = f.id and c.status = 'NO_SHOW') as no_shows,
              (select l.final_grade from agrilink.lots l where l.farmer_id = f.id and l.final_grade is not null order by l.captured_at desc limit 1) as last_grade
         from agrilink.farmers f
         left join agrilink.crop_registry r on r.farmer_id = f.id and r.status = 'ACTIVE'
        order by f.name, r.crop`,
    )
    const accounts = new Map((await getAllUsers().catch(() => [])).filter((u) => u.role === 'farmer').map((u) => [lastTen(u.phone), u]))
    const farmers = rows.map((r) => {
      const account = accounts.get(lastTen(r.phone))
      return {
        id: r.id,
        entry_id: r.registry_id ?? r.id,
        name: r.name,
        mobile_number: r.phone,
        village: r.village,
        lat: r.lat,
        lng: r.lng,
        crop_name: r.crop,
        crop: r.crop,
        quantity: r.available_kg,
        registered_kg: r.expected_qty_kg ?? 0,
        harvest_date: r.harvest_window_start,
        harvest_window_end: r.harvest_window_end,
        quality_grade: r.last_grade,
        delivered_lots: r.delivered_lots,
        no_shows: r.no_shows,
        reliability_score: reliabilityScore(r.delivered_lots, r.no_shows),
        // FPO enrolment is the verification for members who have no app account.
        verified: account ? account.verificationStatus === 'verified' : true,
        is_live_account: Boolean(account),
        last_login_at: account?.lastLoginAt ?? null,
        created_at: r.created_at,
      }
    })
    farmers.sort((a, b) => Number(b.is_live_account) - Number(a.is_live_account) || String(b.last_login_at ?? '').localeCompare(String(a.last_login_at ?? '')))
    return Response.json({ farmers })
  } catch (error) {
    return errorResponse(error, 'Unable to load farmers.')
  }
}

/** Declare a harvest: a farmer for themselves, or the coordinator enrolling a member by phone. */
export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ['farmer', 'admin'])
    const body = await readJson(request)
    const crop = String(body.crop_name ?? body.crop ?? '').split('/')[0].trim().toUpperCase()
    if (!isCropId(crop)) throw new DomainError('Choose a supported crop.', 400)
    const phone = user.role === 'farmer' ? userPhone(user) : lastTen(String(body.mobile_number ?? body.phone ?? ''))
    if (!/^[6-9]\d{9}$/.test(phone)) throw new DomainError('Enter the farmer’s 10-digit mobile number.', 400)
    const harvestDate = optionalString(body.harvest_date)
    const hasPin = body.lat != null && body.lng != null && Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng))
    const db = await getDb()
    const result = await declareHarvest(db, {
      phone,
      name: (user.role === 'farmer' ? userName(user) : '') || optionalString(body.name) || '',
      village: optionalString(body.village),
      crop,
      quantityKg: Number(body.quantity ?? body.quantity_kg),
      harvestStart: harvestDate && isIsoDate(harvestDate) ? harvestDate : isoDate(clock.now()),
      language: (optionalString(body.language) ?? undefined) as Lang | undefined,
      landHectares: body.land_hectares == null ? null : Number(body.land_hectares),
      location: hasPin ? { lat: Number(body.lat), lng: Number(body.lng) } : null,
    })
    return Response.json({
      ok: true,
      created: result.created,
      farmer: {
        id: result.farmer.id,
        name: result.farmer.name,
        mobile_number: result.farmer.phone,
        village: result.farmer.village,
        crop_name: result.entry.crop,
        quantity: result.entry.expectedQtyKg,
        harvest_date: result.entry.harvestWindowStart,
        harvest_window_end: result.entry.harvestWindowEnd,
      },
      registry: result.entry,
    })
  } catch (error) {
    return errorResponse(error, 'Unable to register the harvest.')
  }
}
