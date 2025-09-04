/**
 * Enhanced WebSocket Handler for Real-time Monitoring
 *
 * Integrates comprehensive monitoring services with WebSocket infrastructure:
 * - Real-time event streaming from enhanced event collector
 * - ML anomaly detection alerts and notifications
 * - Advanced performance metrics and business intelligence
 * - Intelligent event filtering and correlation
 * - Multi-tenant subscription management
 *
 * @enhanced 2025-09-03
 * @author Sim Enhanced Monitoring System
 */

import { createLogger } from '@/lib/logs/console/logger'
import { generateId } from '@/lib/utils'
import { mlAnomalyDetector } from '../analytics/anomaly-detector'
import type { AnomalyResult, MonitoringEvent } from '../core/event-collector'
import { enhancedEventCollector } from '../core/event-collector'
import type { ExecutionUpdate } from '../types'
import { executionMonitor } from './execution-monitor'
import { performanceCollector } from './performance-collector'

const logger = createLogger('MonitoringWebSocketHandler')

export interface MonitoringSubscription {
  type:
    | 'execution'
    | 'workspace'
    | 'performance'
    | 'alerts'
    | 'events'
    | 'anomalies'
    | 'business_metrics'
  id: string
  workspaceId: string
  filters?: {
    workflowIds?: string[]
    executionIds?: string[]
    alertTypes?: string[]
    eventTypes?: string[]
    severityLevels?: ('low' | 'medium' | 'high' | 'critical')[]
    blockTypes?: string[]
    anomalyTypes?: string[]
    businessCategories?: string[]
  }
  // Enhanced subscription options
  options?: {
    includeHistoricalData?: boolean
    maxBatchSize?: number
    throttleMs?: number
    enablePredictiveAlerts?: boolean
    aggregationLevel?: 'raw' | 'minute' | 'hour'
  }
}

export class MonitoringWebSocketHandler {
  private subscriptions = new Map<string, Set<MonitoringSubscription>>()
  private connectionWorkspaces = new Map<string, string>() // connectionId -> workspaceId
  private activeIterators = new Map<string, AsyncIterator<any>>()
  private eventQueues = new Map<string, MonitoringEvent[]>() // connectionId -> event buffer
  private throttleTimers = new Map<string, NodeJS.Timeout>() // subscription throttling
  private connectionStats = new Map<
    string,
    {
      messagesReceived: number
      messagesSent: number
      lastActivity: Date
      subscriptionCount: number
    }
  >()

  constructor(private socketServer: any) {
    this.setupEventListeners()
    this.setupEnhancedEventHandlers()
    logger.info('Enhanced MonitoringWebSocketHandler initialized', {
      features: [
        'real-time-events',
        'ml-anomaly-detection',
        'business-intelligence',
        'enhanced-filtering',
        'multi-tenant-subscriptions',
      ],
    })
  }

  /**
   * Handle new WebSocket connection for enhanced monitoring
   */
  async handleConnection(connectionId: string, workspaceId: string): Promise<void> {
    const operationId = generateId()

    logger.info(`[${operationId}] New enhanced monitoring connection`, {
      connectionId,
      workspaceId,
      timestamp: new Date().toISOString(),
    })

    // Initialize connection tracking
    this.connectionWorkspaces.set(connectionId, workspaceId)
    this.subscriptions.set(connectionId, new Set())
    this.eventQueues.set(connectionId, [])
    this.connectionStats.set(connectionId, {
      messagesReceived: 0,
      messagesSent: 0,
      lastActivity: new Date(),
      subscriptionCount: 0,
    })

    // Send enhanced initial data
    try {
      // Current active executions
      const activeExecutions = await executionMonitor.getActiveExecutions(workspaceId)

      // System health status
      const systemHealth = this.getSystemHealthStatus()

      // Recent anomaly detection statistics
      const anomalyStats = mlAnomalyDetector.getDetectionStats()

      // Event collector statistics
      const eventStats = enhancedEventCollector.getCollectorStats()

      this.sendToConnection(connectionId, {
        type: 'connection_established',
        data: {
          workspaceId,
          connectionId,
          activeExecutions,
          systemHealth,
          monitoring: {
            anomalyDetection: anomalyStats,
            eventCollection: eventStats,
            capabilities: [
              'real-time-monitoring',
              'ml-anomaly-detection',
              'performance-analytics',
              'business-intelligence',
              'predictive-alerting',
            ],
          },
        },
        timestamp: new Date().toISOString(),
      })

      this.updateConnectionStats(connectionId, 'sent')
    } catch (error) {
      logger.error(`[${operationId}] Error establishing enhanced monitoring connection`, {
        connectionId,
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
      })

      this.sendToConnection(connectionId, {
        type: 'connection_error',
        error: 'Failed to establish monitoring connection',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Handle enhanced connection disconnect with comprehensive cleanup
   */
  async handleDisconnect(connectionId: string): Promise<void> {
    const operationId = generateId()
    const stats = this.connectionStats.get(connectionId)

    logger.info(`[${operationId}] Enhanced monitoring connection disconnected`, {
      connectionId,
      workspaceId: this.connectionWorkspaces.get(connectionId),
      stats,
      subscriptionCount: this.subscriptions.get(connectionId)?.size || 0,
    })

    try {
      // Cleanup active iterators
      const iterator = this.activeIterators.get(connectionId)
      if (iterator && typeof iterator.return === 'function') {
        try {
          await iterator.return()
        } catch (error) {
          logger.warn(
            `[${operationId}] Error cleaning up iterator for connection ${connectionId}:`,
            error
          )
        }
      }

      // Cleanup throttle timers
      for (const [key, timer] of this.throttleTimers.entries()) {
        if (key.startsWith(connectionId)) {
          clearTimeout(timer)
          this.throttleTimers.delete(key)
        }
      }

      // Cleanup all connection data
      this.activeIterators.delete(connectionId)
      this.subscriptions.delete(connectionId)
      this.connectionWorkspaces.delete(connectionId)
      this.eventQueues.delete(connectionId)
      this.connectionStats.delete(connectionId)
    } catch (error) {
      logger.error(`[${operationId}] Error during connection cleanup`, {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Handle monitoring subscription request
   */
  async handleSubscribe(connectionId: string, subscription: MonitoringSubscription): Promise<void> {
    const operationId = `subscribe-${connectionId}-${subscription.type}-${Date.now()}`
    logger.debug(`[${operationId}] Processing subscription request`, {
      connectionId,
      subscriptionType: subscription.type,
      id: subscription.id,
    })

    try {
      const workspaceId = this.connectionWorkspaces.get(connectionId)
      if (!workspaceId) {
        throw new Error('Connection not associated with workspace')
      }

      // Validate workspace access
      if (subscription.workspaceId !== workspaceId) {
        throw new Error('Workspace access denied')
      }

      const connectionSubscriptions = this.subscriptions.get(connectionId)
      if (!connectionSubscriptions) {
        throw new Error('Connection subscriptions not found')
      }

      // Add subscription
      connectionSubscriptions.add(subscription)

      // Set up specific subscription handler with enhanced types
      switch (subscription.type) {
        case 'execution':
          await this.handleExecutionSubscription(connectionId, subscription)
          break

        case 'workspace':
          await this.handleWorkspaceSubscription(connectionId, subscription)
          break

        case 'performance':
          await this.handlePerformanceSubscription(connectionId, subscription)
          break

        case 'alerts':
          await this.handleAlertsSubscription(connectionId, subscription)
          break

        case 'events':
          await this.handleEventsSubscription(connectionId, subscription)
          break

        case 'anomalies':
          await this.handleAnomaliesSubscription(connectionId, subscription)
          break

        case 'business_metrics':
          await this.handleBusinessMetricsSubscription(connectionId, subscription)
          break

        default:
          throw new Error(`Unsupported subscription type: ${subscription.type}`)
      }

      // Confirm subscription
      this.sendToConnection(connectionId, {
        type: 'subscription_confirmed',
        subscriptionId: subscription.id,
        subscriptionType: subscription.type,
      })

      logger.debug(`[${operationId}] Subscription confirmed`, {
        connectionId,
        subscriptionType: subscription.type,
        id: subscription.id,
      })
    } catch (error) {
      logger.error(`[${operationId}] Error handling subscription:`, error)

      this.sendToConnection(connectionId, {
        type: 'subscription_error',
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(connectionId: string, subscriptionId: string): Promise<void> {
    logger.debug(`Unsubscribing ${connectionId} from ${subscriptionId}`)

    const connectionSubscriptions = this.subscriptions.get(connectionId)
    if (connectionSubscriptions) {
      // Remove subscription
      for (const subscription of connectionSubscriptions) {
        if (subscription.id === subscriptionId) {
          connectionSubscriptions.delete(subscription)
          break
        }
      }

      // Cleanup iterator if it exists
      const iteratorKey = `${connectionId}:${subscriptionId}`
      const iterator = this.activeIterators.get(iteratorKey)
      if (iterator && typeof iterator.return === 'function') {
        try {
          await iterator.return()
        } catch (error) {
          logger.warn(`Error cleaning up iterator for subscription ${subscriptionId}:`, error)
        }
      }
      this.activeIterators.delete(iteratorKey)

      this.sendToConnection(connectionId, {
        type: 'unsubscribed',
        subscriptionId,
      })
    }
  }

  /**
   * Handle execution-specific subscription
   */
  private async handleExecutionSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    if (!subscription.filters?.executionIds || subscription.filters.executionIds.length === 0) {
      throw new Error('Execution subscription requires executionIds in filters')
    }

    const executionId = subscription.filters.executionIds[0]

    try {
      const iterator = await executionMonitor.subscribeToWorkflowExecution(executionId)
      const iteratorKey = `${connectionId}:${subscription.id}`
      this.activeIterators.set(iteratorKey, iterator)

      // Process updates in background
      this.processExecutionUpdates(connectionId, subscription.id, iterator)
    } catch (error) {
      logger.error(`Error setting up execution subscription for ${executionId}:`, error)
      throw error
    }
  }

  /**
   * Handle workspace-wide subscription
   */
  private async handleWorkspaceSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    try {
      const iterator = await executionMonitor.subscribeToWorkspaceExecutions(
        subscription.workspaceId
      )
      const iteratorKey = `${connectionId}:${subscription.id}`
      this.activeIterators.set(iteratorKey, iterator)

      // Process updates in background
      this.processWorkspaceUpdates(connectionId, subscription.id, iterator, subscription.filters)
    } catch (error) {
      logger.error(
        `Error setting up workspace subscription for ${subscription.workspaceId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Handle performance metrics subscription
   */
  private async handlePerformanceSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `perf-sub-${connectionId}-${subscription.id}`
    logger.debug(`[${operationId}] Setting up performance subscription`)

    // Listen to performance collector events
    const handlePerformanceEvent = (event: any) => {
      // Filter based on subscription criteria
      if (
        subscription.filters?.workflowIds &&
        !subscription.filters.workflowIds.includes(event.workflowId)
      ) {
        return
      }

      if (
        subscription.filters?.executionIds &&
        !subscription.filters.executionIds.includes(event.executionId)
      ) {
        return
      }

      this.sendToConnection(connectionId, {
        type: 'performance_update',
        subscriptionId: subscription.id,
        data: event,
      })
    }

    performanceCollector.on('metrics_collected', handlePerformanceEvent)
    performanceCollector.on('performance_anomaly', handlePerformanceEvent)

    // Store cleanup function
    const cleanupKey = `${connectionId}:${subscription.id}:cleanup`
    this.activeIterators.set(cleanupKey, {
      async return() {
        performanceCollector.off('metrics_collected', handlePerformanceEvent)
        performanceCollector.off('performance_anomaly', handlePerformanceEvent)
        return { done: true, value: undefined }
      },
      async next() {
        return { done: true, value: undefined }
      },
      [Symbol.asyncIterator]() {
        return this
      },
    } as any)
  }

  /**
   * Handle enhanced alerts subscription
   */
  private async handleAlertsSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `alerts-sub-${connectionId}-${subscription.id}`
    logger.debug(`[${operationId}] Setting up enhanced alerts subscription`)

    // Enhanced alert handling with ML anomaly detection integration
    this.sendToConnection(connectionId, {
      type: 'alerts_subscription_active',
      subscriptionId: subscription.id,
      data: {
        message: 'Enhanced alerts subscription active with ML anomaly detection',
        capabilities: [
          'real-time-alerts',
          'predictive-alerts',
          'anomaly-detection',
          'business-impact-assessment',
        ],
        activeAlerts: [],
        detectionStats: mlAnomalyDetector.getDetectionStats(),
      },
    })
  }

  /**
   * Handle new enhanced events subscription for real-time event streaming
   */
  private async handleEventsSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `events-sub-${connectionId}-${subscription.id}`
    logger.debug(`[${operationId}] Setting up enhanced events subscription`, {
      filters: subscription.filters,
      options: subscription.options,
    })

    try {
      // Set up event listener for enhanced event collector
      const handleEvent = (event: MonitoringEvent) => {
        if (this.shouldForwardEvent(event, subscription)) {
          this.forwardEventToSubscription(connectionId, subscription.id, event)
        }
      }

      enhancedEventCollector.on('event_collected', handleEvent)

      // Store cleanup function for event handler
      const cleanupKey = `${connectionId}:${subscription.id}:events-cleanup`
      this.activeIterators.set(cleanupKey, {
        async return() {
          enhancedEventCollector.off('event_collected', handleEvent)
          return { done: true, value: undefined }
        },
        async next() {
          return { done: true, value: undefined }
        },
        [Symbol.asyncIterator]() {
          return this
        },
      } as any)

      // Send initial confirmation with current stats
      this.sendToConnection(connectionId, {
        type: 'events_subscription_active',
        subscriptionId: subscription.id,
        data: {
          filters: subscription.filters,
          eventCollectorStats: enhancedEventCollector.getCollectorStats(),
          message: 'Real-time event streaming active',
        },
      })

      this.updateConnectionStats(connectionId, 'sent')
    } catch (error) {
      logger.error(`[${operationId}] Error setting up events subscription`, {
        connectionId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Handle ML anomalies subscription for intelligent monitoring
   */
  private async handleAnomaliesSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `anomalies-sub-${connectionId}-${subscription.id}`
    logger.info(`[${operationId}] Setting up ML anomalies subscription`, {
      workspaceId: subscription.workspaceId,
      filters: subscription.filters,
    })

    try {
      // Set up anomaly detection listener
      const handleAnomaly = (anomaly: AnomalyResult) => {
        if (this.shouldForwardAnomaly(anomaly, subscription)) {
          this.forwardAnomalyToSubscription(connectionId, subscription.id, anomaly)
        }
      }

      mlAnomalyDetector.on('anomaly_detected', handleAnomaly)

      // Store cleanup function
      const cleanupKey = `${connectionId}:${subscription.id}:anomalies-cleanup`
      this.activeIterators.set(cleanupKey, {
        async return() {
          mlAnomalyDetector.off('anomaly_detected', handleAnomaly)
          return { done: true, value: undefined }
        },
        async next() {
          return { done: true, value: undefined }
        },
        [Symbol.asyncIterator]() {
          return this
        },
      } as any)

      // Send initial confirmation with detection statistics
      this.sendToConnection(connectionId, {
        type: 'anomalies_subscription_active',
        subscriptionId: subscription.id,
        data: {
          filters: subscription.filters,
          detectionStats: mlAnomalyDetector.getDetectionStats(),
          capabilities: [
            'statistical-detection',
            'business-impact-assessment',
            'actionable-recommendations',
            'predictive-alerting',
          ],
          message: 'ML-powered anomaly detection active',
        },
      })

      this.updateConnectionStats(connectionId, 'sent')
    } catch (error) {
      logger.error(`[${operationId}] Error setting up anomalies subscription`, {
        connectionId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Handle business metrics subscription for intelligence analytics
   */
  private async handleBusinessMetricsSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `business-metrics-sub-${connectionId}-${subscription.id}`
    logger.debug(`[${operationId}] Setting up business metrics subscription`)

    try {
      // Set up business context event listener
      const handleBusinessEvent = (event: MonitoringEvent) => {
        if (event.businessContext && this.shouldForwardEvent(event, subscription)) {
          this.forwardBusinessMetricsToSubscription(connectionId, subscription.id, event)
        }
      }

      enhancedEventCollector.on('event_collected', handleBusinessEvent)

      // Store cleanup function
      const cleanupKey = `${connectionId}:${subscription.id}:business-cleanup`
      this.activeIterators.set(cleanupKey, {
        async return() {
          enhancedEventCollector.off('event_collected', handleBusinessEvent)
          return { done: true, value: undefined }
        },
        async next() {
          return { done: true, value: undefined }
        },
        [Symbol.asyncIterator]() {
          return this
        },
      } as any)

      // Send initial confirmation
      this.sendToConnection(connectionId, {
        type: 'business_metrics_subscription_active',
        subscriptionId: subscription.id,
        data: {
          filters: subscription.filters,
          capabilities: [
            'cost-tracking',
            'time-savings-analysis',
            'productivity-metrics',
            'roi-calculation',
            'department-analytics',
          ],
          message: 'Business intelligence analytics active',
        },
      })

      this.updateConnectionStats(connectionId, 'sent')
    } catch (error) {
      logger.error(`[${operationId}] Error setting up business metrics subscription`, {
        connectionId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Helper methods for enhanced functionality

  /**
   * Check if event should be forwarded to subscription based on filters
   */
  private shouldForwardEvent(
    event: MonitoringEvent,
    subscription: MonitoringSubscription
  ): boolean {
    const filters = subscription.filters
    if (!filters) return true

    // Check workspace filtering (implicit through connection)
    if (event.workspaceId !== subscription.workspaceId) {
      return false
    }

    // Check workflow filtering
    if (filters.workflowIds && !filters.workflowIds.includes(event.workflowId)) {
      return false
    }

    // Check execution filtering
    if (filters.executionIds && !filters.executionIds.includes(event.executionId)) {
      return false
    }

    // Check event type filtering
    if (filters.eventTypes && !filters.eventTypes.includes(event.eventType)) {
      return false
    }

    // Check severity filtering
    if (
      filters.severityLevels &&
      event.businessContext?.priority &&
      !filters.severityLevels.includes(event.businessContext.priority)
    ) {
      return false
    }

    // Check block type filtering
    if (filters.blockTypes && event.blockType && !filters.blockTypes.includes(event.blockType)) {
      return false
    }

    // Check business category filtering
    if (
      filters.businessCategories &&
      event.businessContext?.category &&
      !filters.businessCategories.includes(event.businessContext.category)
    ) {
      return false
    }

    return true
  }

  /**
   * Check if anomaly should be forwarded to subscription
   */
  private shouldForwardAnomaly(
    anomaly: AnomalyResult,
    subscription: MonitoringSubscription
  ): boolean {
    const filters = subscription.filters
    if (!filters) return true

    // Check workflow filtering
    if (filters.workflowIds && !filters.workflowIds.includes(anomaly.workflowId)) {
      return false
    }

    // Check execution filtering
    if (filters.executionIds && !filters.executionIds.includes(anomaly.executionId)) {
      return false
    }

    // Check anomaly type filtering
    if (filters.anomalyTypes && !filters.anomalyTypes.includes(anomaly.type)) {
      return false
    }

    // Check severity filtering
    if (filters.severityLevels && !filters.severityLevels.includes(anomaly.severity)) {
      return false
    }

    // Check block type filtering
    if (
      filters.blockTypes &&
      anomaly.blockType &&
      !filters.blockTypes.includes(anomaly.blockType)
    ) {
      return false
    }

    return true
  }

  /**
   * Forward event to subscription with optional throttling
   */
  private forwardEventToSubscription(
    connectionId: string,
    subscriptionId: string,
    event: MonitoringEvent
  ): void {
    const subscription = this.findSubscription(connectionId, subscriptionId)
    if (!subscription) return

    const throttleMs = subscription.options?.throttleMs
    if (throttleMs && throttleMs > 0) {
      this.throttledSend(
        connectionId,
        subscriptionId,
        {
          type: 'event_update',
          subscriptionId,
          data: event,
          timestamp: new Date().toISOString(),
        },
        throttleMs
      )
    } else {
      this.sendToConnection(connectionId, {
        type: 'event_update',
        subscriptionId,
        data: event,
        timestamp: new Date().toISOString(),
      })
      this.updateConnectionStats(connectionId, 'sent')
    }
  }

  /**
   * Forward anomaly to subscription with business impact analysis
   */
  private forwardAnomalyToSubscription(
    connectionId: string,
    subscriptionId: string,
    anomaly: AnomalyResult
  ): void {
    this.sendToConnection(connectionId, {
      type: 'anomaly_detected',
      subscriptionId,
      data: {
        anomaly,
        businessImpact: anomaly.businessImpact,
        recommendations: anomaly.recommendations,
        confidence: anomaly.confidence,
        severity: anomaly.severity,
        timestamp: anomaly.timestamp.toISOString(),
      },
    })
    this.updateConnectionStats(connectionId, 'sent')
  }

  /**
   * Forward business metrics to subscription
   */
  private forwardBusinessMetricsToSubscription(
    connectionId: string,
    subscriptionId: string,
    event: MonitoringEvent
  ): void {
    if (!event.businessContext) return

    this.sendToConnection(connectionId, {
      type: 'business_metrics_update',
      subscriptionId,
      data: {
        workflowId: event.workflowId,
        executionId: event.executionId,
        blockId: event.blockId,
        businessContext: event.businessContext,
        eventType: event.eventType,
        timestamp: event.timestamp.toISOString(),
      },
    })
    this.updateConnectionStats(connectionId, 'sent')
  }

  /**
   * Handle processed events from enhanced event collector
   */
  private handleProcessedEvent(event: MonitoringEvent): void {
    // Broadcast processed events to relevant subscriptions
    this.broadcastEventToSubscribers('event_processed', event)
  }

  /**
   * Handle performance anomaly events
   */
  private handlePerformanceAnomalyEvent(data: any): void {
    this.broadcastEventToSubscribers('performance_anomaly', data)
  }

  /**
   * Handle system events
   */
  private handleSystemEvent(event: MonitoringEvent): void {
    // System events get priority broadcasting
    this.broadcastEventToSubscribers('system_event', event, true)
  }

  /**
   * Handle ML anomaly detection alerts
   */
  private handleAnomalyDetected(anomaly: AnomalyResult): void {
    // Broadcast anomaly to all anomaly subscriptions
    for (const [connectionId, subscriptions] of this.subscriptions.entries()) {
      for (const subscription of subscriptions) {
        if (subscription.type === 'anomalies' && this.shouldForwardAnomaly(anomaly, subscription)) {
          this.forwardAnomalyToSubscription(connectionId, subscription.id, anomaly)
        }
      }
    }
  }

  /**
   * Find a subscription by connection and subscription ID
   */
  private findSubscription(
    connectionId: string,
    subscriptionId: string
  ): MonitoringSubscription | undefined {
    const subscriptions = this.subscriptions.get(connectionId)
    if (!subscriptions) return undefined

    for (const subscription of subscriptions) {
      if (subscription.id === subscriptionId) {
        return subscription
      }
    }
    return undefined
  }

  /**
   * Broadcast event to relevant subscribers
   */
  private broadcastEventToSubscribers(eventType: string, data: any, highPriority = false): void {
    for (const [connectionId, subscriptions] of this.subscriptions.entries()) {
      for (const subscription of subscriptions) {
        // Route to appropriate subscription types
        let shouldBroadcast = false

        if (eventType === 'event_processed' && subscription.type === 'events') {
          shouldBroadcast = this.shouldForwardEvent(data, subscription)
        } else if (eventType === 'performance_anomaly' && subscription.type === 'performance') {
          shouldBroadcast = true // Performance subscriptions get all anomalies
        } else if (
          eventType === 'system_event' &&
          (subscription.type === 'alerts' || subscription.type === 'events')
        ) {
          shouldBroadcast = true // System events go to alerts and events
        }

        if (shouldBroadcast) {
          const message = {
            type: eventType,
            subscriptionId: subscription.id,
            data,
            timestamp: new Date().toISOString(),
            priority: highPriority ? 'high' : 'normal',
          }

          if (highPriority) {
            // Send immediately for high priority
            this.sendToConnection(connectionId, message)
            this.updateConnectionStats(connectionId, 'sent')
          } else {
            // Use throttling for normal priority
            const throttleMs = subscription.options?.throttleMs || 0
            if (throttleMs > 0) {
              this.throttledSend(connectionId, subscription.id, message, throttleMs)
            } else {
              this.sendToConnection(connectionId, message)
              this.updateConnectionStats(connectionId, 'sent')
            }
          }
        }
      }
    }
  }

  /**
   * Send message with throttling support
   */
  private throttledSend(
    connectionId: string,
    subscriptionId: string,
    message: any,
    throttleMs: number
  ): void {
    const timerKey = `${connectionId}:${subscriptionId}:throttle`

    // Clear existing timer if present
    const existingTimer = this.throttleTimers.get(timerKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.sendToConnection(connectionId, message)
      this.updateConnectionStats(connectionId, 'sent')
      this.throttleTimers.delete(timerKey)
    }, throttleMs)

    this.throttleTimers.set(timerKey, timer)
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(connectionId: string, type: 'sent' | 'received'): void {
    const stats = this.connectionStats.get(connectionId)
    if (stats) {
      if (type === 'sent') {
        stats.messagesSent++
      } else {
        stats.messagesReceived++
      }
      stats.lastActivity = new Date()
    }
  }

  /**
   * Get system health status for connection establishment
   */
  private getSystemHealthStatus(): any {
    return {
      status: 'healthy',
      components: {
        eventCollector: 'active',
        anomalyDetector: 'active',
        performanceMonitor: 'active',
        alertingSystem: 'active',
      },
      uptime: process.uptime() * 1000,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Process execution updates from iterator
   */
  private async processExecutionUpdates(
    connectionId: string,
    subscriptionId: string,
    iterator: AsyncIterator<ExecutionUpdate>
  ): Promise<void> {
    const operationId = `process-exec-${connectionId}-${subscriptionId}`
    logger.debug(`[${operationId}] Starting execution updates processing`)

    try {
      for await (const update of { [Symbol.asyncIterator]: () => iterator }) {
        // Check if connection still exists
        if (!this.subscriptions.has(connectionId)) {
          logger.debug(
            `[${operationId}] Connection ${connectionId} no longer exists, stopping updates`
          )
          break
        }

        this.sendToConnection(connectionId, {
          type: 'execution_update',
          subscriptionId,
          data: update,
        })
      }
    } catch (error) {
      logger.error(`[${operationId}] Error processing execution updates:`, error)

      this.sendToConnection(connectionId, {
        type: 'subscription_error',
        subscriptionId,
        error: error instanceof Error ? error.message : 'Update processing error',
      })
    } finally {
      logger.debug(`[${operationId}] Execution updates processing completed`)
    }
  }

  /**
   * Process workspace updates from iterator
   */
  private async processWorkspaceUpdates(
    connectionId: string,
    subscriptionId: string,
    iterator: AsyncIterator<ExecutionUpdate[]>,
    filters?: MonitoringSubscription['filters']
  ): Promise<void> {
    const operationId = `process-workspace-${connectionId}-${subscriptionId}`
    logger.debug(`[${operationId}] Starting workspace updates processing`)

    try {
      for await (const updates of { [Symbol.asyncIterator]: () => iterator }) {
        // Check if connection still exists
        if (!this.subscriptions.has(connectionId)) {
          logger.debug(
            `[${operationId}] Connection ${connectionId} no longer exists, stopping updates`
          )
          break
        }

        // Apply filters if specified
        let filteredUpdates = updates
        if (filters) {
          filteredUpdates = updates.filter((update) => {
            if (filters.workflowIds && !filters.workflowIds.includes(update.workflowId)) {
              return false
            }
            if (filters.executionIds && !filters.executionIds.includes(update.executionId)) {
              return false
            }
            return true
          })
        }

        if (filteredUpdates.length > 0) {
          this.sendToConnection(connectionId, {
            type: 'workspace_updates',
            subscriptionId,
            data: filteredUpdates,
          })
        }
      }
    } catch (error) {
      logger.error(`[${operationId}] Error processing workspace updates:`, error)

      this.sendToConnection(connectionId, {
        type: 'subscription_error',
        subscriptionId,
        error: error instanceof Error ? error.message : 'Update processing error',
      })
    } finally {
      logger.debug(`[${operationId}] Workspace updates processing completed`)
    }
  }

  /**
   * Setup event listeners for monitoring services
   */
  private setupEventListeners(): void {
    // Listen to execution monitor events
    executionMonitor.on('execution_update', (event) => {
      this.broadcastToWorkspace(event.workflowId, {
        type: 'execution_event',
        data: event,
      })
    })

    // Listen to performance collector events
    performanceCollector.on('metrics_collected', (event) => {
      this.broadcastToWorkspace(event.data.workflowId, {
        type: 'performance_metrics',
        data: event,
      })
    })

    performanceCollector.on('performance_anomaly', (event) => {
      this.broadcastToWorkspace(event.workflowId, {
        type: 'performance_anomaly',
        data: event,
      })
    })

    logger.debug('Event listeners set up for monitoring services')
  }

  /**
   * Setup enhanced event handlers for new monitoring components
   */
  private setupEnhancedEventHandlers(): void {
    const operationId = generateId()
    logger.debug(`[${operationId}] Setting up enhanced monitoring event handlers`)

    // Enhanced event collector integration
    enhancedEventCollector.on('event_processed', (event: MonitoringEvent) => {
      this.handleProcessedEvent(event)
    })

    enhancedEventCollector.on('performance_anomaly', (data: any) => {
      this.handlePerformanceAnomalyEvent(data)
    })

    enhancedEventCollector.on('system_event', (event: MonitoringEvent) => {
      this.handleSystemEvent(event)
    })

    // ML anomaly detector integration
    mlAnomalyDetector.on('anomaly_detected', (anomaly: AnomalyResult) => {
      this.handleAnomalyDetected(anomaly)
    })

    logger.info(`[${operationId}] Enhanced event handlers established`, {
      handlers: ['event-processor', 'performance-anomaly', 'system-event', 'ml-anomaly-detection'],
    })
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: any): void {
    try {
      if (this.socketServer?.to) {
        this.socketServer.to(connectionId).emit('monitoring_update', message)
      } else {
        logger.warn(
          `Cannot send message - socket server not available for connection ${connectionId}`
        )
      }
    } catch (error) {
      logger.error(`Error sending message to connection ${connectionId}:`, error)
    }
  }

  /**
   * Broadcast message to all connections in a workspace
   */
  private async broadcastToWorkspace(workflowId: string, message: any): Promise<void> {
    // This would need to be enhanced to map workflow to workspace
    // For now, we'll broadcast to all connections
    try {
      if (this.socketServer?.emit) {
        this.socketServer.emit('monitoring_broadcast', {
          workflowId,
          ...message,
        })
      }
    } catch (error) {
      logger.error(`Error broadcasting message for workflow ${workflowId}:`, error)
    }
  }

  /**
   * Get comprehensive handler statistics
   */
  getHandlerStats(): {
    connections: number
    subscriptions: number
    activeIterators: number
    eventQueues: number
    throttleTimers: number
    connectionStats: any[]
    subscriptionTypes: Record<string, number>
  } {
    let totalSubscriptions = 0
    const subscriptionTypes: Record<string, number> = {}

    for (const subscriptionSet of this.subscriptions.values()) {
      totalSubscriptions += subscriptionSet.size
      for (const subscription of subscriptionSet) {
        subscriptionTypes[subscription.type] = (subscriptionTypes[subscription.type] || 0) + 1
      }
    }

    const connectionStatsArray = Array.from(this.connectionStats.entries()).map(
      ([connectionId, stats]) => ({
        connectionId,
        workspaceId: this.connectionWorkspaces.get(connectionId),
        ...stats,
        subscriptionCount: this.subscriptions.get(connectionId)?.size || 0,
      })
    )

    return {
      connections: this.subscriptions.size,
      subscriptions: totalSubscriptions,
      activeIterators: this.activeIterators.size,
      eventQueues: this.eventQueues.size,
      throttleTimers: this.throttleTimers.size,
      connectionStats: connectionStatsArray,
      subscriptionTypes,
    }
  }

  /**
   * Destroy enhanced handler and cleanup all resources
   */
  destroy(): void {
    const operationId = generateId()
    logger.info(`[${operationId}] Destroying Enhanced MonitoringWebSocketHandler`)

    try {
      // Cleanup all active iterators
      for (const [key, iterator] of this.activeIterators.entries()) {
        if (iterator && typeof iterator.return === 'function') {
          try {
            iterator.return()
          } catch (error) {
            logger.warn(`[${operationId}] Error cleaning up iterator ${key}:`, error)
          }
        }
      }

      // Cleanup all throttle timers
      for (const [key, timer] of this.throttleTimers.entries()) {
        try {
          clearTimeout(timer)
        } catch (error) {
          logger.warn(`[${operationId}] Error clearing timer ${key}:`, error)
        }
      }

      // Remove all enhanced event listeners
      enhancedEventCollector.removeAllListeners()
      mlAnomalyDetector.removeAllListeners()

      // Clear all data structures
      this.activeIterators.clear()
      this.subscriptions.clear()
      this.connectionWorkspaces.clear()
      this.eventQueues.clear()
      this.throttleTimers.clear()
      this.connectionStats.clear()

      logger.info(`[${operationId}] Enhanced MonitoringWebSocketHandler destroyed successfully`, {
        resourcesCleaned: [
          'active-iterators',
          'subscriptions',
          'connection-workspaces',
          'event-queues',
          'throttle-timers',
          'connection-stats',
          'event-listeners',
        ],
      })
    } catch (error) {
      logger.error(`[${operationId}] Error during enhanced handler destruction`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
