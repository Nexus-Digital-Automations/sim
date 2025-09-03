'use client'

/**
 * Workflow Monitoring Panel Component
 * Integrates real-time monitoring, performance metrics, and alerts into the workflow builder
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Clock,
  Cpu,
  Eye,
  MemoryStick,
  Play,
  Square,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  AlertInstance,
  LiveExecutionStatus,
  PerformanceMetrics,
  WorkflowAnalytics,
} from '@/lib/monitoring/types'

interface WorkflowMonitoringPanelProps {
  workflowId: string
  workspaceId: string
  isExecuting?: boolean
  onStartDebugging?: (executionId: string) => void
  onViewAnalytics?: (workflowId: string) => void
  className?: string
}

interface MonitoringData {
  liveExecutions: LiveExecutionStatus[]
  currentExecution?: LiveExecutionStatus
  recentMetrics: PerformanceMetrics[]
  activeAlerts: AlertInstance[]
  analytics?: WorkflowAnalytics
}

export function WorkflowMonitoringPanel({
  workflowId,
  workspaceId,
  isExecuting = false,
  onStartDebugging,
  onViewAnalytics,
  className,
}: WorkflowMonitoringPanelProps) {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    liveExecutions: [],
    recentMetrics: [],
    activeAlerts: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>('overview')

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch live executions
      const executionsResponse = await fetch(
        `/api/monitoring/live-executions?workspaceId=${workspaceId}&workflowIds=${workflowId}`
      )

      if (!executionsResponse.ok) {
        throw new Error('Failed to fetch live executions')
      }

      const executionsData = await executionsResponse.json()
      const liveExecutions = executionsData.data?.executions || []

      // Fetch recent performance metrics
      const metricsResponse = await fetch(
        `/api/monitoring/performance-metrics?workflowIds=${workflowId}&startDate=${new Date(Date.now() - 3600000).toISOString()}&endDate=${new Date().toISOString()}&limit=50`
      )

      const metricsData = metricsResponse.ok
        ? await metricsResponse.json()
        : { data: { metrics: [] } }

      // Fetch active alerts
      const alertsResponse = await fetch(
        `/api/monitoring/alerts?workspaceId=${workspaceId}&status=active`
      )
      const alertsData = alertsResponse.ok ? await alertsResponse.json() : { data: { alerts: [] } }

      // Update state
      setMonitoringData({
        liveExecutions,
        currentExecution: liveExecutions.find((exec) => exec.status === 'running'),
        recentMetrics: metricsData.data?.metrics || [],
        activeAlerts:
          alertsData.data?.alerts?.filter(
            (alert: AlertInstance) => alert.workflowId === workflowId
          ) || [],
      })
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load monitoring data')
    } finally {
      setIsLoading(false)
    }
  }, [workflowId, workspaceId])

  // Set up real-time updates
  useEffect(() => {
    fetchMonitoringData()

    // Set up polling for real-time updates
    const interval = setInterval(fetchMonitoringData, 5000)

    return () => clearInterval(interval)
  }, [fetchMonitoringData])

  // Calculate performance statistics
  const performanceStats = useMemo(() => {
    const { recentMetrics } = monitoringData

    if (recentMetrics.length === 0) {
      return {
        avgExecutionTime: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        errorRate: 0,
      }
    }

    const totalMetrics = recentMetrics.length
    const avgExecutionTime =
      recentMetrics.reduce((sum, m) => sum + m.metrics.executionTime, 0) / totalMetrics
    const avgCpuUsage =
      recentMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.cpu, 0) / totalMetrics
    const avgMemoryUsage =
      recentMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.memory, 0) / totalMetrics
    const errorRate =
      recentMetrics.reduce((sum, m) => sum + (m.metrics.errorRate || 0), 0) / totalMetrics

    return {
      avgExecutionTime,
      avgCpuUsage,
      avgMemoryUsage,
      errorRate,
    }
  }, [monitoringData.recentMetrics])

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  // Render current execution status
  const renderCurrentExecution = () => {
    const { currentExecution } = monitoringData

    if (!currentExecution) {
      return (
        <div className='flex items-center justify-center py-6 text-muted-foreground'>
          <Square className='mr-2 h-4 w-4' />
          No active execution
        </div>
      )
    }

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Play className='h-4 w-4 text-green-500' />
            <span className='font-medium'>Execution {currentExecution.executionId.slice(-8)}</span>
          </div>
          <Badge variant={currentExecution.status === 'running' ? 'default' : 'secondary'}>
            {currentExecution.status}
          </Badge>
        </div>

        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span>Progress</span>
            <span>{currentExecution.progress}%</span>
          </div>
          <Progress value={currentExecution.progress} className='h-2' />
        </div>

        {currentExecution.currentBlock && (
          <div className='rounded-lg bg-muted p-3'>
            <div className='font-medium text-sm'>Current Block</div>
            <div className='text-muted-foreground text-sm'>
              {currentExecution.currentBlock.blockName} ({currentExecution.currentBlock.blockType})
            </div>
          </div>
        )}

        <div className='flex justify-between text-sm'>
          <span>Started</span>
          <span>{new Date(currentExecution.startedAt).toLocaleTimeString()}</span>
        </div>

        {onStartDebugging && (
          <Button
            size='sm'
            variant='outline'
            onClick={() => onStartDebugging(currentExecution.executionId)}
            className='w-full'
          >
            <Eye className='mr-2 h-4 w-4' />
            Start Debugging
          </Button>
        )}
      </div>
    )
  }

  // Render performance metrics
  const renderPerformanceMetrics = () => {
    const stats = performanceStats

    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <Card className='p-3'>
            <div className='flex items-center space-x-2'>
              <Clock className='h-4 w-4 text-blue-500' />
              <div>
                <div className='text-muted-foreground text-xs'>Avg. Execution</div>
                <div className='font-medium text-sm'>{formatDuration(stats.avgExecutionTime)}</div>
              </div>
            </div>
          </Card>

          <Card className='p-3'>
            <div className='flex items-center space-x-2'>
              <Cpu className='h-4 w-4 text-orange-500' />
              <div>
                <div className='text-muted-foreground text-xs'>Avg. CPU</div>
                <div className='font-medium text-sm'>{stats.avgCpuUsage.toFixed(1)}%</div>
              </div>
            </div>
          </Card>

          <Card className='p-3'>
            <div className='flex items-center space-x-2'>
              <MemoryStick className='h-4 w-4 text-green-500' />
              <div>
                <div className='text-muted-foreground text-xs'>Avg. Memory</div>
                <div className='font-medium text-sm'>{formatBytes(stats.avgMemoryUsage)}</div>
              </div>
            </div>
          </Card>

          <Card className='p-3'>
            <div className='flex items-center space-x-2'>
              <AlertCircle className='h-4 w-4 text-red-500' />
              <div>
                <div className='text-muted-foreground text-xs'>Error Rate</div>
                <div className='font-medium text-sm'>{stats.errorRate.toFixed(1)}%</div>
              </div>
            </div>
          </Card>
        </div>

        {monitoringData.recentMetrics.length > 0 && (
          <div>
            <div className='mb-2 font-medium text-sm'>Recent Metrics</div>
            <ScrollArea className='h-32'>
              <div className='space-y-2'>
                {monitoringData.recentMetrics.slice(0, 10).map((metric, index) => (
                  <div key={index} className='flex justify-between rounded bg-muted p-2 text-xs'>
                    <span>{metric.blockId}</span>
                    <span>{formatDuration(metric.metrics.executionTime)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    )
  }

  // Render alerts
  const renderAlerts = () => {
    const { activeAlerts } = monitoringData

    if (activeAlerts.length === 0) {
      return (
        <div className='flex items-center justify-center py-6 text-muted-foreground'>
          <Zap className='mr-2 h-4 w-4' />
          No active alerts
        </div>
      )
    }

    return (
      <ScrollArea className='h-64'>
        <div className='space-y-3'>
          {activeAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className={`
              ${alert.severity === 'critical' ? 'border-red-500' : ''} ${alert.severity === 'high' ? 'border-orange-500' : ''} ${alert.severity === 'medium' ? 'border-yellow-500' : ''} ${alert.severity === 'low' ? 'border-blue-500' : ''} `}
            >
              <AlertCircle className='h-4 w-4' />
              <div className='flex-1'>
                <div className='mb-1 flex items-center justify-between'>
                  <div className='font-medium text-sm'>{alert.ruleName}</div>
                  <Badge
                    variant={
                      alert.severity === 'critical'
                        ? 'destructive'
                        : alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <AlertDescription className='text-xs'>{alert.message}</AlertDescription>
                <div className='mt-1 text-muted-foreground text-xs'>
                  {new Date(alert.triggeredAt).toLocaleString()}
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </ScrollArea>
    )
  }

  // Render analytics summary
  const renderAnalytics = () => {
    return (
      <div className='space-y-4'>
        <div className='text-muted-foreground text-sm'>
          Analytics data will be displayed here once implemented
        </div>

        {onViewAnalytics && (
          <Button variant='outline' onClick={() => onViewAnalytics(workflowId)} className='w-full'>
            <TrendingUp className='mr-2 h-4 w-4' />
            View Full Analytics
          </Button>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='text-sm'>Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center text-sm'>
          <Activity className='mr-2 h-4 w-4' />
          Monitoring
        </CardTitle>
        <CardDescription className='text-xs'>
          Real-time execution monitoring and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='overview' className='text-xs'>
              Overview
            </TabsTrigger>
            <TabsTrigger value='performance' className='text-xs'>
              Performance
            </TabsTrigger>
            <TabsTrigger value='alerts' className='text-xs'>
              Alerts
            </TabsTrigger>
            <TabsTrigger value='analytics' className='text-xs'>
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className='p-4'>
            <TabsContent value='overview' className='mt-0'>
              {isLoading ? (
                <div className='flex items-center justify-center py-6'>
                  <div className='h-6 w-6 animate-spin rounded-full border-primary border-b-2' />
                </div>
              ) : (
                renderCurrentExecution()
              )}
            </TabsContent>

            <TabsContent value='performance' className='mt-0'>
              {renderPerformanceMetrics()}
            </TabsContent>

            <TabsContent value='alerts' className='mt-0'>
              {renderAlerts()}
            </TabsContent>

            <TabsContent value='analytics' className='mt-0'>
              {renderAnalytics()}
            </TabsContent>
          </div>
        </Tabs>

        {monitoringData.activeAlerts.length > 0 && (
          <>
            <Separator />
            <div className='p-4'>
              <div className='flex items-center space-x-2 text-orange-600 text-sm'>
                <AlertCircle className='h-4 w-4' />
                <span>{monitoringData.activeAlerts.length} active alert(s)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
