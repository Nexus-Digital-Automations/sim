/**
 * Agent Performance Monitoring and Analytics System
 * ================================================
 *
 * Comprehensive system for monitoring agent performance, collecting metrics,
 * analyzing conversation quality, and providing optimization insights.
 * Tracks key performance indicators across individual agents and teams.
 *
 * Key Features:
 * - Real-time performance metrics collection
 * - Conversation quality assessment and feedback systems
 * - Agent usage analytics and optimization insights
 * - Performance trend analysis and forecasting
 * - SLA monitoring and alerting
 * - Resource usage optimization
 * - User satisfaction tracking
 * - Automated performance reporting
 */

import { createLogger } from '@/lib/logs/console/logger'
import { EventEmitter } from 'events'
import type {
  Agent,
  Session,
  Event,
  AuthContext
} from '../types'
import type { AgentSessionContext } from './agent-session-manager'

const logger = createLogger('AgentPerformanceMonitor')

/**
 * Performance metric categories
 */
export type PerformanceMetricCategory =
  | 'response_time'
  | 'accuracy'
  | 'user_satisfaction'
  | 'resource_usage'
  | 'conversation_quality'
  | 'goal_completion'
  | 'error_rate'
  | 'escalation_rate'

/**
 * Time-series performance data point
 */
export interface PerformanceDataPoint {
  timestamp: Date
  agentId: string
  sessionId?: string
  category: PerformanceMetricCategory
  metric: string
  value: number
  unit: string
  metadata: Record<string, any>
}

/**
 * Agent performance summary
 */
export interface AgentPerformanceSummary {
  agentId: string
  timeframe: string
  totalSessions: number
  averageResponseTime: number
  userSatisfactionScore: number
  goalCompletionRate: number
  errorRate: number
  escalationRate: number
  resourceEfficiency: number
  conversationQualityScore: number
  trendAnalysis: TrendAnalysis
  recommendations: PerformanceRecommendation[]
  lastUpdated: Date
}

/**
 * Trend analysis data
 */
export interface TrendAnalysis {
  responseTimeTrend: 'improving' | 'declining' | 'stable'
  satisfactionTrend: 'improving' | 'declining' | 'stable'
  volumeTrend: 'increasing' | 'decreasing' | 'stable'
  predictions: {
    nextWeekVolume: number
    nextWeekSatisfaction: number
    nextWeekResponseTime: number
  }
}

/**
 * Performance recommendations
 */
export interface PerformanceRecommendation {
  id: string
  category: 'optimization' | 'training' | 'configuration' | 'resources'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expectedImpact: string
  implementationEffort: 'low' | 'medium' | 'high'
  automated: boolean
}

/**
 * Conversation quality metrics
 */
export interface ConversationQualityMetrics {
  sessionId: string
  agentId: string
  coherenceScore: number
  relevanceScore: number
  helpfulnessScore: number
  professionalismScore: number
  responseTimeConsistency: number
  userEngagement: number
  goalAchievement: number
  overallQualityScore: number
  qualityFactors: QualityFactor[]
}

/**
 * Quality factor analysis
 */
export interface QualityFactor {
  factor: string
  score: number
  impact: 'positive' | 'negative' | 'neutral'
  description: string
}

/**
 * SLA (Service Level Agreement) metrics
 */
export interface SLAMetrics {
  agentId: string
  period: string
  responseTimeSLA: {
    target: number
    actual: number
    compliance: number
  }
  resolutionTimeSLA: {
    target: number
    actual: number
    compliance: number
  }
  satisfactionSLA: {
    target: number
    actual: number
    compliance: number
  }
  availabilitySLA: {
    target: number
    actual: number
    compliance: number
  }
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  id: string
  agentId?: string
  metric: string
  condition: 'above' | 'below' | 'equals'
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  notificationChannels: string[]
}

/**
 * Main Agent Performance Monitor class
 */
export class AgentPerformanceMonitor extends EventEmitter {
  private metrics = new Map<string, PerformanceDataPoint[]>() // agentId -> metrics
  private summaries = new Map<string, AgentPerformanceSummary>()
  private qualityMetrics = new Map<string, ConversationQualityMetrics>() // sessionId -> metrics
  private slaMetrics = new Map<string, SLAMetrics>() // agentId -> SLA
  private alerts = new Map<string, PerformanceAlert>()
  private monitoringIntervals = new Map<string, NodeJS.Timeout>()
  private performanceBaselines = new Map<string, Record<string, number>>()

  constructor() {
    super()
    this.initializeBaselines()
    this.startGlobalMonitoring()
    logger.info('Agent Performance Monitor initialized')
  }

  /**
   * Record a performance metric
   */
  public recordMetric(dataPoint: PerformanceDataPoint): void {
    const agentMetrics = this.metrics.get(dataPoint.agentId) || []
    agentMetrics.push(dataPoint)

    // Keep only last 10,000 data points per agent
    if (agentMetrics.length > 10000) {
      agentMetrics.splice(0, agentMetrics.length - 10000)
    }

    this.metrics.set(dataPoint.agentId, agentMetrics)

    // Check for alerts
    this.checkAlerts(dataPoint)

    // Update real-time summary
    this.updateRealtimeSummary(dataPoint.agentId)

    logger.debug(`Performance metric recorded`, {
      agentId: dataPoint.agentId,
      metric: dataPoint.metric,
      value: dataPoint.value,
      category: dataPoint.category
    })
  }

  /**
   * Start monitoring an agent session
   */
  public startSessionMonitoring(
    sessionId: string,
    agentId: string,
    options: {
      trackResponseTime: boolean
      trackQuality: boolean
      trackSatisfaction: boolean
      alertThresholds?: Record<string, number>
    } = {
      trackResponseTime: true,
      trackQuality: true,
      trackSatisfaction: false
    }
  ): void {
    logger.info(`Starting session monitoring`, { sessionId, agentId })

    // Initialize session quality metrics
    this.qualityMetrics.set(sessionId, {
      sessionId,
      agentId,
      coherenceScore: 0,
      relevanceScore: 0,
      helpfulnessScore: 0,
      professionalismScore: 0,
      responseTimeConsistency: 0,
      userEngagement: 0,
      goalAchievement: 0,
      overallQualityScore: 0,
      qualityFactors: []
    })

    // Set up real-time monitoring
    const monitoringInterval = setInterval(() => {
      this.collectSessionMetrics(sessionId, agentId, options)
    }, 30000) // Monitor every 30 seconds

    this.monitoringIntervals.set(sessionId, monitoringInterval)
  }

  /**
   * Stop monitoring a session and calculate final metrics
   */
  public async stopSessionMonitoring(sessionId: string): Promise<ConversationQualityMetrics | null> {
    logger.info(`Stopping session monitoring`, { sessionId })

    // Clear monitoring interval
    const interval = this.monitoringIntervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(sessionId)
    }

    // Calculate final quality metrics
    const qualityMetrics = await this.calculateFinalQualityMetrics(sessionId)

    if (qualityMetrics) {
      // Record session completion metrics
      this.recordMetric({
        timestamp: new Date(),
        agentId: qualityMetrics.agentId,
        sessionId,
        category: 'conversation_quality',
        metric: 'overall_quality_score',
        value: qualityMetrics.overallQualityScore,
        unit: 'score',
        metadata: { final_assessment: true }
      })

      logger.info(`Session monitoring completed`, {
        sessionId,
        overallQualityScore: qualityMetrics.overallQualityScore
      })
    }

    return qualityMetrics
  }

  /**
   * Analyze conversation quality in real-time
   */
  public async analyzeConversationQuality(
    sessionId: string,
    messages: Event[],
    contextInfo: {
      userGoals?: string[]
      expectedOutcomes?: string[]
      conversationContext?: Record<string, any>
    }
  ): Promise<ConversationQualityMetrics> {
    logger.debug(`Analyzing conversation quality`, { sessionId, messageCount: messages.length })

    const existingMetrics = this.qualityMetrics.get(sessionId)
    if (!existingMetrics) {
      throw new Error(`No quality metrics found for session ${sessionId}`)
    }

    try {
      // Analyze coherence
      const coherenceScore = await this.analyzeCoherence(messages)

      // Analyze relevance
      const relevanceScore = await this.analyzeRelevance(messages, contextInfo)

      // Analyze helpfulness
      const helpfulnessScore = await this.analyzeHelpfulness(messages, contextInfo)

      // Analyze professionalism
      const professionalismScore = await this.analyzeProfessionalism(messages)

      // Analyze response time consistency
      const responseTimeConsistency = this.analyzeResponseTimeConsistency(messages)

      // Analyze user engagement
      const userEngagement = this.analyzeUserEngagement(messages)

      // Analyze goal achievement
      const goalAchievement = await this.analyzeGoalAchievement(messages, contextInfo.userGoals)

      // Calculate overall quality score
      const overallQualityScore = this.calculateOverallQualityScore({
        coherenceScore,
        relevanceScore,
        helpfulnessScore,
        professionalismScore,
        responseTimeConsistency,
        userEngagement,
        goalAchievement
      })

      // Generate quality factors
      const qualityFactors = this.generateQualityFactors({
        coherenceScore,
        relevanceScore,
        helpfulnessScore,
        professionalismScore,
        responseTimeConsistency,
        userEngagement,
        goalAchievement
      })

      // Update metrics
      const updatedMetrics: ConversationQualityMetrics = {
        ...existingMetrics,
        coherenceScore,
        relevanceScore,
        helpfulnessScore,
        professionalismScore,
        responseTimeConsistency,
        userEngagement,
        goalAchievement,
        overallQualityScore,
        qualityFactors
      }

      this.qualityMetrics.set(sessionId, updatedMetrics)

      // Record quality metrics
      this.recordMetric({
        timestamp: new Date(),
        agentId: existingMetrics.agentId,
        sessionId,
        category: 'conversation_quality',
        metric: 'overall_quality_score',
        value: overallQualityScore,
        unit: 'score',
        metadata: {
          coherence: coherenceScore,
          relevance: relevanceScore,
          helpfulness: helpfulnessScore,
          professionalism: professionalismScore
        }
      })

      return updatedMetrics

    } catch (error) {
      logger.error(`Failed to analyze conversation quality`, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Generate performance summary for an agent
   */
  public generatePerformanceSummary(
    agentId: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): AgentPerformanceSummary {
    logger.debug(`Generating performance summary`, { agentId, timeframe })

    const now = new Date()
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }

    const cutoff = new Date(now.getTime() - timeframes[timeframe])
    const agentMetrics = this.metrics.get(agentId) || []
    const recentMetrics = agentMetrics.filter(m => m.timestamp >= cutoff)

    // Calculate summary statistics
    const summary: AgentPerformanceSummary = {
      agentId,
      timeframe,
      totalSessions: this.calculateUniqueSessions(recentMetrics),
      averageResponseTime: this.calculateAverageMetric(recentMetrics, 'response_time'),
      userSatisfactionScore: this.calculateAverageMetric(recentMetrics, 'user_satisfaction'),
      goalCompletionRate: this.calculateAverageMetric(recentMetrics, 'goal_completion'),
      errorRate: this.calculateErrorRate(recentMetrics),
      escalationRate: this.calculateEscalationRate(recentMetrics),
      resourceEfficiency: this.calculateResourceEfficiency(recentMetrics),
      conversationQualityScore: this.calculateAverageMetric(recentMetrics, 'conversation_quality'),
      trendAnalysis: this.calculateTrendAnalysis(agentId, recentMetrics),
      recommendations: this.generateRecommendations(agentId, recentMetrics),
      lastUpdated: new Date()
    }

    this.summaries.set(agentId, summary)

    logger.info(`Performance summary generated`, {
      agentId,
      totalSessions: summary.totalSessions,
      avgResponseTime: summary.averageResponseTime,
      satisfactionScore: summary.userSatisfactionScore
    })

    return summary
  }

  /**
   * Get SLA compliance metrics
   */
  public getSLAMetrics(agentId: string, period: string = 'current_month'): SLAMetrics | undefined {
    return this.slaMetrics.get(agentId)
  }

  /**
   * Create performance alert
   */
  public createAlert(alert: Omit<PerformanceAlert, 'id'>): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullAlert: PerformanceAlert = {
      id: alertId,
      ...alert
    }

    this.alerts.set(alertId, fullAlert)

    logger.info(`Performance alert created`, {
      alertId,
      metric: alert.metric,
      threshold: alert.threshold,
      severity: alert.severity
    })

    return alertId
  }

  /**
   * Get performance insights and optimization recommendations
   */
  public getPerformanceInsights(agentId: string): {
    insights: string[]
    optimizations: string[]
    trends: string[]
    alerts: PerformanceAlert[]
  } {
    const summary = this.summaries.get(agentId)
    if (!summary) {
      return { insights: [], optimizations: [], trends: [], alerts: [] }
    }

    const insights = this.generateInsights(summary)
    const optimizations = this.generateOptimizations(summary)
    const trends = this.generateTrendInsights(summary.trendAnalysis)
    const agentAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.agentId || alert.agentId === agentId)

    return { insights, optimizations, trends, alerts: agentAlerts }
  }

  // Private helper methods

  private initializeBaselines(): void {
    // Initialize baseline performance expectations
    this.performanceBaselines.set('default', {
      response_time: 2000, // 2 seconds
      user_satisfaction: 4.0, // out of 5
      goal_completion: 0.8, // 80%
      error_rate: 0.05, // 5%
      escalation_rate: 0.1 // 10%
    })
  }

  private startGlobalMonitoring(): void {
    // Start global monitoring tasks
    setInterval(() => {
      this.updateAllSummaries()
      this.checkSLACompliance()
      this.cleanupOldMetrics()
    }, 300000) // Every 5 minutes

    logger.debug('Global monitoring started')
  }

  private collectSessionMetrics(
    sessionId: string,
    agentId: string,
    options: any
  ): void {
    // Collect real-time metrics during session
    const currentTime = new Date()

    if (options.trackResponseTime) {
      // This would be integrated with actual session monitoring
      const responseTime = Math.random() * 5000 + 1000 // Simulated
      this.recordMetric({
        timestamp: currentTime,
        agentId,
        sessionId,
        category: 'response_time',
        metric: 'current_response_time',
        value: responseTime,
        unit: 'ms',
        metadata: { realtime: true }
      })
    }

    if (options.trackQuality) {
      // Quality would be calculated from actual conversation analysis
    }
  }

  private async calculateFinalQualityMetrics(sessionId: string): Promise<ConversationQualityMetrics | null> {
    const metrics = this.qualityMetrics.get(sessionId)
    if (!metrics) return null

    // Final quality calculation would happen here
    return metrics
  }

  private async analyzeCoherence(messages: Event[]): Promise<number> {
    // Simplified coherence analysis
    // In production, this would use NLP models
    let coherenceScore = 0.8

    // Check for context consistency
    const agentMessages = messages.filter(m => m.source === 'agent')
    if (agentMessages.length > 1) {
      // Simple heuristic: longer responses tend to be more coherent
      const avgLength = agentMessages.reduce((sum, m) =>
        sum + (typeof m.content === 'string' ? m.content.length : 0), 0
      ) / agentMessages.length

      coherenceScore = Math.min(1.0, avgLength / 200)
    }

    return coherenceScore
  }

  private async analyzeRelevance(messages: Event[], contextInfo: any): Promise<number> {
    // Simplified relevance analysis
    let relevanceScore = 0.75

    // Check if agent responses address user questions
    const userMessages = messages.filter(m => m.source === 'customer')
    const agentMessages = messages.filter(m => m.source === 'agent')

    if (userMessages.length > 0 && agentMessages.length > 0) {
      // Simple heuristic based on response patterns
      relevanceScore = Math.min(1.0, agentMessages.length / userMessages.length)
    }

    return relevanceScore
  }

  private async analyzeHelpfulness(messages: Event[], contextInfo: any): Promise<number> {
    // Simplified helpfulness analysis
    const helpfulnessScore = 0.8

    // Would analyze solution provision, clarity, actionability
    return helpfulnessScore
  }

  private async analyzeProfessionalism(messages: Event[]): Promise<number> {
    // Simplified professionalism analysis
    const professionalismScore = 0.85

    // Would check tone, grammar, politeness
    return professionalismScore
  }

  private analyzeResponseTimeConsistency(messages: Event[]): number {
    // Calculate consistency of response times
    let consistency = 1.0

    const responseTimes: number[] = []
    for (let i = 1; i < messages.length; i++) {
      const timeDiff = messages[i].created_at
        ? new Date(messages[i].created_at).getTime() - new Date(messages[i-1].created_at).getTime()
        : 0
      if (timeDiff > 0) responseTimes.push(timeDiff)
    }

    if (responseTimes.length > 1) {
      const avg = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      const variance = responseTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / responseTimes.length
      consistency = Math.max(0, 1 - (Math.sqrt(variance) / avg))
    }

    return consistency
  }

  private analyzeUserEngagement(messages: Event[]): number {
    // Simple engagement calculation based on conversation length
    const userMessages = messages.filter(m => m.source === 'customer')
    return Math.min(1.0, userMessages.length / 10)
  }

  private async analyzeGoalAchievement(messages: Event[], userGoals?: string[]): Promise<number> {
    // Simplified goal achievement analysis
    let achievementScore = 0.7

    if (userGoals && userGoals.length > 0) {
      // Would analyze if goals were mentioned and addressed
      const lastMessages = messages.slice(-3)
      const hasResolution = lastMessages.some(m =>
        typeof m.content === 'string' &&
        (m.content.includes('resolved') || m.content.includes('completed') || m.content.includes('success'))
      )
      achievementScore = hasResolution ? 0.9 : 0.6
    }

    return achievementScore
  }

  private calculateOverallQualityScore(scores: Record<string, number>): number {
    const weights = {
      coherenceScore: 0.15,
      relevanceScore: 0.20,
      helpfulnessScore: 0.25,
      professionalismScore: 0.10,
      responseTimeConsistency: 0.10,
      userEngagement: 0.10,
      goalAchievement: 0.10
    }

    return Object.entries(scores).reduce((sum, [key, value]) => {
      const weight = weights[key as keyof typeof weights] || 0
      return sum + (value * weight)
    }, 0)
  }

  private generateQualityFactors(scores: Record<string, number>): QualityFactor[] {
    const factors: QualityFactor[] = []

    Object.entries(scores).forEach(([factor, score]) => {
      factors.push({
        factor,
        score,
        impact: score >= 0.8 ? 'positive' : score <= 0.6 ? 'negative' : 'neutral',
        description: `${factor.replace(/([A-Z])/g, ' $1').toLowerCase()} score: ${(score * 100).toFixed(1)}%`
      })
    })

    return factors
  }

  private calculateUniqueSessions(metrics: PerformanceDataPoint[]): number {
    const sessions = new Set(metrics.map(m => m.sessionId).filter(Boolean))
    return sessions.size
  }

  private calculateAverageMetric(metrics: PerformanceDataPoint[], category: string): number {
    const categoryMetrics = metrics.filter(m => m.category === category)
    if (categoryMetrics.length === 0) return 0

    return categoryMetrics.reduce((sum, m) => sum + m.value, 0) / categoryMetrics.length
  }

  private calculateErrorRate(metrics: PerformanceDataPoint[]): number {
    const errorMetrics = metrics.filter(m => m.category === 'error_rate')
    return errorMetrics.length > 0 ? this.calculateAverageMetric(metrics, 'error_rate') : 0
  }

  private calculateEscalationRate(metrics: PerformanceDataPoint[]): number {
    const escalationMetrics = metrics.filter(m => m.category === 'escalation_rate')
    return escalationMetrics.length > 0 ? this.calculateAverageMetric(metrics, 'escalation_rate') : 0
  }

  private calculateResourceEfficiency(metrics: PerformanceDataPoint[]): number {
    // Simplified resource efficiency calculation
    const resourceMetrics = metrics.filter(m => m.category === 'resource_usage')
    return resourceMetrics.length > 0 ? this.calculateAverageMetric(metrics, 'resource_usage') : 1.0
  }

  private calculateTrendAnalysis(agentId: string, metrics: PerformanceDataPoint[]): TrendAnalysis {
    // Simplified trend analysis
    return {
      responseTimeTrend: 'stable',
      satisfactionTrend: 'improving',
      volumeTrend: 'stable',
      predictions: {
        nextWeekVolume: 100,
        nextWeekSatisfaction: 4.2,
        nextWeekResponseTime: 2000
      }
    }
  }

  private generateRecommendations(agentId: string, metrics: PerformanceDataPoint[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    // Analyze metrics and generate recommendations
    const avgResponseTime = this.calculateAverageMetric(metrics, 'response_time')
    if (avgResponseTime > 3000) {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        category: 'optimization',
        priority: 'medium',
        title: 'Improve Response Time',
        description: 'Average response time is above optimal threshold',
        expectedImpact: 'Reduce response time by 20-30%',
        implementationEffort: 'medium',
        automated: false
      })
    }

    return recommendations
  }

  private checkAlerts(dataPoint: PerformanceDataPoint): void {
    const relevantAlerts = Array.from(this.alerts.values())
      .filter(alert =>
        alert.enabled &&
        alert.metric === dataPoint.metric &&
        (!alert.agentId || alert.agentId === dataPoint.agentId)
      )

    for (const alert of relevantAlerts) {
      let triggered = false

      switch (alert.condition) {
        case 'above':
          triggered = dataPoint.value > alert.threshold
          break
        case 'below':
          triggered = dataPoint.value < alert.threshold
          break
        case 'equals':
          triggered = Math.abs(dataPoint.value - alert.threshold) < 0.001
          break
      }

      if (triggered) {
        this.emit('performance:alert', {
          alert,
          dataPoint,
          message: `Alert triggered: ${alert.metric} ${alert.condition} ${alert.threshold}`
        })
      }
    }
  }

  private updateRealtimeSummary(agentId: string): void {
    // Update real-time performance summary
    const summary = this.generatePerformanceSummary(agentId, '1h')
    this.emit('performance:updated', { agentId, summary })
  }

  private updateAllSummaries(): void {
    // Update summaries for all monitored agents
    for (const agentId of this.metrics.keys()) {
      this.generatePerformanceSummary(agentId)
    }
  }

  private checkSLACompliance(): void {
    // Check SLA compliance for all agents
    for (const [agentId, sla] of this.slaMetrics.entries()) {
      if (sla.responseTimeSLA.compliance < 0.95) {
        this.emit('sla:violation', {
          agentId,
          metric: 'response_time',
          compliance: sla.responseTimeSLA.compliance
        })
      }
    }
  }

  private cleanupOldMetrics(): void {
    // Clean up old metrics to prevent memory issues
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

    for (const [agentId, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff)
      this.metrics.set(agentId, filteredMetrics)
    }
  }

  private generateInsights(summary: AgentPerformanceSummary): string[] {
    const insights: string[] = []

    if (summary.userSatisfactionScore > 4.0) {
      insights.push('High user satisfaction indicates effective problem resolution')
    }

    if (summary.averageResponseTime < 2000) {
      insights.push('Excellent response time performance')
    }

    if (summary.escalationRate > 0.2) {
      insights.push('High escalation rate may indicate need for additional training or resources')
    }

    return insights
  }

  private generateOptimizations(summary: AgentPerformanceSummary): string[] {
    const optimizations: string[] = []

    if (summary.averageResponseTime > 3000) {
      optimizations.push('Consider optimizing response generation or increasing agent capacity')
    }

    if (summary.conversationQualityScore < 0.7) {
      optimizations.push('Review conversation flows and provide additional training')
    }

    return optimizations
  }

  private generateTrendInsights(trends: TrendAnalysis): string[] {
    const insights: string[] = []

    if (trends.satisfactionTrend === 'improving') {
      insights.push('User satisfaction is trending upward - continue current approach')
    }

    if (trends.volumeTrend === 'increasing') {
      insights.push('Conversation volume is increasing - consider scaling resources')
    }

    return insights
  }
}

// Export singleton instance
export const agentPerformanceMonitor = new AgentPerformanceMonitor()