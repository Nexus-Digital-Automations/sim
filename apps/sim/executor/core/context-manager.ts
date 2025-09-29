import { createLogger } from '@/lib/logs/console/logger'
import type { BlockOutput } from '@/blocks/types'
import type { ExecutionContext, StreamingExecution } from '@/executor/types'
import type { SerializedWorkflow } from '@/serializer/types'

const logger = createLogger('ContextManager')

/**
 * Manages execution context including state, variables, and workflow data
 */
export class ContextManager {
  private context: ExecutionContext
  private blockStates: Map<string, BlockOutput> = new Map()
  private workflowVariables: Map<string, any> = new Map()
  private environmentVariables: Map<string, string> = new Map()

  constructor(
    workflow: SerializedWorkflow,
    initialStates?: Record<string, BlockOutput>,
    envVars?: Record<string, string>,
    workflowInput?: any,
    workflowVars?: Record<string, any>,
    contextExtensions?: {
      stream?: boolean
      selectedOutputIds?: string[]
      edges?: Array<{ source: string; target: string }>
      onStream?: (streamingExecution: StreamingExecution) => Promise<void>
      executionId?: string
      workspaceId?: string
      userId?: string
      isChildExecution?: boolean
    }
  ) {
    // Initialize block states
    if (initialStates) {
      for (const [blockId, state] of Object.entries(initialStates)) {
        this.blockStates.set(blockId, state)
      }
    }

    // Initialize environment variables
    if (envVars) {
      for (const [key, value] of Object.entries(envVars)) {
        this.environmentVariables.set(key, value)
      }
    }

    // Initialize workflow variables
    if (workflowVars) {
      for (const [key, value] of Object.entries(workflowVars)) {
        this.workflowVariables.set(key, value)
      }
    }

    // Create execution context
    this.context = {
      workflow,
      blockStates: Object.fromEntries(this.blockStates),
      workflowInput: workflowInput || {},
      workflowVariables: Object.fromEntries(this.workflowVariables),
      environmentVariables: Object.fromEntries(this.environmentVariables),
      workflowId: workflow.id,
      executionId: contextExtensions?.executionId || this.generateExecutionId(),
      workspaceId: contextExtensions?.workspaceId,
      userId: contextExtensions?.userId,
      isChildExecution: contextExtensions?.isChildExecution || false,
      stream: contextExtensions?.stream || false,
      selectedOutputIds: contextExtensions?.selectedOutputIds || [],
      edges: contextExtensions?.edges || [],
      onStream: contextExtensions?.onStream,
      executionStartTime: Date.now(),
    }

    logger.info(`Context initialized for workflow: ${workflow.id}`)
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Get current execution context
   */
  getContext(): ExecutionContext {
    // Always return fresh context with current state
    return {
      ...this.context,
      blockStates: Object.fromEntries(this.blockStates),
      workflowVariables: Object.fromEntries(this.workflowVariables),
      environmentVariables: Object.fromEntries(this.environmentVariables),
    }
  }

  /**
   * Update block state
   */
  updateBlockState(blockId: string, state: BlockOutput): void {
    this.blockStates.set(blockId, state)
    logger.debug(`Updated state for block: ${blockId}`)
  }

  /**
   * Get block state
   */
  getBlockState(blockId: string): BlockOutput | undefined {
    return this.blockStates.get(blockId)
  }

  /**
   * Get all block states
   */
  getAllBlockStates(): Record<string, BlockOutput> {
    return Object.fromEntries(this.blockStates)
  }

  /**
   * Set workflow variable
   */
  setWorkflowVariable(key: string, value: any): void {
    this.workflowVariables.set(key, value)
    logger.debug(`Set workflow variable: ${key}`)
  }

  /**
   * Get workflow variable
   */
  getWorkflowVariable(key: string): any {
    return this.workflowVariables.get(key)
  }

  /**
   * Get all workflow variables
   */
  getAllWorkflowVariables(): Record<string, any> {
    return Object.fromEntries(this.workflowVariables)
  }

  /**
   * Set environment variable
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.environmentVariables.set(key, value)
    logger.debug(`Set environment variable: ${key}`)
  }

  /**
   * Get environment variable
   */
  getEnvironmentVariable(key: string): string | undefined {
    return this.environmentVariables.get(key)
  }

  /**
   * Get all environment variables
   */
  getAllEnvironmentVariables(): Record<string, string> {
    return Object.fromEntries(this.environmentVariables)
  }

  /**
   * Update workflow input
   */
  updateWorkflowInput(input: any): void {
    this.context.workflowInput = { ...this.context.workflowInput, ...input }
    logger.debug('Updated workflow input')
  }

  /**
   * Get workflow input
   */
  getWorkflowInput(): any {
    return this.context.workflowInput
  }

  /**
   * Update context extensions
   */
  updateContextExtensions(extensions: Partial<ExecutionContext>): void {
    this.context = { ...this.context, ...extensions }
    logger.debug('Updated context extensions')
  }

  /**
   * Clone context for child execution
   */
  cloneForChildExecution(childWorkflow: SerializedWorkflow): ContextManager {
    const childContext = new ContextManager(
      childWorkflow,
      this.getAllBlockStates(),
      this.getAllEnvironmentVariables(),
      this.getWorkflowInput(),
      this.getAllWorkflowVariables(),
      {
        ...this.context,
        isChildExecution: true,
        executionId: this.generateExecutionId(),
      }
    )

    logger.info(`Created child context for workflow: ${childWorkflow.id}`)
    return childContext
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    executionId: string
    workflowId: string
    duration: number
    blockStatesCount: number
    variablesCount: number
    environmentVariablesCount: number
  } {
    return {
      executionId: this.context.executionId,
      workflowId: this.context.workflowId,
      duration: Date.now() - this.context.executionStartTime,
      blockStatesCount: this.blockStates.size,
      variablesCount: this.workflowVariables.size,
      environmentVariablesCount: this.environmentVariables.size,
    }
  }

  /**
   * Reset context state
   */
  reset(): void {
    this.blockStates.clear()
    this.workflowVariables.clear()
    this.context.blockStates = {}
    this.context.workflowVariables = {}
    this.context.executionStartTime = Date.now()
    logger.info('Context reset')
  }
}
