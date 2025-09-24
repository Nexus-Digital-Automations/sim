/**
 * Universal Tool Adapter System - Analytics Service
 *
 * Comprehensive analytics system for tracking result formatting performance,
 * usage patterns, and user behavior to optimize the system.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ResultAnalytics, ResultFormat } from '../types'

const logger = createLogger('ResultAnalyticsService')

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean
  trackUserInteractions: boolean
  retentionPeriod: number // Days to keep analytics data
}

/**
 * Internal analytics data structure
 */
interface AnalyticsData {
  toolUsage: Map<
    string,
    {
      count: number
      totalProcessingTime: number
      errorCount: number
      formatUsage: Map<ResultFormat, number>
      lastUsed: string
    }
  >

  formatUsage: Map<
    ResultFormat,
    {
      count: number
      totalQualityScore: number
      userSatisfaction: number
      satisfactionSamples: number
    }
  >

  performance: {
    totalFormattings: number
    totalProcessingTime: number
    cacheHits: number
    totalCacheRequests: number
    errorCount: number
  }

  userBehavior: {
    sessionData: Map<
      string,
      {
        preferredFormats: Map<ResultFormat, number>
        followUpActions: Map<string, number>
        sessionDuration: number
        startTime: string
      }
    >
  }

  errors: Array<{
    timestamp: string
    toolId: string
    error: string
    context: Record<string, any>
  }>
}

/**
 * Comprehensive analytics service for result formatting
 */
export class ResultAnalyticsService {
  private data: AnalyticsData
  private config: AnalyticsConfig
  private persistenceInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout

  constructor(config: AnalyticsConfig) {
    this.config = config
    this.data = this.initializeData()

    if (config.enabled) {
      this.startPeriodicTasks()
      logger.info('ResultAnalyticsService initialized', {
        trackUserInteractions: config.trackUserInteractions,
        retentionPeriod: config.retentionPeriod,
      })
    }
  }

  /**
   * Record a successful result formatting
   */
  recordFormatting(
    toolId: string,
    format: ResultFormat,
    processingTime: number,
    qualityScore: number,
    userId?: string
  ): void {
    if (!this.config.enabled) return

    try {
      // Update tool usage
      if (!this.data.toolUsage.has(toolId)) {
        this.data.toolUsage.set(toolId, {
          count: 0,
          totalProcessingTime: 0,
          errorCount: 0,
          formatUsage: new Map(),
          lastUsed: new Date().toISOString(),
        })
      }

      const toolStats = this.data.toolUsage.get(toolId)!
      toolStats.count++
      toolStats.totalProcessingTime += processingTime
      toolStats.lastUsed = new Date().toISOString()

      if (!toolStats.formatUsage.has(format)) {
        toolStats.formatUsage.set(format, 0)
      }
      toolStats.formatUsage.set(format, toolStats.formatUsage.get(format)! + 1)

      // Update format usage
      if (!this.data.formatUsage.has(format)) {
        this.data.formatUsage.set(format, {
          count: 0,
          totalQualityScore: 0,
          userSatisfaction: 0,
          satisfactionSamples: 0,
        })
      }

      const formatStats = this.data.formatUsage.get(format)!
      formatStats.count++
      formatStats.totalQualityScore += qualityScore

      // Update performance metrics
      this.data.performance.totalFormattings++
      this.data.performance.totalProcessingTime += processingTime

      // Track user behavior if enabled
      if (this.config.trackUserInteractions && userId) {
        this.recordUserInteraction(userId, format, 'formatting')
      }

      logger.debug(`Recorded formatting analytics`, {
        toolId,
        format,
        processingTime,
        qualityScore,
      })
    } catch (error) {
      logger.error('Failed to record formatting analytics:', error)
    }
  }

  /**
   * Record a formatting error
   */
  recordError(toolId: string, error: Error, context?: Record<string, any>): void {
    if (!this.config.enabled) return

    try {
      // Update tool error count
      if (this.data.toolUsage.has(toolId)) {
        this.data.toolUsage.get(toolId)!.errorCount++
      }

      // Update global error count
      this.data.performance.errorCount++

      // Store error details
      this.data.errors.push({
        timestamp: new Date().toISOString(),
        toolId,
        error: error.message,
        context: context || {},
      })

      // Limit error history
      if (this.data.errors.length > 1000) {
        this.data.errors = this.data.errors.slice(-500) // Keep last 500 errors
      }

      logger.debug(`Recorded error analytics for tool: ${toolId}`)
    } catch (analyticsError) {
      logger.error('Failed to record error analytics:', analyticsError)
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(toolId: string): void {
    if (!this.config.enabled) return

    this.data.performance.cacheHits++
    this.data.performance.totalCacheRequests++

    logger.debug(`Recorded cache hit for tool: ${toolId}`)
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    if (!this.config.enabled) return

    this.data.performance.totalCacheRequests++
  }

  /**
   * Record user satisfaction rating
   */
  recordUserSatisfaction(
    format: ResultFormat,
    rating: number, // 1-5 scale
    userId?: string
  ): void {
    if (!this.config.enabled) return

    try {
      const formatStats = this.data.formatUsage.get(format)
      if (formatStats) {
        formatStats.userSatisfaction =
          (formatStats.userSatisfaction * formatStats.satisfactionSamples + rating) /
          (formatStats.satisfactionSamples + 1)
        formatStats.satisfactionSamples++
      }

      if (this.config.trackUserInteractions && userId) {
        this.recordUserInteraction(userId, format, `satisfaction:${rating}`)
      }

      logger.debug(`Recorded user satisfaction: ${rating} for format: ${format}`)
    } catch (error) {
      logger.error('Failed to record user satisfaction:', error)
    }
  }

  /**
   * Record user follow-up action
   */
  recordFollowUpAction(action: string, userId?: string): void {
    if (!this.config.enabled || !this.config.trackUserInteractions || !userId) return

    try {
      const session = this.getOrCreateUserSession(userId)
      if (!session.followUpActions.has(action)) {
        session.followUpActions.set(action, 0)
      }
      session.followUpActions.set(action, session.followUpActions.get(action)! + 1)

      logger.debug(`Recorded follow-up action: ${action} for user: ${userId}`)
    } catch (error) {
      logger.error('Failed to record follow-up action:', error)
    }
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(): Promise<ResultAnalytics> {
    const now = Date.now()

    // Calculate tool usage statistics
    const toolUsage: Record<string, any> = {}
    for (const [toolId, stats] of this.data.toolUsage.entries()) {
      const avgProcessingTime = stats.count > 0 ? stats.totalProcessingTime / stats.count : 0
      const errorRate = stats.count > 0 ? (stats.errorCount / stats.count) * 100 : 0

      const popularFormats: Record<ResultFormat, number> = {}
      for (const [format, count] of stats.formatUsage.entries()) {
        popularFormats[format] = count
      }

      toolUsage[toolId] = {
        count: stats.count,
        avgProcessingTime: Number(avgProcessingTime.toFixed(2)),
        errorRate: Number(errorRate.toFixed(2)),
        popularFormats,
      }
    }

    // Calculate format usage statistics
    const formatUsage: Record<ResultFormat, any> = {}
    for (const [format, stats] of this.data.formatUsage.entries()) {
      const avgQualityScore = stats.count > 0 ? stats.totalQualityScore / stats.count : 0

      formatUsage[format] = {
        count: stats.count,
        avgQualityScore: Number(avgQualityScore.toFixed(3)),
        userSatisfaction: Number(stats.userSatisfaction.toFixed(2)),
      }
    }

    // Calculate performance metrics
    const avgFormattingTime =
      this.data.performance.totalFormattings > 0
        ? this.data.performance.totalProcessingTime / this.data.performance.totalFormattings
        : 0

    const cacheHitRate =
      this.data.performance.totalCacheRequests > 0
        ? (this.data.performance.cacheHits / this.data.performance.totalCacheRequests) * 100
        : 0

    const errorRate =
      this.data.performance.totalFormattings > 0
        ? (this.data.performance.errorCount / this.data.performance.totalFormattings) * 100
        : 0

    // Calculate user behavior patterns
    const userBehavior = this.calculateUserBehavior()

    return {
      toolUsage,
      formatUsage,
      performance: {
        avgFormattingTime: Number(avgFormattingTime.toFixed(2)),
        cacheHitRate: Number(cacheHitRate.toFixed(2)),
        errorRate: Number(errorRate.toFixed(2)),
      },
      userBehavior,
    }
  }

  /**
   * Get analytics for a specific tool
   */
  getToolAnalytics(toolId: string): any {
    const stats = this.data.toolUsage.get(toolId)
    if (!stats) {
      return null
    }

    const avgProcessingTime = stats.count > 0 ? stats.totalProcessingTime / stats.count : 0
    const errorRate = stats.count > 0 ? (stats.errorCount / stats.count) * 100 : 0

    const popularFormats: Record<ResultFormat, number> = {}
    for (const [format, count] of stats.formatUsage.entries()) {
      popularFormats[format] = count
    }

    return {
      count: stats.count,
      avgProcessingTime: Number(avgProcessingTime.toFixed(2)),
      errorRate: Number(errorRate.toFixed(2)),
      popularFormats,
      lastUsed: stats.lastUsed,
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50): Array<{
    timestamp: string
    toolId: string
    error: string
    context: Record<string, any>
  }> {
    return this.data.errors.slice(-limit)
  }

  /**
   * Export analytics data
   */
  exportData(): any {
    return {
      toolUsage: Object.fromEntries(this.data.toolUsage.entries()),
      formatUsage: Object.fromEntries(this.data.formatUsage.entries()),
      performance: this.data.performance,
      userBehavior: {
        sessionData: Object.fromEntries(this.data.userBehavior.sessionData.entries()),
      },
      errors: this.data.errors,
      exportedAt: new Date().toISOString(),
    }
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.data = this.initializeData()
    logger.info('Analytics data cleared')
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    logger.info('Analytics service shut down')
  }

  // Private methods

  private initializeData(): AnalyticsData {
    return {
      toolUsage: new Map(),
      formatUsage: new Map(),
      performance: {
        totalFormattings: 0,
        totalProcessingTime: 0,
        cacheHits: 0,
        totalCacheRequests: 0,
        errorCount: 0,
      },
      userBehavior: {
        sessionData: new Map(),
      },
      errors: [],
    }
  }

  private recordUserInteraction(userId: string, format: ResultFormat, action: string): void {
    const session = this.getOrCreateUserSession(userId)

    if (!session.preferredFormats.has(format)) {
      session.preferredFormats.set(format, 0)
    }
    session.preferredFormats.set(format, session.preferredFormats.get(format)! + 1)
  }

  private getOrCreateUserSession(userId: string) {
    if (!this.data.userBehavior.sessionData.has(userId)) {
      this.data.userBehavior.sessionData.set(userId, {
        preferredFormats: new Map(),
        followUpActions: new Map(),
        sessionDuration: 0,
        startTime: new Date().toISOString(),
      })
    }

    return this.data.userBehavior.sessionData.get(userId)!
  }

  private calculateUserBehavior(): any {
    const sessions = Array.from(this.data.userBehavior.sessionData.values())

    if (sessions.length === 0) {
      return {
        preferredFormats: [],
        commonFollowUpActions: [],
        sessionDuration: 0,
      }
    }

    // Aggregate preferred formats
    const formatCounts = new Map<ResultFormat, number>()
    const actionCounts = new Map<string, number>()
    let totalDuration = 0

    for (const session of sessions) {
      // Aggregate format preferences
      for (const [format, count] of session.preferredFormats.entries()) {
        formatCounts.set(format, (formatCounts.get(format) || 0) + count)
      }

      // Aggregate actions
      for (const [action, count] of session.followUpActions.entries()) {
        actionCounts.set(action, (actionCounts.get(action) || 0) + count)
      }

      totalDuration += session.sessionDuration
    }

    // Sort and return top preferences
    const preferredFormats = Array.from(formatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([format]) => format)

    const commonFollowUpActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action]) => action)

    const avgSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0

    return {
      preferredFormats,
      commonFollowUpActions,
      sessionDuration: Number(avgSessionDuration.toFixed(2)),
    }
  }

  private startPeriodicTasks(): void {
    // Periodic persistence (every 5 minutes)
    this.persistenceInterval = setInterval(
      () => {
        this.persistData()
      },
      5 * 60 * 1000
    )

    // Periodic cleanup (daily)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldData()
      },
      24 * 60 * 60 * 1000
    )
  }

  private persistData(): void {
    // In a real implementation, this would save to a database
    // For now, we just log a summary
    logger.debug('Analytics data persisted', {
      toolsTracked: this.data.toolUsage.size,
      formatsTracked: this.data.formatUsage.size,
      totalFormattings: this.data.performance.totalFormattings,
    })
  }

  private cleanupOldData(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod)

    // Clean up old errors
    this.data.errors = this.data.errors.filter((error) => new Date(error.timestamp) > cutoffDate)

    // Clean up old user sessions
    for (const [userId, session] of this.data.userBehavior.sessionData.entries()) {
      if (new Date(session.startTime) < cutoffDate) {
        this.data.userBehavior.sessionData.delete(userId)
      }
    }

    logger.info('Cleaned up old analytics data', {
      retentionPeriod: this.config.retentionPeriod,
      errorsRemaining: this.data.errors.length,
      sessionsRemaining: this.data.userBehavior.sessionData.size,
    })
  }
}
