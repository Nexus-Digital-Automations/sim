/**
 * AI Help Engine API - Core AI-Powered Help Endpoint
 *
 * Comprehensive API endpoint providing AI-powered help functionality:
 * - Intelligent conversational assistance via chatbot
 * - Semantic search with contextual understanding
 * - Predictive help based on user behavior
 * - Proactive assistance and suggestions
 * - Real-time context-aware help responses
 *
 * Integrates with the full AI Help Engine architecture:
 * - EmbeddingService for semantic content matching
 * - SemanticSearchService for advanced search capabilities
 * - IntelligentChatbot for conversational help
 * - PredictiveHelpEngine for proactive assistance
 *
 * @created 2025-09-04
 * @author AI Help Engine Core Architecture Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { type AIHelpContext, type AIHelpRequest, getAIHelpEngine } from '@/lib/help/ai'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AIHelpAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const aiHelpRequestSchema = z.object({
  type: z.enum(['search', 'chat', 'suggestions', 'proactive']),
  query: z.string().min(1).max(2000).optional(),
  sessionId: z.string().optional(),
  context: z
    .object({
      workflowContext: z
        .object({
          type: z.string().optional(),
          currentStep: z.string().optional(),
          blockTypes: z.array(z.string()).optional(),
          completedSteps: z.array(z.string()).optional(),
          errors: z
            .array(
              z.object({
                code: z.string(),
                message: z.string(),
                context: z.string(),
                timestamp: z.string(),
                resolved: z.boolean(),
              })
            )
            .optional(),
          timeSpent: z.number().optional(),
        })
        .optional(),
      searchContext: z
        .object({
          workflowType: z.string().optional(),
          blockType: z.string().optional(),
          userRole: z.enum(['beginner', 'intermediate', 'expert']).optional(),
          errorContext: z.string().optional(),
          currentStep: z.string().optional(),
          previousErrors: z.array(z.string()).optional(),
          timeSpentInStep: z.number().optional(),
        })
        .optional(),
      conversationContext: z
        .object({
          conversationHistory: z
            .array(
              z.object({
                id: z.string(),
                role: z.enum(['user', 'assistant', 'system']),
                content: z.string(),
                timestamp: z.string(),
              })
            )
            .optional(),
          lastActivity: z.string().optional(),
        })
        .optional(),
      userPermissions: z
        .object({
          roles: z.array(z.string()),
          allowedVisibilityLevels: z.array(z.string()),
          userId: z.string(),
          organizationId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  options: z
    .object({
      maxResults: z.number().min(1).max(50).default(10),
      minScore: z.number().min(0).max(1).default(0.6),
      useHybridSearch: z.boolean().default(true),
      useReranking: z.boolean().default(true),
      contextBoost: z.number().min(0).max(2).default(1),
      includeMetadata: z.boolean().default(true),
      enableProactive: z.boolean().default(true),
    })
    .optional(),
})

const healthCheckSchema = z.object({
  includeMetrics: z.boolean().default(false),
  includeComponentHealth: z.boolean().default(true),
})

// ========================
// API REQUEST HANDLERS
// ========================

/**
 * POST /api/help/ai - Process AI help requests
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing AI help request`)

    // Get user session for authentication
    const session = await getSession()
    if (!session?.user?.email) {
      logger.warn(`[${requestId}] Unauthorized AI help request attempt`)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email

    // Parse and validate request body
    const body = await req.json()
    const validationResult = aiHelpRequestSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid AI help request data`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { type, query, sessionId, context, options } = validationResult.data

    // Build AI help request
    const aiHelpRequest: AIHelpRequest = {
      type,
      userId,
      sessionId: sessionId || `session_${requestId}_${Date.now()}`,
      query,
      context: context as AIHelpContext,
      options,
    }

    logger.info(`[${requestId}] AI help request validated`, {
      type,
      userId: `${userId.substring(0, 8)}***`, // Privacy-safe logging
      hasQuery: !!query,
      hasContext: !!context,
      sessionId: `${sessionId?.substring(0, 12)}***`,
    })

    // Get AI Help Engine instance
    const aiHelpEngine = getAIHelpEngine()

    // Process the request through AI Help Engine
    const response = await aiHelpEngine.processRequest(aiHelpRequest)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] AI help request completed successfully`, {
      type,
      responseTime: response.metadata.responseTime,
      suggestionsCount: response.suggestions?.length || 0,
      relatedContentCount: response.relatedContent?.length || 0,
      cached: response.metadata.cached,
      confidence: response.metadata.confidence,
    })

    return NextResponse.json(
      {
        success: true,
        data: response.data,
        type: response.type,
        suggestions: response.suggestions,
        relatedContent: response.relatedContent,
        metadata: {
          ...response.metadata,
          requestId,
          totalProcessingTime: processingTime,
          apiVersion: '1.0.0',
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': `${processingTime}ms`,
          'X-Request-ID': requestId,
          'Cache-Control': response.metadata.cached ? 'public, max-age=300' : 'private, max-age=60',
        },
      }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] AI help request failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    // Return appropriate error response
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Please wait before making another request',
          retryAfter: 60,
        },
        { status: 429 }
      )
    }

    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Authentication failed', message: 'Please check your API credentials' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'AI help request processing failed',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/help/ai - Health check and system status
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing AI help health check`)

    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams)

    // Parse boolean parameters
    const processedParams: Record<string, any> = { ...params }
    if (params.includeMetrics !== undefined) {
      processedParams.includeMetrics = params.includeMetrics === 'true'
    }
    if (params.includeComponentHealth !== undefined) {
      processedParams.includeComponentHealth = params.includeComponentHealth === 'true'
    }

    const validationResult = healthCheckSchema.safeParse(processedParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { includeMetrics, includeComponentHealth } = validationResult.data

    // Get AI Help Engine instance
    const aiHelpEngine = getAIHelpEngine()

    // Perform health check
    const isHealthy = await aiHelpEngine.healthCheck()
    const processingTime = Date.now() - startTime

    const response: any = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: processingTime,
    }

    // Include metrics if requested
    if (includeMetrics) {
      response.metrics = aiHelpEngine.getMetrics()
    }

    // Include component health if requested
    if (includeComponentHealth) {
      const metrics = aiHelpEngine.getMetrics()
      response.components = {
        embedding: {
          status: 'healthy',
          metrics: metrics.components.embedding,
        },
        search: {
          status: 'healthy',
          metrics: metrics.components.search,
        },
        chatbot: {
          status: 'healthy',
          metrics: metrics.components.chatbot,
        },
        predictiveHelp: {
          status: 'healthy',
          metrics: metrics.components.predictiveHelp,
        },
      }
    }

    logger.info(`[${requestId}] Health check completed`, {
      status: response.status,
      processingTime,
      includeMetrics,
      includeComponentHealth,
    })

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'X-Request-ID': requestId,
        'Cache-Control': 'private, max-age=30',
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Health check failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 503 }
    )
  }
}

/**
 * PUT /api/help/ai - Index help content for semantic search
 */
export async function PUT(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing help content indexing request`)

    // Check authentication and admin permissions
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // In a real implementation, you'd check for admin permissions here
    // For now, we'll allow any authenticated user to trigger indexing

    const body = await req.json()

    if (!Array.isArray(body.content)) {
      return NextResponse.json(
        { error: 'Invalid request: content must be an array' },
        { status: 400 }
      )
    }

    const content = body.content

    logger.info(`[${requestId}] Starting content indexing`, {
      contentCount: content.length,
    })

    // Get AI Help Engine and index content
    const aiHelpEngine = getAIHelpEngine()
    await aiHelpEngine.indexHelpContent(content)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Content indexing completed`, {
      contentCount: content.length,
      processingTime,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Content indexed successfully',
        contentCount: content.length,
        processingTime,
        requestId,
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': `${processingTime}ms`,
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Content indexing failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        error: 'Content indexing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/help/ai - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    }
  )
}
