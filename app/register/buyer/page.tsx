import type { Metadata } from 'next'
import { BuyerRegistrationWizard } from '@/components/buyer-registration-wizard'

export const metadata: Metadata = {
  title: 'Buyer Registration · AgriLink Direct Farm Network',
  description:
    'Register as a household consumer, retail grocer, restaurant, or institutional food processor. Direct farm-gate sourcing with tiered verification and transparent pricing.',
}

export default function BuyerRegisterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-white py-8">
      <BuyerRegistrationWizard />
    </main>
  )
}
