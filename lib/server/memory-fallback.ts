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
      created_at: new Date().toISOString(),
    },
  ]

  const farmers: Row[] = [
    { id: 'f-ramesh-101', fpo_id: 'fpo-anand-001', name: 'Rameshbhai Patel', phone: '+91 90000 10101', language: 'gu', land_hectares: 0.8, village: 'Boriavi', lat: 22.6167, lng: 72.9333, created_at: new Date().toISOString() },
    { id: 'f-savita-102', fpo_id: 'fpo-anand-001', name: 'Savitaben Parmar', phone: '+91 90000 10102', language: 'gu', land_hectares: 1.2, village: 'Petlad', lat: 22.4768, lng: 72.7998, created_at: new Date().toISOString() },
    { id: 'f-mohan-103', fpo_id: 'fpo-anand-001', name: 'Mohanbhai Solanki', phone: '+91 90000 10103', language: 'gu', land_hectares: 1.5, village: 'Sojitra', lat: 22.5387, lng: 72.7195, created_at: new Date().toISOString() },
    { id: 'f-jignesh-104', fpo_id: 'fpo-anand-001', name: 'Jignesh Chauhan', phone: '+91 90000 10104', language: 'gu', land_hectares: 1.0, village: 'Bakrol', lat: 22.5796, lng: 72.958, created_at: new Date().toISOString() },
    { id: 'f-laxmi-105', fpo_id: 'fpo-anand-001', name: 'Laxmiben Vaghela', phone: '+91 90000 10105', language: 'gu', land_hectares: 0.4, village: 'Umreth', lat: 22.6986, lng: 73.1149, created_at: new Date().toISOString() },
    { id: 'f-suresh-108', fpo_id: 'fpo-anand-001', name: 'Suresh Yadav', phone: '+91 90000 10108', language: 'hi', land_hectares: 0.5, village: 'Kheda', lat: 22.7507, lng: 72.6847, created_at: new Date().toISOString() },
    { id: 'f-bhavna-109', fpo_id: 'fpo-anand-001', name: 'Bhavnaben Thakor', phone: '+91 90000 10109', language: 'gu', land_hectares: 1.8, village: 'Borsad', lat: 22.4078, lng: 72.8988, created_at: new Date().toISOString() },
  ]

  const cropRegistry: Row[] = [
    { id: 'reg-paddy-01', farmer_id: 'f-ramesh-101', crop: 'PADDY', expected_qty_kg: 500, harvest_window_start: '2025-10-15', harvest_window_end: '2025-10-25', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-paddy-02', farmer_id: 'f-savita-102', crop: 'PADDY', expected_qty_kg: 700, harvest_window_start: '2025-10-15', harvest_window_end: '2025-10-25', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-tomato-01', farmer_id: 'f-mohan-103', crop: 'TOMATO', expected_qty_kg: 800, harvest_window_start: '2025-10-14', harvest_window_end: '2025-10-24', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-wheat-01', farmer_id: 'f-jignesh-104', crop: 'WHEAT', expected_qty_kg: 1000, harvest_window_start: '2025-10-18', harvest_window_end: '2025-10-28', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 'reg-onion-01', farmer_id: 'f-bhavna-109', crop: 'ONION', expected_qty_kg: 600, harvest_window_start: '2025-10-16', harvest_window_end: '2025-10-26', status: 'ACTIVE', created_at: new Date().toISOString() },
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

  const userSessions: Row[] = []
  const mpinCredentials: Row[] = []

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

      if (q.includes('from agrilink.farmers')) {
        if (params.length && q.includes('where id = $1')) {
          return farmers.filter((f) => f.id === params[0]) as T[]
        }
        if (params.length && q.includes('any(')) {
          const idStr = String(params[0] || '').replace(/[{}]/g, '')
          const ids = idStr.split(',').map((s) => s.trim())
          return farmers.filter((f) => ids.includes(String(f.id))) as T[]
        }
        return [...farmers] as T[]
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
        } else if (q.includes('status =')) {
          existing.status = 'SOURCING'
        }
        return [existing] as T[]
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
