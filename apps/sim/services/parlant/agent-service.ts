/**
 * Parlant Agent Service
 *
 * This service handles all agent-related operations including CRUD operations,
 * agent lifecycle management, and integration with Sim's workspace system.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { type ParlantClient, parlantClient } from './client'
import type {
  Agent,
  AgentCreateRequest,
  AgentListQuery,
  AgentUpdateRequest,
  ApiResponse,
  AuthContext,
  PaginatedResponse,
} from './types'

const logger = createLogger('AgentService')

/**
 * Enhanced agent list parameters
 */
export interface ListAgentsParams extends AgentListQuery {
  sortBy?: 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Agent service class for managing Parlant agents
 */
export class AgentService {
  private client: ParlantClient

  constructor(client: ParlantClient = parlantClient) {
    this.client = client
    logger.info('Agent service initialized')
  }

  /**
   * Create a new agent
   */
  async createAgent(request: AgentCreateRequest, auth: AuthContext): Promise<ApiResponse<Agent>> {
    logger.info('Creating agent', {
      name: request.name,
      workspaceId: request.workspace_id,
      userId: auth.user_id,
    })

    try {
      const response = await this.client.post<Agent>('/agents', request, { auth })

      if (response.success && response.data) {
        logger.info('Agent created successfully', {
          agentId: response.data.id,
          name: response.data.name,
          workspaceId: response.data.workspace_id,
        })
      }

      // Convert to ApiResponse format
      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp,
      }
    } catch (error) {
      logger.error('Failed to create agent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
      })
      throw error
    }
  }

  /**
   * Get an agent by ID
   */
  async getAgent(agentId: string, auth: AuthContext): Promise<ApiResponse<Agent>> {
    logger.debug('Getting agent', { agentId, userId: auth.user_id })

    try {
      const response = await this.client.get<Agent>(`/agents/${agentId}`, { auth })

      if (response.success && response.data) {
        logger.debug('Agent retrieved successfully', {
          agentId: response.data.id,
          name: response.data.name,
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp,
      }
    } catch (error) {
      logger.error('Failed to get agent', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Update an agent
   */
  async updateAgent(
    agentId: string,
    updates: AgentUpdateRequest,
    auth: AuthContext
  ): Promise<ApiResponse<Agent>> {
    logger.info('Updating agent', {
      agentId,
      updates: Object.keys(updates),
      userId: auth.user_id,
    })

    try {
      const response = await this.client.patch<Agent>(`/agents/${agentId}`, updates, { auth })

      if (response.success && response.data) {
        logger.info('Agent updated successfully', {
          agentId: response.data.id,
          name: response.data.name,
          updatedFields: Object.keys(updates),
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp,
      }
    } catch (error) {
      logger.error('Failed to update agent', {
        agentId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, auth: AuthContext): Promise<ApiResponse<void>> {
    logger.info('Deleting agent', { agentId, userId: auth.user_id })

    try {
      const response = await this.client.delete<void>(`/agents/${agentId}`, { auth })

      if (response.success) {
        logger.info('Agent deleted successfully', { agentId })
      }

      return {
        success: response.success,
        data: undefined,
        timestamp: response.timestamp,
      }
    } catch (error) {
      logger.error('Failed to delete agent', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(params: ListAgentsParams, auth: AuthContext): Promise<PaginatedResponse<Agent>> {
    const {
      workspace_id,
      status,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params

    logger.debug('Listing agents', {
      workspaceId: workspace_id,
      status,
      search,
      limit,
      offset,
      authUserId: auth.user_id,
    })

    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder,
      })

      if (workspace_id) queryParams.set('workspace_id', workspace_id)
      if (status) queryParams.set('status', status)
      if (search) queryParams.set('search', search)

      const response = await this.client.get<Agent[]>(`/agents?${queryParams.toString()}`, { auth })

      if (response.success && response.data) {
        logger.debug('Agents listed successfully', {
          count: response.data.length,
          workspace_id,
        })

        // Convert to paginated response format
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp,
          pagination: {
            total: response.data.length, // This would come from headers in a real implementation
            limit,
            offset,
            has_more: response.data.length === limit,
          },
        }
      }

      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
      }
    } catch (error) {
      logger.error('Failed to list agents', {
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Search agents by name or description
   */
  async searchAgents(
    query: string,
    workspaceId: string,
    auth: AuthContext,
    options: { limit?: number; status?: 'active' | 'inactive' | 'training' } = {}
  ): Promise<PaginatedResponse<Agent>> {
    const { limit = 10, status = 'active' } = options

    logger.debug('Searching agents', {
      query,
      workspaceId,
      limit,
      status,
      userId: auth.user_id,
    })

    return this.listAgents(
      {
        workspace_id: workspaceId,
        search: query,
        status,
        limit,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'asc',
      },
      auth
    )
  }

  /**
   * Duplicate an agent
   */
  async duplicateAgent(
    agentId: string,
    newName: string,
    auth: AuthContext
  ): Promise<ApiResponse<Agent>> {
    logger.info('Duplicating agent', {
      sourceAgentId: agentId,
      newName,
      userId: auth.user_id,
    })

    try {
      // First get the source agent
      const sourceResponse = await this.getAgent(agentId, auth)

      if (!sourceResponse.success) {
        return {
          success: false,
          data: undefined as any,
          timestamp: new Date().toISOString(),
        }
      }

      const sourceAgent = sourceResponse.data

      // Create duplicate with modified name
      const duplicateRequest: AgentCreateRequest = {
        name: newName,
        description: sourceAgent.description
          ? `Copy of ${sourceAgent.description}`
          : `Copy of ${sourceAgent.name}`,
        workspace_id: sourceAgent.workspace_id,
        guidelines: sourceAgent.guidelines?.map((g) => ({
          condition: g.condition,
          action: g.action,
          priority: g.priority,
        })),
        config: sourceAgent.config,
      }

      return this.createAgent(duplicateRequest, auth)
    } catch (error) {
      logger.error('Failed to duplicate agent', {
        sourceAgentId: agentId,
        newName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()
