import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  MapPin,
  Filter,
} from 'lucide-react'
import { Badge, Button, Spinner } from '@/components/ui'
import { cn, formatDate, formatArea } from '@/lib/utils'

export function DiscrepancyTable({
  discrepancies = [],
  loading = false,
  onRowClick,
  onViewOnMap,
  sortConfig,
  onSort,
}) {
  const columns = [
    { key: 'plot_id', label: 'Plot ID', sortable: true },
    { key: 'village_name', label: 'Village', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'severity', label: 'Severity', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'created_at', label: 'Reported', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ]

  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDown className="size-3 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="size-3" />
    ) : (
      <ChevronDown className="size-3" />
    )
  }

  const handleSort = (key) => {
    if (!onSort) return
    const direction =
      sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc'
    onSort({ key, direction })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (discrepancies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Filter className="size-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-foreground">No discrepancies found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query
        </p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium text-muted-foreground',
                    column.sortable && 'cursor-pointer hover:text-foreground transition-colors'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence>
              {discrepancies.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(item)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {item.plot_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.village_name || item.village_code}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {formatDiscrepancyType(item.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={`severity-${item.severity}`}>
                      {item.severity?.charAt(0).toUpperCase() + item.severity?.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={`status-${item.status}`}>
                      {formatStatus(item.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowClick?.(item)
                        }}
                        title="View details"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewOnMap?.(item)
                        }}
                        title="View on map"
                      >
                        <MapPin className="size-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Helper functions
function formatDiscrepancyType(type) {
  const types = {
    area_mismatch: 'Area Mismatch',
    owner_mismatch: 'Owner Mismatch',
    boundary_overlap: 'Boundary Overlap',
    missing_record: 'Missing Record',
    orphan_parcel: 'Orphan Parcel',
  }
  return types[type] || type
}

function formatStatus(status) {
  const statuses = {
    open: 'Open',
    under_review: 'Under Review',
    resolved: 'Resolved',
    disputed: 'Disputed',
    ignored: 'Ignored',
  }
  return statuses[status] || status
}
