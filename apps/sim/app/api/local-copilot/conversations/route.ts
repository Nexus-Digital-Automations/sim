/**
 * Local Copilot Conversations API Endpoint
 *
 * Handles conversation management for the local copilot system.
 * Provides endpoints to list, create, and manage conversations
 * between users and Parlant agents.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserCanAccessAgent } from '@/lib/parlant/agents'
import { createConversation, getUserConversations } from '@/lib/parlant/conversations'
import { agentService } from '@/services/parlant/agent-service'

const logger = createLogger('LocalCopilotConversationsAPI')

// Query parameters validation schema
const ConversationsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  agentId: z.string().optional(),
  search: z.string().optional(),
  includeArchived: z
    .string()
    .transform((s) => s === 'true')
    .optional()
    .default('false'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  sortBy: z.enum(['created_at', 'updated_at', 'last_active']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Create conversation request schema
const CreateConversationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  initialMessage: z.string().optional(),
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
})

/**
 * GET /api/local-copilot/conversations
 * Get conversations for the user in the workspace
 */
export async function GET(req: NextRequest) {
  const requestId = `conversations_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    logger.info(`[${requestId}] Local copilot conversations request received`)

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
    const { workspaceId, agentId, search, includeArchived, limit, page, sortBy, sortOrder } =
      ConversationsQuerySchema.parse(queryParams)

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Conversations request validated`, {
      userId: session.user.id,
      workspaceId,
      agentId,
      search,
      includeArchived,
      limit,
      page,
    })

    try {
      // Get conversations from Parlant service
      const conversationsResult = await getUserConversations(session.user.id, workspaceId, {
        agentId,
        page,
        limit,
        includeArchived,
      })

      let filteredConversations = conversationsResult.conversations || []

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase()
        filteredConversations = filteredConversations.filter(
          (conv: any) =>
            conv.title?.toLowerCase().includes(searchLower) ||
            conv.agentName?.toLowerCase().includes(searchLower) ||
            conv.lastMessage?.toLowerCase().includes(searchLower)
        )
      }

      // Sort conversations
      filteredConversations.sort((a: any, b: any) => {
        let aValue
        let bValue

        switch (sortBy) {
          case 'created_at':
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
          case 'updated_at':
            aValue = new Date(a.updatedAt).getTime()
            bValue = new Date(b.updatedAt).getTime()
            break
          case 'last_active':
            aValue = new Date(a.lastActiveAt || a.updatedAt).getTime()
            bValue = new Date(b.lastActiveAt || b.updatedAt).getTime()
            break
          default:
            aValue = new Date(a.updatedAt).getTime()
            bValue = new Date(b.updatedAt).getTime()
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      })

      // Apply pagination
      const startIndex = (page - 1) * limit
      const paginatedConversations = filteredConversations.slice(startIndex, startIndex + limit)

      // Enhance conversations with additional metadata
      const enhancedConversations = await Promise.all(
        paginatedConversations.map(async (conversation: any) => {
          try {
            // Get agent information if not already included
            let agentInfo = null
            if (conversation.agentId && !conversation.agentName) {
              try {
                const agentResponse = await agentService.getAgent(conversation.agentId, {
                  user_id: session.user.id,
                  workspace_id: workspaceId,
                })
                if (agentResponse.success) {
                  agentInfo = agentResponse.data
                }
              } catch (error) {
                logger.warn(
                  `[${requestId}] Failed to get agent info for conversation ${conversation.id}:`,
                  error
                )
              }
            }

            return {
              ...conversation,
              agentName: conversation.agentName || agentInfo?.name || 'Unknown Agent',
              agentStatus: agentInfo?.status || 'unknown',
              messageCount: conversation.messages?.length || conversation.messageCount || 0,
              lastMessage:
                conversation.messages?.length > 0
                  ? `${conversation.messages[conversation.messages.length - 1].content.substring(0, 100)}...`
                  : null,
              isLocalCopilot: true,
            }
          } catch (error) {
            logger.warn(`[${requestId}] Failed to enhance conversation ${conversation.id}:`, error)
            return {
              ...conversation,
              agentName: conversation.agentName || 'Unknown Agent',
              messageCount: conversation.messageCount || 0,
              lastMessage: null,
              isLocalCopilot: true,
            }
          }
        })
      )

      logger.info(`[${requestId}] Successfully retrieved conversations`, {
        totalConversations: filteredConversations.length,
        returnedConversations: enhancedConversations.length,
        workspaceId,
      })

      return NextResponse.json({
        success: true,
        conversations: enhancedConversations,
        pagination: {
          page,
          limit,
          total: filteredConversations.length,
          totalPages: Math.ceil(filteredConversations.length / limit),
          hasMore: startIndex + limit < filteredConversations.length,
        },
        metadata: {
          requestId,
          workspaceId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
        },
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to retrieve conversations:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to retrieve conversations',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Local copilot conversations error:`, {
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
 * POST /api/local-copilot/conversations
 * Create a new conversation with an agent
 */
export async function POST(req: NextRequest) {
  const requestId = `create_conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    logger.info(`[${requestId}] Create conversation request received`)

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const { agentId, workspaceId, initialMessage, title } = CreateConversationSchema.parse(body)

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Verify user has access to the agent
    const canAccessAgent = await getUserCanAccessAgent(session.user.id, agentId)
    if (!canAccessAgent) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to agent' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Create conversation validated`, {
      userId: session.user.id,
      workspaceId,
      agentId,
      hasInitialMessage: !!initialMessage,
      hasTitle: !!title,
    })

    try {
      // Get agent information for metadata
      const agentResponse = await agentService.getAgent(agentId, {
        user_id: session.user.id,
        workspace_id: workspaceId,
      })

      if (!agentResponse.success || !agentResponse.data) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Agent not found or access denied' },
          { status: 404 }
        )
      }

      const agent = agentResponse.data

      // Create conversation using Parlant service
      const conversation = await createConversation(
        session.user.id,
        agentId,
        workspaceId,
        initialMessage,
        {
          title,
          source: 'local-copilot',
          agentName: agent.name,
          agentCapabilities: agent.tools || [],
        }
      )

      if (!conversation) {
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to create conversation' },
          { status: 500 }
        )
      }

      // Enhance conversation with additional data
      const enhancedConversation = {
        ...conversation,
        agentName: agent.name,
        agentStatus: agent.status,
        agentCapabilities: agent.tools || [],
        messageCount: conversation.messages?.length || 0,
        isLocalCopilot: true,
        lastActiveAt: new Date().toISOString(),
      }

      logger.info(`[${requestId}] Successfully created conversation`, {
        conversationId: conversation.id,
        agentId,
        agentName: agent.name,
        workspaceId,
      })

      return NextResponse.json(
        {
          success: true,
          conversation: enhancedConversation,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            source: 'local-copilot',
          },
        },
        { status: 201 }
      )
    } catch (error) {
      logger.error(`[${requestId}] Failed to create conversation:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create conversation',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Create conversation error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
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
 * Helper function to format conversations for response
 */
function formatConversationForResponse(conversation: any, agent?: any) {
  return {
    id: conversation.id,
    title: conversation.title,
    agentId: conversation.agentId,
    agentName: agent?.name || conversation.agentName || 'Unknown Agent',
    workspaceId: conversation.workspaceId,
    userId: conversation.userId,
    messages: conversation.messages || [],
    messageCount: conversation.messages?.length || conversation.messageCount || 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastActiveAt: conversation.lastActiveAt || conversation.updatedAt,
    isArchived: conversation.isArchived || false,
    metadata: {
      ...conversation.metadata,
      isLocalCopilot: true,
      agentStatus: agent?.status,
      agentCapabilities: agent?.tools || [],
    },
    lastMessage:
      conversation.messages?.length > 0
        ? {
            role: conversation.messages[conversation.messages.length - 1].role,
            content: `${conversation.messages[conversation.messages.length - 1].content.substring(0, 100)}...`,
            timestamp: conversation.messages[conversation.messages.length - 1].timestamp,
          }
        : null,
  }
}
