/**
 * ReactFlow Performance Monitoring System
 *
 * Monitors performance of ReactFlow operations to ensure that adding
 * conversational capabilities doesn't degrade visual editor performance.
 *
 * Key Metrics:
 * - Render time for workflows of different sizes
 * - Memory usage patterns
 * - Operation execution times
 * - Frame rate during interactions
 * - Network latency for collaborative features
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ReactFlowPerformanceMonitor')

// Performance thresholds (based on ReactFlow best practices)
export interface PerformanceThresholds {
  renderTime: {
    smallWorkflow: number // < 20 nodes
    mediumWorkflow: number // 20-100 nodes
    largeWorkflow: number // > 100 nodes
  }
  memoryUsage: {
    baseline: number // Initial memory usage
    maxIncrease: number // Maximum acceptable increase
    perNode: number // Memory per additional node
  }
  operationTime: {
    nodeAddition: number
    edgeCreation: number
    nodeMovement: number
    autoLayout: number
    save: number
  }
  frameRate: {
    minimum: number // FPS during interactions
    target: number // Target FPS
  }
  network: {
    collaborativeSync: number // ms
    dataLoad: number // ms
  }
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  renderTime: {
    smallWorkflow: 50, // ms
    mediumWorkflow: 200, // ms
    largeWorkflow: 500, // ms
  },
  memoryUsage: {
    baseline: 50 * 1024 * 1024, // 50MB
    maxIncrease: 100 * 1024 * 1024, // 100MB max increase
    perNode: 0.5 * 1024 * 1024, // 0.5MB per node
  },
  operationTime: {
    nodeAddition: 25, // ms
    edgeCreation: 15, // ms
    nodeMovement: 10, // ms
    autoLayout: 1000, // ms
    save: 100, // ms
  },
  frameRate: {
    minimum: 30, // FPS
    target: 60, // FPS
  },
  network: {
    collaborativeSync: 150, // ms
    dataLoad: 300, // ms
  },
}

export interface PerformanceMetric {
  timestamp: Date
  workflowId: string
  metric: keyof PerformanceThresholds
  subMetric: string
  value: number
  threshold: number
  passed: boolean
  context?: Record<string, any>
}

export interface PerformanceSample {
  id: string
  workflowId: string
  timestamp: Date
  nodeCount: number
  edgeCount: number
  containerCount: number
  operationType: string
  metrics: {
    renderTime?: number
    memoryBefore?: number
    memoryAfter?: number
    operationTime?: number
    frameRate?: number
    networkLatency?: number
  }
  userAgent: string
  viewport: { width: number; height: number }
}

export interface PerformanceAlert {
  id: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  message: string
  impact: string
  recommendation: string
  workflowId?: string
  affectedUsers?: string[]
}

/**
 * Performance monitoring system for ReactFlow workflows
 */
export class ReactFlowPerformanceMonitor {
  private samples: Map<string, PerformanceSample[]> = new Map()
  private alerts: PerformanceAlert[] = []
  private thresholds: PerformanceThresholds
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private frameRateMonitor?: FrameRateMonitor
  private memoryMonitor?: MemoryMonitor

  constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds
    this.frameRateMonitor = new FrameRateMonitor()
    this.memoryMonitor = new MemoryMonitor()
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(workflowId: string): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    logger.info('Starting ReactFlow performance monitoring', { workflowId })

    // Initialize sample storage
    if (!this.samples.has(workflowId)) {
      this.samples.set(workflowId, [])
    }

    // Start frame rate monitoring
    this.frameRateMonitor?.start()

    // Start memory monitoring
    this.memoryMonitor?.start()

    // Set up periodic sampling
    this.monitoringInterval = setInterval(() => {
      this.collectSample(workflowId)
    }, 5000) // Every 5 seconds

    // Monitor DOM mutations for workflow changes
    this.setupMutationObserver(workflowId)

    // Monitor performance API
    this.setupPerformanceObserver()
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(workflowId: string): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    logger.info('Stopping ReactFlow performance monitoring', { workflowId })

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    this.frameRateMonitor?.stop()
    this.memoryMonitor?.stop()
  }

  /**
   * Measure operation performance
   */
  async measureOperation<T>(
    workflowId: string,
    operationType: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetric[] }> {
    const startTime = performance.now()
    const memoryBefore = this.memoryMonitor?.getCurrentUsage() || 0

    try {
      const result = await operation()
      const endTime = performance.now()
      const memoryAfter = this.memoryMonitor?.getCurrentUsage() || 0

      const operationTime = endTime - startTime
      const memoryIncrease = memoryAfter - memoryBefore

      // Create performance sample
      const sample: PerformanceSample = {
        id: crypto.randomUUID(),
        workflowId,
        timestamp: new Date(),
        nodeCount: this.getNodeCount(),
        edgeCount: this.getEdgeCount(),
        containerCount: this.getContainerCount(),
        operationType,
        metrics: {
          operationTime,
          memoryBefore,
          memoryAfter,
        },
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      }

      // Store sample
      const samples = this.samples.get(workflowId) || []
      samples.push(sample)
      this.samples.set(workflowId, samples)

      // Generate performance metrics
      const metrics = this.generateMetrics(sample)

      // Check for alerts
      this.checkAlerts(workflowId, metrics)

      logger.info('Operation performance measured', {
        workflowId,
        operationType,
        operationTime,
        memoryIncrease,
        metricsCount: metrics.length,
      })

      return { result, metrics }
    } catch (error) {
      logger.error('Operation failed during performance measurement', {
        workflowId,
        operationType,
        error,
      })
      throw error
    }
  }

  /**
   * Get performance statistics for a workflow
   */
  getStatistics(workflowId: string): {
    totalSamples: number
    averageRenderTime: number
    averageMemoryUsage: number
    alertCount: number
    performanceScore: number
    trends: {
      renderTime: 'improving' | 'stable' | 'degrading'
      memoryUsage: 'improving' | 'stable' | 'degrading'
    }
  } {
    const samples = this.samples.get(workflowId) || []
    if (samples.length === 0) {
      return {
        totalSamples: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        alertCount: 0,
        performanceScore: 100,
        trends: { renderTime: 'stable', memoryUsage: 'stable' },
      }
    }

    const renderTimes = samples
      .map((s) => s.metrics.renderTime)
      .filter((t): t is number => t !== undefined)
    const memoryUsages = samples
      .map((s) => s.metrics.memoryAfter)
      .filter((m): m is number => m !== undefined)

    const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length || 0
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length || 0

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(workflowId, samples)

    // Analyze trends
    const trends = this.analyzeTrends(samples)

    // Count alerts
    const alertCount = this.alerts.filter((a) => a.workflowId === workflowId).length

    return {
      totalSamples: samples.length,
      averageRenderTime,
      averageMemoryUsage,
      alertCount,
      performanceScore,
      trends,
    }
  }

  /**
   * Get current performance alerts
   */
  getAlerts(workflowId?: string): PerformanceAlert[] {
    if (workflowId) {
      return this.alerts.filter((alert) => alert.workflowId === workflowId)
    }
    return [...this.alerts]
  }

  /**
   * Clear alerts
   */
  clearAlerts(workflowId?: string): void {
    if (workflowId) {
      this.alerts = this.alerts.filter((alert) => alert.workflowId !== workflowId)
    } else {
      this.alerts = []
    }
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    logger.info('Performance thresholds updated', { thresholds: this.thresholds })
  }

  /**
   * Export performance data
   */
  exportData(workflowId?: string): {
    samples: PerformanceSample[]
    alerts: PerformanceAlert[]
    statistics: any
    exportedAt: Date
  } {
    const samples = workflowId
      ? this.samples.get(workflowId) || []
      : Array.from(this.samples.values()).flat()

    const alerts = workflowId ? this.getAlerts(workflowId) : this.alerts

    const statistics = workflowId ? this.getStatistics(workflowId) : this.getGlobalStatistics()

    return {
      samples,
      alerts,
      statistics,
      exportedAt: new Date(),
    }
  }

  // Private methods

  private collectSample(workflowId: string): void {
    const sample: PerformanceSample = {
      id: crypto.randomUUID(),
      workflowId,
      timestamp: new Date(),
      nodeCount: this.getNodeCount(),
      edgeCount: this.getEdgeCount(),
      containerCount: this.getContainerCount(),
      operationType: 'periodic_sample',
      metrics: {
        memoryAfter: this.memoryMonitor?.getCurrentUsage() || 0,
        frameRate: this.frameRateMonitor?.getCurrentFrameRate() || 0,
      },
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }

    const samples = this.samples.get(workflowId) || []
    samples.push(sample)

    // Keep only last 1000 samples per workflow
    if (samples.length > 1000) {
      samples.splice(0, samples.length - 1000)
    }

    this.samples.set(workflowId, samples)

    // Generate and check metrics
    const metrics = this.generateMetrics(sample)
    this.checkAlerts(workflowId, metrics)
  }

  private generateMetrics(sample: PerformanceSample): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = []

    // Operation time metrics
    if (sample.metrics.operationTime !== undefined) {
      const threshold = this.getOperationThreshold(sample.operationType)
      metrics.push({
        timestamp: sample.timestamp,
        workflowId: sample.workflowId,
        metric: 'operationTime',
        subMetric: sample.operationType,
        value: sample.metrics.operationTime,
        threshold,
        passed: sample.metrics.operationTime <= threshold,
        context: { nodeCount: sample.nodeCount, edgeCount: sample.edgeCount },
      })
    }

    // Memory usage metrics
    if (sample.metrics.memoryAfter !== undefined) {
      const expectedMemory = this.calculateExpectedMemory(sample.nodeCount)
      metrics.push({
        timestamp: sample.timestamp,
        workflowId: sample.workflowId,
        metric: 'memoryUsage',
        subMetric: 'current',
        value: sample.metrics.memoryAfter,
        threshold: expectedMemory,
        passed: sample.metrics.memoryAfter <= expectedMemory,
        context: { nodeCount: sample.nodeCount },
      })
    }

    // Frame rate metrics
    if (sample.metrics.frameRate !== undefined) {
      metrics.push({
        timestamp: sample.timestamp,
        workflowId: sample.workflowId,
        metric: 'frameRate',
        subMetric: 'current',
        value: sample.metrics.frameRate,
        threshold: this.thresholds.frameRate.minimum,
        passed: sample.metrics.frameRate >= this.thresholds.frameRate.minimum,
      })
    }

    return metrics
  }

  private checkAlerts(workflowId: string, metrics: PerformanceMetric[]): void {
    metrics.forEach((metric) => {
      if (!metric.passed) {
        this.createAlert(metric)
      }
    })
  }

  private createAlert(metric: PerformanceMetric): void {
    const severity = this.calculateAlertSeverity(metric)
    const alert: PerformanceAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      severity,
      metric: `${metric.metric}.${metric.subMetric}`,
      message: this.generateAlertMessage(metric),
      impact: this.generateImpactAssessment(metric),
      recommendation: this.generateRecommendation(metric),
      workflowId: metric.workflowId,
    }

    this.alerts.push(alert)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100)
    }

    logger.warn('Performance alert created', alert)
  }

  private generateAlertMessage(metric: PerformanceMetric): string {
    const percentage = Math.round(((metric.value - metric.threshold) / metric.threshold) * 100)
    return `${metric.metric}.${metric.subMetric} exceeded threshold by ${percentage}% (${metric.value} vs ${metric.threshold})`
  }

  private generateImpactAssessment(metric: PerformanceMetric): string {
    switch (metric.metric) {
      case 'operationTime':
        return 'User interactions may feel sluggish'
      case 'memoryUsage':
        return 'Browser may become unresponsive with large workflows'
      case 'frameRate':
        return 'Animations and interactions may appear choppy'
      default:
        return 'Performance degradation detected'
    }
  }

  private generateRecommendation(metric: PerformanceMetric): string {
    switch (metric.metric) {
      case 'operationTime':
        return 'Consider debouncing operations or implementing operation batching'
      case 'memoryUsage':
        return 'Implement node virtualization for large workflows'
      case 'frameRate':
        return 'Reduce animation complexity or implement frame rate limiting'
      default:
        return 'Review implementation for optimization opportunities'
    }
  }

  private calculateAlertSeverity(metric: PerformanceMetric): PerformanceAlert['severity'] {
    const ratio = metric.value / metric.threshold
    if (ratio > 3) return 'critical'
    if (ratio > 2) return 'high'
    if (ratio > 1.5) return 'medium'
    return 'low'
  }

  private calculatePerformanceScore(workflowId: string, samples: PerformanceSample[]): number {
    // Calculate score based on threshold compliance
    let totalChecks = 0
    let passedChecks = 0

    samples.forEach((sample) => {
      const metrics = this.generateMetrics(sample)
      totalChecks += metrics.length
      passedChecks += metrics.filter((m) => m.passed).length
    })

    return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100
  }

  private analyzeTrends(samples: PerformanceSample[]): {
    renderTime: 'improving' | 'stable' | 'degrading'
    memoryUsage: 'improving' | 'stable' | 'degrading'
  } {
    if (samples.length < 10) {
      return { renderTime: 'stable', memoryUsage: 'stable' }
    }

    // Analyze last 10 vs previous 10 samples
    const recentSamples = samples.slice(-10)
    const previousSamples = samples.slice(-20, -10)

    const recentRenderTime = this.average(
      recentSamples.map((s) => s.metrics.renderTime).filter(Boolean)
    )
    const previousRenderTime = this.average(
      previousSamples.map((s) => s.metrics.renderTime).filter(Boolean)
    )

    const recentMemory = this.average(
      recentSamples.map((s) => s.metrics.memoryAfter).filter(Boolean)
    )
    const previousMemory = this.average(
      previousSamples.map((s) => s.metrics.memoryAfter).filter(Boolean)
    )

    return {
      renderTime: this.calculateTrend(previousRenderTime, recentRenderTime),
      memoryUsage: this.calculateTrend(previousMemory, recentMemory),
    }
  }

  private calculateTrend(previous: number, recent: number): 'improving' | 'stable' | 'degrading' {
    if (previous === 0) return 'stable'

    const changePercent = ((recent - previous) / previous) * 100

    if (changePercent > 10) return 'degrading'
    if (changePercent < -10) return 'improving'
    return 'stable'
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private getOperationThreshold(operationType: string): number {
    switch (operationType) {
      case 'node_addition':
        return this.thresholds.operationTime.nodeAddition
      case 'edge_creation':
        return this.thresholds.operationTime.edgeCreation
      case 'node_movement':
        return this.thresholds.operationTime.nodeMovement
      case 'auto_layout':
        return this.thresholds.operationTime.autoLayout
      case 'save':
        return this.thresholds.operationTime.save
      default:
        return 100 // Default 100ms threshold
    }
  }

  private calculateExpectedMemory(nodeCount: number): number {
    return this.thresholds.memoryUsage.baseline + nodeCount * this.thresholds.memoryUsage.perNode
  }

  private getNodeCount(): number {
    return document.querySelectorAll('.react-flow__node').length
  }

  private getEdgeCount(): number {
    return document.querySelectorAll('.react-flow__edge').length
  }

  private getContainerCount(): number {
    return document.querySelectorAll('[data-testid="subflow-container"]').length
  }

  private getGlobalStatistics(): any {
    // Calculate global statistics across all workflows
    const allSamples = Array.from(this.samples.values()).flat()
    return {
      totalWorkflows: this.samples.size,
      totalSamples: allSamples.length,
      globalAlerts: this.alerts.length,
    }
  }

  private setupMutationObserver(workflowId: string): void {
    const observer = new MutationObserver((mutations) => {
      let shouldSample = false
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'childList' &&
          (mutation.target as Element).classList?.contains('react-flow__nodes')
        ) {
          shouldSample = true
        }
      })

      if (shouldSample) {
        this.collectSample(workflowId)
      }
    })

    const reactFlowContainer = document.querySelector('.react-flow')
    if (reactFlowContainer) {
      observer.observe(reactFlowContainer, { childList: true, subtree: true })
    }
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.Name.includes('react-flow')) {
            logger.debug('Performance entry captured', {
              Name: entry.Name,
              duration: entry.duration,
              startTime: entry.startTime,
            })
          }
        })
      })

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
    }
  }
}

/**
 * Frame rate monitoring utility
 */
class FrameRateMonitor {
  private isRunning = false
  private frameCount = 0
  private lastTime = 0
  private currentFrameRate = 60

  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTime = performance.now()
    this.frameCount = 0

    const measure = () => {
      if (!this.isRunning) return

      this.frameCount++
      const currentTime = performance.now()

      if (currentTime - this.lastTime >= 1000) {
        this.currentFrameRate = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
        this.frameCount = 0
        this.lastTime = currentTime
      }

      requestAnimationFrame(measure)
    }

    requestAnimationFrame(measure)
  }

  stop(): void {
    this.isRunning = false
  }

  getCurrentFrameRate(): number {
    return this.currentFrameRate
  }
}

/**
 * Memory monitoring utility
 */
class MemoryMonitor {
  private isRunning = false
  private currentUsage = 0

  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.updateMemoryUsage()

    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval)
        return
      }
      this.updateMemoryUsage()
    }, 1000)
  }

  stop(): void {
    this.isRunning = false
  }

  getCurrentUsage(): number {
    return this.currentUsage
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      this.currentUsage = (performance as any).memory.usedJSHeapSize
    }
  }
}

// Global instance
export const reactFlowPerformanceMonitor = new ReactFlowPerformanceMonitor()

export default reactFlowPerformanceMonitor
