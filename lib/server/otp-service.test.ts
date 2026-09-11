import { describe, expect, it } from 'vitest'
import { sendOtp, verifyOtp } from './otp-service'

describe('mobile OTP fallback', () => {
  it('rejects malformed Indian mobile numbers', async () => {
    await expect(sendOtp('12345')).rejects.toThrow('valid 10-digit')
  })

  it('creates and verifies the deterministic demo challenge without external SMS', async () => {
    const challenge = await sendOtp('9876543210')
    expect(challenge).toMatchObject({ ok: true, isDemo: true, demoOtp: '123456' })
    await expect(verifyOtp('9876543210', '123456', challenge.sessionId)).resolves.toEqual({ ok: true })
  })

  it('refuses an incorrect OTP', async () => {
    const challenge = await sendOtp('9999999999')
    await expect(verifyOtp('9999999999', '000000', challenge.sessionId)).resolves.toMatchObject({ ok: false })
  })
})
