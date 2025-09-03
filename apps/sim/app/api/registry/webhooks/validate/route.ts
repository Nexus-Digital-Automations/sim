/**
 * Registry Webhook Validation API
 *
 * Validates webhook URLs and execution endpoints for custom registry tools and blocks.
 * Provides health checking and connectivity verification for registered webhooks.
 *
 * Features:
 * - Webhook URL health checking
 * - Execution endpoint validation
 * - Response time monitoring
 * - Authentication testing
 * - Comprehensive validation reporting
 */

import crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { registryBlocks, registryTools } from '@/db/schema'

const logger = createLogger('RegistryWebhookValidationAPI')

const ValidateRequestSchema = z.object({
  type: z.enum(['tool', 'block']),
  id: z.string().min(1),
  testAuthentication: z.boolean().default(false),
  testExecution: z.boolean().default(false),
})

interface ValidationResult {
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime: number
  statusCode?: number
  error?: string
  details?: {
    headers?: Record<string, string>
    contentType?: string
    responseSize?: number
    authentication?: {
      type: string
      valid: boolean
      error?: string
    }
    execution?: {
      testPassed: boolean
      error?: string
      responseData?: any
    }
  }
}

/**
 * Validate webhook URL health and accessibility
 */
async function validateWebhookUrl(
  url: string,
  method = 'GET',
  authentication?: any,
  testExecution = false
): Promise<ValidationResult> {
  const startTime = Date.now()
  const result: ValidationResult = {
    url,
    status: 'unknown',
    responseTime: 0,
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'SimRegistry-Validator/1.0',
    }

    // Add authentication if provided and we're testing it
    if (authentication && authentication.type !== 'none') {
      switch (authentication.type) {
        case 'bearer':
          if (authentication.token) {
            headers.Authorization = `Bearer ${authentication.token}`
          }
          break
        case 'api_key':
          if (authentication.apiKey && authentication.headerName) {
            headers[authentication.headerName] = authentication.apiKey
          }
          break
      }
    }

    // Prepare test payload for execution testing
    let body: string | undefined
    if (testExecution && method !== 'GET') {
      body = JSON.stringify({
        test: true,
        executionId: `validation_${crypto.randomUUID().slice(0, 8)}`,
        inputs: {},
        config: {},
        timestamp: new Date().toISOString(),
      })
      headers['Content-Type'] = 'application/json'
    }

    logger.debug(`Validating webhook URL: ${url}`, {
      method,
      hasAuth: !!authentication,
      testExecution,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(url, {
        method: testExecution && method !== 'GET' ? 'POST' : 'HEAD',
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      result.responseTime = responseTime
      result.statusCode = response.status
      result.status = response.ok ? 'healthy' : 'unhealthy'

      // Gather response details
      result.details = {
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type') || undefined,
        responseSize: Number.parseInt(response.headers.get('content-length') || '0', 10),
      }

      // If testing authentication
      if (authentication && authentication.type !== 'none') {
        result.details.authentication = {
          type: authentication.type,
          valid: response.status !== 401 && response.status !== 403,
          error:
            response.status === 401
              ? 'Unauthorized'
              : response.status === 403
                ? 'Forbidden'
                : undefined,
        }
      }

      // If testing execution
      if (testExecution && method !== 'GET') {
        try {
          const responseData = await response.json()
          result.details.execution = {
            testPassed: response.ok,
            responseData: response.ok ? responseData : undefined,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          }
        } catch (parseError) {
          result.details.execution = {
            testPassed: false,
            error: 'Failed to parse JSON response',
          }
        }
      }

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`
      }

      return result
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    result.responseTime = responseTime
    result.status = 'unhealthy'
    result.error = error instanceof Error ? error.message : 'Unknown error'

    logger.warn(`Webhook validation failed for ${url}`, {
      error: result.error,
      responseTime,
    })

    return result
  }
}

/**
 * POST /api/registry/webhooks/validate
 * Validate webhook URLs for registry tools and blocks
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

    // Parse and validate request
    const body = await request.json()
    const { type, id, testAuthentication, testExecution } = ValidateRequestSchema.parse(body)

    logger.info(`[${requestId}] Validating ${type} webhook`, {
      id,
      userId: session.user.id,
      testAuthentication,
      testExecution,
    })

    if (type === 'tool') {
      // Validate tool webhook
      const tool = await db
        .select()
        .from(registryTools)
        .where(and(eq(registryTools.id, id), eq(registryTools.userId, session.user.id)))
        .limit(1)

      if (tool.length === 0) {
        return NextResponse.json(
          { error: { code: 'TOOL_NOT_FOUND', message: 'Tool not found or access denied' } },
          { status: 404 }
        )
      }

      const toolData = tool[0]
      const validation = await validateWebhookUrl(
        toolData.webhookUrl,
        toolData.webhookMethod,
        testAuthentication ? toolData.authentication : undefined,
        testExecution
      )

      return NextResponse.json({
        requestId,
        type: 'tool',
        id: toolData.id,
        name: toolData.name,
        validation,
        timestamp: new Date().toISOString(),
      })
    }
    // Validate block execution URL
    const block = await db
      .select()
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, id), eq(registryBlocks.userId, session.user.id)))
      .limit(1)

    if (block.length === 0) {
      return NextResponse.json(
        { error: { code: 'BLOCK_NOT_FOUND', message: 'Block not found or access denied' } },
        { status: 404 }
      )
    }

    const blockData = block[0]

    // Validate main execution URL
    const executionValidation = await validateWebhookUrl(
      blockData.executionUrl,
      'POST', // Blocks always use POST
      undefined, // Blocks don't have authentication like tools
      testExecution
    )

    // Validate validation URL if present
    let validationUrlValidation: ValidationResult | undefined
    if (blockData.validationUrl) {
      validationUrlValidation = await validateWebhookUrl(
        blockData.validationUrl,
        'POST',
        undefined,
        false // Don't test execution for validation URLs
      )
    }

    return NextResponse.json({
      requestId,
      type: 'block',
      id: blockData.id,
      name: blockData.name,
      validation: {
        execution: executionValidation,
        validation: validationUrlValidation,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error(`[${requestId}] Webhook validation failed`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid validation request',
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
          message: 'Failed to validate webhook',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/registry/webhooks/validate/status
 * Get validation status summary for user's registry items
 */
export async function GET(request: NextRequest) {
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
    const type = searchParams.get('type') // 'tool', 'block', or null for both

    logger.info(`[${requestId}] Getting validation status`, {
      userId: session.user.id,
      type,
    })

    const results: any = {}

    // Get tools if requested
    if (!type || type === 'tool') {
      const tools = await db
        .select({
          id: registryTools.id,
          name: registryTools.name,
          webhookUrl: registryTools.webhookUrl,
          status: registryTools.status,
          lastUsedAt: registryTools.lastUsedAt,
          errorCount: registryTools.errorCount,
          lastErrorAt: registryTools.lastErrorAt,
        })
        .from(registryTools)
        .where(eq(registryTools.userId, session.user.id))

      results.tools = tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        webhookUrl: tool.webhookUrl,
        status: tool.status,
        lastUsed: tool.lastUsedAt,
        hasRecentErrors:
          tool.errorCount > 0 &&
          tool.lastErrorAt &&
          Date.now() - tool.lastErrorAt.getTime() < 24 * 60 * 60 * 1000, // 24 hours
        healthStatus: tool.status === 'active' ? 'unknown' : 'inactive',
      }))
    }

    // Get blocks if requested
    if (!type || type === 'block') {
      const blocks = await db
        .select({
          id: registryBlocks.id,
          name: registryBlocks.name,
          executionUrl: registryBlocks.executionUrl,
          validationUrl: registryBlocks.validationUrl,
          status: registryBlocks.status,
          lastUsedAt: registryBlocks.lastUsedAt,
          errorCount: registryBlocks.errorCount,
          lastErrorAt: registryBlocks.lastErrorAt,
        })
        .from(registryBlocks)
        .where(eq(registryBlocks.userId, session.user.id))

      results.blocks = blocks.map((block) => ({
        id: block.id,
        name: block.name,
        executionUrl: block.executionUrl,
        validationUrl: block.validationUrl,
        status: block.status,
        lastUsed: block.lastUsedAt,
        hasRecentErrors:
          block.errorCount > 0 &&
          block.lastErrorAt &&
          Date.now() - block.lastErrorAt.getTime() < 24 * 60 * 60 * 1000, // 24 hours
        healthStatus: block.status === 'active' ? 'unknown' : 'inactive',
      }))
    }

    return NextResponse.json({
      requestId,
      results,
      summary: {
        totalTools: results.tools?.length || 0,
        totalBlocks: results.blocks?.length || 0,
        toolsWithRecentErrors: results.tools?.filter((t: any) => t.hasRecentErrors).length || 0,
        blocksWithRecentErrors: results.blocks?.filter((b: any) => b.hasRecentErrors).length || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error(`[${requestId}] Failed to get validation status`, error)

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get validation status',
        },
      },
      { status: 500 }
    )
  }
}
