import { describe, expect, it } from 'vitest'
import { GET, POST } from '@/app/api/farmers/verify-flow/route'

describe('SIH Farmer Registration & Verification Flow Engine', () => {
  it('handles mobile OTP dispatch and verification (Step 1)', async () => {
    // Send OTP
    const sendReq = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'otp_send', phone: '9848011221' }),
    })
    const sendRes = await POST(sendReq)
    const sendData = await sendRes.json()
    expect(sendRes.status).toBe(200)
    expect(sendData.ok).toBe(true)
    expect(sendData.demoOtp).toBe('123456')

    // Verify OTP
    const verifyReq = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'otp_verify', phone: '9848011221', otp: '123456' }),
    })
    const verifyRes = await POST(verifyReq)
    const verifyData = await verifyRes.json()
    expect(verifyRes.status).toBe(200)
    expect(verifyData.verified).toBe(true)
  })

  it('performs Case A: UIDAI + AgriStack digital verification with matching record (Step 4)', async () => {
    const req = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_digital',
        name: 'Rameshbhai Patel',
        phone: '9825144102',
        farmerType: 'Individual Farmer',
        forceCase: 'found',
      }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.case).toBe('RECORD_FOUND')
    expect(data.uidai.status).toBe('SUCCESS')
    expect(data.agriStack.status).toBe('RECORD_FOUND')
    expect(data.farmerId).toBeDefined()
  })

  it('performs Case B: UIDAI success but AgriStack record not found for tenants (Step 4)', async () => {
    const req = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_digital',
        name: 'Sita Devi',
        phone: '9848033445',
        farmerType: 'Tenant Farmer / Cultivator',
        forceCase: 'not_found',
      }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.case).toBe('RECORD_NOT_FOUND')
    expect(data.uidai.status).toBe('SUCCESS')
    expect(data.agriStack.status).toBe('RECORD_NOT_FOUND')
  })

  it('creates an assisted verification request with location-based verifier assignment (Step 5)', async () => {
    const req = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_assistance_request',
        name: 'Sita Devi',
        phone: '+91 98480 33445',
        state: 'Andhra Pradesh',
        district: 'Guntur',
        mandal: 'Kallur',
        village: 'Kallur North',
        farmerType: 'Tenant Farmer / Cultivator',
        documentType: 'Tenancy Agreement / CCRC Card',
        documentRef: 'CCRC-AP-2026-9021',
        notes: 'Leased land cultivation',
      }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.request.id).toMatch(/^VR\d+$/)
    expect(data.request.assignedVerifier.id).toBe('V002')
    expect(data.request.status).toBe('PENDING')

    // Verifier actions (Verifier Screen 2)
    const approveReq = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verifier_action',
        requestId: data.request.id,
        verifierAction: 'APPROVE',
        notes: 'Physical land check passed',
      }),
    })
    const approveRes = await POST(approveReq)
    const approveData = await approveRes.json()
    expect(approveRes.status).toBe(200)
    expect(approveData.request.status).toBe('APPROVED')
  })

  it('finalizes farmer profile and assigns FPO classification (Step 6 & 7)', async () => {
    const req = new Request('http://localhost/api/farmers/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finalize_profile',
        farmerName: 'Sita Devi',
        phone: '+91 98480 33445',
        state: 'Andhra Pradesh',
        district: 'Guntur',
        mandal: 'Kallur',
        village: 'Kallur North',
        farmerType: 'Tenant Farmer / Cultivator',
        fpoStatus: 'FPO Farmer',
        fpoName: 'Kallur Agri Farmers Producer Org (FPO)',
      }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.profile.verificationStatus).toBe('VERIFIED')
    expect(data.profile.fpoStatus).toBe('FPO Farmer')
    expect(data.profile.fpoName).toBe('Kallur Agri Farmers Producer Org (FPO)')
  })
})
