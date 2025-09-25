/**
 * Local Copilot Individual Conversation API Endpoint
 *
 * Handles operations on specific conversations including getting conversation details,
 * updating conversation metadata, archiving/deleting conversations, and managing messages.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import {
  archiveConversation,
  deleteConversation,
  getUserConversation,
  updateConversation,
} from '@/lib/parlant/conversations'
import { agentService } from '@/services/parlant/agent-service'

const logger = createLogger('LocalCopilotConversationAPI')

// Update conversation request schema
const UpdateConversationSchema = z.object({
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
  isArchived: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/local-copilot/conversations/[conversationId]
 * Get details of a specific conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const requestId = `get_conversation_${conversationId}_${Date.now()}`

  try {
    logger.info(`[${requestId}] Get conversation request received`, { conversationId })

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const includeMessages = searchParams.get('includeMessages') !== 'false'
    const messageLimit = Number.parseInt(searchParams.get('messageLimit') || '50')
    const messageOffset = Number.parseInt(searchParams.get('messageOffset') || '0')

    try {
      // Get conversation from Parlant service
      const conversation = await getUserConversation(session.user.id, conversationId, {
        includeMessages,
        messageLimit,
        messageOffset,
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

      // Get agent information
      let agentInfo = null
      if (conversation.agentId) {
        try {
          const agentResponse = await agentService.getAgent(conversation.agentId, {
            user_id: session.user.id,
            workspace_id: conversation.workspaceId,
          })
          if (agentResponse.success) {
            agentInfo = agentResponse.data
          }
        } catch (error) {
          logger.warn(`[${requestId}] Failed to get agent info:`, error)
        }
      }

      // Enhance conversation with additional metadata
      const enhancedConversation = {
        ...conversation,
        agentName: agentInfo?.name || conversation.agentName || 'Unknown Agent',
        agentStatus: agentInfo?.status || 'unknown',
        agentCapabilities: agentInfo?.tools || [],
        messageCount: conversation.messages?.length || conversation.messageCount || 0,
        isLocalCopilot: true,
        agent: agentInfo
          ? {
              id: agentInfo.id,
              name: agentInfo.name,
              description: agentInfo.description,
              status: agentInfo.status,
              tools: agentInfo.tools || [],
              capabilities:
                agentInfo.tools?.map((tool: string) =>
                  tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                ) || [],
            }
          : null,
      }

      logger.info(`[${requestId}] Successfully retrieved conversation`, {
        conversationId,
        messageCount: enhancedConversation.messageCount,
        agentName: enhancedConversation.agentName,
      })

      return NextResponse.json({
        success: true,
        conversation: enhancedConversation,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
        },
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to retrieve conversation:`, error)

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Conversation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to retrieve conversation',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Get conversation error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

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
 * PATCH /api/local-copilot/conversations/[conversationId]
 * Update conversation metadata (title, archive status, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const requestId = `update_conversation_${conversationId}_${Date.now()}`

  try {
    logger.info(`[${requestId}] Update conversation request received`, { conversationId })

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
    const updates = UpdateConversationSchema.parse(body)

    // Get existing conversation to validate access
    const existingConversation = await getUserConversation(session.user.id, conversationId)
    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, existingConversation.workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Update conversation validated`, {
      conversationId,
      updates: Object.keys(updates),
    })

    try {
      // Handle archive operation separately if requested
      if (updates.isArchived !== undefined) {
        if (updates.isArchived) {
          await archiveConversation(conversationId, session.user.id)
          logger.info(`[${requestId}] Conversation archived`, { conversationId })
        } else {
          // Unarchive - update metadata directly
          await updateConversation(conversationId, { isArchived: false }, session.user.id)
          logger.info(`[${requestId}] Conversation unarchived`, { conversationId })
        }
      }

      // Update other fields
      const otherUpdates = { ...updates }
      otherUpdates.isArchived = undefined

      if (Object.keys(otherUpdates).length > 0) {
        await updateConversation(conversationId, otherUpdates, session.user.id)
        logger.info(`[${requestId}] Conversation updated`, {
          conversationId,
          updatedFields: Object.keys(otherUpdates),
        })
      }

      // Get updated conversation
      const updatedConversation = await getUserConversation(session.user.id, conversationId, {
        includeMessages: false,
      })

      if (!updatedConversation) {
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to retrieve updated conversation' },
          { status: 500 }
        )
      }

      // Get agent information for enhanced response
      let agentInfo = null
      if (updatedConversation.agentId) {
        try {
          const agentResponse = await agentService.getAgent(updatedConversation.agentId, {
            user_id: session.user.id,
            workspace_id: updatedConversation.workspaceId,
          })
          if (agentResponse.success) {
            agentInfo = agentResponse.data
          }
        } catch (error) {
          logger.warn(`[${requestId}] Failed to get agent info for updated conversation:`, error)
        }
      }

      const enhancedConversation = {
        ...updatedConversation,
        agentName: agentInfo?.name || updatedConversation.agentName || 'Unknown Agent',
        agentStatus: agentInfo?.status || 'unknown',
        isLocalCopilot: true,
      }

      return NextResponse.json({
        success: true,
        conversation: enhancedConversation,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
          updatedFields: Object.keys(updates),
        },
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to update conversation:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update conversation',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Update conversation error:`, {
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
 * DELETE /api/local-copilot/conversations/[conversationId]
 * Delete a conversation permanently
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const requestId = `delete_conversation_${conversationId}_${Date.now()}`

  try {
    logger.info(`[${requestId}] Delete conversation request received`, { conversationId })

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get existing conversation to validate access
    const existingConversation = await getUserConversation(session.user.id, conversationId, {
      includeMessages: false,
    })

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, existingConversation.workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Delete conversation validated`, {
      conversationId,
      workspaceId: existingConversation.workspaceId,
    })

    try {
      // Delete conversation using Parlant service
      await deleteConversation(conversationId, session.user.id)

      logger.info(`[${requestId}] Successfully deleted conversation`, { conversationId })

      return NextResponse.json({
        success: true,
        message: 'Conversation deleted successfully',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
          deletedConversationId: conversationId,
        },
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to delete conversation:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to delete conversation',
          requestId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`[${requestId}] Delete conversation error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}
