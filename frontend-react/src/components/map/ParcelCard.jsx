import { motion } from 'framer-motion'
import { MapPin, User, Ruler, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn, formatArea } from '@/lib/utils'

export function ParcelCard({ parcel, expanded = false, onViewOnMap }) {
  if (!parcel) return null

  const props = parcel.properties || parcel
  const {
    plot_id,
    village_name,
    village_code,
    owner_name_hindi,
    owner_name_english,
    computed_area_sqm,
    recorded_area_sqm,
    discrepancy_status,
    severity,
    khata_number,
  } = props

  // Calculate area difference
  const areaDiff = computed_area_sqm && recorded_area_sqm
    ? ((computed_area_sqm - recorded_area_sqm) / recorded_area_sqm * 100).toFixed(1)
    : null

  // Determine status
  const hasDiscrepancy = severity && severity !== 'none'
  const isMatched = !hasDiscrepancy

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-xl border border-border',
        expanded ? 'p-0' : 'p-4 hover:shadow-md transition-shadow cursor-pointer'
      )}
    >
      {/* Header */}
      <div className={cn('flex items-start justify-between', expanded && 'pb-4')}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{plot_id}</h3>
            <p className="text-sm text-muted-foreground">
              {village_name || village_code}
            </p>
          </div>
        </div>
        <Badge variant={isMatched ? 'success' : `severity-${severity}`}>
          {isMatched ? 'Matched' : severity?.charAt(0).toUpperCase() + severity?.slice(1)}
        </Badge>
      </div>

      {/* Details - shown when expanded */}
      {expanded && (
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Owner Info */}
          <div className="flex items-start gap-3">
            <User className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Owner</p>
              <p className="font-medium text-foreground">
                {owner_name_hindi || owner_name_english || 'Not specified'}
              </p>
              {owner_name_english && owner_name_hindi && (
                <p className="text-sm text-muted-foreground">{owner_name_english}</p>
              )}
            </div>
          </div>

          {/* Area Comparison */}
          <div className="flex items-start gap-3">
            <Ruler className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Area</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Map (Computed)</p>
                  <p className="font-medium text-foreground">
                    {formatArea(computed_area_sqm)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Record</p>
                  <p className="font-medium text-foreground">
                    {formatArea(recorded_area_sqm)}
                  </p>
                </div>
              </div>
              {areaDiff && (
                <div className={cn(
                  'mt-2 p-2 rounded-lg text-sm',
                  Math.abs(areaDiff) > 10 
                    ? 'bg-destructive-light text-destructive' 
                    : Math.abs(areaDiff) > 5 
                    ? 'bg-warning-light text-warning-foreground'
                    : 'bg-success-light text-success'
                )}>
                  {Math.abs(areaDiff) > 0.1 ? (
                    <>Difference: {areaDiff > 0 ? '+' : ''}{areaDiff}%</>
                  ) : (
                    <>Areas match</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Record Info */}
          {khata_number && (
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Khata Number</p>
                <p className="font-medium text-foreground">{khata_number}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-start gap-3">
            {isMatched ? (
              <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">
                {isMatched ? 'No discrepancies detected' : `Under review (${discrepancy_status})`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onViewOnMap && (
              <Button onClick={() => onViewOnMap(parcel)} className="flex-1">
                View on Map
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              View Details
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
