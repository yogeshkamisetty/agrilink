'use client'

import { useState } from 'react'
import { FarmerRegistration } from '@/components/farmer-registration'
import { IdentityVerification } from '@/components/identity-verification'

type Farmer = { id: string; name: string; village: string; mobile_number: string; crop_name: string; quantity: number; verified: boolean }
export function FarmerOnboarding() {
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  return <div className='space-y-8'><FarmerRegistration onRegistered={setFarmer} />{farmer && <IdentityVerification subjectType='farmer' subjectId={farmer.id} />}</div>
}
