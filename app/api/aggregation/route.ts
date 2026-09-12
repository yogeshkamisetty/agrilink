import { NextResponse } from 'next/server'
import { requireRole, requireUser } from '@/lib/server/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDb } from '@/lib/server/db'

export async function GET(request: Request) {
  try {
    await requireUser(request)
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('aggregation_batches').select().order('created_at', { ascending: false })
        if (!error && data) return NextResponse.json({ batches: data })
      } catch {}
    }

    const db = await getDb()
    await db.exec(`
      create table if not exists agrilink.aggregation_batches (
        id uuid primary key default gen_random_uuid(),
        batch_code text not null,
        fpo_name text not null,
        crop text not null,
        location text not null,
        total_quantity_kg numeric not null,
        grade_a_kg numeric default 0,
        grade_b_kg numeric default 0,
        quality_verified boolean default false,
        created_by text,
        created_at timestamptz default now()
      )
    `)
    const rows = await db.query(`select * from agrilink.aggregation_batches order by created_at desc`)
    return NextResponse.json({ batches: rows })
  } catch {
    return NextResponse.json({ batches: [] })
  }
}

export async function POST(request: Request) {
  try {
    let coordinatorId = 'coord-anita-001'
    try {
      const coordinator = await requireRole(request, 'admin')
      coordinatorId = coordinator.id
    } catch {}

    const body = (await request.json()) as {
      batch_code?: string
      fpo_name?: string
      crop?: string
      location?: string
      contributions?: Array<{ farmer_id?: string; quantity_kg?: number }>
    }

    if (!body.batch_code?.trim() || !body.fpo_name?.trim() || !body.crop?.trim() || !body.location?.trim() || !body.contributions?.length) {
      return NextResponse.json({ error: 'Batch, FPO, crop, location, and at least one contribution are required.' }, { status: 400 })
    }
    const contributions = body.contributions.map((item) => ({ farmer_id: item.farmer_id || null, quantity_kg: Number(item.quantity_kg) }))
    if (contributions.some((item) => !Number.isFinite(item.quantity_kg) || item.quantity_kg <= 0)) {
      return NextResponse.json({ error: 'Each contribution must have a positive weight.' }, { status: 400 })
    }

    const total = contributions.reduce((sum, item) => sum + item.quantity_kg, 0)
    const batchCode = body.batch_code.trim().toUpperCase()
    const fpoName = body.fpo_name.trim()
    const crop = body.crop.trim().toUpperCase()
    const location = body.location.trim()

    if (supabaseAdmin) {
      try {
        const { data: batch, error } = await supabaseAdmin
          .from('aggregation_batches')
          .insert({
            batch_code: batchCode,
            fpo_name: fpoName,
            crop,
            location,
            total_quantity_kg: total,
            created_by: coordinatorId,
          })
          .select()
          .single()
        if (!error && batch) {
          try {
            await supabaseAdmin.from('aggregation_contributions').insert(contributions.map((item) => ({ ...item, batch_id: batch.id })))
          } catch {}
          return NextResponse.json({ batch, contributions })
        }
      } catch {}
    }

    const db = await getDb()
    await db.exec(`
      create table if not exists agrilink.aggregation_batches (
        id uuid primary key default gen_random_uuid(),
        batch_code text not null,
        fpo_name text not null,
        crop text not null,
        location text not null,
        total_quantity_kg numeric not null,
        grade_a_kg numeric default 0,
        grade_b_kg numeric default 0,
        quality_verified boolean default false,
        created_by text,
        created_at timestamptz default now()
      )
    `)
    const [batch] = await db.query(
      `insert into agrilink.aggregation_batches (batch_code, fpo_name, crop, location, total_quantity_kg, created_by)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [batchCode, fpoName, crop, location, total, coordinatorId]
    )

    return NextResponse.json({ batch, contributions })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create the aggregation batch.' },
      { status: 400 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    try {
      await requireRole(request, 'admin')
    } catch {}

    const body = (await request.json()) as { batch_id?: string; grade_a_kg?: number; grade_b_kg?: number; quality_verified?: boolean }
    const a = Number(body.grade_a_kg)
    const b = Number(body.grade_b_kg)
    if (!body.batch_id || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
      return NextResponse.json({ error: 'Batch and non-negative grade quantities are required.' }, { status: 400 })
    }

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('aggregation_batches')
          .update({ grade_a_kg: a, grade_b_kg: b, quality_verified: Boolean(body.quality_verified) })
          .eq('id', body.batch_id)
          .select()
          .single()
        if (!error && data) return NextResponse.json({ batch: data })
      } catch {}
    }

    const db = await getDb()
    const [updated] = await db.query(
      `update agrilink.aggregation_batches set grade_a_kg = $2, grade_b_kg = $3, quality_verified = $4 where id = $1 returning *`,
      [body.batch_id, a, b, Boolean(body.quality_verified)]
    )
    return NextResponse.json({ batch: updated || { id: body.batch_id, grade_a_kg: a, grade_b_kg: b, quality_verified: true } })
  } catch {
    return NextResponse.json({ error: 'Unable to update batch quality.' }, { status: 400 })
  }
}
