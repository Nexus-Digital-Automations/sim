/**
 * Analytics Dashboard Page
 * Comprehensive monitoring and analytics dashboard for workflows
 */

'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Users, Zap } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  BusinessMetrics,
  MonitoringApiResponse,
  WorkflowAnalytics,
} from '@/lib/monitoring/types'

type AnalyticsPageProps = {}

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
}

function MetricCard({ title, value, icon, trend, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='font-medium text-sm'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='font-bold text-2xl'>{value}</div>
        {trend && (
          <p className='text-muted-foreground text-xs'>
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.isPositive ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
            {description && ` ${description}`}
          </p>
        )}
        {!trend && description && <p className='text-muted-foreground text-xs'>{description}</p>}
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-5 w-5 rounded' />
            </CardHeader>
            <CardContent>
              <Skeleton className='mb-2 h-8 w-16' />
              <Skeleton className='h-3 w-20' />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-64 w-full' />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage({}: AnalyticsPageProps) {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [selectedWorkflowAnalytics, setSelectedWorkflowAnalytics] =
    useState<WorkflowAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d')
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')

  // Time range options
  const timeRangeOptions = [
    { label: 'Last 24 hours', value: '1d' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 3 months', value: '90d' },
    { label: 'Last 6 months', value: '180d' },
    { label: 'Last year', value: '365d' },
  ]

  // Calculate time range dates
  const getTimeRangeParams = (
    range: string
  ): { start: string; end: string; granularity: string } => {
    const end = new Date()
    const start = new Date()

    const days = Number.parseInt(range.replace('d', ''))
    start.setDate(end.getDate() - days)

    let granularity = 'hour'
    if (days >= 30) granularity = 'day'
    if (days >= 90) granularity = 'week'
    if (days >= 365) granularity = 'month'

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    }
  }

  // Fetch business metrics
  const fetchBusinessMetrics = async () => {
    try {
      const timeRange = getTimeRangeParams(selectedTimeRange)
      const params = new URLSearchParams({
        type: 'business',
        workspaceId,
        startDate: timeRange.start,
        endDate: timeRange.end,
        granularity: timeRange.granularity,
      })

      const response = await fetch(`/api/monitoring/analytics?${params}`)
      const data: MonitoringApiResponse<BusinessMetrics> = await response.json()

      if (data.success) {
        setBusinessMetrics(data.data!)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch business metrics')
      }
    } catch (error) {
      toast.error(
        `Failed to fetch business metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Fetch workflow analytics (if specific workflow selected)
  const fetchWorkflowAnalytics = async (workflowId: string) => {
    try {
      const timeRange = getTimeRangeParams(selectedTimeRange)
      const params = new URLSearchParams({
        type: 'workflow',
        workflowId,
        startDate: timeRange.start,
        endDate: timeRange.end,
        granularity: timeRange.granularity,
        includeBlockPerformance: 'true',
      })

      const response = await fetch(`/api/monitoring/analytics?${params}`)
      const data: MonitoringApiResponse<WorkflowAnalytics> = await response.json()

      if (data.success) {
        setSelectedWorkflowAnalytics(data.data!)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch workflow analytics')
      }
    } catch (error) {
      toast.error(
        `Failed to fetch workflow analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await fetchBusinessMetrics()

        if (selectedWorkflow && selectedWorkflow !== 'all') {
          await fetchWorkflowAnalytics(selectedWorkflow)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [workspaceId, selectedTimeRange, selectedWorkflow])

  if (loading) {
    return (
      <div className='container mx-auto p-6'>
        <div className='mb-6'>
          <h1 className='font-bold text-3xl'>Analytics Dashboard</h1>
          <p className='text-muted-foreground'>
            Comprehensive workflow monitoring and business intelligence
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!businessMetrics) {
    return (
      <div className='container mx-auto p-6'>
        <div className='py-12 text-center'>
          <AlertTriangle className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <h2 className='mb-2 font-semibold text-xl'>No Analytics Data Available</h2>
          <p className='text-muted-foreground'>
            Analytics data will appear here once you have workflow executions to analyze.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6'>
      <div className='mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h1 className='font-bold text-3xl'>Analytics Dashboard</h1>
          <p className='text-muted-foreground'>
            Comprehensive workflow monitoring and business intelligence
          </p>
        </div>

        <div className='flex gap-2'>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className='w-48'>
              <SelectValue placeholder='Select time range' />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant='outline'
            onClick={() => {
              fetchBusinessMetrics()
              if (selectedWorkflow !== 'all') {
                fetchWorkflowAnalytics(selectedWorkflow)
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue='overview' className='space-y-6'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='workflows'>Workflows</TabsTrigger>
          <TabsTrigger value='performance'>Performance</TabsTrigger>
          <TabsTrigger value='costs'>Costs & Usage</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          {/* Key Metrics Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              title='Total Workflows'
              value={businessMetrics.workspaceMetrics.totalWorkflows}
              icon={<BarChart3 className='h-4 w-4 text-muted-foreground' />}
              description={`${businessMetrics.workspaceMetrics.activeWorkflows} active`}
            />

            <MetricCard
              title='Total Executions'
              value={businessMetrics.workspaceMetrics.totalExecutions.toLocaleString()}
              icon={<Activity className='h-4 w-4 text-muted-foreground' />}
              description={`${businessMetrics.workspaceMetrics.successfulExecutions.toLocaleString()} successful`}
            />

            <MetricCard
              title='Active Users'
              value={businessMetrics.workspaceMetrics.activeUsers}
              icon={<Users className='h-4 w-4 text-muted-foreground' />}
              description={`of ${businessMetrics.workspaceMetrics.totalUsers} total`}
            />

            {businessMetrics.usageMetrics?.systemReliability && (
              <MetricCard
                title='System Uptime'
                value={`${businessMetrics.usageMetrics.systemReliability.uptime.toFixed(1)}%`}
                icon={<Zap className='h-4 w-4 text-muted-foreground' />}
                description='Last 30 days'
              />
            )}
          </div>

          {/* Success Rate and Growth */}
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Execution Success Rate</CardTitle>
                <CardDescription>
                  Percentage of successful workflow executions over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='mb-2 font-bold text-3xl'>
                  {(
                    (businessMetrics.workspaceMetrics.successfulExecutions /
                      businessMetrics.workspaceMetrics.totalExecutions) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                <p className='text-muted-foreground text-sm'>
                  {businessMetrics.workspaceMetrics.successfulExecutions.toLocaleString()}{' '}
                  successful out of{' '}
                  {businessMetrics.workspaceMetrics.totalExecutions.toLocaleString()} total
                  executions
                </p>
              </CardContent>
            </Card>

            {businessMetrics.growthMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                  <CardDescription>
                    New workflows, executions, and user growth trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-sm'>Retention Rate:</span>
                      <Badge
                        variant={
                          businessMetrics.growthMetrics.retentionRate >= 80
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {businessMetrics.growthMetrics.retentionRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm'>New Workflows:</span>
                      <span className='font-medium text-sm'>
                        {businessMetrics.growthMetrics.newWorkflows.length}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm'>New Users:</span>
                      <span className='font-medium text-sm'>
                        {businessMetrics.growthMetrics.newUsers.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value='workflows' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance Analysis</CardTitle>
              <CardDescription>
                Detailed performance metrics for individual workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground'>
                Select a specific workflow to view detailed analytics. This feature will show
                execution patterns, performance trends, cost analysis, and bottleneck
                identification.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='performance' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>System Performance Overview</CardTitle>
              <CardDescription>
                Resource utilization, execution times, and system health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {businessMetrics.usageMetrics?.systemReliability ? (
                <div className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div>
                      <h4 className='mb-2 font-medium'>System Reliability</h4>
                      <div className='space-y-2'>
                        <div className='flex justify-between'>
                          <span className='text-sm'>Uptime:</span>
                          <Badge variant='default'>
                            {businessMetrics.usageMetrics.systemReliability.uptime.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm'>SLA Compliance:</span>
                          <Badge variant='default'>
                            {businessMetrics.usageMetrics.systemReliability.slaCompliance.toFixed(
                              1
                            )}
                            %
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className='text-muted-foreground'>
                  Performance metrics will appear here as your workflows generate execution data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='costs' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis & Usage Optimization</CardTitle>
              <CardDescription>
                Resource costs, usage patterns, and optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground'>
                Cost analysis features will display resource usage costs, optimization
                opportunities, and spending trends across your workflows.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
