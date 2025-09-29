import { createLogger } from '@/lib/logs/console/logger'
import type { TraceSpan } from '@/lib/logs/types'
import type { BlockType } from '@/executor/consts'
import type { BlockHandler, ExecutionContext, ExecutionResult } from '@/executor/types'
import type { SerializedBlock } from '@/serializer/types'

const logger = createLogger('ExecutionEngine')

/**
 * Core execution engine responsible for running individual blocks
 * and managing execution state.
 */
export class ExecutionEngine {
  private isCancelled = false
  private currentExecution: Map<string, Promise<any>> = new Map()

  constructor(
    private readonly handlers: Map<BlockType, BlockHandler>,
    private readonly telemetryTracker?: (eventName: string, data: Record<string, any>) => void
  ) {}

  /**
   * Execute a single block with proper error handling and telemetry
   */
  async executeBlock(
    block: SerializedBlock,
    context: ExecutionContext,
    span?: TraceSpan
  ): Promise<ExecutionResult> {
    if (this.isCancelled) {
      throw new Error('Execution cancelled')
    }

    const startTime = Date.now()
    logger.info(`Executing block: ${block.id} (${block.type})`)

    try {
      // Track execution start
      this.telemetryTracker?.('block_execution_start', {
        blockId: block.id,
        blockType: block.type,
        workflowId: context.workflowId,
      })

      // Get appropriate handler
      const handler = this.handlers.get(block.type as BlockType)
      if (!handler) {
        throw new Error(`No handler found for block type: ${block.type}`)
      }

      // Store execution promise for cancellation
      const executionPromise = handler.execute(block, context, span)
      this.currentExecution.set(block.id, executionPromise)

      const result = await executionPromise

      // Remove from active executions
      this.currentExecution.delete(block.id)

      // Track successful execution
      this.telemetryTracker?.('block_execution_success', {
        blockId: block.id,
        blockType: block.type,
        duration: Date.now() - startTime,
        workflowId: context.workflowId,
      })

      logger.info(`Block executed successfully: ${block.id} in ${Date.now() - startTime}ms`)
      return result
    } catch (error) {
      this.currentExecution.delete(block.id)

      // Track execution failure
      this.telemetryTracker?.('block_execution_error', {
        blockId: block.id,
        blockType: block.type,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId: context.workflowId,
      })

      logger.error(`Block execution failed: ${block.id}`, error)
      throw error
    }
  }

  /**
   * Execute multiple blocks in parallel
   */
  async executeBlocksParallel(
    blocks: SerializedBlock[],
    context: ExecutionContext,
    span?: TraceSpan
  ): Promise<ExecutionResult[]> {
    logger.info(`Executing ${blocks.length} blocks in parallel`)

    const promises = blocks.map((block) => this.executeBlock(block, context, span))

    try {
      const results = await Promise.all(promises)
      logger.info(`Parallel execution completed for ${blocks.length} blocks`)
      return results
    } catch (error) {
      logger.error('Parallel block execution failed', error)
      throw error
    }
  }

  /**
   * Cancel all active executions
   */
  cancel(): void {
    logger.info('Cancelling execution engine')
    this.isCancelled = true

    // Cancel all active executions
    for (const [blockId, promise] of this.currentExecution) {
      // If the promise has a cancel method, call it
      if (promise && typeof (promise as any).cancel === 'function') {
        ;(promise as any).cancel()
      }
    }

    this.currentExecution.clear()
  }

  /**
   * Reset cancellation state
   */
  reset(): void {
    this.isCancelled = false
    this.currentExecution.clear()
  }

  /**
   * Check if execution is cancelled
   */
  get cancelled(): boolean {
    return this.isCancelled
  }

  /**
   * Get currently executing blocks
   */
  get activeExecutions(): string[] {
    return Array.from(this.currentExecution.keys())
  }
}
