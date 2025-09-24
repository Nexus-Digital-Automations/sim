import { db } from '@sim/db'
import { eq, and } from 'drizzle-orm'
import { member } from '@sim/db/schema'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ParlantAgents')

/**
 * Agent access control and management utilities
 */

export interface Agent {
  id: string
  name: string
  description?: string
  workspace_id: string
  created_by: string
  created_at: Date
  updated_at: Date
  is_active: boolean
  guidelines?: any
  tools?: string[]
}

/**
 * Get agent by ID with workspace validation
 */
export async function getAgentById(agentId: string): Promise<Agent | null> {
  try {
    // TODO: Replace with actual Parlant agent query
    // This is a placeholder that would integrate with the Parlant server

    // For now, simulate agent data structure
    // In production, this would query the Parlant database
    const mockAgent: Agent = {
      id: agentId,
      name: 'Sample Agent',
      description: 'A conversational AI agent',
      workspace_id: 'mock-workspace',
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      guidelines: {},
      tools: []
    }

    logger.info('Fetched agent', { agentId, workspaceId: mockAgent.workspace_id })
    return mockAgent

  } catch (error) {
    logger.error('Failed to fetch agent', { error, agentId })
    return null
  }
}

/**
 * Check if user can access a specific agent
 */
export async function getUserCanAccessAgent(
  userId: string,
  agentId: string
): Promise<boolean> {
  try {
    // Get the agent first
    const agent = await getAgentById(agentId)
    if (!agent) {
      return false
    }

    // Check if user has access to the workspace containing this agent
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, agent.workspace_id)
        )
      )
      .limit(1)

    const hasAccess = membership.length > 0

    logger.info('Agent access check', {
      userId,
      agentId,
      workspaceId: agent.workspace_id,
      hasAccess
    })

    return hasAccess

  } catch (error) {
    logger.error('Agent access check failed', { error, userId, agentId })
    return false
  }
}

/**
 * Get all agents accessible to a user in a workspace
 */
export async function getUserAccessibleAgents(
  userId: string,
  workspaceId: string
): Promise<Agent[]> {
  try {
    // First verify user has access to the workspace
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, workspaceId)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      logger.warn('User does not have access to workspace', { userId, workspaceId })
      return []
    }

    // TODO: Replace with actual Parlant agent query
    // This would fetch agents from the Parlant server for this workspace
    const agents: Agent[] = []

    logger.info('Fetched accessible agents', {
      userId,
      workspaceId,
      agentCount: agents.length
    })

    return agents

  } catch (error) {
    logger.error('Failed to fetch accessible agents', { error, userId, workspaceId })
    return []
  }
}

/**
 * Create a new agent in the workspace
 */
export async function createAgent(
  userId: string,
  workspaceId: string,
  agentData: {
    name: string
    description?: string
    guidelines?: any
    tools?: string[]
  }
): Promise<Agent | null> {
  try {
    // Verify user has permission to create agents in this workspace
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, workspaceId)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      logger.warn('User cannot create agent - no workspace access', { userId, workspaceId })
      return null
    }

    // Check role permissions (admin or owner can create agents)
    const userRole = membership[0].role
    if (!['admin', 'owner'].includes(userRole)) {
      logger.warn('User cannot create agent - insufficient permissions', {
        userId,
        workspaceId,
        userRole
      })
      return null
    }

    // TODO: Replace with actual Parlant agent creation
    // This would create the agent via Parlant server API

    const newAgent: Agent = {
      id: `agent_${Date.now()}`,
      name: agentData.name,
      description: agentData.description,
      workspace_id: workspaceId,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      guidelines: agentData.guidelines,
      tools: agentData.tools
    }

    logger.info('Created new agent', {
      agentId: newAgent.id,
      agentName: newAgent.name,
      workspaceId,
      createdBy: userId
    })

    return newAgent

  } catch (error) {
    logger.error('Failed to create agent', { error, userId, workspaceId, agentData })
    return null
  }
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  userId: string,
  agentId: string,
  updates: Partial<Agent>
): Promise<Agent | null> {
  try {
    // Get the current agent
    const agent = await getAgentById(agentId)
    if (!agent) {
      return null
    }

    // Verify user has permission to update this agent
    const canAccess = await getUserCanAccessAgent(userId, agentId)
    if (!canAccess) {
      logger.warn('User cannot update agent - no access', { userId, agentId })
      return null
    }

    // Additional permission check - only admin/owner or creator can update
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, agent.workspace_id)
        )
      )
      .limit(1)

    const userRole = membership[0]?.role
    if (!['admin', 'owner'].includes(userRole) && agent.created_by !== userId) {
      logger.warn('User cannot update agent - insufficient permissions', {
        userId,
        agentId,
        userRole,
        agentCreator: agent.created_by
      })
      return null
    }

    // TODO: Replace with actual Parlant agent update
    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      updated_at: new Date()
    }

    logger.info('Updated agent', {
      agentId,
      updatedBy: userId,
      updates: Object.keys(updates)
    })

    return updatedAgent

  } catch (error) {
    logger.error('Failed to update agent', { error, userId, agentId, updates })
    return null
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(userId: string, agentId: string): Promise<boolean> {
  try {
    const agent = await getAgentById(agentId)
    if (!agent) {
      return false
    }

    // Verify user has permission to delete this agent
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, agent.workspace_id)
        )
      )
      .limit(1)

    const userRole = membership[0]?.role
    if (!['admin', 'owner'].includes(userRole) && agent.created_by !== userId) {
      logger.warn('User cannot delete agent - insufficient permissions', {
        userId,
        agentId,
        userRole,
        agentCreator: agent.created_by
      })
      return false
    }

    // TODO: Replace with actual Parlant agent deletion
    // This would delete the agent via Parlant server API

    logger.info('Deleted agent', {
      agentId,
      deletedBy: userId,
      workspaceId: agent.workspace_id
    })

    return true

  } catch (error) {
    logger.error('Failed to delete agent', { error, userId, agentId })
    return false
  }
}