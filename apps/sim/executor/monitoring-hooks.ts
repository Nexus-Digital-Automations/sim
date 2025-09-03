/**
 * Monitoring Integration Hooks for Workflow Executor
 * Provides seamless integration between the executor and monitoring system
 */

import { performance } from 'perf_hooks'
import { createLogger } from '@/lib/logs/console/logger'
import { monitoringSystem, executionMonitor, performanceCollector } from '@/lib/monitoring'
import type { ExecutionContext, BlockLog } from '@/executor/types'
import type { SerializedBlock, SerializedWorkflow } from '@/serializer/types'
import type { LiveExecutionStatus, PerformanceMetrics } from '@/lib/monitoring/types'

const logger = createLogger('MonitoringHooks')

export interface ExecutionMonitoringContext {
  executionId: string
  workflowId: string
  workflowName: string
  workspaceId: string
  userId: string
  trigger: 'manual' | 'schedule' | 'webhook' | 'api' | 'system'
  totalBlocks?: number
  startTime: number
  blockStartTimes: Map<string, number>
  metrics: Map<string, any>
}

/**
 * Monitoring Hooks for Workflow Executor
 * Integrates monitoring capabilities into the execution flow
 */
export class ExecutorMonitoringHooks {
  private monitoringContexts = new Map<string, ExecutionMonitoringContext>()
  private readonly METRICS_COLLECTION_ENABLED = true
  private readonly REAL_TIME_MONITORING_ENABLED = true

  constructor() {
    // Initialize monitoring system if not already initialized
    if (!monitoringSystem) {
      logger.warn('MonitoringSystem not available - monitoring hooks disabled')
      return
    }

    logger.info('ExecutorMonitoringHooks initialized')
  }

  /**
   * Hook called when workflow execution starts
   */
  async onExecutionStart(
    executionId: string,
    workflow: SerializedWorkflow,
    context: {
      workspaceId: string
      userId: string
      trigger?: string
      input?: any
    }
  ): Promise<void> {
    if (!this.REAL_TIME_MONITORING_ENABLED) return

    const operationId = `start-monitoring-${executionId}`
    logger.debug(`[${operationId}] Starting execution monitoring`)

    try {
      const startTime = performance.now()
      const totalBlocks = Object.keys(workflow.blocks || {}).length

      // Create monitoring context
      const monitoringContext: ExecutionMonitoringContext = {
        executionId,
        workflowId: workflow.id || 'unknown',
        workflowName: workflow.name || 'Unnamed Workflow',
        workspaceId: context.workspaceId,
        userId: context.userId,
        trigger: (context.trigger as any) || 'manual',
        totalBlocks,
        startTime,
        blockStartTimes: new Map(),
        metrics: new Map(),
      }

      this.monitoringContexts.set(executionId, monitoringContext)

      // Start monitoring through the monitoring system
      await monitoringSystem.startExecutionMonitoring({
        executionId,
        workflowId: monitoringContext.workflowId,
        workflowName: monitoringContext.workflowName,
        trigger: monitoringContext.trigger,
        userId: monitoringContext.userId,
        workspaceId: monitoringContext.workspaceId,
      })

      // Track execution metrics
      if (this.METRICS_COLLECTION_ENABLED) {
        await this.trackExecutionStart(monitoringContext)
      }

      logger.info(`[${operationId}] Execution monitoring started for ${executionId}`)

    } catch (error) {
      logger.error(`[${operationId}] Failed to start execution monitoring:`, error)
      // Don't throw - monitoring failures shouldn't break execution
    }
  }

  /**
   * Hook called when a block execution starts
   */
  async onBlockStart(
    executionId: string,
    block: SerializedBlock,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.REAL_TIME_MONITORING_ENABLED) return

    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) return

    const operationId = `block-start-${executionId}-${block.id}`
    logger.debug(`[${operationId}] Block execution started`)

    try {
      const blockStartTime = performance.now()
      monitoringContext.blockStartTimes.set(block.id, blockStartTime)

      // Calculate progress
      const completedBlocks = monitoringContext.blockStartTimes.size - 1 // Exclude current block
      const progress = monitoringContext.totalBlocks ? 
        Math.round((completedBlocks / monitoringContext.totalBlocks) * 100) : 
        0

      // Update execution status with current block
      await executionMonitor.updateExecutionStatus(executionId, {
        status: 'running',
        progress: Math.min(progress, 95), // Cap at 95% until completion
        currentBlock: {
          blockId: block.id,
          blockName: block.name || `${block.type} Block`,
          blockType: block.type,
          startedAt: new Date().toISOString(),
        },
        completedBlocks,
      })

      logger.debug(`[${operationId}] Block monitoring updated`, {
        blockId: block.id,
        blockType: block.type,
        progress,
      })

    } catch (error) {
      logger.error(`[${operationId}] Failed to update block monitoring:`, error)
    }
  }

  /**
   * Hook called when a block execution completes
   */
  async onBlockComplete(
    executionId: string,
    block: SerializedBlock,
    result: any,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.REAL_TIME_MONITORING_ENABLED && !this.METRICS_COLLECTION_ENABLED) return

    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) return

    const operationId = `block-complete-${executionId}-${block.id}`
    logger.debug(`[${operationId}] Block execution completed`)

    try {
      const blockStartTime = monitoringContext.blockStartTimes.get(block.id)
      if (!blockStartTime) return

      const executionTime = performance.now() - blockStartTime
      const currentTime = new Date().toISOString()

      // Collect performance metrics
      if (this.METRICS_COLLECTION_ENABLED) {
        const resourceUsage = await this.collectResourceUsage()
        
        const metrics: Partial<PerformanceMetrics> = {
          executionId,
          workflowId: monitoringContext.workflowId,
          blockId: block.id,
          metrics: {
            executionTime,
            resourceUsage,
            throughput: this.calculateThroughput(result),
            errorRate: 0, // Success case
          },
          timestamp: currentTime,
        }

        await performanceCollector.collectMetrics(executionId, block.id, metrics)
      }

      // Update monitoring context
      monitoringContext.metrics.set(block.id, {
        executionTime,
        success: true,
        timestamp: currentTime,
      })

      logger.debug(`[${operationId}] Block metrics collected`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        blockType: block.type,
      })

    } catch (error) {
      logger.error(`[${operationId}] Failed to collect block metrics:`, error)
    }
  }

  /**
   * Hook called when a block execution fails
   */
  async onBlockError(
    executionId: string,
    block: SerializedBlock,
    error: Error,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.REAL_TIME_MONITORING_ENABLED && !this.METRICS_COLLECTION_ENABLED) return

    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) return

    const operationId = `block-error-${executionId}-${block.id}`
    logger.debug(`[${operationId}] Block execution failed`)

    try {
      const blockStartTime = monitoringContext.blockStartTimes.get(block.id)
      const executionTime = blockStartTime ? performance.now() - blockStartTime : 0
      const currentTime = new Date().toISOString()

      // Collect error metrics
      if (this.METRICS_COLLECTION_ENABLED) {
        const resourceUsage = await this.collectResourceUsage()
        
        const metrics: Partial<PerformanceMetrics> = {
          executionId,
          workflowId: monitoringContext.workflowId,
          blockId: block.id,
          metrics: {
            executionTime,
            resourceUsage,
            errorRate: 100, // Error case
          },
          timestamp: currentTime,
        }

        await performanceCollector.collectMetrics(executionId, block.id, metrics)
      }

      // Update execution status with error
      if (this.REAL_TIME_MONITORING_ENABLED) {
        await executionMonitor.updateExecutionStatus(executionId, {
          currentBlock: undefined, // Clear current block on error
        })
      }

      // Update monitoring context
      monitoringContext.metrics.set(block.id, {
        executionTime,
        success: false,
        error: error.message,
        timestamp: currentTime,
      })

      logger.debug(`[${operationId}] Block error metrics collected`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        error: error.message,
      })

    } catch (monitoringError) {
      logger.error(`[${operationId}] Failed to collect block error metrics:`, monitoringError)
    }
  }

  /**
   * Hook called when workflow execution completes
   */
  async onExecutionComplete(
    executionId: string,
    success: boolean,
    result?: any,
    error?: Error
  ): Promise<void> {
    if (!this.REAL_TIME_MONITORING_ENABLED && !this.METRICS_COLLECTION_ENABLED) return

    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) return

    const operationId = `complete-monitoring-${executionId}`
    logger.debug(`[${operationId}] Completing execution monitoring`)

    try {
      const totalExecutionTime = performance.now() - monitoringContext.startTime

      // Complete monitoring through the monitoring system
      await monitoringSystem.completeExecution(executionId, success, {
        result,
        error: error?.message,
        totalExecutionTime,
        finalMetrics: this.generateExecutionSummary(monitoringContext),
      })

      // Track execution completion
      if (this.METRICS_COLLECTION_ENABLED) {
        await this.trackExecutionComplete(monitoringContext, success, totalExecutionTime)
      }

      logger.info(`[${operationId}] Execution monitoring completed for ${executionId}`, {
        success,
        totalTime: `${totalExecutionTime.toFixed(2)}ms`,
        blocksExecuted: monitoringContext.blockStartTimes.size,
      })

    } catch (monitoringError) {
      logger.error(`[${operationId}] Failed to complete execution monitoring:`, monitoringError)
    } finally {
      // Cleanup monitoring context
      this.monitoringContexts.delete(executionId)
    }
  }

  /**
   * Track execution start metrics
   */
  private async trackExecutionStart(context: ExecutionMonitoringContext): Promise<void> {
    // This would integrate with analytics service to track execution starts
    logger.debug('Tracking execution start', {
      executionId: context.executionId,
      workflowId: context.workflowId,
      trigger: context.trigger,
    })
  }

  /**
   * Track execution completion metrics
   */
  private async trackExecutionComplete(
    context: ExecutionMonitoringContext,
    success: boolean,
    executionTime: number
  ): Promise<void> {
    // This would integrate with analytics service to track execution completions
    logger.debug('Tracking execution completion', {
      executionId: context.executionId,
      success,
      executionTime: `${executionTime.toFixed(2)}ms`,
    })
  }

  /**
   * Collect current resource usage
   */
  private async collectResourceUsage(): Promise<{
    cpu: number
    memory: number
    network: number
  }> {
    // In a real implementation, this would collect actual system metrics
    const memoryUsage = process.memoryUsage()
    
    return {
      cpu: 0, // Would need system-specific CPU monitoring
      memory: memoryUsage.heapUsed,
      network: 0, // Would need network monitoring
    }
  }

  /**
   * Calculate throughput based on block result
   */
  private calculateThroughput(result: any): number | undefined {
    // Attempt to calculate throughput based on result data
    if (result && typeof result === 'object') {
      if (Array.isArray(result)) {
        return result.length // Items processed
      }
      if (result.count && typeof result.count === 'number') {
        return result.count
      }
    }
    return undefined
  }

  /**
   * Generate execution summary from monitoring context
   */
  private generateExecutionSummary(context: ExecutionMonitoringContext): any {
    const blockMetrics = Array.from(context.metrics.entries()).map(([blockId, metrics]) => ({
      blockId,
      ...metrics,
    }))

    const successfulBlocks = blockMetrics.filter(m => m.success).length
    const totalExecutionTime = blockMetrics.reduce((sum, m) => sum + m.executionTime, 0)

    return {
      totalBlocks: context.totalBlocks,
      executedBlocks: blockMetrics.length,
      successfulBlocks,
      successRate: blockMetrics.length > 0 ? (successfulBlocks / blockMetrics.length) * 100 : 0,
      totalExecutionTime,
      averageBlockTime: blockMetrics.length > 0 ? totalExecutionTime / blockMetrics.length : 0,
      blockMetrics,
    }
  }

  /**
   * Get monitoring context for an execution
   */
  getMonitoringContext(executionId: string): ExecutionMonitoringContext | undefined {
    return this.monitoringContexts.get(executionId)
  }

  /**
   * Clean up stale monitoring contexts
   */
  cleanupStaleContexts(maxAgeMs: number = 3600000): void {
    const now = performance.now()
    const staleExecutions: string[] = []

    for (const [executionId, context] of this.monitoringContexts) {
      if (now - context.startTime > maxAgeMs) {
        staleExecutions.push(executionId)
      }
    }

    for (const executionId of staleExecutions) {
      this.monitoringContexts.delete(executionId)
      logger.debug(`Cleaned up stale monitoring context for ${executionId}`)
    }

    if (staleExecutions.length > 0) {
      logger.info(`Cleaned up ${staleExecutions.length} stale monitoring contexts`)
    }
  }
}

// Export singleton instance
export const executorMonitoringHooks = new ExecutorMonitoringHooks()

// Export integration helper
export function integrateMonitoringWithExecutor(executor: any): void {
  if (!executor || typeof executor !== 'object') {
    logger.warn('Invalid executor provided for monitoring integration')
    return
  }

  // Add monitoring hooks to executor if they support the lifecycle events
  if (typeof executor.addHook === 'function') {
    executor.addHook('execution:start', executorMonitoringHooks.onExecutionStart.bind(executorMonitoringHooks))
    executor.addHook('block:start', executorMonitoringHooks.onBlockStart.bind(executorMonitoringHooks))
    executor.addHook('block:complete', executorMonitoringHooks.onBlockComplete.bind(executorMonitoringHooks))
    executor.addHook('block:error', executorMonitoringHooks.onBlockError.bind(executorMonitoringHooks))
    executor.addHook('execution:complete', executorMonitoringHooks.onExecutionComplete.bind(executorMonitoringHooks))
    
    logger.info('Monitoring hooks integrated with executor')
  } else {
    logger.warn('Executor does not support hook system - manual integration required')
  }
}