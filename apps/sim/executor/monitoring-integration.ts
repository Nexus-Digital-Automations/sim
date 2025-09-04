/**
 * Enhanced Executor Monitoring Integration - Event-driven workflow monitoring
 *
 * Provides comprehensive monitoring integration for the Sim workflow executor:
 * - Real-time event collection during workflow execution
 * - Performance metrics tracking and anomaly detection
 * - Distributed tracing with OpenTelemetry integration
 * - Business metrics collection and cost tracking
 * - Intelligent error classification and context enhancement
 * - Resource utilization monitoring and optimization insights
 *
 * @created 2025-09-03
 * @author Sim Monitoring System
 */

import { createLogger } from '@/lib/logs/console/logger'
import { monitoringSystem } from '@/lib/monitoring'
import { mlAnomalyDetector } from '@/lib/monitoring/analytics/anomaly-detector'
import {
  type BusinessEventContext,
  enhancedEventCollector,
  type MonitoringEvent,
  type PerformanceEventData,
} from '@/lib/monitoring/core/event-collector'
import { generateId } from '@/lib/utils'
import type { SerializedBlock } from '@/serializer/types'
import type { BlockLog } from './types'

const logger = createLogger('ExecutorMonitoring')

export interface ExecutionMonitoringContext {
  // Tracing context
  traceId: string
  rootSpanId: string
  currentSpanId: string
  parentSpanId?: string

  // Execution context
  workflowId: string
  workflowName?: string
  executionId: string
  userId: string
  workspaceId: string

  // Performance tracking
  startTime: number
  blockStartTimes: Map<string, number>
  resourceBaseline: ResourceSnapshot

  // Business context
  businessCategory?: BusinessEventContext['category']
  priority?: BusinessEventContext['priority']
  department?: string

  // Monitoring configuration
  enableAnomalyDetection: boolean
  enablePerformanceTracking: boolean
  enableBusinessMetrics: boolean
  collectDetailedResourceMetrics: boolean
}

export interface ResourceSnapshot {
  timestamp: number
  cpu: number
  memory: number
  networkBytes: number
  storageIO: number
}

export interface BlockExecutionResult {
  blockId: string
  success: boolean
  duration: number
  resourceUsage: ResourceSnapshot
  cost?: {
    tokens: number
    cost: number
    model?: string
    provider?: string
  }
  error?: {
    name: string
    message: string
    stack?: string
    classification: 'user_error' | 'system_error' | 'external_error' | 'timeout_error'
  }
}

/**
 * Enhanced Executor Monitoring Integration Class
 *
 * Provides comprehensive monitoring capabilities that integrate seamlessly with
 * the existing Sim workflow executor. Collects detailed performance metrics,
 * detects anomalies, and provides business intelligence insights.
 */
export class ExecutorMonitoringIntegration {
  private monitoringContexts = new Map<string, ExecutionMonitoringContext>()
  private resourceMonitor: ResourceMonitor

  constructor() {
    this.resourceMonitor = new ResourceMonitor()
    logger.info('Executor monitoring integration initialized')
  }

  /**
   * Initialize monitoring for a workflow execution
   */
  async initializeWorkflowMonitoring(
    workflowId: string,
    workflowName: string | undefined,
    executionId: string,
    userId: string,
    workspaceId: string,
    options: {
      enableAnomalyDetection?: boolean
      enablePerformanceTracking?: boolean
      enableBusinessMetrics?: boolean
      collectDetailedResourceMetrics?: boolean
      businessCategory?: BusinessEventContext['category']
      priority?: BusinessEventContext['priority']
      department?: string
    } = {}
  ): Promise<ExecutionMonitoringContext> {
    const operationId = generateId()
    const traceId = generateId()
    const rootSpanId = generateId()

    logger.info(`[${operationId}] Initializing workflow monitoring`, {
      workflowId,
      executionId,
      traceId,
    })

    try {
      // Take resource baseline
      const resourceBaseline = await this.resourceMonitor.takeSnapshot()

      const monitoringContext: ExecutionMonitoringContext = {
        traceId,
        rootSpanId,
        currentSpanId: rootSpanId,
        workflowId,
        workflowName,
        executionId,
        userId,
        workspaceId,
        startTime: Date.now(),
        blockStartTimes: new Map(),
        resourceBaseline,
        enableAnomalyDetection: options.enableAnomalyDetection ?? true,
        enablePerformanceTracking: options.enablePerformanceTracking ?? true,
        enableBusinessMetrics: options.enableBusinessMetrics ?? true,
        collectDetailedResourceMetrics: options.collectDetailedResourceMetrics ?? false,
        businessCategory: options.businessCategory || 'automation',
        priority: options.priority || 'medium',
        department: options.department,
      }

      this.monitoringContexts.set(executionId, monitoringContext)

      // Collect workflow start event
      await enhancedEventCollector.collectWorkflowEvent(
        'workflow_started',
        {
          workflowId,
          workflowName,
          executionId,
          userId,
          workspaceId,
          traceId,
          spanId: rootSpanId,
        },
        {
          status: 'success',
          metadata: {
            monitoringEnabled: true,
            anomalyDetection: monitoringContext.enableAnomalyDetection,
            performanceTracking: monitoringContext.enablePerformanceTracking,
            businessMetrics: monitoringContext.enableBusinessMetrics,
          },
        },
        undefined,
        {
          category: monitoringContext.businessCategory!,
          priority: monitoringContext.priority!,
          department: monitoringContext.department,
          businessValue: {
            automatedTasks: 1,
          },
        }
      )

      // Initialize monitoring system tracking
      await monitoringSystem.startExecutionMonitoring({
        executionId,
        workflowId,
        workflowName: workflowName || 'Unnamed Workflow',
        userId,
        workspaceId,
        trigger: 'manual', // This would be determined by the actual trigger
      })

      logger.info(`[${operationId}] Workflow monitoring initialized`, {
        executionId,
        traceId,
        enabledFeatures: {
          anomalyDetection: monitoringContext.enableAnomalyDetection,
          performanceTracking: monitoringContext.enablePerformanceTracking,
          businessMetrics: monitoringContext.enableBusinessMetrics,
        },
      })

      return monitoringContext
    } catch (error) {
      logger.error(`[${operationId}] Failed to initialize workflow monitoring`, {
        workflowId,
        executionId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Track block execution start
   */
  async trackBlockStart(
    executionId: string,
    block: SerializedBlock,
    inputData: any
  ): Promise<string> {
    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) {
      logger.warn('Monitoring context not found for execution', { executionId })
      return generateId()
    }

    const operationId = generateId()
    const blockSpanId = generateId()
    const startTime = Date.now()

    logger.debug(`[${operationId}] Tracking block start`, {
      blockId: block.id,
      blockType: block.type,
      executionId,
    })

    try {
      // Record block start time
      monitoringContext.blockStartTimes.set(block.id, startTime)

      // Update current span context
      const previousSpanId = monitoringContext.currentSpanId
      monitoringContext.currentSpanId = blockSpanId

      // Take resource snapshot if detailed monitoring is enabled
      let resourceSnapshot: ResourceSnapshot | undefined
      if (monitoringContext.collectDetailedResourceMetrics) {
        resourceSnapshot = await this.resourceMonitor.takeSnapshot()
      }

      // Collect block start event
      await enhancedEventCollector.collectBlockEvent(
        'block_started',
        {
          workflowId: monitoringContext.workflowId,
          workflowName: monitoringContext.workflowName,
          blockId: block.id,
          blockType: block.type,
          blockName: block.name,
          executionId,
          userId: monitoringContext.userId,
          workspaceId: monitoringContext.workspaceId,
          traceId: monitoringContext.traceId,
          spanId: blockSpanId,
          parentSpanId: previousSpanId,
        },
        {
          status: 'success',
          inputSize: this.calculateDataSize(inputData),
          metadata: {
            blockConfiguration: this.sanitizeBlockConfig(block),
            resourceSnapshot,
          },
        }
      )

      return blockSpanId
    } catch (error) {
      logger.error(`[${operationId}] Failed to track block start`, {
        blockId: block.id,
        executionId,
        error: error instanceof Error ? error.message : String(error),
      })
      return generateId()
    }
  }

  /**
   * Track block execution completion
   */
  async trackBlockCompletion(
    executionId: string,
    blockId: string,
    blockType: string,
    blockName: string | undefined,
    blockLog: BlockLog,
    spanId: string
  ): Promise<void> {
    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) {
      logger.warn('Monitoring context not found for execution', { executionId })
      return
    }

    const operationId = generateId()
    const endTime = Date.now()
    const startTime = monitoringContext.blockStartTimes.get(blockId) || endTime

    logger.debug(`[${operationId}] Tracking block completion`, {
      blockId,
      blockType,
      executionId,
      duration: endTime - startTime,
    })

    try {
      // Calculate execution metrics
      const duration = endTime - startTime
      const success = !blockLog.error

      // Take final resource snapshot
      const finalResourceSnapshot = monitoringContext.collectDetailedResourceMetrics
        ? await this.resourceMonitor.takeSnapshot()
        : undefined

      // Calculate resource usage difference
      const resourceUsage =
        finalResourceSnapshot && monitoringContext.resourceBaseline
          ? this.calculateResourceDelta(monitoringContext.resourceBaseline, finalResourceSnapshot)
          : {
              cpu: 0,
              memory: 0,
              network: 0,
              storage: 0,
            }

      // Extract cost information from block log
      const cost =
        blockLog.output?.cost || blockLog.output?.tokens
          ? {
              tokens: blockLog.output.tokens || 0,
              cost: blockLog.output.cost || 0,
              model: blockLog.output.model,
              provider: blockLog.output.provider,
            }
          : undefined

      // Create performance data
      const performanceData: PerformanceEventData = {
        executionTime: duration,
        queueTime: 0, // Would need to track this separately
        resourceUtilization: {
          ...resourceUsage,
          storage: 0, // Default storage usage
        },
        throughput: duration > 0 ? 1000 / duration : 0, // operations per second
        latency: duration,
        customMetrics: {
          inputSize: this.calculateDataSize(blockLog.input),
          outputSize: this.calculateDataSize(blockLog.output),
        },
      }

      // Create event data
      const eventData = {
        status: success ? ('success' as const) : ('error' as const),
        duration,
        inputSize: performanceData.customMetrics?.inputSize,
        outputSize: performanceData.customMetrics?.outputSize,
        resourceUsage,
        cost,
        error: blockLog.error
          ? {
              name: blockLog.error.name || 'UnknownError',
              message: blockLog.error.message || 'Unknown error occurred',
              stack: blockLog.error.stack,
              classification: this.classifyError(blockLog.error) as any,
            }
          : undefined,
        metadata: {
          executionSequence: Array.from(monitoringContext.blockStartTimes.keys()).indexOf(blockId),
          totalBlocks: monitoringContext.blockStartTimes.size,
        },
      }

      // Collect block completion event
      await enhancedEventCollector.collectBlockEvent(
        success ? 'block_completed' : 'block_failed',
        {
          workflowId: monitoringContext.workflowId,
          workflowName: monitoringContext.workflowName,
          blockId,
          blockType,
          blockName,
          executionId,
          userId: monitoringContext.userId,
          workspaceId: monitoringContext.workspaceId,
          traceId: monitoringContext.traceId,
          spanId,
          parentSpanId: monitoringContext.rootSpanId,
        },
        eventData,
        performanceData
      )

      // Run anomaly detection if enabled
      if (monitoringContext.enableAnomalyDetection && success) {
        await this.runAnomalyDetection(
          monitoringContext,
          blockId,
          blockType,
          performanceData,
          operationId
        )
      }

      // Update monitoring system with performance metrics
      await monitoringSystem.updateExecution(
        executionId,
        {
          workflowId: monitoringContext.workflowId,
          currentBlock: {
            blockId,
            blockName: blockName || blockId,
            blockType,
            startedAt: new Date(startTime).toISOString(),
          },
        },
        {
          executionId,
          workflowId: monitoringContext.workflowId,
          blockId,
          metrics: performanceData,
        }
      )

      // Clean up block start time
      monitoringContext.blockStartTimes.delete(blockId)

      logger.debug(`[${operationId}] Block completion tracked`, {
        blockId,
        success,
        duration,
        cost: cost?.cost || 0,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to track block completion`, {
        blockId,
        executionId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Track workflow execution completion
   */
  async trackWorkflowCompletion(
    executionId: string,
    success: boolean,
    finalOutput: any,
    error?: any
  ): Promise<void> {
    const monitoringContext = this.monitoringContexts.get(executionId)
    if (!monitoringContext) {
      logger.warn('Monitoring context not found for execution', { executionId })
      return
    }

    const operationId = generateId()
    const endTime = Date.now()
    const totalDuration = endTime - monitoringContext.startTime

    logger.info(`[${operationId}] Tracking workflow completion`, {
      executionId,
      success,
      totalDuration,
      workflowId: monitoringContext.workflowId,
    })

    try {
      // Calculate final resource usage
      const finalResourceSnapshot = await this.resourceMonitor.takeSnapshot()
      const totalResourceUsage = this.calculateResourceDelta(
        monitoringContext.resourceBaseline,
        finalResourceSnapshot
      )

      // Calculate business metrics
      const businessMetrics = success
        ? {
            automatedTasks: 1,
            timesSaved: Math.max(300, totalDuration * 3), // Estimate 3x manual time
            processedItems: this.countProcessedItems(finalOutput),
          }
        : {}

      // Create event data
      const eventData = {
        status: success ? ('success' as const) : ('error' as const),
        duration: totalDuration,
        outputSize: this.calculateDataSize(finalOutput),
        resourceUsage: totalResourceUsage,
        error: error
          ? {
              name: error.name || 'WorkflowExecutionError',
              message: error.message || 'Workflow execution failed',
              stack: error.stack,
              classification: this.classifyError(error) as any,
            }
          : undefined,
        metadata: {
          blocksExecuted: monitoringContext.blockStartTimes.size,
          executionMode: 'normal',
          completedAt: new Date().toISOString(),
        },
      }

      // Collect workflow completion event
      await enhancedEventCollector.collectWorkflowEvent(
        success ? 'workflow_completed' : 'workflow_failed',
        {
          workflowId: monitoringContext.workflowId,
          workflowName: monitoringContext.workflowName,
          executionId,
          userId: monitoringContext.userId,
          workspaceId: monitoringContext.workspaceId,
          traceId: monitoringContext.traceId,
          spanId: monitoringContext.rootSpanId,
        },
        eventData,
        {
          executionTime: totalDuration,
          queueTime: 0,
          resourceUtilization: totalResourceUsage,
          throughput: totalDuration > 0 ? 1000 / totalDuration : 0,
          latency: totalDuration,
        },
        {
          category: monitoringContext.businessCategory!,
          priority: success ? monitoringContext.priority! : 'high',
          department: monitoringContext.department,
          businessValue: businessMetrics,
        }
      )

      // Complete monitoring system tracking
      await monitoringSystem.completeExecution(executionId, success, finalOutput)

      // Clean up monitoring context
      this.monitoringContexts.delete(executionId)

      logger.info(`[${operationId}] Workflow completion tracked`, {
        executionId,
        success,
        duration: totalDuration,
        blocksExecuted: monitoringContext.blockStartTimes.size,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to track workflow completion`, {
        executionId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    activeExecutions: number
    totalContexts: number
    resourceMonitor: any
  } {
    return {
      activeExecutions: this.monitoringContexts.size,
      totalContexts: this.monitoringContexts.size,
      resourceMonitor: this.resourceMonitor.getStats(),
    }
  }

  // Private helper methods

  private async runAnomalyDetection(
    context: ExecutionMonitoringContext,
    blockId: string,
    blockType: string,
    performanceData: PerformanceEventData,
    operationId: string
  ): Promise<void> {
    try {
      const mockEvent: MonitoringEvent = {
        eventId: generateId(),
        timestamp: new Date(),
        eventType: 'block_completed',
        traceId: context.traceId,
        spanId: generateId(),
        workflowId: context.workflowId,
        workflowName: context.workflowName,
        blockId,
        blockType,
        executionId: context.executionId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        data: { status: 'success' },
        metrics: performanceData,
      }

      const anomalies = await mlAnomalyDetector.analyzeEvent(mockEvent)

      if (anomalies.length > 0) {
        logger.info(`[${operationId}] Anomalies detected during block execution`, {
          blockId,
          anomalyCount: anomalies.length,
          severities: anomalies.map((a) => a.severity),
        })
      }
    } catch (error) {
      logger.error(`[${operationId}] Error running anomaly detection`, {
        blockId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private calculateDataSize(data: any): number {
    if (!data) return 0
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  private calculateResourceDelta(
    baseline: ResourceSnapshot,
    current: ResourceSnapshot
  ): {
    cpu: number
    memory: number
    network: number
    storage: number
  } {
    return {
      cpu: Math.max(0, current.cpu - baseline.cpu),
      memory: Math.max(0, current.memory - baseline.memory),
      network: Math.max(0, current.networkBytes - baseline.networkBytes),
      storage: Math.max(0, current.storageIO - baseline.storageIO),
    }
  }

  private classifyError(error: any): string {
    if (!error) return 'system_error'

    const message = error.message?.toLowerCase() || ''

    if (message.includes('timeout') || message.includes('time out')) {
      return 'timeout_error'
    }
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'external_error'
    }
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'user_error'
    }

    return 'system_error'
  }

  private sanitizeBlockConfig(block: SerializedBlock): any {
    // Remove sensitive data from block configuration for logging
    const { id, type, name } = block
    return { id, type, name, hasConfig: !!block.subblocks }
  }

  private countProcessedItems(output: any): number {
    // Estimate number of items processed based on output structure
    if (!output) return 0
    if (Array.isArray(output)) return output.length
    if (typeof output === 'object' && output.items && Array.isArray(output.items)) {
      return output.items.length
    }
    return 1
  }
}

/**
 * Resource Monitor Class
 *
 * Monitors system resource usage during workflow execution
 */
class ResourceMonitor {
  private stats = {
    snapshotsTaken: 0,
    averageCpu: 0,
    averageMemory: 0,
  }

  async takeSnapshot(): Promise<ResourceSnapshot> {
    const timestamp = Date.now()

    // Get CPU usage (simplified - would use actual system APIs in production)
    const cpu = this.getCpuUsage()

    // Get memory usage
    const memory = process.memoryUsage().heapUsed

    // Placeholder for network and storage metrics
    const networkBytes = 0 // Would track actual network usage
    const storageIO = 0 // Would track actual storage I/O

    this.stats.snapshotsTaken++
    this.stats.averageCpu = (this.stats.averageCpu + cpu) / 2
    this.stats.averageMemory = (this.stats.averageMemory + memory) / 2

    return {
      timestamp,
      cpu,
      memory,
      networkBytes,
      storageIO,
    }
  }

  getStats() {
    return { ...this.stats }
  }

  private getCpuUsage(): number {
    // Simplified CPU usage calculation
    // In production, this would use actual system monitoring APIs
    const usage = process.cpuUsage()
    return (usage.user + usage.system) / 1000000 // Convert to percentage-like value
  }
}

// Export singleton instance
export const executorMonitoringIntegration = new ExecutorMonitoringIntegration()

export default ExecutorMonitoringIntegration
