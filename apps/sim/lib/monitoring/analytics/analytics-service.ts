/**
 * Analytics Service
 * Provides workflow analytics, trend analysis, and business metrics
 */

import { createLogger } from '@/lib/logs/console/logger'
import { performanceCollector } from '../real-time/performance-collector'
import type {
  WorkflowAnalytics,
  BusinessMetrics,
  TimeRange,
  IAnalyticsService,
  CostTrend,
  TokenTrend,
  ThroughputMetrics,
  ErrorPattern,
  ErrorTrend,
  BlockPerformanceAnalytics,
  VolumeMetrics,
  EngagementMetrics,
  CostAnalytics,
  ReliabilityMetrics,
  GrowthTrend,
  MetricSeries
} from '../types'

const logger = createLogger('AnalyticsService')

interface AnalyticsCache {
  key: string
  data: any
  cachedAt: number
  expiresAt: number
}

interface MetricAggregation {
  timestamp: string
  values: number[]
  aggregated: {
    sum: number
    avg: number
    min: number
    max: number
    count: number
  }
}

export class AnalyticsService implements IAnalyticsService {
  private static instance: AnalyticsService
  private cache = new Map<string, AnalyticsCache>()
  private cleanupInterval: NodeJS.Timeout
  
  private readonly CACHE_TTL_MS = 300000 // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 600000 // 10 minutes

  private constructor() {
    // Start periodic cache cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache()
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('AnalyticsService initialized with caching')
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  /**
   * Get comprehensive workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string, timeRange: TimeRange): Promise<WorkflowAnalytics> {
    const operationId = `analytics-workflow-${workflowId}-${Date.now()}`
    logger.debug(`[${operationId}] Generating workflow analytics`, { workflowId, timeRange })

    try {
      // Check cache first
      const cacheKey = `workflow:${workflowId}:${timeRange.start}:${timeRange.end}:${timeRange.granularity}`
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        logger.debug(`[${operationId}] Returning cached analytics`)
        return cached
      }

      // Get performance metrics for the time range
      const metrics = await performanceCollector.getMetrics({
        workflowIds: [workflowId],
        timeRange
      })

      if (metrics.length === 0) {
        logger.warn(`[${operationId}] No metrics found for workflow ${workflowId}`)
        return this.createEmptyWorkflowAnalytics(workflowId, timeRange)
      }

      // Generate analytics
      const analytics: WorkflowAnalytics = {
        workflowId,
        workflowName: `Workflow ${workflowId}`, // Would get from database in real implementation
        timeRange,
        executionMetrics: await this.calculateExecutionMetrics(metrics),
        costMetrics: await this.calculateCostMetrics(metrics, timeRange),
        performanceMetrics: await this.calculatePerformanceMetrics(metrics, timeRange),
        errorAnalysis: await this.calculateErrorAnalysis(metrics, timeRange),
        blockPerformance: await this.calculateBlockPerformance(metrics)
      }

      // Cache the results
      this.setCachedData(cacheKey, analytics, this.CACHE_TTL_MS)

      logger.info(`[${operationId}] Generated workflow analytics`, {
        workflowId,
        totalExecutions: analytics.executionMetrics.totalExecutions,
        successRate: analytics.executionMetrics.successRate,
        avgExecutionTime: analytics.executionMetrics.averageExecutionTime
      })

      return analytics

    } catch (error) {
      logger.error(`[${operationId}] Error generating workflow analytics:`, error)
      throw error
    }
  }

  /**
   * Get business metrics for workspace
   */
  async getBusinessMetrics(workspaceId: string, timeRange: TimeRange): Promise<BusinessMetrics> {
    const operationId = `analytics-business-${workspaceId}-${Date.now()}`
    logger.debug(`[${operationId}] Generating business metrics`, { workspaceId, timeRange })

    try {
      // Check cache first
      const cacheKey = `business:${workspaceId}:${timeRange.start}:${timeRange.end}:${timeRange.granularity}`
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        logger.debug(`[${operationId}] Returning cached business metrics`)
        return cached
      }

      // This would typically query the database for workspace-wide metrics
      // For now, we'll create a mock implementation
      const businessMetrics: BusinessMetrics = {
        timeRange,
        workspaceMetrics: {
          totalWorkflows: 15, // Would query from database
          activeWorkflows: 12,
          totalExecutions: 1250,
          successfulExecutions: 1187,
          totalUsers: 8,
          activeUsers: 6
        },
        usageMetrics: {
          executionVolume: await this.calculateVolumeMetrics(workspaceId, timeRange),
          userEngagement: await this.calculateEngagementMetrics(workspaceId, timeRange),
          costEfficiency: await this.calculateCostEfficiencyMetrics(workspaceId, timeRange),
          systemReliability: await this.calculateReliabilityMetrics(workspaceId, timeRange)
        },
        growthMetrics: {
          newWorkflows: await this.calculateGrowthTrend(workspaceId, 'workflows', timeRange),
          newExecutions: await this.calculateGrowthTrend(workspaceId, 'executions', timeRange),
          newUsers: await this.calculateGrowthTrend(workspaceId, 'users', timeRange),
          retentionRate: 87.5 // Mock value
        }
      }

      // Cache the results
      this.setCachedData(cacheKey, businessMetrics, this.CACHE_TTL_MS)

      logger.info(`[${operationId}] Generated business metrics`, {
        workspaceId,
        totalWorkflows: businessMetrics.workspaceMetrics.totalWorkflows,
        totalExecutions: businessMetrics.workspaceMetrics.totalExecutions,
        successRate: (businessMetrics.workspaceMetrics.successfulExecutions / businessMetrics.workspaceMetrics.totalExecutions * 100).toFixed(1) + '%'
      })

      return businessMetrics

    } catch (error) {
      logger.error(`[${operationId}] Error generating business metrics:`, error)
      throw error
    }
  }

  /**
   * Generate various types of reports
   */
  async generateReport(reportType: string, parameters: Record<string, unknown>): Promise<unknown> {
    const operationId = `report-${reportType}-${Date.now()}`
    logger.debug(`[${operationId}] Generating ${reportType} report`, { parameters })

    try {
      switch (reportType) {
        case 'workflow_performance':
          return await this.generateWorkflowPerformanceReport(parameters)
          
        case 'cost_analysis':
          return await this.generateCostAnalysisReport(parameters)
          
        case 'error_summary':
          return await this.generateErrorSummaryReport(parameters)
          
        case 'usage_trends':
          return await this.generateUsageTrendsReport(parameters)
          
        case 'capacity_planning':
          return await this.generateCapacityPlanningReport(parameters)
          
        default:
          throw new Error(`Unsupported report type: ${reportType}`)
      }

    } catch (error) {
      logger.error(`[${operationId}] Error generating ${reportType} report:`, error)
      throw error
    }
  }

  /**
   * Calculate execution metrics
   */
  private async calculateExecutionMetrics(metrics: any[]): Promise<WorkflowAnalytics['executionMetrics']> {
    const executionTimes = metrics.map(m => m.metrics.executionTime)
    const errorRates = metrics.map(m => m.metrics.errorRate || 0)
    
    const totalExecutions = metrics.length
    const successfulExecutions = metrics.filter(m => (m.metrics.errorRate || 0) === 0).length
    const failedExecutions = totalExecutions - successfulExecutions

    const sortedTimes = executionTimes.slice().sort((a, b) => a - b)

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageExecutionTime: executionTimes.length > 0 ? 
        executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0,
      medianExecutionTime: sortedTimes.length > 0 ? 
        this.calculateMedian(sortedTimes) : 0,
      p95ExecutionTime: sortedTimes.length > 0 ? 
        this.calculatePercentile(sortedTimes, 95) : 0,
      p99ExecutionTime: sortedTimes.length > 0 ? 
        this.calculatePercentile(sortedTimes, 99) : 0
    }
  }

  /**
   * Calculate cost metrics
   */
  private async calculateCostMetrics(metrics: any[], timeRange: TimeRange): Promise<WorkflowAnalytics['costMetrics']> {
    // Mock cost calculation - in real implementation would use actual cost data
    const totalCost = metrics.length * 0.05 // $0.05 per execution
    const averageCostPerExecution = totalCost / Math.max(metrics.length, 1)

    const costTrends: CostTrend[] = await this.generateTimeSeries(timeRange, (timestamp, index) => ({
      timestamp,
      cost: Math.random() * 0.1 + 0.02, // Mock cost variation
      tokens: Math.floor(Math.random() * 1000 + 500), // Mock token usage
      executionCount: Math.floor(Math.random() * 10 + 5)
    }))

    const tokenTrends: TokenTrend[] = costTrends.map(trend => ({
      timestamp: trend.timestamp,
      tokens: trend.tokens,
      executionCount: trend.executionCount
    }))

    return {
      totalCost,
      averageCostPerExecution,
      costTrends,
      tokenUsage: {
        total: tokenTrends.reduce((sum, trend) => sum + trend.tokens, 0),
        average: tokenTrends.length > 0 ? 
          tokenTrends.reduce((sum, trend) => sum + trend.tokens, 0) / tokenTrends.length : 0,
        trends: tokenTrends
      }
    }
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(metrics: any[], timeRange: TimeRange): Promise<WorkflowAnalytics['performanceMetrics']> {
    const throughput = await this.calculateThroughputMetrics(metrics, timeRange)
    const resourceUtilization = await this.calculateResourceUtilizationMetrics(metrics, timeRange)
    const bottlenecks = await performanceCollector.analyzeBottlenecks('mock-workflow', timeRange)

    return {
      throughput,
      resourceUtilization,
      bottlenecks
    }
  }

  /**
   * Calculate error analysis
   */
  private async calculateErrorAnalysis(metrics: any[], timeRange: TimeRange): Promise<WorkflowAnalytics['errorAnalysis']> {
    const errorMetrics = metrics.filter(m => m.metrics.errorRate && m.metrics.errorRate > 0)
    
    // Group errors by pattern (mock implementation)
    const errorPatterns: ErrorPattern[] = [
      {
        error: 'API Timeout',
        count: 5,
        percentage: 45.5,
        affectedBlocks: ['http_request', 'api_call'],
        lastOccurrence: new Date(Date.now() - 3600000).toISOString(),
        trend: 'increasing'
      },
      {
        error: 'Invalid JSON Response',
        count: 3,
        percentage: 27.3,
        affectedBlocks: ['json_parser'],
        lastOccurrence: new Date(Date.now() - 7200000).toISOString(),
        trend: 'stable'
      }
    ]

    const errorTrends: ErrorTrend[] = await this.generateTimeSeries(timeRange, (timestamp, index) => ({
      timestamp,
      errorCount: Math.floor(Math.random() * 5),
      executionCount: Math.floor(Math.random() * 20 + 10),
      errorRate: Math.random() * 15 // 0-15% error rate
    }))

    return {
      mostCommonErrors: errorPatterns,
      errorTrends,
      mttr: 15.5, // Mean time to resolution in minutes
      mtbf: 120.3 // Mean time between failures in minutes
    }
  }

  /**
   * Calculate block performance analytics
   */
  private async calculateBlockPerformance(metrics: any[]): Promise<BlockPerformanceAnalytics[]> {
    // Group metrics by block ID
    const blockMetricsMap = new Map<string, any[]>()
    
    for (const metric of metrics) {
      if (metric.blockId) {
        if (!blockMetricsMap.has(metric.blockId)) {
          blockMetricsMap.set(metric.blockId, [])
        }
        blockMetricsMap.get(metric.blockId)!.push(metric)
      }
    }

    const blockPerformance: BlockPerformanceAnalytics[] = []

    for (const [blockId, blockMetrics] of blockMetricsMap.entries()) {
      const executionTimes = blockMetrics.map(m => m.metrics.executionTime)
      const sortedTimes = executionTimes.slice().sort((a, b) => a - b)
      const successfulExecutions = blockMetrics.filter(m => (m.metrics.errorRate || 0) === 0).length

      blockPerformance.push({
        blockId,
        blockName: `Block ${blockId}`,
        blockType: 'unknown', // Would be available in real metrics
        executionCount: blockMetrics.length,
        averageExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
        medianExecutionTime: this.calculateMedian(sortedTimes),
        p95ExecutionTime: this.calculatePercentile(sortedTimes, 95),
        successRate: (successfulExecutions / blockMetrics.length) * 100,
        costPerExecution: 0.02, // Mock cost
        resourceUtilization: {
          cpu: blockMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.cpu, 0) / blockMetrics.length,
          memory: blockMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.memory, 0) / blockMetrics.length,
          network: blockMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.network, 0) / blockMetrics.length
        },
        trends: [] // Would generate trends in real implementation
      })
    }

    return blockPerformance
  }

  /**
   * Calculate throughput metrics
   */
  private async calculateThroughputMetrics(metrics: any[], timeRange: TimeRange): Promise<ThroughputMetrics> {
    const executionsPerHour: number[] = []
    const timestamps: string[] = []

    const hourlyData = await this.generateTimeSeries(timeRange, (timestamp, index) => {
      const executions = Math.floor(Math.random() * 20 + 5)
      executionsPerHour.push(executions)
      timestamps.push(timestamp)
      return { timestamp, executions }
    })

    return {
      executionsPerHour,
      timestamps,
      peakThroughput: Math.max(...executionsPerHour),
      averageThroughput: executionsPerHour.reduce((sum, val) => sum + val, 0) / executionsPerHour.length
    }
  }

  /**
   * Calculate resource utilization metrics
   */
  private async calculateResourceUtilizationMetrics(metrics: any[], timeRange: TimeRange): Promise<any> {
    const timestamps: string[] = []
    const cpuValues: number[] = []
    const memoryValues: number[] = []
    const networkValues: number[] = []

    await this.generateTimeSeries(timeRange, (timestamp, index) => {
      timestamps.push(timestamp)
      cpuValues.push(Math.random() * 80 + 10) // 10-90% CPU
      memoryValues.push(Math.random() * 1024 * 1024 * 1024) // 0-1GB
      networkValues.push(Math.random() * 1024 * 1024) // 0-1MB
      return { timestamp }
    })

    return {
      cpu: {
        timestamps: timestamps.slice(),
        values: cpuValues.slice(),
        unit: '%',
        average: cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length,
        peak: Math.max(...cpuValues)
      },
      memory: {
        timestamps: timestamps.slice(),
        values: memoryValues.slice(),
        unit: 'bytes',
        average: memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length,
        peak: Math.max(...memoryValues)
      },
      network: {
        timestamps: timestamps.slice(),
        values: networkValues.slice(),
        unit: 'bytes',
        average: networkValues.reduce((sum, val) => sum + val, 0) / networkValues.length,
        peak: Math.max(...networkValues)
      },
      storage: {
        timestamps: timestamps.slice(),
        values: cpuValues.map(() => Math.random() * 100), // Mock storage
        unit: 'GB',
        average: 50,
        peak: 100
      }
    }
  }

  /**
   * Generate time series data based on time range and granularity
   */
  private async generateTimeSeries<T>(
    timeRange: TimeRange, 
    generator: (timestamp: string, index: number) => T
  ): Promise<T[]> {
    const start = new Date(timeRange.start)
    const end = new Date(timeRange.end)
    const data: T[] = []
    
    let current = new Date(start)
    let index = 0

    // Determine increment based on granularity
    const increment = this.getTimeIncrement(timeRange.granularity)

    while (current <= end) {
      data.push(generator(current.toISOString(), index))
      current = new Date(current.getTime() + increment)
      index++
    }

    return data
  }

  /**
   * Get time increment in milliseconds based on granularity
   */
  private getTimeIncrement(granularity: TimeRange['granularity']): number {
    switch (granularity) {
      case 'minute': return 60 * 1000
      case 'hour': return 60 * 60 * 1000
      case 'day': return 24 * 60 * 60 * 1000
      case 'week': return 7 * 24 * 60 * 60 * 1000
      case 'month': return 30 * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // Default to hour
    }
  }

  /**
   * Calculate statistical measures
   */
  private calculateMedian(sortedArray: number[]): number {
    const mid = Math.floor(sortedArray.length / 2)
    return sortedArray.length % 2 !== 0 ? 
      sortedArray[mid] : 
      (sortedArray[mid - 1] + sortedArray[mid]) / 2
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)] || 0
  }

  /**
   * Create empty analytics structure when no data is available
   */
  private createEmptyWorkflowAnalytics(workflowId: string, timeRange: TimeRange): WorkflowAnalytics {
    return {
      workflowId,
      workflowName: `Workflow ${workflowId}`,
      timeRange,
      executionMetrics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        medianExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0
      },
      costMetrics: {
        totalCost: 0,
        averageCostPerExecution: 0,
        costTrends: [],
        tokenUsage: {
          total: 0,
          average: 0,
          trends: []
        }
      },
      performanceMetrics: {
        throughput: {
          executionsPerHour: [],
          timestamps: [],
          peakThroughput: 0,
          averageThroughput: 0
        },
        resourceUtilization: {
          cpu: { timestamps: [], values: [], unit: '%', average: 0, peak: 0 },
          memory: { timestamps: [], values: [], unit: 'bytes', average: 0, peak: 0 },
          network: { timestamps: [], values: [], unit: 'bytes', average: 0, peak: 0 },
          storage: { timestamps: [], values: [], unit: 'GB', average: 0, peak: 0 }
        },
        bottlenecks: []
      },
      errorAnalysis: {
        mostCommonErrors: [],
        errorTrends: [],
        mttr: 0,
        mtbf: 0
      },
      blockPerformance: []
    }
  }

  /**
   * Report generation methods (mock implementations)
   */
  private async generateWorkflowPerformanceReport(parameters: Record<string, unknown>): Promise<unknown> {
    return {
      reportType: 'workflow_performance',
      generatedAt: new Date().toISOString(),
      summary: 'Workflow performance analysis shows overall healthy execution patterns',
      metrics: {
        averageExecutionTime: '2.3s',
        successRate: '94.2%',
        throughput: '15.7 executions/hour'
      },
      recommendations: [
        'Consider optimizing Block A which shows 2x average execution time',
        'Monitor API timeout errors which account for 45% of failures'
      ]
    }
  }

  private async generateCostAnalysisReport(parameters: Record<string, unknown>): Promise<unknown> {
    return {
      reportType: 'cost_analysis',
      generatedAt: new Date().toISOString(),
      totalCost: 127.45,
      costBreakdown: {
        modelCosts: 89.32,
        executionCosts: 38.13
      },
      trends: 'Costs have increased 12% over the past month',
      optimizationOpportunities: [
        'Switch to more cost-effective model for simple operations',
        'Implement caching to reduce redundant API calls'
      ]
    }
  }

  private async generateErrorSummaryReport(parameters: Record<string, unknown>): Promise<unknown> {
    return {
      reportType: 'error_summary',
      generatedAt: new Date().toISOString(),
      totalErrors: 23,
      errorRate: '3.2%',
      topErrors: [
        { type: 'API Timeout', count: 12, percentage: 52.2 },
        { type: 'Invalid Response', count: 6, percentage: 26.1 },
        { type: 'Rate Limit', count: 5, percentage: 21.7 }
      ]
    }
  }

  private async generateUsageTrendsReport(parameters: Record<string, unknown>): Promise<unknown> {
    return {
      reportType: 'usage_trends',
      generatedAt: new Date().toISOString(),
      trends: {
        executions: 'Up 25% from last month',
        users: 'Up 15% from last month',
        workflows: 'Up 8% from last month'
      }
    }
  }

  private async generateCapacityPlanningReport(parameters: Record<string, unknown>): Promise<unknown> {
    return {
      reportType: 'capacity_planning',
      generatedAt: new Date().toISOString(),
      currentCapacity: '78%',
      projectedCapacity: '92% in next 30 days',
      recommendations: [
        'Consider scaling up resources in the next 2-3 weeks',
        'Monitor peak usage hours for optimal resource allocation'
      ]
    }
  }

  /**
   * Mock implementations for business metrics calculations
   */
  private async calculateVolumeMetrics(workspaceId: string, timeRange: TimeRange): Promise<VolumeMetrics> {
    const daily = await this.generateMetricSeries(timeRange, 'day')
    const weekly = await this.generateMetricSeries(timeRange, 'week')
    const monthly = await this.generateMetricSeries(timeRange, 'month')

    return {
      daily,
      weekly,
      monthly,
      peakConcurrency: 25,
      averageConcurrency: 12
    }
  }

  private async calculateEngagementMetrics(workspaceId: string, timeRange: TimeRange): Promise<EngagementMetrics> {
    return {
      dailyActiveUsers: await this.generateMetricSeries(timeRange, 'day', 5, 15),
      averageSessionDuration: await this.generateMetricSeries(timeRange, 'day', 30, 90),
      workflowsPerUser: await this.generateMetricSeries(timeRange, 'day', 2, 8),
      executionsPerUser: await this.generateMetricSeries(timeRange, 'day', 10, 50)
    }
  }

  private async calculateCostEfficiencyMetrics(workspaceId: string, timeRange: TimeRange): Promise<CostAnalytics> {
    return {
      costPerExecution: await this.generateMetricSeries(timeRange, 'day', 0.02, 0.08),
      costPerUser: await this.generateMetricSeries(timeRange, 'day', 5, 25),
      costEfficiencyScore: 82.5,
      topCostDrivers: [
        { category: 'model', name: 'GPT-4', cost: 45.67, percentage: 35.8, trend: 'increasing' },
        { category: 'integration', name: 'OpenAI API', cost: 32.15, percentage: 25.2, trend: 'stable' }
      ]
    }
  }

  private async calculateReliabilityMetrics(workspaceId: string, timeRange: TimeRange): Promise<ReliabilityMetrics> {
    return {
      uptime: 99.7,
      errorRate: await this.generateMetricSeries(timeRange, 'day', 1, 5),
      mttr: await this.generateMetricSeries(timeRange, 'day', 10, 30),
      mtbf: await this.generateMetricSeries(timeRange, 'day', 60, 180),
      slaCompliance: 98.2
    }
  }

  private async calculateGrowthTrend(workspaceId: string, metric: string, timeRange: TimeRange): Promise<GrowthTrend[]> {
    return this.generateTimeSeries(timeRange, (timestamp, index) => {
      const baseValue = 50 + index * 2
      const growthRate = (Math.random() - 0.5) * 20 // -10% to +10%
      return {
        timestamp,
        value: baseValue + Math.floor(Math.random() * 10),
        growthRate
      }
    })
  }

  private async generateMetricSeries(
    timeRange: TimeRange, 
    granularity: 'day' | 'week' | 'month',
    minValue: number = 0,
    maxValue: number = 100
  ): Promise<MetricSeries> {
    const range = maxValue - minValue
    const values = await this.generateTimeSeries({ ...timeRange, granularity }, () => 
      minValue + Math.random() * range
    )

    const timestamps = values.map((_, index) => {
      const start = new Date(timeRange.start)
      const increment = this.getTimeIncrement(granularity as any)
      return new Date(start.getTime() + index * increment).toISOString()
    })

    return {
      timestamps,
      values,
      unit: 'count',
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      peak: Math.max(...values)
    }
  }

  /**
   * Cache management methods
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any, ttlMs: number): void {
    const now = Date.now()
    this.cache.set(key, {
      key,
      data,
      cachedAt: now,
      expiresAt: now + ttlMs
    })
  }

  private cleanupExpiredCache(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired cache entries`)
    }
  }

  /**
   * Get analytics service statistics
   */
  getServiceStats(): {
    cacheSize: number
    cacheHitRate: number
    generatedReports: number
  } {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0, // Would track in real implementation
      generatedReports: 0 // Would track in real implementation
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cache.clear()

    logger.info('AnalyticsService destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance()