/**
 * WebSocket Handler for Real-time Monitoring
 * Integrates monitoring services with the existing WebSocket infrastructure
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ExecutionUpdate } from '../types'
import { executionMonitor } from './execution-monitor'
import { performanceCollector } from './performance-collector'

const logger = createLogger('MonitoringWebSocketHandler')

export interface MonitoringSubscription {
  type: 'execution' | 'workspace' | 'performance' | 'alerts'
  id: string
  workspaceId: string
  filters?: {
    workflowIds?: string[]
    executionIds?: string[]
    alertTypes?: string[]
  }
}

export class MonitoringWebSocketHandler {
  private subscriptions = new Map<string, Set<MonitoringSubscription>>()
  private connectionWorkspaces = new Map<string, string>() // connectionId -> workspaceId
  private activeIterators = new Map<string, AsyncIterator<any>>()

  constructor(private socketServer: any) {
    this.setupEventListeners()
    logger.info('MonitoringWebSocketHandler initialized')
  }

  /**
   * Handle new WebSocket connection for monitoring
   */
  async handleConnection(connectionId: string, workspaceId: string): Promise<void> {
    logger.debug(`New monitoring connection: ${connectionId} for workspace ${workspaceId}`)

    this.connectionWorkspaces.set(connectionId, workspaceId)
    this.subscriptions.set(connectionId, new Set())

    // Send current active executions
    try {
      const activeExecutions = await executionMonitor.getActiveExecutions(workspaceId)
      this.sendToConnection(connectionId, {
        type: 'initial_executions',
        data: activeExecutions,
      })
    } catch (error) {
      logger.error(`Error sending initial executions to ${connectionId}:`, error)
    }
  }

  /**
   * Handle connection disconnect
   */
  async handleDisconnect(connectionId: string): Promise<void> {
    logger.debug(`Monitoring connection disconnected: ${connectionId}`)

    // Cleanup active iterators
    const iterator = this.activeIterators.get(connectionId)
    if (iterator && typeof iterator.return === 'function') {
      try {
        await iterator.return()
      } catch (error) {
        logger.warn(`Error cleaning up iterator for connection ${connectionId}:`, error)
      }
    }

    this.activeIterators.delete(connectionId)
    this.subscriptions.delete(connectionId)
    this.connectionWorkspaces.delete(connectionId)
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

      // Set up specific subscription handler
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
   * Handle alerts subscription
   */
  private async handleAlertsSubscription(
    connectionId: string,
    subscription: MonitoringSubscription
  ): Promise<void> {
    const operationId = `alerts-sub-${connectionId}-${subscription.id}`
    logger.debug(`[${operationId}] Setting up alerts subscription`)

    // For now, this is a placeholder - alerts engine will be implemented next
    this.sendToConnection(connectionId, {
      type: 'alerts_update',
      subscriptionId: subscription.id,
      data: {
        message: 'Alerts subscription active - implementation coming soon',
        activeAlerts: [],
      },
    })
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
   * Get handler statistics
   */
  getHandlerStats(): {
    connections: number
    subscriptions: number
    activeIterators: number
  } {
    let totalSubscriptions = 0
    for (const subscriptionSet of this.subscriptions.values()) {
      totalSubscriptions += subscriptionSet.size
    }

    return {
      connections: this.subscriptions.size,
      subscriptions: totalSubscriptions,
      activeIterators: this.activeIterators.size,
    }
  }

  /**
   * Destroy handler and cleanup resources
   */
  destroy(): void {
    // Cleanup all active iterators
    for (const [key, iterator] of this.activeIterators.entries()) {
      if (iterator && typeof iterator.return === 'function') {
        try {
          iterator.return()
        } catch (error) {
          logger.warn(`Error cleaning up iterator ${key}:`, error)
        }
      }
    }

    this.activeIterators.clear()
    this.subscriptions.clear()
    this.connectionWorkspaces.clear()

    logger.info('MonitoringWebSocketHandler destroyed and resources cleaned up')
  }
}
