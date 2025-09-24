import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import {
  deleteConversation,
  getConversationById,
  getConversationMessages,
  getUserCanAccessConversation,
  updateConversation,
} from '@/lib/parlant/conversations'

const logger = createLogger('ConversationAPI')

/**
 * GET /api/chat/conversations/[conversationId]
 * Get conversation details and messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user can access this conversation
    const canAccess = await getUserCanAccessConversation(session.user.id, conversationId)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to conversation' },
        { status: 403 }
      )
    }

    // Get conversation and messages
    const conversation = await getConversationById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Parse query parameters for messages
    const searchParams = request.nextUrl.searchParams
    const includeMessages = searchParams.get('include_messages') !== 'false'
    const page = Number.parseInt(searchParams.get('page') || '1')
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100)

    let messages = null
    if (includeMessages) {
      const messagesResult = await getConversationMessages(session.user.id, conversationId, {
        page,
        limit,
      })
      messages = messagesResult.messages
    }

    logger.info('Fetched conversation details', {
      conversationId,
      userId: session.user.id,
      includeMessages,
      messageCount: messages?.length || 0,
    })

    return NextResponse.json({
      conversation,
      messages,
      ...(messages && {
        pagination: {
          page,
          limit,
          total: conversation.message_count,
          totalPages: Math.ceil(conversation.message_count / limit),
        },
      }),
    })
  } catch (error) {
    logger.error('Failed to fetch conversation', { error, conversationId })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/chat/conversations/[conversationId]
 * Update conversation (title, archive status, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user can access this conversation
    const canAccess = await getUserCanAccessConversation(session.user.id, conversationId)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to conversation' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { title, is_archived, metadata } = body

    const updates: any = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.length > 100) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Title must be a string with 100 characters or less' },
          { status: 400 }
        )
      }
      updates.title = title.trim()
    }

    if (is_archived !== undefined) {
      if (typeof is_archived !== 'boolean') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'is_archived must be a boolean' },
          { status: 400 }
        )
      }
      updates.is_archived = is_archived
    }

    if (metadata !== undefined) {
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'metadata must be an object' },
          { status: 400 }
        )
      }
      updates.metadata = metadata
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the conversation
    const updatedConversation = await updateConversation(session.user.id, conversationId, updates)
    if (!updatedConversation) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    logger.info('Updated conversation', {
      conversationId,
      userId: session.user.id,
      updates: Object.keys(updates),
    })

    return NextResponse.json({ conversation: updatedConversation })
  } catch (error) {
    logger.error('Failed to update conversation', { error, conversationId })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/conversations/[conversationId]
 * Delete a conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Delete the conversation (this handles access validation internally)
    const deleted = await deleteConversation(session.user.id, conversationId)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Unable to delete conversation' },
        { status: 403 }
      )
    }

    logger.info('Deleted conversation', {
      conversationId,
      userId: session.user.id,
    })

    return NextResponse.json({ message: 'Conversation deleted successfully' }, { status: 200 })
  } catch (error) {
    logger.error('Failed to delete conversation', { error, conversationId })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
