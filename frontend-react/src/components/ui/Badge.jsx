import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        outline: 'border border-border text-foreground bg-transparent',
        // Status badges with lighter backgrounds
        'status-open': 'bg-destructive-light text-destructive border border-destructive/30',
        'status-review': 'bg-warning-light text-warning-foreground border border-warning/30',
        'status-resolved': 'bg-success-light text-success border border-success/30',
        'status-disputed': 'bg-info-light text-info border border-info/30',
        'status-ignored': 'bg-muted text-muted-foreground border border-border',
        // Severity badges
        'severity-minor': 'bg-warning-light text-warning-foreground border border-warning/30',
        'severity-major': 'bg-warning text-warning-foreground',
        'severity-critical': 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Badge({ className, variant, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
}

export { badgeVariants }
