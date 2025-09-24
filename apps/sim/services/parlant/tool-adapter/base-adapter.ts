/**
 * Base Tool Adapter Class
 *
 * Provides common functionality for all tool adapters including:
 * - Standardized execution patterns
 * - Error handling and logging
 * - Performance monitoring
 * - Context validation
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ToolAdapter,
  AdapterContext,
  AdapterResult,
  AdapterError,
  ParlantToolSchema,
  ValidationResult,
  ToolRecommendation,
  PerformanceMetadata,
} from './types'

export abstract class BaseToolAdapter implements ToolAdapter {
  protected logger = createLogger(`ToolAdapter:${this.constructor.name}`)

  constructor(
    public readonly schema: ParlantToolSchema,
    protected config?: Record<string, any>
  ) {}

  /**
   * Execute the tool with comprehensive error handling and monitoring
   */
  async execute(args: any, context: AdapterContext): Promise<AdapterResult> {
    const startTime = Date.now()
    const executionId = `${this.schema.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.logger.info('Starting tool execution', {
      executionId,
      tool: this.schema.name,
      userId: context.user_id,
      workspaceId: context.workspace_id,
      argsProvided: !!args,
    })

    try {
      // Validate arguments
      const validation = await this.validateArgs(args)
      if (!validation.valid) {
        return this.createErrorResult('VALIDATION_ERROR',
          `Invalid arguments: ${validation.errors?.join(', ')}`,
          'Please check your input parameters and try again.',
          validation.errors || []
        )
      }

      // Validate context
      const contextValidation = this.validateContext(context)
      if (!contextValidation.valid) {
        return this.createErrorResult('CONTEXT_ERROR',
          `Invalid context: ${contextValidation.errors?.join(', ')}`,
          'There was an issue with your session. Please try again.'
        )
      }

      // Execute the actual tool logic
      const result = await this.executeInternal(args, context)

      const executionTime = Date.now() - startTime

      this.logger.info('Tool execution completed', {
        executionId,
        tool: this.schema.name,
        success: result.success,
        executionTime,
      })

      return {
        ...result,
        metadata: {
          ...result.metadata,
          execution_time_ms: executionTime,
          cached: result.metadata?.cached || false,
        },
      }

    } catch (error: any) {
      const executionTime = Date.now() - startTime

      this.logger.error('Tool execution failed', {
        executionId,
        tool: this.schema.name,
        error: error.message,
        executionTime,
        stack: error.stack,
      })

      return this.createErrorResult(
        'EXECUTION_ERROR',
        error.message || 'Unknown error occurred',
        'Something went wrong while executing this tool. Please try again.',
        [],
        true // Most execution errors are retryable
      )
    }
  }

  /**
   * Validate input arguments - can be overridden by subclasses
   */
  async validateArgs(args: any): Promise<ValidationResult> {
    return this.validate ? this.validate(args) : { valid: true }
  }

  /**
   * Validate adapter context
   */
  protected validateContext(context: AdapterContext): ValidationResult {
    const errors: string[] = []

    if (!context.user_id?.trim()) {
      errors.push('User ID is required')
    }

    if (!context.workspace_id?.trim()) {
      errors.push('Workspace ID is required')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Create standardized error result
   */
  protected createErrorResult(
    code: string,
    message: string,
    userMessage: string,
    suggestions: string[] = [],
    retryable: boolean = false
  ): AdapterResult {
    return {
      success: false,
      error: {
        code,
        message,
        user_message: userMessage,
        suggestions,
        retryable,
      },
    }
  }

  /**
   * Create standardized success result
   */
  protected createSuccessResult(
    data?: any,
    message?: string,
    metadata?: Record<string, any>
  ): AdapterResult {
    return {
      success: true,
      data,
      message,
      metadata: {
        cached: false,
        ...metadata,
      },
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract executeInternal(args: any, context: AdapterContext): Promise<AdapterResult>

  /**
   * Optional validation method - can be implemented by subclasses
   */
  validate?(args: any): ValidationResult

  /**
   * Optional recommendations method
   */
  async getRecommendations?(context: AdapterContext): Promise<ToolRecommendation[]>

  /**
   * Optional cleanup method
   */
  async cleanup?(): Promise<void>

  /**
   * Get performance characteristics for this tool
   */
  getPerformanceMetadata(): PerformanceMetadata {
    return this.schema.performance
  }

  /**
   * Check if tool supports caching
   */
  supportsCaching(): boolean {
    return this.schema.performance.cacheable
  }

  /**
   * Get tool category
   */
  getCategory(): string {
    return this.schema.category
  }

  /**
   * Get natural language description
   */
  getDescription(): string {
    return this.schema.description
  }

  /**
   * Get usage guidelines
   */
  getUsageGuidelines(): string {
    return this.schema.usage_guidelines
  }
}

/**
 * Utility function to measure execution time
 */
export function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  return fn().then(result => ({
    result,
    duration: Date.now() - start,
  }))
}

/**
 * Utility function to create tool schema with defaults
 */
export function createToolSchema(
  name: string,
  description: string,
  usage_guidelines: string,
  parameters: Record<string, any>,
  overrides: Partial<ParlantToolSchema> = {}
): ParlantToolSchema {
  return {
    name,
    description,
    usage_guidelines,
    parameters,
    category: 'automation',
    permission_level: 'workspace',
    performance: {
      estimated_duration_ms: 1000,
      cacheable: false,
      resource_usage: 'medium',
    },
    ...overrides,
  }
}