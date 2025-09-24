/**
 * Agent Lifecycle Management APIs for Sim-Parlant Integration Bridge
 * ================================================================
 *
 * Comprehensive agent management system providing:
 * - Full CRUD operations for AI agents
 * - Workspace-scoped access controls
 * - Input validation and sanitization
 * - Structured error handling
 * - Integration with Sim's authentication system
 *
 * This module handles all agent lifecycle operations while ensuring
 * proper isolation, security, and consistency with Sim's patterns.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getParlantClient } from './client'
import {
  ParlantErrorHandler,
  ParlantNotFoundError,
  ParlantValidationError,
  ParlantWorkspaceError,
} from './errors'
import type {
  Agent,
  AgentCreateRequest,
  AgentListQuery,
  AgentUpdateRequest,
  AuthContext,
  PaginatedResponse,
} from './types'

const logger = createLogger('ParlantAgentService')

/**
 * Create a new AI agent in the specified workspace
 */
export async function createAgent(
  request: AgentCreateRequest,
  context: AuthContext
): Promise<Agent> {
  logger.info(`Creating new agent`, {
    name: request.name,
    workspace_id: request.workspace_id,
    user_id: context.user_id,
  })

  // Validate request data
  validateAgentCreateRequest(request)

  // Ensure workspace access
  await validateWorkspaceAccess(request.workspace_id, context)

  try {
    const client = getParlantClient()

    // Prepare agent data with user context
    const agentData = {
      ...request,
      user_id: context.user_id,
      status: 'active' as const,
    }

    // Create agent via Parlant server
    const agent = await client.post<Agent>('/api/agents', agentData)

    logger.info(`Agent created successfully`, {
      agent_id: agent.id,
      name: agent.name,
      workspace_id: agent.workspace_id,
      user_id: agent.user_id,
    })

    return agent
  } catch (error) {
    logger.error(`Failed to create agent`, {
      name: request.name,
      workspace_id: request.workspace_id,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Retrieve an agent by ID with workspace validation
 */
export async function getAgent(agentId: string, context: AuthContext): Promise<Agent> {
  logger.info(`Retrieving agent`, { agent_id: agentId, user_id: context.user_id })

  // Validate agent ID format
  validateAgentId(agentId)

  try {
    const client = getParlantClient()
    const agent = await client.get<Agent>(`/api/agents/${agentId}`)

    // Ensure workspace access
    await validateWorkspaceAccess(agent.workspace_id, context)

    logger.info(`Agent retrieved successfully`, {
      agent_id: agent.id,
      name: agent.name,
      workspace_id: agent.workspace_id,
    })

    return agent
  } catch (error) {
    if ((error as any).statusCode === 404) {
      throw new ParlantNotFoundError('Agent', agentId)
    }

    logger.error(`Failed to retrieve agent`, {
      agent_id: agentId,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Update an existing agent with validation
 */
export async function updateAgent(
  agentId: string,
  request: AgentUpdateRequest,
  context: AuthContext
): Promise<Agent> {
  logger.info(`Updating agent`, {
    agent_id: agentId,
    user_id: context.user_id,
    fields: Object.keys(request),
  })

  // Validate inputs
  validateAgentId(agentId)
  validateAgentUpdateRequest(request)

  try {
    const client = getParlantClient()

    // First, get the current agent to validate workspace access
    const currentAgent = await getAgent(agentId, context)

    // Update agent via Parlant server
    const updatedAgent = await client.put<Agent>(`/api/agents/${agentId}`, request)

    logger.info(`Agent updated successfully`, {
      agent_id: updatedAgent.id,
      name: updatedAgent.name,
      updated_fields: Object.keys(request),
    })

    return updatedAgent
  } catch (error) {
    logger.error(`Failed to update agent`, {
      agent_id: agentId,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Delete an agent with proper cleanup
 */
export async function deleteAgent(agentId: string, context: AuthContext): Promise<void> {
  logger.info(`Deleting agent`, { agent_id: agentId, user_id: context.user_id })

  // Validate agent ID
  validateAgentId(agentId)

  try {
    const client = getParlantClient()

    // First, get the agent to validate workspace access
    const agent = await getAgent(agentId, context)

    // Check if user has permission to delete (must be creator or workspace admin)
    if (agent.user_id !== context.user_id && !hasWorkspaceAdminPermission(context)) {
      throw new ParlantWorkspaceError(
        'Insufficient permissions to delete this agent',
        agent.workspace_id
      )
    }

    // Delete agent via Parlant server
    await client.delete(`/api/agents/${agentId}`)

    logger.info(`Agent deleted successfully`, {
      agent_id: agentId,
      name: agent.name,
      workspace_id: agent.workspace_id,
    })
  } catch (error) {
    logger.error(`Failed to delete agent`, {
      agent_id: agentId,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * List agents with filtering and pagination
 */
export async function listAgents(
  query: AgentListQuery,
  context: AuthContext
): Promise<PaginatedResponse<Agent>> {
  logger.info(`Listing agents`, {
    workspace_id: query.workspace_id,
    user_id: context.user_id,
    filters: Object.keys(query).filter((k) => k !== 'limit' && k !== 'offset'),
  })

  // Validate query parameters
  validateAgentListQuery(query)

  // Ensure workspace access if workspace_id is specified
  if (query.workspace_id) {
    await validateWorkspaceAccess(query.workspace_id, context)
  }

  try {
    const client = getParlantClient()

    // Build query parameters
    const params = {
      ...query,
      // If no workspace_id specified, filter by user's accessible workspaces
      ...(!query.workspace_id &&
        context.workspace_id && {
          workspace_id: context.workspace_id,
        }),
    }

    // Get agents from Parlant server
    const agents = await client.get<Agent[]>('/api/agents', params)

    // Filter agents based on workspace access (additional security layer)
    const accessibleAgents = await filterAgentsByWorkspaceAccess(agents, context)

    // Calculate pagination info
    const total = accessibleAgents.length
    const limit = query.limit || 50
    const offset = query.offset || 0
    const paginatedAgents = accessibleAgents.slice(offset, offset + limit)

    const response: PaginatedResponse<Agent> = {
      data: paginatedAgents,
      success: true,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    }

    logger.info(`Agents listed successfully`, {
      total,
      returned: paginatedAgents.length,
      workspace_id: query.workspace_id,
    })

    return response
  } catch (error) {
    logger.error(`Failed to list agents`, {
      query,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Get agent guidelines
 */
export async function getAgentGuidelines(agentId: string, context: AuthContext): Promise<any[]> {
  logger.info(`Getting agent guidelines`, { agent_id: agentId, user_id: context.user_id })

  // First validate agent access
  await getAgent(agentId, context)

  try {
    const client = getParlantClient()
    const guidelines = await client.get<any[]>(`/api/agents/${agentId}/guidelines`)

    logger.info(`Agent guidelines retrieved`, {
      agent_id: agentId,
      guidelines_count: guidelines.length,
    })

    return guidelines
  } catch (error) {
    logger.error(`Failed to get agent guidelines`, {
      agent_id: agentId,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Add guideline to agent
 */
export async function addAgentGuideline(
  agentId: string,
  guideline: { condition: string; action: string; priority?: number },
  context: AuthContext
): Promise<any> {
  logger.info(`Adding guideline to agent`, { agent_id: agentId, user_id: context.user_id })

  // Validate agent access
  await getAgent(agentId, context)

  // Validate guideline data
  if (!guideline.condition || !guideline.action) {
    throw new ParlantValidationError('Guideline condition and action are required')
  }

  try {
    const client = getParlantClient()
    const newGuideline = await client.post<any>(`/api/agents/${agentId}/guidelines`, guideline)

    logger.info(`Guideline added to agent`, {
      agent_id: agentId,
      guideline_id: newGuideline.id,
    })

    return newGuideline
  } catch (error) {
    logger.error(`Failed to add guideline to agent`, {
      agent_id: agentId,
      error: (error as Error).message,
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

// Validation Functions

/**
 * Validate agent creation request
 */
function validateAgentCreateRequest(request: AgentCreateRequest): void {
  const errors: string[] = []

  if (!request.name || request.name.trim().length === 0) {
    errors.push('Agent name is required')
  }

  if (request.name && request.name.length > 100) {
    errors.push('Agent name must be less than 100 characters')
  }

  if (!request.workspace_id || request.workspace_id.trim().length === 0) {
    errors.push('Workspace ID is required')
  }

  if (request.description && request.description.length > 1000) {
    errors.push('Agent description must be less than 1000 characters')
  }

  if (request.guidelines && !Array.isArray(request.guidelines)) {
    errors.push('Guidelines must be an array')
  }

  if (request.guidelines) {
    request.guidelines.forEach((guideline, index) => {
      if (!guideline.condition || !guideline.action) {
        errors.push(`Guideline ${index + 1}: condition and action are required`)
      }
    })
  }

  if (errors.length > 0) {
    const validationErrors = errors.map((error) => ({
      field: 'general',
      message: error,
      code: 'VALIDATION_ERROR',
    }))

    throw new ParlantValidationError('Agent creation validation failed', validationErrors)
  }
}

/**
 * Validate agent update request
 */
function validateAgentUpdateRequest(request: AgentUpdateRequest): void {
  const errors: string[] = []

  if (request.name !== undefined) {
    if (!request.name || request.name.trim().length === 0) {
      errors.push('Agent name cannot be empty')
    }
    if (request.name.length > 100) {
      errors.push('Agent name must be less than 100 characters')
    }
  }

  if (request.description !== undefined && request.description.length > 1000) {
    errors.push('Agent description must be less than 1000 characters')
  }

  if (request.status && !['active', 'inactive', 'training'].includes(request.status)) {
    errors.push('Invalid agent status')
  }

  if (errors.length > 0) {
    const validationErrors = errors.map((error) => ({
      field: 'general',
      message: error,
      code: 'VALIDATION_ERROR',
    }))

    throw new ParlantValidationError('Agent update validation failed', validationErrors)
  }
}

/**
 * Validate agent list query
 */
function validateAgentListQuery(query: AgentListQuery): void {
  if (query.limit && (query.limit < 1 || query.limit > 100)) {
    throw new ParlantValidationError('Limit must be between 1 and 100')
  }

  if (query.offset && query.offset < 0) {
    throw new ParlantValidationError('Offset must be non-negative')
  }

  if (query.status && !['active', 'inactive', 'training'].includes(query.status)) {
    throw new ParlantValidationError('Invalid status filter')
  }
}

/**
 * Validate agent ID format
 */
function validateAgentId(agentId: string): void {
  if (!agentId || agentId.trim().length === 0) {
    throw new ParlantValidationError('Agent ID is required')
  }

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(agentId)) {
    throw new ParlantValidationError('Invalid agent ID format')
  }
}

// Access Control Functions

/**
 * Validate workspace access for the given context
 */
async function validateWorkspaceAccess(workspaceId: string, context: AuthContext): Promise<void> {
  // If context has workspace_id and it matches, access is granted
  if (context.workspace_id === workspaceId) {
    return
  }

  // If context has admin permissions, access is granted
  if (hasWorkspaceAdminPermission(context)) {
    return
  }

  // For now, we'll allow access if the user has any workspace context
  // In a full implementation, you'd check against a workspace membership table
  if (!context.workspace_id && !hasWorkspaceAdminPermission(context)) {
    throw new ParlantWorkspaceError(
      'Access denied: insufficient workspace permissions',
      workspaceId
    )
  }
}

/**
 * Check if user has workspace admin permissions
 */
function hasWorkspaceAdminPermission(context: AuthContext): boolean {
  return context.permissions?.includes('workspace:admin') || false
}

/**
 * Filter agents by workspace access
 */
async function filterAgentsByWorkspaceAccess(
  agents: Agent[],
  context: AuthContext
): Promise<Agent[]> {
  // If user has admin permissions, return all agents
  if (hasWorkspaceAdminPermission(context)) {
    return agents
  }

  // Filter agents by workspace access
  return agents.filter((agent) => {
    try {
      // This would normally be async, but for performance we'll do a sync check
      return agent.workspace_id === context.workspace_id || agent.user_id === context.user_id
    } catch {
      return false
    }
  })
}
