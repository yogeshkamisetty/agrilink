import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const cropAliases: Record<string, string> = { rice: 'Paddy', paddy: 'Paddy', wheat: 'Wheat', tomato: 'Tomato', tomatoes: 'Tomato', onion: 'Onion', onions: 'Onion', potato: 'Potato', potatoes: 'Potato' }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const crop = searchParams.get('crop')?.trim().toLowerCase()
  const grade = searchParams.get('grade')?.trim().toUpperCase()
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 })
  const query = supabaseAdmin.from('farmers').select('id,name,village,crop_name,quantity,quality_grade,harvest_date,verified').gt('quantity', 0).eq('verified', true)
  const { data, error } = await query.order('harvest_date', { ascending: true })
  if (error) return NextResponse.json({ error: 'Unable to load crop availability.' }, { status: 500 })

  const normalized = ((data ?? []) as Array<{ id: string; name: string; village: string; crop_name: string; quantity: number; quality_grade: string | null; harvest_date: string | null; verified: boolean }>).filter((row) => {
    const rowCrop = cropAliases[String(row.crop_name ?? '').toLowerCase()] ?? row.crop_name
    return (!crop || String(rowCrop).toLowerCase() === (cropAliases[crop] ?? crop)) && (!grade || String(row.quality_grade ?? '').toUpperCase() === grade)
  })
  const groups = new Map<string, { crop: string; totalQuantity: number; lots: number; farmers: number; villages: string[]; grades: Record<string, number>; harvestDates: string[]; entries: typeof normalized }>()
  for (const row of normalized) {
    const key = String(cropAliases[String(row.crop_name ?? '').toLowerCase()] ?? row.crop_name ?? 'Other')
    const group = groups.get(key) ?? { crop: key, totalQuantity: 0, lots: 0, farmers: 0, villages: [], grades: {}, harvestDates: [], entries: [] }
    group.totalQuantity += Number(row.quantity ?? 0)
    group.lots += 1
    group.farmers += 1
    if (row.village && !group.villages.includes(row.village)) group.villages.push(row.village)
    const rowGrade = String(row.quality_grade ?? 'Pending').toUpperCase()
    group.grades[rowGrade] = (group.grades[rowGrade] ?? 0) + Number(row.quantity ?? 0)
    if (row.harvest_date) group.harvestDates.push(row.harvest_date)
    group.entries.push(row)
    groups.set(key, group)
  }
  return NextResponse.json({ crops: [...groups.values()].sort((a, b) => b.totalQuantity - a.totalQuantity), updatedAt: new Date().toISOString() })
}
