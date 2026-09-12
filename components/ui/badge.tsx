import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: 'live' | 'cached' | 'muted' | 'good' | 'warn'
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, tone = 'good', variant, children, ...props }: BadgeProps) {
  const toneStyles: Record<string, string> = {
    live: 'bg-primary/10 text-primary',
    cached: 'bg-accent/15 text-accent-foreground',
    muted: 'bg-secondary text-muted-foreground',
    good: 'bg-primary/10 text-primary',
    warn: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  }

  const dotColors: Record<string, string> = {
    live: 'bg-primary',
    good: 'bg-primary',
    warn: 'bg-amber-500',
    cached: 'bg-accent',
    muted: 'bg-muted-foreground',
  }

  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
        toneStyles[tone] || toneStyles.good,
        className
      )}
      {...props}
    >
      <span className={cn('size-1.5 rounded-full', dotColors[tone] || 'bg-primary')} />
      {children}
    </span>
  )
}

export { Badge }
