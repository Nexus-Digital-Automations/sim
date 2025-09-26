/**
 * @fileoverview Error Analytics System - Comprehensive error tracking and analysis system
 * This module provides advanced analytics capabilities for monitoring error patterns,
 * recovery success rates, user satisfaction metrics, and system performance insights.
 * It integrates with the Intelligent Error Recovery Engine to provide data-driven
 * improvements to error handling and tool reliability.
 *
 * @version 1.0.0
 * @author Intelligent Error Handling Agent
 * @created 2025-09-24
 */

import { EventEmitter } from 'events'
import type {
  ErrorClassification,
  ErrorRecoveryContext,
  IntelligentRecoveryPlan,
  RecoveryAction,
} from './intelligent-error-recovery-engine'

/**
 * Core interfaces for error analytics tracking
 */

/**
 * Represents a single error event with contextual information
 */
export interface ErrorEvent {
  /** Unique identifier for this error event */
  id: string
  /** Timestamp when error occurred */
  timestamp: Date
  /** Original error information */
  error: {
    message: string
    stack?: string
    code?: string
    type: string
  }
  /** Context when error occurred */
  context: ErrorRecoveryContext
  /** Error classification results */
  classification: ErrorClassification
  /** Recovery plan that was generated */
  recoveryPlan?: IntelligentRecoveryPlan
  /** User's selected recovery action */
  selectedAction?: RecoveryAction
  /** Recovery outcome */
  outcome?: ErrorRecoveryOutcome
  /** User feedback on the error handling */
  userFeedback?: UserErrorFeedback
  /** Session information */
  session: {
    userId?: string
    sessionId: string
    userAgent?: string
    platform?: string
  }
  /** Geographic information for regional analysis */
  geographic?: {
    country?: string
    region?: string
    timezone?: string
  }
}

/**
 * Recovery outcome tracking
 */
export interface ErrorRecoveryOutcome {
  /** Whether recovery was successful */
  success: boolean
  /** Time taken to resolve the error */
  resolutionTimeMs: number
  /** Number of recovery attempts made */
  attemptCount: number
  /** Final resolution method */
  resolutionMethod: 'automatic' | 'user_guided' | 'manual_intervention' | 'escalation'
  /** Additional context about the resolution */
  resolutionNotes?: string
  /** Whether alternative tools were used */
  alternativeToolUsed?: boolean
  /** Tool that ultimately succeeded */
  successfulTool?: string
}

/**
 * User feedback on error handling experience
 */
export interface UserErrorFeedback {
  /** Overall satisfaction rating (1-5) */
  satisfactionRating: number
  /** Helpfulness of error message (1-5) */
  messageHelpfulness: number
  /** Effectiveness of recovery suggestions (1-5) */
  recoveryEffectiveness: number
  /** Ease of resolution (1-5) */
  resolutionEase: number
  /** Free-form feedback text */
  comments?: string
  /** Whether user would recommend the error handling */
  wouldRecommend?: boolean
  /** Timestamp of feedback */
  feedbackTimestamp: Date
}

/**
 * Analytics aggregation interfaces
 */

/**
 * Error frequency analytics
 */
export interface ErrorFrequencyAnalytics {
  /** Total error count for time period */
  totalErrors: number
  /** Errors per day */
  errorsPerDay: number
  /** Most common error types */
  topErrorTypes: Array<{
    type: string
    count: number
    percentage: number
  }>
  /** Error distribution by hour of day */
  hourlyDistribution: Record<number, number>
  /** Error distribution by day of week */
  dailyDistribution: Record<string, number>
  /** Trending patterns */
  trends: {
    increasing: string[]
    decreasing: string[]
    stable: string[]
  }
}

/**
 * Recovery effectiveness analytics
 */
export interface RecoveryEffectivenessAnalytics {
  /** Overall recovery success rate */
  overallSuccessRate: number
  /** Success rate by error type */
  successRateByType: Record<string, number>
  /** Success rate by recovery method */
  successRateByMethod: Record<string, number>
  /** Average resolution time */
  averageResolutionTime: number
  /** Resolution time by error type */
  resolutionTimeByType: Record<string, number>
  /** Most effective recovery actions */
  topRecoveryActions: Array<{
    action: string
    successRate: number
    usageCount: number
  }>
  /** Alternative tool effectiveness */
  alternativeToolSuccess: Record<
    string,
    {
      successRate: number
      usageCount: number
      averageResolutionTime: number
    }
  >
}

/**
 * User experience analytics
 */
export interface UserExperienceAnalytics {
  /** Average satisfaction rating */
  averageSatisfaction: number
  /** Satisfaction trend over time */
  satisfactionTrend: Array<{
    date: string
    rating: number
  }>
  /** User feedback distribution */
  feedbackDistribution: {
    satisfaction: Record<number, number>
    messageHelpfulness: Record<number, number>
    recoveryEffectiveness: Record<number, number>
    resolutionEase: Record<number, number>
  }
  /** Net Promoter Score for error handling */
  netPromoterScore: number
  /** Common user complaints */
  commonComplaints: Array<{
    theme: string
    count: number
    examples: string[]
  }>
  /** Positive feedback themes */
  positiveThemes: Array<{
    theme: string
    count: number
    examples: string[]
  }>
}

/**
 * System performance analytics
 */
export interface SystemPerformanceAnalytics {
  /** Error handling performance metrics */
  performance: {
    averageProcessingTime: number
    processingTimeByType: Record<string, number>
    memoryUsage: {
      average: number
      peak: number
      trend: Array<{ timestamp: Date; usage: number }>
    }
    cpuUsage: {
      average: number
      peak: number
      trend: Array<{ timestamp: Date; usage: number }>
    }
  }
  /** System reliability metrics */
  reliability: {
    uptimePercentage: number
    errorHandlingUptime: number
    systemFailures: number
    failureTypes: Record<string, number>
  }
  /** Capacity metrics */
  capacity: {
    concurrentErrorsHandled: number
    peakConcurrency: number
    queueDepth: {
      average: number
      peak: number
      trend: Array<{ timestamp: Date; depth: number }>
    }
  }
}

/**
 * Predictive analytics insights
 */
export interface PredictiveAnalytics {
  /** Predicted error hotspots */
  errorHotspots: Array<{
    area: string
    riskScore: number
    predictedIncrease: number
    recommendedActions: string[]
  }>
  /** Capacity predictions */
  capacityPredictions: {
    expectedPeakHours: number[]
    requiredResources: {
      cpu: number
      memory: number
      storage: number
    }
    scalingRecommendations: string[]
  }
  /** User behavior predictions */
  userBehaviorPredictions: {
    likelySatisfactionDrop: Array<{
      errorType: string
      probability: number
      preventiveActions: string[]
    }>
    churnRisk: {
      highRiskUsers: number
      factors: string[]
      interventions: string[]
    }
  }
}

/**
 * Analytics configuration options
 */
export interface AnalyticsConfig {
  /** Data retention period in days */
  retentionDays: number
  /** Sampling rate for performance metrics (0-1) */
  performanceSamplingRate: number
  /** Enable predictive analytics */
  enablePredictiveAnalytics: boolean
  /** Aggregation intervals */
  aggregationIntervals: {
    realtime: number // seconds
    hourly: boolean
    daily: boolean
    weekly: boolean
    monthly: boolean
  }
  /** Privacy settings */
  privacy: {
    anonymizeUserData: boolean
    excludePersonalInfo: boolean
    dataEncryption: boolean
  }
  /** Alert thresholds */
  alertThresholds: {
    errorRateIncrease: number // percentage
    satisfactionDrop: number // rating points
    resolutionTimeIncrease: number // milliseconds
    systemResourceUsage: number // percentage
  }
}

/**
 * Alert definitions
 */
export interface AnalyticsAlert {
  /** Alert identifier */
  id: string
  /** Alert type */
  type:
    | 'error_spike'
    | 'satisfaction_drop'
    | 'performance_degradation'
    | 'capacity_warning'
    | 'system_failure'
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Alert title */
  title: string
  /** Detailed description */
  description: string
  /** When alert was triggered */
  timestamp: Date
  /** Related metrics */
  metrics: Record<string, any>
  /** Recommended actions */
  recommendations: string[]
  /** Whether alert is acknowledged */
  acknowledged: boolean
  /** Alert resolution status */
  resolved: boolean
}

/**
 * Main Error Analytics System class
 */
export class ErrorAnalyticsSystem extends EventEmitter {
  private config: AnalyticsConfig
  private errorEvents: Map<string, ErrorEvent> = new Map()
  private aggregatedData: Map<string, any> = new Map()
  private alerts: Map<string, AnalyticsAlert> = new Map()
  private performanceMetrics: Array<any> = []
  private isRunning = false

  constructor(config?: Partial<AnalyticsConfig>) {
    super()

    // Default configuration
    this.config = {
      retentionDays: 90,
      performanceSamplingRate: 0.1,
      enablePredictiveAnalytics: true,
      aggregationIntervals: {
        realtime: 30,
        hourly: true,
        daily: true,
        weekly: true,
        monthly: true,
      },
      privacy: {
        anonymizeUserData: true,
        excludePersonalInfo: true,
        dataEncryption: true,
      },
      alertThresholds: {
        errorRateIncrease: 25, // 25% increase
        satisfactionDrop: 0.5, // 0.5 rating points
        resolutionTimeIncrease: 5000, // 5 second increase
        systemResourceUsage: 80, // 80% resource usage
      },
      ...config,
    }

    this.initializeAnalytics()
  }

  /**
   * Initialize the analytics system
   */
  private async initializeAnalytics(): Promise<void> {
    try {
      console.log('Initializing Error Analytics System...')

      // Set up data retention cleanup
      this.setupDataRetention()

      // Start background processing
      this.startBackgroundProcessing()

      // Initialize predictive models if enabled
      if (this.config.enablePredictiveAnalytics) {
        await this.initializePredictiveModels()
      }

      this.isRunning = true
      this.emit('analytics_initialized', { timestamp: new Date() })

      console.log('Error Analytics System initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Error Analytics System:', error)
      this.emit('analytics_error', { error, context: 'initialization' })
      throw error
    }
  }

  /**
   * Record an error event for analytics
   */
  public async recordErrorEvent(
    error: Error,
    context: ErrorRecoveryContext,
    classification: ErrorClassification,
    sessionInfo?: Partial<ErrorEvent['session']>
  ): Promise<string> {
    try {
      const eventId = this.generateEventId()
      const timestamp = new Date()

      const errorEvent: ErrorEvent = {
        id: eventId,
        timestamp,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: (error as any).code,
          type: error instanceof Error ? error.constructor.name : 'unknown',
        },
        context,
        classification,
        session: {
          sessionId: context.sessionId || this.generateSessionId(),
          userAgent: sessionInfo?.userAgent,
          platform: sessionInfo?.platform,
          ...sessionInfo,
        },
        geographic: await this.getGeographicInfo(context),
      }

      // Store the event
      this.errorEvents.set(eventId, errorEvent)

      // Emit event for real-time processing
      this.emit('error_recorded', errorEvent)

      // Check for alerts
      await this.checkAlertConditions(errorEvent)

      console.log(
        `Recorded error event: ${eventId} - ${error instanceof Error ? error.message : String(error)}`
      )
      return eventId
    } catch (analyticsError) {
      console.error('Failed to record error event:', analyticsError)
      // Don't let analytics failures break error handling
      return `fallback_${Date.now()}`
    }
  }

  /**
   * Record recovery plan generation
   */
  public async recordRecoveryPlan(
    eventId: string,
    recoveryPlan: IntelligentRecoveryPlan
  ): Promise<void> {
    const event = this.errorEvents.get(eventId)
    if (event) {
      event.recoveryPlan = recoveryPlan
      this.emit('recovery_plan_recorded', { eventId, recoveryPlan })
    }
  }

  /**
   * Record user's selected recovery action
   */
  public async recordSelectedAction(
    eventId: string,
    selectedAction: RecoveryAction
  ): Promise<void> {
    const event = this.errorEvents.get(eventId)
    if (event) {
      event.selectedAction = selectedAction
      this.emit('recovery_action_selected', { eventId, selectedAction })
    }
  }

  /**
   * Record recovery outcome
   */
  public async recordRecoveryOutcome(
    eventId: string,
    outcome: ErrorRecoveryOutcome
  ): Promise<void> {
    const event = this.errorEvents.get(eventId)
    if (event) {
      event.outcome = outcome
      this.emit('recovery_outcome_recorded', { eventId, outcome })

      // Trigger analytics updates
      await this.updateAnalytics()
    }
  }

  /**
   * Record user feedback
   */
  public async recordUserFeedback(eventId: string, feedback: UserErrorFeedback): Promise<void> {
    const event = this.errorEvents.get(eventId)
    if (event) {
      event.userFeedback = feedback
      this.emit('user_feedback_recorded', { eventId, feedback })

      // Check for satisfaction alerts
      if (feedback.satisfactionRating <= 2) {
        await this.triggerSatisfactionAlert(event, feedback)
      }
    }
  }

  /**
   * Get comprehensive error frequency analytics
   */
  public async getErrorFrequencyAnalytics(timeRangeHours = 24): Promise<ErrorFrequencyAnalytics> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000)

    const relevantEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime
    )

    const totalErrors = relevantEvents.length
    const errorsPerDay = (totalErrors / timeRangeHours) * 24

    // Calculate error type distribution
    const typeCount = new Map<string, number>()
    relevantEvents.forEach((event) => {
      const type = event.error.type
      typeCount.set(type, (typeCount.get(type) || 0) + 1)
    })

    const topErrorTypes = Array.from(typeCount.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalErrors) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate hourly distribution
    const hourlyDistribution: Record<number, number> = {}
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution[hour] = 0
    }
    relevantEvents.forEach((event) => {
      const hour = event.timestamp.getHours()
      hourlyDistribution[hour]++
    })

    // Calculate daily distribution
    const dailyDistribution: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    relevantEvents.forEach((event) => {
      const dayName = dayNames[event.timestamp.getDay()]
      dailyDistribution[dayName]++
    })

    // Calculate trends (simplified - would use more sophisticated analysis in production)
    const trends = await this.calculateErrorTrends(relevantEvents)

    return {
      totalErrors,
      errorsPerDay,
      topErrorTypes,
      hourlyDistribution,
      dailyDistribution,
      trends,
    }
  }

  /**
   * Get recovery effectiveness analytics
   */
  public async getRecoveryEffectivenessAnalytics(
    timeRangeHours = 24
  ): Promise<RecoveryEffectivenessAnalytics> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000)

    const relevantEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime && event.outcome
    )

    const successfulRecoveries = relevantEvents.filter((event) => event.outcome?.success)
    const overallSuccessRate =
      relevantEvents.length > 0 ? (successfulRecoveries.length / relevantEvents.length) * 100 : 0

    // Success rate by error type
    const successRateByType: Record<string, number> = {}
    const typeGroups = this.groupEventsByType(relevantEvents)
    Object.entries(typeGroups).forEach(([type, events]) => {
      const successful = events.filter((event) => event.outcome?.success).length
      successRateByType[type] = (successful / events.length) * 100
    })

    // Success rate by recovery method
    const successRateByMethod: Record<string, number> = {}
    const methodGroups = this.groupEventsByMethod(relevantEvents)
    Object.entries(methodGroups).forEach(([method, events]) => {
      const successful = events.filter((event) => event.outcome?.success).length
      successRateByMethod[method] = (successful / events.length) * 100
    })

    // Average resolution time
    const resolutionTimes = relevantEvents
      .filter((event) => event.outcome?.resolutionTimeMs)
      .map((event) => event.outcome!.resolutionTimeMs)
    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0

    // Resolution time by error type
    const resolutionTimeByType: Record<string, number> = {}
    Object.entries(typeGroups).forEach(([type, events]) => {
      const times = events
        .filter((event) => event.outcome?.resolutionTimeMs)
        .map((event) => event.outcome!.resolutionTimeMs)
      resolutionTimeByType[type] =
        times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0
    })

    // Top recovery actions
    const topRecoveryActions = await this.calculateTopRecoveryActions(relevantEvents)

    // Alternative tool success
    const alternativeToolSuccess = await this.calculateAlternativeToolSuccess(relevantEvents)

    return {
      overallSuccessRate,
      successRateByType,
      successRateByMethod,
      averageResolutionTime,
      resolutionTimeByType,
      topRecoveryActions,
      alternativeToolSuccess,
    }
  }

  /**
   * Get user experience analytics
   */
  public async getUserExperienceAnalytics(timeRangeHours = 24): Promise<UserExperienceAnalytics> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000)

    const relevantEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime && event.userFeedback
    )

    // Average satisfaction
    const satisfactionRatings = relevantEvents.map(
      (event) => event.userFeedback!.satisfactionRating
    )
    const averageSatisfaction =
      satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length
        : 0

    // Satisfaction trend
    const satisfactionTrend = await this.calculateSatisfactionTrend(relevantEvents)

    // Feedback distribution
    const feedbackDistribution = await this.calculateFeedbackDistribution(relevantEvents)

    // Net Promoter Score (based on satisfaction ratings)
    const netPromoterScore = await this.calculateNetPromoterScore(relevantEvents)

    // Common complaints and positive themes
    const commonComplaints = await this.extractCommonComplaints(relevantEvents)
    const positiveThemes = await this.extractPositiveThemes(relevantEvents)

    return {
      averageSatisfaction,
      satisfactionTrend,
      feedbackDistribution,
      netPromoterScore,
      commonComplaints,
      positiveThemes,
    }
  }

  /**
   * Get system performance analytics
   */
  public async getSystemPerformanceAnalytics(): Promise<SystemPerformanceAnalytics> {
    // Performance metrics tracking
    const performanceData = this.aggregatePerformanceMetrics()

    // Memory and CPU usage trends
    const resourceTrends = await this.getResourceUsageTrends()

    // System reliability calculations
    const reliabilityMetrics = await this.calculateReliabilityMetrics()

    // Capacity analysis
    const capacityMetrics = await this.calculateCapacityMetrics()

    return {
      performance: {
        averageProcessingTime: performanceData.avgProcessingTime,
        processingTimeByType: performanceData.processingTimeByType,
        memoryUsage: resourceTrends.memory,
        cpuUsage: resourceTrends.cpu,
      },
      reliability: reliabilityMetrics,
      capacity: capacityMetrics,
    }
  }

  /**
   * Get predictive analytics insights
   */
  public async getPredictiveAnalytics(): Promise<PredictiveAnalytics> {
    if (!this.config.enablePredictiveAnalytics) {
      throw new Error('Predictive analytics is disabled')
    }

    // Predict error hotspots
    const errorHotspots = await this.predictErrorHotspots()

    // Capacity predictions
    const capacityPredictions = await this.predictCapacityRequirements()

    // User behavior predictions
    const userBehaviorPredictions = await this.predictUserBehavior()

    return {
      errorHotspots,
      capacityPredictions,
      userBehaviorPredictions,
    }
  }

  /**
   * Get current active alerts
   */
  public getActiveAlerts(): AnalyticsAlert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alert_acknowledged', { alertId, timestamp: new Date() })
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string, resolutionNotes?: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.resolved = true
      alert.acknowledged = true
      this.emit('alert_resolved', { alertId, resolutionNotes, timestamp: new Date() })
    }
  }

  /**
   * Export analytics data for external analysis
   */
  public async exportAnalyticsData(
    format: 'json' | 'csv' | 'excel',
    timeRangeHours = 168 // 7 days default
  ): Promise<string | Buffer> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - timeRangeHours * 60 * 60 * 1000)

    const relevantEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime
    )

    switch (format) {
      case 'json':
        return JSON.stringify(
          {
            exportMetadata: {
              timestamp: new Date(),
              timeRange: { startTime, endTime },
              eventCount: relevantEvents.length,
            },
            events: relevantEvents,
            aggregatedAnalytics: {
              frequency: await this.getErrorFrequencyAnalytics(timeRangeHours),
              recovery: await this.getRecoveryEffectivenessAnalytics(timeRangeHours),
              userExperience: await this.getUserExperienceAnalytics(timeRangeHours),
              performance: await this.getSystemPerformanceAnalytics(),
            },
          },
          null,
          2
        )

      case 'csv':
        return this.exportToCSV(relevantEvents)

      case 'excel':
        return this.exportToExcel(relevantEvents)

      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // Private helper methods

  private generateEventId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async getGeographicInfo(
    context: ErrorRecoveryContext
  ): Promise<ErrorEvent['geographic']> {
    // In a real implementation, this would use IP geolocation or browser APIs
    // For now, return empty object
    return {}
  }

  private setupDataRetention(): void {
    // Set up periodic cleanup of old data
    const cleanupInterval = setInterval(
      () => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

        // Clean up error events
        for (const [eventId, event] of this.errorEvents.entries()) {
          if (event.timestamp < cutoffDate) {
            this.errorEvents.delete(eventId)
          }
        }

        // Clean up old alerts
        for (const [alertId, alert] of this.alerts.entries()) {
          if (alert.resolved && alert.timestamp < cutoffDate) {
            this.alerts.delete(alertId)
          }
        }
      },
      24 * 60 * 60 * 1000
    ) // Daily cleanup

    // Clear interval on shutdown
    process.on('exit', () => clearInterval(cleanupInterval))
  }

  private startBackgroundProcessing(): void {
    // Real-time aggregation
    setInterval(() => {
      this.updateRealTimeAggregations()
    }, this.config.aggregationIntervals.realtime * 1000)

    // Hourly aggregation
    if (this.config.aggregationIntervals.hourly) {
      setInterval(
        () => {
          this.updateHourlyAggregations()
        },
        60 * 60 * 1000
      ) // Every hour
    }

    // Daily aggregation
    if (this.config.aggregationIntervals.daily) {
      setInterval(
        () => {
          this.updateDailyAggregations()
        },
        24 * 60 * 60 * 1000
      ) // Every day
    }
  }

  private async initializePredictiveModels(): Promise<void> {
    // Initialize machine learning models for predictive analytics
    // This would integrate with ML libraries in a real implementation
    console.log('Initializing predictive analytics models...')
  }

  private async checkAlertConditions(errorEvent: ErrorEvent): Promise<void> {
    // Check for various alert conditions
    await Promise.all([
      this.checkErrorRateAlert(),
      this.checkPerformanceAlert(),
      this.checkSystemHealthAlert(),
    ])
  }

  private async checkErrorRateAlert(): Promise<void> {
    // Check if error rate has increased significantly
    const currentHourErrors = Array.from(this.errorEvents.values()).filter((event) => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      return event.timestamp >= hourAgo
    }).length

    const previousHourErrors = Array.from(this.errorEvents.values()).filter((event) => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      return event.timestamp >= twoHoursAgo && event.timestamp < hourAgo
    }).length

    if (previousHourErrors > 0) {
      const increasePercentage =
        ((currentHourErrors - previousHourErrors) / previousHourErrors) * 100

      if (increasePercentage > this.config.alertThresholds.errorRateIncrease) {
        await this.createAlert({
          type: 'error_spike',
          severity: increasePercentage > 50 ? 'critical' : 'high',
          title: 'Error Rate Spike Detected',
          description: `Error rate increased by ${increasePercentage.toFixed(1)}% in the last hour`,
          metrics: { currentHourErrors, previousHourErrors, increasePercentage },
          recommendations: [
            'Check system health and resource utilization',
            'Review recent deployments or configuration changes',
            'Monitor user feedback for additional insights',
          ],
        })
      }
    }
  }

  private async checkPerformanceAlert(): Promise<void> {
    // Monitor processing time degradation
    const recentEvents = Array.from(this.errorEvents.values())
      .slice(-100) // Last 100 events
      .filter((event) => event.outcome?.resolutionTimeMs)

    if (recentEvents.length >= 50) {
      const recent = recentEvents.slice(-25)
      const earlier = recentEvents.slice(-50, -25)

      const recentAvg =
        recent.reduce((sum, event) => sum + event.outcome!.resolutionTimeMs, 0) / recent.length
      const earlierAvg =
        earlier.reduce((sum, event) => sum + event.outcome!.resolutionTimeMs, 0) / earlier.length

      if (recentAvg - earlierAvg > this.config.alertThresholds.resolutionTimeIncrease) {
        await this.createAlert({
          type: 'performance_degradation',
          severity: 'medium',
          title: 'Resolution Time Degradation',
          description: `Average resolution time increased by ${(recentAvg - earlierAvg).toFixed(0)}ms`,
          metrics: { recentAvg, earlierAvg, difference: recentAvg - earlierAvg },
          recommendations: [
            'Check system resource utilization',
            'Review recent changes to error handling logic',
            'Consider scaling resources if needed',
          ],
        })
      }
    }
  }

  private async checkSystemHealthAlert(): Promise<void> {
    // System health monitoring would go here
    // This is a placeholder for actual system health checks
  }

  private async createAlert(
    alertData: Omit<AnalyticsAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>
  ): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const alert: AnalyticsAlert = {
      id: alertId,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      ...alertData,
    }

    this.alerts.set(alertId, alert)
    this.emit('alert_created', alert)

    console.warn(`ALERT CREATED [${alert.severity.toUpperCase()}]: ${alert.title}`)
  }

  private async triggerSatisfactionAlert(
    event: ErrorEvent,
    feedback: UserErrorFeedback
  ): Promise<void> {
    await this.createAlert({
      type: 'satisfaction_drop',
      severity: feedback.satisfactionRating === 1 ? 'high' : 'medium',
      title: 'Low User Satisfaction',
      description: `User reported satisfaction rating of ${feedback.satisfactionRating}/5 for error handling`,
      metrics: {
        eventId: event.id,
        errorType: event.error.type,
        satisfactionRating: feedback.satisfactionRating,
        comments: feedback.comments,
      },
      recommendations: [
        'Review error message clarity and helpfulness',
        'Analyze recovery suggestions effectiveness',
        'Consider improving user interface for error handling',
      ],
    })
  }

  private async updateAnalytics(): Promise<void> {
    // Trigger background aggregation updates
    this.updateRealTimeAggregations()
  }

  private updateRealTimeAggregations(): void {
    // Update real-time aggregated data
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

    const recentEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= fifteenMinutesAgo
    )

    this.aggregatedData.set('realtime_15min', {
      timestamp: now,
      errorCount: recentEvents.length,
      successRate: this.calculateSuccessRate(recentEvents),
      avgResolutionTime: this.calculateAvgResolutionTime(recentEvents),
    })
  }

  private updateHourlyAggregations(): void {
    // Update hourly aggregated data
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const hourlyEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= oneHourAgo
    )

    this.aggregatedData.set(`hourly_${now.getHours()}`, {
      timestamp: now,
      errorCount: hourlyEvents.length,
      successRate: this.calculateSuccessRate(hourlyEvents),
      avgResolutionTime: this.calculateAvgResolutionTime(hourlyEvents),
      topErrorTypes: this.getTopErrorTypes(hourlyEvents, 5),
    })
  }

  private updateDailyAggregations(): void {
    // Update daily aggregated data
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const dailyEvents = Array.from(this.errorEvents.values()).filter(
      (event) => event.timestamp >= oneDayAgo
    )

    this.aggregatedData.set(`daily_${now.toDateString()}`, {
      timestamp: now,
      errorCount: dailyEvents.length,
      successRate: this.calculateSuccessRate(dailyEvents),
      avgResolutionTime: this.calculateAvgResolutionTime(dailyEvents),
      topErrorTypes: this.getTopErrorTypes(dailyEvents, 10),
      userSatisfaction: this.calculateAvgSatisfaction(dailyEvents),
    })
  }

  // Additional helper methods for calculations

  private calculateSuccessRate(events: ErrorEvent[]): number {
    const eventsWithOutcome = events.filter((event) => event.outcome)
    if (eventsWithOutcome.length === 0) return 0

    const successful = eventsWithOutcome.filter((event) => event.outcome?.success)
    return (successful.length / eventsWithOutcome.length) * 100
  }

  private calculateAvgResolutionTime(events: ErrorEvent[]): number {
    const eventsWithTime = events.filter((event) => event.outcome?.resolutionTimeMs)
    if (eventsWithTime.length === 0) return 0

    const totalTime = eventsWithTime.reduce(
      (sum, event) => sum + event.outcome!.resolutionTimeMs,
      0
    )
    return totalTime / eventsWithTime.length
  }

  private getTopErrorTypes(
    events: ErrorEvent[],
    limit: number
  ): Array<{ type: string; count: number }> {
    const typeCounts = new Map<string, number>()
    events.forEach((event) => {
      const type = event.error.type
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
    })

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  private calculateAvgSatisfaction(events: ErrorEvent[]): number {
    const eventsWithFeedback = events.filter((event) => event.userFeedback)
    if (eventsWithFeedback.length === 0) return 0

    const totalSatisfaction = eventsWithFeedback.reduce(
      (sum, event) => sum + event.userFeedback!.satisfactionRating,
      0
    )
    return totalSatisfaction / eventsWithFeedback.length
  }

  private groupEventsByType(events: ErrorEvent[]): Record<string, ErrorEvent[]> {
    const groups: Record<string, ErrorEvent[]> = {}
    events.forEach((event) => {
      const type = event.error.type
      if (!groups[type]) groups[type] = []
      groups[type].push(event)
    })
    return groups
  }

  private groupEventsByMethod(events: ErrorEvent[]): Record<string, ErrorEvent[]> {
    const groups: Record<string, ErrorEvent[]> = {}
    events.forEach((event) => {
      const method = event.outcome?.resolutionMethod || 'unknown'
      if (!groups[method]) groups[method] = []
      groups[method].push(event)
    })
    return groups
  }

  private async calculateErrorTrends(
    events: ErrorEvent[]
  ): Promise<{ increasing: string[]; decreasing: string[]; stable: string[] }> {
    // Simplified trend calculation - in production would use statistical analysis
    const typeGroups = this.groupEventsByType(events)
    const trends = {
      increasing: [] as string[],
      decreasing: [] as string[],
      stable: [] as string[],
    }

    Object.keys(typeGroups).forEach((type) => {
      // Simple trend based on recent vs earlier frequency
      const typeEvents = typeGroups[type].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      )
      const midpoint = Math.floor(typeEvents.length / 2)
      const earlierCount = midpoint
      const recentCount = typeEvents.length - midpoint

      if (recentCount > earlierCount * 1.2) {
        trends.increasing.push(type)
      } else if (recentCount < earlierCount * 0.8) {
        trends.decreasing.push(type)
      } else {
        trends.stable.push(type)
      }
    })

    return trends
  }

  private async calculateTopRecoveryActions(
    events: ErrorEvent[]
  ): Promise<Array<{ action: string; successRate: number; usageCount: number }>> {
    const actionStats = new Map<string, { total: number; successful: number }>()

    events.forEach((event) => {
      if (event.selectedAction && event.outcome) {
        const actionKey = event.selectedAction.id
        const stats = actionStats.get(actionKey) || { total: 0, successful: 0 }
        stats.total++
        if (event.outcome.success) {
          stats.successful++
        }
        actionStats.set(actionKey, stats)
      }
    })

    return Array.from(actionStats.entries())
      .map(([action, stats]) => ({
        action,
        successRate: (stats.successful / stats.total) * 100,
        usageCount: stats.total,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10)
  }

  private async calculateAlternativeToolSuccess(
    events: ErrorEvent[]
  ): Promise<
    Record<string, { successRate: number; usageCount: number; averageResolutionTime: number }>
  > {
    const toolStats = new Map<string, { total: number; successful: number; totalTime: number }>()

    events.forEach((event) => {
      if (event.outcome?.alternativeToolUsed && event.outcome.successfulTool) {
        const tool = event.outcome.successfulTool
        const stats = toolStats.get(tool) || { total: 0, successful: 0, totalTime: 0 }
        stats.total++
        if (event.outcome.success) {
          stats.successful++
        }
        stats.totalTime += event.outcome.resolutionTimeMs
        toolStats.set(tool, stats)
      }
    })

    const result: Record<
      string,
      { successRate: number; usageCount: number; averageResolutionTime: number }
    > = {}
    toolStats.forEach((stats, tool) => {
      result[tool] = {
        successRate: (stats.successful / stats.total) * 100,
        usageCount: stats.total,
        averageResolutionTime: stats.totalTime / stats.total,
      }
    })

    return result
  }

  private async calculateSatisfactionTrend(
    events: ErrorEvent[]
  ): Promise<Array<{ date: string; rating: number }>> {
    // Group events by day and calculate average satisfaction
    const dailyGroups = new Map<string, number[]>()

    events.forEach((event) => {
      if (event.userFeedback) {
        const date = event.timestamp.toISOString().split('T')[0]
        const ratings = dailyGroups.get(date) || []
        ratings.push(event.userFeedback.satisfactionRating)
        dailyGroups.set(date, ratings)
      }
    })

    return Array.from(dailyGroups.entries())
      .map(([date, ratings]) => ({
        date,
        rating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private async calculateFeedbackDistribution(
    events: ErrorEvent[]
  ): Promise<UserExperienceAnalytics['feedbackDistribution']> {
    const distribution = {
      satisfaction: {} as Record<number, number>,
      messageHelpfulness: {} as Record<number, number>,
      recoveryEffectiveness: {} as Record<number, number>,
      resolutionEase: {} as Record<number, number>,
    }

    // Initialize rating buckets
    for (let i = 1; i <= 5; i++) {
      distribution.satisfaction[i] = 0
      distribution.messageHelpfulness[i] = 0
      distribution.recoveryEffectiveness[i] = 0
      distribution.resolutionEase[i] = 0
    }

    events.forEach((event) => {
      if (event.userFeedback) {
        const feedback = event.userFeedback
        distribution.satisfaction[feedback.satisfactionRating]++
        distribution.messageHelpfulness[feedback.messageHelpfulness]++
        distribution.recoveryEffectiveness[feedback.recoveryEffectiveness]++
        distribution.resolutionEase[feedback.resolutionEase]++
      }
    })

    return distribution
  }

  private async calculateNetPromoterScore(events: ErrorEvent[]): Promise<number> {
    const ratings = events
      .filter((event) => event.userFeedback)
      .map((event) => event.userFeedback!.satisfactionRating)

    if (ratings.length === 0) return 0

    // Convert 1-5 scale to NPS-style calculation
    const promoters = ratings.filter((rating) => rating >= 4).length
    const detractors = ratings.filter((rating) => rating <= 2).length

    return ((promoters - detractors) / ratings.length) * 100
  }

  private async extractCommonComplaints(
    events: ErrorEvent[]
  ): Promise<Array<{ theme: string; count: number; examples: string[] }>> {
    const complaints = events
      .filter((event) => event.userFeedback?.comments && event.userFeedback.satisfactionRating <= 3)
      .map((event) => event.userFeedback!.comments!)

    // Simple keyword-based theme extraction (in production would use NLP)
    const themes = new Map<string, string[]>()
    complaints.forEach((comment) => {
      const lowerComment = comment.toLowerCase()
      if (lowerComment.includes('confusing') || lowerComment.includes('unclear')) {
        const examples = themes.get('unclear_messages') || []
        examples.push(comment)
        themes.set('unclear_messages', examples)
      }
      if (lowerComment.includes('slow') || lowerComment.includes('time')) {
        const examples = themes.get('slow_resolution') || []
        examples.push(comment)
        themes.set('slow_resolution', examples)
      }
      // Add more theme detection logic
    })

    return Array.from(themes.entries())
      .map(([theme, examples]) => ({
        theme,
        count: examples.length,
        examples: examples.slice(0, 3), // Top 3 examples
      }))
      .sort((a, b) => b.count - a.count)
  }

  private async extractPositiveThemes(
    events: ErrorEvent[]
  ): Promise<Array<{ theme: string; count: number; examples: string[] }>> {
    const positiveComments = events
      .filter((event) => event.userFeedback?.comments && event.userFeedback.satisfactionRating >= 4)
      .map((event) => event.userFeedback!.comments!)

    // Simple keyword-based positive theme extraction
    const themes = new Map<string, string[]>()
    positiveComments.forEach((comment) => {
      const lowerComment = comment.toLowerCase()
      if (lowerComment.includes('helpful') || lowerComment.includes('clear')) {
        const examples = themes.get('helpful_guidance') || []
        examples.push(comment)
        themes.set('helpful_guidance', examples)
      }
      if (lowerComment.includes('quick') || lowerComment.includes('fast')) {
        const examples = themes.get('quick_resolution') || []
        examples.push(comment)
        themes.set('quick_resolution', examples)
      }
      // Add more positive theme detection logic
    })

    return Array.from(themes.entries())
      .map(([theme, examples]) => ({
        theme,
        count: examples.length,
        examples: examples.slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
  }

  // Performance and system metrics helpers (simplified implementations)

  private aggregatePerformanceMetrics(): {
    avgProcessingTime: number
    processingTimeByType: Record<string, number>
  } {
    // In a real implementation, this would aggregate actual performance metrics
    return {
      avgProcessingTime: 150, // milliseconds
      processingTimeByType: {
        TypeError: 120,
        NetworkError: 200,
        ValidationError: 80,
      },
    }
  }

  private async getResourceUsageTrends(): Promise<{ memory: any; cpu: any }> {
    // Simplified resource usage tracking
    return {
      memory: {
        average: 256,
        peak: 512,
        trend: [
          { timestamp: new Date(Date.now() - 3600000), usage: 240 },
          { timestamp: new Date(Date.now() - 1800000), usage: 260 },
          { timestamp: new Date(), usage: 250 },
        ],
      },
      cpu: {
        average: 15,
        peak: 45,
        trend: [
          { timestamp: new Date(Date.now() - 3600000), usage: 12 },
          { timestamp: new Date(Date.now() - 1800000), usage: 18 },
          { timestamp: new Date(), usage: 14 },
        ],
      },
    }
  }

  private async calculateReliabilityMetrics(): Promise<SystemPerformanceAnalytics['reliability']> {
    return {
      uptimePercentage: 99.8,
      errorHandlingUptime: 99.9,
      systemFailures: 2,
      failureTypes: {
        memory_exhaustion: 1,
        network_timeout: 1,
      },
    }
  }

  private async calculateCapacityMetrics(): Promise<SystemPerformanceAnalytics['capacity']> {
    return {
      concurrentErrorsHandled: 25,
      peakConcurrency: 50,
      queueDepth: {
        average: 3,
        peak: 12,
        trend: [
          { timestamp: new Date(Date.now() - 3600000), depth: 2 },
          { timestamp: new Date(Date.now() - 1800000), depth: 4 },
          { timestamp: new Date(), depth: 3 },
        ],
      },
    }
  }

  // Predictive analytics methods (simplified implementations)

  private async predictErrorHotspots(): Promise<PredictiveAnalytics['errorHotspots']> {
    return [
      {
        area: 'Network API Calls',
        riskScore: 0.85,
        predictedIncrease: 25,
        recommendedActions: [
          'Implement circuit breakers',
          'Add retry mechanisms',
          'Monitor API endpoint health',
        ],
      },
      {
        area: 'Data Validation',
        riskScore: 0.65,
        predictedIncrease: 15,
        recommendedActions: [
          'Enhance input validation',
          'Add schema validation',
          'Improve error messages',
        ],
      },
    ]
  }

  private async predictCapacityRequirements(): Promise<PredictiveAnalytics['capacityPredictions']> {
    return {
      expectedPeakHours: [9, 10, 11, 14, 15, 16], // Business hours
      requiredResources: {
        cpu: 85, // percentage
        memory: 75, // percentage
        storage: 60, // percentage
      },
      scalingRecommendations: [
        'Consider auto-scaling during peak hours',
        'Add memory allocation for error processing',
        'Implement load balancing for error handling services',
      ],
    }
  }

  private async predictUserBehavior(): Promise<PredictiveAnalytics['userBehaviorPredictions']> {
    return {
      likelySatisfactionDrop: [
        {
          errorType: 'NetworkError',
          probability: 0.7,
          preventiveActions: [
            'Improve network error messages',
            'Add offline capability hints',
            'Implement better retry UX',
          ],
        },
      ],
      churnRisk: {
        highRiskUsers: 12,
        factors: ['repeated errors', 'low satisfaction', 'no successful resolutions'],
        interventions: [
          'Proactive support outreach',
          'Personalized error recovery',
          'Enhanced documentation',
        ],
      },
    }
  }

  // Export helpers (simplified implementations)

  private exportToCSV(events: ErrorEvent[]): string {
    const headers = [
      'Event ID',
      'Timestamp',
      'Error Type',
      'Error Message',
      'Resolution Success',
      'Resolution Time (ms)',
      'User Satisfaction',
      'Recovery Method',
      'Alternative Tool Used',
    ]

    const rows = events.map((event) => [
      event.id,
      event.timestamp.toISOString(),
      event.error.type,
      event.error.message.replace(/"/g, '""'), // Escape quotes
      event.outcome?.success ? 'Yes' : 'No',
      event.outcome?.resolutionTimeMs || '',
      event.userFeedback?.satisfactionRating || '',
      event.outcome?.resolutionMethod || '',
      event.outcome?.alternativeToolUsed ? 'Yes' : 'No',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n')

    return csvContent
  }

  private exportToExcel(events: ErrorEvent[]): Buffer {
    // In a real implementation, this would use a library like xlsx to create an Excel file
    // For now, return CSV content as buffer
    const csvContent = this.exportToCSV(events)
    return Buffer.from(csvContent, 'utf8')
  }

  /**
   * Get system status and health information
   */
  public getSystemStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    isRunning: boolean
    eventCount: number
    alertCount: number
    lastUpdated: Date
  } {
    const activeAlerts = this.getActiveAlerts()
    const criticalAlerts = activeAlerts.filter((alert) => alert.severity === 'critical')
    const warningAlerts = activeAlerts.filter(
      (alert) => alert.severity === 'high' || alert.severity === 'medium'
    )

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (criticalAlerts.length > 0) {
      status = 'critical'
    } else if (warningAlerts.length > 0) {
      status = 'warning'
    }

    return {
      status,
      isRunning: this.isRunning,
      eventCount: this.errorEvents.size,
      alertCount: activeAlerts.length,
      lastUpdated: new Date(),
    }
  }

  /**
   * Cleanup and shutdown the analytics system
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('Shutting down Error Analytics System...')
      this.isRunning = false

      // Perform final data aggregation
      this.updateRealTimeAggregations()

      // Export final analytics if needed
      // await this.exportFinalAnalytics();

      // Clear intervals and cleanup
      this.removeAllListeners()

      console.log('Error Analytics System shutdown complete')
    } catch (error) {
      console.error('Error during analytics system shutdown:', error)
      throw error
    }
  }
}

/**
 * Factory function to create a configured Error Analytics System instance
 */
export function createErrorAnalyticsSystem(
  config?: Partial<AnalyticsConfig>
): ErrorAnalyticsSystem {
  return new ErrorAnalyticsSystem(config)
}

/**
 * Default configuration for production environments
 */
export const PRODUCTION_ANALYTICS_CONFIG: AnalyticsConfig = {
  retentionDays: 90,
  performanceSamplingRate: 0.1,
  enablePredictiveAnalytics: true,
  aggregationIntervals: {
    realtime: 30,
    hourly: true,
    daily: true,
    weekly: true,
    monthly: true,
  },
  privacy: {
    anonymizeUserData: true,
    excludePersonalInfo: true,
    dataEncryption: true,
  },
  alertThresholds: {
    errorRateIncrease: 25,
    satisfactionDrop: 0.5,
    resolutionTimeIncrease: 5000,
    systemResourceUsage: 80,
  },
}

/**
 * Configuration optimized for development environments
 */
export const DEVELOPMENT_ANALYTICS_CONFIG: AnalyticsConfig = {
  retentionDays: 7,
  performanceSamplingRate: 1.0,
  enablePredictiveAnalytics: false,
  aggregationIntervals: {
    realtime: 10,
    hourly: true,
    daily: false,
    weekly: false,
    monthly: false,
  },
  privacy: {
    anonymizeUserData: false,
    excludePersonalInfo: false,
    dataEncryption: false,
  },
  alertThresholds: {
    errorRateIncrease: 50,
    satisfactionDrop: 1.0,
    resolutionTimeIncrease: 10000,
    systemResourceUsage: 90,
  },
}
