import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  Printer,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import { Button, Select, Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/ui'
import { discrepanciesService, villagesService } from '@/services/parcels'
import { exportToCSV, printReport } from '@/utils/exports'
import { formatDate } from '@/lib/utils'

export function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [villages, setVillages] = useState([])
  const [selectedVillage, setSelectedVillage] = useState('')
  const [reportData, setReportData] = useState(null)
  const [summary, setSummary] = useState(null)

  // Fetch villages
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const data = await villagesService.getAll()
        setVillages(data.villages || [])
      } catch (err) {
        console.error('Failed to fetch villages:', err)
      }
    }
    fetchVillages()
  }, [])

  // Generate report
  const generateReport = async () => {
    setLoading(true)
    try {
      const params = selectedVillage ? { village_code: selectedVillage } : {}
      const [discrepancies, summaryData] = await Promise.all([
        discrepanciesService.getAll(params),
        discrepanciesService.getSummary(),
      ])
      
      setReportData(discrepancies.discrepancies || [])
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setLoading(false)
    }
  }

  // Export as CSV
  const handleExportCSV = () => {
    if (!reportData) return
    
    const columns = [
      { key: 'plot_id', label: 'Plot ID' },
      { key: 'village_name', label: 'Village' },
      { key: 'type', label: 'Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Reported Date' },
    ]
    
    exportToCSV(reportData, `discrepancy-report-${Date.now()}`, columns)
  }

  // Print report
  const handlePrint = () => {
    if (!reportData) return
    
    printReport(reportData, {
      title: 'Discrepancy Reconciliation Report',
      subtitle: selectedVillage 
        ? `Village: ${villages.find(v => v.code === selectedVillage)?.name || selectedVillage}`
        : 'All Villages',
      columns: [
        { key: 'plot_id', label: 'Plot ID' },
        { key: 'village_name', label: 'Village' },
        { key: 'type', label: 'Type' },
        { key: 'severity', label: 'Severity', type: 'badge' },
        { key: 'status', label: 'Status' },
      ],
      summary: summary ? {
        'Total Discrepancies': summary.total_discrepancies || 0,
        'Open': summary.by_status?.open || 0,
        'Under Review': summary.by_status?.under_review || 0,
        'Resolved': summary.by_status?.resolved || 0,
      } : {},
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="size-6" />
            Reports
          </h1>
          <p className="text-muted-foreground">
            Generate and export reconciliation reports
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              id="village-select"
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              options={[
                { value: '', label: 'All Villages' },
                ...villages.map(v => ({ value: v.code, label: v.name })),
              ]}
              className="w-full sm:w-60"
            />
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2" /> : <Filter className="size-4 mr-2" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          {summary && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Total Discrepancies"
                value={summary.total_discrepancies || 0}
                icon={PieChart}
                color="primary"
              />
              <SummaryCard
                title="Open Issues"
                value={summary.by_status?.open || 0}
                icon={TrendingUp}
                color="destructive"
              />
              <SummaryCard
                title="Under Review"
                value={summary.by_status?.under_review || 0}
                icon={Calendar}
                color="warning"
              />
              <SummaryCard
                title="Resolved"
                value={summary.by_status?.resolved || 0}
                icon={BarChart3}
                color="success"
              />
            </div>
          )}

          {/* Data Table Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Report Data ({reportData.length} records)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="size-4 mr-1" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="size-4 mr-1" />
                  Print/PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No discrepancies found for the selected filters
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Plot ID</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Village</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Severity</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="px-4 py-2 font-medium">{item.plot_id}</td>
                          <td className="px-4 py-2">{item.village_name}</td>
                          <td className="px-4 py-2">{item.type}</td>
                          <td className="px-4 py-2">{item.severity}</td>
                          <td className="px-4 py-2">{item.status}</td>
                          <td className="px-4 py-2">{formatDate(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportData.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Showing 10 of {reportData.length} records. Export for full data.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="size-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
