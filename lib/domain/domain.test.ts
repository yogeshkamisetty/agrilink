import { describe, expect, it } from 'vitest'
import { classifyCommitment, commitmentCap, maxAcceptableKg, shortfallKg, standbyToPromote, type LiveCommitment } from './commitments'
import { channelCheck, CROP_IDS, harvestLeadDays, shelfClassOf, SHELF_LIFE_ROUTING } from './crops'
import { addDays, nextMonday, weekStart } from './dates'
import { forecastWeek, schoolWeek } from './forecast'
import { CONFIDENCE_THRESHOLD, interpretGradeResult } from './grading'
import { matchRegistry, type RegistryCandidate } from './matching'
import { allocateTransport, buyerAdvance, lotAdvance, priceProof, settleLot, suggestedPrice } from './money'
import { summariseMandiRecords, parseArrivalDate } from './prices'
import { pathKm, planRoute, type RouteStop } from './routing'
import { dueChannels } from './cascade'
import { renderMessage, LANGS, cropName, localDate, t, resolveLang } from './i18n'

describe('shelf-life channel routing', () => {
  it('classifies crops by shelf life', () => {
    expect(shelfClassOf('PADDY')).toBe('shelfStable')
    expect(shelfClassOf('WHEAT')).toBe('shelfStable')
    expect(shelfClassOf('TOMATO')).toBe('perishable')
    expect(shelfClassOf('SPINACH')).toBe('perishable')
    expect(shelfClassOf('ONION')).toBe('semiPerishable')
    expect(shelfClassOf('POTATO')).toBe('semiPerishable')
    expect(shelfClassOf('BAJRA')).toBe('shelfStable')
  })

  it('blocks perishables from ration shops and societies, with the reason', () => {
    const tomatoAtFps = channelCheck('TOMATO', 'FAIR_PRICE_SHOP')
    expect(tomatoAtFps.allowed).toBe(false)
    expect(tomatoAtFps.reason).toMatch(/institutional kitchens only/)
    expect(channelCheck('TOMATO', 'RESIDENTIAL_SOCIETY').allowed).toBe(false)
    expect(channelCheck('TOMATO', 'INSTITUTIONAL').allowed).toBe(true)
    expect(channelCheck('PADDY', 'INSTITUTIONAL').allowed).toBe(true)
    expect(channelCheck('WHEAT', 'FAIR_PRICE_SHOP').allowed).toBe(true)
    expect(channelCheck('ONION', 'FAIR_PRICE_SHOP').allowed).toBe(true)
    expect(channelCheck('BAJRA', 'RESIDENTIAL_SOCIETY').allowed).toBe(true)
  })

  it('every crop falls in exactly one routing band', () => {
    for (const crop of CROP_IDS) expect(SHELF_LIFE_ROUTING[shelfClassOf(crop)]).toBeDefined()
  })

  it('harvest lead time follows shelf life', () => {
    expect(harvestLeadDays('TOMATO')).toBe(3)
    expect(harvestLeadDays('ONION')).toBe(44)
  })
})

describe('dates', () => {
  it('finds Mondays and week starts', () => {
    expect(nextMonday('2026-09-11')).toBe('2026-09-14') // Friday → Monday
    expect(nextMonday('2026-09-14')).toBe('2026-09-21') // Monday → next Monday
    expect(weekStart('2026-09-13')).toBe('2026-09-07') // Sunday → its Monday
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('commitments to 115%', () => {
  const totals = (primaryKg: number, standbyKg: number) => ({ targetKg: 200, primaryKg, standbyKg })

  it('caps at 115% of target', () => expect(commitmentCap(200)).toBe(230))

  it('fills primary to the target, then standby, then trims at the cap', () => {
    expect(classifyCommitment(totals(0, 0), 50)).toMatchObject({ ok: true, primaryKg: 50, standbyKg: 0, trimmedKg: 0, fillsOrder: false })
    expect(classifyCommitment(totals(200, 0), 30)).toMatchObject({ ok: true, primaryKg: 0, standbyKg: 30, fillsOrder: true })
    expect(classifyCommitment(totals(200, 20), 30)).toMatchObject({ ok: true, primaryKg: 0, standbyKg: 10, trimmedKg: 20, fillsOrder: true })
  })

  it('splits a commitment that straddles the target line', () => {
    expect(classifyCommitment(totals(180, 0), 50)).toMatchObject({ ok: true, primaryKg: 20, standbyKg: 30 })
  })

  it('refuses when full or when quantity is not positive', () => {
    expect(classifyCommitment(totals(200, 30), 10)).toEqual({ ok: false, reason: 'ORDER_FULL' })
    expect(classifyCommitment(totals(0, 0), 0)).toEqual({ ok: false, reason: 'INVALID_QTY' })
    expect(classifyCommitment(totals(0, 0), Number.NaN)).toEqual({ ok: false, reason: 'INVALID_QTY' })
  })

  const c = (id: string, farmerId: string, qtyKg: number, isStandby: boolean, status: LiveCommitment['status'] = 'ACTIVE', createdAt = id): LiveCommitment => ({ id, farmerId, qtyKg, isStandby, status, createdAt })

  it('promotes standby earliest-first when a primary farmer drops out', () => {
    const commitments = [c('1', 'a', 50, false), c('2', 'b', 70, false, 'WITHDRAWN'), c('3', 'c', 80, false), c('4', 'd', 30, true), c('5', 'e', 30, true)]
    expect(shortfallKg(200, 0, commitments, new Set())).toBe(70)
    expect(standbyToPromote(200, 0, commitments, new Set()).map((x) => x.id)).toEqual(['4', '5'])
  })

  it('does not promote when there is no shortfall', () => {
    const commitments = [c('1', 'a', 100, false), c('2', 'b', 100, false), c('3', 'c', 30, true)]
    expect(standbyToPromote(200, 0, commitments, new Set())).toEqual([])
  })

  it('protects volume reserved for primary farmers not yet collected', () => {
    const commitments = [c('1', 'a', 50, false), c('2', 'b', 150, false), c('3', 'c', 30, true)]
    expect(maxAcceptableKg(200, 0, commitments, new Set(), 'a')).toBe(50)
    expect(maxAcceptableKg(200, 0, commitments, new Set(), 'c')).toBe(0) // standby not needed
    // b brings only 120 kg, so standby c can now cover 30.
    expect(maxAcceptableKg(200, 170, commitments, new Set(['a', 'b']), 'c')).toBe(30)
  })
})

describe('matching the crop registry', () => {
  const base: RegistryCandidate = {
    registryId: 'r',
    farmerId: 'f',
    farmerName: 'F',
    village: 'V',
    fpoId: 'fpo',
    location: { lat: 22.6, lng: 72.93 },
    crop: 'TOMATO',
    status: 'ACTIVE',
    expectedQtyKg: 50,
    committedElsewhereKg: 0,
    harvestWindowStart: '2026-09-10',
    harvestWindowEnd: '2026-09-20',
  }
  const input = { crop: 'TOMATO' as const, deliveryDate: '2026-09-14', fpoId: 'fpo', buyerLocation: { lat: 22.553, lng: 72.923 } }

  it('matches on crop, window, distance, FPO and available quantity — with reasons', () => {
    const result = matchRegistry(input, [
      base,
      { ...base, farmerId: 'late', harvestWindowStart: '2026-09-20', harvestWindowEnd: '2026-10-01' },
      { ...base, farmerId: 'far', location: { lat: 22.9, lng: 72.5 } },
      { ...base, farmerId: 'other', fpoId: 'x' },
      { ...base, farmerId: 'sold', committedElsewhereKg: 50 },
      { ...base, farmerId: 'onion', crop: 'ONION' },
    ])
    expect(result.matched.map((m) => m.farmerId)).toEqual(['f'])
    expect(Object.fromEntries(result.excluded.map((e) => [e.farmerId, e.reason]))).toEqual({ late: 'HARVEST_WINDOW', far: 'DISTANCE', other: 'OTHER_FPO', sold: 'NO_AVAILABLE_QTY' })
    expect(result.window).toEqual({ start: '2026-09-11', end: '2026-09-14' })
  })
})

describe('cascade tiers', () => {
  it('escalates SMS+WhatsApp at 0h, IVR at 6h, coordinator at 12h', () => {
    expect(dueChannels(0)).toEqual(['SMS', 'WHATSAPP'])
    expect(dueChannels(6)).toEqual(['SMS', 'WHATSAPP', 'IVR'])
    expect(dueChannels(12.5)).toEqual(['SMS', 'WHATSAPP', 'IVR', 'COORDINATOR'])
  })
})

describe('money', () => {
  it('computes the buyer advance and caps farmer advances at what is left of it', () => {
    expect(buyerAdvance(200, 21, 0.4)).toBe(1680)
    expect(lotAdvance(50, 21, 0.4, 1680)).toBe(420)
    expect(lotAdvance(50, 21, 0.4, 100)).toBe(100)
    expect(lotAdvance(50, 21, 0.4, -5)).toBe(0)
  })

  it('allocates transport by kg so shares sum exactly to the vehicle cost', () => {
    const shares = allocateTransport(600, [{ id: 'a', kg: 50 }, { id: 'b', kg: 75 }, { id: 'c', kg: 40 }])
    expect([...shares.values()].reduce((s, x) => s + x, 0)).toBeCloseTo(600, 10)
    expect(shares.get('a')).toBe(181.82)
    expect(shares.get('b')).toBe(272.73)
    expect(shares.get('c')).toBe(145.45)
    const odd = allocateTransport(100, [{ id: 'x', kg: 1 }, { id: 'y', kg: 1 }, { id: 'z', kg: 1 }])
    expect([...odd.values()].reduce((s, x) => s + x, 0)).toBeCloseTo(100, 10)
  })

  it('settles: gross − transport − advance', () => {
    expect(settleLot(50, 21, 181.82, 420)).toEqual({ acceptedKg: 50, pricePerKg: 21, gross: 1050, transportShare: 181.82, advanceDeducted: 420, netPayable: 448.18 })
  })

  it('proves both sides gain against government reference prices', () => {
    const proof = priceProof({ mandi: 13, retail: 28, buyerPaid: 21, farmerRealised: 18 })
    expect(proof).toMatchObject({ farmerGain: 5, buyerSaving: 7, marginBefore: 15, marginAfter: 3, compressionPct: 80 })
    expect(priceProof({ mandi: null, retail: null, buyerPaid: 21, farmerRealised: 18 }).compressionPct).toBeNull()
  })

  it('suggests the mandi–retail midpoint', () => {
    expect(suggestedPrice(13, 28)).toBe(21)
    expect(suggestedPrice(13, null)).toBe(17)
    expect(suggestedPrice(null, 28)).toBeNull()
  })
})

describe('route planning', () => {
  const stop = (id: string, kind: RouteStop['kind'], lat: number, lng: number): RouteStop => ({ id, kind, label: id, lat, lng })
  const depot = stop('depot', 'DEPOT', 22.613, 72.936)
  const pickups = [stop('petlad', 'PICKUP', 22.4768, 72.7998), stop('umreth', 'PICKUP', 22.6986, 73.1149), stop('sojitra', 'PICKUP', 22.5387, 72.7195)]
  const drops = [stop('kitchen', 'DROP', 22.553, 72.923), stop('fps', 'DROP', 22.562, 72.958)]

  it('visits every stop once, all pickups before any drop, never worse than naive', () => {
    const plan = planRoute(depot, pickups, drops)
    expect(plan.sequence[0].id).toBe('depot')
    expect(new Set(plan.sequence.map((s) => s.id)).size).toBe(6)
    const lastPickup = plan.sequence.findLastIndex((s) => s.kind === 'PICKUP')
    const firstDrop = plan.sequence.findIndex((s) => s.kind === 'DROP')
    expect(firstDrop).toBeGreaterThan(lastPickup)
    expect(plan.km).toBeLessThanOrEqual(plan.naiveKm)
    expect(plan.km).toBe(pathKm(plan.sequence))
    expect(plan.km).toBeLessThan(plan.naiveKm) // this zig-zag has an improvement
  })

  it('handles a single pickup and drop', () => {
    const plan = planRoute(depot, [pickups[0]], [drops[0]])
    expect(plan.sequence.map((s) => s.id)).toEqual(['depot', 'petlad', 'kitchen'])
  })
})

describe('forecast', () => {
  const history = Array.from({ length: 10 }, (_, i) => ({ weekStart: addDays('2026-09-07', -7 * (i + 1)), schoolDays: 6, qtyKg: 198 }))

  it('scales kg per school day by school days in the delivery week', () => {
    expect(forecastWeek(history, '2026-09-14', [])).toMatchObject({ forecastKg: 200, schoolDays: 6, kgPerSchoolDay: 33 })
    const withHoliday = forecastWeek(history, '2026-09-14', [{ day: '2026-09-16', kind: 'HOLIDAY', label: 'Holiday' }])
    expect(withHoliday).toMatchObject({ forecastKg: 170, schoolDays: 5 })
  })

  it('ignores vacation weeks and refuses to forecast without history', () => {
    expect(forecastWeek([...history, { weekStart: '2026-08-31', schoolDays: 1, qtyKg: 5 }], '2026-09-14', [])!.kgPerSchoolDay).toBe(33)
    expect(forecastWeek(history.slice(0, 2), '2026-09-14', [])).toBeNull()
  })

  it('counts exam days at reduced attendance', () => {
    expect(schoolWeek('2026-09-14', [{ day: '2026-09-15', kind: 'EXAM', label: 'Exam' }]).examDays).toBe(1)
  })
})

describe('grading interpretation', () => {
  const result = { isProduce: true, grade: 'B' as const, confidence: 0.82, defects: ['2 cracked'], reasoning: 'ok' }
  it('passes confident grades, holds back low-confidence and non-produce photos', () => {
    expect(interpretGradeResult(result, 'm').status).toBe('GRADED')
    expect(interpretGradeResult({ ...result, confidence: CONFIDENCE_THRESHOLD - 0.01 }, 'm').status).toBe('LOW_CONFIDENCE')
    const notProduce = interpretGradeResult({ ...result, isProduce: false }, 'm')
    expect(notProduce).toMatchObject({ status: 'LOW_CONFIDENCE', grade: null })
  })
})

describe('AGMARKNET parsing', () => {
  it('converts ₹/quintal to ₹/kg using the median modal price on the latest date', () => {
    expect(parseArrivalDate('11/09/2026')).toBe('2026-09-11')
    const summary = summariseMandiRecords([
      { market: 'A', arrival_date: '11/09/2026', modal_price: 2600 },
      { market: 'B', arrival_date: '11/09/2026', modal_price: 2800 },
      { market: 'C', arrival_date: '11/09/2026', modal_price: 1300 },
      { market: 'Old', arrival_date: '10/09/2026', modal_price: 9000 },
      { market: 'Bad', arrival_date: 'x', modal_price: 1 },
    ])
    expect(summary).toEqual({ pricePerKg: 26, date: '2026-09-11', markets: ['A', 'B', 'C'] })
    expect(summariseMandiRecords([])).toBeNull()
  })
})

describe('farmer messages', () => {
  it('renders every template in every language without leaking placeholders', () => {
    const params = { crop: 'TOMATO' as const, buyer: 'Kitchen', fpo: 'Mahi Valley FPO', farmer: 'Ramesh', date: '2026-09-14', qty: 200, expected: 50, price: 21, primary: 20, standby: 30, offered: 60, amount: 420, grade: 'A', reason: 'rot', gross: 1050, advance: 420, transport: 181.82, net: 448.18 }
    const templates = ['OFFER_SMS', 'OFFER_IVR', 'OFFER_COORDINATOR', 'CONFIRMATION', 'PROMOTED', 'FILLED', 'RELEASED', 'ADVANCE', 'REJECTED', 'SETTLED', 'WITHDRAWN'] as const
    for (const template of templates) {
      for (const lang of LANGS) {
        const text = renderMessage(template, params, lang)
        expect(text.length).toBeGreaterThan(10)
        expect(text).not.toMatch(/undefined|NaN|\{|\}/)
      }
    }
    expect(renderMessage('CONFIRMATION', { crop: 'TOMATO', date: '2026-09-14', primary: 0, standby: 30 }, 'en')).toMatch(/^You are on standby for 30 kg tomato/)
  })

  it('falls back safely on legacy or unrecognized languages without throwing', () => {
    const params = { crop: 'WHEAT' as const, buyer: 'Kitchen', fpo: 'Mahi Valley FPO', farmer: 'Ramesh', date: '2026-09-14', qty: 30, expected: 50, price: 31 }
    // Test legacy 'gu' and unknown strings
    const legacyMsg = renderMessage('OFFER_SMS', params, 'gu' as any)
    expect(legacyMsg).toContain('AgriLink')
    expect(legacyMsg).not.toMatch(/undefined|NaN/)

    const unknownMsg = renderMessage('OFFER_SMS', params, 'xyz' as any)
    expect(unknownMsg).toContain('AgriLink')

    expect(cropName('WHEAT', 'gu' as any)).toBeTruthy()
    expect(localDate('2026-09-16', 'gu' as any)).toBeTruthy()
    expect(t('commit', 'gu' as any)).toBeTruthy()
    expect(resolveLang('gu')).toBe('hi')
    expect(resolveLang('en')).toBe('en')
    expect(resolveLang('te')).toBe('te')
  })
})

describe('optimal multi-factor smallholder allocation and route planning', () => {
  it('allocates primary target and standby buffer with route optimization', async () => {
    const { allocateFarmersOptimal } = await import('./allocation')
    const candidates = [
      { id: 'f1', name: 'Ramesh Kumar', village: 'Kheda', crop: 'TOMATO', availableKg: 300, reliability: 95, qualityGrade: 'A' as const },
      { id: 'f2', name: 'Savitri Devi', village: 'Borsad', crop: 'TOMATO', availableKg: 400, reliability: 98, qualityGrade: 'A' as const },
      { id: 'f3', name: 'Mohan Lal', village: 'Vasad', crop: 'TOMATO', availableKg: 350, reliability: 91, qualityGrade: 'A' as const },
      { id: 'f4', name: 'Lakshmi Bai', village: 'Boriavi', crop: 'TOMATO', availableKg: 200, reliability: 94, qualityGrade: 'B' as const },
      { id: 'f5', name: 'Jignesh Chauhan', village: 'Petlad', crop: 'TOMATO', availableKg: 250, reliability: 89, qualityGrade: 'A' as const },
    ]

    const result = allocateFarmersOptimal({
      targetKg: 1000,
      crop: 'TOMATO',
      candidates,
      standbyPct: 0.15,
    })

    expect(result.targetKg).toBe(1000)
    expect(result.standbyTargetKg).toBe(150)
    expect(result.totalPrimaryKg).toBe(1000)
    expect(result.totalStandbyKg).toBeGreaterThanOrEqual(150)
    expect(result.isTargetMet).toBe(true)
    expect(result.isBufferSecured).toBe(true)

    // Routing plan check
    expect(result.routePlan.sequence.length).toBeGreaterThan(2)
    expect(result.routePlan.km).toBeGreaterThan(0)

    // Vehicle assignment check
    expect(result.vehicle.name).toMatch(/Bolero|Eicher|Tata/)
    expect(result.vehicle.loadFactorPct).toBeGreaterThan(50)
    expect(result.summaryText).toContain('Optimized allocation')
  })
})

