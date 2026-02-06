import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAreaDiscrepancy } from '@/lib/areaUtils'
import { AreaDiscrepancyIndicator, SeverityBadge } from './AreaDiscrepancyIndicator'

/**
 * AreaAnalysisDashboard - Comprehensive view of area discrepancies across parcels
 */
export function AreaAnalysisDashboard({ parcels = [] }) {
  // Calculate statistics from all parcels
  const stats = useMemo(() => {
    if (!parcels || parcels.length === 0) {
      return {
        totalParcels: 0,
        matchedCount: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        averageDiscrepancy: 0,
        maxDiscrepancy: 0,
        minDiscrepancy: 0,
        overRecordedCount: 0,
        underRecordedCount: 0,
      }
    }
    
    const features = parcels.features || (Array.isArray(parcels) ? parcels : [])
    
    let critical = 0, major = 0, minor = 0, matched = 0
    let totalDiscrepancy = 0, maxDiscrepancy = 0, minDiscrepancy = Infinity
    let overRecorded = 0, underRecorded = 0
    let discrepancyCount = 0
    
    features.forEach(feature => {
      const props = feature.properties || feature
      const discrepancy = getAreaDiscrepancy(
        props.computed_area_sqm,
        props.recorded_area_sqm
      )
      
      if (discrepancy.hasDiscrepancy) {
        discrepancyCount++
        totalDiscrepancy += discrepancy.absolutePercentage
        maxDiscrepancy = Math.max(maxDiscrepancy, discrepancy.absolutePercentage)
        minDiscrepancy = Math.min(minDiscrepancy, discrepancy.absolutePercentage)
        
        if (discrepancy.isUnderRecorded) underRecorded++
        if (discrepancy.isOverRecorded) overRecorded++
      }
      
      if (discrepancy.severity === 'critical') critical++
      else if (discrepancy.severity === 'major') major++
      else if (discrepancy.severity === 'minor') minor++
      else matched++
    })
    
    return {
      totalParcels: features.length,
      matchedCount: matched,
      criticalCount: critical,
      majorCount: major,
      minorCount: minor,
      averageDiscrepancy: discrepancyCount > 0 ? (totalDiscrepancy / discrepancyCount).toFixed(2) : 0,
      maxDiscrepancy: maxDiscrepancy === 0 ? 0 : maxDiscrepancy.toFixed(2),
      minDiscrepancy: minDiscrepancy === Infinity ? 0 : minDiscrepancy.toFixed(2),
      overRecordedCount: overRecorded,
      underRecordedCount: underRecorded,
    }
  }, [parcels])
  
  const discrepancyRate = (
    ((stats.criticalCount + stats.majorCount + stats.minorCount) / stats.totalParcels) * 100
  ).toFixed(1)
  
  return (
    <div className="space-y-4">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Parcels */}
        <StatCard
          icon={BarChart3}
          label="Total Parcels"
          value={stats.totalParcels}
          trend={null}
          color="blue"
        />
        
        {/* Critical Issues */}
        <StatCard
          icon={AlertTriangle}
          label="Critical"
          value={stats.criticalCount}
          percentage={((stats.criticalCount / stats.totalParcels) * 100).toFixed(1)}
          color="red"
        />
        
        {/* Major Issues */}
        <StatCard
          icon={AlertTriangle}
          label="Major Variance"
          value={stats.majorCount}
          percentage={((stats.majorCount / stats.totalParcels) * 100).toFixed(1)}
          color="amber"
        />
        
        {/* Matched */}
        <StatCard
          icon={CheckCircle2}
          label="Matched"
          value={stats.matchedCount}
          percentage={((stats.matchedCount / stats.totalParcels) * 100).toFixed(1)}
          color="green"
        />
      </div>
      
      {/* Discrepancy Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Over/Under Recording */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="size-5" />
            Recording Bias Analysis
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Over-Recorded</span>
                <span className="text-sm font-semibold">{stats.overRecordedCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${stats.totalParcels > 0 ? (stats.overRecordedCount / stats.totalParcels) * 100 : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalParcels > 0 ? ((stats.overRecordedCount / stats.totalParcels) * 100).toFixed(1) : 0}% of parcels
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Under-Recorded</span>
                <span className="text-sm font-semibold">{stats.underRecordedCount}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full"
                  style={{
                    width: `${stats.totalParcels > 0 ? (stats.underRecordedCount / stats.totalParcels) * 100 : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalParcels > 0 ? ((stats.underRecordedCount / stats.totalParcels) * 100).toFixed(1) : 0}% of parcels
              </p>
            </div>
          </div>
        </div>
        
        {/* Discrepancy Statistics */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="size-5" />
            Discrepancy Metrics
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Average Discrepancy</span>
              <span className="font-semibold text-foreground">{stats.averageDiscrepancy}%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Maximum Discrepancy</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{stats.maxDiscrepancy}%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Minimum Discrepancy</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.minDiscrepancy}%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Overall Discrepancy Rate</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{discrepancyRate}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Severity Distribution */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-4">Severity Distribution</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SeverityDistributionItem
            label="Critical"
            count={stats.criticalCount}
            total={stats.totalParcels}
            severity="critical"
          />
          <SeverityDistributionItem
            label="Major"
            count={stats.majorCount}
            total={stats.totalParcels}
            severity="major"
          />
          <SeverityDistributionItem
            label="Minor"
            count={stats.minorCount}
            total={stats.totalParcels}
            severity="minor"
          />
          <SeverityDistributionItem
            label="Matched"
            count={stats.matchedCount}
            total={stats.totalParcels}
            severity="none"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * StatCard - Individual statistic card
 */
function StatCard({ icon: Icon, label, value, percentage, color = 'gray', trend }) {
  const colorClasses = {
    red: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    green: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    gray: 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  }
  
  return (
    <div className={cn('rounded-lg border p-4', colorClasses[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {percentage && <p className="text-xs opacity-75 mt-1">{percentage}% of total</p>}
        </div>
        <Icon className="size-6 opacity-40" />
      </div>
    </div>
  )
}

/**
 * SeverityDistributionItem - Shows distribution of severity levels
 */
function SeverityDistributionItem({ label, count, total, severity }) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
  
  const colorConfig = {
    critical: 'bg-red-500',
    major: 'bg-amber-500',
    minor: 'bg-yellow-500',
    none: 'bg-green-500',
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold text-muted-foreground">{count}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full', colorConfig[severity])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
    </div>
  )
}
