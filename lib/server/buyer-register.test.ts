import { describe, expect, it } from 'vitest'
import { POST as registerBuyer } from '@/app/api/buyer/register/route'
import { GET as getBuyerVerify, POST as postBuyerVerify } from '@/app/api/buyer/verify-flow/route'

describe('Buyer Registration & Tiered Verification Flow Engine', () => {
  it('validates required fields on buyer registration', async () => {
    // Missing full name
    const req1 = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: '' }),
    })
    const res1 = await registerBuyer(req1)
    expect(res1.status).toBe(400)
    const data1 = await res1.json()
    expect(data1.error).toContain('full name')

    // Invalid phone
    const req2 = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Priya Sundaram', phone: '12345' }),
    })
    const res2 = await registerBuyer(req2)
    expect(res2.status).toBe(400)
    const data2 = await res2.json()
    expect(data2.error).toContain('mobile number')

    // Missing business name for Retailer
    const req3 = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mahesh Gupta',
        phone: '9825144102',
        email: 'mahesh@example.com',
        buyerType: 'RETAILER',
        address: 'Shop 14, Main Road',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pinCode: '522001',
      }),
    })
    const res3 = await registerBuyer(req3)
    expect(res3.status).toBe(400)
    const data3 = await res3.json()
    expect(data3.error).toContain('shop or business name')
  })

  it('registers Household buyer with instant activation (1-20 kg limit)', async () => {
    const req = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Priya Sundaram',
        phone: '9825277103',
        email: 'priya.buyer@example.com',
        password: '1234',
        buyerType: 'HOUSEHOLD',
        address: 'Flat 402, Green Meadows Enclave, Brodipet',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pinCode: '522002',
      }),
    })

    const res = await registerBuyer(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.status).toBe('verified')
    expect(data.buyerType).toBe('HOUSEHOLD')
    expect(data.purchaseLimitKg).toBe(20)
    expect(data.purchaseLimitLabel).toContain('20 kg')
    expect(data.user.role).toBe('buyer')
    expect(data.session.access_token).toBeDefined()
  })

  it('registers Retailer with pending review and up to 500 kg limit', async () => {
    const req = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mahesh Gupta',
        phone: '9825144102',
        email: 'guptafresh@example.com',
        password: '1234',
        buyerType: 'RETAILER',
        businessName: 'Gupta Fresh Produce',
        gstin: '37AAAAA0000A1Z5',
        address: 'Stall 14, Guntur Mandi Yard',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pinCode: '522001',
        documents: [
          { type: 'Shop & Establishment License', name: 'gupta_shop_license.pdf', size: 1200000 },
        ],
      }),
    })

    const res = await registerBuyer(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.status).toBe('pending_review')
    expect(data.buyerType).toBe('RETAILER')
    expect(data.purchaseLimitKg).toBe(500)
    expect(data.purchaseLimitLabel).toContain('500 kg')
  })

  it('registers Restaurant / Food Service with pending review and up to 2,000 kg limit', async () => {
    const req = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Chef Arvind Rao',
        phone: '9848033445',
        email: 'orders@annapurnakitchen.in',
        password: '1234',
        buyerType: 'RESTAURANT',
        businessName: 'Annapurna Cloud Kitchens',
        fssai: '10126001000984',
        address: 'Plot 88, Auto Nagar',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        pinCode: '520007',
        documents: [
          { type: 'FSSAI License', name: 'annapurna_fssai.pdf', size: 2100000 },
        ],
      }),
    })

    const res = await registerBuyer(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.status).toBe('pending_review')
    expect(data.buyerType).toBe('RESTAURANT')
    expect(data.purchaseLimitKg).toBe(2000)
  })

  it('allows coordinator / admin to query and approve pending buyer verification', async () => {
    // 1. Query status by phone
    const statusReq = new Request('http://localhost/api/buyer/verify-flow?phone=9825144102', {
      method: 'GET',
    })
    const statusRes = await getBuyerVerify(statusReq)
    const statusData = await statusRes.json()

    expect(statusRes.status).toBe(200)
    expect(statusData.ok).toBe(true)
    expect(statusData.buyer.phone).toContain('9825144102')

    // 2. Approve buyer verification
    const approveReq = new Request('http://localhost/api/buyer/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulate_approve',
        phone: '9825144102',
        reviewerNotes: 'Verified trade license in district registry.',
      }),
    })
    const approveRes = await postBuyerVerify(approveReq)
    const approveData = await approveRes.json()

    expect(approveRes.status).toBe(200)
    expect(approveData.ok).toBe(true)
    expect(approveData.status).toBe('verified')
  })

  it('registers Processor / Institution with 500 kg+ guidance, organization type, and authorized person', async () => {
    const req = new Request('http://localhost/api/buyer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Suresh Varma',
        phone: '9848077889',
        email: 'procurement@mahigrains.com',
        password: '1234',
        buyerType: 'INSTITUTIONAL',
        businessName: 'Mahi Agro Processing Industries Ltd.',
        organizationType: 'Food Processing Unit',
        authorizedPerson: 'Suresh Varma (Head of Procurement)',
        pan: 'AACCM1234P',
        gstin: '24CCCC1234C1Z9',
        fssai: '10025002000512',
        address: 'Survey 42, Food Park, Anand',
        city: 'Anand',
        state: 'Gujarat',
        pinCode: '388001',
        documents: [
          { type: 'Organization Registration Proof', name: 'inc_cert.pdf', size: 3100000 },
        ],
      }),
    })

    const res = await registerBuyer(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.buyerType).toBe('INSTITUTIONAL')
    expect(data.purchaseLimitKg).toBe(10000)
    expect(data.procurementGuidance).toBe('500 kg+')
    expect(data.authorizedPerson).toBe('Suresh Varma (Head of Procurement)')
  })

  it('handles all 5 verification states: pending, under_review, verified, needs_correction, rejected', async () => {
    // 1. Simulate needs_correction
    const correctionReq = new Request('http://localhost/api/buyer/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulate_needs_correction',
        phone: '9848077889',
        reviewerNotes: 'Please re-upload a readable copy of your FSSAI certificate.',
      }),
    })
    const correctionRes = await postBuyerVerify(correctionReq)
    const correctionData = await correctionRes.json()
    expect(correctionRes.status).toBe(200)
    expect(correctionData.status).toBe('needs_correction')
    expect(correctionData.notes).toContain('readable copy')

    // 2. Simulate under_review
    const reviewReq = new Request('http://localhost/api/buyer/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulate_under_review',
        phone: '9848077889',
      }),
    })
    const reviewRes = await postBuyerVerify(reviewReq)
    const reviewData = await reviewRes.json()
    expect(reviewRes.status).toBe(200)
    expect(reviewData.status).toBe('under_review')

    // 3. Simulate rejected
    const rejectReq = new Request('http://localhost/api/buyer/verify-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulate_reject',
        phone: '9848077889',
      }),
    })
    const rejectRes = await postBuyerVerify(rejectReq)
    const rejectData = await rejectRes.json()
    expect(rejectRes.status).toBe(200)
    expect(rejectData.status).toBe('rejected')
  })
})
