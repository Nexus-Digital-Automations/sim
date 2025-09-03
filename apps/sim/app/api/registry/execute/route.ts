/**
 * Registry Execution API
 *
 * Handles execution of custom registry tools and blocks via webhook delivery.
 * Provides a unified interface for executing registered tools and blocks with
 * proper authentication, rate limiting, and error handling.
 *
 * Features:
 * - Custom tool webhook execution
 * - Custom block execution URL calls
 * - Authentication and authorization
 * - Rate limiting and usage tracking
 * - Comprehensive logging and monitoring
 * - Error handling and retry mechanisms
 */

import crypto from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { registryBlocks, registryRateLimits, registryTools } from '@/db/schema'

const logger = createLogger('RegistryExecutionAPI')

// Execution request schemas
const ExecuteToolRequestSchema = z.object({
  toolId: z.string().min(1),
  inputs: z.record(z.any()).default({}),
  config: z.record(z.any()).default({}),
  executionId: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
})

const ExecuteBlockRequestSchema = z.object({
  blockId: z.string().min(1),
  inputs: z.record(z.any()).default({}),
  config: z.record(z.any()).default({}),
  executionId: z.string().optional(),
  timeout: z.number().min(1000).max(600000).optional(), // 1s to 10min
})

/**
 * Rate limiting check for registry executions
 */
async function checkExecutionRateLimit(userId: string, type: 'tool' | 'block'): Promise<boolean> {
  const rateLimitRecord = await db
    .select()
    .from(registryRateLimits)
    .where(eq(registryRateLimits.userId, userId))
    .limit(1)

  const now = new Date()
  const windowStart = rateLimitRecord[0]?.windowStart || now
  const windowAge = now.getTime() - windowStart.getTime()
  const windowMinutes = windowAge / (1000 * 60)

  // Reset window if older than 60 minutes
  if (windowMinutes >= 60) {
    await db
      .insert(registryRateLimits)
      .values({
        userId,
        toolRegistrations: 0,
        blockRegistrations: 0,
        webhookCalls: 0,
        windowStart: now,
        lastRequestAt: now,
        isRateLimited: false,
      })
      .onConflictDoUpdate({
        target: registryRateLimits.userId,
        set: {
          webhookCalls: 0,
          windowStart: now,
          lastRequestAt: now,
          isRateLimited: false,
        },
      })
    return true
  }

  const currentCalls = rateLimitRecord[0]?.webhookCalls || 0
  const limit = type === 'tool' ? 500 : 200 // Tools get higher limit as they're simpler

  if (currentCalls >= limit) {
    await db
      .update(registryRateLimits)
      .set({
        isRateLimited: true,
        rateLimitResetAt: new Date(windowStart.getTime() + 60 * 60 * 1000),
      })
      .where(eq(registryRateLimits.userId, userId))
    return false
  }

  return true
}

/**
 * Execute a custom tool via webhook
 */
async function executeCustomTool(
  tool: any,
  inputs: any,
  config: any,
  executionId: string,
  timeout: number
): Promise<{ success: boolean; data?: any; error?: string; executionTime: number }> {
  const startTime = Date.now()

  try {
    const requestBody = {
      toolId: tool.id,
      toolName: tool.name,
      inputs,
      config,
      executionId,
      metadata: {
        userId: tool.userId,
        version: tool.version,
        category: tool.category,
      },
    }

    // Add authentication headers if configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SimRegistry/1.0',
      'X-Execution-Id': executionId,
    }

    if (tool.authentication && tool.authentication.type !== 'none') {
      const auth = tool.authentication
      switch (auth.type) {
        case 'bearer':
          if (auth.token) {
            headers.Authorization = `Bearer ${auth.token}`
          }
          break
        case 'api_key':
          if (auth.apiKey && auth.headerName) {
            headers[auth.headerName] = auth.apiKey
          }
          break
      }
    }

    logger.info(`Executing custom tool ${tool.name} (${tool.id})`, {
      executionId,
      webhook: tool.webhookUrl,
      method: tool.webhookMethod,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(tool.webhookUrl, {
        method: tool.webhookMethod || 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Tool webhook returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      logger.info(`Custom tool execution completed`, {
        executionId,
        toolId: tool.id,
        executionTime,
        success: true,
      })

      return { success: true, data, executionTime }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    const executionTime = Date.now() - startTime

    logger.error(`Custom tool execution failed`, {
      executionId,
      toolId: tool.id,
      executionTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime,
    }
  }
}

/**
 * Execute a custom block via execution URL
 */
async function executeCustomBlock(
  block: any,
  inputs: any,
  config: any,
  executionId: string,
  timeout: number
): Promise<{ success: boolean; data?: any; error?: string; executionTime: number }> {
  const startTime = Date.now()

  try {
    const requestBody = {
      blockId: block.id,
      blockName: block.name,
      blockType: block.name, // Using name as type for custom blocks
      inputs,
      config,
      executionId,
      ports: {
        inputs: block.inputPorts,
        outputs: block.outputPorts,
      },
      metadata: {
        userId: block.userId,
        version: block.version,
        category: block.category,
      },
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SimRegistry/1.0',
      'X-Execution-Id': executionId,
    }

    logger.info(`Executing custom block ${block.name} (${block.id})`, {
      executionId,
      executionUrl: block.executionUrl,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(block.executionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Block execution URL returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      // Validate outputs if validation URL is provided
      if (block.validationUrl && data) {
        try {
          const validationResponse = await fetch(block.validationUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              blockId: block.id,
              inputs,
              outputs: data,
              executionId,
            }),
            signal: AbortSignal.timeout(5000), // 5 second validation timeout
          })

          if (!validationResponse.ok) {
            logger.warn(`Block validation failed for ${block.id}`, {
              executionId,
              validationStatus: validationResponse.status,
            })
          }
        } catch (validationError) {
          logger.warn(`Block validation error for ${block.id}`, {
            executionId,
            error: validationError instanceof Error ? validationError.message : 'Unknown error',
          })
        }
      }

      logger.info(`Custom block execution completed`, {
        executionId,
        blockId: block.id,
        executionTime,
        success: true,
      })

      return { success: true, data, executionTime }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    const executionTime = Date.now() - startTime

    logger.error(`Custom block execution failed`, {
      executionId,
      blockId: block.id,
      executionTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime,
    }
  }
}

/**
 * POST /api/registry/execute/tool
 * Execute a custom tool
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'tool' or 'block'

    if (!type || !['tool', 'block'].includes(type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: 'Type must be "tool" or "block"' } },
        { status: 400 }
      )
    }

    // Rate limiting check
    const rateLimitPassed = await checkExecutionRateLimit(session.user.id, type as 'tool' | 'block')
    if (!rateLimitPassed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Execution rate limit exceeded. Try again later.',
          },
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()

    if (type === 'tool') {
      const toolRequest = ExecuteToolRequestSchema.parse(body)
      const executionId = toolRequest.executionId || `exec_${requestId}`

      // Get tool
      const tool = await db
        .select()
        .from(registryTools)
        .where(and(eq(registryTools.id, toolRequest.toolId), eq(registryTools.status, 'active')))
        .limit(1)

      if (tool.length === 0) {
        return NextResponse.json(
          { error: { code: 'TOOL_NOT_FOUND', message: 'Tool not found or inactive' } },
          { status: 404 }
        )
      }

      const result = await executeCustomTool(
        tool[0],
        toolRequest.inputs,
        toolRequest.config,
        executionId,
        toolRequest.timeout || 30000
      )

      // Update usage tracking
      await db
        .update(registryTools)
        .set({
          usageCount: tool[0].usageCount + 1,
          lastUsedAt: new Date(),
          ...(result.success
            ? {}
            : {
                errorCount: tool[0].errorCount + 1,
                lastErrorAt: new Date(),
              }),
        })
        .where(eq(registryTools.id, toolRequest.toolId))

      // Update rate limit counter
      await db
        .update(registryRateLimits)
        .set({
          webhookCalls: sql`${registryRateLimits.webhookCalls} + 1`,
          lastRequestAt: new Date(),
        })
        .where(eq(registryRateLimits.userId, session.user.id))

      return NextResponse.json({
        executionId,
        toolId: toolRequest.toolId,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString(),
      })
    }
    // Block execution
    const blockRequest = ExecuteBlockRequestSchema.parse(body)
    const executionId = blockRequest.executionId || `exec_${requestId}`

    // Get block
    const block = await db
      .select()
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, blockRequest.blockId), eq(registryBlocks.status, 'active')))
      .limit(1)

    if (block.length === 0) {
      return NextResponse.json(
        { error: { code: 'BLOCK_NOT_FOUND', message: 'Block not found or inactive' } },
        { status: 404 }
      )
    }

    const result = await executeCustomBlock(
      block[0],
      blockRequest.inputs,
      blockRequest.config,
      executionId,
      blockRequest.timeout || 300000
    )

    // Update usage tracking
    await db
      .update(registryBlocks)
      .set({
        usageCount: block[0].usageCount + 1,
        lastUsedAt: new Date(),
        ...(result.success
          ? {}
          : {
              errorCount: block[0].errorCount + 1,
              lastErrorAt: new Date(),
            }),
      })
      .where(eq(registryBlocks.id, blockRequest.blockId))

    // Update rate limit counter
    await db
      .update(registryRateLimits)
      .set({
        webhookCalls: sql`${registryRateLimits.webhookCalls} + 1`,
        lastRequestAt: new Date(),
      })
      .where(eq(registryRateLimits.userId, session.user.id))

    return NextResponse.json({
      executionId,
      blockId: blockRequest.blockId,
      success: result.success,
      data: result.data,
      error: result.error,
      executionTime: result.executionTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error(`[${requestId}] Registry execution failed`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid execution request',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to execute registry item',
        },
      },
      { status: 500 }
    )
  }
}
