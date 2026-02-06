import { motion } from 'framer-motion'
import { MapPin, User, Ruler, FileText, AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn, formatArea } from '@/lib/utils'
import { getAreaDiscrepancy, getStatusBadge, getDiscrepancyDescription } from '@/lib/areaUtils'

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

  // Calculate area discrepancy using utility function
  const discrepancy = getAreaDiscrepancy(computed_area_sqm, recorded_area_sqm)
  const statusBadge = getStatusBadge(discrepancy)
  const discrepancyDescription = getDiscrepancyDescription(discrepancy)
  
  // Determine status
  const hasDiscrepancy = discrepancy.hasDiscrepancy
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
        <Badge variant={statusBadge.variant}>
          {statusBadge.label}
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
              <p className="text-sm text-muted-foreground">Area Comparison</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 mb-1">Map (Computed)</p>
                  <p className="font-semibold text-foreground">
                    {formatArea(computed_area_sqm)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Official Record</p>
                  <p className="font-semibold text-foreground">
                    {formatArea(recorded_area_sqm)}
                  </p>
                </div>
              </div>
              
              {/* Discrepancy Analysis */}
              {discrepancy.hasDiscrepancy || (computed_area_sqm && recorded_area_sqm) ? (
                <div className={cn(
                  'mt-3 p-3 rounded-lg border text-sm',
                  discrepancy.severity === 'critical' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                  discrepancy.severity === 'major' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' :
                  discrepancy.severity === 'minor' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                  'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                )}>
                  <div className="flex items-start gap-2">
                    {discrepancy.isUnderRecorded && <TrendingDown className="size-4 mt-0.5 flex-shrink-0" />}
                    {discrepancy.isOverRecorded && <TrendingUp className="size-4 mt-0.5 flex-shrink-0" />}
                    {!discrepancy.hasDiscrepancy && <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />}
                    
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold mb-1',
                        discrepancy.severity === 'critical' ? 'text-red-800 dark:text-red-100' :
                        discrepancy.severity === 'major' ? 'text-amber-800 dark:text-amber-100' :
                        discrepancy.severity === 'minor' ? 'text-yellow-800 dark:text-yellow-100' :
                        'text-green-800 dark:text-green-100'
                      )}>
                        {discrepancy.absolutePercentage.toFixed(2)}% {discrepancy.isUnderRecorded ? 'Under-Recorded' : discrepancy.isOverRecorded ? 'Over-Recorded' : 'Matched'}
                      </p>
                      <p className={cn(
                        'text-xs',
                        discrepancy.severity === 'critical' ? 'text-red-700 dark:text-red-200' :
                        discrepancy.severity === 'major' ? 'text-amber-700 dark:text-amber-200' :
                        discrepancy.severity === 'minor' ? 'text-yellow-700 dark:text-yellow-200' :
                        'text-green-700 dark:text-green-200'
                      )}>
                        Difference: {Math.abs(discrepancy.difference).toFixed(0)} m²
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
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

          {/* Detailed Status */}
          <div className="flex items-start gap-3">
            {isMatched ? (
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Verification Status</p>
              <p className="font-medium text-foreground mb-1">
                {isMatched ? 'No Discrepancies' : discrepancy_status ? discrepancy_status.charAt(0).toUpperCase() + discrepancy_status.slice(1) : 'Review Required'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {discrepancyDescription}
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
