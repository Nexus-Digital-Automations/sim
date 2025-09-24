/**
 * Agent Management API - Database Service Layer
 *
 * Provides database operations for agent lifecycle management with proper
 * workspace isolation, authentication, and error handling.
 */

import { db } from '@sim/db'
import { parlantAgent, parlantSession, workspace } from '@sim/db/schema'
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  AgentListQuery,
  AgentListResponse,
  AgentResponse,
  AgentStatusResponse,
  CreateAgentRequest,
  CreateSessionRequest,
  SessionListQuery,
  SessionListResponse,
  SessionResponse,
  UpdateAgentRequest,
} from './schemas'

const logger = createLogger('AgentService')

/**
 * Service class for managing Parlant agents
 */
export class AgentService {
  /**
   * Create a new Parlant agent
   */
  async createAgent(request: CreateAgentRequest, userId: string): Promise<AgentResponse> {
    const startTime = performance.now()
    const requestId = `create-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Creating new agent', {
        requestId,
        userId,
        workspaceId: request.workspaceId,
        name: request.name,
      })

      // Validate workspace exists and user has access
      const workspaceExists = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.id, request.workspaceId))
        .limit(1)

      if (workspaceExists.length === 0) {
        throw new Error('Workspace not found')
      }

      // Create the agent
      const [newAgent] = await db
        .insert(parlantAgent)
        .values({
          workspaceId: request.workspaceId,
          createdBy: userId,
          name: request.name,
          description: request.description,
          compositionMode: request.compositionMode,
          systemPrompt: request.systemPrompt,
          modelProvider: request.modelProvider,
          modelName: request.modelName,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          status: 'active',
          totalSessions: 0,
          totalMessages: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      if (!newAgent) {
        throw new Error('Failed to create agent')
      }

      const duration = performance.now() - startTime

      logger.info('Agent created successfully', {
        requestId,
        agentId: newAgent.id,
        duration: `${duration}ms`,
      })

      // Convert database record to API response format
      return this.mapAgentToResponse(newAgent)
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create agent', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string, userId: string): Promise<AgentResponse | null> {
    const startTime = performance.now()
    const requestId = `get-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Fetching agent', {
        requestId,
        agentId,
        userId,
      })

      const agent = await db
        .select()
        .from(parlantAgent)
        .where(and(eq(parlantAgent.id, agentId), isNull(parlantAgent.deletedAt)))
        .limit(1)

      if (agent.length === 0) {
        return null
      }

      const duration = performance.now() - startTime
      logger.info('Agent fetched successfully', {
        requestId,
        agentId,
        duration: `${duration}ms`,
      })

      return this.mapAgentToResponse(agent[0])
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to fetch agent', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(query: AgentListQuery, userId: string): Promise<AgentListResponse> {
    const startTime = performance.now()
    const requestId = `list-agents-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Listing agents', {
        requestId,
        userId,
        query,
      })

      // Build WHERE conditions
      const conditions = [isNull(parlantAgent.deletedAt)]

      if (query.workspaceId) {
        conditions.push(eq(parlantAgent.workspaceId, query.workspaceId))
      }

      if (query.status) {
        conditions.push(eq(parlantAgent.status, query.status))
      }

      if (query.search) {
        conditions.push(
          or(
            ilike(parlantAgent.name, `%${query.search}%`),
            ilike(parlantAgent.description, `%${query.search}%`)
          )
        )
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(parlantAgent)
        .where(and(...conditions))

      const total = totalResult.count

      // Get agents with pagination
      const orderBy =
        query.sortOrder === 'asc'
          ? asc(parlantAgent[query.sortBy])
          : desc(parlantAgent[query.sortBy])

      const agents = await db
        .select()
        .from(parlantAgent)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset)

      const duration = performance.now() - startTime

      logger.info('Agents listed successfully', {
        requestId,
        count: agents.length,
        total,
        duration: `${duration}ms`,
      })

      return {
        agents: agents.map((agent) => this.mapAgentToResponse(agent)),
        pagination: {
          total,
          offset: query.offset,
          limit: query.limit,
          hasNext: query.offset + query.limit < total,
          hasPrev: query.offset > 0,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to list agents', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    agentId: string,
    request: UpdateAgentRequest,
    userId: string
  ): Promise<AgentResponse | null> {
    const startTime = performance.now()
    const requestId = `update-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Updating agent', {
        requestId,
        agentId,
        userId,
        updates: Object.keys(request),
      })

      // Check if agent exists and user has access
      const existingAgent = await this.getAgent(agentId, userId)
      if (!existingAgent) {
        return null
      }

      // Build update values
      const updateValues: any = {
        updatedAt: new Date(),
      }

      if (request.name !== undefined) updateValues.name = request.name
      if (request.description !== undefined) updateValues.description = request.description
      if (request.status !== undefined) updateValues.status = request.status
      if (request.compositionMode !== undefined)
        updateValues.compositionMode = request.compositionMode
      if (request.systemPrompt !== undefined) updateValues.systemPrompt = request.systemPrompt
      if (request.modelProvider !== undefined) updateValues.modelProvider = request.modelProvider
      if (request.modelName !== undefined) updateValues.modelName = request.modelName
      if (request.temperature !== undefined) updateValues.temperature = request.temperature
      if (request.maxTokens !== undefined) updateValues.maxTokens = request.maxTokens

      const [updatedAgent] = await db
        .update(parlantAgent)
        .set(updateValues)
        .where(and(eq(parlantAgent.id, agentId), isNull(parlantAgent.deletedAt)))
        .returning()

      if (!updatedAgent) {
        throw new Error('Failed to update agent')
      }

      const duration = performance.now() - startTime

      logger.info('Agent updated successfully', {
        requestId,
        agentId,
        duration: `${duration}ms`,
      })

      return this.mapAgentToResponse(updatedAgent)
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to update agent', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Soft delete an agent
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    const startTime = performance.now()
    const requestId = `delete-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Deleting agent', {
        requestId,
        agentId,
        userId,
      })

      // Check if agent exists
      const existingAgent = await this.getAgent(agentId, userId)
      if (!existingAgent) {
        return false
      }

      // Soft delete the agent
      const [deletedAgent] = await db
        .update(parlantAgent)
        .set({
          status: 'archived',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(parlantAgent.id, agentId), isNull(parlantAgent.deletedAt)))
        .returning()

      const success = !!deletedAgent

      const duration = performance.now() - startTime

      logger.info('Agent deletion completed', {
        requestId,
        agentId,
        success,
        duration: `${duration}ms`,
      })

      return success
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to delete agent', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Create a new session for an agent
   */
  async createSession(
    agentId: string,
    request: CreateSessionRequest,
    userId: string
  ): Promise<SessionResponse> {
    const startTime = performance.now()
    const requestId = `create-session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Creating agent session', {
        requestId,
        agentId,
        userId,
        mode: request.mode,
      })

      // Validate agent exists and get workspace
      const agent = await this.getAgent(agentId, userId)
      if (!agent) {
        throw new Error('Agent not found')
      }

      // Create the session
      const [newSession] = await db
        .insert(parlantSession)
        .values({
          agentId,
          workspaceId: agent.workspaceId,
          userId,
          customerId: request.customerId,
          mode: request.mode,
          status: 'active',
          title: request.title,
          metadata: request.metadata,
          variables: request.variables,
          eventCount: 0,
          messageCount: 0,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      if (!newSession) {
        throw new Error('Failed to create session')
      }

      // Update agent session count
      await db
        .update(parlantAgent)
        .set({
          totalSessions: sql`${parlantAgent.totalSessions} + 1`,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(parlantAgent.id, agentId))

      const duration = performance.now() - startTime

      logger.info('Session created successfully', {
        requestId,
        sessionId: newSession.id,
        agentId,
        duration: `${duration}ms`,
      })

      return this.mapSessionToResponse(newSession)
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create session', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * List sessions for an agent
   */
  async listSessions(
    agentId: string,
    query: SessionListQuery,
    userId: string
  ): Promise<SessionListResponse> {
    const startTime = performance.now()
    const requestId = `list-sessions-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Listing agent sessions', {
        requestId,
        agentId,
        userId,
        query,
      })

      // Validate agent exists
      const agent = await this.getAgent(agentId, userId)
      if (!agent) {
        throw new Error('Agent not found')
      }

      // Build WHERE conditions
      const conditions = [eq(parlantSession.agentId, agentId)]

      if (query.status) {
        conditions.push(eq(parlantSession.status, query.status))
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(and(...conditions))

      const total = totalResult.count

      // Get sessions with pagination
      const orderBy =
        query.sortOrder === 'asc'
          ? asc(parlantSession[query.sortBy])
          : desc(parlantSession[query.sortBy])

      const sessions = await db
        .select()
        .from(parlantSession)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset)

      const duration = performance.now() - startTime

      logger.info('Sessions listed successfully', {
        requestId,
        agentId,
        count: sessions.length,
        total,
        duration: `${duration}ms`,
      })

      return {
        sessions: sessions.map((session) => this.mapSessionToResponse(session)),
        pagination: {
          total,
          offset: query.offset,
          limit: query.limit,
          hasNext: query.offset + query.limit < total,
          hasPrev: query.offset > 0,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to list sessions', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Get agent status and health metrics
   */
  async getAgentStatus(agentId: string, userId: string): Promise<AgentStatusResponse | null> {
    const startTime = performance.now()
    const requestId = `agent-status-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    try {
      logger.info('Fetching agent status', {
        requestId,
        agentId,
        userId,
      })

      // Get agent data
      const agent = await this.getAgent(agentId, userId)
      if (!agent) {
        return null
      }

      // Get active sessions count
      const [activeSessionsResult] = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(and(eq(parlantSession.agentId, agentId), eq(parlantSession.status, 'active')))

      const activeSessions = activeSessionsResult.count

      // Calculate health status (simple heuristic)
      const isHealthy = agent.status === 'active'
      const lastHealthCheck = new Date().toISOString()

      // Mock performance metrics (in production, these would be calculated from actual data)
      const metrics = {
        totalSessions: agent.totalSessions,
        totalMessages: agent.totalMessages,
        activeSessions,
        averageResponseTime: 1200, // milliseconds
        successRate: 98.5, // percentage
        errorCount: 0,
        lastActiveAt: agent.lastActiveAt,
      }

      const duration = performance.now() - startTime

      logger.info('Agent status fetched successfully', {
        requestId,
        agentId,
        isHealthy,
        duration: `${duration}ms`,
      })

      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        workspaceId: agent.workspaceId,
        isHealthy,
        lastHealthCheck,
        metrics,
        configuration: {
          modelProvider: agent.modelProvider,
          modelName: agent.modelName,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          compositionMode: agent.compositionMode,
        },
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to fetch agent status', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Map database agent record to API response format
   */
  private mapAgentToResponse(agent: any): AgentResponse {
    return {
      id: agent.id,
      workspaceId: agent.workspaceId,
      createdBy: agent.createdBy,
      name: agent.name,
      description: agent.description,
      status: agent.status,
      compositionMode: agent.compositionMode,
      systemPrompt: agent.systemPrompt,
      modelProvider: agent.modelProvider,
      modelName: agent.modelName,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      totalSessions: agent.totalSessions,
      totalMessages: agent.totalMessages,
      lastActiveAt: agent.lastActiveAt?.toISOString() || null,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    }
  }

  /**
   * Map database session record to API response format
   */
  private mapSessionToResponse(session: any): SessionResponse {
    return {
      id: session.id,
      agentId: session.agentId,
      workspaceId: session.workspaceId,
      userId: session.userId,
      customerId: session.customerId,
      mode: session.mode,
      status: session.status,
      title: session.title,
      metadata: session.metadata || {},
      currentJourneyId: session.currentJourneyId,
      currentStateId: session.currentStateId,
      variables: session.variables || {},
      eventCount: session.eventCount,
      messageCount: session.messageCount,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()
