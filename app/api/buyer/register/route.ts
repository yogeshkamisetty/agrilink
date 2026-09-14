import { NextResponse } from 'next/server'
import { getDb } from '@/lib/server/db'
import { primaryFpo } from '@/lib/server/repo'
import { hashPin, createSessionToken } from '@/lib/server/pin-auth'
import type { BuyerType } from '@/lib/domain/crops'

export type IncomingBuyerTier = 'HOUSEHOLD' | 'RETAILER' | 'RESTAURANT' | 'INSTITUTIONAL'

export const TIER_CONFIG: Record<
  IncomingBuyerTier,
  {
    dbType: BuyerType
    label: string
    limitKg: number
    instantVerify: boolean
    limitLabel: string
  }
> = {
  HOUSEHOLD: {
    dbType: 'CONSUMER',
    label: 'Household',
    limitKg: 20,
    instantVerify: true,
    limitLabel: '1 – 20 kg per order',
  },
  RETAILER: {
    dbType: 'FAIR_PRICE_SHOP',
    label: 'Retailer',
    limitKg: 500,
    instantVerify: false,
    limitLabel: 'Up to 500 kg per order',
  },
  RESTAURANT: {
    dbType: 'RESIDENTIAL_SOCIETY',
    label: 'Restaurant / Food Service',
    limitKg: 2000,
    instantVerify: false,
    limitLabel: '100 – 2,000 kg per order',
  },
  INSTITUTIONAL: {
    dbType: 'INSTITUTIONAL',
    label: 'Processor / Institutional',
    limitKg: 10000,
    instantVerify: false,
    limitLabel: '500 kg+ per order',
  },
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string
      phone?: string
      email?: string
      password?: string
      pin?: string
      buyerType?: IncomingBuyerTier
      address?: string
      city?: string
      state?: string
      pinCode?: string
      businessName?: string
      gstin?: string
      fssai?: string
      documents?: Array<{ type: string; name: string; size?: number; url?: string }>
      useForDelivery?: boolean
    }

    const fullName = (body.fullName || '').trim()
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 })
    }

    const rawPhone = String(body.phone || '').replace(/\D/g, '').slice(-10)
    if (!rawPhone || !/^[6-9]\d{9}$/.test(rawPhone)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 })
    }

    const email = (body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const password = (body.password || body.pin || '1234').trim()
    if (password.length < 4) {
      return NextResponse.json({ error: 'Security password or MPIN must be at least 4 characters.' }, { status: 400 })
    }

    const buyerTier: IncomingBuyerTier =
      body.buyerType && TIER_CONFIG[body.buyerType] ? body.buyerType : 'HOUSEHOLD'
    const tierInfo = TIER_CONFIG[buyerTier]

    const address = (body.address || '').trim()
    const city = (body.city || '').trim()
    const state = (body.state || '').trim()
    const pinCode = (body.pinCode || '').trim()

    if (!address || !city || !state || !pinCode) {
      return NextResponse.json({ error: 'Please fill in complete address, city, state, and PIN code.' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(pinCode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit postal PIN code.' }, { status: 400 })
    }

    const businessName = (body.businessName || '').trim()
    if (buyerTier !== 'HOUSEHOLD' && !businessName) {
      return NextResponse.json({ error: 'Please enter your shop or business name.' }, { status: 400 })
    }

    const verificationStatus = tierInfo.instantVerify ? 'verified' : 'pending_review'
    const fullAddress = `${address}, ${city}, ${state} - ${pinCode}`
    const buyerDisplayName = businessName || fullName
    const { hash, salt } = hashPin(password)

    const meta = {
      email,
      buyerType: buyerTier,
      buyerTypeLabel: tierInfo.label,
      businessName: businessName || null,
      gstin: (body.gstin || '').trim() || null,
      fssai: (body.fssai || '').trim() || null,
      address,
      city,
      state,
      pinCode,
      purchaseLimitKg: tierInfo.limitKg,
      purchaseLimitLabel: tierInfo.limitLabel,
      documents: body.documents || [],
      useForDelivery: body.useForDelivery !== false,
      registeredAt: new Date().toISOString(),
    }

    const db = await getDb()
    const fpo = await primaryFpo(db)

    // 1. Persist to agrilink.user_accounts
    const [userRow] = await db.query<{ id: string }>(
      `insert into agrilink.user_accounts (phone, full_name, role, pin_hash, salt, verification_status, onboarding_complete, metadata)
       values ($1, $2, 'buyer', $3, $4, $5, true, $6)
       on conflict (phone) do update set
         full_name = excluded.full_name,
         role = 'buyer',
         pin_hash = excluded.pin_hash,
         salt = excluded.salt,
         verification_status = excluded.verification_status,
         onboarding_complete = true,
         metadata = excluded.metadata
       returning id`,
      [rawPhone, fullName, hash, salt, verificationStatus, JSON.stringify(meta)],
    )

    const userId = userRow?.id || `usr_${rawPhone}_${Date.now()}`

    // 2. Persist to agrilink.buyers
    const [existingBuyer] = await db.query<{ id: string }>(
      `select id from agrilink.buyers where right(regexp_replace(contact_phone, '[^0-9]', '', 'g'), 10) = $1 limit 1`,
      [rawPhone],
    )

    let buyerId = existingBuyer?.id
    if (!buyerId) {
      const [insertedBuyer] = await db.query<{ id: string }>(
        `insert into agrilink.buyers (name, type, address, city, lat, lng, contact_name, contact_phone, enrolment)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          buyerDisplayName,
          tierInfo.dbType,
          fullAddress,
          city,
          fpo.lat,
          fpo.lng,
          fullName,
          `+91 ${rawPhone}`,
          tierInfo.limitKg,
        ],
      )
      buyerId = insertedBuyer?.id
    } else {
      await db.query(
        `update agrilink.buyers set
           name = $2,
           type = $3,
           address = $4,
           city = $5,
           contact_name = $6,
           enrolment = $7
         where id = $1`,
        [buyerId, buyerDisplayName, tierInfo.dbType, fullAddress, city, fullName, tierInfo.limitKg],
      )
    }

    // 3. Issue seamless session token
    const sessionToken = createSessionToken({
      id: userId,
      phone: rawPhone,
      fullName,
      role: 'buyer',
      verificationStatus,
      onboardingComplete: true,
    })

    return NextResponse.json({
      ok: true,
      status: verificationStatus,
      buyerType: buyerTier,
      buyerTypeLabel: tierInfo.label,
      purchaseLimitKg: tierInfo.limitKg,
      purchaseLimitLabel: tierInfo.limitLabel,
      message:
        verificationStatus === 'verified'
          ? 'Account verified instantly! Welcome to AgriLink.'
          : 'Your documents have been submitted for verification. We will review within 24-48 hours.',
      user: {
        id: userId,
        phone: `+91 ${rawPhone}`,
        fullName,
        role: 'buyer',
        verificationStatus,
      },
      buyer: {
        id: buyerId,
        name: buyerDisplayName,
        type: tierInfo.dbType,
        address: fullAddress,
        city,
      },
      session: {
        access_token: sessionToken.token,
        refresh_token: sessionToken.token,
        user: {
          id: userId,
          phone: `+91${rawPhone}`,
          user_metadata: { mobile: rawPhone, name: fullName, role: 'buyer', verification_status: verificationStatus },
        },
      },
      redirectUrl: '/portal',
    })
  } catch (error) {
    console.error('[buyer/register] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration service encountered an error.' },
      { status: 500 },
    )
  }
}
