/**
 * Parlant Server Monitoring & Health Checks - Main Export
 *
 * This module provides a unified interface to all monitoring, health checking,
 * logging, metrics, alerting functionality, and the comprehensive Universal Tool
 * Adapter Error Handling System for the Parlant server integration.
 */

// Alert management
export {
  type Alert,
  type AlertCategory,
  AlertManager,
  type AlertRule,
  type AlertSeverity,
  alertManager,
  alerts,
  type ErrorClassification,
  type Incident,
} from './alerts'
// Universal Tool Adapter Error Handling System
export {
  AlertLevel,
  // Analytics functions
  analyzeTrends,
  // Error classes
  BaseToolError,
  CircuitBreakerState,
  classifyError,
  createExternalServiceError,
  createSystemResourceError,
  // Error creation functions
  createToolAdapterError,
  createToolAuthenticationError,
  createToolExecutionError,
  createUserInputError,
  DEFAULT_ALERT_RULES,
  DEFAULT_ERROR_PATTERNS,
  DEFAULT_ERROR_SYSTEM_CONFIG,
  DEFAULT_RETRY_CONFIGS,
  // Core types and enums
  ErrorCategory,
  ErrorDashboardData,
  ErrorHandlingResult,
  ErrorImpact,
  ErrorSeverity,
  ErrorSubcategories,
  // Configuration types
  ErrorSystemConfig,
  ExplanationFormat,
  ExternalServiceError,
  // Error analytics services
  errorAnalyticsService,
  // Error taxonomy and classification
  errorClassifier,
  // Error explanations
  errorExplanationService,
  // Error monitoring services
  errorMonitoringService,
  // Error recovery services
  errorRecoveryService,
  // Main error system
  errorSystem,
  errorTracker,
  executeWithRecovery,
  explainError,
  generateAnalyticsReport,
  getErrorStats,
  getSystemHealth as getToolSystemHealth,
  // Main handling functions
  handleError as handleToolError,
  identifyErrorPatterns,
  initializeErrorSystem,
  MetricType,
  MonitorPerformance as MonitorToolPerformance,
  // Error tracking and alerting
  parlantErrorTracker,
  performRootCauseAnalysis,
  RecoveryStrategy,
  // Monitoring functions
  recordError as recordToolError,
  recordMetric,
  recordSuccess as recordToolSuccess,
  SystemHealthWithErrors,
  SystemResourceError,
  setupBasicErrorHandling,
  setupFullErrorHandling,
  ToolAdapterError,
  ToolAuthenticationError,
  ToolExecutionError,
  UniversalErrorSystem,
  UserInputError,
  UserSkillLevel,
  // Decorators
  WithRetry,
} from './error-system'
// Core monitoring components
export {
  type DatabaseHealthDetails,
  type HealthCheckResult,
  healthChecks,
  ParlantHealthChecker,
  type ParlantHealthDetails,
  parlantHealthChecker,
  type ServiceMetrics,
} from './health'
// Structured logging
export {
  createParlantLogger,
  type LogAggregation,
  logUtils,
  type ParlantLogContext,
  type ParlantLogEntry,
  ParlantLogger,
  parlantLoggers,
} from './logging'
// Performance metrics
export {
  type AgentMetrics,
  AgentMetricsTracker,
  metricsUtils,
  SystemMetricsCollector,
  systemMetrics,
  type WorkspaceMetrics,
} from './metrics'
// Monitoring and metrics
export {
  type AgentPerformanceMetrics,
  type AlertThresholds,
  DEFAULT_ALERT_THRESHOLDS,
  monitoring,
  ParlantMonitoringService,
  parlantMonitoring,
  type SystemMetrics,
  type UsageMetrics,
} from './monitoring'

/**
 * Initialize all monitoring systems
 */
export async function initializeParlantMonitoring(): Promise<{
  health: ParlantHealthChecker
  monitoring: ParlantMonitoringService
  metrics: SystemMetricsCollector
  alerts: AlertManager
  status: 'healthy' | 'degraded' | 'unhealthy'
}> {
  const logger = createParlantLogger('Initialization')

  logger.info('Initializing Parlant monitoring systems', {
    operation: 'system_init',
  })

  try {
    // Run initial health check
    const healthStatus = await parlantHealthChecker.checkHealth()

    // Initialize metrics collection
    const metricsStatus = await systemMetrics.collectSystemMetrics()

    // Check for any initialization alerts
    const alertCheck = await parlantMonitoring.checkAlertConditions()

    const overallStatus =
      healthStatus.status === 'unhealthy'
        ? 'unhealthy'
        : alertCheck.systemHealth === 'degraded'
          ? 'degraded'
          : 'healthy'

    logger.info('Parlant monitoring initialization complete', {
      operation: 'system_init',
      status: overallStatus,
      healthStatus: healthStatus.status,
      alertCount: alertCheck.alerts.length,
      agentCount: metricsStatus.agents.total,
    })

    return {
      health: parlantHealthChecker,
      monitoring: parlantMonitoring,
      metrics: systemMetrics,
      alerts: alertManager,
      status: overallStatus,
    }
  } catch (error) {
    logger.error('Failed to initialize Parlant monitoring', {
      operation: 'system_init',
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Create initialization failure alert
    await alertManager.createAlert(
      'critical',
      'system',
      'Monitoring Initialization Failed',
      'Failed to initialize Parlant monitoring systems',
      'parlant-server',
      { operation: 'system_init' },
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )

    throw error
  }
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(): Promise<{
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  health: any
  metrics: any
  alerts: any
  summary: {
    totalAgents: number
    activeSessions: number
    errorRate: number
    averageResponseTime: number
    systemLoad: {
      cpu: number
      memory: number
      database: number
    }
  }
}> {
  const [healthStatus, metricsData, alertData] = await Promise.all([
    parlantHealthChecker.checkHealth(),
    systemMetrics.generateMetricsDashboard(),
    alertManager.getAlertMetrics(),
  ])

  const overallStatus =
    healthStatus.status === 'unhealthy'
      ? 'unhealthy'
      : alertData.critical > 0
        ? 'degraded'
        : healthStatus.status === 'degraded'
          ? 'degraded'
          : 'healthy'

  return {
    timestamp: new Date().toISOString(),
    status: overallStatus,
    uptime: process.uptime(),
    health: healthStatus,
    metrics: metricsData,
    alerts: alertData,
    summary: {
      totalAgents: metricsData.systemMetrics.agents.total,
      activeSessions: metricsData.systemMetrics.sessions.active,
      errorRate: metricsData.systemMetrics.reliability.errorRate,
      averageResponseTime: metricsData.systemMetrics.performance.averageResponseTime,
      systemLoad: {
        cpu: metricsData.systemMetrics.performance.resourceUtilization.cpu,
        memory: metricsData.systemMetrics.performance.resourceUtilization.memory,
        database: metricsData.systemMetrics.performance.resourceUtilization.database.connections,
      },
    },
  }
}

/**
 * Utility function for quick health check
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    return await healthChecks.quick()
  } catch (error) {
    return false
  }
}

/**
 * Monitor agent performance with automatic tracking
 */
export function trackAgentSession(
  agentId: string,
  workspaceId: string,
  sessionId: string
): {
  start: () => void
  recordMessage: (
    responseTime: number,
    tokenCount?: number,
    toolCalls?: number,
    hasError?: boolean
  ) => void
  recordTool: (toolName: string, executionTime: number, success: boolean) => void
  end: (status?: 'completed' | 'failed') => void
} {
  return {
    start: () => metricsUtils.startSession(agentId, workspaceId, sessionId),
    recordMessage: (responseTime, tokenCount, toolCalls, hasError) =>
      metricsUtils.recordMessage(
        agentId,
        workspaceId,
        sessionId,
        responseTime,
        tokenCount,
        toolCalls,
        hasError
      ),
    recordTool: (toolName, executionTime, success) =>
      systemMetrics
        .getAgentTracker(agentId, workspaceId)
        .recordToolExecution(sessionId, toolName, executionTime, success),
    end: (status) => metricsUtils.endSession(agentId, workspaceId, sessionId, status),
  }
}

/**
 * Create standardized error handler for Parlant operations
 */
export function createErrorHandler(source: string, context: ParlantLogContext = {}) {
  return async (error: Error, additionalContext?: ParlantLogContext) => {
    const fullContext = { ...context, ...additionalContext }

    // Log the error
    const logger = createParlantLogger(source)
    logger.error(`Error in ${source}`, fullContext)

    // Create alert
    await alerts.handleError(error, fullContext, source)

    // Record metrics
    monitoring.recordQuery(0) // Record error occurrence
  }
}

/**
 * Performance monitoring decorator for functions
 */
export function monitorPerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  context: ParlantLogContext = {}
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now()
    const logger = createParlantLogger('Performance')

    try {
      const result = await fn(...args)
      const duration = performance.now() - startTime

      logger.logPerformance(operationName, startTime, {
        ...context,
        success: true,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      logger.logPerformance(operationName, startTime, {
        ...context,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }) as T
}

/**
 * Default export with initialization function
 */
export default {
  init: initializeParlantMonitoring,
  getStatus: getSystemStatus,
  quickCheck: quickHealthCheck,
  trackSession: trackAgentSession,
  createErrorHandler,
  monitorPerformance,

  // Direct access to main components
  health: parlantHealthChecker,
  monitoring: parlantMonitoring,
  metrics: systemMetrics,
  alerts: alertManager,

  // Utility exports
  logger: createParlantLogger,
  utils: {
    logging: logUtils,
    metrics: metricsUtils,
  },
}
