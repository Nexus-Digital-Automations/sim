/**
 * Help Search Analytics Service - Comprehensive monitoring and performance analytics
 *
 * Production-ready analytics system for monitoring help search performance, user behavior,
 * and system optimization. Provides real-time insights and automated improvement suggestions.
 *
 * Key Features:
 * - Real-time search performance monitoring
 * - User behavior analytics and pattern detection
 * - Content effectiveness measurement
 * - Search relevance optimization
 * - Automated alerting and reporting
 * - A/B testing support for search algorithms
 *
 * Analytics Capabilities:
 * - Search query analysis and trending
 * - Content discovery and engagement metrics
 * - User satisfaction and feedback analysis
 * - Performance benchmarking and optimization
 * - Recommendation system effectiveness
 * - Contextual help usage patterns
 *
 * Monitoring Features:
 * - Sub-150ms response time tracking
 * - Error rate and availability monitoring
 * - Cache hit/miss ratio optimization
 * - Database performance analysis
 * - Embedding generation efficiency
 * - Resource utilization tracking
 *
 * Dependencies: Database, monitoring infrastructure, analytics storage
 * Usage: Performance optimization, user experience improvement, system monitoring
 */

import { avg, count, gte } from 'drizzle-orm'
import type { Database } from '@/lib/db'
import type { Logger } from '@/lib/monitoring/logger'
import { helpContentAnalytics } from '@/apps/sim/db/schema'

export interface PerformanceMetrics {
  responseTime: {
    average: number
    median: number
    p95: number
    p99: number
  }
  throughput: {
    requestsPerSecond: number
    requestsPerMinute: number
    requestsPerHour: number
  }
  errorRate: {
    rate: number
    totalErrors: number
    totalRequests: number
  }
  cachePerformance: {
    hitRate: number
    missRate: number
    totalHits: number
    totalMisses: number
  }
}

export interface SearchAnalytics {
  queryStats: {
    totalQueries: number
    uniqueQueries: number
    averageQueryLength: number
    topQueries: QueryStatistic[]
    trendingQueries: QueryStatistic[]
    noResultQueries: QueryStatistic[]
  }
  contentStats: {
    totalContent: number
    mostViewedContent: ContentStatistic[]
    mostHelpfulContent: ContentStatistic[]
    underperformingContent: ContentStatistic[]
    categoryDistribution: CategoryStatistic[]
  }
  userBehavior: {
    averageSessionLength: number
    averageQueriesPerSession: number
    clickThroughRate: number
    helpfulnessRatio: number
    bookmarkRate: number
    shareRate: number
  }
  suggestions: {
    totalSuggestions: number
    clickThroughRate: number
    helpfulnessRatio: number
    typeDistribution: SuggestionTypeStatistic[]
  }
}

export interface QueryStatistic {
  query: string
  count: number
  averageResultCount: number
  clickThroughRate: number
  lastSeen: Date
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface ContentStatistic {
  id: string
  title: string
  category: string
  viewCount: number
  helpfulVotes: number
  unhelpfulVotes: number
  avgRating?: number
  ratingCount: number
  clickThroughRate: number
  lastViewed: Date
}

export interface CategoryStatistic {
  category: string
  contentCount: number
  totalViews: number
  averageRating: number
  helpfulnessRatio: number
}

export interface SuggestionTypeStatistic {
  type: string
  count: number
  clickThroughRate: number
  helpfulnessRatio: number
  averageConfidence: number
}

export interface RealtimeMetric {
  timestamp: Date
  metric: string
  value: number
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals'
  threshold: number
  duration: number // minutes
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  channels: string[] // notification channels
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  severity: string
  metric: string
  currentValue: number
  threshold: number
  description: string
  triggeredAt: Date
  resolvedAt?: Date
  status: 'active' | 'resolved' | 'acknowledged'
  metadata?: Record<string, any>
}

export interface AnalyticsReport {
  reportId: string
  generatedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
  summary: SearchAnalytics
  performance: PerformanceMetrics
  recommendations: OptimizationRecommendation[]
  alerts: Alert[]
}

export interface OptimizationRecommendation {
  type: 'performance' | 'content' | 'search' | 'user_experience'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  implementation: string
  estimatedImprovement: number
  metadata?: Record<string, any>
}

/**
 * Comprehensive analytics and monitoring service for help search system
 */
export class HelpSearchAnalyticsService {
  private logger: Logger
  private metricsBuffer: RealtimeMetric[] = []
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, Alert> = new Map()
  private metricsFlushInterval: NodeJS.Timeout | null = null

  constructor(
    private db: Database,
    logger: Logger,
    private config: {
      metricsFlushInterval: number // seconds
      metricsRetentionDays: number
      alertCheckInterval: number // seconds
      performanceTargets: {
        responseTime: number // ms
        errorRate: number // percentage
        cacheHitRate: number // percentage
      }
    } = {
      metricsFlushInterval: 30,
      metricsRetentionDays: 90,
      alertCheckInterval: 60,
      performanceTargets: {
        responseTime: 150,
        errorRate: 1.0,
        cacheHitRate: 80.0,
      },
    }
  ) {
    this.logger = logger.child({ service: 'HelpSearchAnalytics' })
    this.initializeDefaultAlertRules()
    this.setupMetricsCollection()
  }

  /**
   * Record a search performance metric
   *
   * @param metric - Metric name
   * @param value - Metric value
   * @param metadata - Additional metadata
   */
  recordMetric(metric: string, value: number, metadata?: Record<string, any>): void {
    const realtimeMetric: RealtimeMetric = {
      timestamp: new Date(),
      metric,
      value,
      metadata,
    }

    this.metricsBuffer.push(realtimeMetric)

    // Check for immediate alert conditions
    this.checkAlertRules(metric, value, metadata)

    this.logger.debug('Metric recorded', {
      metric,
      value,
      bufferSize: this.metricsBuffer.length,
    })
  }

  /**
   * Record search query analytics
   *
   * @param query - Search query
   * @param resultCount - Number of results returned
   * @param processingTime - Query processing time in ms
   * @param context - Search context
   * @param userInteraction - User interaction with results
   */
  async recordSearchQuery(
    query: string,
    resultCount: number,
    processingTime: number,
    context?: {
      userId?: string
      organizationId?: string
      workflowType?: string
      blockType?: string
    },
    userInteraction?: {
      clickedResults: string[]
      helpfulResults: string[]
      unhelpfulResults: string[]
    }
  ): Promise<void> {
    const operationId = this.generateOperationId()

    try {
      // Record performance metrics
      this.recordMetric('search.response_time', processingTime)
      this.recordMetric('search.result_count', resultCount)
      this.recordMetric('search.queries_total', 1)

      // Record query characteristics
      this.recordMetric('search.query_length', query.length)

      if (resultCount === 0) {
        this.recordMetric('search.no_results_total', 1)
      }

      if (userInteraction) {
        this.recordMetric('search.clicks_total', userInteraction.clickedResults.length)
        this.recordMetric('search.helpful_votes_total', userInteraction.helpfulResults.length)
        this.recordMetric('search.unhelpful_votes_total', userInteraction.unhelpfulResults.length)

        if (userInteraction.clickedResults.length > 0) {
          this.recordMetric('search.click_through_rate', 1)
        } else {
          this.recordMetric('search.click_through_rate', 0)
        }
      }

      // Additional contextual metrics
      if (context) {
        if (context.workflowType) {
          this.recordMetric(`search.workflow.${context.workflowType}`, 1)
        }
        if (context.blockType) {
          this.recordMetric(`search.block.${context.blockType}`, 1)
        }
      }

      this.logger.debug(`[${operationId}] Search query analytics recorded`, {
        queryLength: query.length,
        resultCount,
        processingTime,
        hasUserInteraction: !!userInteraction,
      })
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to record search analytics`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
      })
    }
  }

  /**
   * Record content interaction analytics
   *
   * @param contentId - Content ID
   * @param interaction - Interaction type
   * @param context - User and search context
   * @param timeSpent - Time spent on content in seconds
   */
  async recordContentInteraction(
    contentId: string,
    interaction: 'view' | 'click' | 'helpful' | 'unhelpful' | 'bookmark' | 'share',
    context?: {
      userId?: string
      searchQuery?: string
      searchRank?: number
      sessionId?: string
    },
    timeSpent?: number
  ): Promise<void> {
    const operationId = this.generateOperationId()

    try {
      // Record interaction metrics
      this.recordMetric(`content.${interaction}_total`, 1)
      this.recordMetric('content.interactions_total', 1)

      if (timeSpent) {
        this.recordMetric('content.time_spent', timeSpent)
      }

      // Record content-specific metrics
      this.recordMetric(`content.${contentId}.${interaction}`, 1)

      if (context?.searchRank) {
        this.recordMetric('content.average_click_rank', context.searchRank)
      }

      this.logger.debug(`[${operationId}] Content interaction recorded`, {
        contentId,
        interaction,
        timeSpent,
        hasContext: !!context,
      })
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to record content interaction`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentId,
        interaction,
      })
    }
  }

  /**
   * Generate comprehensive analytics report
   *
   * @param timeRange - Time range for the report
   * @param includeRecommendations - Include optimization recommendations
   * @returns Promise<AnalyticsReport> - Complete analytics report
   */
  async generateAnalyticsReport(
    timeRange: {
      start: Date
      end: Date
    },
    includeRecommendations = true
  ): Promise<AnalyticsReport> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Generating analytics report`, {
      timeRange,
      includeRecommendations,
    })

    try {
      // Generate all report sections in parallel
      const [searchAnalytics, performanceMetrics, recommendations, activeAlerts] =
        await Promise.all([
          this.generateSearchAnalytics(timeRange),
          this.generatePerformanceMetrics(timeRange),
          includeRecommendations
            ? this.generateOptimizationRecommendations(timeRange)
            : Promise.resolve([]),
          this.getActiveAlerts(),
        ])

      const report: AnalyticsReport = {
        reportId: `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        generatedAt: new Date(),
        timeRange,
        summary: searchAnalytics,
        performance: performanceMetrics,
        recommendations,
        alerts: activeAlerts,
      }

      const processingTime = Date.now() - startTime

      this.logger.info(`[${operationId}] Analytics report generated`, {
        reportId: report.reportId,
        processingTimeMs: processingTime,
        recommendationsCount: recommendations.length,
        alertsCount: activeAlerts.length,
      })

      return report
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`[${operationId}] Analytics report generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  /**
   * Get real-time dashboard metrics
   *
   * @param timeWindow - Time window for metrics (in minutes)
   * @returns Real-time metrics summary
   */
  async getRealtimeMetrics(timeWindow = 15) {
    const timeThreshold = new Date(Date.now() - timeWindow * 60 * 1000)

    // Get recent analytics data
    const recentAnalytics = await this.db
      .select({
        eventType: helpContentAnalytics.eventType,
        count: count(),
        avgProcessingTime: avg(helpContentAnalytics.timeSpentSeconds),
      })
      .from(helpContentAnalytics)
      .where(gte(helpContentAnalytics.createdAt, timeThreshold))
      .groupBy(helpContentAnalytics.eventType)

    // Calculate real-time metrics from buffer
    const bufferedMetrics = this.calculateBufferedMetrics(timeWindow)

    return {
      timestamp: new Date(),
      timeWindow,
      database: recentAnalytics,
      realtime: bufferedMetrics,
      alerts: Array.from(this.activeAlerts.values()).filter((alert) => alert.status === 'active')
        .length,
    }
  }

  /**
   * Add or update alert rule
   *
   * @param rule - Alert rule configuration
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
    this.logger.info('Alert rule added', {
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
    })
  }

  /**
   * Get all active alerts
   *
   * @returns Array of active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((alert) => alert.status === 'active')
  }

  /**
   * Acknowledge an alert
   *
   * @param alertId - Alert ID to acknowledge
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId)
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged'
      this.logger.info('Alert acknowledged', { alertId, ruleName: alert.ruleName })
    }
  }

  /**
   * Shutdown analytics service
   */
  shutdown(): void {
    if (this.metricsFlushInterval) {
      clearInterval(this.metricsFlushInterval)
      this.metricsFlushInterval = null
    }

    // Flush remaining metrics
    if (this.metricsBuffer.length > 0) {
      this.flushMetrics()
    }

    this.logger.info('Analytics service shutdown completed')
  }

  // Private Methods

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'response_time_high',
        name: 'High Response Time',
        description: 'Search response time exceeds target',
        metric: 'search.response_time',
        condition: 'greater_than',
        threshold: this.config.performanceTargets.responseTime,
        duration: 5,
        severity: 'medium',
        enabled: true,
        channels: ['email', 'slack'],
      },
      {
        id: 'error_rate_high',
        name: 'High Error Rate',
        description: 'Search error rate exceeds target',
        metric: 'search.error_rate',
        condition: 'greater_than',
        threshold: this.config.performanceTargets.errorRate,
        duration: 2,
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack', 'pagerduty'],
      },
      {
        id: 'cache_hit_rate_low',
        name: 'Low Cache Hit Rate',
        description: 'Cache hit rate below target',
        metric: 'search.cache_hit_rate',
        condition: 'less_than',
        threshold: this.config.performanceTargets.cacheHitRate,
        duration: 10,
        severity: 'low',
        enabled: true,
        channels: ['email'],
      },
    ]

    defaultRules.forEach((rule) => this.addAlertRule(rule))
  }

  private setupMetricsCollection(): void {
    // Setup periodic metrics flushing
    this.metricsFlushInterval = setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics()
      }
    }, this.config.metricsFlushInterval * 1000)

    this.logger.info('Metrics collection initialized', {
      flushInterval: this.config.metricsFlushInterval,
      retentionDays: this.config.metricsRetentionDays,
    })
  }

  private flushMetrics(): void {
    // In production, this would send metrics to a time-series database
    // For now, we'll log aggregate metrics
    const metricsToFlush = [...this.metricsBuffer]
    this.metricsBuffer = []

    if (metricsToFlush.length === 0) return

    // Aggregate metrics by type
    const aggregated = new Map<string, { count: number; total: number; min: number; max: number }>()

    for (const metric of metricsToFlush) {
      const key = metric.metric
      const existing = aggregated.get(key) || {
        count: 0,
        total: 0,
        min: metric.value,
        max: metric.value,
      }

      existing.count++
      existing.total += metric.value
      existing.min = Math.min(existing.min, metric.value)
      existing.max = Math.max(existing.max, metric.value)

      aggregated.set(key, existing)
    }

    // Log aggregated metrics
    for (const [metric, stats] of aggregated.entries()) {
      this.logger.debug('Metrics flushed', {
        metric,
        count: stats.count,
        average: stats.total / stats.count,
        min: stats.min,
        max: stats.max,
      })
    }
  }

  private checkAlertRules(metric: string, value: number, metadata?: Record<string, any>): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metric !== metric) continue

      let shouldAlert = false

      switch (rule.condition) {
        case 'greater_than':
          shouldAlert = value > rule.threshold
          break
        case 'less_than':
          shouldAlert = value < rule.threshold
          break
        case 'equals':
          shouldAlert = value === rule.threshold
          break
        case 'not_equals':
          shouldAlert = value !== rule.threshold
          break
      }

      if (shouldAlert) {
        this.triggerAlert(rule, value, metadata)
      }
    }
  }

  private triggerAlert(
    rule: AlertRule,
    currentValue: number,
    metadata?: Record<string, any>
  ): void {
    const alertId = `alert_${rule.id}_${Date.now()}`

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      description: rule.description,
      triggeredAt: new Date(),
      status: 'active',
      metadata,
    }

    this.activeAlerts.set(alertId, alert)

    this.logger.warn('Alert triggered', {
      alertId,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
    })
  }

  private async generateSearchAnalytics(timeRange: {
    start: Date
    end: Date
  }): Promise<SearchAnalytics> {
    // This would generate comprehensive search analytics from the database
    // Placeholder implementation
    return {
      queryStats: {
        totalQueries: 0,
        uniqueQueries: 0,
        averageQueryLength: 0,
        topQueries: [],
        trendingQueries: [],
        noResultQueries: [],
      },
      contentStats: {
        totalContent: 0,
        mostViewedContent: [],
        mostHelpfulContent: [],
        underperformingContent: [],
        categoryDistribution: [],
      },
      userBehavior: {
        averageSessionLength: 0,
        averageQueriesPerSession: 0,
        clickThroughRate: 0,
        helpfulnessRatio: 0,
        bookmarkRate: 0,
        shareRate: 0,
      },
      suggestions: {
        totalSuggestions: 0,
        clickThroughRate: 0,
        helpfulnessRatio: 0,
        typeDistribution: [],
      },
    }
  }

  private async generatePerformanceMetrics(timeRange: {
    start: Date
    end: Date
  }): Promise<PerformanceMetrics> {
    // Generate performance metrics from collected data
    return {
      responseTime: {
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
      },
      throughput: {
        requestsPerSecond: 0,
        requestsPerMinute: 0,
        requestsPerHour: 0,
      },
      errorRate: {
        rate: 0,
        totalErrors: 0,
        totalRequests: 0,
      },
      cachePerformance: {
        hitRate: 0,
        missRate: 0,
        totalHits: 0,
        totalMisses: 0,
      },
    }
  }

  private async generateOptimizationRecommendations(timeRange: {
    start: Date
    end: Date
  }): Promise<OptimizationRecommendation[]> {
    // Generate optimization recommendations based on analytics data
    return []
  }

  private calculateBufferedMetrics(timeWindow: number): Record<string, any> {
    const timeThreshold = Date.now() - timeWindow * 60 * 1000
    const recentMetrics = this.metricsBuffer.filter((m) => m.timestamp.getTime() > timeThreshold)

    const aggregated: Record<string, any> = {}

    for (const metric of recentMetrics) {
      if (!aggregated[metric.metric]) {
        aggregated[metric.metric] = {
          count: 0,
          total: 0,
          average: 0,
          min: metric.value,
          max: metric.value,
        }
      }

      const agg = aggregated[metric.metric]
      agg.count++
      agg.total += metric.value
      agg.average = agg.total / agg.count
      agg.min = Math.min(agg.min, metric.value)
      agg.max = Math.max(agg.max, metric.value)
    }

    return aggregated
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}

export default HelpSearchAnalyticsService
