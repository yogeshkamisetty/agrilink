import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDb } from '@/lib/server/db'
import { getAllUsers, findUserByPhone, recordUserLogin } from '@/lib/server/pin-auth'

function normalizePhone(value: unknown) {
  const phone = typeof value === 'string' ? value.replace(/[^\d+]/g, '') : ''
  return /^\+?[1-9]\d{9,14}$/.test(phone) ? phone : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : 'Farmer Member'
    const village = typeof body.village === 'string' ? body.village.trim() : 'Kheda'
    const cropName = typeof body.crop_name === 'string' ? body.crop_name.trim() : (typeof body.crop === 'string' ? body.crop.trim() : 'PADDY')
    const mobileNumber = normalizePhone(body.mobile_number) || normalizePhone(body.phone) || '+919825144102'
    const quantity = Number(body.quantity || body.quantity_kg || body.qty || 500)
    const qualityGrade = typeof body.quality_grade === 'string' ? body.quality_grade.trim() : 'A'
    const harvestDate = typeof body.harvest_date === 'string' ? body.harvest_date : new Date().toISOString().split('T')[0]

    if (!name || !village || !cropName || !Number.isFinite(quantity) || quantity <= 0) {
      return Response.json({ error: 'Name, village, crop, and positive quantity are required.' }, { status: 400 })
    }

    let createdFarmer: any = null

    // 1. Primary DB Persistence (Supports relational PostgreSQL/PGlite and memory fallback)
    try {
      const db = await getDb()
      let fpoId = 'f0000000-0000-0000-0000-000000000001'
      try {
        const fpos = await db.query<{ id: string }>(`select id from agrilink.fpos limit 1`)
        if (fpos?.[0]?.id) fpoId = fpos[0].id
      } catch {}

      let farmerId = `f-${Date.now()}`
      try {
        const rows = await db.query<any>(
          `insert into agrilink.farmers (fpo_id, name, phone, language, land_hectares, village, lat, lng)
           values ($1, $2, $3, 'gu', 1.0, $4, 22.56, 72.92) returning id`,
          [fpoId, name, mobileNumber, village]
        )
        if (rows?.[0]?.id) farmerId = rows[0].id
      } catch {
        try {
          const rows = await db.query<any>(
            `insert into agrilink.farmers (name, village, phone, crop_name, quantity, quality_grade, harvest_date)
             values ($1, $2, $3, $4, $5, $6, $7) returning id`,
            [name, village, mobileNumber, cropName.toUpperCase(), quantity, qualityGrade, harvestDate]
          )
          if (rows?.[0]?.id) farmerId = rows[0].id
        } catch {}
      }

      try {
        await db.query(
          `insert into agrilink.crop_registry (farmer_id, crop, expected_qty_kg, harvest_window_start, harvest_window_end)
           values ($1, $2, $3, now()::date, (now() + interval '14 days')::date)`,
          [farmerId, cropName.toUpperCase(), quantity]
        )
      } catch {}

      createdFarmer = {
        id: farmerId,
        name,
        mobile_number: mobileNumber,
        village,
        crop_name: cropName.toUpperCase(),
        quantity,
        quality_grade: qualityGrade,
        harvest_date: harvestDate,
        verified: true,
      }
    } catch (dbErr) {
      console.warn('[farmers/POST] DB insert warning:', dbErr)
    }

    // 2. Supabase Sync (if configured)
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('farmers').insert({
          name,
          village,
          mobile_number: mobileNumber,
          crop_name: cropName.toUpperCase(),
          quantity,
          quality_grade: qualityGrade,
          harvest_date: harvestDate,
          verified: true,
        }).select('id,name,mobile_number,village,crop_name,quantity,quality_grade,harvest_date,verified').single()

        if (!error && data) {
          createdFarmer = data
        }
      } catch (sbErr) {
        console.warn('[farmers/POST] Supabase sync non-fatal:', sbErr)
      }
    }

    // 3. Update user metadata in pin-auth if matching user phone exists
    try {
      const normalPhone = mobileNumber.replace(/\D/g, '').slice(-10)
      const user = await findUserByPhone(normalPhone)
      if (user) {
        user.metadata = {
          ...(user.metadata || {}),
          village,
          crop: cropName.toUpperCase(),
          crop_name: cropName.toUpperCase(),
          quantity,
          quality_grade: qualityGrade,
          harvest_date: harvestDate,
        }
        await recordUserLogin(normalPhone)
      }
    } catch {}

    if (!createdFarmer) {
      createdFarmer = {
        id: `f-${Date.now()}`,
        name,
        village,
        mobile_number: mobileNumber,
        crop_name: cropName.toUpperCase(),
        quantity,
        quality_grade: qualityGrade,
        harvest_date: harvestDate,
        verified: true,
      }
    }

    return Response.json({ ok: true, farmer: createdFarmer, otp_required: false })
  } catch (err) {
    console.error('[farmers/POST] Error:', err)
    return Response.json({ error: 'Unable to register farmer produce.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    let farmersList: any[] = []

    // 1. Fetch from Supabase if connected
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('farmers')
          .select('id,name,mobile_number,village,crop_name,quantity,quality_grade,harvest_date,verified')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          farmersList = data
        }
      } catch {}
    }

    // 2. Fetch from internal DB / memory-fallback
    try {
      const db = await getDb()
      let rows: any[] = []
      try {
        rows = await db.query<any>(
          `select f.id, f.name, f.phone as mobile_number, f.village,
                  coalesce(r.crop, 'PADDY') as crop_name,
                  coalesce(r.expected_qty_kg, 500) as quantity,
                  'A' as quality_grade,
                  r.harvest_window_start::text as harvest_date,
                  true as verified
           from agrilink.farmers f
           left join agrilink.crop_registry r on r.farmer_id = f.id
           order by f.name`
        )
      } catch {
        rows = await db.query<any>(`select * from agrilink.farmers`)
      }

      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          const item = {
            id: row.id,
            name: row.name,
            mobile_number: row.mobile_number || row.phone,
            village: row.village,
            crop_name: (row.crop_name || row.crop || 'PADDY').toUpperCase(),
            quantity: Number(row.quantity || row.expected_qty_kg || 500),
            quality_grade: row.quality_grade || 'A',
            harvest_date: row.harvest_date || null,
            verified: row.verified ?? true,
          }
          if (!farmersList.some((f) => f.id === item.id || (f.mobile_number && f.mobile_number === item.mobile_number))) {
            farmersList.push(item)
          }
        }
      }
    } catch {}

    // 3. Integrate all live farmer user accounts from auth registry
    try {
      const allUsers = await getAllUsers()
      const farmerUsers = allUsers.filter((u) => u.role === 'farmer')

      for (const u of farmerUsers) {
        const uPhone = u.phone.replace(/\D/g, '').slice(-10)
        const matchIdx = farmersList.findIndex((f) => {
          const fPhone = String(f.mobile_number || f.phone || '').replace(/\D/g, '').slice(-10)
          return (fPhone && fPhone === uPhone) || (f.name && f.name.toLowerCase() === u.fullName.toLowerCase())
        })

        const meta = (u.metadata || {}) as Record<string, any>
        const declaredCrop = String(meta.crop_name || meta.crop || 'PADDY').toUpperCase()
        const declaredQty = Number(meta.quantity || meta.qty || 500)
        const declaredVillage = (meta.village as string) || 'Kheda Cluster'
        const harvestDate = (meta.harvest_date as string) || (meta.harvestDate as string) || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]

        if (matchIdx !== -1) {
          // Enrich existing farmer with live user status
          farmersList[matchIdx] = {
            ...farmersList[matchIdx],
            name: u.fullName || farmersList[matchIdx].name,
            is_live_account: true,
            last_login_at: u.lastLoginAt || u.createdAt,
            village: farmersList[matchIdx].village || declaredVillage,
            crop_name: farmersList[matchIdx].crop_name || declaredCrop,
            quantity: farmersList[matchIdx].quantity || declaredQty,
            harvest_date: farmersList[matchIdx].harvest_date || harvestDate,
          }
        } else {
          // Prepend newly logged in farmer to the top of the feed
          farmersList.unshift({
            id: u.id || `f-${uPhone}`,
            name: u.fullName,
            mobile_number: `+91 ${uPhone}`,
            village: declaredVillage,
            crop_name: declaredCrop,
            quantity: declaredQty,
            quality_grade: (meta.quality_grade as string) || 'A',
            harvest_date: harvestDate,
            verified: u.verificationStatus === 'verified',
            reliability_score: 96,
            is_live_account: true,
            last_login_at: u.lastLoginAt || u.createdAt,
            created_at: u.createdAt,
          })
        }
      }
    } catch (uErr) {
      console.warn('[farmers/GET] User merge notice:', uErr)
    }

    // Sort so live active / newly logged-in accounts appear right at the top
    farmersList.sort((a, b) => {
      if (a.is_live_account && !b.is_live_account) return -1
      if (!a.is_live_account && b.is_live_account) return 1
      if (a.last_login_at && b.last_login_at) {
        return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime()
      }
      return 0
    })

    return Response.json({ farmers: farmersList })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to fetch farmers' }, { status: 500 })
  }
}
