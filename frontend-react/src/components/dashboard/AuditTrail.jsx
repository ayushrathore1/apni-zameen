import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  FileText,
  User,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

/**
 * Activity feed showing recent changes and actions.
 */
export function ActivityFeed({
  activities = [],
  loading = false,
  className,
}) {
  const getActivityIcon = (type) => {
    const icons = {
      status_change: Clock,
      edit: Edit3,
      comment: MessageSquare,
      created: FileText,
      resolved: CheckCircle2,
      flagged: AlertTriangle,
    }
    return icons[type] || FileText
  }

  const getActivityColor = (type) => {
    const colors = {
      status_change: 'bg-info text-info-foreground',
      edit: 'bg-warning text-warning-foreground',
      comment: 'bg-primary text-primary-foreground',
      created: 'bg-secondary text-secondary-foreground',
      resolved: 'bg-success text-success-foreground',
      flagged: 'bg-destructive text-destructive-foreground',
    }
    return colors[type] || 'bg-muted text-muted-foreground'
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="size-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Clock className="size-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type)
        
        return (
          <motion.div
            key={activity.id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3"
          >
            {/* Icon */}
            <div className={cn(
              'flex size-8 items-center justify-center rounded-full shrink-0',
              getActivityColor(activity.type)
            )}>
              <Icon className="size-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user_name || 'System'}</span>
                    {' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.details}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatDate(activity.timestamp)}
                </Badge>
              </div>

              {/* Comment/Note */}
              {activity.comment && (
                <div className="mt-2 p-2 rounded-lg bg-muted text-sm text-foreground">
                  "{activity.comment}"
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/**
 * Timeline view for change history.
 */
export function ChangeTimeline({
  changes = [],
  className,
}) {
  if (changes.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <FileText className="size-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground">No changes recorded</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {changes.map((change, index) => (
          <motion.div
            key={change.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-10"
          >
            {/* Timeline dot */}
            <div className={cn(
              'absolute left-2 size-4 rounded-full border-2 border-background',
              index === 0 ? 'bg-primary' : 'bg-muted-foreground'
            )} />

            {/* Change card */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {change.user_name || 'System'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(change.timestamp)}
                </span>
              </div>

              {/* Action description */}
              <p className="text-sm text-foreground mb-2">{change.action}</p>

              {/* Before/After for field changes */}
              {change.field && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive line-through">
                    {change.old_value || 'N/A'}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="px-2 py-0.5 rounded bg-success/10 text-success">
                    {change.new_value || 'N/A'}
                  </span>
                </div>
              )}

              {/* Reason/Comment */}
              {change.reason && (
                <div className="mt-2 p-2 rounded-lg bg-muted text-xs text-muted-foreground">
                  Reason: {change.reason}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/**
 * Status transition history component.
 */
export function StatusHistory({
  history = [],
  className,
}) {
  const statusColors = {
    open: 'bg-destructive',
    under_review: 'bg-warning',
    resolved: 'bg-success',
    disputed: 'bg-info',
    ignored: 'bg-muted-foreground',
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {history.map((status, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-1"
        >
          <div
            className={cn(
              'size-3 rounded-full',
              statusColors[status.value] || 'bg-muted'
            )}
            title={`${status.value} - ${formatDate(status.timestamp)}`}
          />
          {index < history.length - 1 && (
            <ArrowRight className="size-3 text-muted-foreground" />
          )}
        </motion.div>
      ))}
    </div>
  )
}
