/**
 * Universal Tool Adapter Error System Integration
 *
 * This module provides a unified interface for the comprehensive error handling system,
 * integrating all components and providing simple APIs for error management throughout
 * the Universal Tool Adapter System.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { type ParlantLogContext } from './logging'

// Core error system imports
import {
  ErrorCategory,
  ErrorSeverity,
  ErrorImpact,
  RecoveryStrategy,
  errorClassifier,
  classifyError,
  getErrorStats
} from './error-taxonomy'

import {
  BaseToolError,
  ToolAdapterError,
  ToolExecutionError,
  ToolAuthenticationError,
  UserInputError,
  SystemResourceError,
  ExternalServiceError,
  universalErrorHandler,
  handleError,
  createToolAdapterError,
  createToolExecutionError,
  createToolAuthenticationError,
  createUserInputError,
  createSystemResourceError,
  createExternalServiceError
} from './error-handler'

import {
  UserSkillLevel,
  ExplanationFormat,
  errorExplanationService,
  explainError
} from './error-explanations'

import {
  RetryConfig,
  CircuitBreakerState,
  errorRecoveryService,
  executeWithRecovery,
  WithRetry
} from './error-recovery'

import {
  AlertLevel,
  MetricType,
  errorMonitoringService,
  recordError,
  recordSuccess,
  recordMetric,
  getSystemHealth,
  MonitorPerformance
} from './error-monitoring'

import {
  errorAnalyticsService,
  analyzeTrends,
  identifyErrorPatterns,
  performRootCauseAnalysis,
  generateAnalyticsReport
} from './error-analytics'

const logger = createLogger('ErrorSystem')

/**
 * Unified error system configuration
 */
export interface ErrorSystemConfig {
  // Error handling configuration
  enableErrorTracking: boolean
  enableRetryMechanisms: boolean
  enableCircuitBreakers: boolean
  enableMonitoring: boolean
  enableAnalytics: boolean

  // Default settings
  defaultRetryConfig: Partial<RetryConfig>
  defaultUserSkillLevel: UserSkillLevel
  defaultExplanationFormat: ExplanationFormat

  // Monitoring configuration
  metricsRetentionDays: number
  alertThresholds: {
    errorRate: number
    responseTime: number
    circuitBreakerTrips: number
  }

  // Analytics configuration
  enablePredictiveAnalytics: boolean
  enableRootCauseAnalysis: boolean
  analyticsRetentionDays: number

  // Integration settings
  enableAutoExplanations: boolean
  enableAutoRecovery: boolean
  enableAutoEscalation: boolean
}

/**
 * Default error system configuration
 */
export const DEFAULT_ERROR_SYSTEM_CONFIG: ErrorSystemConfig = {
  // Error handling
  enableErrorTracking: true,
  enableRetryMechanisms: true,
  enableCircuitBreakers: true,
  enableMonitoring: true,
  enableAnalytics: true,

  // Defaults
  defaultRetryConfig: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    adaptiveAdjustment: true
  },
  defaultUserSkillLevel: UserSkillLevel.INTERMEDIATE,
  defaultExplanationFormat: ExplanationFormat.DETAILED,

  // Monitoring
  metricsRetentionDays: 7,
  alertThresholds: {
    errorRate: 0.1, // errors per second
    responseTime: 5000, // 5 seconds
    circuitBreakerTrips: 3
  },

  // Analytics
  enablePredictiveAnalytics: true,
  enableRootCauseAnalysis: true,
  analyticsRetentionDays: 30,

  // Integration
  enableAutoExplanations: true,
  enableAutoRecovery: true,
  enableAutoEscalation: true
}

/**
 * Universal Error System - Main integration class
 */
export class UniversalErrorSystem {
  private config: ErrorSystemConfig
  private initialized = false

  constructor(config: Partial<ErrorSystemConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_SYSTEM_CONFIG, ...config }
    logger.info('Universal Error System created', {
      enabledFeatures: this.getEnabledFeatures()
    })
  }

  /**
   * Initialize the error system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Error system already initialized')
      return
    }

    logger.info('Initializing Universal Error System')

    // Initialize monitoring if enabled
    if (this.config.enableMonitoring) {
      this.initializeMonitoring()
    }

    // Initialize analytics if enabled
    if (this.config.enableAnalytics) {
      this.initializeAnalytics()
    }

    // Set up integration hooks
    this.setupIntegrationHooks()

    this.initialized = true
    logger.info('Universal Error System initialized successfully')
  }

  /**
   * Handle any error through the complete pipeline
   */
  async handleError(
    error: Error | BaseToolError,
    context: ParlantLogContext = {},
    options: {
      userSkillLevel?: UserSkillLevel
      enableRecovery?: boolean
      enableExplanations?: boolean
    } = {}
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now()

    try {
      // Convert to BaseToolError if necessary
      const toolError = this.ensureToolError(error, context)

      // Record error for monitoring
      if (this.config.enableMonitoring) {
        recordError(toolError, {
          duration: Date.now() - startTime,
          component: toolError.component,
          operation: context.operation || 'unknown'
        })
      }

      // Handle error with comprehensive pipeline
      const handlingResult = await handleError(toolError)

      // Generate explanation if enabled
      let explanation
      if (this.config.enableAutoExplanations || options.enableExplanations) {
        explanation = explainError(
          toolError,
          options.userSkillLevel || this.config.defaultUserSkillLevel,
          this.config.defaultExplanationFormat,
          context
        )
      }

      // Attempt recovery if enabled
      let recoveryResult
      if ((this.config.enableAutoRecovery || options.enableRecovery) && toolError.recoverable) {
        try {
          recoveryResult = await this.attemptRecovery(toolError, context)
        } catch (recoveryError) {
          logger.warn('Recovery attempt failed', {
            errorId: toolError.id,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError
          })
        }
      }

      const result: ErrorHandlingResult = {
        errorId: toolError.id,
        handled: handlingResult.processed,
        recovered: recoveryResult?.success || false,
        explanation,
        userMessage: explanation?.summary || handlingResult.userMessage,
        recoveryActions: explanation?.quickActions || handlingResult.recoveryActions,
        shouldEscalate: handlingResult.shouldEscalate,
        processingTime: Date.now() - startTime,
        metadata: {
          category: toolError.category,
          severity: toolError.severity,
          impact: toolError.impact,
          recoverable: toolError.recoverable
        }
      }

      logger.info('Error handled successfully', {
        errorId: toolError.id,
        handled: result.handled,
        recovered: result.recovered,
        processingTime: result.processingTime
      })

      return result

    } catch (handlingError) {
      logger.error('Error handling pipeline failed', {
        originalError: error.message,
        handlingError: handlingError instanceof Error ? handlingError.message : handlingError
      })

      return {
        errorId: 'unknown',
        handled: false,
        recovered: false,
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
        recoveryActions: ['Try again', 'Contact support'],
        shouldEscalate: true,
        processingTime: Date.now() - startTime,
        metadata: {}
      }
    }
  }

  /**
   * Execute operation with full error handling pipeline
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: {
      operationId: string
      component: string
      category?: ErrorCategory
      subcategory?: string
      toolName?: string
      parlantContext?: ParlantLogContext
    },
    options: {
      retryConfig?: Partial<RetryConfig>
      userSkillLevel?: UserSkillLevel
      enableRecovery?: boolean
      enableMonitoring?: boolean
    } = {}
  ): Promise<T> {
    const startTime = Date.now()

    // Monitor performance if enabled
    const monitoringEnabled = this.config.enableMonitoring && (options.enableMonitoring !== false)

    try {
      let result: T

      // Execute with recovery if enabled
      if (this.config.enableRetryMechanisms && options.enableRecovery !== false) {
        result = await executeWithRecovery(
          operation,
          context,
          options.retryConfig
        )
      } else {
        result = await operation()
      }

      // Record success
      if (monitoringEnabled) {
        recordSuccess(
          context.component,
          context.parlantContext?.operation || 'execute',
          Date.now() - startTime,
          {
            toolName: context.toolName || '',
            category: context.category || '',
            operationId: context.operationId
          }
        )
      }

      return result

    } catch (error) {
      // Handle error through pipeline
      const handlingResult = await this.handleError(
        error as Error,
        context.parlantContext || {},
        { userSkillLevel: options.userSkillLevel }
      )

      if (handlingResult.recovered && handlingResult.recoveryResult) {
        return handlingResult.recoveryResult as T
      }

      // If not recovered, throw with enhanced error information
      const enhancedError = new Error(handlingResult.userMessage)
      ;(enhancedError as any).errorId = handlingResult.errorId
      ;(enhancedError as any).recoveryActions = handlingResult.recoveryActions
      ;(enhancedError as any).shouldEscalate = handlingResult.shouldEscalate

      throw enhancedError
    }
  }

  /**
   * Get system health with error context
   */
  async getSystemHealth(): Promise<SystemHealthWithErrors> {
    const health = await getSystemHealth()
    const errorStats = getErrorStats(3600000) // Last hour

    return {
      ...health,
      errorMetrics: {
        totalErrors: errorStats.total,
        errorsByCategory: errorStats.byCategory,
        errorsBySeverity: errorStats.byLevel,
        topErrorMessages: errorStats.topErrors,
        errorRate: errorStats.total / 3600, // per second
        criticalErrors: errorStats.byLevel.critical || 0
      },
      circuitBreakers: this.getCircuitBreakerStatus(),
      recommendations: this.generateHealthRecommendations(health, errorStats)
    }
  }

  /**
   * Generate analytics dashboard data
   */
  async getDashboardData(timeRange?: { start: number; end: number }): Promise<ErrorDashboardData> {
    const range = timeRange || {
      start: Date.now() - 86400000, // 24 hours ago
      end: Date.now()
    }

    const [
      trendAnalysis,
      errorPatterns,
      analyticsReport
    ] = await Promise.all([
      analyzeTrends('error_rate', range),
      identifyErrorPatterns(range),
      generateAnalyticsReport(range)
    ])

    return {
      timeRange: range,
      overview: {
        totalErrors: analyticsReport.summary?.totalErrors || 0,
        errorRate: trendAnalysis.dataPoints.length > 0
          ? trendAnalysis.dataPoints[trendAnalysis.dataPoints.length - 1].value
          : 0,
        trend: trendAnalysis.trend,
        healthScore: analyticsReport.healthScore
      },
      charts: {
        errorTrends: trendAnalysis,
        performanceImpacts: analyticsReport.performanceImpacts || [],
        topErrorCategories: Object.entries(getErrorStats(range.end - range.start).byCategory)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      },
      patterns: errorPatterns,
      alerts: errorMonitoringService.getActiveAlerts(),
      recommendations: analyticsReport.recommendations || []
    }
  }

  /**
   * Get error system configuration
   */
  getConfiguration(): ErrorSystemConfig {
    return { ...this.config }
  }

  /**
   * Update error system configuration
   */
  updateConfiguration(updates: Partial<ErrorSystemConfig>): void {
    this.config = { ...this.config, ...updates }
    logger.info('Error system configuration updated', { updates })
  }

  /**
   * Private helper methods
   */
  private ensureToolError(error: Error | BaseToolError, context: ParlantLogContext): BaseToolError {
    if (error instanceof BaseToolError) {
      return error
    }

    // Convert generic error to tool error
    return createToolExecutionError(
      error.message,
      'execution_failed',
      context.toolName || 'unknown',
      context,
      error
    )
  }

  private async attemptRecovery(
    error: BaseToolError,
    context: ParlantLogContext
  ): Promise<{ success: boolean; result?: any }> {
    // Implementation would depend on specific recovery strategies
    logger.debug('Attempting error recovery', { errorId: error.id })
    return { success: false }
  }

  private initializeMonitoring(): void {
    logger.debug('Initializing monitoring subsystem')

    // Set up default health checks
    errorMonitoringService.registerHealthCheck('error-system', async () => ({
      name: 'error-system',
      status: this.initialized ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      uptime: process.uptime() * 1000,
      metrics: {
        enabled_features: this.getEnabledFeatures().length,
        processing_errors: 0, // Could track internal errors
        memory_usage: process.memoryUsage().heapUsed
      },
      errors: [],
      dependencies: ['error-tracking', 'error-recovery', 'error-analytics']
    }))

    // Configure default alerts
    errorMonitoringService.configureAlert({
      id: 'error-system-high-load',
      name: 'Error System High Load',
      enabled: true,
      email: {
        recipients: ['admin@system.com'],
        subject: 'Error System High Load Alert',
        template: 'Error processing is experiencing high load'
      },
      throttling: {
        enabled: true,
        windowMs: 600000, // 10 minutes
        maxNotifications: 1
      },
      escalation: {
        enabled: false,
        escalationDelayMs: 1800000, // 30 minutes
        escalationTargets: []
      }
    })
  }

  private initializeAnalytics(): void {
    logger.debug('Initializing analytics subsystem')
    // Analytics initialization would happen here
  }

  private setupIntegrationHooks(): void {
    // Set up hooks for automatic error processing
    logger.debug('Setting up integration hooks')
  }

  private getEnabledFeatures(): string[] {
    const features = []
    if (this.config.enableErrorTracking) features.push('error-tracking')
    if (this.config.enableRetryMechanisms) features.push('retry-mechanisms')
    if (this.config.enableCircuitBreakers) features.push('circuit-breakers')
    if (this.config.enableMonitoring) features.push('monitoring')
    if (this.config.enableAnalytics) features.push('analytics')
    if (this.config.enablePredictiveAnalytics) features.push('predictive-analytics')
    if (this.config.enableRootCauseAnalysis) features.push('root-cause-analysis')
    return features
  }

  private getCircuitBreakerStatus(): Record<string, any> {
    const breakers = errorRecoveryService.getCircuitBreakerStatus()
    const status: Record<string, any> = {}

    if (breakers instanceof Map) {
      breakers.forEach((breaker, key) => {
        status[key] = {
          state: breaker.state,
          failureCount: breaker.failureCount,
          lastFailure: breaker.lastFailureTime
        }
      })
    }

    return status
  }

  private generateHealthRecommendations(health: any, errorStats: any): string[] {
    const recommendations = []

    if (errorStats.total > 100) {
      recommendations.push('High error volume detected - review error patterns')
    }

    if (errorStats.byLevel.critical > 0) {
      recommendations.push('Critical errors present - immediate attention required')
    }

    const circuitBreakers = this.getCircuitBreakerStatus()
    const openBreakers = Object.values(circuitBreakers).filter((b: any) => b.state === 'open').length

    if (openBreakers > 0) {
      recommendations.push(`${openBreakers} circuit breakers open - check service dependencies`)
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating normally')
    }

    return recommendations
  }
}

/**
 * Error handling result interface
 */
export interface ErrorHandlingResult {
  errorId: string
  handled: boolean
  recovered: boolean
  explanation?: any
  userMessage: string
  recoveryActions: string[]
  shouldEscalate: boolean
  processingTime: number
  recoveryResult?: any
  metadata: Record<string, any>
}

/**
 * Extended system health with error metrics
 */
export interface SystemHealthWithErrors {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical'
  timestamp: number
  components: Record<string, any>
  metrics: Record<string, any>
  errorMetrics: {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsBySeverity: Record<string, number>
    topErrorMessages: Array<{ message: string; count: number }>
    errorRate: number
    criticalErrors: number
  }
  circuitBreakers: Record<string, any>
  recommendations: string[]
  uptime: number
  version: string
}

/**
 * Dashboard data interface
 */
export interface ErrorDashboardData {
  timeRange: { start: number; end: number }
  overview: {
    totalErrors: number
    errorRate: number
    trend: string
    healthScore: number
  }
  charts: {
    errorTrends: any
    performanceImpacts: any[]
    topErrorCategories: Array<{ category: string; count: number }>
  }
  patterns: any[]
  alerts: any[]
  recommendations: string[]
}

/**
 * Global error system instance
 */
export const errorSystem = new UniversalErrorSystem()

/**
 * Initialize error system with default configuration
 */
export const initializeErrorSystem = async (config?: Partial<ErrorSystemConfig>) => {
  if (config) {
    errorSystem.updateConfiguration(config)
  }
  await errorSystem.initialize()
}

/**
 * Convenience exports for common functionality
 */
export {
  // Core classes and types
  ErrorCategory,
  ErrorSeverity,
  ErrorImpact,
  RecoveryStrategy,
  UserSkillLevel,
  ExplanationFormat,
  BaseToolError,

  // Error creation functions
  createToolAdapterError,
  createToolExecutionError,
  createToolAuthenticationError,
  createUserInputError,
  createSystemResourceError,
  createExternalServiceError,

  // Main handling functions
  handleError,
  explainError,
  executeWithRecovery,

  // Monitoring functions
  recordError,
  recordSuccess,
  recordMetric,
  getSystemHealth,

  // Analytics functions
  analyzeTrends,
  identifyErrorPatterns,
  performRootCauseAnalysis,
  generateAnalyticsReport,

  // Decorators
  WithRetry,
  MonitorPerformance
}

/**
 * Quick setup function for basic error handling
 */
export const setupBasicErrorHandling = async () => {
  await initializeErrorSystem({
    enableErrorTracking: true,
    enableRetryMechanisms: true,
    enableCircuitBreakers: true,
    enableMonitoring: true,
    enableAnalytics: false, // Disable for basic setup
    enablePredictiveAnalytics: false,
    enableRootCauseAnalysis: false
  })
  logger.info('Basic error handling system initialized')
}

/**
 * Quick setup function for full error handling
 */
export const setupFullErrorHandling = async () => {
  await initializeErrorSystem() // Use all defaults
  logger.info('Full error handling system initialized')
}