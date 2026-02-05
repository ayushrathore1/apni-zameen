import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, User, Ruler, History, MessageSquare, Check, Clock } from 'lucide-react'
import { Badge, Button, Textarea, Select } from '@/components/ui'
import { cn, formatDate, formatArea } from '@/lib/utils'
import { DISCREPANCY_STATUSES } from '@/lib/constants'

export function DiscrepancyDetail({
  discrepancy,
  onClose,
  onStatusChange,
  onViewOnMap,
  loading = false,
}) {
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment] = useState('')
  const [showStatusForm, setShowStatusForm] = useState(false)

  if (!discrepancy) return null

  const {
    plot_id,
    village_name,
    type,
    severity,
    status,
    computed_area_sqm,
    recorded_area_sqm,
    owner_name_map,
    owner_name_record,
    description,
    created_at,
    history = [],
  } = discrepancy

  const handleStatusSubmit = () => {
    if (!newStatus) return
    onStatusChange?.({
      status: newStatus,
      comment,
    })
    setShowStatusForm(false)
    setNewStatus('')
    setComment('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-card rounded-xl border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 bg-card border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Discrepancy: {plot_id}
            </h2>
            <p className="text-sm text-muted-foreground">{village_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={`severity-${severity}`}>{severity}</Badge>
            <Badge variant={`status-${status}`}>{status}</Badge>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Type & Description */}
          <div>
            <h3 className="font-medium text-foreground mb-2">Issue Type</h3>
            <Badge variant="outline" className="mb-2">
              {formatType(type)}
            </Badge>
            {description && (
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            )}
          </div>

          {/* Area Comparison (if area mismatch) */}
          {type === 'area_mismatch' && (
            <div>
              <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Ruler className="size-4" />
                Area Comparison
              </h3>
              <div className="grid grid-cols-2 gap-4">
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
              {computed_area_sqm && recorded_area_sqm && (
                <div className="mt-2 p-2 rounded-lg bg-destructive-light text-destructive text-sm">
                  Difference: {((computed_area_sqm - recorded_area_sqm) / recorded_area_sqm * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          {/* Owner Comparison (if owner mismatch) */}
          {type === 'owner_mismatch' && (
            <div>
              <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <User className="size-4" />
                Owner Comparison
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">From Map</p>
                  <p className="font-medium text-foreground">{owner_name_map || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">From Record</p>
                  <p className="font-medium text-foreground">{owner_name_record || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <History className="size-4" />
                History
              </h3>
              <div className="space-y-3">
                {history.map((entry, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="flex size-6 items-center justify-center rounded-full bg-muted shrink-0">
                      {entry.action === 'status_change' ? (
                        <Clock className="size-3" />
                      ) : (
                        <MessageSquare className="size-3" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground">
                        <span className="font-medium">{entry.user_name}</span>{' '}
                        {entry.action === 'status_change'
                          ? `changed status to ${entry.new_status}`
                          : entry.action}
                      </p>
                      {entry.comment && (
                        <p className="text-muted-foreground mt-1">{entry.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Change Form */}
          {showStatusForm ? (
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="font-medium text-foreground mb-3">Update Status</h3>
              <Select
                id="new-status"
                label="New Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={DISCREPANCY_STATUSES.filter(s => s.value !== status).map(s => ({
                  value: s.value,
                  label: s.label.en,
                }))}
                placeholder="Select status"
              />
              <div className="mt-3">
                <Textarea
                  id="comment"
                  label="Comment (Optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note about this status change..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleStatusSubmit} disabled={!newStatus || loading} loading={loading}>
                  <Check className="size-4 mr-1" />
                  Submit
                </Button>
                <Button variant="outline" onClick={() => setShowStatusForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setShowStatusForm(true)} className="flex-1">
                Update Status
              </Button>
              <Button variant="outline" onClick={() => onViewOnMap?.(discrepancy)}>
                <MapPin className="size-4 mr-1" />
                View on Map
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          Reported on {formatDate(created_at)}
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatType(type) {
  const types = {
    area_mismatch: 'Area Mismatch',
    owner_mismatch: 'Owner Mismatch',
    boundary_overlap: 'Boundary Overlap',
    missing_record: 'Missing Record',
    orphan_parcel: 'Orphan Parcel',
  }
  return types[type] || type
}
