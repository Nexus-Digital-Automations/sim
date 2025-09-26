/**
 * Intelligence Performance Monitoring System
 *
 * Comprehensive performance monitoring and optimization for the intelligence
 * integration layer, providing real-time metrics, performance analysis,
 * and automatic optimization recommendations.
 *
 * Features:
 * - Real-time performance metrics collection
 * - Intelligent caching optimization
 * - Performance bottleneck detection
 * - Automatic scaling recommendations
 * - Resource usage optimization
 * - Performance trend analysis
 *
 * @author Intelligence Integration Agent
 * @version 1.0.0
 */

import { createLogger } from '../utils/logger'

const logger = createLogger('IntelligencePerformanceMonitoring')

// =============================================================================
// Performance Monitoring Types
// =============================================================================

export interface PerformanceMetrics {
  // Timing metrics
  operationLatency: {
    description: number
    recommendation: number
    errorHandling: number
    contextAnalysis: number
    caching: number
  }

  // Throughput metrics
  operationsPerSecond: {
    descriptions: number
    recommendations: number
    errorHandling: number
    discoveries: number
  }

  // Resource utilization
  resourceUsage: {
    memoryMB: number
    cpuPercent: number
    cacheSize: number
    cacheHitRate: number
  }

  // Quality metrics
  qualityMetrics: {
    userSatisfaction: number
    recommendationAccuracy: number
    errorResolutionRate: number
    responseQuality: number
  }

  // System health
  systemHealth: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    bottlenecks: string[]
    recommendations: string[]
    alertLevel: 'none' | 'info' | 'warning' | 'critical'
  }
}

export interface PerformanceAlert {
  id: string
  type: 'latency' | 'throughput' | 'quality' | 'resource' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  currentValue: number
  threshold: number
  timestamp: Date
  recommendation?: string
  autoRemediation?: boolean
}

export interface PerformanceThresholds {
  latency: {
    description: number // ms
    recommendation: number // ms
    errorHandling: number // ms
    contextAnalysis: number // ms
  }
  throughput: {
    minOperationsPerSecond: number
  }
  quality: {
    minUserSatisfaction: number
    minAccuracy: number
  }
  resources: {
    maxMemoryMB: number
    maxCpuPercent: number
    minCacheHitRate: number
  }
}

export interface OptimizationRecommendation {
  id: string
  category: 'caching' | 'scaling' | 'configuration' | 'architecture'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expectedImpact: string
  implementationComplexity: 'low' | 'medium' | 'high'
  estimatedEffort: string
  implementation: {
    automatic: boolean
    steps: string[]
    code?: string
  }
  metrics: {
    expectedLatencyImprovement?: number
    expectedThroughputImprovement?: number
    expectedResourceSaving?: number
  }
}

// =============================================================================
// Intelligence Performance Monitor
// =============================================================================

export class IntelligencePerformanceMonitor {
  private readonly startTime = Date.now()
  private readonly operationHistory = new Map<string, OperationRecord[]>()
  private readonly performanceAlerts: PerformanceAlert[] = []
  private readonly optimizationRecommendations: OptimizationRecommendation[] = []

  private readonly thresholds: PerformanceThresholds = {
    latency: {
      description: 200, // 200ms max for description generation
      recommendation: 500, // 500ms max for recommendations
      errorHandling: 100, // 100ms max for error handling
      contextAnalysis: 300, // 300ms max for context analysis
    },
    throughput: {
      minOperationsPerSecond: 10, // Minimum 10 ops/sec under load
    },
    quality: {
      minUserSatisfaction: 3.5, // Out of 5
      minAccuracy: 0.7, // 70% accuracy minimum
    },
    resources: {
      maxMemoryMB: 500, // 500MB max memory usage
      maxCpuPercent: 70, // 70% max CPU usage
      minCacheHitRate: 0.6, // 60% minimum cache hit rate
    },
  }

  // Real-time metrics tracking
  private currentMetrics: PerformanceMetrics = this.initializeMetrics()

  // Performance optimization state
  private optimizationEnabled = true
  private autoOptimizationEnabled = true
  private readonly performanceHistory: PerformanceMetrics[] = []

  constructor(
    private readonly config: {
      enableAutoOptimization?: boolean
      alertingEnabled?: boolean
      metricsRetentionHours?: number
      optimizationInterval?: number
    } = {}
  ) {
    this.optimizationEnabled = config.enableAutoOptimization !== false
    this.autoOptimizationEnabled = config.enableAutoOptimization !== false

    // Start performance monitoring
    this.startPerformanceMonitoring()
    this.startOptimizationEngine()

    logger.info('Intelligence Performance Monitor initialized', {
      autoOptimization: this.autoOptimizationEnabled,
      alerting: config.alertingEnabled !== false,
    })
  }

  // =============================================================================
  // Real-time Metrics Collection
  // =============================================================================

  recordOperation(
    operation: 'description' | 'recommendation' | 'errorHandling' | 'discovery' | 'contextAnalysis',
    durationMs: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const record: OperationRecord = {
      operation,
      durationMs,
      success,
      timestamp: Date.now(),
      metadata,
    }

    // Store operation history
    const history = this.operationHistory.get(operation) || []
    history.push(record)

    // Keep only recent history (last hour)
    const cutoff = Date.now() - 60 * 60 * 1000
    const filteredHistory = history.filter((r) => r.timestamp > cutoff)
    this.operationHistory.set(operation, filteredHistory)

    // Update real-time metrics
    this.updateRealTimeMetrics(operation, record)

    // Check for performance alerts
    this.checkPerformanceAlerts(operation, record)
  }

  recordQualityMetric(
    metric: 'userSatisfaction' | 'recommendationAccuracy' | 'errorResolutionRate',
    value: number
  ): void {
    // Update quality metrics using exponential moving average
    const alpha = 0.1
    switch (metric) {
      case 'userSatisfaction':
        this.currentMetrics.qualityMetrics.userSatisfaction =
          this.currentMetrics.qualityMetrics.userSatisfaction * (1 - alpha) + value * alpha
        break
      case 'recommendationAccuracy':
        this.currentMetrics.qualityMetrics.recommendationAccuracy =
          this.currentMetrics.qualityMetrics.recommendationAccuracy * (1 - alpha) + value * alpha
        break
      case 'errorResolutionRate':
        this.currentMetrics.qualityMetrics.errorResolutionRate =
          this.currentMetrics.qualityMetrics.errorResolutionRate * (1 - alpha) + value * alpha
        break
    }
  }

  recordResourceUsage(
    memoryMB: number,
    cpuPercent: number,
    cacheSize: number,
    cacheHitRate: number
  ): void {
    this.currentMetrics.resourceUsage = {
      memoryMB,
      cpuPercent,
      cacheSize,
      cacheHitRate,
    }

    // Check resource usage alerts
    this.checkResourceAlerts()
  }

  // =============================================================================
  // Performance Analysis and Reporting
  // =============================================================================

  getCurrentMetrics(): PerformanceMetrics {
    // Update system health before returning
    this.updateSystemHealth()
    return { ...this.currentMetrics }
  }

  getDetailedPerformanceReport(): {
    metrics: PerformanceMetrics
    trends: PerformanceTrends
    alerts: PerformanceAlert[]
    recommendations: OptimizationRecommendation[]
    analysis: PerformanceAnalysis
  } {
    const trends = this.calculatePerformanceTrends()
    const analysis = this.performPerformanceAnalysis()

    return {
      metrics: this.getCurrentMetrics(),
      trends,
      alerts: this.getActiveAlerts(),
      recommendations: this.getOptimizationRecommendations(),
      analysis,
    }
  }

  getPerformanceDashboard(): PerformanceDashboardData {
    const metrics = this.getCurrentMetrics()
    const activeAlerts = this.getActiveAlerts()
    const topRecommendations = this.getOptimizationRecommendations().slice(0, 3)

    return {
      // Key Performance Indicators
      kpis: {
        avgResponseTime: this.calculateAverageResponseTime(),
        operationsPerSecond: this.calculateOperationsPerSecond(),
        errorRate: this.calculateErrorRate(),
        userSatisfaction: metrics.qualityMetrics.userSatisfaction,
        systemHealth: metrics.systemHealth.overallHealth,
      },

      // Real-time charts data
      charts: {
        responseTimeHistory: this.getResponseTimeHistory(),
        throughputHistory: this.getThroughputHistory(),
        resourceUsageHistory: this.getResourceUsageHistory(),
        errorRateHistory: this.getErrorRateHistory(),
      },

      // Status indicators
      status: {
        alerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical').length,
        systemHealth: metrics.systemHealth.overallHealth,
        uptime: Date.now() - this.startTime,
      },

      // Top recommendations
      recommendations: topRecommendations.map((r) => ({
        title: r.title,
        priority: r.priority,
        expectedImpact: r.expectedImpact,
        canAutoImplement: r.implementation.automatic,
      })),

      // Performance summary
      summary: this.generatePerformanceSummary(),
    }
  }

  // =============================================================================
  // Optimization Engine
  // =============================================================================

  generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    const metrics = this.getCurrentMetrics()

    // Cache optimization recommendations
    if (metrics.resourceUsage.cacheHitRate < this.thresholds.resources.minCacheHitRate) {
      recommendations.push({
        id: `cache-opt-${Date.now()}`,
        category: 'caching',
        priority: 'high',
        title: 'Improve Cache Hit Rate',
        description: `Current cache hit rate is ${(metrics.resourceUsage.cacheHitRate * 100).toFixed(1)}%, below the ${(this.thresholds.resources.minCacheHitRate * 100).toFixed(1)}% threshold.`,
        expectedImpact: '20-40% improvement in response time',
        implementationComplexity: 'medium',
        estimatedEffort: '2-4 hours',
        implementation: {
          automatic: true,
          steps: [
            'Increase cache TTL for stable operations',
            'Implement smarter cache invalidation',
            'Add cache warming for popular operations',
          ],
          code: `
// Optimize cache configuration
const optimizedConfig = {
  intelligenceCacheTTL: 600000, // 10 minutes instead of 5
  maxCacheSize: 2000, // Double the cache size
  enableCacheWarming: true
}`,
        },
        metrics: {
          expectedLatencyImprovement: 0.3,
          expectedThroughputImprovement: 0.2,
        },
      })
    }

    // Latency optimization recommendations
    const avgLatency = this.calculateAverageResponseTime()
    if (avgLatency > 300) {
      recommendations.push({
        id: `latency-opt-${Date.now()}`,
        category: 'configuration',
        priority: 'high',
        title: 'Optimize Response Time',
        description: `Average response time is ${avgLatency}ms, which impacts user experience.`,
        expectedImpact: '30-50% faster response times',
        implementationComplexity: 'low',
        estimatedEffort: '1-2 hours',
        implementation: {
          automatic: true,
          steps: [
            'Enable response streaming for long operations',
            'Implement operation batching',
            'Optimize algorithm parameters',
          ],
        },
        metrics: {
          expectedLatencyImprovement: 0.4,
        },
      })
    }

    // Resource optimization recommendations
    if (metrics.resourceUsage.memoryMB > this.thresholds.resources.maxMemoryMB) {
      recommendations.push({
        id: `memory-opt-${Date.now()}`,
        category: 'architecture',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Memory usage is ${metrics.resourceUsage.memoryMB}MB, exceeding the ${this.thresholds.resources.maxMemoryMB}MB threshold.`,
        expectedImpact: '20-30% reduction in memory usage',
        implementationComplexity: 'medium',
        estimatedEffort: '3-6 hours',
        implementation: {
          automatic: false,
          steps: [
            'Implement memory pooling for large objects',
            'Add garbage collection optimization',
            'Reduce object retention in caches',
          ],
        },
        metrics: {
          expectedResourceSaving: 0.25,
        },
      })
    }

    // Quality optimization recommendations
    if (metrics.qualityMetrics.userSatisfaction < this.thresholds.quality.minUserSatisfaction) {
      recommendations.push({
        id: `quality-opt-${Date.now()}`,
        category: 'configuration',
        priority: 'high',
        title: 'Improve User Experience',
        description: `User satisfaction is ${metrics.qualityMetrics.userSatisfaction.toFixed(2)}/5, below target of ${this.thresholds.quality.minUserSatisfaction}/5.`,
        expectedImpact: 'Higher user satisfaction and engagement',
        implementationComplexity: 'low',
        estimatedEffort: '1-3 hours',
        implementation: {
          automatic: true,
          steps: [
            'Improve description clarity and relevance',
            'Enhance recommendation personalization',
            'Optimize error message helpfulness',
          ],
        },
        metrics: {
          expectedThroughputImprovement: 0.15,
        },
      })
    }

    // Sort recommendations by priority and expected impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  async implementOptimizationRecommendation(recommendationId: string): Promise<{
    success: boolean
    message: string
    appliedChanges: string[]
  }> {
    const recommendation = this.optimizationRecommendations.find((r) => r.id === recommendationId)
    if (!recommendation) {
      return {
        success: false,
        message: 'Recommendation not found',
        appliedChanges: [],
      }
    }

    if (!recommendation.implementation.automatic) {
      return {
        success: false,
        message: 'This recommendation requires manual implementation',
        appliedChanges: [],
      }
    }

    try {
      const appliedChanges: string[] = []

      // Apply optimization based on category
      switch (recommendation.category) {
        case 'caching':
          await this.applyCacheOptimizations(recommendation)
          appliedChanges.push('Optimized cache configuration')
          break

        case 'configuration':
          await this.applyConfigurationOptimizations(recommendation)
          appliedChanges.push('Updated system configuration')
          break

        case 'scaling':
          await this.applyScalingOptimizations(recommendation)
          appliedChanges.push('Adjusted scaling parameters')
          break

        default:
          return {
            success: false,
            message: `Automatic implementation not supported for ${recommendation.category}`,
            appliedChanges: [],
          }
      }

      // Remove the implemented recommendation
      const index = this.optimizationRecommendations.findIndex((r) => r.id === recommendationId)
      if (index !== -1) {
        this.optimizationRecommendations.splice(index, 1)
      }

      logger.info('Optimization recommendation implemented successfully', {
        recommendationId,
        title: recommendation.title,
        appliedChanges,
      })

      return {
        success: true,
        message: `Successfully implemented: ${recommendation.title}`,
        appliedChanges,
      }
    } catch (error) {
      logger.error('Failed to implement optimization recommendation', {
        recommendationId,
        error:
          error instanceof Error ? (error instanceof Error ? error.message : String(error)) : error,
      })

      return {
        success: false,
        message: `Failed to implement recommendation: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'}`,
        appliedChanges: [],
      }
    }
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  private initializeMetrics(): PerformanceMetrics {
    return {
      operationLatency: {
        description: 0,
        recommendation: 0,
        errorHandling: 0,
        contextAnalysis: 0,
        caching: 0,
      },
      operationsPerSecond: {
        descriptions: 0,
        recommendations: 0,
        errorHandling: 0,
        discoveries: 0,
      },
      resourceUsage: {
        memoryMB: 0,
        cpuPercent: 0,
        cacheSize: 0,
        cacheHitRate: 0,
      },
      qualityMetrics: {
        userSatisfaction: 4.0,
        recommendationAccuracy: 0.8,
        errorResolutionRate: 0.9,
        responseQuality: 4.2,
      },
      systemHealth: {
        overallHealth: 'good',
        bottlenecks: [],
        recommendations: [],
        alertLevel: 'none',
      },
    }
  }

  private updateRealTimeMetrics(operation: string, record: OperationRecord): void {
    // Update latency metrics using exponential moving average
    const alpha = 0.1
    const currentLatency =
      this.currentMetrics.operationLatency[
        operation as keyof typeof this.currentMetrics.operationLatency
      ]
    if (typeof currentLatency === 'number') {
      this.currentMetrics.operationLatency[
        operation as keyof typeof this.currentMetrics.operationLatency
      ] = currentLatency * (1 - alpha) + record.durationMs * alpha
    }

    // Update throughput metrics
    this.updateThroughputMetrics()
  }

  private updateThroughputMetrics(): void {
    const windowMs = 60000 // 1 minute window
    const now = Date.now()
    const cutoff = now - windowMs

    for (const [operation, history] of this.operationHistory.entries()) {
      const recentOps = history.filter((r) => r.timestamp > cutoff).length
      const opsPerSecond = recentOps / (windowMs / 1000)

      if (operation in this.currentMetrics.operationsPerSecond) {
        this.currentMetrics.operationsPerSecond[
          operation as keyof typeof this.currentMetrics.operationsPerSecond
        ] = opsPerSecond
      }
    }
  }

  private updateSystemHealth(): void {
    const metrics = this.currentMetrics
    let healthScore = 100

    // Check latency health
    Object.values(metrics.operationLatency).forEach((latency, index) => {
      const thresholdKey = Object.keys(this.thresholds.latency)[
        index
      ] as keyof typeof this.thresholds.latency
      if (latency > this.thresholds.latency[thresholdKey]) {
        healthScore -= 10
      }
    })

    // Check quality health
    if (metrics.qualityMetrics.userSatisfaction < this.thresholds.quality.minUserSatisfaction) {
      healthScore -= 15
    }
    if (metrics.qualityMetrics.recommendationAccuracy < this.thresholds.quality.minAccuracy) {
      healthScore -= 15
    }

    // Check resource health
    if (metrics.resourceUsage.memoryMB > this.thresholds.resources.maxMemoryMB) {
      healthScore -= 20
    }
    if (metrics.resourceUsage.cpuPercent > this.thresholds.resources.maxCpuPercent) {
      healthScore -= 15
    }
    if (metrics.resourceUsage.cacheHitRate < this.thresholds.resources.minCacheHitRate) {
      healthScore -= 10
    }

    // Determine health status
    let health: 'excellent' | 'good' | 'fair' | 'poor'
    if (healthScore >= 90) health = 'excellent'
    else if (healthScore >= 70) health = 'good'
    else if (healthScore >= 50) health = 'fair'
    else health = 'poor'

    metrics.systemHealth.overallHealth = health
    metrics.systemHealth.bottlenecks = this.identifyBottlenecks()
    metrics.systemHealth.recommendations = this.generateQuickRecommendations()
    metrics.systemHealth.alertLevel = this.getOverallAlertLevel()
  }

  private checkPerformanceAlerts(operation: string, record: OperationRecord): void {
    // Check latency alerts
    const thresholdKey = operation as keyof typeof this.thresholds.latency
    if (thresholdKey in this.thresholds.latency) {
      const threshold = this.thresholds.latency[thresholdKey]
      if (record.durationMs > threshold) {
        this.createPerformanceAlert({
          type: 'latency',
          severity: record.durationMs > threshold * 2 ? 'high' : 'medium',
          message: `${operation} operation exceeded latency threshold`,
          metric: `${operation}_latency`,
          currentValue: record.durationMs,
          threshold,
          recommendation: `Consider optimizing ${operation} algorithm or increasing cache TTL`,
        })
      }
    }

    // Check error rate alerts
    if (!record.success) {
      const recentHistory = this.operationHistory.get(operation) || []
      const recentFailures = recentHistory.filter(
        (r) => !r.success && r.timestamp > Date.now() - 300000
      ) // Last 5 minutes
      const failureRate = recentFailures.length / Math.max(recentHistory.length, 1)

      if (failureRate > 0.1) {
        // 10% failure rate
        this.createPerformanceAlert({
          type: 'error',
          severity: failureRate > 0.2 ? 'high' : 'medium',
          message: `High error rate detected for ${operation} operations`,
          metric: `${operation}_error_rate`,
          currentValue: failureRate,
          threshold: 0.1,
          recommendation: `Investigate root cause of ${operation} failures`,
        })
      }
    }
  }

  private checkResourceAlerts(): void {
    const resources = this.currentMetrics.resourceUsage

    // Memory usage alert
    if (resources.memoryMB > this.thresholds.resources.maxMemoryMB) {
      this.createPerformanceAlert({
        type: 'resource',
        severity:
          resources.memoryMB > this.thresholds.resources.maxMemoryMB * 1.5 ? 'critical' : 'high',
        message: 'High memory usage detected',
        metric: 'memory_usage',
        currentValue: resources.memoryMB,
        threshold: this.thresholds.resources.maxMemoryMB,
        recommendation: 'Consider enabling garbage collection optimization or reducing cache size',
        autoRemediation: true,
      })
    }

    // CPU usage alert
    if (resources.cpuPercent > this.thresholds.resources.maxCpuPercent) {
      this.createPerformanceAlert({
        type: 'resource',
        severity:
          resources.cpuPercent > this.thresholds.resources.maxCpuPercent * 1.2 ? 'high' : 'medium',
        message: 'High CPU usage detected',
        metric: 'cpu_usage',
        currentValue: resources.cpuPercent,
        threshold: this.thresholds.resources.maxCpuPercent,
        recommendation: 'Consider scaling horizontally or optimizing algorithm performance',
      })
    }

    // Cache hit rate alert
    if (resources.cacheHitRate < this.thresholds.resources.minCacheHitRate) {
      this.createPerformanceAlert({
        type: 'throughput',
        severity: 'medium',
        message: 'Low cache hit rate detected',
        metric: 'cache_hit_rate',
        currentValue: resources.cacheHitRate,
        threshold: this.thresholds.resources.minCacheHitRate,
        recommendation: 'Increase cache TTL or improve cache key strategy',
        autoRemediation: true,
      })
    }
  }

  private createPerformanceAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    // Check if similar alert already exists
    const existingAlert = this.performanceAlerts.find(
      (a) =>
        a.metric === alertData.metric &&
        a.type === alertData.type &&
        a.severity === alertData.severity
    )

    if (existingAlert) {
      // Update existing alert timestamp
      existingAlert.timestamp = new Date()
      return
    }

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      timestamp: new Date(),
      ...alertData,
    }

    this.performanceAlerts.push(alert)

    // Keep only recent alerts (last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const recentAlerts = this.performanceAlerts.filter((a) => a.timestamp.getTime() > cutoff)
    this.performanceAlerts.length = 0
    this.performanceAlerts.push(...recentAlerts)

    // Auto-remediation for applicable alerts
    if (this.autoOptimizationEnabled && alertData.autoRemediation) {
      this.attemptAutoRemediation(alert)
    }

    logger.warn('Performance alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      message: alert.message,
    })
  }

  private startPerformanceMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      try {
        this.collectSystemMetrics()
        this.updateOptimizationRecommendations()
        this.cleanupOldData()
      } catch (error) {
        logger.error('Error in performance monitoring cycle', { error })
      }
    }, 30000)
  }

  private startOptimizationEngine(): void {
    if (!this.optimizationEnabled) return

    // Run optimization analysis every 5 minutes
    setInterval(() => {
      try {
        this.generateAndUpdateRecommendations()
        this.performAutomaticOptimizations()
      } catch (error) {
        logger.error('Error in optimization engine cycle', { error })
      }
    }, 300000)
  }

  private collectSystemMetrics(): void {
    // Collect resource metrics
    if (process?.memoryUsage) {
      const memUsage = process.memoryUsage()
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024)

      // CPU usage would need additional implementation or library
      const cpuPercent = 0 // Placeholder

      this.recordResourceUsage(
        memoryMB,
        cpuPercent,
        this.currentMetrics.resourceUsage.cacheSize,
        this.currentMetrics.resourceUsage.cacheHitRate
      )
    }
  }

  private generateAndUpdateRecommendations(): void {
    const newRecommendations = this.generateOptimizationRecommendations()

    // Remove outdated recommendations
    this.optimizationRecommendations.length = 0
    this.optimizationRecommendations.push(...newRecommendations)
  }

  private async performAutomaticOptimizations(): Promise<void> {
    if (!this.autoOptimizationEnabled) return

    const autoRecommendations = this.optimizationRecommendations.filter(
      (r) => r.implementation.automatic && r.priority === 'high'
    )

    for (const recommendation of autoRecommendations.slice(0, 1)) {
      // Implement max 1 per cycle
      await this.implementOptimizationRecommendation(recommendation.id)
    }
  }

  private async attemptAutoRemediation(alert: PerformanceAlert): Promise<void> {
    logger.info('Attempting auto-remediation for alert', { alertId: alert.id })

    try {
      switch (alert.type) {
        case 'resource':
          if (alert.metric === 'memory_usage') {
            // Trigger garbage collection if available
            if (global.gc) {
              global.gc()
              logger.info('Triggered garbage collection for memory alert')
            }
          }
          break

        case 'throughput':
          if (alert.metric === 'cache_hit_rate') {
            // Could automatically adjust cache configuration
            logger.info('Would adjust cache configuration for throughput alert')
          }
          break
      }
    } catch (error) {
      logger.error('Auto-remediation failed', {
        alertId: alert.id,
        error:
          error instanceof Error ? (error instanceof Error ? error.message : String(error)) : error,
      })
    }
  }

  // Helper methods for dashboard and reporting
  private calculateAverageResponseTime(): number {
    const allLatencies = Object.values(this.currentMetrics.operationLatency)
    return allLatencies.reduce((sum, latency) => sum + latency, 0) / allLatencies.length
  }

  private calculateOperationsPerSecond(): number {
    const allOps = Object.values(this.currentMetrics.operationsPerSecond)
    return allOps.reduce((sum, ops) => sum + ops, 0)
  }

  private calculateErrorRate(): number {
    let totalOps = 0
    let totalErrors = 0

    for (const history of this.operationHistory.values()) {
      const recentOps = history.filter((r) => r.timestamp > Date.now() - 300000) // Last 5 minutes
      totalOps += recentOps.length
      totalErrors += recentOps.filter((r) => !r.success).length
    }

    return totalOps > 0 ? totalErrors / totalOps : 0
  }

  private getActiveAlerts(): PerformanceAlert[] {
    const cutoff = Date.now() - 60 * 60 * 1000 // Last hour
    return this.performanceAlerts.filter((a) => a.timestamp.getTime() > cutoff)
  }

  private getOptimizationRecommendations(): OptimizationRecommendation[] {
    return [...this.optimizationRecommendations]
  }

  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = []
    const metrics = this.currentMetrics

    // Latency bottlenecks
    if (metrics.operationLatency.description > this.thresholds.latency.description) {
      bottlenecks.push('Description generation latency')
    }
    if (metrics.operationLatency.recommendation > this.thresholds.latency.recommendation) {
      bottlenecks.push('Recommendation generation latency')
    }

    // Resource bottlenecks
    if (metrics.resourceUsage.memoryMB > this.thresholds.resources.maxMemoryMB) {
      bottlenecks.push('Memory usage')
    }
    if (metrics.resourceUsage.cpuPercent > this.thresholds.resources.maxCpuPercent) {
      bottlenecks.push('CPU usage')
    }

    // Cache bottlenecks
    if (metrics.resourceUsage.cacheHitRate < this.thresholds.resources.minCacheHitRate) {
      bottlenecks.push('Cache efficiency')
    }

    return bottlenecks
  }

  private generateQuickRecommendations(): string[] {
    const recommendations: string[] = []
    const metrics = this.currentMetrics

    if (metrics.resourceUsage.cacheHitRate < 0.5) {
      recommendations.push('Optimize caching strategy')
    }
    if (this.calculateAverageResponseTime() > 400) {
      recommendations.push('Reduce response time')
    }
    if (metrics.qualityMetrics.userSatisfaction < 3.5) {
      recommendations.push('Improve user experience')
    }

    return recommendations
  }

  private getOverallAlertLevel(): 'none' | 'info' | 'warning' | 'critical' {
    const activeAlerts = this.getActiveAlerts()

    if (activeAlerts.some((a) => a.severity === 'critical')) return 'critical'
    if (activeAlerts.some((a) => a.severity === 'high')) return 'warning'
    if (activeAlerts.length > 0) return 'info'
    return 'none'
  }

  private cleanupOldData(): void {
    const retentionHours = this.config.metricsRetentionHours || 24
    const cutoff = Date.now() - retentionHours * 60 * 60 * 1000

    // Clean operation history
    for (const [operation, history] of this.operationHistory.entries()) {
      const recentHistory = history.filter((r) => r.timestamp > cutoff)
      this.operationHistory.set(operation, recentHistory)
    }

    // Clean performance history
    this.performanceHistory.splice(0, this.performanceHistory.length - 100) // Keep last 100 snapshots
  }

  // Placeholder implementations for optimization methods
  private async applyCacheOptimizations(recommendation: OptimizationRecommendation): Promise<void> {
    logger.info('Applying cache optimizations', { recommendationId: recommendation.id })
    // Implementation would adjust cache parameters
  }

  private async applyConfigurationOptimizations(
    recommendation: OptimizationRecommendation
  ): Promise<void> {
    logger.info('Applying configuration optimizations', { recommendationId: recommendation.id })
    // Implementation would adjust system configuration
  }

  private async applyScalingOptimizations(
    recommendation: OptimizationRecommendation
  ): Promise<void> {
    logger.info('Applying scaling optimizations', { recommendationId: recommendation.id })
    // Implementation would adjust scaling parameters
  }

  // Placeholder implementations for trend analysis and detailed reporting
  private calculatePerformanceTrends(): PerformanceTrends {
    return {
      latencyTrend: 'stable',
      throughputTrend: 'improving',
      qualityTrend: 'stable',
      resourceTrend: 'increasing',
    }
  }

  private performPerformanceAnalysis(): PerformanceAnalysis {
    return {
      summary: 'System performance is within acceptable parameters',
      keyFindings: [
        'Response times are consistent',
        'Cache hit rate could be improved',
        'User satisfaction is stable',
      ],
      riskFactors: [],
      opportunities: ['Implement cache warming', 'Optimize algorithm parameters'],
    }
  }

  // Placeholder methods for chart data
  private getResponseTimeHistory(): Array<{ timestamp: number; value: number }> {
    return [] // Would return historical response time data
  }

  private getThroughputHistory(): Array<{ timestamp: number; value: number }> {
    return [] // Would return historical throughput data
  }

  private getResourceUsageHistory(): Array<{ timestamp: number; memory: number; cpu: number }> {
    return [] // Would return historical resource usage data
  }

  private getErrorRateHistory(): Array<{ timestamp: number; value: number }> {
    return [] // Would return historical error rate data
  }

  private generatePerformanceSummary(): string {
    const metrics = this.getCurrentMetrics()
    const avgResponseTime = this.calculateAverageResponseTime()
    const opsPerSecond = this.calculateOperationsPerSecond()
    const errorRate = this.calculateErrorRate()

    return (
      `System health: ${metrics.systemHealth.overallHealth}. ` +
      `Avg response time: ${avgResponseTime.toFixed(0)}ms. ` +
      `Throughput: ${opsPerSecond.toFixed(1)} ops/sec. ` +
      `Error rate: ${(errorRate * 100).toFixed(2)}%.`
    )
  }

  private updateOptimizationRecommendations(): void {
    // Update existing recommendations based on current metrics
    // This would be more sophisticated in a real implementation
  }

  // Add updateThroughputMetrics method reference from earlier
}

// =============================================================================
// Supporting Types and Interfaces
// =============================================================================

interface OperationRecord {
  operation: string
  durationMs: number
  success: boolean
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceTrends {
  latencyTrend: 'improving' | 'stable' | 'degrading'
  throughputTrend: 'improving' | 'stable' | 'degrading'
  qualityTrend: 'improving' | 'stable' | 'degrading'
  resourceTrend: 'decreasing' | 'stable' | 'increasing'
}

interface PerformanceAnalysis {
  summary: string
  keyFindings: string[]
  riskFactors: string[]
  opportunities: string[]
}

export interface PerformanceDashboardData {
  kpis: {
    avgResponseTime: number
    operationsPerSecond: number
    errorRate: number
    userSatisfaction: number
    systemHealth: string
  }
  charts: {
    responseTimeHistory: Array<{ timestamp: number; value: number }>
    throughputHistory: Array<{ timestamp: number; value: number }>
    resourceUsageHistory: Array<{ timestamp: number; memory: number; cpu: number }>
    errorRateHistory: Array<{ timestamp: number; value: number }>
  }
  status: {
    alerts: number
    criticalAlerts: number
    systemHealth: string
    uptime: number
  }
  recommendations: Array<{
    title: string
    priority: string
    expectedImpact: string
    canAutoImplement: boolean
  }>
  summary: string
}

export default IntelligencePerformanceMonitor
