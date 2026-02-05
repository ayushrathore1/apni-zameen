import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with tailwind-merge for deduplication
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Focus ring utility classes
 */
export const focusRing = cn(
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-ring focus-visible:ring-offset-2'
)

/**
 * Disabled state utility classes
 */
export const disabled = 'disabled:pointer-events-none disabled:opacity-50'

/**
 * Format area in square meters to readable format
 */
export function formatArea(areaSqm) {
  if (!areaSqm) return 'N/A'
  if (areaSqm >= 10000) {
    return `${(areaSqm / 10000).toFixed(2)} हेक्टेयर`
  }
  return `${areaSqm.toFixed(2)} वर्ग मीटर`
}

/**
 * Format date to locale string
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('hi-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity) {
  const colors = {
    minor: 'bg-warning-light text-warning-foreground border-warning',
    major: 'bg-warning text-warning-foreground',
    critical: 'bg-destructive text-destructive-foreground',
  }
  return colors[severity] || colors.minor
}

/**
 * Get status color classes
 */
export function getStatusColor(status) {
  const colors = {
    open: 'bg-destructive-light text-destructive border-destructive',
    under_review: 'bg-warning-light text-warning-foreground border-warning',
    resolved: 'bg-success-light text-success border-success',
    disputed: 'bg-info-light text-info border-info',
    ignored: 'bg-muted text-muted-foreground border-border',
  }
  return colors[status] || colors.open
}

/**
 * Get parcel status label
 */
export function getStatusLabel(status, lang = 'en') {
  const labels = {
    en: {
      matched: 'Matched',
      needs_review: 'Needs Review',
      critical: 'Critical',
    },
    hi: {
      matched: 'मेल खाता है',
      needs_review: 'समीक्षा आवश्यक',
      critical: 'गंभीर',
    },
  }
  return labels[lang]?.[status] || status
}
