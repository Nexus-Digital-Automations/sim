import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { createAgent, getUserAccessibleAgents } from '@/lib/parlant/agents'

const logger = createLogger('ChatAgentsAPI')

/**
 * GET /api/chat/workspaces/[workspaceId]/agents
 * Get all agents accessible to the user in the workspace
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
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 100)
    const search = searchParams.get('search') || undefined

    // Get agents from Parlant service
    const agents = await getUserAccessibleAgents(session.user.id, workspaceId)

    // Apply client-side filtering (in production, this would be done in the service)
    let filteredAgents = agents.filter((agent) => agent.is_active)

    if (search) {
      const searchLower = search.toLowerCase()
      filteredAgents = filteredAgents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description?.toLowerCase().includes(searchLower)
      )
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex)

    logger.info('Fetched workspace agents', {
      workspaceId,
      userId: session.user.id,
      totalAgents: filteredAgents.length,
      returnedAgents: paginatedAgents.length,
      page,
      limit,
    })

    return NextResponse.json({
      agents: paginatedAgents,
      pagination: {
        page,
        limit,
        total: filteredAgents.length,
        totalPages: Math.ceil(filteredAgents.length / limit),
      },
    })
  } catch (error) {
    logger.error('Failed to fetch workspace agents', { error })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/workspaces/[workspaceId]/agents
 * Create a new agent in the workspace
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

    // Check if user has permission to create agents (admin or owner)
    if (!['admin', 'owner'].includes(access.role || '')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to create agents' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { name, description, guidelines, tools } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent name must be 100 characters or less' },
        { status: 400 }
      )
    }

    if (description && (typeof description !== 'string' || description.length > 500)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent description must be 500 characters or less' },
        { status: 400 }
      )
    }

    if (tools && (!Array.isArray(tools) || tools.length > 50)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Tools must be an array with maximum 50 items' },
        { status: 400 }
      )
    }

    // Create the agent
    const agent = await createAgent(session.user.id, workspaceId, {
      name: name.trim(),
      description: description?.trim(),
      guidelines,
      tools,
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create agent' },
        { status: 500 }
      )
    }

    logger.info('Created new agent', {
      workspaceId,
      agentId: agent.id,
      agentName: agent.name,
      createdBy: session.user.id,
    })

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create agent', { error })
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
