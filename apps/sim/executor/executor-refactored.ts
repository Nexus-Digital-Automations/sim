import { BlockPathCalculator } from '@/lib/block-path-calculator'
import { createLogger } from '@/lib/logs/console/logger'
import type { TraceSpan } from '@/lib/logs/types'
import type { BlockOutput } from '@/blocks/types'
import { LoopManager } from '@/executor/loops/loops'
import { ParallelManager } from '@/executor/parallels/parallels'
import { PathTracker } from '@/executor/path/path'
import { InputResolver } from '@/executor/resolver/resolver'
import type {
  BlockLog,
  ExecutionResult,
  NormalizedBlockOutput,
  StreamingExecution,
} from '@/executor/types'
import type { SerializedBlock, SerializedWorkflow } from '@/serializer/types'
import { ContextManager } from './core/context-manager'
// Import modular components
import { ExecutionEngine } from './core/execution-engine'
import { HandlerRegistry } from './core/handler-registry'

const logger = createLogger('ExecutorRefactored')

declare global {
  interface Window {
    __SIM_TELEMETRY_ENABLED?: boolean
    __SIM_TRACK_EVENT?: (eventName: string, properties?: Record<string, any>) => void
  }
}

/**
 * Tracks telemetry events for workflow execution if telemetry is enabled
 */
function trackWorkflowTelemetry(eventName: string, data: Record<string, any>) {
  if (window?.__SIM_TRACK_EVENT) {
    const safeData = {
      ...data,
      timestamp: Date.now(),
    }

    window.__SIM_TRACK_EVENT(eventName, {
      category: 'workflow',
      ...safeData,
    })
  }
}

interface ExecutorConfig {
  workflowParam:
    | SerializedWorkflow
    | {
        workflow: SerializedWorkflow
        currentBlockStates?: Record<string, BlockOutput>
        envVarValues?: Record<string, string>
        workflowInput?: any
        workflowVariables?: Record<string, any>
        contextExtensions?: {
          stream?: boolean
          selectedOutputIds?: string[]
          edges?: Array<{ source: string; target: string }>
          onStream?: (streamingExecution: StreamingExecution) => Promise<void>
          executionId?: string
          workspaceId?: string
          userId?: string
        }
      }
  isChildExecution?: boolean
}

/**
 * Refactored executor with modular architecture for better maintainability
 * and production build optimization.
 */
export class ExecutorRefactored {
  // Core modular components
  private readonly handlerRegistry: HandlerRegistry
  private readonly executionEngine: ExecutionEngine
  private readonly contextManager: ContextManager
  private readonly isChildExecution: boolean
  private readonly actualWorkflow: SerializedWorkflow

  constructor({ workflowParam, isChildExecution = false }: ExecutorConfig) {
    // Extract workflow and parameters
    const {
      workflow,
      currentBlockStates,
      envVarValues,
      workflowInput,
      workflowVariables,
      contextExtensions,
    } = this.extractWorkflowParams(workflowParam)

    this.actualWorkflow = workflow
    this.isChildExecution = isChildExecution

    // Initialize modular components
    this.handlerRegistry = new HandlerRegistry()
    this.handlerRegistry.initialize()

    this.executionEngine = new ExecutionEngine(
      this.handlerRegistry.getAllHandlers(),
      trackWorkflowTelemetry
    )

    this.contextManager = new ContextManager(
      workflow,
      currentBlockStates,
      envVarValues,
      workflowInput,
      workflowVariables,
      { ...contextExtensions, isChildExecution }
    )

    // Initialize existing components (for compatibility)
    this.resolver = new InputResolver()
    this.loopManager = new LoopManager()
    this.parallelManager = new ParallelManager()
    this.pathTracker = new PathTracker()

    logger.info(`Executor initialized for workflow: ${workflow.id}`)
  }

  /**
   * Extract workflow parameters from input
   */
  private extractWorkflowParams(workflowParam: ExecutorConfig['workflowParam']) {
    if ('workflow' in workflowParam) {
      return workflowParam
    }
    return {
      workflow: workflowParam,
      currentBlockStates: undefined,
      envVarValues: undefined,
      workflowInput: undefined,
      workflowVariables: undefined,
      contextExtensions: undefined,
    }
  }

  /**
   * Execute the workflow with improved error handling and performance monitoring
   */
  async execute(
    input?: any,
    span?: TraceSpan
  ): Promise<{
    logs: BlockLog[]
    output: NormalizedBlockOutput
    executionResult: ExecutionResult
  }> {
    const startTime = Date.now()
    const context = this.contextManager.getContext()

    logger.info(`Starting execution for workflow: ${this.actualWorkflow.id}`)

    // Track workflow execution start
    trackWorkflowTelemetry('workflow_execution_start', {
      workflowId: this.actualWorkflow.id,
      executionId: context.executionId,
      isChildExecution: this.isChildExecution,
    })

    try {
      // Update workflow input if provided
      if (input) {
        this.contextManager.updateWorkflowInput(input)
      }

      // Calculate execution order
      const executionOrder = this.calculateExecutionOrder()

      // Execute blocks in topological order
      const logs: BlockLog[] = []
      let finalOutput: NormalizedBlockOutput = { data: null, metadata: {} }

      for (const block of executionOrder) {
        try {
          const result = await this.executionEngine.executeBlock(
            block,
            this.contextManager.getContext(),
            span
          )

          // Update context with result
          if (result.output) {
            this.contextManager.updateBlockState(block.id, result.output)
          }

          // Collect logs
          if (result.logs) {
            logs.push(...result.logs)
          }

          // Update final output if this is the last block
          if (this.isOutputBlock(block)) {
            finalOutput = result.normalizedOutput || finalOutput
          }
        } catch (error) {
          logger.error(`Block execution failed: ${block.id}`, error)

          // Add error log
          logs.push({
            id: `${block.id}_error`,
            blockId: block.id,
            level: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          })

          // Decide whether to continue or stop based on error handling strategy
          if (this.shouldStopOnError(block, error)) {
            throw error
          }
        }
      }

      const executionResult: ExecutionResult = {
        success: true,
        output: finalOutput.data,
        metadata: finalOutput.metadata,
        logs,
        executionTime: Date.now() - startTime,
      }

      // Track successful execution
      trackWorkflowTelemetry('workflow_execution_success', {
        workflowId: this.actualWorkflow.id,
        executionId: context.executionId,
        duration: Date.now() - startTime,
        blocksExecuted: executionOrder.length,
      })

      logger.info(
        `Workflow executed successfully: ${this.actualWorkflow.id} in ${Date.now() - startTime}ms`
      )

      return {
        logs,
        output: finalOutput,
        executionResult,
      }
    } catch (error) {
      // Track execution failure
      trackWorkflowTelemetry('workflow_execution_error', {
        workflowId: this.actualWorkflow.id,
        executionId: context.executionId,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      logger.error(`Workflow execution failed: ${this.actualWorkflow.id}`, error)
      throw error
    }
  }

  /**
   * Calculate execution order for blocks
   */
  private calculateExecutionOrder(): SerializedBlock[] {
    // Use existing path calculator or implement topological sort
    const calculator = new BlockPathCalculator()
    return calculator.calculateExecutionOrder(this.actualWorkflow.blocks)
  }

  /**
   * Check if block is an output block
   */
  private isOutputBlock(block: SerializedBlock): boolean {
    // Implement logic to determine if this is an output block
    return block.type === 'response' || block.type === 'output'
  }

  /**
   * Determine if execution should stop on error
   */
  private shouldStopOnError(block: SerializedBlock, error: any): boolean {
    // Implement error handling strategy
    // For now, stop on any error
    return true
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    logger.info('Cancelling executor')
    this.executionEngine.cancel()
  }

  /**
   * Get execution statistics
   */
  getExecutionStats() {
    return {
      ...this.contextManager.getExecutionStats(),
      handlerStats: this.handlerRegistry.getStats(),
      activeExecutions: this.executionEngine.activeExecutions,
    }
  }

  /**
   * Reset executor state
   */
  reset(): void {
    this.executionEngine.reset()
    this.contextManager.reset()
    logger.info('Executor reset')
  }
}
