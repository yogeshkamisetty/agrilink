import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

const allowed = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['application/pdf', 'pdf']])
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v)
export async function POST(request: Request) {
  try {
    const form = await request.formData(), file = form.get('file'), userId = form.get('user_id'), userType = form.get('user_type')
    if (!(file instanceof File) || !isUuid(userId) || (userType !== 'farmer' && userType !== 'buyer')) return NextResponse.json({ error: 'A document and valid user details are required.' }, { status: 400 })
    const extension = allowed.get(file.type)
    if (!extension) return NextResponse.json({ error: 'Only JPG, PNG, and PDF files are supported.' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Document must be 5 MB or smaller.' }, { status: 400 })
    const path = `${userType}/${userId}/aadhaar-${randomUUID()}.${extension}`
    const { error } = await requireSupabaseAdmin().storage.from('identity-documents').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return NextResponse.json({ path })
  } catch (error) { console.error('[identity] upload failed', error); return NextResponse.json({ error: 'Document upload is unavailable. Ensure the private identity-documents bucket exists.' }, { status: 503 }) }
}
