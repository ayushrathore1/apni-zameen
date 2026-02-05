import { motion } from 'framer-motion'
import { ArrowRight, Check, X, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn, formatArea } from '@/lib/utils'

/**
 * Side-by-side comparison component for map vs record data.
 */
export function ComparisonPanel({
  mapData,
  recordData,
  differences = [],
  className,
}) {
  if (!mapData || !recordData) return null

  const fields = [
    { key: 'owner_name', label: 'Owner Name', type: 'text' },
    { key: 'area_sqm', label: 'Area (sq.m)', type: 'area' },
    { key: 'khata_number', label: 'Khata Number', type: 'text' },
    { key: 'plot_id', label: 'Plot ID', type: 'text' },
    { key: 'village_name', label: 'Village', type: 'text' },
  ]

  const getDifferenceStatus = (key) => {
    const diff = differences.find(d => d.field === key)
    if (!diff) return 'match'
    if (diff.severity === 'critical') return 'critical'
    if (diff.severity === 'major') return 'major'
    return 'minor'
  }

  const formatValue = (value, type) => {
    if (value === null || value === undefined) return 'N/A'
    if (type === 'area') return formatArea(value)
    return value
  }

  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="grid grid-cols-2 bg-muted">
        <div className="px-4 py-3 border-r border-border">
          <h3 className="font-semibold text-foreground">Map Data</h3>
          <p className="text-xs text-muted-foreground">From spatial records</p>
        </div>
        <div className="px-4 py-3">
          <h3 className="font-semibold text-foreground">Record Data</h3>
          <p className="text-xs text-muted-foreground">From textual records</p>
        </div>
      </div>

      {/* Fields */}
      <div className="divide-y divide-border">
        {fields.map((field) => {
          const status = getDifferenceStatus(field.key)
          const mapValue = mapData[field.key]
          const recordValue = recordData[field.key]
          const diff = differences.find(d => d.field === field.key)

          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'grid grid-cols-2',
                status === 'critical' && 'bg-destructive/5',
                status === 'major' && 'bg-warning/5',
                status === 'minor' && 'bg-warning/5',
                status === 'match' && 'bg-success/5'
              )}
            >
              {/* Map Value */}
              <div className="px-4 py-3 border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                <p className="font-medium text-foreground">
                  {formatValue(mapValue, field.type)}
                </p>
              </div>

              {/* Record Value + Status */}
              <div className="px-4 py-3 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                    <p className="font-medium text-foreground">
                      {formatValue(recordValue, field.type)}
                    </p>
                  </div>
                  
                  {/* Status Icon */}
                  <div className={cn(
                    'flex size-6 items-center justify-center rounded-full shrink-0',
                    status === 'critical' && 'bg-destructive text-destructive-foreground',
                    status === 'major' && 'bg-warning text-warning-foreground',
                    status === 'minor' && 'bg-warning-light text-warning-foreground',
                    status === 'match' && 'bg-success text-success-foreground'
                  )}>
                    {status === 'match' ? (
                      <Check className="size-3" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </div>
                </div>

                {/* Difference Details */}
                {diff && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {diff.message || `Difference: ${diff.percentage}%`}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-muted flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {differences.length === 0 ? '✓ All fields match' : `${differences.length} differences found`}
        </span>
        {differences.length > 0 && (
          <Badge variant={differences.some(d => d.severity === 'critical') ? 'destructive' : 'warning'}>
            Needs Review
          </Badge>
        )}
      </div>
    </div>
  )
}

/**
 * Confidence meter component showing match quality.
 */
export function ConfidenceMeter({
  score, // 0-100
  label = 'Match Confidence',
  className,
}) {
  const getColor = () => {
    if (score >= 90) return 'bg-success'
    if (score >= 70) return 'bg-warning'
    return 'bg-destructive'
  }

  const getLabel = () => {
    if (score >= 90) return 'High'
    if (score >= 70) return 'Medium'
    if (score >= 50) return 'Low'
    return 'Very Low'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{score}% ({getLabel()})</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', getColor())}
        />
      </div>
    </div>
  )
}

/**
 * Explanation card for why a discrepancy was detected.
 */
export function ExplanationCard({
  type,
  details,
  severity,
  className,
}) {
  const explanations = {
    area_mismatch: {
      title: 'Area Mismatch Detected',
      icon: AlertTriangle,
      description: 'The computed area from the map differs significantly from the recorded area.',
    },
    owner_mismatch: {
      title: 'Owner Name Mismatch',
      icon: AlertTriangle,
      description: 'The owner name in the map data does not match the textual records.',
    },
    boundary_overlap: {
      title: 'Boundary Overlap',
      icon: AlertTriangle,
      description: 'This parcel overlaps with adjacent parcels in the spatial data.',
    },
    missing_record: {
      title: 'Missing Record',
      icon: AlertTriangle,
      description: 'No textual record found for this parcel in the database.',
    },
    orphan_parcel: {
      title: 'Orphan Parcel',
      icon: AlertTriangle,
      description: 'This parcel exists in records but has no spatial data.',
    },
  }

  const info = explanations[type] || {
    title: 'Discrepancy Detected',
    icon: AlertTriangle,
    description: 'An issue was found that requires review.',
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      severity === 'critical' && 'bg-destructive/10 border-destructive/30',
      severity === 'major' && 'bg-warning/10 border-warning/30',
      severity === 'minor' && 'bg-warning/5 border-warning/20',
      !severity && 'bg-muted border-border',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex size-10 items-center justify-center rounded-lg',
          severity === 'critical' && 'bg-destructive text-destructive-foreground',
          severity === 'major' && 'bg-warning text-warning-foreground',
          severity === 'minor' && 'bg-warning-light text-warning-foreground',
          !severity && 'bg-muted-foreground/10 text-muted-foreground'
        )}>
          <info.icon className="size-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{info.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
          
          {details && (
            <div className="mt-3 p-3 rounded-lg bg-background/50 text-sm">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="text-foreground">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Badge variant={`severity-${severity || 'minor'}`} className="mt-3">
        {severity?.charAt(0).toUpperCase() + severity?.slice(1) || 'Info'}
      </Badge>
    </div>
  )
}
