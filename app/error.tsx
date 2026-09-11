'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled AgriLink runtime error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
        <AlertTriangle className="size-8" />
      </div>
      <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || 'An unexpected operational error occurred while loading this view.'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  )
}
