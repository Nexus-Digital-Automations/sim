/**
 * Sim Workflow Monitoring System
 * Main entry point and orchestration for the comprehensive monitoring platform
 */

import { createLogger } from '@/lib/logs/console/logger'
import { alertEngine } from './alerting/alert-engine'
import { escalationManager } from './alerting/escalation-manager'
import { notificationService } from './alerting/notification-service'
import { analyticsService } from './analytics/analytics-service'
import { debugService } from './debugging/debug-service'
import { executionMonitor } from './real-time/execution-monitor'
import { performanceCollector } from './real-time/performance-collector'
import { MonitoringWebSocketHandler } from './real-time/websocket-handler'
import type { AlertInstance, AlertRule, LiveExecutionStatus, PerformanceMetrics } from './types'

const logger = createLogger('MonitoringSystem')

export interface MonitoringSystemConfig {
  enableRealTimeMonitoring: boolean
  enablePerformanceCollection: boolean
  enableAlerting: boolean
  enableAnalytics: boolean
  enableDebugging: boolean
  socketServer?: any // Socket.IO server instance
  performanceCollectionInterval: number
  alertEvaluationInterval: number
  metricsRetentionDays: number
}

export class MonitoringSystem {
  private static instance: MonitoringSystem
  private config: MonitoringSystemConfig
  private websocketHandler?: MonitoringWebSocketHandler
  private isInitialized = false
  private eventSubscriptions: (() => void)[] = []

  private constructor(config: Partial<MonitoringSystemConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      enablePerformanceCollection: true,
      enableAlerting: true,
      enableAnalytics: true,
      enableDebugging: true,
      performanceCollectionInterval: 10000, // 10 seconds
      alertEvaluationInterval: 30000, // 30 seconds
      metricsRetentionDays: 30,
      ...config,
    }

    logger.info('MonitoringSystem initialized with config:', {
      realTime: this.config.enableRealTimeMonitoring,
      performance: this.config.enablePerformanceCollection,
      alerting: this.config.enableAlerting,
      analytics: this.config.enableAnalytics,
      debugging: this.config.enableDebugging,
    })
  }

  static getInstance(config?: Partial<MonitoringSystemConfig>): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem(config)
    }
    return MonitoringSystem.instance
  }

  /**
   * Initialize the monitoring system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('MonitoringSystem already initialized')
      return
    }

    const operationId = `init-${Date.now()}`
    logger.info(`[${operationId}] Initializing MonitoringSystem`)

    try {
      // Initialize WebSocket handler if socket server is provided
      if (this.config.socketServer && this.config.enableRealTimeMonitoring) {
        this.websocketHandler = new MonitoringWebSocketHandler(this.config.socketServer)
        logger.debug(`[${operationId}] WebSocket handler initialized`)
      }

      // Set up cross-service event connections
      this.setupEventConnections()

      // Set up performance monitoring integration
      if (this.config.enablePerformanceCollection) {
        this.setupPerformanceIntegration()
      }

      // Set up alerting integration
      if (this.config.enableAlerting) {
        this.setupAlertingIntegration()
      }

      this.isInitialized = true
      logger.info(`[${operationId}] MonitoringSystem initialization completed successfully`)
    } catch (error) {
      logger.error(`[${operationId}] MonitoringSystem initialization failed:`, error)
      throw error
    }
  }

  /**
   * Start monitoring a workflow execution
   */
  async startExecutionMonitoring(
    execution: Omit<LiveExecutionStatus, 'status' | 'progress' | 'startedAt'>
  ): Promise<void> {
    const operationId = `start-monitoring-${execution.executionId}`
    logger.debug(`[${operationId}] Starting execution monitoring`)

    try {
      // Start real-time execution monitoring
      if (this.config.enableRealTimeMonitoring) {
        await executionMonitor.startExecution(execution)
      }

      // Start performance collection
      if (this.config.enablePerformanceCollection) {
        await performanceCollector.startExecutionMonitoring(
          execution.executionId,
          execution.workflowId
        )
      }

      logger.info(`[${operationId}] Execution monitoring started for ${execution.executionId}`)
    } catch (error) {
      logger.error(`[${operationId}] Error starting execution monitoring:`, error)
      throw error
    }
  }

  /**
   * Update execution status with monitoring data
   */
  async updateExecution(
    executionId: string,
    updates: Partial<LiveExecutionStatus>,
    metrics?: Partial<PerformanceMetrics>
  ): Promise<void> {
    const operationId = `update-${executionId}`
    logger.debug(`[${operationId}] Updating execution with monitoring data`)

    try {
      // Update execution status
      if (this.config.enableRealTimeMonitoring) {
        await executionMonitor.updateExecutionStatus(executionId, updates)
      }

      // Collect performance metrics if provided
      if (this.config.enablePerformanceCollection && metrics && updates.currentBlock) {
        await performanceCollector.collectMetrics(executionId, updates.currentBlock.blockId, {
          executionId,
          workflowId: updates.workflowId || 'unknown',
          blockId: updates.currentBlock.blockId,
          ...metrics,
        })

        // Trigger alert evaluation if alerting is enabled
        if (this.config.enableAlerting && metrics.metrics) {
          await alertEngine.evaluateRules(executionId, {
            executionId,
            workflowId: updates.workflowId || 'unknown',
            blockId: updates.currentBlock.blockId,
            metrics: metrics.metrics,
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      logger.error(`[${operationId}] Error updating execution:`, error)
      throw error
    }
  }

  /**
   * Complete execution monitoring
   */
  async completeExecution(executionId: string, success: boolean, finalData?: any): Promise<void> {
    const operationId = `complete-${executionId}`
    logger.debug(`[${operationId}] Completing execution monitoring`)

    try {
      // Complete real-time monitoring
      if (this.config.enableRealTimeMonitoring) {
        await executionMonitor.completeExecution(executionId, success, finalData)
      }

      // Stop performance monitoring
      if (this.config.enablePerformanceCollection) {
        await performanceCollector.stopExecutionMonitoring(executionId)
      }

      logger.info(`[${operationId}] Execution monitoring completed for ${executionId}`)
    } catch (error) {
      logger.error(`[${operationId}] Error completing execution monitoring:`, error)
      throw error
    }
  }

  /**
   * Create alert rule
   */
  async createAlertRule(
    rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AlertRule> {
    if (!this.config.enableAlerting) {
      throw new Error('Alerting is disabled in configuration')
    }

    return await alertEngine.createRule(rule)
  }

  /**
   * Get active alerts for workspace
   */
  async getActiveAlerts(workspaceId: string): Promise<AlertInstance[]> {
    if (!this.config.enableAlerting) {
      return []
    }

    return await alertEngine.getActiveAlerts(workspaceId)
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string, timeRange: any): Promise<any> {
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics is disabled in configuration')
    }

    return await analyticsService.getWorkflowAnalytics(workflowId, timeRange)
  }

  /**
   * Create debug session
   */
  async createDebugSession(executionId: string, userId: string): Promise<any> {
    if (!this.config.enableDebugging) {
      throw new Error('Debugging is disabled in configuration')
    }

    return await debugService.createDebugSession(executionId, userId)
  }

  /**
   * Get monitoring system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, { status: string; details: any }>
    uptime: number
  } {
    const startTime = process.uptime() * 1000 // Convert to milliseconds
    const services: Record<string, { status: string; details: any }> = {}

    // Check execution monitor
    if (this.config.enableRealTimeMonitoring) {
      try {
        const stats = executionMonitor.getExecutionStats()
        services.executionMonitor = {
          status: 'healthy',
          details: stats,
        }
      } catch (error) {
        services.executionMonitor = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    }

    // Check performance collector
    if (this.config.enablePerformanceCollection) {
      try {
        const stats = performanceCollector.getCollectorStats()
        services.performanceCollector = {
          status: 'healthy',
          details: stats,
        }
      } catch (error) {
        services.performanceCollector = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    }

    // Check alert engine
    if (this.config.enableAlerting) {
      try {
        const stats = alertEngine.getEngineStats()
        services.alertEngine = {
          status: 'healthy',
          details: stats,
        }
      } catch (error) {
        services.alertEngine = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    }

    // Check analytics service
    if (this.config.enableAnalytics) {
      try {
        const stats = analyticsService.getServiceStats()
        services.analyticsService = {
          status: 'healthy',
          details: stats,
        }
      } catch (error) {
        services.analyticsService = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    }

    // Check debug service
    if (this.config.enableDebugging) {
      try {
        const stats = debugService.getServiceStats()
        services.debugService = {
          status: 'healthy',
          details: stats,
        }
      } catch (error) {
        services.debugService = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    }

    // Determine overall status
    const serviceStatuses = Object.values(services).map((service) => service.status)
    const unhealthyCount = serviceStatuses.filter((status) => status === 'unhealthy').length
    const degradedCount = serviceStatuses.filter((status) => status === 'degraded').length

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      services,
      uptime: startTime,
    }
  }

  /**
   * Set up event connections between services
   */
  private setupEventConnections(): void {
    const operationId = 'setup-events'
    logger.debug(`[${operationId}] Setting up cross-service event connections`)

    // Connect execution monitor events to alert engine
    if (this.config.enableRealTimeMonitoring && this.config.enableAlerting) {
      const executionUpdateHandler = (event: any) => {
        // Process execution updates for alerting
        alertEngine.processExecutionUpdate(event.data).catch((error) => {
          logger.error('Error processing execution update for alerts:', error)
        })
      }

      executionMonitor.on('execution_update', executionUpdateHandler)
      this.eventSubscriptions.push(() => {
        executionMonitor.off('execution_update', executionUpdateHandler)
      })
    }

    // Connect alert events to escalation manager
    if (this.config.enableAlerting) {
      const alertTriggeredHandler = (event: any) => {
        // Get the rule for escalation policy
        // This would need to be enhanced to get the actual rule
        const mockRule: AlertRule = {
          id: event.ruleId,
          name: 'Mock Rule',
          workspaceId: 'workspace',
          enabled: true,
          conditions: [],
          actions: [],
          cooldownPeriod: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
        }

        escalationManager.startEscalation(event.data, mockRule).catch((error) => {
          logger.error('Error starting alert escalation:', error)
        })
      }

      const alertAcknowledgedHandler = (event: any) => {
        escalationManager.handleAlertAcknowledged(event.data).catch((error) => {
          logger.error('Error handling alert acknowledgment:', error)
        })
      }

      const alertResolvedHandler = (event: any) => {
        escalationManager.handleAlertResolved(event.data).catch((error) => {
          logger.error('Error handling alert resolution:', error)
        })
      }

      alertEngine.on('alert_triggered', alertTriggeredHandler)
      alertEngine.on('alert_acknowledged', alertAcknowledgedHandler)
      alertEngine.on('alert_resolved', alertResolvedHandler)

      this.eventSubscriptions.push(() => {
        alertEngine.off('alert_triggered', alertTriggeredHandler)
        alertEngine.off('alert_acknowledged', alertAcknowledgedHandler)
        alertEngine.off('alert_resolved', alertResolvedHandler)
      })
    }

    // Connect performance anomalies to alert system
    if (this.config.enablePerformanceCollection && this.config.enableAlerting) {
      const performanceAnomalyHandler = (event: any) => {
        // Convert performance anomaly to alert if needed
        logger.warn('Performance anomaly detected:', event)
      }

      performanceCollector.on('performance_anomaly', performanceAnomalyHandler)
      this.eventSubscriptions.push(() => {
        performanceCollector.off('performance_anomaly', performanceAnomalyHandler)
      })
    }

    logger.debug(`[${operationId}] Cross-service event connections established`)
  }

  /**
   * Set up performance monitoring integration
   */
  private setupPerformanceIntegration(): void {
    logger.debug('Setting up performance monitoring integration')

    // Performance collection would be integrated with the workflow executor
    // This is where executor hooks would be added to collect metrics during execution
  }

  /**
   * Set up alerting integration
   */
  private setupAlertingIntegration(): void {
    logger.debug('Setting up alerting system integration')

    // Alert evaluation would be triggered by performance metrics and execution events
    // This is already handled through event connections
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    system: any
    executionMonitor?: any
    performanceCollector?: any
    alertEngine?: any
    analyticsService?: any
    debugService?: any
    websocketHandler?: any
  } {
    const stats: any = {
      system: {
        initialized: this.isInitialized,
        config: this.config,
        eventSubscriptions: this.eventSubscriptions.length,
      },
    }

    if (this.config.enableRealTimeMonitoring) {
      stats.executionMonitor = executionMonitor.getExecutionStats()
    }

    if (this.config.enablePerformanceCollection) {
      stats.performanceCollector = performanceCollector.getCollectorStats()
    }

    if (this.config.enableAlerting) {
      stats.alertEngine = alertEngine.getEngineStats()
    }

    if (this.config.enableAnalytics) {
      stats.analyticsService = analyticsService.getServiceStats()
    }

    if (this.config.enableDebugging) {
      stats.debugService = debugService.getServiceStats()
    }

    if (this.websocketHandler) {
      stats.websocketHandler = this.websocketHandler.getHandlerStats()
    }

    return stats
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<MonitoringSystemConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('MonitoringSystem configuration updated:', newConfig)
  }

  /**
   * Shutdown the monitoring system
   */
  async shutdown(): Promise<void> {
    const operationId = 'shutdown'
    logger.info(`[${operationId}] Shutting down MonitoringSystem`)

    try {
      // Cleanup event subscriptions
      for (const unsubscribe of this.eventSubscriptions) {
        try {
          unsubscribe()
        } catch (error) {
          logger.warn('Error unsubscribing from event:', error)
        }
      }
      this.eventSubscriptions = []

      // Destroy services
      if (this.websocketHandler) {
        this.websocketHandler.destroy()
      }

      if (this.config.enableRealTimeMonitoring) {
        executionMonitor.destroy()
      }

      if (this.config.enablePerformanceCollection) {
        performanceCollector.destroy()
      }

      if (this.config.enableAlerting) {
        alertEngine.destroy()
        escalationManager.destroy()
      }

      if (this.config.enableAnalytics) {
        analyticsService.destroy()
      }

      if (this.config.enableDebugging) {
        debugService.destroy()
      }

      this.isInitialized = false
      logger.info(`[${operationId}] MonitoringSystem shutdown completed`)
    } catch (error) {
      logger.error(`[${operationId}] Error during MonitoringSystem shutdown:`, error)
      throw error
    }
  }
}

// Export services individually for direct access
export {
  executionMonitor,
  performanceCollector,
  alertEngine,
  escalationManager,
  notificationService,
  analyticsService,
  debugService,
  MonitoringWebSocketHandler,
}

// Export types
export * from './types'

// Export main monitoring system
export const monitoringSystem = MonitoringSystem.getInstance()

export default MonitoringSystem
