import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, RefreshCw, Download, AlertTriangle } from 'lucide-react'
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { DiscrepancyTable, DiscrepancyDetail } from '@/components/dashboard'
import { discrepanciesService, workflowService } from '@/services/parcels'
import { DISCREPANCY_STATUSES, DISCREPANCY_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function DiscrepanciesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Data state
  const [discrepancies, setDiscrepancies] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Selection state
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  // Fetch discrepancies
  const fetchDiscrepancies = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = {
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        type: typeFilter || undefined,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction,
      }
      
      const [data, summaryData] = await Promise.all([
        discrepanciesService.getAll(params),
        discrepanciesService.getSummary(),
      ])
      
      setDiscrepancies(data.discrepancies || [])
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to fetch discrepancies:', err)
      setError('Failed to load discrepancies. Please try again.')
      // Set demo data for development
      setDiscrepancies([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, severityFilter, typeFilter, sortConfig])

  useEffect(() => {
    fetchDiscrepancies()
  }, [fetchDiscrepancies])

  // Handle status change
  const handleStatusChange = async (data) => {
    if (!selectedDiscrepancy) return
    
    try {
      await workflowService.transitionStatus(selectedDiscrepancy.id, data)
      await fetchDiscrepancies()
      setSelectedDiscrepancy(null)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Handle view on map
  const handleViewOnMap = (discrepancy) => {
    navigate(`/map?plot=${discrepancy.plot_id}`)
  }

  // Update URL params
  const updateFilters = (key, value) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  // Filter stats
  const filterStats = [
    { label: 'All', value: '', count: summary?.total_discrepancies || 0 },
    { label: 'Open', value: 'open', count: summary?.by_status?.open || 0, variant: 'status-open' },
    { label: 'Review', value: 'under_review', count: summary?.by_status?.under_review || 0, variant: 'status-review' },
    { label: 'Resolved', value: 'resolved', count: summary?.by_status?.resolved || 0, variant: 'status-resolved' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="size-6" />
            Discrepancies
          </h1>
          <p className="text-muted-foreground">
            Review and resolve map-record mismatches
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDiscrepancies} disabled={loading}>
            <RefreshCw className={cn('size-4 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {filterStats.map((stat) => (
          <button
            key={stat.value}
            onClick={() => {
              setStatusFilter(stat.value)
              updateFilters('status', stat.value)
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              statusFilter === stat.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {stat.label}
            <Badge
              variant={stat.variant || 'secondary'}
              className="ml-2 text-xs"
            >
              {stat.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Plot ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                updateFilters('type', e.target.value)
              }}
              options={[
                { value: '', label: 'All Types' },
                ...DISCREPANCY_TYPES.map(t => ({ value: t.value, label: t.label.en })),
              ]}
              className="w-full sm:w-40"
            />
            <Select
              id="severity-filter"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value)
                updateFilters('severity', e.target.value)
              }}
              options={[
                { value: '', label: 'All Severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive-light text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <DiscrepancyTable
        discrepancies={discrepancies.filter(d => 
          !searchQuery || d.plot_id?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        loading={loading}
        sortConfig={sortConfig}
        onSort={setSortConfig}
        onRowClick={setSelectedDiscrepancy}
        onViewOnMap={handleViewOnMap}
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDiscrepancy && (
          <DiscrepancyDetail
            discrepancy={selectedDiscrepancy}
            onClose={() => setSelectedDiscrepancy(null)}
            onStatusChange={handleStatusChange}
            onViewOnMap={handleViewOnMap}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
