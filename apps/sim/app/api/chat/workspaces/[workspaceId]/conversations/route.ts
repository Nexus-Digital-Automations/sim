import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserCanAccessAgent } from '@/lib/parlant/agents'
import { createConversation, getUserConversations } from '@/lib/parlant/conversations'

const logger = createLogger('ChatConversationsAPI')

/**
 * GET /api/chat/workspaces/[workspaceId]/conversations
 * Get conversations for the user in the workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '20', 10), 100)
    const agentId = searchParams.get('agent_id') || undefined
    const search = searchParams.get('search') || undefined
    const includeArchived = searchParams.get('include_archived') === 'true'

    // Get conversations from Parlant service
    const result = await getUserConversations(session.user.id, workspaceId, {
      agentId,
      page,
      limit,
      includeArchived,
    })

    // Apply search filter if provided (in production, this would be done in the service)
    let filteredConversations = result.conversations
    if (search) {
      const searchLower = search.toLowerCase()
      filteredConversations = filteredConversations.filter((conv) =>
        conv.title?.toLowerCase().includes(searchLower)
      )
    }

    logger.info('Fetched user conversations', {
      workspaceId,
      userId: session.user.id,
      agentFilter: agentId,
      page,
      limit,
      totalConversations: filteredConversations.length,
      includeArchived,
    })

    return NextResponse.json({
      conversations: filteredConversations,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error) {
    logger.error('Failed to fetch conversations', { error })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/workspaces/[workspaceId]/conversations
 * Create a new conversation with an agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { agentId, initialMessage, title } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent ID is required' },
        { status: 400 }
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

    if (initialMessage && (typeof initialMessage !== 'string' || initialMessage.length > 4000)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Initial message must be 4000 characters or less' },
        { status: 400 }
      )
    }

    if (title && (typeof title !== 'string' || title.length > 100)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Title must be 100 characters or less' },
        { status: 400 }
      )
    }

    // Create the conversation
    const conversation = await createConversation(
      session.user.id,
      agentId,
      workspaceId,
      initialMessage
    )

    if (!conversation) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Update title if provided
    if (title) {
      conversation.title = title
    }

    logger.info('Created new conversation', {
      workspaceId,
      conversationId: conversation.id,
      agentId,
      userId: session.user.id,
      hasInitialMessage: !!initialMessage,
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create conversation', { error })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
