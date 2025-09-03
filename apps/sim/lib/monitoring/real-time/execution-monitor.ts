/**
 * Live Execution Monitor Service
 * Provides real-time tracking and monitoring of workflow executions
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  ExecutionEvent,
  ExecutionUpdate,
  ILiveExecutionMonitor,
  LiveExecutionStatus,
} from '../types'

const logger = createLogger('ExecutionMonitor')

interface ExecutionSubscription {
  executionId: string
  callbacks: Set<(update: ExecutionUpdate) => void>
  lastUpdate?: ExecutionUpdate
}

interface WorkspaceSubscription {
  workspaceId: string
  callbacks: Set<(updates: ExecutionUpdate[]) => void>
  executionIds: Set<string>
}

export class ExecutionMonitor extends EventEmitter implements ILiveExecutionMonitor {
  private static instance: ExecutionMonitor
  private activeExecutions = new Map<string, LiveExecutionStatus>()
  private executionSubscriptions = new Map<string, ExecutionSubscription>()
  private workspaceSubscriptions = new Map<string, WorkspaceSubscription>()
  private cleanupInterval: NodeJS.Timeout
  private readonly CLEANUP_INTERVAL_MS = 60000 // 1 minute
  private readonly MAX_EXECUTION_AGE_MS = 3600000 // 1 hour

  private constructor() {
    super()
    this.setMaxListeners(0) // Remove limit for high-throughput scenarios

    // Start periodic cleanup of completed executions
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedExecutions()
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('ExecutionMonitor initialized with real-time tracking')
  }

  static getInstance(): ExecutionMonitor {
    if (!ExecutionMonitor.instance) {
      ExecutionMonitor.instance = new ExecutionMonitor()
    }
    return ExecutionMonitor.instance
  }

  /**
   * Subscribe to real-time updates for a specific workflow execution
   */
  async subscribeToWorkflowExecution(executionId: string): Promise<AsyncIterator<ExecutionUpdate>> {
    logger.debug(`Creating subscription for execution ${executionId}`)

    const updateQueue: ExecutionUpdate[] = []
    let resolveNext: ((result: IteratorResult<ExecutionUpdate>) => void) | null = null
    let isComplete = false

    // Create subscription callback
    const callback = (update: ExecutionUpdate) => {
      logger.debug(`Received update for execution ${executionId}:`, update.type)

      if (resolveNext) {
        resolveNext({ value: update, done: false })
        resolveNext = null
      } else {
        updateQueue.push(update)
      }

      // Mark as complete if execution finished
      if (update.type === 'execution_completed' || update.type === 'execution_failed') {
        isComplete = true
      }
    }

    // Add to subscriptions
    if (!this.executionSubscriptions.has(executionId)) {
      this.executionSubscriptions.set(executionId, {
        executionId,
        callbacks: new Set(),
      })
    }

    const subscription = this.executionSubscriptions.get(executionId)!
    subscription.callbacks.add(callback)

    // Send current status if available
    const currentStatus = this.activeExecutions.get(executionId)
    if (currentStatus) {
      const statusUpdate: ExecutionUpdate = {
        type: 'execution_started',
        executionId: currentStatus.executionId,
        workflowId: currentStatus.workflowId,
        timestamp: new Date().toISOString(),
        data: currentStatus,
      }
      callback(statusUpdate)
    }

    // Return async iterator
    return {
      async next(): Promise<IteratorResult<ExecutionUpdate>> {
        if (updateQueue.length > 0) {
          return { value: updateQueue.shift()!, done: false }
        }

        if (isComplete) {
          return { done: true, value: undefined }
        }

        return new Promise((resolve) => {
          resolveNext = resolve
        })
      },

      [Symbol.asyncIterator]() {
        return this
      },

      // Cleanup method
      return() {
        subscription.callbacks.delete(callback)
        if (subscription.callbacks.size === 0) {
          this.executionSubscriptions.delete(executionId)
        }
        logger.debug(`Unsubscribed from execution ${executionId}`)
        return Promise.resolve({ done: true, value: undefined })
      },
    }
  }

  /**
   * Subscribe to real-time updates for all executions in a workspace
   */
  async subscribeToWorkspaceExecutions(
    workspaceId: string
  ): Promise<AsyncIterator<ExecutionUpdate[]>> {
    logger.debug(`Creating workspace subscription for ${workspaceId}`)

    const updateQueue: ExecutionUpdate[][] = []
    let resolveNext: ((result: IteratorResult<ExecutionUpdate[]>) => void) | null = null
    const batchUpdates = new Map<string, ExecutionUpdate>()

    // Batch updates to prevent overwhelming the client
    const BATCH_INTERVAL_MS = 250
    let batchTimer: NodeJS.Timeout | null = null

    const flushBatch = () => {
      if (batchUpdates.size > 0) {
        const updates = Array.from(batchUpdates.values())
        batchUpdates.clear()

        if (resolveNext) {
          resolveNext({ value: updates, done: false })
          resolveNext = null
        } else {
          updateQueue.push(updates)
        }
      }
      batchTimer = null
    }

    const callback = (updates: ExecutionUpdate[]) => {
      logger.debug(`Received ${updates.length} workspace updates for ${workspaceId}`)

      // Add to batch (deduplicate by execution ID)
      updates.forEach((update) => {
        batchUpdates.set(update.executionId, update)
      })

      // Schedule batch flush
      if (!batchTimer) {
        batchTimer = setTimeout(flushBatch, BATCH_INTERVAL_MS)
      }
    }

    // Add to subscriptions
    if (!this.workspaceSubscriptions.has(workspaceId)) {
      this.workspaceSubscriptions.set(workspaceId, {
        workspaceId,
        callbacks: new Set(),
        executionIds: new Set(),
      })
    }

    const subscription = this.workspaceSubscriptions.get(workspaceId)!
    subscription.callbacks.add(callback)

    // Send current active executions
    const activeExecutions = Array.from(this.activeExecutions.values())
      .filter((execution) => execution.workspaceId === workspaceId)
      .map((execution) => ({
        type: 'execution_started' as const,
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        timestamp: new Date().toISOString(),
        data: execution,
      }))

    if (activeExecutions.length > 0) {
      callback(activeExecutions)
    }

    return {
      async next(): Promise<IteratorResult<ExecutionUpdate[]>> {
        if (updateQueue.length > 0) {
          return { value: updateQueue.shift()!, done: false }
        }

        return new Promise((resolve) => {
          resolveNext = resolve
        })
      },

      [Symbol.asyncIterator]() {
        return this
      },

      // Cleanup method
      return() {
        subscription.callbacks.delete(callback)
        if (subscription.callbacks.size === 0) {
          this.workspaceSubscriptions.delete(workspaceId)
        }
        if (batchTimer) {
          clearTimeout(batchTimer)
          flushBatch() // Flush any pending updates
        }
        logger.debug(`Unsubscribed from workspace ${workspaceId}`)
        return Promise.resolve({ done: true, value: undefined })
      },
    }
  }

  /**
   * Get currently active executions for a workspace
   */
  async getActiveExecutions(workspaceId: string): Promise<LiveExecutionStatus[]> {
    const executions = Array.from(this.activeExecutions.values())
      .filter((execution) => execution.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    logger.debug(`Retrieved ${executions.length} active executions for workspace ${workspaceId}`)
    return executions
  }

  /**
   * Update the status of a workflow execution
   */
  async updateExecutionStatus(
    executionId: string,
    status: Partial<LiveExecutionStatus>
  ): Promise<void> {
    const operationId = `update-${executionId}-${Date.now()}`
    logger.debug(`[${operationId}] Updating execution status`, {
      executionId,
      updates: Object.keys(status),
    })

    let currentExecution = this.activeExecutions.get(executionId)

    if (!currentExecution && status.workflowId) {
      // Create new execution tracking
      currentExecution = {
        executionId,
        workflowId: status.workflowId,
        workflowName: status.workflowName || 'Unknown Workflow',
        status: 'queued',
        progress: 0,
        startedAt: new Date().toISOString(),
        trigger: status.trigger || 'manual',
        userId: status.userId || 'unknown',
        workspaceId: status.workspaceId || 'unknown',
      }
      this.activeExecutions.set(executionId, currentExecution)
      logger.debug(`[${operationId}] Created new execution tracking for ${executionId}`)
    }

    if (currentExecution) {
      // Update execution status
      Object.assign(currentExecution, status)

      // Create update event
      const updateType = this.determineUpdateType(status, currentExecution.status)
      const update: ExecutionUpdate = {
        type: updateType,
        executionId,
        workflowId: currentExecution.workflowId,
        timestamp: new Date().toISOString(),
        data: status,
      }

      // Notify execution subscribers
      const executionSubscription = this.executionSubscriptions.get(executionId)
      if (executionSubscription) {
        executionSubscription.lastUpdate = update
        for (const callback of executionSubscription.callbacks) {
          try {
            callback(update)
          } catch (error) {
            logger.error(`[${operationId}] Error in execution subscription callback:`, error)
          }
        }
      }

      // Notify workspace subscribers
      const workspaceSubscription = this.workspaceSubscriptions.get(currentExecution.workspaceId)
      if (workspaceSubscription) {
        workspaceSubscription.executionIds.add(executionId)
        for (const callback of workspaceSubscription.callbacks) {
          try {
            callback([update])
          } catch (error) {
            logger.error(`[${operationId}] Error in workspace subscription callback:`, error)
          }
        }
      }

      // Emit monitoring event for other services
      const monitoringEvent: ExecutionEvent = {
        type: updateType,
        source: 'execution',
        timestamp: update.timestamp,
        executionId,
        workflowId: currentExecution.workflowId,
        data: update,
      }
      this.emit('execution_update', monitoringEvent)

      logger.debug(`[${operationId}] Execution status updated`, {
        executionId,
        status: currentExecution.status,
        progress: currentExecution.progress,
        subscribersNotified: {
          execution: executionSubscription?.callbacks.size || 0,
          workspace: workspaceSubscription?.callbacks.size || 0,
        },
      })

      // Remove from active executions if completed
      if (
        currentExecution.status === 'completed' ||
        currentExecution.status === 'failed' ||
        currentExecution.status === 'cancelled'
      ) {
        setTimeout(() => {
          this.activeExecutions.delete(executionId)
          logger.debug(`[${operationId}] Removed completed execution from active tracking`)
        }, 5000) // Keep for 5 seconds for final notifications
      }
    } else {
      logger.warn(`[${operationId}] Attempted to update unknown execution ${executionId}`)
    }
  }

  /**
   * Start tracking a new execution
   */
  async startExecution(
    execution: Omit<LiveExecutionStatus, 'status' | 'progress' | 'startedAt'>
  ): Promise<void> {
    const fullExecution: LiveExecutionStatus = {
      ...execution,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    }

    await this.updateExecutionStatus(execution.executionId, fullExecution)
  }

  /**
   * Complete an execution
   */
  async completeExecution(executionId: string, success: boolean, finalData?: any): Promise<void> {
    const execution = this.activeExecutions.get(executionId)
    if (execution) {
      await this.updateExecutionStatus(executionId, {
        status: success ? 'completed' : 'failed',
        progress: 100,
        ...finalData,
      })
    }
  }

  /**
   * Update execution progress
   */
  async updateProgress(
    executionId: string,
    progress: number,
    currentBlock?: LiveExecutionStatus['currentBlock']
  ): Promise<void> {
    await this.updateExecutionStatus(executionId, {
      progress: Math.min(100, Math.max(0, progress)),
      currentBlock,
    })
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    active: number
    byStatus: Record<LiveExecutionStatus['status'], number>
    byWorkspace: Record<string, number>
    subscriptions: {
      executions: number
      workspaces: number
    }
  } {
    const stats = {
      active: this.activeExecutions.size,
      byStatus: {} as Record<LiveExecutionStatus['status'], number>,
      byWorkspace: {} as Record<string, number>,
      subscriptions: {
        executions: this.executionSubscriptions.size,
        workspaces: this.workspaceSubscriptions.size,
      },
    }

    // Count by status
    for (const execution of this.activeExecutions.values()) {
      stats.byStatus[execution.status] = (stats.byStatus[execution.status] || 0) + 1
      stats.byWorkspace[execution.workspaceId] = (stats.byWorkspace[execution.workspaceId] || 0) + 1
    }

    return stats
  }

  /**
   * Cleanup completed executions and stale subscriptions
   */
  private cleanupCompletedExecutions(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [executionId, execution] of this.activeExecutions.entries()) {
      const executionAge = now - new Date(execution.startedAt).getTime()

      // Remove old completed/failed executions
      if (
        (execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled') &&
        executionAge > this.MAX_EXECUTION_AGE_MS
      ) {
        this.activeExecutions.delete(executionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old executions from active tracking`)
    }

    // Clean up empty subscriptions
    for (const [executionId, subscription] of this.executionSubscriptions.entries()) {
      if (subscription.callbacks.size === 0) {
        this.executionSubscriptions.delete(executionId)
      }
    }

    for (const [workspaceId, subscription] of this.workspaceSubscriptions.entries()) {
      if (subscription.callbacks.size === 0) {
        this.workspaceSubscriptions.delete(workspaceId)
      }
    }
  }

  /**
   * Determine the appropriate update type based on status changes
   */
  private determineUpdateType(
    statusUpdate: Partial<LiveExecutionStatus>,
    currentStatus: LiveExecutionStatus['status']
  ): ExecutionUpdate['type'] {
    if (statusUpdate.status) {
      switch (statusUpdate.status) {
        case 'running':
          return currentStatus === 'queued' ? 'execution_started' : 'execution_progress'
        case 'completed':
          return 'execution_completed'
        case 'failed':
        case 'cancelled':
          return 'execution_failed'
        default:
          return 'execution_progress'
      }
    }

    if (statusUpdate.currentBlock) {
      return statusUpdate.currentBlock ? 'block_started' : 'block_completed'
    }

    return 'execution_progress'
  }

  /**
   * Destroy the monitor and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.activeExecutions.clear()
    this.executionSubscriptions.clear()
    this.workspaceSubscriptions.clear()
    this.removeAllListeners()

    logger.info('ExecutionMonitor destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const executionMonitor = ExecutionMonitor.getInstance()
