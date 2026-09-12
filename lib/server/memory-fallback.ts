import { SCHEMA_VERSION } from './schema'
import type { Db, Row } from './db'

export function createMemoryFallbackDb(): Db {
  const fpos: Row[] = [
    {
      id: 'fpo-anand-001',
      name: 'Mahi Valley Farmer Producer Co. Ltd',
      village: 'Boriavi',
      district: 'Anand',
      state: 'Gujarat',
      lat: 22.613,
      lng: 72.936,
      bank_account_ref: 'FPO current account ••••4417',
      created_at: new Date().toISOString(),
    },
  ]

  const buyers: Row[] = [
    {
      id: 'buyer-school-001',
      name: 'PM POSHAN Central Kitchen, Vallabh Vidyanagar',
      type: 'INSTITUTIONAL',
      address: 'Kitchen block, Nana Bazaar, Vallabh Vidyanagar',
      city: 'Anand',
      lat: 22.553,
      lng: 72.923,
      contact_name: 'Meera Joshi',
      contact_phone: '+91 90000 20201',
      enrolment: 1100,
      completed_orders: 24,
      dispute_count: 0,
      rating: 4.9,
      created_at: new Date().toISOString(),
    },
    {
      id: 'buyer-jpk-002',
      name: 'Jan Poshan Kendra · FPS No. 214, Anand',
      type: 'FAIR_PRICE_SHOP',
      address: 'Shop 214, Ganesh Chowkdi, Anand',
      city: 'Anand',
      lat: 22.562,
      lng: 72.958,
      contact_name: 'Dinesh Prajapati',
      contact_phone: '+91 90000 20202',
      completed_orders: 18,
      dispute_count: 1,
      rating: 4.7,
      created_at: new Date().toISOString(),
    },
    {
      id: 'buyer-rwa-003',
      name: "Shreeji Heights Residents' Association, Karamsad",
      type: 'RESIDENTIAL_SOCIETY',
      address: 'Main gate, Shreeji Heights, Karamsad',
      city: 'Anand',
      lat: 22.5405,
      lng: 72.9105,
      contact_name: 'Hetal Shah',
      contact_phone: '+91 90000 20203',
      completed_orders: 12,
      dispute_count: 0,
      rating: 4.8,
      created_at: new Date().toISOString(),
    },
  ]

  const farmers: Row[] = [
    { id: 'f-ramesh-101', fpo_id: 'fpo-anand-001', name: 'Rameshbhai Patel', phone: '+91 90000 10101', language: 'gu', land_hectares: 0.8, village: 'Boriavi', lat: 22.6167, lng: 72.9333, completed_orders: 14, failed_orders: 1, reliability_score: 93, created_at: new Date().toISOString() },
    { id: 'f-savita-102', fpo_id: 'fpo-anand-001', name: 'Savitaben Parmar', phone: '+91 90000 10102', language: 'gu', land_hectares: 1.2, village: 'Petlad', lat: 22.4768, lng: 72.7998, completed_orders: 19, failed_orders: 0, reliability_score: 98, created_at: new Date().toISOString() },
    { id: 'f-mohan-103', fpo_id: 'fpo-anand-001', name: 'Mohanbhai Solanki', phone: '+91 90000 10103', language: 'gu', land_hectares: 1.5, village: 'Sojitra', lat: 22.5387, lng: 72.7195, completed_orders: 11, failed_orders: 1, reliability_score: 91, created_at: new Date().toISOString() },
    { id: 'f-jignesh-104', fpo_id: 'fpo-anand-001', name: 'Jignesh Chauhan', phone: '+91 90000 10104', language: 'gu', land_hectares: 1.0, village: 'Bakrol', lat: 22.5796, lng: 72.958, completed_orders: 16, failed_orders: 1, reliability_score: 94, created_at: new Date().toISOString() },
    { id: 'f-laxmi-105', fpo_id: 'fpo-anand-001', name: 'Laxmiben Vaghela', phone: '+91 90000 10105', language: 'gu', land_hectares: 0.4, village: 'Umreth', lat: 22.6986, lng: 73.1149, completed_orders: 8, failed_orders: 0, reliability_score: 96, created_at: new Date().toISOString() },
    { id: 'f-suresh-108', fpo_id: 'fpo-anand-001', name: 'Suresh Yadav', phone: '+91 90000 10108', language: 'hi', land_hectares: 0.5, village: 'Kheda', lat: 22.7507, lng: 72.6847, completed_orders: 10, failed_orders: 2, reliability_score: 83, created_at: new Date().toISOString() },
    { id: 'f-bhavna-109', fpo_id: 'fpo-anand-001', name: 'Bhavnaben Thakor', phone: '+91 90000 10109', language: 'gu', land_hectares: 1.8, village: 'Borsad', lat: 22.4078, lng: 72.8988, completed_orders: 22, failed_orders: 1, reliability_score: 95, created_at: new Date().toISOString() },
  ]

  const nowMs = Date.now()
  const winStart = new Date(nowMs - 86400000 * 7).toISOString().split('T')[0]
  const winEnd = new Date(nowMs + 86400000 * 60).toISOString().split('T')[0]

  const cropRegistry: Row[] = [
    { id: 'reg-paddy-01', farmer_id: 'f-ramesh-101', crop: 'PADDY', expected_qty_kg: 500, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-paddy-02', farmer_id: 'f-savita-102', crop: 'PADDY', expected_qty_kg: 700, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-tomato-01', farmer_id: 'f-mohan-103', crop: 'TOMATO', expected_qty_kg: 800, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-wheat-01', farmer_id: 'f-jignesh-104', crop: 'WHEAT', expected_qty_kg: 1000, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-onion-01', farmer_id: 'f-bhavna-109', crop: 'ONION', expected_qty_kg: 600, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-potato-01', farmer_id: 'f-savita-102', crop: 'POTATO', expected_qty_kg: 500, harvest_window_start: winStart, harvest_window_end: winEnd, status: 'ACTIVE', created_at: new Date().toISOString() },
  ]

  const orders: Row[] = [
    {
      id: 'ord-demo-001',
      code: 'AG-1001',
      buyer_id: 'buyer-school-001',
      fpo_id: 'fpo-anand-001',
      crop: 'PADDY',
      qty_target_kg: 1000,
      price_per_kg: 28,
      delivery_date: '2025-10-20',
      advance_pct: 15,
      status: 'FUNDED',
      advance_amount: 4200,
      advance_committed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ]

  const commitments: Row[] = [
    {
      id: 'com-001',
      order_id: 'ord-demo-001',
      registry_id: 'reg-paddy-01',
      farmer_id: 'f-ramesh-101',
      qty_committed_kg: 500,
      tier: 'SMS',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
    {
      id: 'com-002',
      order_id: 'ord-demo-001',
      registry_id: 'reg-paddy-02',
      farmer_id: 'f-savita-102',
      qty_committed_kg: 500,
      tier: 'WHATSAPP',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    },
  ]

  const lots: Row[] = [
    {
      id: 'lot-001',
      code: 'LOT-1001',
      order_id: 'ord-demo-001',
      farmer_id: 'f-ramesh-101',
      crop: 'PADDY',
      grade: 'A',
      qty_accepted_kg: 500,
      captured_at: new Date().toISOString(),
    },
  ]

  const priceRefs: Row[] = [
    { id: 'pr-1', kind: 'MANDI', crop: 'PADDY', price: 22, market: 'Anand APMC', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-2', kind: 'RETAIL', crop: 'PADDY', price: 34, market: 'Ahmedabad', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-3', kind: 'MANDI', crop: 'TOMATO', price: 18, market: 'Anand APMC', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-4', kind: 'RETAIL', crop: 'TOMATO', price: 32, market: 'Ahmedabad', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-5', kind: 'MANDI', crop: 'WHEAT', price: 26, market: 'Anand APMC', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-6', kind: 'RETAIL', crop: 'WHEAT', price: 38, market: 'Ahmedabad', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-7', kind: 'MANDI', crop: 'ONION', price: 20, market: 'Anand APMC', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-8', kind: 'RETAIL', crop: 'ONION', price: 35, market: 'Ahmedabad', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-9', kind: 'MANDI', crop: 'POTATO', price: 16, market: 'Anand APMC', tier: 'live', fetched_at: new Date().toISOString() },
    { id: 'pr-10', kind: 'RETAIL', crop: 'POTATO', price: 28, market: 'Ahmedabad', tier: 'live', fetched_at: new Date().toISOString() },
  ]

  const meta: Record<string, string> = {
    schema_version: SCHEMA_VERSION,
  }

  const aggregationBatches: Row[] = [
    {
      id: 'batch-001',
      batch_code: 'BATCH-AG1001-KHD',
      fpo_name: 'Mahi Valley FPO',
      crop: 'PADDY',
      location: 'Kheda Central Depot',
      total_quantity_kg: 1000,
      grade_a_kg: 1000,
      grade_b_kg: 0,
      quality_verified: true,
      created_by: 'Anita Desai',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ]

  const userSessions: Row[] = []
  const mpinCredentials: Row[] = []
  const userAccounts: Row[] = [
    {
      id: 'demo-admin-anita',
      phone: '9825000000',
      full_name: 'Anita Sharma',
      role: 'admin',
      pin_hash: 'demo_hash',
      salt: 'salt_9825000000',
      verification_status: 'verified',
      onboarding_complete: true,
      metadata: { role: 'Lead FPO Federation Coordinator' },
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
    {
      id: 'demo-farmer-ramesh',
      phone: '9825144102',
      full_name: 'Ramesh Kumar',
      role: 'farmer',
      pin_hash: 'demo_hash',
      salt: 'salt_9825144102',
      verification_status: 'verified',
      onboarding_complete: true,
      metadata: { village: 'Boriavi', state: 'Gujarat' },
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
    {
      id: 'demo-buyer-meera',
      phone: '9825277103',
      full_name: 'Meera Patel',
      role: 'buyer',
      pin_hash: 'demo_hash',
      salt: 'salt_9825277103',
      verification_status: 'verified',
      onboarding_complete: true,
      metadata: { company: 'PM POSHAN Central Kitchen', city: 'Anand' },
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
  ]

  let nextOrderSeq = 1002

  const db: Db = {
    kind: 'pglite',
    async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
      const q = text.toLowerCase().trim()

      if (q.includes("select to_regclass('agrilink.meta') is not null as ok")) {
        return [{ ok: true }] as T[]
      }
      if (q.includes("select value from agrilink.meta where key = 'schema_version'")) {
        return [{ value: meta.schema_version || SCHEMA_VERSION }] as T[]
      }
      if (q.startsWith('insert into agrilink.meta')) {
        const key = String(params[0] || 'schema_version')
        meta[key] = SCHEMA_VERSION
        return [] as T[]
      }

      if (q.includes('select count(*)::int as n from agrilink.fpos')) {
        return [{ n: fpos.length }] as T[]
      }
      if (q.includes('from agrilink.fpos') && q.includes('limit 1')) {
        return [fpos[0]] as T[]
      }
      if (q.includes('from agrilink.fpos')) {
        if (params.length && q.includes('where id = $1')) {
          return fpos.filter((f) => f.id === params[0]) as T[]
        }
        return [...fpos] as T[]
      }

      if (q.includes('from agrilink.buyers')) {
        if (params.length && q.includes('where id = $1')) {
          const found = buyers.find((b) => b.id === params[0])
          return (found ? [found] : [buyers[0]]) as T[]
        }
        return [...buyers] as T[]
      }

      if (q.includes('from agrilink.user_accounts')) {
        if (params.length && q.includes('where phone = $1')) {
          const searchPhone = String(params[0] || '').replace(/\D/g, '').slice(-10)
          return userAccounts.filter((u) => u.phone === searchPhone) as T[]
        }
        return [...userAccounts] as T[]
      }

      if (q.startsWith('insert into agrilink.user_accounts')) {
        const phone = String(params[0] || '').replace(/\D/g, '').slice(-10)
        const fullName = String(params[1] || 'AgriLink Member').trim()
        const role = String(params[2] || 'farmer').trim()
        const pinHash = String(params[3] || '')
        const salt = String(params[4] || '')
        const metadata = typeof params[5] === 'string' ? JSON.parse(params[5] || '{}') : (params[5] || {})
        const existingIdx = userAccounts.findIndex((u) => u.phone === phone)
        const now = new Date().toISOString()
        if (existingIdx !== -1) {
          const existing = userAccounts[existingIdx]
          existing.full_name = fullName
          existing.role = role
          existing.pin_hash = pinHash || existing.pin_hash
          existing.salt = salt || existing.salt
          existing.metadata = metadata
          existing.last_login_at = now
          return [{ id: existing.id }] as T[]
        }
        const newId = `usr_${phone}_${Date.now()}`
        const newAcc: Row = {
          id: newId,
          phone,
          full_name: fullName,
          role,
          pin_hash: pinHash,
          salt,
          verification_status: 'verified',
          onboarding_complete: true,
          metadata,
          last_login_at: now,
          created_at: now,
        }
        userAccounts.unshift(newAcc)
        return [{ id: newId }] as T[]
      }

      if (q.startsWith('update agrilink.user_accounts')) {
        const time = String(params[0] || new Date().toISOString())
        const phone = String(params[1] || '').replace(/\D/g, '').slice(-10)
        const found = userAccounts.find((u) => u.phone === phone)
        if (found) {
          found.last_login_at = time
        }
        return [] as T[]
      }

      if (q.includes('from agrilink.farmers')) {
        let matched = farmers
        if (params.length && q.includes('where id = $1')) {
          matched = farmers.filter((f) => f.id === params[0])
        } else if (params.length && q.includes('any(')) {
          const idStr = String(params[0] || '').replace(/[{}]/g, '')
          const ids = idStr.split(',').map((s) => s.trim())
          matched = farmers.filter((f) => ids.includes(String(f.id)))
        }
        return matched.map((f) => {
          const reg = cropRegistry.find((r) => r.farmer_id === f.id)
          return {
            id: f.id,
            name: f.name,
            phone: f.phone,
            mobile_number: f.phone,
            village: f.village,
            crop_name: f.crop_name || (reg ? reg.crop : 'PADDY'),
            crop: f.crop_name || (reg ? reg.crop : 'PADDY'),
            quantity: f.quantity || (reg ? reg.expected_qty_kg : 500),
            quality_grade: f.quality_grade || 'A',
            harvest_date: f.harvest_date || (reg ? reg.harvest_window_start : new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]),
            verified: true,
            reliability_score: f.reliability_score || 95,
            land_hectares: f.land_hectares || 1.0,
            is_live_account: f.is_live_account || false,
            last_login_at: f.last_login_at || f.created_at,
            created_at: f.created_at,
          }
        }) as T[]
      }

      if (q.includes('from agrilink.price_refs')) {
        const kind = String(params[0] || 'MANDI').toUpperCase()
        const crop = String(params[1] || 'PADDY').toUpperCase()
        const matched = priceRefs.find((p) => p.kind === kind && p.crop === crop)
        return (matched ? [matched] : [priceRefs[0]]) as T[]
      }

      if (q.startsWith('insert into agrilink.orders')) {
        const newOrder: Row = {
          id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          code: `AG-${nextOrderSeq++}`,
          buyer_id: params[0] || buyers[0].id,
          fpo_id: params[1] || fpos[0].id,
          crop: String(params[2] || 'PADDY').toUpperCase(),
          qty_target_kg: Number(params[3] || 1000),
          price_per_kg: Number(params[4] || 28),
          delivery_date: String(params[5] || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]),
          advance_pct: Number(params[6] || 15),
          status: 'POSTED',
          advance_amount: Math.round(Number(params[3] || 1000) * Number(params[4] || 28) * 0.15),
          mandi_ref: params[7] ? (typeof params[7] === 'string' ? JSON.parse(params[7]) : params[7]) : null,
          retail_ref: params[8] ? (typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]) : null,
          created_at: new Date().toISOString(),
        }
        orders.unshift(newOrder)
        return [newOrder] as T[]
      }

      if (q.startsWith('update agrilink.orders')) {
        const orderId = String(params[0] || params[params.length - 1])
        const existing = orders.find((o) => o.id === orderId) || orders[0]
        if (q.includes("status = 'funded'")) {
          existing.status = 'FUNDED'
          if (params[1]) existing.advance_amount = Number(params[1])
          existing.advance_committed_at = new Date().toISOString()
        } else if (q.includes("status = 'aggregated'") || q.includes("status = $1") && String(params[0]).toUpperCase() === 'AGGREGATED') {
          existing.status = 'AGGREGATED'
        } else if (q.includes('status =')) {
          existing.status = 'SOURCING'
        }
        return [existing] as T[]
      }

      if (q.startsWith('insert into agrilink.farmers')) {
        const isFullSchema = q.includes('fpo_id')
        const name = String((isFullSchema ? params[1] : params[0]) || 'Farmer Member').trim()
        const phone = String((isFullSchema ? params[2] : params[2]) || '+91 98251 44102').trim()
        const normalPhone = phone.replace(/\D/g, '').slice(-10)
        const village = String((isFullSchema ? (params[3] || params[5]) : params[1]) || 'Kheda').trim()
        const cropName = String((isFullSchema ? 'PADDY' : params[3]) || 'PADDY').toUpperCase()
        const qty = Number((isFullSchema ? 500 : params[4]) || 500)
        const grade = String((isFullSchema ? 'A' : params[5]) || 'A')
        const harvestDate = String((isFullSchema ? new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] : params[6]) || new Date().toISOString().split('T')[0])

        const existingIdx = farmers.findIndex((f) => String(f.phone).replace(/\D/g, '').slice(-10) === normalPhone)
        if (existingIdx !== -1) {
          const existing = farmers[existingIdx]
          existing.name = name
          existing.village = village
          if (!isFullSchema || !existing.crop_name) {
            existing.crop_name = cropName
            existing.quantity = qty
            existing.quality_grade = grade
            existing.harvest_date = harvestDate
          }
          existing.is_live_account = true
          existing.last_login_at = new Date().toISOString()
          return [existing] as T[]
        }

        const farmerId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const newFarmer: Row = {
          id: farmerId,
          fpo_id: fpos[0]?.id || 'fpo-anand-001',
          name,
          village,
          phone,
          crop_name: cropName,
          quantity: qty,
          quality_grade: grade,
          harvest_date: harvestDate,
          language: 'gu',
          land_hectares: 1.0,
          lat: 22.75,
          lng: 72.68,
          completed_orders: 1,
          failed_orders: 0,
          reliability_score: 95,
          is_live_account: true,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
        farmers.unshift(newFarmer)

        // Also push to crop registry for cross-matching
        cropRegistry.unshift({
          id: `reg-${Date.now()}`,
          farmer_id: farmerId,
          crop: cropName,
          expected_qty_kg: qty,
          harvest_window_start: harvestDate,
          harvest_window_end: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })

        return [newFarmer] as T[]
      }

      if (q.startsWith('insert into agrilink.crop_registry')) {
        const newReg: Row = {
          id: `reg-${Date.now()}`,
          farmer_id: params[0] || farmers[0].id,
          crop: String(params[1] || 'PADDY').toUpperCase(),
          expected_qty_kg: Number(params[2] || 500),
          harvest_window_start: String(params[3] || new Date().toISOString().split('T')[0]),
          harvest_window_end: String(params[4] || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        }
        cropRegistry.unshift(newReg)
        return [newReg] as T[]
      }

      if (q.startsWith('insert into agrilink.aggregation_batches')) {
        const newBatch: Row = {
          id: `batch-${Date.now()}`,
          batch_code: String(params[0] || `BATCH-${Date.now()}`).toUpperCase(),
          fpo_name: String(params[1] || 'Mahi Valley FPO'),
          crop: String(params[2] || 'PADDY').toUpperCase(),
          location: String(params[3] || 'Kheda Central Depot'),
          total_quantity_kg: Number(params[4] || 1000),
          grade_a_kg: Number(params[4] || 1000),
          grade_b_kg: 0,
          quality_verified: true,
          created_by: params[5] || 'Anita Desai',
          created_at: new Date().toISOString(),
        }
        aggregationBatches.unshift(newBatch)
        return [newBatch] as T[]
      }

      if (q.includes('from agrilink.aggregation_batches')) {
        return [...aggregationBatches] as T[]
      }

      if (q.startsWith('insert into agrilink.commitments')) {
        const newCom: Row = {
          id: `com-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          order_id: params[0],
          registry_id: params[1],
          farmer_id: params[2],
          qty_committed_kg: Number(params[3] || 100),
          tier: 'SMS',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        }
        commitments.unshift(newCom)
        return [newCom] as T[]
      }

      if (q.includes('from agrilink.orders')) {
        if (params.length && q.includes('where id = $1')) {
          const found = orders.find((o) => o.id === params[0])
          return (found ? [found] : [orders[0]]) as T[]
        }
        return orders.map((o) => {
          const b = buyers.find((x) => x.id === o.buyer_id) || buyers[0]
          return { ...o, buyer_name: b.name }
        }) as T[]
      }

      if (q.includes('from agrilink.crop_registry')) {
        if (params.length && q.includes('where r.crop = $1')) {
          const crop = String(params[0] || 'PADDY').toUpperCase()
          const matched = cropRegistry.filter((r) => r.crop === crop)
          const result = (matched.length ? matched : cropRegistry).map((r) => {
            const f = farmers.find((x) => x.id === r.farmer_id) || farmers[0]
            return {
              registry_id: r.id,
              farmer_id: f.id,
              farmer_name: f.name,
              village: f.village,
              fpo_id: f.fpo_id,
              lat: f.lat,
              lng: f.lng,
              crop: r.crop,
              status: r.status,
              expected_qty_kg: r.expected_qty_kg,
              harvest_window_start: r.harvest_window_start,
              harvest_window_end: r.harvest_window_end,
              committed_elsewhere_kg: 0,
            }
          })
          return result as T[]
        }
        return [...cropRegistry] as T[]
      }

      if (q.includes('from agrilink.commitments')) {
        if (params.length && q.includes('where order_id = $1')) {
          return commitments.filter((c) => c.order_id === params[0]) as T[]
        }
        return [...commitments] as T[]
      }

      if (q.includes('from agrilink.lots')) {
        if (params.length && q.includes('where order_id = $1')) {
          return lots.filter((l) => l.order_id === params[0]) as T[]
        }
        return [...lots] as T[]
      }

      if (q.includes('agrilink.user_sessions')) {
        return [...userSessions] as T[]
      }
      if (q.includes('agrilink.mpin_credentials')) {
        return [...mpinCredentials] as T[]
      }

      return [] as T[]
    },

    async tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
      return fn(db)
    },

    async exec(_sql: string): Promise<void> {
      // DDL noop
    },

    async close(): Promise<void> {
      // noop
    },
  }

  return db
}
