import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserCanAccessAgent } from '@/lib/parlant/agents'
import { getUserCanAccessConversation } from '@/lib/parlant/conversations'

const logger = createLogger('ChatSessionAPI')

/**
 * POST /api/chat/session
 * Initialize a new chat session with authentication and validation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { agentId, workspaceId, conversationId } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent ID is required' },
        { status: 400 }
      )
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Validate workspace access
    const workspaceAccess = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!workspaceAccess.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Validate agent access
    const canAccessAgent = await getUserCanAccessAgent(session.user.id, agentId)
    if (!canAccessAgent) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to agent' },
        { status: 403 }
      )
    }

    // Validate conversation access if provided
    if (conversationId) {
      const canAccessConversation = await getUserCanAccessConversation(
        session.user.id,
        conversationId
      )
      if (!canAccessConversation) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to conversation' },
          { status: 403 }
        )
      }
    }

    // Generate session token for Parlant chat
    const sessionToken = await generateChatSessionToken({
      userId: session.user.id,
      agentId,
      workspaceId,
      conversationId,
      userInfo: {
        name: session.user.name || 'Unknown User',
        email: session.user.email || '',
      },
    })

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to generate session token' },
        { status: 500 }
      )
    }

    logger.info('Generated chat session token', {
      userId: session.user.id,
      agentId,
      workspaceId,
      conversationId,
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({
      token: sessionToken,
      socketUrl: env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002',
      parlantUrl: env.PARLANT_SERVER_URL || 'http://localhost:8000',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      session: {
        userId: session.user.id,
        agentId,
        workspaceId,
        conversationId,
      },
    })
  } catch (error) {
    logger.error('Failed to initialize chat session', { error })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to initialize chat session' },
      { status: 500 }
    )
  }
}

/**
 * Generate a secure session token for Parlant chat
 */
async function generateChatSessionToken(payload: {
  userId: string
  agentId: string
  workspaceId: string
  conversationId?: string
  userInfo: {
    name: string
    email: string
  }
}): Promise<string | null> {
  try {
    // In production, this would integrate with the Parlant server's token generation
    // For now, we'll create a simple JWT-like token structure

    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      iss: 'sim-chat-service',
      aud: 'parlant-server',
    }

    // In production, this would use proper JWT signing with a secret
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')

    return token
  } catch (error) {
    logger.error('Failed to generate session token', { error, payload })
    return null
  }
}
