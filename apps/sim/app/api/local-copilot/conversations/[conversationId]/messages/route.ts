/**
 * Local Copilot Conversation Messages API Endpoint
 *
 * Handles message operations within specific conversations including
 * getting message history, pagination, and message metadata.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { getConversationMessages, getUserConversation } from '@/lib/parlant/conversations'

const logger = createLogger('LocalCopilotMessagesAPI')

// Query parameters validation schema
const MessagesQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('50'),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional().default('0'),
  before: z.string().optional(), // Message ID to get messages before
  after: z.string().optional(), // Message ID to get messages after
  includeToolCalls: z
    .string()
    .transform((s) => s === 'true')
    .optional()
    .default('true'),
  includeAttachments: z
    .string()
    .transform((s) => s === 'true')
    .optional()
    .default('true'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

/**
 * GET /api/local-copilot/conversations/[conversationId]/messages
 * Get messages for a specific conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const requestId = `messages_${conversationId}_${Date.now()}`

  try {
    logger.info(`[${requestId}] Get messages request received`, { conversationId })

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const queryParams = Object.fromEntries(searchParams.entries())
    const { limit, offset, before, after, includeToolCalls, includeAttachments, sortOrder } =
      MessagesQuerySchema.parse(queryParams)

    try {
      // Get conversation first to validate access
      const conversation = await getUserConversation(session.user.id, conversationId, {
        includeMessages: false,
      })

      if (!conversation) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Conversation not found or access denied' },
          { status: 404 }
        )
      }

      // Validate workspace access
      const access = await validateWorkspaceAccess(session.user.id, conversation.workspaceId)
      if (!access.hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to workspace' },
          { status: 403 }
        )
      }

      logger.info(`[${requestId}] Messages request validated`, {
        conversationId,
        userId: session.user.id,
        workspaceId: conversation.workspaceId,
        limit,
        offset,
      })

      // Get messages from Parlant service
      const messagesResult = await getConversationMessages(conversationId, session.user.id, {
        limit,
        offset,
        before,
        after,
        sortOrder,
      })

      if (!messagesResult) {
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Failed to retrieve messages',
            requestId,
          },
          { status: 500 }
        )
      }

      const messages = messagesResult.messages || []

      // Enhance messages with local copilot metadata
      const enhancedMessages = messages.map((message: any) => {
        const enhancedMessage: any = {
          ...message,
          isLocalCopilot: true,
          agentId: conversation.agentId,
          agentName: conversation.agentName,
          conversationId,
        }

        // Filter tool calls if requested
        if (!includeToolCalls && enhancedMessage.toolCalls) {
          enhancedMessage.toolCalls = undefined
        }

        // Filter attachments if requested
        if (!includeAttachments && enhancedMessage.fileAttachments) {
          enhancedMessage.fileAttachments = undefined
        }

        // Add message metadata
        enhancedMessage.metadata = {
          ...enhancedMessage.metadata,
          source: 'local-copilot',
          enhanced: true,
        }

        return enhancedMessage
      })

      // Calculate pagination info
      const hasMore = messages.length === limit
      const nextOffset = offset + messages.length
      const totalEstimate = hasMore ? nextOffset + 1 : nextOffset // Rough estimate

      logger.info(`[${requestId}] Successfully retrieved messages`, {
        conversationId,
        messageCount: enhancedMessages.length,
        hasMore,
        nextOffset,
      })

      return NextResponse.json({
        success: true,
        messages: enhancedMessages,
        pagination: {
          limit,
          offset,
          count: enhancedMessages.length,
          hasMore,
          nextOffset: hasMore ? nextOffset : null,
          totalEstimate,
        },
        conversation: {
          id: conversation.id,
          title: conversation.title,
          agentId: conversation.agentId,
          agentName: conversation.agentName,
          workspaceId: conversation.workspaceId,
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
          includeToolCalls,
          includeAttachments,
        },
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to retrieve messages:`, error)

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Conversation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to retrieve messages',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Get messages error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to format messages for response
 */
function formatMessageForResponse(
  message: any,
  options: {
    includeToolCalls: boolean
    includeAttachments: boolean
    conversationId: string
    agentId?: string
    agentName?: string
  }
) {
  const formatted: any = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    conversationId: options.conversationId,
    isLocalCopilot: true,
  }

  // Add agent information for assistant messages
  if (message.role === 'assistant' && options.agentId) {
    formatted.agentId = options.agentId
    formatted.agentName = options.agentName
  }

  // Add tool calls if requested and available
  if (options.includeToolCalls && message.toolCalls) {
    formatted.toolCalls = message.toolCalls.map((toolCall: any) => ({
      ...toolCall,
      source: 'local-copilot',
      agentId: options.agentId,
    }))
  }

  // Add file attachments if requested and available
  if (options.includeAttachments && message.fileAttachments) {
    formatted.fileAttachments = message.fileAttachments
  }

  // Add contexts if available
  if (message.contexts) {
    formatted.contexts = message.contexts
  }

  // Add content blocks if available
  if (message.contentBlocks) {
    formatted.contentBlocks = message.contentBlocks
  }

  // Add streaming state if available
  if (message.isStreaming !== undefined) {
    formatted.isStreaming = message.isStreaming
  }

  if (message.streamingComplete !== undefined) {
    formatted.streamingComplete = message.streamingComplete
  }

  // Add metadata
  formatted.metadata = {
    ...message.metadata,
    source: 'local-copilot',
    enhanced: true,
  }

  return formatted
}

/**
 * Helper function to validate message access
 */
async function validateMessageAccess(
  userId: string,
  conversationId: string,
  messageId?: string
): Promise<{ conversation: any; hasAccess: boolean; error?: string }> {
  try {
    // Get conversation to validate access
    const conversation = await getUserConversation(userId, conversationId, {
      includeMessages: false,
    })

    if (!conversation) {
      return {
        conversation: null,
        hasAccess: false,
        error: 'Conversation not found or access denied',
      }
    }

    // Validate workspace access
    const access = await validateWorkspaceAccess(userId, conversation.workspaceId)
    if (!access.hasAccess) {
      return {
        conversation,
        hasAccess: false,
        error: 'Access denied to workspace',
      }
    }

    // If specific message ID is provided, verify it belongs to the conversation
    if (messageId) {
      const messagesResult = await getConversationMessages(conversationId, userId, {
        limit: 1,
        messageId,
      })

      if (!messagesResult?.messages?.length) {
        return {
          conversation,
          hasAccess: false,
          error: 'Message not found in conversation',
        }
      }
    }

    return {
      conversation,
      hasAccess: true,
    }
  } catch (error) {
    return {
      conversation: null,
      hasAccess: false,
      error: `Access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
