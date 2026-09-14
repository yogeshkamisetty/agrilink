import { describe, expect, it } from 'vitest'
import { requireRole, requireUser } from './auth'
import { createSessionToken, findUserByPhone } from './pin-auth'

const withToken = (token?: string) => new Request('http://localhost/api', { headers: token ? { authorization: `Bearer ${token}` } : {} })

describe('request authentication', () => {
  it('rejects unsigned tokens however they are worded', async () => {
    await expect(requireUser(withToken())).rejects.toThrow('AUTH_REQUIRED')
    await expect(requireUser(withToken('admin-9825000000-anita'))).rejects.toThrow('AUTH_REQUIRED')
    await expect(requireUser(withToken('agl_eyJyb2xlIjoiYWRtaW4ifQ.forged'))).rejects.toThrow('AUTH_REQUIRED')
  })

  it('enforces the role carried by a signed session', async () => {
    const farmer = (await findUserByPhone('9825144102'))!
    const { token } = createSessionToken(farmer)
    await expect(requireRole(withToken(token), 'farmer')).resolves.toMatchObject({ role: 'farmer' })
    await expect(requireRole(withToken(token), ['buyer', 'admin'])).rejects.toThrow('FORBIDDEN')
  })
})
