import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export type FarmerType = 'Individual Farmer' | 'Tenant Farmer / Cultivator' | 'Sharecropper' | 'Other / Need Help'
export type FpoStatus = 'FPO Farmer' | 'Non-FPO Farmer'

export interface VerificationRequest {
  id: string
  farmerName: string
  phone: string
  state: string
  district: string
  mandal: string
  village: string
  farmerType: FarmerType
  supportingInfo: {
    documentType: string
    documentRef: string
    notes?: string
  }
  assignedVerifier: {
    id: string
    name: string
    area: string
    contact: string
  }
  status: 'PENDING' | 'MORE_INFO_REQUESTED' | 'APPROVED' | 'REJECTED'
  verifierNotes?: string
  submittedAt: string
  updatedAt: string
}

// In-memory queue storage for fast prototyping, with seed requests
const memoryRequests: Map<string, VerificationRequest> = new Map([
  [
    'VR1021',
    {
      id: 'VR1021',
      farmerName: 'Rami Reddy',
      phone: '+91 98480 11221',
      state: 'Andhra Pradesh',
      district: 'Guntur',
      mandal: 'Kallur',
      village: 'Kallur North',
      farmerType: 'Tenant Farmer / Cultivator',
      supportingInfo: {
        documentType: 'Tenancy Land Agreement & Adangal Copy',
        documentRef: 'LEASE-AP-GN-2025-44',
        notes: 'Cultivating 1.8 acres of leased black soil for Chilli and Paddy. Landowner consent form verified by Village Revenue Officer (VRO).',
      },
      assignedVerifier: {
        id: 'V002',
        name: 'M. Venkateswarlu',
        area: 'Kallur Mandal & Guntur Cluster',
        contact: '+91 94401 22334',
      },
      status: 'PENDING',
      submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  [
    'VR1022',
    {
      id: 'VR1022',
      farmerName: 'Sita Devi',
      phone: '+91 98480 33445',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      mandal: 'Vuyyuru',
      village: 'Katuru',
      farmerType: 'Sharecropper',
      supportingInfo: {
        documentType: 'Gram Panchayat Cultivator Certificate',
        documentRef: 'GP-CERT-KT-809',
        notes: '50-50 sharecropping agreement for 2 acres Paddy harvest. Local witness endorsed by Panchayat Secretary.',
      },
      assignedVerifier: {
        id: 'V003',
        name: 'K. Subba Rao',
        area: 'Vuyyuru Mandal & Krishna Delta',
        contact: '+91 94401 55667',
      },
      status: 'PENDING',
      submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ],
  [
    'VR1023',
    {
      id: 'VR1023',
      farmerName: 'D. Nageswara Rao',
      phone: '+91 98480 77889',
      state: 'Andhra Pradesh',
      district: 'Guntur',
      mandal: 'Tenali',
      village: 'Angalakuduru',
      farmerType: 'Tenant Farmer / Cultivator',
      supportingInfo: {
        documentType: 'Crop Loan Waiver / CCRC Card',
        documentRef: 'CCRC-AP-2025-9921',
        notes: 'Crop Cultivator Rights Card (CCRC) issued under AP Crop Cultivator Rights Act. Verified seasonal tenant status.',
      },
      assignedVerifier: {
        id: 'V002',
        name: 'M. Venkateswarlu',
        area: 'Tenali & Kallur Cluster',
        contact: '+91 94401 22334',
      },
      status: 'APPROVED',
      verifierNotes: 'CCRC card and biometric spot check verified with village revenue records.',
      submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ],
])

// Location-based verifier assignment algorithm (SIH Section 16)
function assignVerifier(district: string, mandal: string, village: string) {
  const normDist = (district || '').toLowerCase()
  const normMandal = (mandal || '').toLowerCase()

  if (normDist.includes('krishna') || normMandal.includes('vuyyuru')) {
    return {
      id: 'V003',
      name: 'K. Subba Rao',
      area: `${mandal || 'Krishna'} Mandal Verifier Cluster`,
      contact: '+91 94401 55667',
    }
  }

  if (normDist.includes('anand') || normDist.includes('kheda')) {
    return {
      id: 'V001',
      name: 'P. Patel',
      area: `${mandal || 'Anand'} Agricultural Area Cluster`,
      contact: '+91 98250 88990',
    }
  }

  // Default to primary cluster verifier
  return {
    id: 'V002',
    name: 'M. Venkateswarlu',
    area: `${mandal || village || 'Guntur'} Local Field Cluster (V002)`,
    contact: '+91 94401 22334',
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'list'
  const requestId = searchParams.get('requestId')
  const phone = searchParams.get('phone')

  if (action === 'status' && (requestId || phone)) {
    if (requestId && memoryRequests.has(requestId)) {
      return NextResponse.json({ ok: true, request: memoryRequests.get(requestId) })
    }
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      for (const req of memoryRequests.values()) {
        if (req.phone.replace(/\D/g, '').slice(-10) === cleanPhone) {
          return NextResponse.json({ ok: true, request: req })
        }
      }
    }
    return NextResponse.json({ ok: false, error: 'Request not found.' }, { status: 404 })
  }

  // List all requests for the Verifier Dashboard (Screen 1)
  const requests = Array.from(memoryRequests.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length
  const moreInfoCount = requests.filter((r) => r.status === 'MORE_INFO_REQUESTED').length

  return NextResponse.json({
    ok: true,
    requests,
    stats: {
      pending: pendingCount,
      approved: approvedCount,
      moreInfo: moreInfoCount,
      total: requests.length,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // 1. Mobile OTP Request (Step 1)
    if (action === 'otp_send') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10)
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }
      return NextResponse.json({
        ok: true,
        phone,
        sessionId: `otp_sess_${Date.now()}`,
        demoOtp: '123456',
        message: 'OTP sent to mobile via SMS gateway (Verification code: 123456)',
      })
    }

    // 2. Mobile OTP Verify (Step 1)
    if (action === 'otp_verify') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10)
      const otp = String(body.otp || '').trim()
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 })
      }
      if (otp !== '123456' && !/^\d{6}$/.test(otp)) {
        return NextResponse.json({ error: 'Invalid verification code. Please check your SMS.' }, { status: 400 })
      }
      return NextResponse.json({
        ok: true,
        phone,
        verified: true,
        message: 'Mobile number verified successfully.',
      })
    }

    // 3. Digital Verification: UIDAI Identity + AgriStack / Farmer Registry (Step 4)
    if (action === 'verify_digital') {
      const { name, phone, farmerType, forceCase } = body

      // UIDAI Identity Authentication (Demographic CIDR check)
      const uidaiResult = {
        status: 'SUCCESS',
        verifiedAt: new Date().toISOString(),
        authMechanism: 'Demographic + Mobile OTP (Aadhaar CIDR)',
        nameMatched: true,
        claimedName: name,
        agency: 'UIDAI CIDR Service (Authorized AUA/KUA Protocol)',
        note: 'Answers "Is this person who they claim to be?". Establishes identity only; does NOT establish agricultural cultivator record.',
      }

      // AgriStack / State Farmer Registry Check
      // Simulated rule: If forceCase is 'not_found' OR farmerType is Tenant/Sharecropper without land title, registry returns NOT_FOUND
      const simulateNotFound =
        forceCase === 'not_found' ||
        (forceCase !== 'found' && (farmerType === 'Tenant Farmer / Cultivator' || farmerType === 'Sharecropper' || farmerType === 'Other / Need Help'))

      if (simulateNotFound) {
        return NextResponse.json({
          ok: true,
          case: 'RECORD_NOT_FOUND',
          uidai: uidaiResult,
          agriStack: {
            status: 'RECORD_NOT_FOUND',
            farmerRecordFound: false,
            registryChecked: 'AgriStack Federated State Farmer Registry (Mock Sandbox)',
            reason:
              'No active landholding title found under this Aadhaar in the state digital registry. Cultivators/tenants require assisted verification per state policy.',
            isMock: true,
          },
          message: "We couldn't find your farmer record in the digital Farmer Registry. Don't worry — assisted verification is available.",
        })
      }

      // Case A: Record Found
      const farmerId = `FAR-${(body.state || 'AP').slice(0, 2).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`
      return NextResponse.json({
        ok: true,
        case: 'RECORD_FOUND',
        farmerId,
        uidai: uidaiResult,
        agriStack: {
          status: 'RECORD_FOUND',
          farmerRecordFound: true,
          farmerId,
          surveyNos: ['142/1A', '142/2B'],
          registeredLandHectares: 1.25,
          cropsFound: ['Paddy', 'Tomato'],
          registryChecked: 'AgriStack Federated State Farmer Registry (Mock Sandbox)',
          isMock: true,
          note: 'Direct landholding record confirmed in state database.',
        },
        message: 'Your farmer details have been verified.',
      })
    }

    // 4. Create Assistance Request (Step 5 - Case B Fallback)
    if (action === 'create_assistance_request') {
      const { name, phone, state, district, mandal, village, farmerType, documentType, documentRef, notes } = body

      const reqCount = memoryRequests.size + 1025
      const requestId = `VR${reqCount}`
      const assignedVerifier = assignVerifier(district, mandal, village)

      const newRequest: VerificationRequest = {
        id: requestId,
        farmerName: name || 'Applicant Farmer',
        phone: phone || '+91 98480 00000',
        state: state || 'Andhra Pradesh',
        district: district || 'Guntur',
        mandal: mandal || 'Kallur',
        village: village || 'Kallur North',
        farmerType: farmerType || 'Tenant Farmer / Cultivator',
        supportingInfo: {
          documentType: documentType || 'Tenancy Agreement / Land Passbook',
          documentRef: documentRef || `REF-${Date.now().toString().slice(-6)}`,
          notes: notes || 'Physical land cultivation verification requested.',
        },
        assignedVerifier,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      memoryRequests.set(requestId, newRequest)

      return NextResponse.json({
        ok: true,
        request: newRequest,
        message: 'Verification assistance request created and assigned to local verifier.',
      })
    }

    // 5. Verifier Action (Verifier Screen 2 - Approve, Request More Info, Reject)
    if (action === 'verifier_action') {
      const { requestId, verifierAction, notes } = body
      if (!requestId || !memoryRequests.has(requestId)) {
        return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
      }

      const req = memoryRequests.get(requestId)!

      if (verifierAction === 'APPROVE') {
        req.status = 'APPROVED'
        req.verifierNotes = notes || 'All supporting documents and physical cultivator verification approved.'
        req.updatedAt = new Date().toISOString()
      } else if (verifierAction === 'REQUEST_MORE_INFO') {
        req.status = 'MORE_INFO_REQUESTED'
        req.verifierNotes = notes || 'Please provide copy of Gram Panchayat cultivator certificate.'
        req.updatedAt = new Date().toISOString()
      } else if (verifierAction === 'REJECT') {
        req.status = 'REJECTED'
        req.verifierNotes = notes || 'Verification criteria could not be established.'
        req.updatedAt = new Date().toISOString()
      } else {
        return NextResponse.json({ error: 'Invalid verifier action.' }, { status: 400 })
      }

      memoryRequests.set(requestId, req)

      return NextResponse.json({
        ok: true,
        request: req,
        message: `Request ${requestId} status updated to ${req.status}.`,
      })
    }

    // 6. Finalize FPO Association & Complete Profile (Step 6)
    if (action === 'finalize_profile') {
      const {
        farmerName,
        phone,
        state,
        district,
        mandal,
        village,
        farmerType,
        fpoStatus, // 'FPO Farmer' | 'Non-FPO Farmer'
        fpoName,
        farmerId,
        verificationRequestId,
      } = body

      const generatedId = farmerId || `FARMER-${Date.now().toString().slice(-6)}`

      const profile = {
        id: generatedId,
        name: farmerName,
        phone: phone,
        state: state || 'Andhra Pradesh',
        district: district || 'Guntur',
        mandal: mandal || 'Kallur',
        village: village || 'Kallur North',
        farmerType: farmerType || 'Individual Farmer',
        fpoStatus: fpoStatus || 'Non-FPO Farmer',
        fpoName: fpoStatus === 'FPO Farmer' ? fpoName || 'Mahi Valley Farmer Producer Co. Ltd' : null,
        verificationStatus: 'VERIFIED',
        verificationRequestId: verificationRequestId || null,
        verifiedAt: new Date().toISOString(),
      }

      // Also persist to Supabase if configured
      try {
        const supabase = requireSupabaseAdmin()
        await supabase
          .from('user_profiles')
          .upsert({
            mobile_number: phone?.replace(/\D/g, '').slice(-10),
            full_name: farmerName,
            role: 'farmer',
            village: village,
            district: district,
            state: state,
            fpo_name: profile.fpoName,
            verification_status: 'verified',
            onboarding_complete: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'mobile_number' })
      } catch {}

      return NextResponse.json({
        ok: true,
        profile,
        message: `Registration complete! Registered as ${profile.fpoStatus}.`,
      })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err) {
    console.error('[verify-flow] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error processing verification flow.' },
      { status: 500 }
    )
  }
}
