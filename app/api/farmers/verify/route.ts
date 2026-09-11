import { NextResponse } from 'next/server'

/** Legacy endpoint intentionally disabled: verification uses the expiring, hashed OTP flow in /api/identity. */
export async function POST() {
  return NextResponse.json({ error: 'Use /api/identity for mobile verification.' }, { status: 410 })
}
