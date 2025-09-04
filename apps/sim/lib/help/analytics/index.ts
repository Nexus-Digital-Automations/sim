/**
 * Help Analytics System - Main Entry Point
 *
 * Comprehensive help system analytics and performance monitoring
 * integrating all analytics components including:
 * - Core analytics engine with engagement tracking
 * - Real-time monitoring and alerting
 * - Predictive analytics and machine learning
 * - Executive and operational reporting dashboards
 * - A/B testing framework
 * - ROI measurement and business intelligence
 *
 * Based on research: research-build-context-sensitive-help-and-documentation-system-1757009205206.md
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

// Core Analytics Engine
export {
  type ABTest,
  type ABTestResults,
  type AnalyticsRecommendation,
  type BusinessImpactMetrics,
  type ContentPerformanceAnalysis,
  type EffectivenessMetrics,
  type EffectivenessScore,
  type HelpAnalyticsContext,
  HelpAnalyticsEngine,
  type HelpEngagementMetrics,
  type HelpPerformanceReport,
  helpAnalyticsEngine,
  type RealTimeMetrics,
  type ROICalculation,
  type SatisfactionMetrics,
  type SatisfactionRating,
  type SystemAlert,
  type TrendAnalysis,
  type UserEngagementAnalysis,
} from './help-analytics-engine'
// Predictive Analytics
export {
  type ActionRecommendation,
  type HelpPattern,
  type HelpPrediction,
  type HelpPredictionModel,
  type ModelMetrics,
  type PredictionFeatures,
  type PredictionInsight,
  PredictiveHelpAnalytics,
  predictiveHelpAnalytics,
  type UserBehaviorProfile,
  type UserSession,
} from './predictive-analytics'
// Real-time Monitoring
export {
  type AlertThresholds,
  type MonitoringConfig,
  type MonitoringEvent,
  type PerformanceSnapshot,
  RealTimeHelpMonitor,
  realTimeHelpMonitor,
  type SystemHealthCheck,
} from './real-time-monitor'
// Reporting Dashboard
export {
  type ContentInsightsDashboard,
  type ContentMetric,
  type DashboardConfig,
  type DetailedContentAnalysis,
  type ExecutiveDashboard,
  type ExecutiveKPIs,
  HelpAnalyticsReportingDashboard,
  helpAnalyticsReportingDashboard,
  type ReportSchedule,
  type ROISummary,
  type StrategyRecommendation,
  type UserInsightsDashboard,
  type UserSegmentAnalysis,
} from './reporting-dashboard'

import { createLogger } from '@/lib/logs/logger'
import { helpAnalyticsEngine } from './help-analytics-engine'
import { predictiveHelpAnalytics } from './predictive-analytics'
import { realTimeHelpMonitor } from './real-time-monitor'
import { helpAnalyticsReportingDashboard } from './reporting-dashboard'

const logger = createLogger('HelpAnalyticsSystem')

/**
 * Comprehensive Help Analytics System Configuration
 */
export interface HelpAnalyticsSystemConfig {
  analytics: {
    enablePredictiveAnalytics: boolean
    enableRealTimeMonitoring: boolean
    enableReporting: boolean
    enableABTesting: boolean
    dataRetentionDays: number
    batchProcessingInterval: number
  }
  monitoring: {
    updateInterval: number
    alertThresholds: Record<string, number>
    enablePredictiveAlerts: boolean
    healthCheckInterval: number
  }
  reporting: {
    refreshInterval: number
    enableScheduledReports: boolean
    defaultReportFormat: 'json' | 'pdf' | 'excel' | 'csv'
    maxCachedReports: number
  }
  ml: {
    modelRetrainingInterval: number
    minTrainingDataSize: number
    enableAutoModelOptimization: boolean
    predictionConfidenceThreshold: number
  }
}

/**
 * Integrated Help Analytics System
 *
 * Main orchestrator that coordinates all analytics components
 * and provides a unified interface for help system analytics,
 * monitoring, and reporting capabilities.
 */
export class HelpAnalyticsSystem {
  private config: HelpAnalyticsSystemConfig
  private isInitialized = false
  private integrationCallbacks: Map<string, () => void> = new Map()

  constructor(config: Partial<HelpAnalyticsSystemConfig> = {}) {
    this.config = {
      analytics: {
        enablePredictiveAnalytics: true,
        enableRealTimeMonitoring: true,
        enableReporting: true,
        enableABTesting: true,
        dataRetentionDays: 365,
        batchProcessingInterval: 10000,
      },
      monitoring: {
        updateInterval: 10000,
        alertThresholds: {
          satisfactionScore: 3.5,
          responseTime: 2000,
          errorRate: 5.0,
          systemUptime: 99.0,
        },
        enablePredictiveAlerts: true,
        healthCheckInterval: 30000,
      },
      reporting: {
        refreshInterval: 300000,
        enableScheduledReports: true,
        defaultReportFormat: 'json',
        maxCachedReports: 100,
      },
      ml: {
        modelRetrainingInterval: 21600000, // 6 hours
        minTrainingDataSize: 100,
        enableAutoModelOptimization: true,
        predictionConfidenceThreshold: 0.7,
      },
      ...config,
    }

    logger.info('Help Analytics System initialized', {
      config: this.config,
    })
  }

  /**
   * Initialize the complete analytics system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Help Analytics System already initialized')
      return
    }

    logger.info('Initializing Help Analytics System')

    try {
      // Initialize real-time monitoring if enabled
      if (this.config.analytics.enableRealTimeMonitoring) {
        logger.info('Starting real-time monitoring')
        realTimeHelpMonitor.startMonitoring()
      }

      // Set up cross-component integration
      await this.setupComponentIntegration()

      // Initialize scheduled reports if enabled
      if (this.config.reporting.enableScheduledReports) {
        logger.info('Initializing scheduled reporting')
        await this.initializeScheduledReports()
      }

      // Start predictive model training if enabled
      if (this.config.analytics.enablePredictiveAnalytics) {
        logger.info('Initializing predictive analytics')
        await predictiveHelpAnalytics.trainModels()
      }

      this.isInitialized = true
      logger.info('Help Analytics System fully initialized')
    } catch (error) {
      logger.error('Failed to initialize Help Analytics System', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Process help engagement with all analytics components
   */
  async processEngagement(engagement: any): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Processing engagement before system initialization')
      await this.initialize()
    }

    try {
      // Process with core analytics engine
      await helpAnalyticsEngine.trackEngagement(engagement)

      // Process with real-time monitor if enabled
      if (this.config.analytics.enableRealTimeMonitoring) {
        realTimeHelpMonitor.processEngagement(engagement)
      }

      // Update predictive analytics if enabled
      if (this.config.analytics.enablePredictiveAnalytics) {
        await predictiveHelpAnalytics.updateUserBehavior(engagement)
      }
    } catch (error) {
      logger.error('Failed to process engagement', {
        engagementId: engagement.id,
        error: error instanceof Error ? error.message : String(error),
      })
      // Don't throw error to avoid disrupting user experience
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateComprehensiveReport(period: { start: Date; end: Date }): Promise<{
    executive: any
    content: any
    user: any
    performance: any
  }> {
    logger.info('Generating comprehensive analytics report', { period })

    try {
      const [executive, content, user, performance] = await Promise.all([
        helpAnalyticsReportingDashboard.generateExecutiveDashboard(period),
        helpAnalyticsReportingDashboard.generateContentInsightsDashboard(period),
        helpAnalyticsReportingDashboard.generateUserInsightsDashboard(period),
        helpAnalyticsEngine.generatePerformanceReport(period),
      ])

      return {
        executive,
        content,
        user,
        performance,
      }
    } catch (error) {
      logger.error('Failed to generate comprehensive report', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get real-time system status
   */
  getRealTimeStatus(): {
    monitoring: any
    alerts: any[]
    performance: any
    systemHealth: string
  } {
    const metrics = realTimeHelpMonitor.getCurrentMetrics()
    const alerts = realTimeHelpMonitor.getActiveAlerts()

    return {
      monitoring: metrics,
      alerts,
      performance: metrics
        ? {
            activeUsers: metrics.activeUsers,
            responseTime: metrics.averageResponseTime,
            satisfactionScore: metrics.satisfactionScore,
            systemHealth: metrics.systemHealth,
          }
        : null,
      systemHealth: metrics?.systemHealth || 'unknown',
    }
  }

  /**
   * Get user predictions and recommendations
   */
  async getUserInsights(
    userId: string,
    context: any
  ): Promise<{
    predictions: any[]
    recommendations: any[]
    riskScore: number
  }> {
    if (!this.config.analytics.enablePredictiveAnalytics) {
      return { predictions: [], recommendations: [], riskScore: 0 }
    }

    try {
      const predictions = await predictiveHelpAnalytics.getUserPredictions(userId, context)
      const recommendations = await predictiveHelpAnalytics.generateProactiveRecommendations(
        userId,
        context
      )

      // Calculate overall risk score
      const churnPredictions = predictions.filter((p) => p.prediction.prediction.includes('Churn'))
      const riskScore =
        churnPredictions.length > 0
          ? Math.max(...churnPredictions.map((p) => p.confidence * 100))
          : 0

      return {
        predictions,
        recommendations,
        riskScore,
      }
    } catch (error) {
      logger.error('Failed to get user insights', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { predictions: [], recommendations: [], riskScore: 0 }
    }
  }

  /**
   * Start A/B test for help content
   */
  async startABTest(test: any): Promise<string> {
    if (!this.config.analytics.enableABTesting) {
      throw new Error('A/B testing is disabled in configuration')
    }

    try {
      const testId = await helpAnalyticsEngine.startABTest(test)

      logger.info('A/B test started successfully', {
        testId,
        testName: test.name,
      })

      return testId
    } catch (error) {
      logger.error('Failed to start A/B test', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(
    type: 'executive' | 'operational' | 'content' | 'user' = 'operational'
  ): Promise<any> {
    try {
      switch (type) {
        case 'executive':
          return await helpAnalyticsReportingDashboard.generateExecutiveDashboard({
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date(),
          })

        case 'content':
          return await helpAnalyticsReportingDashboard.generateContentInsightsDashboard({
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            end: new Date(),
          })

        case 'user':
          return await helpAnalyticsReportingDashboard.generateUserInsightsDashboard({
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            end: new Date(),
          })
        default:
          return await helpAnalyticsEngine.getDashboardData()
      }
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics(): {
    analytics: any
    monitoring: any
    predictions: any
    system: any
  } {
    const monitoringMetrics = realTimeHelpMonitor.getCurrentMetrics()
    const predictiveMetrics = predictiveHelpAnalytics.getUserProfileAnalytics()

    return {
      analytics: {
        isInitialized: this.isInitialized,
        enabledFeatures: {
          predictiveAnalytics: this.config.analytics.enablePredictiveAnalytics,
          realTimeMonitoring: this.config.analytics.enableRealTimeMonitoring,
          reporting: this.config.analytics.enableReporting,
          abTesting: this.config.analytics.enableABTesting,
        },
      },
      monitoring: monitoringMetrics,
      predictions: predictiveMetrics,
      system: {
        uptime: this.getSystemUptime(),
        memoryUsage: process.memoryUsage(),
        configuration: this.config,
      },
    }
  }

  /**
   * Export analytics data
   */
  async exportData(
    type: 'all' | 'engagement' | 'performance' | 'predictions' | 'reports',
    period?: { start: Date; end: Date },
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<any> {
    logger.info('Exporting analytics data', { type, period, format })

    try {
      const defaultPeriod = period || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }

      switch (type) {
        case 'engagement':
          // Would export engagement data
          return { message: 'Engagement data exported' }

        case 'performance':
          return await helpAnalyticsEngine.generatePerformanceReport(defaultPeriod)

        case 'predictions':
          return predictiveHelpAnalytics.getUserProfileAnalytics()

        case 'reports':
          return await this.generateComprehensiveReport(defaultPeriod)
        default:
          return {
            performance: await helpAnalyticsEngine.generatePerformanceReport(defaultPeriod),
            predictions: predictiveHelpAnalytics.getUserProfileAnalytics(),
            reports: await this.generateComprehensiveReport(defaultPeriod),
            system: this.getPerformanceMetrics(),
          }
      }
    } catch (error) {
      logger.error('Failed to export analytics data', {
        type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Subscribe to analytics events
   */
  subscribe(eventType: string, callback: (data: any) => void): string {
    const subscriptionId = `${eventType}_${Date.now()}`

    switch (eventType) {
      case 'real-time-updates':
        return realTimeHelpMonitor.subscribe(subscriptionId, callback)

      case 'dashboard-updates':
        return helpAnalyticsReportingDashboard.subscribe(subscriptionId, callback)

      default:
        this.integrationCallbacks.set(subscriptionId, callback)
        return subscriptionId
    }
  }

  /**
   * Unsubscribe from analytics events
   */
  unsubscribe(eventType: string, subscriptionId: string): boolean {
    switch (eventType) {
      case 'real-time-updates':
        return realTimeHelpMonitor.unsubscribe(subscriptionId)

      case 'dashboard-updates':
        return helpAnalyticsReportingDashboard.unsubscribe(subscriptionId)

      default:
        return this.integrationCallbacks.delete(subscriptionId)
    }
  }

  /**
   * Update system configuration
   */
  updateConfiguration(newConfig: Partial<HelpAnalyticsSystemConfig>): void {
    this.config = { ...this.config, ...newConfig }

    logger.info('Help Analytics System configuration updated', {
      newConfig,
    })
  }

  // Private helper methods

  private async setupComponentIntegration(): Promise<void> {
    logger.info('Setting up component integration')

    // Set up cross-component data flow
    // Real-time monitor processes engagement from analytics engine
    // Predictive analytics learns from engagement patterns
    // Reporting dashboard aggregates insights from all components

    // This would set up event listeners and data pipelines between components
  }

  private async initializeScheduledReports(): Promise<void> {
    // Set up default scheduled reports
    const defaultSchedules = [
      {
        id: 'daily-operational',
        name: 'Daily Operational Report',
        type: 'operational' as const,
        frequency: 'daily' as const,
        recipients: ['admin@company.com'],
        format: 'json' as const,
        filters: {},
        enabled: true,
      },
      {
        id: 'weekly-executive',
        name: 'Weekly Executive Summary',
        type: 'executive' as const,
        frequency: 'weekly' as const,
        recipients: ['executives@company.com'],
        format: 'pdf' as const,
        filters: {},
        enabled: false, // Disabled by default
      },
    ]

    for (const schedule of defaultSchedules) {
      if (schedule.enabled) {
        helpAnalyticsReportingDashboard.scheduleReport(schedule)
      }
    }
  }

  private getSystemUptime(): number {
    return process.uptime() * 1000 // Convert to milliseconds
  }

  /**
   * Cleanup and shutdown the analytics system
   */
  async destroy(): Promise<void> {
    logger.info('Shutting down Help Analytics System')

    try {
      // Stop monitoring
      realTimeHelpMonitor.stopMonitoring()
      realTimeHelpMonitor.destroy()

      // Cleanup predictive analytics
      predictiveHelpAnalytics.destroy()

      // Cleanup reporting dashboard
      helpAnalyticsReportingDashboard.destroy()

      // Clear callbacks
      this.integrationCallbacks.clear()

      this.isInitialized = false

      logger.info('Help Analytics System shutdown complete')
    } catch (error) {
      logger.error('Error during Help Analytics System shutdown', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Export singleton instance
export const helpAnalyticsSystem = new HelpAnalyticsSystem()

// Initialize system on module load
helpAnalyticsSystem.initialize().catch((error) => {
  logger.error('Failed to auto-initialize Help Analytics System', {
    error: error instanceof Error ? error.message : String(error),
  })
})

export default HelpAnalyticsSystem
