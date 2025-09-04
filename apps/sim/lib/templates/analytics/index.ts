/**
 * Comprehensive Template Analytics and Monitoring System
 *
 * This module implements a world-class template analytics and monitoring system
 * based on competitive analysis and research findings. It provides comprehensive
 * tracking, monitoring, and insights for the template library ecosystem.
 *
 * Key Features:
 * - Real-time template performance monitoring
 * - User engagement and behavior analytics  
 * - Template success and failure rate tracking
 * - Creator analytics and revenue tracking
 * - Community health and growth metrics
 * - A/B testing framework for improvements
 * - Predictive analytics for recommendations
 * - Business intelligence and reporting
 *
 * Architecture:
 * - Event-driven analytics collection
 * - Real-time processing with batch optimization
 * - Multi-dimensional analytics with drill-down capabilities
 * - Dashboard-ready metrics and visualizations
 * - Privacy-compliant data collection
 * - Scalable architecture supporting millions of events
 *
 * @author Claude Code Template Analytics Team
 * @version 2.0.0
 * @created 2025-09-04
 */

// Core Analytics Services
export { TemplateAnalyticsTracker, templateAnalyticsTracker } from './template-analytics-tracker'
export { TemplateMonitoringService, templateMonitoringService } from './template-monitoring-service'
export { TemplatePerformanceAnalyzer, templatePerformanceAnalyzer } from './template-performance-analyzer'

// Creator Analytics
export { CreatorAnalyticsService, creatorAnalyticsService } from './creator-analytics-service'
export { CreatorDashboardService, creatorDashboardService } from './creator-dashboard-service'
export { CreatorRevenueTracker, creatorRevenueTracker } from './creator-revenue-tracker'

// User Analytics  
export { UserEngagementAnalyzer, userEngagementAnalyzer } from './user-engagement-analyzer'
export { UserBehaviorAnalytics, userBehaviorAnalytics } from './user-behavior-analytics'
export { UserJourneyTracker, userJourneyTracker } from './user-journey-tracker'

// Community Analytics
export { CommunityHealthAnalyzer, communityHealthAnalyzer } from './community-health-analyzer'
export { CommunityGrowthTracker, communityGrowthTracker } from './community-growth-tracker'
export { CommunityEngagementMonitor, communityEngagementMonitor } from './community-engagement-monitor'

// Business Intelligence
export { BusinessIntelligenceService, businessIntelligenceService } from './business-intelligence-service'
export { RevenueAnalyticsService, revenueAnalyticsService } from './revenue-analytics-service'
export { MarketplaceAnalyticsService, marketplaceAnalyticsService } from './marketplace-analytics-service'

// Advanced Analytics
export { PredictiveAnalyticsEngine, predictiveAnalyticsEngine } from './predictive-analytics-engine'
export { AnomalyDetectionService, anomalyDetectionService } from './anomaly-detection-service'
export { ABTestingFramework, abTestingFramework } from './ab-testing-framework'

// Dashboards
export { AdminDashboardService, adminDashboardService } from './admin-dashboard-service'
export { ExecutiveDashboardService, executiveDashboardService } from './executive-dashboard-service'
export { AnalyticsDashboardBuilder, analyticsDashboardBuilder } from './analytics-dashboard-builder'

// Type Definitions
export type {
  // Core Analytics Types
  TemplateAnalyticsEvent,
  TemplateAnalyticsMetrics,
  TemplatePerformanceReport,
  
  // Monitoring Types
  TemplateMonitoringConfig,
  TemplateHealthStatus,
  PerformanceAlert,
  
  // Creator Analytics Types
  CreatorAnalyticsData,
  CreatorPerformanceMetrics,
  CreatorRevenueData,
  
  // User Analytics Types
  UserEngagementProfile,
  UserBehaviorInsights,
  UserJourneyData,
  
  // Community Analytics Types
  CommunityHealthReport,
  CommunityGrowthMetrics,
  CommunityEngagementData,
  
  // Business Intelligence Types
  BusinessIntelligenceReport,
  RevenueAnalyticsReport,
  MarketplaceInsights,
  
  // Advanced Analytics Types
  PredictiveModel,
  AnomalyAlert,
  ABTestConfig,
  
  // Dashboard Types
  AnalyticsDashboardConfig,
  DashboardWidgetConfig,
  DashboardVisualization,
  
  // Configuration Types
  TemplateAnalyticsConfig,
  MonitoringConfiguration,
  AlertConfiguration,
  
  // Time Series Types
  TimeSeriesData,
  AnalyticsTimeRange,
  MetricAggregation,
  
  // Reporting Types
  AnalyticsReport,
  PerformanceSnapshot,
  TrendAnalysis,
} from './types'

/**
 * Comprehensive Template Analytics Manager
 *
 * Central coordinator for all template analytics services providing
 * unified initialization, configuration, and lifecycle management.
 * Implements the analytics architecture outlined in the research report.
 */
export class TemplateAnalyticsManager {
  private static instance: TemplateAnalyticsManager | null = null
  private initialized = false
  private services: Map<string, any> = new Map()
  private config: any = null

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TemplateAnalyticsManager {
    if (!TemplateAnalyticsManager.instance) {
      TemplateAnalyticsManager.instance = new TemplateAnalyticsManager()
    }
    return TemplateAnalyticsManager.instance
  }

  /**
   * Initialize comprehensive template analytics system
   */
  async initialize(config?: {
    enableRealTimeTracking?: boolean
    enableTemplateMonitoring?: boolean
    enableCreatorAnalytics?: boolean
    enableUserAnalytics?: boolean
    enableCommunityAnalytics?: boolean
    enableBusinessIntelligence?: boolean
    enablePredictiveAnalytics?: boolean
    enableABTesting?: boolean
    enableDashboards?: boolean
    retentionDays?: number
    batchSize?: number
    alerting?: {
      enableAlerts: boolean
      alertChannels: string[]
      thresholds: Record<string, number>
    }
  }): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('🚀 Initializing Template Analytics System...')

    try {
      const defaultConfig = {
        enableRealTimeTracking: true,
        enableTemplateMonitoring: true,
        enableCreatorAnalytics: true,
        enableUserAnalytics: true,
        enableCommunityAnalytics: true,
        enableBusinessIntelligence: true,
        enablePredictiveAnalytics: true,
        enableABTesting: true,
        enableDashboards: true,
        retentionDays: 365,
        batchSize: 1000,
        alerting: {
          enableAlerts: true,
          alertChannels: ['email', 'slack'],
          thresholds: {
            errorRate: 0.05,
            responseTime: 2000,
            lowUsage: 0.1,
          }
        },
        ...config,
      }

      this.config = defaultConfig

      // Initialize core analytics services
      if (defaultConfig.enableRealTimeTracking) {
        const tracker = templateAnalyticsTracker
        await tracker.initialize(defaultConfig)
        this.services.set('tracker', tracker)
        console.log('✅ Template Analytics Tracker initialized')
      }

      if (defaultConfig.enableTemplateMonitoring) {
        const monitor = templateMonitoringService
        await monitor.initialize(defaultConfig)
        this.services.set('monitor', monitor)
        console.log('✅ Template Monitoring Service initialized')
      }

      if (defaultConfig.enableCreatorAnalytics) {
        const creatorAnalytics = creatorAnalyticsService
        await creatorAnalytics.initialize(defaultConfig)
        this.services.set('creatorAnalytics', creatorAnalytics)
        console.log('✅ Creator Analytics Service initialized')
      }

      if (defaultConfig.enableUserAnalytics) {
        const userAnalytics = userEngagementAnalyzer
        await userAnalytics.initialize(defaultConfig)
        this.services.set('userAnalytics', userAnalytics)
        console.log('✅ User Analytics Service initialized')
      }

      if (defaultConfig.enableCommunityAnalytics) {
        const communityAnalytics = communityHealthAnalyzer
        await communityAnalytics.initialize(defaultConfig)
        this.services.set('communityAnalytics', communityAnalytics)
        console.log('✅ Community Analytics Service initialized')
      }

      if (defaultConfig.enableBusinessIntelligence) {
        const businessIntelligence = businessIntelligenceService
        await businessIntelligence.initialize(defaultConfig)
        this.services.set('businessIntelligence', businessIntelligence)
        console.log('✅ Business Intelligence Service initialized')
      }

      if (defaultConfig.enablePredictiveAnalytics) {
        const predictiveAnalytics = predictiveAnalyticsEngine
        await predictiveAnalytics.initialize(defaultConfig)
        this.services.set('predictiveAnalytics', predictiveAnalytics)
        console.log('✅ Predictive Analytics Engine initialized')
      }

      if (defaultConfig.enableABTesting) {
        const abTesting = abTestingFramework
        await abTesting.initialize(defaultConfig)
        this.services.set('abTesting', abTesting)
        console.log('✅ A/B Testing Framework initialized')
      }

      if (defaultConfig.enableDashboards) {
        const dashboards = analyticsDashboardBuilder
        await dashboards.initialize(defaultConfig)
        this.services.set('dashboards', dashboards)
        console.log('✅ Analytics Dashboard Builder initialized')
      }

      this.initialized = true
      console.log('🎉 Template Analytics System initialization complete!')
      console.log(`📊 Analytics retention period: ${defaultConfig.retentionDays} days`)
      console.log(`⚡ Real-time tracking: ${defaultConfig.enableRealTimeTracking ? 'Enabled' : 'Disabled'}`)
      console.log(`🎯 A/B Testing: ${defaultConfig.enableABTesting ? 'Enabled' : 'Disabled'}`)

    } catch (error) {
      console.error('❌ Template Analytics System initialization failed:', error)
      throw error
    }
  }

  /**
   * Get comprehensive system health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'down'
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'down'
      metrics?: any
      performance?: any
      alerts?: number
    }>
    systemMetrics: {
      eventsProcessed: number
      activeServices: number
      memoryUsage: number
      uptime: number
    }
  } {
    const serviceStatuses: Record<string, any> = {}
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
    let degradedCount = 0
    let downCount = 0

    // Check status of all initialized services
    this.services.forEach((service, name) => {
      try {
        const status = service.getHealthStatus ? service.getHealthStatus() : { status: 'healthy' }
        serviceStatuses[name] = status
        
        if (status.status === 'degraded') degradedCount++
        if (status.status === 'down') downCount++
      } catch (error) {
        serviceStatuses[name] = { status: 'down', error: error.message }
        downCount++
      }
    })

    // Determine overall status
    if (downCount > 0) {
      overallStatus = 'down'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    return {
      overall: overallStatus,
      services: serviceStatuses,
      systemMetrics: {
        eventsProcessed: this.getTotalEventsProcessed(),
        activeServices: this.services.size,
        memoryUsage: process.memoryUsage().heapUsed,
        uptime: process.uptime(),
      }
    }
  }

  /**
   * Get service by name
   */
  getService(name: string): any {
    return this.services.get(name)
  }

  /**
   * Track template analytics event across all relevant services
   */
  async trackEvent(eventType: string, data: any): Promise<void> {
    if (!this.initialized) {
      console.warn('Template Analytics System not initialized. Skipping event tracking.')
      return
    }

    // Route event to appropriate services
    const promises: Promise<void>[] = []

    // Core tracking
    const tracker = this.services.get('tracker')
    if (tracker) {
      promises.push(tracker.trackEvent(eventType, data))
    }

    // Real-time monitoring
    const monitor = this.services.get('monitor')
    if (monitor) {
      promises.push(monitor.processEvent(eventType, data))
    }

    // Creator analytics
    if (data.creatorId && this.services.get('creatorAnalytics')) {
      promises.push(this.services.get('creatorAnalytics').trackCreatorEvent(eventType, data))
    }

    // User analytics
    if (data.userId && this.services.get('userAnalytics')) {
      promises.push(this.services.get('userAnalytics').trackUserEvent(eventType, data))
    }

    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Error tracking analytics event:', error)
      // Don't throw to avoid disrupting main application flow
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    type: 'template' | 'creator' | 'user' | 'community' | 'business',
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<any> {
    if (!this.initialized) {
      throw new Error('Template Analytics System not initialized')
    }

    switch (type) {
      case 'template':
        const performanceAnalyzer = this.services.get('performanceAnalyzer')
        return performanceAnalyzer?.generateReport(timeRange, options)

      case 'creator':
        const creatorAnalytics = this.services.get('creatorAnalytics')
        return creatorAnalytics?.generateReport(timeRange, options)

      case 'user':
        const userAnalytics = this.services.get('userAnalytics')
        return userAnalytics?.generateReport(timeRange, options)

      case 'community':
        const communityAnalytics = this.services.get('communityAnalytics')
        return communityAnalytics?.generateReport(timeRange, options)

      case 'business':
        const businessIntelligence = this.services.get('businessIntelligence')
        return businessIntelligence?.generateReport(timeRange, options)

      default:
        throw new Error(`Unknown report type: ${type}`)
    }
  }

  /**
   * Get total events processed across all services
   */
  private getTotalEventsProcessed(): number {
    let total = 0
    this.services.forEach((service) => {
      if (service.getMetrics && typeof service.getMetrics === 'function') {
        try {
          const metrics = service.getMetrics()
          total += metrics.totalEvents || 0
        } catch (error) {
          // Ignore errors getting metrics
        }
      }
    })
    return total
  }

  /**
   * Shutdown all analytics services gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    console.log('🛑 Shutting down Template Analytics System...')

    const shutdownPromises: Promise<void>[] = []

    this.services.forEach((service, name) => {
      if (service.shutdown && typeof service.shutdown === 'function') {
        shutdownPromises.push(service.shutdown().catch((error: any) => {
          console.error(`Failed to shutdown ${name}:`, error)
        }))
      }
    })

    try {
      await Promise.allSettled(shutdownPromises)
      this.services.clear()
      this.initialized = false
      console.log('🎉 Template Analytics System shutdown complete!')
    } catch (error) {
      console.error('❌ Template Analytics System shutdown failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const templateAnalyticsManager = TemplateAnalyticsManager.getInstance()

/**
 * Convenience functions for common analytics operations
 */

/**
 * Track template view event
 */
export async function trackTemplateView(data: {
  templateId: string
  userId: string
  sessionId: string
  context?: any
}): Promise<void> {
  return templateAnalyticsManager.trackEvent('template_view', data)
}

/**
 * Track template installation event
 */
export async function trackTemplateInstallation(data: {
  templateId: string
  userId: string
  sessionId: string
  success: boolean
  duration?: number
  context?: any
}): Promise<void> {
  return templateAnalyticsManager.trackEvent('template_installation', data)
}

/**
 * Track template rating event
 */
export async function trackTemplateRating(data: {
  templateId: string
  userId: string
  rating: number
  review?: string
  context?: any
}): Promise<void> {
  return templateAnalyticsManager.trackEvent('template_rating', data)
}

/**
 * Track search event
 */
export async function trackSearchEvent(data: {
  userId: string
  sessionId: string
  query: string
  results: number
  filters?: any
  context?: any
}): Promise<void> {
  return templateAnalyticsManager.trackEvent('search', data)
}

/**
 * Track user engagement event
 */
export async function trackUserEngagement(data: {
  userId: string
  sessionId: string
  action: string
  page: string
  element?: string
  duration?: number
  context?: any
}): Promise<void> {
  return templateAnalyticsManager.trackEvent('user_engagement', data)
}

/**
 * Default export for easy import
 */
export default {
  // Core manager
  templateAnalyticsManager,

  // Individual services
  templateAnalyticsTracker,
  templateMonitoringService,
  templatePerformanceAnalyzer,
  creatorAnalyticsService,
  userEngagementAnalyzer,
  communityHealthAnalyzer,
  businessIntelligenceService,
  predictiveAnalyticsEngine,
  abTestingFramework,
  analyticsDashboardBuilder,

  // Convenience functions
  trackTemplateView,
  trackTemplateInstallation,
  trackTemplateRating,
  trackSearchEvent,
  trackUserEngagement,
}