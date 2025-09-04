/**
 * Help System Monitoring - Main Module Exports
 *
 * Comprehensive monitoring system for the help ecosystem providing:
 * - Real-time performance monitoring and analytics
 * - System health checks and automated alerting
 * - AI-powered optimization insights and recommendations
 * - Business intelligence and ROI tracking
 * - Executive dashboards and reporting
 *
 * Integration with:
 * - Help Analytics Engine for comprehensive data collection
 * - Real-time Monitor for live performance metrics
 * - Predictive Analytics for optimization insights
 * - Reporting Dashboard for business intelligence
 *
 * @created 2025-09-04
 * @author Claude Development System - Help Analytics & Performance Monitoring Specialist
 */

// Analytics integration
export {
  type BusinessImpactMetrics,
  type HelpEngagementMetrics,
  type HelpPerformanceReport,
  helpAnalyticsEngine,
  type ROICalculation,
} from '../analytics/help-analytics-engine'
// Predictive analytics
export {
  type HelpPrediction,
  predictiveHelpAnalytics,
  type UserBehaviorProfile,
} from '../analytics/predictive-analytics'
// Real-time monitoring utilities
export {
  type RealTimeMetrics,
  realTimeHelpMonitor,
  type SystemAlert,
} from '../analytics/real-time-monitor'
// Reporting and dashboard
export {
  type ContentInsightsDashboard,
  type ExecutiveDashboard,
  helpAnalyticsReportingDashboard,
  type UserInsightsDashboard,
} from '../analytics/reporting-dashboard'
// Core monitoring engine
export {
  type AlertSuppressionRule,
  type EscalationPolicy,
  type HealthStatus,
  HelpMonitoringEngine,
  helpMonitoringEngine,
  type MonitoringAlert,
  type MonitoringConfiguration,
  type MonitoringSnapshot,
  type MonitoringThresholds,
  type OptimizationInsight,
  type ScheduledReport,
  type SystemHealthCheck,
  type SystemRecommendation,
} from './monitoring-engine'

import { createLogger } from '@/lib/logs/logger'
import { helpMonitoringEngine } from './monitoring-engine'

const logger = createLogger('HelpMonitoring')

// ========================
// MONITORING UTILITIES
// ========================

/**
 * Initialize the complete monitoring system
 */
export async function initializeHelpMonitoring(config?: any): Promise<void> {
  try {
    logger.info('Initializing comprehensive help monitoring system')

    await helpMonitoringEngine.startMonitoring()

    logger.info('Help monitoring system initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize help monitoring system', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Get current system health overview
 */
export function getCurrentSystemHealth() {
  return helpMonitoringEngine.getCurrentHealth()
}

/**
 * Get comprehensive monitoring snapshot
 */
export async function getMonitoringSnapshot() {
  return await helpMonitoringEngine.getMonitoringSnapshot()
}

/**
 * Get AI-powered optimization insights
 */
export async function getOptimizationInsights(category?: string) {
  return await helpMonitoringEngine.getOptimizationInsights(category)
}

/**
 * Trigger custom alert
 */
export async function triggerAlert(alert: any) {
  return await helpMonitoringEngine.triggerAlert(alert)
}

/**
 * Subscribe to monitoring events
 */
export function subscribeToMonitoringEvents(eventType: string, callback: (data: any) => void) {
  return helpMonitoringEngine.subscribe(eventType, callback)
}

/**
 * Unsubscribe from monitoring events
 */
export function unsubscribeFromMonitoringEvents(eventType: string, subscriptionId: string) {
  return helpMonitoringEngine.unsubscribe(eventType, subscriptionId)
}

// ========================
// MONITORING CONSTANTS
// ========================

export const MONITORING_CONSTANTS = {
  // Performance thresholds
  RESPONSE_TIME_WARNING: 1000, // ms
  RESPONSE_TIME_CRITICAL: 3000, // ms
  ERROR_RATE_WARNING: 2, // percentage
  ERROR_RATE_CRITICAL: 5, // percentage
  SATISFACTION_WARNING: 3.5, // 1-5 scale
  SATISFACTION_CRITICAL: 3.0, // 1-5 scale

  // Update intervals
  REAL_TIME_UPDATE_INTERVAL: 10000, // 10 seconds
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  OPTIMIZATION_ANALYSIS_INTERVAL: 3600000, // 1 hour

  // Data retention
  DEFAULT_DATA_RETENTION_DAYS: 365,
  PERFORMANCE_HISTORY_LIMIT: 100,
  ALERT_HISTORY_LIMIT: 1000,

  // Optimization thresholds
  HIGH_IMPACT_THRESHOLD: 20, // percentage improvement
  HIGH_CONFIDENCE_THRESHOLD: 80, // percentage confidence
  AUTO_IMPLEMENT_THRESHOLD: 90, // percentage confidence for auto-implementation
} as const

// ========================
// MONITORING TYPES
// ========================

export type MonitoringEventType =
  | 'real-time-metrics'
  | 'health-status-change'
  | 'performance-alert'
  | 'optimization-insight'
  | 'system-recommendation'
  | 'business-metric-update'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type SystemHealthStatus = 'healthy' | 'warning' | 'critical' | 'offline'

export type OptimizationCategory = 'performance' | 'user-experience' | 'business' | 'technical'

export type MonitoringMetric =
  | 'response_time'
  | 'error_rate'
  | 'user_satisfaction'
  | 'system_uptime'
  | 'active_users'
  | 'throughput'
  | 'roi'
  | 'cost_savings'

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Calculate performance score from metrics
 */
export function calculatePerformanceScore(metrics: {
  responseTime: number
  errorRate: number
  userSatisfaction: number
  throughput: number
}): number {
  const responseTimeScore = Math.max(0, 100 - metrics.responseTime / 10)
  const errorRateScore = Math.max(0, 100 - metrics.errorRate * 10)
  const satisfactionScore = metrics.userSatisfaction * 20
  const throughputScore = Math.min(100, metrics.throughput / 10)

  return Math.round((responseTimeScore + errorRateScore + satisfactionScore + throughputScore) / 4)
}

/**
 * Determine alert priority based on severity and impact
 */
export function determineAlertPriority(
  severity: AlertSeverity,
  impact: 'low' | 'medium' | 'high',
  component: string
): number {
  const severityWeight = {
    info: 1,
    warning: 2,
    critical: 3,
  }[severity]

  const impactWeight = {
    low: 1,
    medium: 2,
    high: 3,
  }[impact]

  const componentWeight =
    {
      analytics: 2,
      chatbot: 2,
      vector_search: 3,
      database: 3,
      api: 3,
    }[component] || 1

  return severityWeight * impactWeight * componentWeight
}

/**
 * Format monitoring data for export
 */
export function formatMonitoringDataForExport(data: any, format: 'json' | 'csv'): string {
  if (format === 'csv') {
    // Convert monitoring data to CSV format
    const headers = ['Timestamp', 'Metric', 'Value', 'Status', 'Component']
    const rows = [headers.join(',')]

    // Add data rows (simplified implementation)
    if (data.performance) {
      const timestamp = new Date().toISOString()
      rows.push(`${timestamp},Response Time,${data.performance.responseTime},ms,system`)
      rows.push(`${timestamp},Error Rate,${data.performance.errorRate},%,system`)
      rows.push(`${timestamp},User Satisfaction,${data.performance.userSatisfaction},score,system`)
    }

    return rows.join('\n')
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfiguration(config: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.realTime?.updateInterval < 1000) {
    errors.push('Real-time update interval must be at least 1000ms')
  }

  if (config.realTime?.healthCheckInterval < 5000) {
    errors.push('Health check interval must be at least 5000ms')
  }

  if (config.analytics?.dataRetentionDays < 1 || config.analytics?.dataRetentionDays > 3650) {
    errors.push('Data retention days must be between 1 and 3650')
  }

  if (config.realTime?.alertThresholds) {
    const thresholds = config.realTime.alertThresholds

    if (thresholds.responseTime?.warning >= thresholds.responseTime?.critical) {
      errors.push('Response time warning threshold must be less than critical threshold')
    }

    if (thresholds.errorRate?.warning >= thresholds.errorRate?.critical) {
      errors.push('Error rate warning threshold must be less than critical threshold')
    }

    if (thresholds.satisfactionScore?.warning <= thresholds.satisfactionScore?.critical) {
      errors.push('Satisfaction score warning threshold must be greater than critical threshold')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ========================
// MONITORING HOOKS
// ========================

/**
 * React hook for monitoring system health
 */
export function useSystemHealth() {
  const [health, setHealth] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const updateHealth = () => {
      const currentHealth = getCurrentSystemHealth()
      setHealth(currentHealth)
      setLoading(false)
    }

    updateHealth()
    const subscription = subscribeToMonitoringEvents('health-status-change', updateHealth)

    return () => {
      unsubscribeFromMonitoringEvents('health-status-change', subscription)
    }
  }, [])

  return { health, loading }
}

/**
 * React hook for real-time monitoring metrics
 */
export function useRealTimeMonitoring(refreshInterval = 10000) {
  const [metrics, setMetrics] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const updateMetrics = async () => {
      try {
        const snapshot = await getMonitoringSnapshot()
        setMetrics(snapshot)
        setLoading(false)
      } catch (error) {
        logger.error('Failed to update real-time metrics', { error })
      }
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  return { metrics, loading }
}

/**
 * React hook for optimization insights
 */
export function useOptimizationInsights(category?: string) {
  const [insights, setInsights] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchInsights = async () => {
      try {
        const optimizationInsights = await getOptimizationInsights(category)
        setInsights(optimizationInsights)
        setLoading(false)
      } catch (error) {
        logger.error('Failed to fetch optimization insights', { error })
      }
    }

    fetchInsights()
  }, [category])

  return { insights, loading, refresh: () => fetchInsights() }
}

// ========================
// AUTO-INITIALIZATION
// ========================

// Auto-initialize monitoring system when module is loaded
if (typeof window !== 'undefined') {
  // Client-side initialization
  initializeHelpMonitoring().catch((error) => {
    logger.error('Failed to auto-initialize help monitoring', { error })
  })
} else {
  // Server-side initialization
  logger.info('Help monitoring module loaded on server-side')
}

// Export default monitoring engine instance
export default helpMonitoringEngine
