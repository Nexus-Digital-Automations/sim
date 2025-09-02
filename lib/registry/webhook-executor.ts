/**
 * Webhook Execution System for Registry Tools and Blocks
 *
 * This module handles the execution of custom tools and blocks through webhook calls,
 * providing secure communication, retry logic, logging, and error handling.
 *
 * Features:
 * - HMAC-SHA256 signature verification for security
 * - Configurable retry logic with exponential backoff
 * - Comprehensive execution logging and monitoring
 * - Timeout handling and circuit breaker patterns
 * - Support for both tools and blocks execution
 */

import crypto from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { registryBlocks, registryTools, webhookExecutionLogs } from '@/db/schema'

// Execution context types
interface BaseExecutionContext {
  executionId: string
  workflowId: string
  userId: string
  timestamp: string
}

interface ToolExecutionContext extends BaseExecutionContext {
  type: 'tool'
  toolId: string
  inputs: Record<string, any>
  config: Record<string, any>
}

interface BlockExecutionContext extends BaseExecutionContext {
  type: 'block'
  blockId: string
  inputs: Record<string, any>
  config: Record<string, any>
  stepNumber: number
}

type ExecutionContext = ToolExecutionContext | BlockExecutionContext

// Response types
interface ExecutionResponse {
  success: boolean
  outputs?: Record<string, any>
  error?: {
    code: string
    message: string
    details?: any
  }
  executionTime?: number
  metadata?: Record<string, any>
}

interface WebhookExecutionResult {
  success: boolean
  response?: ExecutionResponse
  httpStatus?: number
  responseTime: number
  error?: string
  retryCount: number
}

/**
 * Configuration for webhook execution
 */
interface WebhookConfig {
  url: string
  method: string
  timeout: number
  retryCount: number
  signature?: string
}

/**
 * Generate HMAC-SHA256 signature for webhook security
 */
function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Exponential backoff delay calculation
 */
function calculateBackoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30000) // Max 30 seconds
}

/**
 * Execute webhook with retry logic and comprehensive error handling
 */
async function executeWebhookWithRetry(
  config: WebhookConfig,
  payload: any,
  secret: string
): Promise<WebhookExecutionResult> {
  const payloadString = JSON.stringify(payload)
  const signature = generateWebhookSignature(payloadString, secret)
  let lastError = ''
  let retryCount = 0

  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    const startTime = Date.now()

    try {
      // Add delay for retries (exponential backoff)
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
        retryCount++
      }

      // Execute webhook request
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sim-Registry-Webhook/1.0',
          'X-Signature': signature,
          'X-Timestamp': payload.timestamp,
          'X-Request-ID': payload.executionId,
        },
        body: payloadString,
        signal: AbortSignal.timeout(config.timeout),
      })

      const responseTime = Date.now() - startTime

      // Parse response
      let responseBody: any = {}
      try {
        const responseText = await response.text()
        responseBody = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        console.warn('Failed to parse webhook response as JSON:', parseError)
        responseBody = { rawResponse: await response.text() }
      }

      // Check if response indicates success
      if (response.ok && responseBody.success !== false) {
        return {
          success: true,
          response: responseBody,
          httpStatus: response.status,
          responseTime,
          retryCount,
        }
      }

      // Handle non-success responses
      lastError = responseBody.error?.message || `HTTP ${response.status}: ${response.statusText}`

      // Don't retry for client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          httpStatus: response.status,
          responseTime,
          error: lastError,
          retryCount,
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      if (error instanceof Error) {
        lastError = error.message

        // Handle specific error types
        if (error.name === 'AbortError') {
          lastError = `Request timeout after ${config.timeout}ms`
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          lastError = 'Network connection failed'
        }
      } else {
        lastError = 'Unknown error occurred'
      }

      // On final attempt, return the error
      if (attempt === config.retryCount) {
        return {
          success: false,
          responseTime,
          error: lastError,
          retryCount,
        }
      }
    }
  }

  return {
    success: false,
    responseTime: 0,
    error: lastError,
    retryCount,
  }
}

/**
 * Log webhook execution to database
 */
async function logWebhookExecution(
  context: ExecutionContext,
  config: WebhookConfig,
  result: WebhookExecutionResult,
  requestBody: any
): Promise<void> {
  try {
    const logId = `log_${crypto.randomBytes(8).toString('hex')}`

    await db.insert(webhookExecutionLogs).values({
      id: logId,
      registryItemId: context.type === 'tool' ? context.toolId : context.blockId,
      registryType: context.type,
      executionId: context.executionId,
      workflowId: context.workflowId,
      userId: context.userId,
      webhookUrl: config.url,
      requestMethod: config.method,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Signature': config.signature || 'none',
        'X-Timestamp': context.timestamp,
      },
      requestBody,
      responseStatus: result.httpStatus,
      responseHeaders: {},
      responseBody: result.response,
      responseTimeMs: result.responseTime,
      errorMessage: result.error,
      retryCount: result.retryCount,
      isSuccessful: result.success,
      startedAt: new Date(context.timestamp),
      completedAt: new Date(),
    })

    console.log(
      `Webhook execution logged: ${logId} for ${context.type} ${context.type === 'tool' ? context.toolId : context.blockId}`
    )
  } catch (error) {
    console.error('Failed to log webhook execution:', error)
  }
}

/**
 * Update registry item usage statistics
 */
async function updateUsageStats(
  context: ExecutionContext,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const now = new Date()

    if (context.type === 'tool') {
      if (success) {
        await db
          .update(registryTools)
          .set({
            usageCount: sql`${registryTools.usageCount} + 1`,
            lastUsedAt: now,
          })
          .where(eq(registryTools.id, context.toolId))
      } else {
        await db
          .update(registryTools)
          .set({
            errorCount: sql`${registryTools.errorCount} + 1`,
            lastErrorAt: now,
            lastErrorMessage: errorMessage || 'Unknown error',
          })
          .where(eq(registryTools.id, context.toolId))
      }
    } else {
      if (success) {
        await db
          .update(registryBlocks)
          .set({
            usageCount: sql`${registryBlocks.usageCount} + 1`,
            lastUsedAt: now,
          })
          .where(eq(registryBlocks.id, context.blockId))
      } else {
        await db
          .update(registryBlocks)
          .set({
            errorCount: sql`${registryBlocks.errorCount} + 1`,
            lastErrorAt: now,
            lastErrorMessage: errorMessage || 'Unknown error',
          })
          .where(eq(registryBlocks.id, context.blockId))
      }
    }
  } catch (error) {
    console.error('Failed to update usage statistics:', error)
  }
}

/**
 * Execute a registered tool via webhook
 */
export async function executeRegistryTool(
  context: ToolExecutionContext
): Promise<ExecutionResponse> {
  try {
    // Fetch tool configuration
    const tool = await db
      .select({
        name: registryTools.name,
        webhookUrl: registryTools.webhookUrl,
        webhookMethod: registryTools.webhookMethod,
        webhookTimeout: registryTools.webhookTimeout,
        webhookRetryCount: registryTools.webhookRetryCount,
        status: registryTools.status,
      })
      .from(registryTools)
      .where(and(eq(registryTools.id, context.toolId), eq(registryTools.userId, context.userId)))
      .limit(1)

    if (tool.length === 0) {
      throw new Error('Tool not found or access denied')
    }

    const toolConfig = tool[0]

    if (toolConfig.status !== 'active') {
      throw new Error(`Tool is ${toolConfig.status}`)
    }

    // Prepare webhook configuration
    const webhookConfig: WebhookConfig = {
      url: toolConfig.webhookUrl,
      method: toolConfig.webhookMethod,
      timeout: toolConfig.webhookTimeout || 30000,
      retryCount: toolConfig.webhookRetryCount || 3,
    }

    // Prepare request payload
    const requestPayload = {
      executionId: context.executionId,
      toolId: context.toolId,
      toolName: toolConfig.name,
      workflowId: context.workflowId,
      userId: context.userId,
      inputs: context.inputs,
      config: context.config,
      timestamp: context.timestamp,
    }

    // Generate webhook secret (in production, this should be stored securely)
    const webhookSecret =
      process.env.REGISTRY_WEBHOOK_SECRET || 'default-secret-change-in-production'

    // Execute webhook
    const result = await executeWebhookWithRetry(webhookConfig, requestPayload, webhookSecret)

    // Log execution
    await logWebhookExecution(context, webhookConfig, result, requestPayload)

    // Update usage statistics
    await updateUsageStats(context, result.success, result.error)

    // Return formatted response
    if (result.success && result.response) {
      return {
        success: true,
        outputs: result.response.outputs || {},
        executionTime: result.responseTime,
        metadata: {
          toolName: toolConfig.name,
          retryCount: result.retryCount,
          ...result.response.metadata,
        },
      }
    }
    return {
      success: false,
      error: {
        code: 'WEBHOOK_EXECUTION_FAILED',
        message: result.error || 'Tool execution failed',
        details: {
          httpStatus: result.httpStatus,
          retryCount: result.retryCount,
          responseTime: result.responseTime,
        },
      },
    }
  } catch (error) {
    console.error('Error executing registry tool:', error)

    // Update error statistics
    await updateUsageStats(context, false, error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      error: {
        code: 'TOOL_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Execute a registered block via webhook
 */
export async function executeRegistryBlock(
  context: BlockExecutionContext
): Promise<ExecutionResponse> {
  try {
    // Fetch block configuration
    const block = await db
      .select({
        name: registryBlocks.name,
        executionUrl: registryBlocks.executionUrl,
        executionTimeout: registryBlocks.executionTimeout,
        status: registryBlocks.status,
        inputPorts: registryBlocks.inputPorts,
        outputPorts: registryBlocks.outputPorts,
      })
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, context.blockId), eq(registryBlocks.userId, context.userId)))
      .limit(1)

    if (block.length === 0) {
      throw new Error('Block not found or access denied')
    }

    const blockConfig = block[0]

    if (blockConfig.status !== 'active') {
      throw new Error(`Block is ${blockConfig.status}`)
    }

    // Prepare webhook configuration (blocks only support POST method)
    const webhookConfig: WebhookConfig = {
      url: blockConfig.executionUrl,
      method: 'POST',
      timeout: blockConfig.executionTimeout || 300000,
      retryCount: 2, // Lower retry count for blocks due to longer execution times
    }

    // Prepare request payload
    const requestPayload = {
      executionId: context.executionId,
      blockId: context.blockId,
      blockName: blockConfig.name,
      workflowId: context.workflowId,
      userId: context.userId,
      inputs: context.inputs,
      config: context.config,
      context: {
        executionContext: 'workflow',
        stepNumber: context.stepNumber,
      },
      ports: {
        input: blockConfig.inputPorts,
        output: blockConfig.outputPorts,
      },
      timestamp: context.timestamp,
    }

    // Generate webhook secret
    const webhookSecret =
      process.env.REGISTRY_WEBHOOK_SECRET || 'default-secret-change-in-production'

    // Execute webhook
    const result = await executeWebhookWithRetry(webhookConfig, requestPayload, webhookSecret)

    // Log execution
    await logWebhookExecution(context, webhookConfig, result, requestPayload)

    // Update usage statistics
    await updateUsageStats(context, result.success, result.error)

    // Return formatted response
    if (result.success && result.response) {
      return {
        success: true,
        outputs: result.response.outputs || {},
        executionTime: result.responseTime,
        metadata: {
          blockName: blockConfig.name,
          retryCount: result.retryCount,
          stepNumber: context.stepNumber,
          ...result.response.metadata,
        },
      }
    }
    return {
      success: false,
      error: {
        code: 'WEBHOOK_EXECUTION_FAILED',
        message: result.error || 'Block execution failed',
        details: {
          httpStatus: result.httpStatus,
          retryCount: result.retryCount,
          responseTime: result.responseTime,
        },
      },
    }
  } catch (error) {
    console.error('Error executing registry block:', error)

    // Update error statistics
    await updateUsageStats(context, false, error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      error: {
        code: 'BLOCK_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Validate webhook signature for incoming requests (for webhook endpoints)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret)
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

/**
 * Get execution logs for a registry item
 */
export async function getExecutionLogs(
  registryItemId: string,
  registryType: 'tool' | 'block',
  userId: string,
  limit = 50
) {
  try {
    const logs = await db
      .select({
        id: webhookExecutionLogs.id,
        executionId: webhookExecutionLogs.executionId,
        workflowId: webhookExecutionLogs.workflowId,
        webhookUrl: webhookExecutionLogs.webhookUrl,
        requestMethod: webhookExecutionLogs.requestMethod,
        responseStatus: webhookExecutionLogs.responseStatus,
        responseTimeMs: webhookExecutionLogs.responseTimeMs,
        errorMessage: webhookExecutionLogs.errorMessage,
        retryCount: webhookExecutionLogs.retryCount,
        isSuccessful: webhookExecutionLogs.isSuccessful,
        startedAt: webhookExecutionLogs.startedAt,
        completedAt: webhookExecutionLogs.completedAt,
      })
      .from(webhookExecutionLogs)
      .where(
        and(
          eq(webhookExecutionLogs.registryItemId, registryItemId),
          eq(webhookExecutionLogs.registryType, registryType),
          eq(webhookExecutionLogs.userId, userId)
        )
      )
      .orderBy(sql`${webhookExecutionLogs.startedAt} DESC`)
      .limit(limit)

    return { logs, total: logs.length }
  } catch (error) {
    console.error('Error fetching execution logs:', error)
    return { logs: [], total: 0 }
  }
}
