/**
 * Base Nexus Tool - Standardized Foundation for All Nexus Tools
 *
 * This module provides the base infrastructure for all Nexus Copilot tools,
 * including standardized authentication, logging, error handling, and monitoring.
 *
 * CORE FEATURES:
 * - Standardized authentication patterns
 * - Comprehensive logging with operation IDs
 * - Performance metrics tracking
 * - Error context preservation
 * - User activity audit trails
 * - TypeScript strict mode compliance
 */

import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

/**
 * Base configuration for all Nexus tools
 */
export interface NexusToolConfig {
  toolName: string
  description: string
  requiresAuth?: boolean
  loggingEnabled?: boolean
  performanceTracking?: boolean
}

/**
 * Standard operation context used across all Nexus tools
 */
export interface NexusOperationContext {
  operationId: string
  userId?: string
  toolName: string
  startTime: number
  metadata: Record<string, unknown>
}

/**
 * Standard success response structure for Nexus tools
 */
export interface NexusSuccessResponse<TData = any> {
  status: 'success'
  data: TData
  metadata: {
    operationId: string
    timestamp: string
    executionTimeMs: number
  }
}

/**
 * Standard error response structure for Nexus tools
 */
export interface NexusErrorResponse {
  status: 'error'
  message: string
  code?: string
  details?: Record<string, unknown>
  metadata: {
    operationId: string
    timestamp: string
    executionTimeMs?: number
  }
}

/**
 * Union type for all Nexus tool responses
 */
export type NexusToolResponse<TData = any> = NexusSuccessResponse<TData> | NexusErrorResponse

/**
 * Base class for all Nexus tools providing standardized infrastructure
 */
export abstract class BaseNexusTool {
  protected logger: ReturnType<typeof createLogger>
  protected config: NexusToolConfig

  constructor(config: NexusToolConfig) {
    this.config = {
      requiresAuth: true,
      loggingEnabled: true,
      performanceTracking: true,
      ...config,
    }

    this.logger = createLogger(`Nexus${config.toolName}`)

    if (this.config.loggingEnabled) {
      this.logger.debug(`Initialized ${config.toolName} tool`, {
        config: this.config,
      })
    }
  }

  /**
   * Create a new operation context for tracking a tool execution
   */
  protected createOperationContext(metadata: Record<string, unknown> = {}): NexusOperationContext {
    return {
      operationId: `${this.config.toolName.toLowerCase()}-${Date.now()}-${nanoid(8)}`,
      toolName: this.config.toolName,
      startTime: Date.now(),
      metadata,
    }
  }

  /**
   * Handle authentication validation for tool execution
   */
  protected async validateAuthentication(context: NexusOperationContext): Promise<{ user: any }> {
    if (!this.config.requiresAuth) {
      return { user: null }
    }

    const session = await getSession()
    if (!session?.user) {
      this.logger.warn(`[${context.operationId}] Authentication required but no session found`)
      throw new Error('Authentication required')
    }

    context.userId = session.user.id

    this.logger.debug(`[${context.operationId}] Authentication validated`, {
      userId: session.user.id,
      userEmail: session.user.email,
    })

    return { user: session.user }
  }

  /**
   * Create a standardized success response
   */
  protected createSuccessResponse<TData>(
    data: TData,
    context: NexusOperationContext
  ): NexusSuccessResponse<TData> {
    const executionTime = Date.now() - context.startTime

    if (this.config.loggingEnabled) {
      this.logger.info(`[${context.operationId}] Operation completed successfully`, {
        userId: context.userId,
        executionTimeMs: executionTime,
        dataType: typeof data,
        dataSize: JSON.stringify(data).length,
      })
    }

    return {
      status: 'success',
      data,
      metadata: {
        operationId: context.operationId,
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
      },
    }
  }

  /**
   * Create a standardized error response
   */
  protected createErrorResponse(
    error: Error | string,
    context: NexusOperationContext,
    code?: string,
    details?: Record<string, unknown>
  ): NexusErrorResponse {
    const executionTime = Date.now() - context.startTime
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? undefined : error.stack

    if (this.config.loggingEnabled) {
      this.logger.error(`[${context.operationId}] Operation failed`, {
        userId: context.userId,
        error: errorMessage,
        stack: errorStack,
        code,
        details,
        executionTimeMs: executionTime,
      })
    }

    return {
      status: 'error',
      message: errorMessage,
      code,
      details,
      metadata: {
        operationId: context.operationId,
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
      },
    }
  }

  /**
   * Execute a tool operation with comprehensive error handling and logging
   */
  protected async executeOperation<TInput, TOutput>(
    input: TInput,
    operation: (input: TInput, context: NexusOperationContext, user: any) => Promise<TOutput>,
    inputSchema?: z.ZodSchema<TInput>
  ): Promise<NexusToolResponse<TOutput>> {
    const context = this.createOperationContext({ input })

    try {
      // Validate input if schema provided
      if (inputSchema) {
        const validation = inputSchema.safeParse(input)
        if (!validation.success) {
          throw new Error(`Invalid input: ${validation.error.message}`)
        }
        input = validation.data
      }

      // Validate authentication
      const { user } = await this.validateAuthentication(context)

      this.logger.debug(`[${context.operationId}] Starting operation`, {
        userId: context.userId,
        toolName: this.config.toolName,
        inputSize: JSON.stringify(input).length,
      })

      // Execute the operation
      const result = await operation(input, context, user)

      return this.createSuccessResponse(result, context)
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        context,
        'OPERATION_ERROR'
      )
    }
  }

  /**
   * Log performance metrics for monitoring and optimization
   */
  protected logPerformanceMetrics(
    context: NexusOperationContext,
    metrics: Record<string, number>
  ): void {
    if (!this.config.performanceTracking) return

    this.logger.info(`[${context.operationId}] Performance metrics`, {
      userId: context.userId,
      toolName: this.config.toolName,
      ...metrics,
      totalExecutionTime: Date.now() - context.startTime,
    })
  }

  /**
   * Abstract method that must be implemented by all Nexus tools
   */
  abstract createTool(): any
}

/**
 * Utility function to create a standardized Zod schema for workspace operations
 */
export const createWorkspaceSchema = (additionalFields: z.ZodRawShape = {}) => {
  return z.object({
    workspaceId: z.string().describe('The ID of the workspace to operate in'),
    ...additionalFields,
  })
}

/**
 * Utility function to create pagination schema
 */
export const createPaginationSchema = (additionalFields: z.ZodRawShape = {}) => {
  return z.object({
    limit: z.number().optional().default(20).describe('Maximum number of items to return'),
    offset: z.number().optional().default(0).describe('Number of items to skip for pagination'),
    ...additionalFields,
  })
}

/**
 * Utility function to create sorting schema
 */
export const createSortingSchema = <T extends string>(sortFields: T[]) => {
  return z.object({
    sortBy: z
      .enum(sortFields as [T, ...T[]])
      .optional()
      .describe('Field to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
  })
}
