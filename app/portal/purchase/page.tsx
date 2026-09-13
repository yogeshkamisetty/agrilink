import { BuyerMarketplace } from '@/components/buyer-marketplace'

export default function PurchasePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <BuyerMarketplace />
      </div>
    </div>
  )
}
