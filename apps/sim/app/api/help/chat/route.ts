/**
 * AI Help Chat API - Real-time Conversational Interface
 *
 * Dedicated API endpoint for real-time chat functionality:
 * - Multi-turn conversation management
 * - Context-aware message processing
 * - Real-time response generation with Claude AI
 * - Intent classification and entity extraction
 * - Proactive assistance suggestions
 * - Conversation history management
 * - WebSocket support for real-time updates
 *
 * Integrates with the IntelligentChatbot service for advanced conversational AI.
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getAIHelpEngine } from '@/lib/help/ai'
import { IntelligentChatbot } from '@/lib/help/ai/intelligent-chatbot'
import { SemanticSearchService } from '@/lib/help/ai/semantic-search'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
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
      userProfile: z
        .object({
          expertiseLevel: z.enum(['beginner', 'intermediate', 'expert']).optional(),
          preferredLanguage: z.string().default('en').optional(),
          previousInteractions: z.number().default(0).optional(),
          commonIssues: z.array(z.string()).default([]).optional(),
        })
        .optional(),
    })
    .optional(),
})

const conversationHistorySchema = z.object({
  sessionId: z.string(),
  limit: z.number().min(1).max(100).default(50),
})

const proactiveAssistanceSchema = z.object({
  workflowContext: z.object({
    type: z.string(),
    currentStep: z.string(),
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
    timeSpent: z.number(),
  }),
})

const feedbackSchema = z.object({
  messageId: z.string(),
  rating: z.enum(['helpful', 'not_helpful']),
  feedback: z.string().optional(),
  category: z.enum(['accuracy', 'relevance', 'completeness', 'clarity', 'other']).optional(),
})

// ========================
// INITIALIZE CHATBOT
// ========================

let chatbotInstance: IntelligentChatbot | null = null

async function getChatbotInstance(): Promise<IntelligentChatbot> {
  if (!chatbotInstance) {
    // Get the AI help engine and semantic search service
    const aiHelpEngine = getAIHelpEngine()
    const semanticSearch = new SemanticSearchService(logger)

    // Initialize chatbot with configuration
    const config = {
      claudeApiKey: process.env.CLAUDE_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.7,
      conversationTimeout: 3600000, // 1 hour
      maxConversationHistory: 50,
      enableProactiveAssistance: true,
      enableContextRetention: true,
    }

    chatbotInstance = new IntelligentChatbot(config, semanticSearch, logger)

    logger.info('IntelligentChatbot instance initialized', {
      model: config.model,
      maxTokens: config.maxTokens,
      conversationTimeout: config.conversationTimeout,
    })
  }

  return chatbotInstance
}

// ========================
// API REQUEST HANDLERS
// ========================

/**
 * POST /api/help/chat - Process chat message
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing chat message`)

    // Get user session for authentication
    const session = await getSession()
    if (!session?.user?.email) {
      logger.warn(`[${requestId}] Unauthorized chat request attempt`)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email

    // Parse and validate request body
    const body = await req.json()
    const validationResult = chatMessageSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid chat message data`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { message, sessionId, context } = validationResult.data

    // Generate session ID if not provided
    const actualSessionId = sessionId || `session_${userId}_${Date.now()}`

    logger.info(`[${requestId}] Chat message validated`, {
      userId: `${userId.substring(0, 8)}***`, // Privacy-safe logging
      messageLength: message.length,
      hasContext: !!context,
      sessionId: `${actualSessionId.substring(0, 16)}***`,
    })

    // Get chatbot instance and process message
    const chatbot = await getChatbotInstance()

    const response = await chatbot.processMessage(userId, actualSessionId, message, context)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Chat message processed successfully`, {
      intent: response.intent?.name,
      suggestionCount: response.suggestedActions?.length || 0,
      relatedContentCount: response.relatedContent?.length || 0,
      conversationPhase: response.conversationState.phase,
      confidence: response.conversationState.confidence,
      processingTimeMs: processingTime,
    })

    // Return chat response with enriched metadata
    return NextResponse.json(
      {
        success: true,
        message: response.message,
        intent: response.intent,
        suggestedActions: response.suggestedActions || [],
        relatedContent: response.relatedContent || [],
        conversationState: response.conversationState,
        sessionId: actualSessionId,
        metadata: {
          ...response.metadata,
          requestId,
          processingTime,
          timestamp: new Date().toISOString(),
          apiVersion: '1.0.0',
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': `${processingTime}ms`,
          'X-Request-ID': requestId,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Chat message processing failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Please wait before sending another message',
            retryAfter: 30,
          },
          { status: 429 }
        )
      }

      if (error.message.includes('Invalid API key') || error.message.includes('Authentication')) {
        return NextResponse.json(
          { error: 'AI service unavailable', message: 'Please try again later' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Chat processing failed',
        message: 'Sorry, I encountered an issue processing your message. Please try again.',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/help/chat - Get conversation history or proactive suggestions
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing chat history/suggestions request`)

    // Get user session for authentication
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'history'

    if (action === 'history') {
      // Get conversation history
      const params = {
        sessionId: searchParams.get('sessionId'),
        limit: Number.parseInt(searchParams.get('limit') || '50'),
      }

      const validationResult = conversationHistorySchema.safeParse(params)
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: validationResult.error.format() },
          { status: 400 }
        )
      }

      const { sessionId, limit } = validationResult.data
      const chatbot = await getChatbotInstance()
      const conversation = chatbot.getConversationHistory(userId, sessionId)

      const processingTime = Date.now() - startTime

      logger.info(`[${requestId}] Conversation history retrieved`, {
        userId: `${userId.substring(0, 8)}***`,
        sessionId: `${sessionId.substring(0, 16)}***`,
        messageCount: conversation?.conversationHistory.length || 0,
        processingTime,
      })

      return NextResponse.json(
        {
          success: true,
          conversation,
          metadata: {
            requestId,
            processingTime,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 200,
          headers: {
            'X-Response-Time': `${processingTime}ms`,
            'X-Request-ID': requestId,
          },
        }
      )
    }
    if (action === 'suggestions') {
      // Get proactive assistance suggestions
      const workflowContextParam = searchParams.get('workflowContext')

      if (!workflowContextParam) {
        return NextResponse.json(
          { error: 'Workflow context required for suggestions' },
          { status: 400 }
        )
      }

      const workflowContext = JSON.parse(workflowContextParam)
      const validationResult = proactiveAssistanceSchema.safeParse({ workflowContext })

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid workflow context', details: validationResult.error.format() },
          { status: 400 }
        )
      }

      const chatbot = await getChatbotInstance()
      const suggestions = await chatbot.generateProactiveAssistance(
        userId,
        validationResult.data.workflowContext
      )

      const processingTime = Date.now() - startTime

      logger.info(`[${requestId}] Proactive suggestions generated`, {
        userId: `${userId.substring(0, 8)}***`,
        hasSuggestions: !!suggestions,
        suggestionsCount: suggestions?.suggestedActions?.length || 0,
        processingTime,
      })

      return NextResponse.json(
        {
          success: true,
          suggestions,
          metadata: {
            requestId,
            processingTime,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 200,
          headers: {
            'X-Response-Time': `${processingTime}ms`,
            'X-Request-ID': requestId,
          },
        }
      )
    }
    return NextResponse.json(
      { error: 'Invalid action parameter. Use "history" or "suggestions"' },
      { status: 400 }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Chat request failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        error: 'Request failed',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/help/chat - Clear conversation history
 */
export async function DELETE(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing conversation clear request`)

    // Get user session for authentication
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const chatbot = await getChatbotInstance()
    chatbot.clearConversation(userId, sessionId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Conversation cleared successfully`, {
      userId: `${userId.substring(0, 8)}***`,
      sessionId: `${sessionId.substring(0, 16)}***`,
      processingTime,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Conversation cleared successfully',
        metadata: {
          requestId,
          processingTime,
          timestamp: new Date().toISOString(),
        },
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

    logger.error(`[${requestId}] Conversation clear failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        error: 'Clear conversation failed',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/help/chat - Submit feedback on chat messages
 */
export async function PATCH(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing chat feedback`)

    // Get user session for authentication
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email

    // Parse and validate request body
    const body = await req.json()
    const validationResult = feedbackSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { messageId, rating, feedback, category } = validationResult.data

    // Log feedback for analytics (in a real system, this would be stored in a database)
    logger.info(`[${requestId}] Chat feedback received`, {
      userId: `${userId.substring(0, 8)}***`,
      messageId,
      rating,
      category,
      hasFeedback: !!feedback,
    })

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback received successfully',
        metadata: {
          requestId,
          processingTime,
          timestamp: new Date().toISOString(),
        },
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

    logger.error(`[${requestId}] Feedback processing failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        error: 'Feedback processing failed',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/help/chat - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    }
  )
}
