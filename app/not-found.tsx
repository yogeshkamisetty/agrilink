import { Sprout } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Sprout className="size-8" />
      </div>
      <h1 className="font-serif text-4xl font-bold text-foreground">404 — Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The requested AgriLink resource or view does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
