/**
 * Analytics and Monitoring System
 *
 * Comprehensive monitoring and analytics system for tracking adapter performance,
 * usage patterns, error rates, and system health with real-time dashboards
 * and intelligent alerting.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import EventEmitter from 'events'
import type {
  AdapterRegistryEntry,
  AdapterExecutionResult,
  AdapterExecutionContext,
  MonitoringConfig,
} from '../types/adapter-interfaces'

import type { ParlantExecutionContext } from '../types/parlant-interfaces'

import { createLogger } from '../utils/logger'

const logger = createLogger('AnalyticsSystem')

/**
 * Comprehensive analytics and monitoring system
 */
export class AnalyticsSystem extends EventEmitter {
  // Core data stores
  private readonly executionHistory = new Map<string, ExecutionRecord[]>()
  private readonly performanceMetrics = new Map<string, PerformanceMetrics>()
  private readonly errorTracking = new Map<string, ErrorRecord[]>()
  private readonly usagePatterns = new Map<string, UsagePattern>()

  // Real-time monitoring
  private readonly realTimeMetrics: RealTimeMetrics = {
    currentExecutions: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageResponseTime: 0,
    requestsPerSecond: 0,
    errorsPerSecond: 0,
    activeAdapters: 0,
    systemHealth: 'healthy',
  }

  // Alerting system
  private readonly alertManager: AlertManager
  private readonly healthChecker: HealthChecker
  private readonly trendAnalyzer: TrendAnalyzer

  // Data aggregation
  private readonly aggregationEngine: AggregationEngine
  private readonly reportGenerator: ReportGenerator

  // Configuration
  private readonly config: AnalyticsConfig

  // Timers and intervals
  private readonly timers = new Map<string, NodeJS.Timeout>()

  constructor(config: AnalyticsConfig = {}) {
    super()

    this.config = {
      // Data retention
      retentionDays: 30,
      maxRecordsPerAdapter: 10000,

      // Aggregation intervals
      realTimeIntervalMs: 1000, // 1 second
      metricsIntervalMs: 60000, // 1 minute
      healthCheckIntervalMs: 30000, // 30 seconds

      // Performance thresholds
      slowExecutionThresholdMs: 5000,
      errorRateThreshold: 0.05, // 5%
      responseTimeThreshold: 2000,

      // Alerting
      enableAlerting: true,
      alertCooldownMs: 300000, // 5 minutes
      criticalErrorThreshold: 10, // errors per minute

      // Storage
      enablePersistence: false,
      persistenceInterval: 3600000, // 1 hour

      // Features
      enableTrendAnalysis: true,
      enablePredictiveAlerts: true,
      enableDetailedTracing: false,

      ...config,
    }

    // Initialize subsystems
    this.alertManager = new AlertManager(this.config, this)
    this.healthChecker = new HealthChecker(this.config, this)
    this.trendAnalyzer = new TrendAnalyzer(this.config, this)
    this.aggregationEngine = new AggregationEngine(this.config, this)
    this.reportGenerator = new ReportGenerator(this.config, this)

    // Start monitoring
    this.startMonitoring()

    logger.info('Analytics System initialized', {
      retentionDays: this.config.retentionDays,
      alerting: this.config.enableAlerting,
      trendAnalysis: this.config.enableTrendAnalysis,
    })
  }

  /**
   * Record adapter execution for analytics
   */
  recordExecution(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any,
    result: AdapterExecutionResult
  ): void {
    const record: ExecutionRecord = {
      adapterId,
      timestamp: new Date(),
      duration: result.durationMs,
      success: result.success,
      context: {
        type: context.type,
        agentId: context.agentId,
        sessionId: context.sessionId,
        userId: context.userId,
        workspaceId: context.workspaceId,
      },
      error: result.error
        ? {
            type: result.error.type,
            message: result.error.message,
            recoverable: result.error.recoverable,
          }
        : undefined,
      metadata: {
        parameterCount: Object.keys(args).length,
        resultSize: this.estimateObjectSize(result.data),
        executionId: result.executionId,
      },
    }

    // Store execution record
    this.storeExecutionRecord(adapterId, record)

    // Update real-time metrics
    this.updateRealTimeMetrics(record)

    // Update performance metrics
    this.updatePerformanceMetrics(adapterId, record)

    // Track usage patterns
    this.updateUsagePatterns(adapterId, record)

    // Check for alerts
    this.checkForAlerts(adapterId, record)

    // Emit event for real-time listeners
    this.emit('execution:recorded', {
      adapterId,
      record,
      realTimeMetrics: this.getRealTimeMetrics(),
    })

    logger.debug('Execution recorded', {
      adapterId,
      success: record.success,
      duration: record.duration,
    })
  }

  /**
   * Record adapter registration for tracking
   */
  recordAdapterRegistration(entry: AdapterRegistryEntry): void {
    const registrationRecord: AdapterRegistrationRecord = {
      adapterId: entry.id,
      timestamp: new Date(),
      category: entry.metadata.category,
      tags: entry.metadata.tags,
      version: entry.metadata.version,
      source: entry.metadata.source,
    }

    this.realTimeMetrics.activeAdapters++

    this.emit('adapter:registered', registrationRecord)

    logger.info('Adapter registration recorded', {
      adapterId: entry.id,
      category: entry.metadata.category,
    })
  }

  /**
   * Record adapter unregistration
   */
  recordAdapterUnregistration(adapterId: string): void {
    this.realTimeMetrics.activeAdapters = Math.max(0, this.realTimeMetrics.activeAdapters - 1)

    // Clean up stored data for this adapter
    this.cleanupAdapterData(adapterId)

    this.emit('adapter:unregistered', { adapterId })

    logger.info('Adapter unregistration recorded', { adapterId })
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): RealTimeMetrics {
    return { ...this.realTimeMetrics }
  }

  /**
   * Get performance metrics for specific adapter or all adapters
   */
  getPerformanceMetrics(adapterId?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (adapterId) {
      return this.performanceMetrics.get(adapterId) || this.createDefaultPerformanceMetrics()
    }
    return new Map(this.performanceMetrics)
  }

  /**
   * Get usage patterns and insights
   */
  getUsagePatterns(adapterId?: string): UsagePattern | Map<string, UsagePattern> {
    if (adapterId) {
      return this.usagePatterns.get(adapterId) || this.createDefaultUsagePattern()
    }
    return new Map(this.usagePatterns)
  }

  /**
   * Get error analysis and trends
   */
  getErrorAnalysis(adapterId?: string, timeRange?: TimeRange): ErrorAnalysis {
    const now = Date.now()
    const startTime = timeRange?.start || now - 86400000 // Default: last 24 hours
    const endTime = timeRange?.end || now

    if (adapterId) {
      return this.analyzeErrorsForAdapter(adapterId, startTime, endTime)
    }

    return this.analyzeErrorsForAllAdapters(startTime, endTime)
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    type: ReportType,
    timeRange?: TimeRange,
    adapterId?: string
  ): Promise<AnalyticsReport> {
    logger.info('Generating analytics report', { type, adapterId })

    const report = await this.reportGenerator.generate({
      type,
      timeRange: timeRange || this.getDefaultTimeRange(),
      adapterId,
      executionHistory: this.executionHistory,
      performanceMetrics: this.performanceMetrics,
      errorTracking: this.errorTracking,
      usagePatterns: this.usagePatterns,
      realTimeMetrics: this.realTimeMetrics,
    })

    this.emit('report:generated', { type, adapterId, report })

    return report
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealthStatus {
    return this.healthChecker.getSystemHealth()
  }

  /**
   * Get trend analysis and predictions
   */
  getTrendAnalysis(adapterId?: string): TrendAnalysis {
    if (!this.config.enableTrendAnalysis) {
      return {
        trends: [],
        predictions: [],
        confidence: 0,
        recommendations: [],
      }
    }

    return this.trendAnalyzer.analyze(adapterId)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts()
  }

  /**
   * Configure alerting rules
   */
  configureAlerts(rules: AlertRule[]): void {
    this.alertManager.configureRules(rules)
  }

  /**
   * Export analytics data
   */
  async exportData(
    format: 'json' | 'csv' | 'excel',
    timeRange?: TimeRange,
    adapterId?: string
  ): Promise<ExportResult> {
    logger.info('Exporting analytics data', { format, adapterId })

    const data = await this.aggregationEngine.aggregateData({
      timeRange: timeRange || this.getDefaultTimeRange(),
      adapterId,
      includeExecutions: true,
      includeErrors: true,
      includeMetrics: true,
    })

    // Format data based on requested format
    let formattedData: any
    let mimeType: string

    switch (format) {
      case 'json':
        formattedData = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        break
      case 'csv':
        formattedData = this.convertToCSV(data)
        mimeType = 'text/csv'
        break
      case 'excel':
        formattedData = await this.convertToExcel(data)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }

    return {
      data: formattedData,
      mimeType,
      filename: this.generateExportFilename(format, timeRange, adapterId),
      size: formattedData.length || 0,
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanup(): Promise<CleanupResult> {
    logger.info('Starting analytics data cleanup')

    const cutoffTime = Date.now() - this.config.retentionDays * 86400000
    let removedRecords = 0

    // Clean up execution history
    for (const [adapterId, records] of this.executionHistory) {
      const filteredRecords = records.filter((r) => r.timestamp.getTime() > cutoffTime)
      const removedCount = records.length - filteredRecords.length

      if (removedCount > 0) {
        this.executionHistory.set(adapterId, filteredRecords)
        removedRecords += removedCount
      }
    }

    // Clean up error tracking
    for (const [adapterId, errors] of this.errorTracking) {
      const filteredErrors = errors.filter((e) => e.timestamp.getTime() > cutoffTime)
      const removedCount = errors.length - filteredErrors.length

      if (removedCount > 0) {
        this.errorTracking.set(adapterId, filteredErrors)
        removedRecords += removedCount
      }
    }

    // Update aggregated metrics
    await this.aggregationEngine.recompute()

    const result: CleanupResult = {
      removedRecords,
      retainedRecords: this.getTotalRecordCount(),
      freedMemoryMB: this.estimateMemoryFreed(removedRecords),
    }

    logger.info('Analytics cleanup completed', result)

    this.emit('cleanup:completed', result)

    return result
  }

  /**
   * Graceful shutdown with data persistence
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Analytics System')

    try {
      // Stop all monitoring timers
      for (const [name, timer] of this.timers) {
        clearInterval(timer)
        logger.debug('Stopped timer', { name })
      }
      this.timers.clear()

      // Persist data if enabled
      if (this.config.enablePersistence) {
        await this.persistData()
      }

      // Shutdown subsystems
      await this.alertManager.shutdown()
      await this.healthChecker.shutdown()
      await this.trendAnalyzer.shutdown()
      await this.aggregationEngine.shutdown()
      await this.reportGenerator.shutdown()

      logger.info('Analytics System shutdown complete')
    } catch (error) {
      logger.error('Error during analytics system shutdown', {
        error: error.message,
      })
      throw error
    }
  }

  // Private implementation methods

  private startMonitoring(): void {
    // Real-time metrics updates
    this.timers.set(
      'realtime',
      setInterval(() => {
        this.updateRealtimeCalculations()
      }, this.config.realTimeIntervalMs)
    )

    // Performance metrics aggregation
    this.timers.set(
      'metrics',
      setInterval(() => {
        this.aggregatePerformanceMetrics()
      }, this.config.metricsIntervalMs)
    )

    // Health checks
    this.timers.set(
      'health',
      setInterval(() => {
        this.performHealthChecks()
      }, this.config.healthCheckIntervalMs)
    )

    // Data cleanup
    this.timers.set(
      'cleanup',
      setInterval(() => {
        this.cleanup().catch((error) => {
          logger.error('Scheduled cleanup failed', { error: error.message })
        })
      }, 86400000)
    ) // Daily cleanup

    // Data persistence
    if (this.config.enablePersistence) {
      this.timers.set(
        'persistence',
        setInterval(() => {
          this.persistData().catch((error) => {
            logger.error('Data persistence failed', { error: error.message })
          })
        }, this.config.persistenceInterval)
      )
    }
  }

  private storeExecutionRecord(adapterId: string, record: ExecutionRecord): void {
    if (!this.executionHistory.has(adapterId)) {
      this.executionHistory.set(adapterId, [])
    }

    const records = this.executionHistory.get(adapterId)!
    records.push(record)

    // Trim records if exceeding limit
    if (records.length > this.config.maxRecordsPerAdapter) {
      records.splice(0, records.length - this.config.maxRecordsPerAdapter)
    }

    // Track errors separately
    if (!record.success && record.error) {
      this.storeErrorRecord(adapterId, record)
    }
  }

  private storeErrorRecord(adapterId: string, executionRecord: ExecutionRecord): void {
    if (!this.errorTracking.has(adapterId)) {
      this.errorTracking.set(adapterId, [])
    }

    const errorRecord: ErrorRecord = {
      adapterId,
      timestamp: executionRecord.timestamp,
      errorType: executionRecord.error!.type,
      errorMessage: executionRecord.error!.message,
      recoverable: executionRecord.error!.recoverable || false,
      context: executionRecord.context,
      executionDuration: executionRecord.duration,
      stackTrace: undefined, // Would include if available
    }

    this.errorTracking.get(adapterId)!.push(errorRecord)
  }

  private updateRealTimeMetrics(record: ExecutionRecord): void {
    this.realTimeMetrics.totalExecutions++

    if (record.success) {
      this.realTimeMetrics.successfulExecutions++
    } else {
      this.realTimeMetrics.failedExecutions++
    }

    // Update average response time (exponential moving average)
    const alpha = 0.1
    this.realTimeMetrics.averageResponseTime =
      this.realTimeMetrics.averageResponseTime * (1 - alpha) + record.duration * alpha
  }

  private updateRealtimeCalculations(): void {
    const now = Date.now()
    const oneSecondAgo = now - 1000
    const oneMinuteAgo = now - 60000

    // Calculate requests per second
    let recentRequests = 0
    let recentErrors = 0

    for (const records of this.executionHistory.values()) {
      for (const record of records) {
        if (record.timestamp.getTime() > oneSecondAgo) {
          recentRequests++
          if (!record.success) recentErrors++
        } else {
          break // Records are chronologically ordered
        }
      }
    }

    this.realTimeMetrics.requestsPerSecond = recentRequests
    this.realTimeMetrics.errorsPerSecond = recentErrors

    // Update system health
    this.realTimeMetrics.systemHealth = this.determineSystemHealth()

    // Emit real-time update
    this.emit('metrics:updated', this.getRealTimeMetrics())
  }

  private updatePerformanceMetrics(adapterId: string, record: ExecutionRecord): void {
    if (!this.performanceMetrics.has(adapterId)) {
      this.performanceMetrics.set(adapterId, this.createDefaultPerformanceMetrics())
    }

    const metrics = this.performanceMetrics.get(adapterId)!

    // Update basic counts
    metrics.totalExecutions++
    if (record.success) {
      metrics.successfulExecutions++
    } else {
      metrics.failedExecutions++
    }

    // Update success rate
    metrics.successRate = metrics.successfulExecutions / metrics.totalExecutions

    // Update response time metrics
    metrics.totalResponseTime += record.duration
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.totalExecutions

    if (record.duration < metrics.minResponseTime) {
      metrics.minResponseTime = record.duration
    }
    if (record.duration > metrics.maxResponseTime) {
      metrics.maxResponseTime = record.duration
    }

    // Track slow executions
    if (record.duration > this.config.slowExecutionThresholdMs) {
      metrics.slowExecutions++
    }

    // Update last execution time
    metrics.lastExecution = record.timestamp

    // Update hourly statistics (simplified)
    this.updateHourlyStats(metrics, record)
  }

  private updateHourlyStats(metrics: PerformanceMetrics, record: ExecutionRecord): void {
    const hour = new Date(record.timestamp).getHours()

    if (!metrics.hourlyStats) {
      metrics.hourlyStats = Array(24)
        .fill(null)
        .map(() => ({
          executions: 0,
          errors: 0,
          averageResponseTime: 0,
          totalResponseTime: 0,
        }))
    }

    const hourStats = metrics.hourlyStats[hour]
    hourStats.executions++
    hourStats.totalResponseTime += record.duration
    hourStats.averageResponseTime = hourStats.totalResponseTime / hourStats.executions

    if (!record.success) {
      hourStats.errors++
    }
  }

  private updateUsagePatterns(adapterId: string, record: ExecutionRecord): void {
    if (!this.usagePatterns.has(adapterId)) {
      this.usagePatterns.set(adapterId, this.createDefaultUsagePattern())
    }

    const pattern = this.usagePatterns.get(adapterId)!

    // Update user patterns
    if (record.context.userId) {
      if (!pattern.userDistribution.has(record.context.userId)) {
        pattern.userDistribution.set(record.context.userId, 0)
      }
      pattern.userDistribution.set(
        record.context.userId,
        pattern.userDistribution.get(record.context.userId)! + 1
      )
    }

    // Update workspace patterns
    if (record.context.workspaceId) {
      if (!pattern.workspaceDistribution.has(record.context.workspaceId)) {
        pattern.workspaceDistribution.set(record.context.workspaceId, 0)
      }
      pattern.workspaceDistribution.set(
        record.context.workspaceId,
        pattern.workspaceDistribution.get(record.context.workspaceId)! + 1
      )
    }

    // Update time-based patterns
    const hour = record.timestamp.getHours()
    const dayOfWeek = record.timestamp.getDay()

    pattern.peakHours[hour] = (pattern.peakHours[hour] || 0) + 1
    pattern.weeklyPattern[dayOfWeek] = (pattern.weeklyPattern[dayOfWeek] || 0) + 1

    // Update common parameter patterns
    if (record.metadata.parameterCount) {
      const key = `params_${record.metadata.parameterCount}`
      pattern.commonParameterPatterns.set(key, (pattern.commonParameterPatterns.get(key) || 0) + 1)
    }
  }

  private checkForAlerts(adapterId: string, record: ExecutionRecord): void {
    if (!this.config.enableAlerting) return

    this.alertManager.checkExecutionRecord(adapterId, record)
  }

  private aggregatePerformanceMetrics(): void {
    // Aggregate metrics across all adapters
    // This could be more sophisticated with time-series data
  }

  private performHealthChecks(): void {
    this.healthChecker.performSystemCheck()
  }

  private determineSystemHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const errorRate =
      this.realTimeMetrics.failedExecutions / Math.max(1, this.realTimeMetrics.totalExecutions)

    if (errorRate > 0.1) return 'unhealthy' // > 10% error rate
    if (errorRate > 0.05) return 'degraded' // > 5% error rate
    if (this.realTimeMetrics.averageResponseTime > this.config.responseTimeThreshold) {
      return 'degraded'
    }

    return 'healthy'
  }

  private analyzeErrorsForAdapter(
    adapterId: string,
    startTime: number,
    endTime: number
  ): ErrorAnalysis {
    const errors = this.errorTracking.get(adapterId) || []
    const relevantErrors = errors.filter((e) => {
      const time = e.timestamp.getTime()
      return time >= startTime && time <= endTime
    })

    const errorsByType = new Map<string, number>()
    const errorsByHour = new Array(24).fill(0)
    let totalErrors = relevantErrors.length
    let recoverableErrors = 0

    for (const error of relevantErrors) {
      // Count by type
      errorsByType.set(error.errorType, (errorsByType.get(error.errorType) || 0) + 1)

      // Count by hour
      const hour = error.timestamp.getHours()
      errorsByHour[hour]++

      // Count recoverable errors
      if (error.recoverable) recoverableErrors++
    }

    return {
      totalErrors,
      errorRate:
        totalErrors / Math.max(1, this.getExecutionCountForPeriod(adapterId, startTime, endTime)),
      recoverableErrors,
      errorsByType: Object.fromEntries(errorsByType),
      errorsByHour,
      topErrors: this.getTopErrors(relevantErrors, 5),
      trends: this.calculateErrorTrends(relevantErrors),
    }
  }

  private analyzeErrorsForAllAdapters(startTime: number, endTime: number): ErrorAnalysis {
    let combinedAnalysis: ErrorAnalysis = {
      totalErrors: 0,
      errorRate: 0,
      recoverableErrors: 0,
      errorsByType: {},
      errorsByHour: new Array(24).fill(0),
      topErrors: [],
      trends: [],
    }

    for (const adapterId of this.errorTracking.keys()) {
      const analysis = this.analyzeErrorsForAdapter(adapterId, startTime, endTime)

      // Combine results
      combinedAnalysis.totalErrors += analysis.totalErrors
      combinedAnalysis.recoverableErrors += analysis.recoverableErrors

      // Merge error types
      for (const [type, count] of Object.entries(analysis.errorsByType)) {
        combinedAnalysis.errorsByType[type] = (combinedAnalysis.errorsByType[type] || 0) + count
      }

      // Merge hourly data
      for (let i = 0; i < 24; i++) {
        combinedAnalysis.errorsByHour[i] += analysis.errorsByHour[i]
      }

      // Merge top errors
      combinedAnalysis.topErrors.push(...analysis.topErrors)
    }

    // Calculate overall error rate
    const totalExecutions = this.getTotalExecutionsForPeriod(startTime, endTime)
    combinedAnalysis.errorRate = combinedAnalysis.totalErrors / Math.max(1, totalExecutions)

    // Sort and limit top errors
    combinedAnalysis.topErrors = combinedAnalysis.topErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return combinedAnalysis
  }

  private getExecutionCountForPeriod(
    adapterId: string,
    startTime: number,
    endTime: number
  ): number {
    const records = this.executionHistory.get(adapterId) || []
    return records.filter((r) => {
      const time = r.timestamp.getTime()
      return time >= startTime && time <= endTime
    }).length
  }

  private getTotalExecutionsForPeriod(startTime: number, endTime: number): number {
    let total = 0
    for (const adapterId of this.executionHistory.keys()) {
      total += this.getExecutionCountForPeriod(adapterId, startTime, endTime)
    }
    return total
  }

  private getTopErrors(
    errors: ErrorRecord[],
    limit: number
  ): Array<{ type: string; message: string; count: number }> {
    const errorCounts = new Map<string, { type: string; message: string; count: number }>()

    for (const error of errors) {
      const key = `${error.errorType}:${error.errorMessage}`
      if (errorCounts.has(key)) {
        errorCounts.get(key)!.count++
      } else {
        errorCounts.set(key, {
          type: error.errorType,
          message: error.errorMessage,
          count: 1,
        })
      }
    }

    return Array.from(errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  private calculateErrorTrends(errors: ErrorRecord[]): ErrorTrend[] {
    // Simplified trend calculation
    // Would be more sophisticated in a real implementation
    return []
  }

  private cleanupAdapterData(adapterId: string): void {
    this.executionHistory.delete(adapterId)
    this.performanceMetrics.delete(adapterId)
    this.errorTracking.delete(adapterId)
    this.usagePatterns.delete(adapterId)
  }

  private createDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      averageResponseTime: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      totalResponseTime: 0,
      slowExecutions: 0,
      lastExecution: new Date(),
    }
  }

  private createDefaultUsagePattern(): UsagePattern {
    return {
      userDistribution: new Map(),
      workspaceDistribution: new Map(),
      peakHours: {},
      weeklyPattern: {},
      commonParameterPatterns: new Map(),
      seasonalTrends: [],
    }
  }

  private getDefaultTimeRange(): TimeRange {
    const now = Date.now()
    return {
      start: now - 86400000, // Last 24 hours
      end: now,
    }
  }

  private estimateObjectSize(obj: any): number {
    return JSON.stringify(obj || {}).length
  }

  private getTotalRecordCount(): number {
    let count = 0
    for (const records of this.executionHistory.values()) {
      count += records.length
    }
    for (const errors of this.errorTracking.values()) {
      count += errors.length
    }
    return count
  }

  private estimateMemoryFreed(removedRecords: number): number {
    // Rough estimate: 1KB per record
    return Math.round(removedRecords / 1024)
  }

  private async persistData(): Promise<void> {
    // Data persistence implementation would go here
    logger.debug('Data persistence not implemented')
  }

  private convertToCSV(data: any): string {
    // CSV conversion implementation
    return JSON.stringify(data) // Placeholder
  }

  private async convertToExcel(data: any): Promise<Buffer> {
    // Excel conversion implementation
    return Buffer.from(JSON.stringify(data)) // Placeholder
  }

  private generateExportFilename(
    format: string,
    timeRange?: TimeRange,
    adapterId?: string
  ): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const scope = adapterId || 'all-adapters'
    return `analytics-${scope}-${timestamp}.${format}`
  }
}

// Supporting classes (simplified implementations)

class AlertManager {
  private alerts: Alert[] = []
  private rules: AlertRule[] = []

  constructor(
    private config: AnalyticsConfig,
    private analytics: AnalyticsSystem
  ) {}

  checkExecutionRecord(adapterId: string, record: ExecutionRecord): void {
    // Check for alert conditions
    for (const rule of this.rules) {
      if (this.evaluateRule(rule, adapterId, record)) {
        this.triggerAlert(rule, adapterId, record)
      }
    }
  }

  configureRules(rules: AlertRule[]): void {
    this.rules = rules
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => a.status === 'active')
  }

  private evaluateRule(rule: AlertRule, adapterId: string, record: ExecutionRecord): boolean {
    // Rule evaluation logic would go here
    return false // Placeholder
  }

  private triggerAlert(rule: AlertRule, adapterId: string, record: ExecutionRecord): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.title,
      description: rule.description,
      adapterId,
      timestamp: new Date(),
      status: 'active',
      metadata: {
        rule: rule.name,
        executionRecord: record,
      },
    }

    this.alerts.push(alert)
    this.analytics.emit('alert:triggered', alert)
  }

  async shutdown(): Promise<void> {}
}

class HealthChecker {
  constructor(
    private config: AnalyticsConfig,
    private analytics: AnalyticsSystem
  ) {}

  performSystemCheck(): void {
    // System health check logic
  }

  getSystemHealth(): SystemHealthStatus {
    return {
      overall: 'healthy',
      components: {},
      lastCheck: new Date(),
      uptime: Date.now() - 0, // Would track actual uptime
    }
  }

  async shutdown(): Promise<void> {}
}

class TrendAnalyzer {
  constructor(
    private config: AnalyticsConfig,
    private analytics: AnalyticsSystem
  ) {}

  analyze(adapterId?: string): TrendAnalysis {
    // Trend analysis logic would go here
    return {
      trends: [],
      predictions: [],
      confidence: 0,
      recommendations: [],
    }
  }

  async shutdown(): Promise<void> {}
}

class AggregationEngine {
  constructor(
    private config: AnalyticsConfig,
    private analytics: AnalyticsSystem
  ) {}

  async aggregateData(options: AggregationOptions): Promise<any> {
    // Data aggregation logic
    return {}
  }

  async recompute(): Promise<void> {
    // Recompute aggregated metrics
  }

  async shutdown(): Promise<void> {}
}

class ReportGenerator {
  constructor(
    private config: AnalyticsConfig,
    private analytics: AnalyticsSystem
  ) {}

  async generate(options: ReportOptions): Promise<AnalyticsReport> {
    // Report generation logic
    return {
      id: `report_${Date.now()}`,
      type: options.type,
      generatedAt: new Date(),
      timeRange: options.timeRange,
      data: {},
      summary: {},
      charts: [],
    }
  }

  async shutdown(): Promise<void> {}
}

// Supporting interfaces and types

interface AnalyticsConfig {
  retentionDays?: number
  maxRecordsPerAdapter?: number
  realTimeIntervalMs?: number
  metricsIntervalMs?: number
  healthCheckIntervalMs?: number
  slowExecutionThresholdMs?: number
  errorRateThreshold?: number
  responseTimeThreshold?: number
  enableAlerting?: boolean
  alertCooldownMs?: number
  criticalErrorThreshold?: number
  enablePersistence?: boolean
  persistenceInterval?: number
  enableTrendAnalysis?: boolean
  enablePredictiveAlerts?: boolean
  enableDetailedTracing?: boolean
}

interface ExecutionRecord {
  adapterId: string
  timestamp: Date
  duration: number
  success: boolean
  context: {
    type: string
    agentId?: string
    sessionId?: string
    userId?: string
    workspaceId?: string
  }
  error?: {
    type: string
    message: string
    recoverable: boolean
  }
  metadata: {
    parameterCount: number
    resultSize: number
    executionId: string
  }
}

interface ErrorRecord {
  adapterId: string
  timestamp: Date
  errorType: string
  errorMessage: string
  recoverable: boolean
  context: ExecutionRecord['context']
  executionDuration: number
  stackTrace?: string
}

interface AdapterRegistrationRecord {
  adapterId: string
  timestamp: Date
  category: string
  tags: string[]
  version: string
  source: string
}

interface PerformanceMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  totalResponseTime: number
  slowExecutions: number
  lastExecution: Date
  hourlyStats?: Array<{
    executions: number
    errors: number
    averageResponseTime: number
    totalResponseTime: number
  }>
}

interface UsagePattern {
  userDistribution: Map<string, number>
  workspaceDistribution: Map<string, number>
  peakHours: Record<number, number>
  weeklyPattern: Record<number, number>
  commonParameterPatterns: Map<string, number>
  seasonalTrends: any[]
}

interface RealTimeMetrics {
  currentExecutions: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageResponseTime: number
  requestsPerSecond: number
  errorsPerSecond: number
  activeAdapters: number
  systemHealth: 'healthy' | 'degraded' | 'unhealthy'
}

interface ErrorAnalysis {
  totalErrors: number
  errorRate: number
  recoverableErrors: number
  errorsByType: Record<string, number>
  errorsByHour: number[]
  topErrors: Array<{ type: string; message: string; count: number }>
  trends: ErrorTrend[]
}

interface ErrorTrend {
  type: string
  direction: 'increasing' | 'decreasing' | 'stable'
  magnitude: number
  confidence: number
}

interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>
  lastCheck: Date
  uptime: number
}

interface TrendAnalysis {
  trends: any[]
  predictions: any[]
  confidence: number
  recommendations: string[]
}

interface Alert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  adapterId: string
  timestamp: Date
  status: 'active' | 'resolved' | 'suppressed'
  metadata: any
}

interface AlertRule {
  name: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  condition: any
  cooldown?: number
}

interface TimeRange {
  start: number
  end: number
}

interface ExportResult {
  data: any
  mimeType: string
  filename: string
  size: number
}

interface CleanupResult {
  removedRecords: number
  retainedRecords: number
  freedMemoryMB: number
}

interface AggregationOptions {
  timeRange: TimeRange
  adapterId?: string
  includeExecutions: boolean
  includeErrors: boolean
  includeMetrics: boolean
}

interface ReportOptions {
  type: ReportType
  timeRange: TimeRange
  adapterId?: string
  executionHistory: Map<string, ExecutionRecord[]>
  performanceMetrics: Map<string, PerformanceMetrics>
  errorTracking: Map<string, ErrorRecord[]>
  usagePatterns: Map<string, UsagePattern>
  realTimeMetrics: RealTimeMetrics
}

interface AnalyticsReport {
  id: string
  type: ReportType
  generatedAt: Date
  timeRange: TimeRange
  data: any
  summary: any
  charts: any[]
}

type ReportType = 'performance' | 'usage' | 'errors' | 'trends' | 'comprehensive'
