import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Map,
  TrendingUp,
  Users,
  Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { discrepanciesService, workflowService } from '@/services/parcels'

export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, activityData] = await Promise.all([
          discrepanciesService.getSummary(),
          workflowService.getRecentChanges({ limit: 5 }),
        ])
        setStats(summaryData)
        setRecentActivity(activityData.changes || [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Parcels',
      value: stats?.total_parcels || 0,
      icon: Map,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Open Discrepancies',
      value: stats?.by_status?.open || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Under Review',
      value: stats?.by_status?.under_review || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Resolved',
      value: stats?.by_status?.resolved || 0,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="size-3" />
            Live
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`size-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Severity Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="size-5" />
              By Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['critical', 'major', 'minor'].map((severity) => {
                const count = stats?.by_severity?.[severity] || 0
                const total = stats?.total_discrepancies || 1
                const percentage = Math.round((count / total) * 100) || 0
                
                return (
                  <div key={severity} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={`severity-${severity}`}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          severity === 'critical'
                            ? 'bg-destructive'
                            : severity === 'major'
                            ? 'bg-warning'
                            : 'bg-success'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="size-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.action} on {activity.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {activity.user_name || 'System'} •{' '}
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Village Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="size-5" />
            Village Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(stats?.by_village || []).slice(0, 5).map((village) => {
              const healthScore = Math.round(
                ((village.resolved || 0) / (village.total || 1)) * 100
              )
              
              return (
                <div
                  key={village.village_code}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <p className="font-medium text-foreground mb-1">
                    {village.village_name || village.village_code}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          healthScore >= 80
                            ? 'bg-success'
                            : healthScore >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                        }`}
                        style={{ width: `${healthScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {healthScore}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
