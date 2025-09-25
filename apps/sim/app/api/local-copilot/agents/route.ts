/**
 * Local Copilot Agents API Endpoint
 *
 * Handles agent discovery and management for the local copilot system.
 * Provides endpoints to list available Parlant agents, get agent details,
 * and manage agent preferences within workspace context.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { agentService } from '@/services/parlant/agent-service'

const logger = createLogger('LocalCopilotAgentsAPI')

// Query parameters validation schema
const AgentsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'training']).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('50'),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  includeCapabilities: z.string().transform(s => s === 'true').optional().default('true'),
  sortBy: z.enum(['name', 'created_at', 'updated_at', 'last_used']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

/**
 * GET /api/local-copilot/agents
 * Get available Parlant agents for the workspace
 */
export async function GET(req: NextRequest) {
  const requestId = `agents_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    logger.info(`[${requestId}] Local copilot agents request received`)

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
    const {
      workspaceId,
      search,
      status,
      limit,
      page,
      includeCapabilities,
      sortBy,
      sortOrder,
    } = AgentsQuerySchema.parse(queryParams)

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Agents request validated`, {
      userId: session.user.id,
      workspaceId,
      search,
      status,
      limit,
      page,
    })

    try {
      // Get agents from Parlant service
      const agentsResponse = await agentService.listAgents(
        {
          workspace_id: workspaceId,
          search,
          status,
          limit,
          offset: (page - 1) * limit,
          sortBy,
          sortOrder,
        },
        {
          user_id: session.user.id,
          workspace_id: workspaceId,
        }
      )

      if (!agentsResponse.success) {
        logger.error(`[${requestId}] Failed to list agents from Parlant service`)
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to retrieve agents' },
          { status: 500 }
        )
      }

      const agents = agentsResponse.data || []

      // Filter active agents only for local copilot
      const activeAgents = agents.filter(agent => agent.is_active && agent.status === 'active')

      // Enhance agents with local copilot specific data
      const enhancedAgents = await Promise.all(
        activeAgents.map(async (agent) => {
          try {
            // Get additional agent metadata if needed
            const capabilities = includeCapabilities
              ? await getAgentCapabilities(agent, requestId)
              : []

            // Get usage statistics (simplified for now)
            const stats = await getAgentUsageStats(agent.id, workspaceId, requestId)

            return {
              ...agent,
              capabilities,
              stats,
              isLocalCopilotCompatible: true,
              lastUsed: stats.lastUsed || null,
              conversationCount: stats.conversationCount || 0,
              avgResponseTime: stats.avgResponseTime || null,
              toolsAvailable: agent.tools || [],
              description: agent.description || `AI agent specialized in ${agent.name.toLowerCase()} tasks`,
            }
          } catch (error) {
            logger.warn(`[${requestId}] Failed to enhance agent ${agent.id}:`, error)
            return {
              ...agent,
              capabilities: [],
              stats: { conversationCount: 0 },
              isLocalCopilotCompatible: true,
              lastUsed: null,
              conversationCount: 0,
              avgResponseTime: null,
              toolsAvailable: agent.tools || [],
              description: agent.description || `AI agent for ${agent.name.toLowerCase()}`,
            }
          }
        })
      )

      logger.info(`[${requestId}] Successfully retrieved agents`, {
        totalAgents: agents.length,
        activeAgents: enhancedAgents.length,
        workspaceId,
      })

      return NextResponse.json({
        success: true,
        agents: enhancedAgents,
        pagination: {
          page,
          limit,
          total: enhancedAgents.length,
          totalPages: Math.ceil(enhancedAgents.length / limit),
          hasMore: enhancedAgents.length === limit,
        },
        metadata: {
          requestId,
          workspaceId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
        },
      })

    } catch (error) {
      logger.error(`[${requestId}] Failed to retrieve agents from Parlant:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to retrieve agents from Parlant service',
          requestId,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error(`[${requestId}] Local copilot agents error:`, {
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
 * Helper function to get agent capabilities
 */
async function getAgentCapabilities(agent: any, requestId: string): Promise<string[]> {
  try {
    // Extract capabilities from agent configuration
    const capabilities: string[] = []

    // Add tool-based capabilities
    if (agent.tools && Array.isArray(agent.tools)) {
      agent.tools.forEach((tool: string) => {
        switch (tool) {
          case 'file_manager':
            capabilities.push('File Management', 'Document Processing')
            break
          case 'workflow_analyzer':
            capabilities.push('Workflow Analysis', 'Process Optimization')
            break
          case 'code_generator':
            capabilities.push('Code Generation', 'Programming Assistance')
            break
          case 'data_analyzer':
            capabilities.push('Data Analysis', 'Insights Generation')
            break
          case 'openai_api':
            capabilities.push('AI Integration', 'Natural Language Processing')
            break
          case 'github_api':
            capabilities.push('Code Repository Management', 'Version Control')
            break
          case 'slack_api':
            capabilities.push('Team Communication', 'Notifications')
            break
          case 'postgresql_api':
            capabilities.push('Database Management', 'Data Operations')
            break
          case 'google_sheets_api':
            capabilities.push('Spreadsheet Management', 'Data Export/Import')
            break
          default:
            capabilities.push(`${tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
        }
      })
    }

    // Add guideline-based capabilities
    if (agent.guidelines && Array.isArray(agent.guidelines)) {
      agent.guidelines.forEach((guideline: any) => {
        if (guideline.condition?.includes('workflow')) {
          capabilities.push('Workflow Guidance')
        }
        if (guideline.condition?.includes('code')) {
          capabilities.push('Code Review')
        }
        if (guideline.condition?.includes('data')) {
          capabilities.push('Data Processing')
        }
      })
    }

    // Remove duplicates and sort
    return [...new Set(capabilities)].sort()

  } catch (error) {
    logger.warn(`[${requestId}] Failed to extract capabilities for agent ${agent.id}:`, error)
    return []
  }
}

/**
 * Helper function to get agent usage statistics
 */
async function getAgentUsageStats(agentId: string, workspaceId: string, requestId: string): Promise<{
  conversationCount: number
  lastUsed: string | null
  avgResponseTime: number | null
}> {
  try {
    // In a real implementation, this would query the database for actual stats
    // For now, return placeholder data

    // TODO: Implement actual stats collection from:
    // - Conversation history
    // - Response time tracking
    // - Usage analytics

    return {
      conversationCount: Math.floor(Math.random() * 50), // Placeholder
      lastUsed: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      avgResponseTime: Math.random() > 0.5 ? Math.floor(Math.random() * 3000) + 500 : null, // 500-3500ms
    }

  } catch (error) {
    logger.warn(`[${requestId}] Failed to get usage stats for agent ${agentId}:`, error)
    return {
      conversationCount: 0,
      lastUsed: null,
      avgResponseTime: null,
    }
  }
}

/**
 * POST /api/local-copilot/agents
 * Create a new agent for the workspace (if user has permissions)
 */
export async function POST(req: NextRequest) {
  const requestId = `create_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    logger.info(`[${requestId}] Create agent request received`)

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { name, description, workspaceId, tools, guidelines } = body

    // Validate workspace access and permissions
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Check if user has agent creation permissions (admin or owner)
    if (!['admin', 'owner'].includes(access.role || '')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to create agents' },
        { status: 403 }
      )
    }

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Agent name is required' },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Creating agent`, {
      name: name.trim(),
      workspaceId,
      userId: session.user.id,
      hasTools: !!tools?.length,
      hasGuidelines: !!guidelines?.length,
    })

    try {
      // Create agent using Parlant service
      const createResponse = await agentService.createAgent(
        {
          name: name.trim(),
          description: description?.trim(),
          workspace_id: workspaceId,
          tools: tools || [],
          guidelines: guidelines || [],
          config: {
            local_copilot_enabled: true,
            created_via: 'local-copilot',
          },
        },
        {
          user_id: session.user.id,
          workspace_id: workspaceId,
        }
      )

      if (!createResponse.success || !createResponse.data) {
        logger.error(`[${requestId}] Failed to create agent via Parlant service`)
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to create agent' },
          { status: 500 }
        )
      }

      const agent = createResponse.data

      logger.info(`[${requestId}] Successfully created agent`, {
        agentId: agent.id,
        agentName: agent.name,
        workspaceId,
      })

      return NextResponse.json({
        success: true,
        agent: {
          ...agent,
          capabilities: await getAgentCapabilities(agent, requestId),
          stats: { conversationCount: 0 },
          isLocalCopilotCompatible: true,
          lastUsed: null,
          conversationCount: 0,
          avgResponseTime: null,
          toolsAvailable: agent.tools || [],
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          source: 'local-copilot',
        },
      }, { status: 201 })

    } catch (error) {
      logger.error(`[${requestId}] Failed to create agent:`, error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create agent',
          requestId,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error(`[${requestId}] Create agent error:`, {
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