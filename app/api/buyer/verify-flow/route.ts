import { NextResponse } from 'next/server'
import { getDb } from '@/lib/server/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const db = await getDb()

    if (phone) {
      const rawPhone = phone.replace(/\D/g, '').slice(-10)
      const [user] = await db.query<{
        id: string
        phone: string
        full_name: string
        role: string
        verification_status: string
        metadata: any
        created_at: string
      }>(
        `select id, phone, full_name, role, verification_status, metadata, created_at
         from agrilink.user_accounts
         where role = 'buyer' and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $1
         limit 1`,
        [rawPhone],
      )

      if (!user) {
        return NextResponse.json({ ok: false, error: 'Buyer account not found.' }, { status: 404 })
      }

      const meta = typeof user.metadata === 'string' ? JSON.parse(user.metadata) : (user.metadata || {})
      return NextResponse.json({
        ok: true,
        buyer: {
          id: user.id,
          phone: user.phone,
          fullName: user.full_name,
          status: user.verification_status,
          buyerType: meta.buyerType || 'HOUSEHOLD',
          buyerTypeLabel: meta.buyerTypeLabel || 'Household',
          businessName: meta.businessName || null,
          purchaseLimitKg: meta.purchaseLimitKg || 20,
          purchaseLimitLabel: meta.purchaseLimitLabel || '1 – 20 kg per order',
          address: meta.address || '',
          city: meta.city || '',
          state: meta.state || '',
          pinCode: meta.pinCode || '',
          gstin: meta.gstin || null,
          fssai: meta.fssai || null,
          documents: meta.documents || [],
          registeredAt: meta.registeredAt || user.created_at,
        },
      })
    }

    // List all buyers for admin/coordinator verification
    const users = await db.query<{
      id: string
      phone: string
      full_name: string
      verification_status: string
      metadata: any
      created_at: string
    }>(
      `select id, phone, full_name, verification_status, metadata, created_at
       from agrilink.user_accounts
       where role = 'buyer'
       order by created_at desc
       limit 100`,
    )

    const buyers = users.map((u) => {
      const meta = typeof u.metadata === 'string' ? JSON.parse(u.metadata) : (u.metadata || {})
      return {
        id: u.id,
        phone: u.phone,
        fullName: u.full_name,
        status: u.verification_status,
        buyerType: meta.buyerType || 'HOUSEHOLD',
        buyerTypeLabel: meta.buyerTypeLabel || 'Household',
        businessName: meta.businessName || null,
        purchaseLimitKg: meta.purchaseLimitKg || 20,
        purchaseLimitLabel: meta.purchaseLimitLabel || '1 – 20 kg per order',
        address: meta.address || '',
        city: meta.city || '',
        state: meta.state || '',
        pinCode: meta.pinCode || '',
        gstin: meta.gstin || null,
        fssai: meta.fssai || null,
        documents: meta.documents || [],
        registeredAt: meta.registeredAt || u.created_at,
      }
    })

    const pending = buyers.filter((b) => b.status === 'pending_review')
    const verified = buyers.filter((b) => b.status === 'verified')
    const rejected = buyers.filter((b) => b.status === 'rejected')

    return NextResponse.json({
      ok: true,
      buyers,
      stats: {
        total: buyers.length,
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
      },
    })
  } catch (error) {
    console.error('[buyer/verify-flow] GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query buyer verification.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?:
        | 'review'
        | 'simulate_approve'
        | 'simulate_reject'
        | 'simulate_needs_correction'
        | 'simulate_under_review'
        | 'simulate_pending'
      phone?: string
      userId?: string
      decision?: 'verified' | 'rejected' | 'pending_review' | 'under_review' | 'pending' | 'needs_correction'
      reviewerNotes?: string
    }

    const rawPhone = String(body.phone || '').replace(/\D/g, '').slice(-10)
    const userId = body.userId

    if (!rawPhone && !userId) {
      return NextResponse.json({ error: 'Provide phone or userId.' }, { status: 400 })
    }

    const db = await getDb()

    // Find the user
    let userRow
    if (userId) {
      const [u] = await db.query<{ id: string; phone: string; metadata: any }>(
        `select id, phone, metadata from agrilink.user_accounts where id = $1 limit 1`,
        [userId],
      )
      userRow = u
    } else {
      const [u] = await db.query<{ id: string; phone: string; metadata: any }>(
        `select id, phone, metadata from agrilink.user_accounts where role = 'buyer' and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $1 limit 1`,
        [rawPhone],
      )
      userRow = u
    }

    if (!userRow) {
      return NextResponse.json({ error: 'Buyer account not found.' }, { status: 404 })
    }

    const newStatus =
      body.action === 'simulate_approve'
        ? 'verified'
        : body.action === 'simulate_reject'
          ? 'rejected'
          : body.action === 'simulate_needs_correction'
            ? 'needs_correction'
            : body.action === 'simulate_under_review'
              ? 'under_review'
              : body.action === 'simulate_pending'
                ? 'pending'
                : body.decision || 'verified'

    const defaultNotes: Record<string, string> = {
      verified: 'Documents verified by FPO administrative desk.',
      under_review: 'Application is currently under review by the local FPO administrative desk.',
      pending_review: 'Application is currently under review by the local FPO administrative desk.',
      pending: 'Application received and awaiting administrative review.',
      needs_correction: 'Correction required: Please re-upload a clear copy of your business proof or FSSAI registration.',
      rejected: 'Verification declined: Business registration credentials could not be validated.',
    }

    const existingMeta = typeof userRow.metadata === 'string' ? JSON.parse(userRow.metadata) : (userRow.metadata || {})
    const updatedMeta = {
      ...existingMeta,
      reviewedAt: new Date().toISOString(),
      reviewerNotes: body.reviewerNotes || defaultNotes[newStatus] || 'Status updated.',
    }

    await db.query(
      `update agrilink.user_accounts
       set verification_status = $2, metadata = $3
       where id = $1`,
      [userRow.id, newStatus, JSON.stringify(updatedMeta)],
    )

    return NextResponse.json({
      ok: true,
      status: newStatus,
      message: `Buyer status updated to ${newStatus}.`,
      notes: updatedMeta.reviewerNotes,
    })
  } catch (error) {
    console.error('[buyer/verify-flow] POST Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update verification status.' },
      { status: 500 },
    )
  }
}
