import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * AreaDiscrepancyIndicator - Visual component for showing area discrepancy status
 * Displays severity level, percentage difference, and direction (over/under recorded)
 */
export function AreaDiscrepancyIndicator({ discrepancy, compact = false, showIcon = true }) {
  if (!discrepancy) return null
  
  const { severity, hasDiscrepancy, absolutePercentage, difference, isUnderRecorded, isOverRecorded } = discrepancy
  
  // Color and styling based on severity
  const styleConfig = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      icon: AlertTriangle,
    },
    major: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
      icon: AlertTriangle,
    },
    minor: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-300',
      badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      icon: Info,
    },
    none: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      icon: CheckCircle2,
    },
  }
  
  const config = styleConfig[severity] || styleConfig.none
  const IconComponent = config.icon
  
  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold border',
        config.bg,
        config.border,
        config.text
      )}>
        {showIcon && <IconComponent className="size-3.5" />}
        <span>
          {severity === 'none' ? 'Matched' : severity === 'critical' ? 'Critical' : severity === 'major' ? 'Major' : 'Minor'} • {absolutePercentage.toFixed(1)}%
        </span>
      </div>
    )
  }
  
  return (
    <div className={cn(
      'rounded-lg border p-3',
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <IconComponent className={cn('size-5 flex-shrink-0 mt-0.5', config.text)} />
        )}
        
        <div className="flex-1">
          {/* Header with severity level */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('font-semibold text-sm', config.text)}>
              {severity === 'none' ? 'Area Matched' : 
               severity === 'critical' ? 'Critical Discrepancy' : 
               severity === 'major' ? 'Major Variance' : 
               'Minor Variance'}
            </h4>
            {(isUnderRecorded || isOverRecorded) && (
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                config.badge
              )}>
                {isUnderRecorded && <TrendingDown className="size-3" />}
                {isOverRecorded && <TrendingUp className="size-3" />}
                {isUnderRecorded ? 'Under-Recorded' : 'Over-Recorded'}
              </span>
            )}
          </div>
          
          {/* Percentage and absolute difference */}
          <div className={cn('text-sm mb-2', config.text)}>
            <p>
              <strong>{absolutePercentage.toFixed(2)}%</strong> difference
            </p>
            <p className="text-xs opacity-90">
              {Math.abs(difference).toFixed(0)} m² variance
            </p>
          </div>
          
          {/* Progress bar showing percentage */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                severity === 'critical' ? 'bg-red-500' : 
                severity === 'major' ? 'bg-amber-500' : 
                severity === 'minor' ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{
                width: `${Math.min(absolutePercentage, 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AreaStatsRow - Compact display of computed vs recorded area
 */
export function AreaStatsRow({ computedArea, recordedArea }) {
  const isDifferent = computedArea && recordedArea && Math.abs(computedArea - recordedArea) > 0.1
  
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">Computed</p>
        <p className="font-semibold text-sm">{computedArea?.toFixed(0) || 'N/A'} m²</p>
      </div>
      
      {isDifferent && (
        <div className="flex items-center justify-center">
          <div className="h-px w-6 bg-gray-300 dark:bg-gray-700" />
          <span className="text-xs font-semibold text-muted-foreground px-2">vs</span>
          <div className="h-px w-6 bg-gray-300 dark:bg-gray-700" />
        </div>
      )}
      
      <div className="flex-1 text-right">
        <p className="text-xs text-muted-foreground mb-1">Recorded</p>
        <p className="font-semibold text-sm">{recordedArea?.toFixed(0) || 'N/A'} m²</p>
      </div>
    </div>
  )
}

/**
 * SeverityBadge - Small badge showing severity level
 */
export function SeverityBadge({ severity, showLabel = true }) {
  const config = {
    critical: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
      label: 'Critical',
    },
    major: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      label: 'Major',
    },
    minor: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-700 dark:text-yellow-300',
      dot: 'bg-yellow-500',
      label: 'Minor',
    },
    none: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500',
      label: 'Matched',
    },
  }
  
  const severityConfig = config[severity] || config.none
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
      severityConfig.bg,
      severityConfig.text
    )}>
      <span className={cn('w-2 h-2 rounded-full', severityConfig.dot)} />
      {showLabel && severityConfig.label}
    </span>
  )
}
