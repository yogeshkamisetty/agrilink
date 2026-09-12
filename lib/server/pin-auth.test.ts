import { describe, expect, it } from 'vitest'
import {
  checkBruteForce,
  createSessionToken,
  findUserByPhone,
  hashPin,
  recordFailedAttempt,
  registerUser,
  resetFailedAttempts,
  verifyPin,
  verifySessionToken,
} from './pin-auth'

describe('Zero-API MPIN & Session Engine', () => {
  it('hashes and verifies a 4-digit MPIN using PBKDF2', () => {
    const { hash, salt } = hashPin('1234')
    expect(hash).toHaveLength(64) // 32 bytes hex
    expect(salt).toBeDefined()
    expect(verifyPin('1234', hash, salt)).toBe(true)
    expect(verifyPin('0000', hash, salt)).toBe(false)
  })

  it('loads pre-seeded demo accounts (Farmer Ramesh, Buyer Meera, Admin Anita)', async () => {
    const farmer = await findUserByPhone('9825144102')
    expect(farmer).toBeDefined()
    expect(farmer?.fullName).toBe('Ramesh Kumar')
    expect(farmer?.role).toBe('farmer')
    expect(verifyPin('1234', farmer!.pinHash, farmer!.salt)).toBe(true)

    const buyer = await findUserByPhone('9825277103')
    expect(buyer).toBeDefined()
    expect(buyer?.fullName).toBe('Meera Patel')
    expect(buyer?.role).toBe('buyer')

    const admin = await findUserByPhone('9825000000')
    expect(admin).toBeDefined()
    expect(admin?.fullName).toBe('Anita Sharma')
    expect(admin?.role).toBe('admin')
  })

  it('registers a new user and authenticates their MPIN', async () => {
    const testPhone = '9777888999'
    const newUser = await registerUser({
      phone: testPhone,
      fullName: 'Kavita Rao',
      role: 'buyer',
      pin: '5678',
    })

    expect(newUser.fullName).toBe('Kavita Rao')
    expect(newUser.role).toBe('buyer')
    expect(verifyPin('5678', newUser.pinHash, newUser.salt)).toBe(true)
    expect(verifyPin('1234', newUser.pinHash, newUser.salt)).toBe(false)

    const fetched = await findUserByPhone(testPhone)
    expect(fetched?.fullName).toBe('Kavita Rao')
  })

  it('generates and verifies tamper-evident HMAC session tokens', async () => {
    const farmer = (await findUserByPhone('9825144102'))!
    const { token } = createSessionToken(farmer)

    expect(token.startsWith('agl_')).toBe(true)

    const payload = verifySessionToken(token)
    expect(payload).toBeDefined()
    expect(payload?.phone).toBe('9825144102')
    expect(payload?.role).toBe('farmer')
    expect(payload?.name).toBe('Ramesh Kumar')

    // Tampered token should fail verification
    const tampered = token.slice(0, -4) + 'abcd'
    expect(verifySessionToken(tampered)).toBeNull()
  })

  it('enforces brute force protection after 5 consecutive failed attempts', () => {
    const testPhone = '9998887776'
    resetFailedAttempts(testPhone)

    expect(checkBruteForce(testPhone).allowed).toBe(true)

    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(testPhone)
      expect(checkBruteForce(testPhone).allowed).toBe(true)
    }

    // 5th attempt triggers lockout
    recordFailedAttempt(testPhone)
    const check = checkBruteForce(testPhone)
    expect(check.allowed).toBe(false)
    expect(check.waitSeconds).toBeGreaterThan(0)

    resetFailedAttempts(testPhone)
    expect(checkBruteForce(testPhone).allowed).toBe(true)
  })

  it('records user login timestamps and retrieves users via getAllUsers', async () => {
    const { getAllUsers, recordUserLogin } = await import('./pin-auth')
    const phone = '9825144102'
    await recordUserLogin(phone)

    const all = await getAllUsers()
    expect(all.length).toBeGreaterThanOrEqual(3)

    const farmer = all.find((u) => u.phone === phone)
    expect(farmer).toBeDefined()
    expect(farmer?.lastLoginAt).toBeDefined()
  })

  it('updates user profile via updateUserProfile', async () => {
    const { registerUser, updateUserProfile, findUserByPhone } = await import('./pin-auth')
    const testPhone = '9876543210'
    await registerUser({
      phone: testPhone,
      fullName: 'Vikram Singh',
      role: 'farmer',
      pin: '1234',
    })

    const updated = await updateUserProfile({
      phone: testPhone,
      fullName: 'Vikram Singh Patel',
      village: 'Petlad',
      district: 'Anand',
      state: 'Gujarat',
    })

    expect(updated).toBeDefined()
    expect(updated?.fullName).toBe('Vikram Singh Patel')
    expect(updated?.metadata?.village).toBe('Petlad')

    const reFetched = await findUserByPhone(testPhone)
    expect(reFetched?.fullName).toBe('Vikram Singh Patel')
    expect(reFetched?.metadata?.village).toBe('Petlad')
  })
})

