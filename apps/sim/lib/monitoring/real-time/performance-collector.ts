/**
 * Performance Metrics Collector
 * Collects, aggregates, and analyzes workflow execution performance metrics
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  BlockMetrics,
  BottleneckAnalysis,
  IPerformanceCollector,
  MetricsQuery,
  PerformanceEvent,
  PerformanceMetrics,
  TimeRange,
} from '../types'

const logger = createLogger('PerformanceCollector')

interface MetricsBuffer {
  executionId: string
  workflowId: string
  metrics: PerformanceMetrics[]
  blockMetrics: Map<string, BlockMetrics>
  startTime: number
  lastActivity: number
}

interface ResourceSnapshot {
  timestamp: number
  cpu: number
  memory: number
  networkIn: number
  networkOut: number
}

export class PerformanceCollector extends EventEmitter implements IPerformanceCollector {
  private static instance: PerformanceCollector
  private metricsBuffers = new Map<string, MetricsBuffer>()
  private resourceBaseline: ResourceSnapshot | null = null
  private resourceMonitorInterval: NodeJS.Timeout
  private flushInterval: NodeJS.Timeout

  private readonly FLUSH_INTERVAL_MS = 30000 // 30 seconds
  private readonly BUFFER_RETENTION_MS = 300000 // 5 minutes
  private readonly RESOURCE_MONITOR_INTERVAL_MS = 1000 // 1 second

  private constructor() {
    super()

    // Initialize resource monitoring
    this.startResourceMonitoring()

    // Start periodic buffer flushing
    this.flushInterval = setInterval(() => {
      this.flushStaleBuffers()
    }, this.FLUSH_INTERVAL_MS)

    logger.info('PerformanceCollector initialized with resource monitoring')
  }

  static getInstance(): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector()
    }
    return PerformanceCollector.instance
  }

  /**
   * Collect performance metrics for a specific execution and block
   */
  async collectMetrics(
    executionId: string,
    blockId: string,
    metrics: Partial<PerformanceMetrics>
  ): Promise<void> {
    const operationId = `collect-${executionId}-${blockId}-${Date.now()}`
    logger.debug(`[${operationId}] Collecting performance metrics`, {
      executionId,
      blockId,
      metricTypes: Object.keys(metrics.metrics || {}),
    })

    try {
      // Get or create metrics buffer
      let buffer = this.metricsBuffers.get(executionId)
      if (!buffer) {
        buffer = {
          executionId,
          workflowId: metrics.workflowId || 'unknown',
          metrics: [],
          blockMetrics: new Map(),
          startTime: performance.now(),
          lastActivity: Date.now(),
        }
        this.metricsBuffers.set(executionId, buffer)
        logger.debug(`[${operationId}] Created new metrics buffer for execution ${executionId}`)
      }

      // Update last activity
      buffer.lastActivity = Date.now()

      // Create full metrics object with current resource snapshot
      const currentResourceUsage = await this.getCurrentResourceUsage()
      const fullMetrics: PerformanceMetrics = {
        executionId,
        workflowId: buffer.workflowId,
        blockId,
        metrics: {
          executionTime: metrics.metrics?.executionTime || 0,
          resourceUsage: {
            cpu: metrics.metrics?.resourceUsage?.cpu || currentResourceUsage.cpu,
            memory: metrics.metrics?.resourceUsage?.memory || currentResourceUsage.memory,
            network: metrics.metrics?.resourceUsage?.network || currentResourceUsage.network,
          },
          throughput: metrics.metrics?.throughput,
          latency: metrics.metrics?.latency,
          errorRate: metrics.metrics?.errorRate,
        },
        timestamp: new Date().toISOString(),
      }

      // Add to buffer
      buffer.metrics.push(fullMetrics)

      // Update block metrics
      const blockMetric = this.updateBlockMetrics(buffer, blockId, fullMetrics)

      // Emit performance event
      const performanceEvent: PerformanceEvent = {
        type: 'performance_metrics_collected',
        source: 'performance',
        timestamp: fullMetrics.timestamp,
        executionId,
        workflowId: buffer.workflowId,
        data: fullMetrics,
      }
      this.emit('metrics_collected', performanceEvent)

      logger.debug(`[${operationId}] Metrics collected and buffered`, {
        executionId,
        blockId,
        metricsCount: buffer.metrics.length,
        executionTime: fullMetrics.metrics.executionTime,
        resourceUsage: fullMetrics.metrics.resourceUsage,
      })

      // Check for performance anomalies
      await this.detectPerformanceAnomalies(buffer, blockMetric)
    } catch (error) {
      logger.error(`[${operationId}] Error collecting performance metrics:`, error)
      throw error
    }
  }

  /**
   * Get performance metrics based on query parameters
   */
  async getMetrics(query: MetricsQuery): Promise<PerformanceMetrics[]> {
    const operationId = `get-metrics-${Date.now()}`
    logger.debug(`[${operationId}] Querying performance metrics`, {
      workflowIds: query.workflowIds?.length,
      executionIds: query.executionIds?.length,
      timeRange: query.timeRange,
    })

    try {
      const startTime = new Date(query.timeRange.start).getTime()
      const endTime = new Date(query.timeRange.end).getTime()
      const results: PerformanceMetrics[] = []

      // Search through buffered metrics
      for (const buffer of this.metricsBuffers.values()) {
        // Filter by workflow ID if specified
        if (query.workflowIds && !query.workflowIds.includes(buffer.workflowId)) {
          continue
        }

        // Filter by execution ID if specified
        if (query.executionIds && !query.executionIds.includes(buffer.executionId)) {
          continue
        }

        // Filter metrics by time range and other criteria
        const filteredMetrics = buffer.metrics.filter((metric) => {
          const metricTime = new Date(metric.timestamp).getTime()

          // Check time range
          if (metricTime < startTime || metricTime > endTime) {
            return false
          }

          // Filter by block IDs if specified
          if (query.blockIds && metric.blockId && !query.blockIds.includes(metric.blockId)) {
            return false
          }

          return true
        })

        results.push(...filteredMetrics)
      }

      // Sort by timestamp
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // Apply aggregation if specified
      if (query.aggregation) {
        return this.aggregateMetrics(results, query)
      }

      logger.debug(`[${operationId}] Retrieved ${results.length} performance metrics`)
      return results
    } catch (error) {
      logger.error(`[${operationId}] Error retrieving performance metrics:`, error)
      throw error
    }
  }

  /**
   * Analyze bottlenecks for a specific workflow
   */
  async analyzeBottlenecks(
    workflowId: string,
    timeRange: TimeRange
  ): Promise<BottleneckAnalysis[]> {
    const operationId = `analyze-bottlenecks-${workflowId}-${Date.now()}`
    logger.debug(`[${operationId}] Analyzing bottlenecks for workflow ${workflowId}`)

    try {
      const metrics = await this.getMetrics({
        workflowIds: [workflowId],
        timeRange,
      })

      if (metrics.length === 0) {
        logger.debug(`[${operationId}] No metrics available for bottleneck analysis`)
        return []
      }

      const bottlenecks: BottleneckAnalysis[] = []

      // Group metrics by block
      const blockMetricsMap = new Map<string, PerformanceMetrics[]>()
      for (const metric of metrics) {
        if (metric.blockId) {
          if (!blockMetricsMap.has(metric.blockId)) {
            blockMetricsMap.set(metric.blockId, [])
          }
          blockMetricsMap.get(metric.blockId)!.push(metric)
        }
      }

      // Calculate execution time statistics
      const allExecutionTimes = metrics.map((m) => m.metrics.executionTime)
      const avgExecutionTime =
        allExecutionTimes.reduce((sum, time) => sum + time, 0) / allExecutionTimes.length
      const p95ExecutionTime = this.calculatePercentile(allExecutionTimes, 95)

      // Analyze each block for bottlenecks
      for (const [blockId, blockMetrics] of blockMetricsMap.entries()) {
        const blockExecutionTimes = blockMetrics.map((m) => m.metrics.executionTime)
        const blockAvgTime =
          blockExecutionTimes.reduce((sum, time) => sum + time, 0) / blockExecutionTimes.length
        const blockP95Time = this.calculatePercentile(blockExecutionTimes, 95)

        // Check for slow blocks
        if (blockAvgTime > avgExecutionTime * 2) {
          bottlenecks.push({
            type: 'slow_block',
            blockId,
            blockName: `Block ${blockId}`,
            severity: blockAvgTime > avgExecutionTime * 5 ? 'critical' : 'high',
            impact: blockAvgTime - avgExecutionTime,
            recommendation: `Optimize block ${blockId} - execution time is ${(blockAvgTime / avgExecutionTime).toFixed(1)}x slower than average`,
            details: {
              averageExecutionTime: blockAvgTime,
              workflowAverageExecutionTime: avgExecutionTime,
              p95ExecutionTime: blockP95Time,
              executionCount: blockMetrics.length,
            },
          })
        }

        // Check for resource constraints
        const avgCpuUsage =
          blockMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.cpu, 0) /
          blockMetrics.length
        const avgMemoryUsage =
          blockMetrics.reduce((sum, m) => sum + m.metrics.resourceUsage.memory, 0) /
          blockMetrics.length

        if (avgCpuUsage > 80) {
          bottlenecks.push({
            type: 'resource_constraint',
            blockId,
            blockName: `Block ${blockId}`,
            severity: avgCpuUsage > 95 ? 'critical' : 'high',
            impact: blockAvgTime * (avgCpuUsage / 100),
            recommendation: `High CPU usage (${avgCpuUsage.toFixed(1)}%) in block ${blockId} - consider optimization or scaling`,
            details: {
              averageCpuUsage: avgCpuUsage,
              averageMemoryUsage: avgMemoryUsage,
              executionCount: blockMetrics.length,
            },
          })
        }

        // Check for high error rates
        const errorRates = blockMetrics
          .map((m) => m.metrics.errorRate)
          .filter((rate) => rate !== undefined) as number[]
        if (errorRates.length > 0) {
          const avgErrorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length

          if (avgErrorRate > 5) {
            // More than 5% error rate
            bottlenecks.push({
              type: 'external_api',
              blockId,
              blockName: `Block ${blockId}`,
              severity: avgErrorRate > 20 ? 'critical' : avgErrorRate > 10 ? 'high' : 'medium',
              impact: blockAvgTime * (avgErrorRate / 100),
              recommendation: `High error rate (${avgErrorRate.toFixed(1)}%) in block ${blockId} - check external API reliability`,
              details: {
                averageErrorRate: avgErrorRate,
                executionCount: blockMetrics.length,
                errorCount: Math.round((blockMetrics.length * avgErrorRate) / 100),
              },
            })
          }
        }
      }

      // Sort by impact (descending)
      bottlenecks.sort((a, b) => b.impact - a.impact)

      logger.debug(`[${operationId}] Identified ${bottlenecks.length} bottlenecks`, {
        criticalCount: bottlenecks.filter((b) => b.severity === 'critical').length,
        highCount: bottlenecks.filter((b) => b.severity === 'high').length,
        mediumCount: bottlenecks.filter((b) => b.severity === 'medium').length,
      })

      return bottlenecks
    } catch (error) {
      logger.error(`[${operationId}] Error analyzing bottlenecks:`, error)
      throw error
    }
  }

  /**
   * Start monitoring execution for performance tracking
   */
  async startExecutionMonitoring(executionId: string, workflowId: string): Promise<void> {
    logger.debug(`Starting performance monitoring for execution ${executionId}`)

    const buffer: MetricsBuffer = {
      executionId,
      workflowId,
      metrics: [],
      blockMetrics: new Map(),
      startTime: performance.now(),
      lastActivity: Date.now(),
    }

    this.metricsBuffers.set(executionId, buffer)
  }

  /**
   * Stop monitoring and flush metrics
   */
  async stopExecutionMonitoring(executionId: string): Promise<void> {
    logger.debug(`Stopping performance monitoring for execution ${executionId}`)

    const buffer = this.metricsBuffers.get(executionId)
    if (buffer) {
      // Emit final metrics
      this.emit('execution_monitoring_completed', {
        executionId,
        workflowId: buffer.workflowId,
        totalMetrics: buffer.metrics.length,
        duration: performance.now() - buffer.startTime,
        blockMetrics: Array.from(buffer.blockMetrics.values()),
      })

      // Remove buffer after delay to allow for final queries
      setTimeout(() => {
        this.metricsBuffers.delete(executionId)
      }, 60000) // 1 minute retention
    }
  }

  /**
   * Get current system resource usage
   */
  private async getCurrentResourceUsage(): Promise<ResourceSnapshot> {
    try {
      const memoryUsage = process.memoryUsage()

      return {
        timestamp: Date.now(),
        cpu: process.cpuUsage().user / 1000000, // Convert to percentage (approximation)
        memory: memoryUsage.heapUsed,
        networkIn: 0, // Would need platform-specific implementation
        networkOut: 0, // Would need platform-specific implementation
      }
    } catch (error) {
      logger.warn('Error getting resource usage, using defaults:', error)
      return {
        timestamp: Date.now(),
        cpu: 0,
        memory: 0,
        networkIn: 0,
        networkOut: 0,
      }
    }
  }

  /**
   * Update block-level metrics aggregation
   */
  private updateBlockMetrics(
    buffer: MetricsBuffer,
    blockId: string,
    metrics: PerformanceMetrics
  ): BlockMetrics {
    let blockMetric = buffer.blockMetrics.get(blockId)

    if (!blockMetric) {
      blockMetric = {
        blockId,
        blockName: `Block ${blockId}`,
        blockType: 'unknown',
        executionTime: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0,
        },
        inputSize: 0,
        outputSize: 0,
        errorCount: 0,
        successCount: 0,
      }
      buffer.blockMetrics.set(blockId, blockMetric)
    }

    // Update aggregated metrics
    const count = blockMetric.successCount + blockMetric.errorCount + 1

    // Incremental average calculation
    blockMetric.executionTime =
      (blockMetric.executionTime * (count - 1) + metrics.metrics.executionTime) / count
    blockMetric.resourceUsage.cpu =
      (blockMetric.resourceUsage.cpu * (count - 1) + metrics.metrics.resourceUsage.cpu) / count
    blockMetric.resourceUsage.memory =
      (blockMetric.resourceUsage.memory * (count - 1) + metrics.metrics.resourceUsage.memory) /
      count
    blockMetric.resourceUsage.network =
      (blockMetric.resourceUsage.network * (count - 1) + metrics.metrics.resourceUsage.network) /
      count

    // Update success/error counts
    if (metrics.metrics.errorRate && metrics.metrics.errorRate > 0) {
      blockMetric.errorCount++
    } else {
      blockMetric.successCount++
    }

    return blockMetric
  }

  /**
   * Aggregate metrics based on query parameters
   */
  private aggregateMetrics(
    metrics: PerformanceMetrics[],
    query: MetricsQuery
  ): PerformanceMetrics[] {
    if (!query.aggregation || !query.groupBy || query.groupBy.length === 0) {
      return metrics
    }

    const groups = new Map<string, PerformanceMetrics[]>()

    // Group metrics
    for (const metric of metrics) {
      const groupKey = this.generateGroupKey(metric, query.groupBy)
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(metric)
    }

    // Aggregate each group
    const aggregatedMetrics: PerformanceMetrics[] = []
    for (const [groupKey, groupMetrics] of groups.entries()) {
      const aggregated = this.aggregateMetricGroup(groupMetrics, query.aggregation)
      aggregatedMetrics.push(aggregated)
    }

    return aggregatedMetrics
  }

  /**
   * Generate grouping key based on groupBy criteria
   */
  private generateGroupKey(
    metric: PerformanceMetrics,
    groupBy: ('workflow' | 'block' | 'hour' | 'day')[]
  ): string {
    const parts: string[] = []

    for (const criteria of groupBy) {
      switch (criteria) {
        case 'workflow':
          parts.push(`w:${metric.workflowId}`)
          break
        case 'block':
          parts.push(`b:${metric.blockId || 'unknown'}`)
          break
        case 'hour': {
          const hour = new Date(metric.timestamp).toISOString().slice(0, 13)
          parts.push(`h:${hour}`)
          break
        }
        case 'day': {
          const day = new Date(metric.timestamp).toISOString().slice(0, 10)
          parts.push(`d:${day}`)
          break
        }
      }
    }

    return parts.join('|')
  }

  /**
   * Aggregate a group of metrics
   */
  private aggregateMetricGroup(
    metrics: PerformanceMetrics[],
    aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count'
  ): PerformanceMetrics {
    const executionTimes = metrics.map((m) => m.metrics.executionTime)
    const cpuUsages = metrics.map((m) => m.metrics.resourceUsage.cpu)
    const memoryUsages = metrics.map((m) => m.metrics.resourceUsage.memory)
    const networkUsages = metrics.map((m) => m.metrics.resourceUsage.network)

    let aggregatedExecutionTime: number
    let aggregatedCpu: number
    let aggregatedMemory: number
    let aggregatedNetwork: number

    switch (aggregation) {
      case 'avg':
        aggregatedExecutionTime =
          executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        aggregatedCpu = cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length
        aggregatedMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length
        aggregatedNetwork = networkUsages.reduce((sum, net) => sum + net, 0) / networkUsages.length
        break
      case 'sum':
        aggregatedExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0)
        aggregatedCpu = cpuUsages.reduce((sum, cpu) => sum + cpu, 0)
        aggregatedMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0)
        aggregatedNetwork = networkUsages.reduce((sum, net) => sum + net, 0)
        break
      case 'max':
        aggregatedExecutionTime = Math.max(...executionTimes)
        aggregatedCpu = Math.max(...cpuUsages)
        aggregatedMemory = Math.max(...memoryUsages)
        aggregatedNetwork = Math.max(...networkUsages)
        break
      case 'min':
        aggregatedExecutionTime = Math.min(...executionTimes)
        aggregatedCpu = Math.min(...cpuUsages)
        aggregatedMemory = Math.min(...memoryUsages)
        aggregatedNetwork = Math.min(...networkUsages)
        break
      case 'count':
        aggregatedExecutionTime = metrics.length
        aggregatedCpu = metrics.length
        aggregatedMemory = metrics.length
        aggregatedNetwork = metrics.length
        break
      default:
        throw new Error(`Unsupported aggregation: ${aggregation}`)
    }

    return {
      executionId: `aggregated-${Date.now()}`,
      workflowId: metrics[0]?.workflowId || 'unknown',
      blockId: metrics[0]?.blockId,
      metrics: {
        executionTime: aggregatedExecutionTime,
        resourceUsage: {
          cpu: aggregatedCpu,
          memory: aggregatedMemory,
          network: aggregatedNetwork,
        },
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Calculate percentile for a set of values
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)] || 0
  }

  /**
   * Detect performance anomalies and emit alerts
   */
  private async detectPerformanceAnomalies(
    buffer: MetricsBuffer,
    blockMetric: BlockMetrics
  ): Promise<void> {
    try {
      // Check for execution time spikes
      if (blockMetric.executionTime > 30000) {
        // More than 30 seconds
        this.emit('performance_anomaly', {
          type: 'execution_time_spike',
          executionId: buffer.executionId,
          workflowId: buffer.workflowId,
          blockId: blockMetric.blockId,
          severity: blockMetric.executionTime > 60000 ? 'critical' : 'high',
          details: {
            executionTime: blockMetric.executionTime,
            blockName: blockMetric.blockName,
          },
        })
      }

      // Check for resource usage spikes
      if (blockMetric.resourceUsage.cpu > 90) {
        this.emit('performance_anomaly', {
          type: 'high_cpu_usage',
          executionId: buffer.executionId,
          workflowId: buffer.workflowId,
          blockId: blockMetric.blockId,
          severity: blockMetric.resourceUsage.cpu > 95 ? 'critical' : 'high',
          details: {
            cpuUsage: blockMetric.resourceUsage.cpu,
            blockName: blockMetric.blockName,
          },
        })
      }

      // Check for high memory usage
      if (blockMetric.resourceUsage.memory > 1024 * 1024 * 1024) {
        // More than 1GB
        this.emit('performance_anomaly', {
          type: 'high_memory_usage',
          executionId: buffer.executionId,
          workflowId: buffer.workflowId,
          blockId: blockMetric.blockId,
          severity: blockMetric.resourceUsage.memory > 2 * 1024 * 1024 * 1024 ? 'critical' : 'high', // 2GB
          details: {
            memoryUsage: blockMetric.resourceUsage.memory,
            blockName: blockMetric.blockName,
          },
        })
      }
    } catch (error) {
      logger.error('Error detecting performance anomalies:', error)
    }
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.resourceMonitorInterval = setInterval(async () => {
      try {
        const snapshot = await this.getCurrentResourceUsage()

        if (!this.resourceBaseline) {
          this.resourceBaseline = snapshot
        }

        // Emit resource usage event
        this.emit('resource_usage', {
          current: snapshot,
          baseline: this.resourceBaseline,
          delta: {
            cpu: snapshot.cpu - this.resourceBaseline.cpu,
            memory: snapshot.memory - this.resourceBaseline.memory,
            networkIn: snapshot.networkIn - this.resourceBaseline.networkIn,
            networkOut: snapshot.networkOut - this.resourceBaseline.networkOut,
          },
        })
      } catch (error) {
        logger.warn('Error monitoring resource usage:', error)
      }
    }, this.RESOURCE_MONITOR_INTERVAL_MS)
  }

  /**
   * Flush stale metrics buffers
   */
  private flushStaleBuffers(): void {
    const now = Date.now()
    let flushedCount = 0

    for (const [executionId, buffer] of this.metricsBuffers.entries()) {
      if (now - buffer.lastActivity > this.BUFFER_RETENTION_MS) {
        this.metricsBuffers.delete(executionId)
        flushedCount++
      }
    }

    if (flushedCount > 0) {
      logger.debug(`Flushed ${flushedCount} stale metrics buffers`)
    }
  }

  /**
   * Get collector statistics
   */
  getCollectorStats(): {
    activeBuffers: number
    totalMetrics: number
    memoryUsage: number
  } {
    let totalMetrics = 0
    for (const buffer of this.metricsBuffers.values()) {
      totalMetrics += buffer.metrics.length
    }

    return {
      activeBuffers: this.metricsBuffers.size,
      totalMetrics,
      memoryUsage: process.memoryUsage().heapUsed,
    }
  }

  /**
   * Destroy the collector and cleanup resources
   */
  destroy(): void {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval)
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    this.metricsBuffers.clear()
    this.removeAllListeners()

    logger.info('PerformanceCollector destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const performanceCollector = PerformanceCollector.getInstance()
