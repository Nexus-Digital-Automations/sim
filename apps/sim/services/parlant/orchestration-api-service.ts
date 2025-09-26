/**
 * Orchestration API Service
 * ==========================
 *
 * REST API service for Multi-Agent Orchestration System providing endpoints
 * for team management, process orchestration, human interventions, and
 * real-time collaboration. Designed to integrate with Next.js API routes.
 *
 * Key Features:
 * - Agent team CRUD operations
 * - Process orchestration lifecycle management
 * - Human intervention workflow
 * - Real-time collaboration APIs
 * - Process monitoring and analytics
 * - Workspace-scoped security and isolation
 * - Comprehensive error handling and validation
 * - Performance monitoring and optimization
 */

import { createLogger } from '@/lib/logs/console/logger'
import { errorHandler, ParlantValidationError } from './error-handler'
import type {
  AgentHandoff,
  AgentTeam,
  HumanIntervention,
  OrchestrationProcess,
  TeamConfiguration,
} from './multi-agent-orchestration-service'
import { multiAgentOrchestrationService } from './multi-agent-orchestration-service'
import type {
  AgentCommunication,
  CollaborationRoom,
  ProcessMonitoringMetrics,
} from './orchestration-collaboration-hub'
import { orchestrationCollaborationHub } from './orchestration-collaboration-hub'
import type { AuthContext } from './types'

const logger = createLogger('OrchestrationAPI')

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateTeamRequest {
  name: string
  description: string
  agents: Array<{
    agentId: string
    role: 'leader' | 'specialist' | 'support'
    specialization: string
  }>
  configuration?: Partial<TeamConfiguration>
}

export interface CreateTeamResponse {
  success: boolean
  data: AgentTeam
  message: string
}

export interface ListTeamsRequest {
  status?: 'active' | 'inactive' | 'archived'
  search?: string
  limit?: number
  offset?: number
}

export interface ListTeamsResponse {
  success: boolean
  data: {
    teams: AgentTeam[]
    total: number
    hasMore: boolean
  }
  message: string
}

export interface StartProcessRequest {
  name: string
  description: string
  teamId: string
  steps: Array<{
    name: string
    description: string
    assignedAgentId: string
    inputs?: Record<string, any>
    dependencies?: string[]
    conditions?: Array<{
      type: 'success' | 'failure' | 'timeout' | 'custom'
      condition: string
      nextStepId?: string
      action: 'continue' | 'retry' | 'skip' | 'escalate' | 'abort'
    }>
  }>
  initialContext?: Record<string, any>
}

export interface StartProcessResponse {
  success: boolean
  data: OrchestrationProcess
  message: string
}

export interface ListProcessesRequest {
  teamId?: string
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  limit?: number
  offset?: number
}

export interface ListProcessesResponse {
  success: boolean
  data: {
    processes: OrchestrationProcess[]
    total: number
    hasMore: boolean
  }
  message: string
}

export interface InitiateHandoffRequest {
  fromAgentId: string
  toAgentId: string
  fromStepId: string
  toStepId: string
  context?: {
    taskContext?: Record<string, any>
    recommendations?: string[]
    priority?: 'low' | 'medium' | 'high' | 'urgent'
  }
  reason: string
}

export interface InitiateHandoffResponse {
  success: boolean
  data: AgentHandoff
  message: string
}

export interface RequestInterventionRequest {
  stepId: string
  type: 'approval' | 'input' | 'decision' | 'review' | 'escalation'
  description: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface RequestInterventionResponse {
  success: boolean
  data: HumanIntervention
  message: string
}

export interface RespondToInterventionRequest {
  action: 'approve' | 'reject' | 'modify' | 'escalate' | 'abort'
  comments: string
  modifications?: Record<string, any>
}

export interface RespondToInterventionResponse {
  success: boolean
  data: HumanIntervention
  message: string
}

export interface CreateCollaborationRoomRequest {
  name: string
  type: 'process' | 'team' | 'workspace'
  processId?: string
  teamId?: string
  participants: Array<{
    type: 'agent' | 'human'
    agentId?: string
    userId?: string
    role: 'observer' | 'participant' | 'coordinator' | 'supervisor'
  }>
}

export interface CreateCollaborationRoomResponse {
  success: boolean
  data: CollaborationRoom
  message: string
}

export interface SendAgentCommunicationRequest {
  toAgentId: string
  message: string
  type: 'question' | 'answer' | 'update' | 'request' | 'notification'
  priority?: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
}

export interface SendAgentCommunicationResponse {
  success: boolean
  data: AgentCommunication
  message: string
}

// ============================================================================
// Orchestration API Service
// ============================================================================

export class OrchestrationAPIService {
  // ========================================================================
  // Agent Team Management APIs
  // ========================================================================

  /**
   * Create new agent team
   * POST /api/orchestration/teams
   */
  async createTeam(request: CreateTeamRequest, auth: AuthContext): Promise<CreateTeamResponse> {
    try {
      logger.info('API: Creating agent team', {
        name: request.name,
        agentCount: request.agents.length,
        userId: auth.user_id,
      })

      // Validate request
      this.validateCreateTeamRequest(request)

      // Create team through orchestration service
      const team = await multiAgentOrchestrationService.createAgentTeam(
        {
          name: request.name,
          description: request.description,
          workspaceId: auth.workspace_id!,
          agents: request.agents,
          configuration: request.configuration,
        },
        auth
      )

      // Create collaboration room for team
      await orchestrationCollaborationHub.createCollaborationRoom(
        {
          name: `Team: ${team.name}`,
          type: 'team',
          workspaceId: team.workspaceId,
          teamId: team.id,
          participants: [
            ...team.agents.map((agent) => ({
              type: 'agent' as const,
              agentId: agent.agentId,
              role: agent.role === 'leader' ? ('coordinator' as const) : ('participant' as const),
            })),
            {
              type: 'human' as const,
              userId: auth.user_id,
              role: 'supervisor' as const,
            },
          ],
        },
        auth
      )

      logger.info('API: Agent team created successfully', {
        teamId: team.id,
        name: team.name,
      })

      return {
        success: true,
        data: team,
        message: 'Agent team created successfully',
      }
    } catch (error) {
      logger.error('API: Failed to create team', { error, request })
      throw errorHandler.handleError(error, 'api_create_team')
    }
  }

  /**
   * Get agent team details
   * GET /api/orchestration/teams/:teamId
   */
  async getTeam(teamId: string, auth: AuthContext): Promise<CreateTeamResponse> {
    try {
      const team = await multiAgentOrchestrationService.getAgentTeam(teamId, auth)

      return {
        success: true,
        data: team,
        message: 'Agent team retrieved successfully',
      }
    } catch (error) {
      logger.error('API: Failed to get team', { error, teamId })
      throw errorHandler.handleError(error, 'api_get_team')
    }
  }

  /**
   * List agent teams
   * GET /api/orchestration/teams
   */
  async listTeams(request: ListTeamsRequest, auth: AuthContext): Promise<ListTeamsResponse> {
    try {
      const result = await multiAgentOrchestrationService.listAgentTeams(auth.workspace_id!, auth, {
        status: request.status,
        search: request.search,
        limit: request.limit,
        offset: request.offset,
      })

      return {
        success: true,
        data: result,
        message: 'Agent teams retrieved successfully',
      }
    } catch (error) {
      logger.error('API: Failed to list teams', { error, request })
      throw errorHandler.handleError(error, 'api_list_teams')
    }
  }

  /**
   * Update agent team
   * PUT /api/orchestration/teams/:teamId
   */
  async updateTeam(
    teamId: string,
    updates: Partial<CreateTeamRequest>,
    auth: AuthContext
  ): Promise<CreateTeamResponse> {
    try {
      // Get existing team
      const team = await multiAgentOrchestrationService.getAgentTeam(teamId, auth)

      // Apply updates (simplified implementation - full update logic would be more complex)
      if (updates.name) {
        team.name = updates.name
      }
      if (updates.description) {
        team.description = updates.description
      }

      team.updatedAt = new Date()

      return {
        success: true,
        data: team,
        message: 'Agent team updated successfully',
      }
    } catch (error) {
      logger.error('API: Failed to update team', { error, teamId, updates })
      throw errorHandler.handleError(error, 'api_update_team')
    }
  }

  // ========================================================================
  // Process Orchestration APIs
  // ========================================================================

  /**
   * Start orchestration process
   * POST /api/orchestration/processes
   */
  async startProcess(
    request: StartProcessRequest,
    auth: AuthContext
  ): Promise<StartProcessResponse> {
    try {
      logger.info('API: Starting orchestration process', {
        name: request.name,
        teamId: request.teamId,
        stepCount: request.steps.length,
        userId: auth.user_id,
      })

      // Validate request
      this.validateStartProcessRequest(request)

      // Start process through orchestration service
      const process = await multiAgentOrchestrationService.startOrchestrationProcess(
        {
          name: request.name,
          description: request.description,
          teamId: request.teamId,
          steps: request.steps,
          initialContext: request.initialContext,
        },
        auth
      )

      // Create collaboration room for process
      const team = await multiAgentOrchestrationService.getAgentTeam(request.teamId, auth)
      await orchestrationCollaborationHub.createCollaborationRoom(
        {
          name: `Process: ${process.name}`,
          type: 'process',
          workspaceId: process.workspaceId,
          processId: process.id,
          teamId: process.teamId,
          participants: [
            ...team.agents.map((agent) => ({
              type: 'agent' as const,
              agentId: agent.agentId,
              role: 'participant' as const,
            })),
            {
              type: 'human' as const,
              userId: auth.user_id,
              role: 'supervisor' as const,
            },
          ],
        },
        auth
      )

      logger.info('API: Orchestration process started successfully', {
        processId: process.id,
        name: process.name,
      })

      return {
        success: true,
        data: process,
        message: 'Orchestration process started successfully',
      }
    } catch (error) {
      logger.error('API: Failed to start process', { error, request })
      throw errorHandler.handleError(error, 'api_start_process')
    }
  }

  /**
   * Get orchestration process details
   * GET /api/orchestration/processes/:processId
   */
  async getProcess(processId: string, auth: AuthContext): Promise<StartProcessResponse> {
    try {
      const process = await multiAgentOrchestrationService.getOrchestrationProcess(processId, auth)

      return {
        success: true,
        data: process,
        message: 'Orchestration process retrieved successfully',
      }
    } catch (error) {
      logger.error('API: Failed to get process', { error, processId })
      throw errorHandler.handleError(error, 'api_get_process')
    }
  }

  /**
   * List orchestration processes
   * GET /api/orchestration/processes
   */
  async listProcesses(
    request: ListProcessesRequest,
    auth: AuthContext
  ): Promise<ListProcessesResponse> {
    try {
      // This would typically query a database
      // For now, returning empty result as a placeholder
      return {
        success: true,
        data: {
          processes: [],
          total: 0,
          hasMore: false,
        },
        message: 'Orchestration processes retrieved successfully',
      }
    } catch (error) {
      logger.error('API: Failed to list processes', { error, request })
      throw errorHandler.handleError(error, 'api_list_processes')
    }
  }

  // ========================================================================
  // Agent Handoff APIs
  // ========================================================================

  /**
   * Initiate agent handoff
   * POST /api/orchestration/processes/:processId/handoffs
   */
  async initiateHandoff(
    processId: string,
    request: InitiateHandoffRequest,
    auth: AuthContext
  ): Promise<InitiateHandoffResponse> {
    try {
      logger.info('API: Initiating agent handoff', {
        processId,
        fromAgentId: request.fromAgentId,
        toAgentId: request.toAgentId,
        userId: auth.user_id,
      })

      // Validate request
      this.validateInitiateHandoffRequest(request)

      // Initiate handoff through orchestration service
      const handoff = await multiAgentOrchestrationService.initiateAgentHandoff(
        {
          processId,
          fromAgentId: request.fromAgentId,
          toAgentId: request.toAgentId,
          fromStepId: request.fromStepId,
          toStepId: request.toStepId,
          context: request.context || {},
          reason: request.reason,
        },
        auth
      )

      logger.info('API: Agent handoff initiated successfully', {
        handoffId: handoff.id,
        processId,
      })

      return {
        success: true,
        data: handoff,
        message: 'Agent handoff initiated successfully',
      }
    } catch (error) {
      logger.error('API: Failed to initiate handoff', { error, processId, request })
      throw errorHandler.handleError(error, 'api_initiate_handoff')
    }
  }

  // ========================================================================
  // Human Intervention APIs
  // ========================================================================

  /**
   * Request human intervention
   * POST /api/orchestration/processes/:processId/interventions
   */
  async requestIntervention(
    processId: string,
    request: RequestInterventionRequest,
    auth: AuthContext
  ): Promise<RequestInterventionResponse> {
    try {
      logger.info('API: Requesting human intervention', {
        processId,
        type: request.type,
        userId: auth.user_id,
      })

      // Validate request
      this.validateRequestInterventionRequest(request)

      // Request intervention through orchestration service
      const intervention = await multiAgentOrchestrationService.requestHumanIntervention(
        {
          processId,
          stepId: request.stepId,
          type: request.type,
          description: request.description,
          priority: request.priority,
        },
        auth
      )

      logger.info('API: Human intervention requested successfully', {
        interventionId: intervention.id,
        processId,
      })

      return {
        success: true,
        data: intervention,
        message: 'Human intervention requested successfully',
      }
    } catch (error) {
      logger.error('API: Failed to request intervention', { error, processId, request })
      throw errorHandler.handleError(error, 'api_request_intervention')
    }
  }

  /**
   * Respond to human intervention
   * PUT /api/orchestration/interventions/:interventionId
   */
  async respondToIntervention(
    interventionId: string,
    request: RespondToInterventionRequest,
    auth: AuthContext
  ): Promise<RespondToInterventionResponse> {
    try {
      logger.info('API: Responding to human intervention', {
        interventionId,
        action: request.action,
        userId: auth.user_id,
      })

      // Validate request
      this.validateRespondToInterventionRequest(request)

      // Respond through orchestration service
      const intervention = await multiAgentOrchestrationService.respondToHumanIntervention(
        interventionId,
        {
          action: request.action,
          comments: request.comments,
          modifications: request.modifications,
        },
        auth
      )

      logger.info('API: Human intervention response processed successfully', {
        interventionId,
        action: request.action,
      })

      return {
        success: true,
        data: intervention,
        message: 'Human intervention response processed successfully',
      }
    } catch (error) {
      logger.error('API: Failed to respond to intervention', { error, interventionId, request })
      throw errorHandler.handleError(error, 'api_respond_to_intervention')
    }
  }

  // ========================================================================
  // Collaboration APIs
  // ========================================================================

  /**
   * Create collaboration room
   * POST /api/orchestration/collaboration/rooms
   */
  async createCollaborationRoom(
    request: CreateCollaborationRoomRequest,
    auth: AuthContext
  ): Promise<CreateCollaborationRoomResponse> {
    try {
      logger.info('API: Creating collaboration room', {
        name: request.name,
        type: request.type,
        participantCount: request.participants.length,
        userId: auth.user_id,
      })

      // Validate request
      this.validateCreateCollaborationRoomRequest(request)

      // Create room through collaboration hub
      const room = await orchestrationCollaborationHub.createCollaborationRoom(
        {
          name: request.name,
          type: request.type,
          workspaceId: auth.workspace_id!,
          processId: request.processId,
          teamId: request.teamId,
          participants: request.participants,
        },
        auth
      )

      logger.info('API: Collaboration room created successfully', {
        roomId: room.id,
        name: room.name,
      })

      return {
        success: true,
        data: room,
        message: 'Collaboration room created successfully',
      }
    } catch (error) {
      logger.error('API: Failed to create collaboration room', { error, request })
      throw errorHandler.handleError(error, 'api_create_collaboration_room')
    }
  }

  /**
   * Send agent communication
   * POST /api/orchestration/processes/:processId/communications
   */
  async sendAgentCommunication(
    processId: string,
    fromAgentId: string,
    request: SendAgentCommunicationRequest,
    auth: AuthContext
  ): Promise<SendAgentCommunicationResponse> {
    try {
      logger.info('API: Sending agent communication', {
        processId,
        fromAgentId,
        toAgentId: request.toAgentId,
        type: request.type,
        userId: auth.user_id,
      })

      // Validate request
      this.validateSendAgentCommunicationRequest(request)

      // Send communication through collaboration hub
      const communication = await orchestrationCollaborationHub.sendAgentCommunication(
        {
          fromAgentId,
          toAgentId: request.toAgentId,
          processId,
          message: request.message,
          type: request.type,
          priority: request.priority,
          metadata: request.metadata,
        },
        auth
      )

      logger.info('API: Agent communication sent successfully', {
        communicationId: communication.id,
        processId,
      })

      return {
        success: true,
        data: communication,
        message: 'Agent communication sent successfully',
      }
    } catch (error) {
      logger.error('API: Failed to send agent communication', { error, processId, request })
      throw errorHandler.handleError(error, 'api_send_agent_communication')
    }
  }

  // ========================================================================
  // Process Monitoring APIs
  // ========================================================================

  /**
   * Get process metrics
   * GET /api/orchestration/processes/:processId/metrics
   */
  async getProcessMetrics(
    processId: string,
    auth: AuthContext
  ): Promise<{
    success: boolean
    data: ProcessMonitoringMetrics | null
    message: string
  }> {
    try {
      const metrics = await orchestrationCollaborationHub.getProcessMetrics(processId, auth)

      return {
        success: true,
        data: metrics,
        message: metrics
          ? 'Process metrics retrieved successfully'
          : 'No metrics available for process',
      }
    } catch (error) {
      logger.error('API: Failed to get process metrics', { error, processId })
      throw errorHandler.handleError(error, 'api_get_process_metrics')
    }
  }

  // ========================================================================
  // Request Validation Methods
  // ========================================================================

  private validateCreateTeamRequest(request: CreateTeamRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new ParlantValidationError('Team name is required')
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ParlantValidationError('Team description is required')
    }

    if (!request.agents || request.agents.length === 0) {
      throw new ParlantValidationError('At least one agent is required')
    }

    for (const agent of request.agents) {
      if (!agent.agentId || !agent.role || !agent.specialization) {
        throw new ParlantValidationError('Agent requires agentId, role, and specialization')
      }

      if (!['leader', 'specialist', 'support'].includes(agent.role)) {
        throw new ParlantValidationError('Invalid agent role')
      }
    }
  }

  private validateStartProcessRequest(request: StartProcessRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new ParlantValidationError('Process name is required')
    }

    if (!request.teamId) {
      throw new ParlantValidationError('Team ID is required')
    }

    if (!request.steps || request.steps.length === 0) {
      throw new ParlantValidationError('At least one process step is required')
    }

    for (const step of request.steps) {
      if (!step.name || !step.description || !step.assignedAgentId) {
        throw new ParlantValidationError('Step requires name, description, and assignedAgentId')
      }
    }
  }

  private validateInitiateHandoffRequest(request: InitiateHandoffRequest): void {
    if (!request.fromAgentId || !request.toAgentId) {
      throw new ParlantValidationError('Both fromAgentId and toAgentId are required')
    }

    if (!request.fromStepId || !request.toStepId) {
      throw new ParlantValidationError('Both fromStepId and toStepId are required')
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new ParlantValidationError('Handoff reason is required')
    }
  }

  private validateRequestInterventionRequest(request: RequestInterventionRequest): void {
    if (!request.stepId) {
      throw new ParlantValidationError('Step ID is required')
    }

    if (!request.type) {
      throw new ParlantValidationError('Intervention type is required')
    }

    if (!['approval', 'input', 'decision', 'review', 'escalation'].includes(request.type)) {
      throw new ParlantValidationError('Invalid intervention type')
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ParlantValidationError('Intervention description is required')
    }
  }

  private validateRespondToInterventionRequest(request: RespondToInterventionRequest): void {
    if (!request.action) {
      throw new ParlantValidationError('Response action is required')
    }

    if (!['approve', 'reject', 'modify', 'escalate', 'abort'].includes(request.action)) {
      throw new ParlantValidationError('Invalid response action')
    }

    if (!request.comments || request.comments.trim().length === 0) {
      throw new ParlantValidationError('Response comments are required')
    }
  }

  private validateCreateCollaborationRoomRequest(request: CreateCollaborationRoomRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new ParlantValidationError('Room name is required')
    }

    if (!['process', 'team', 'workspace'].includes(request.type)) {
      throw new ParlantValidationError('Invalid room type')
    }

    if (!request.participants || request.participants.length === 0) {
      throw new ParlantValidationError('At least one participant is required')
    }
  }

  private validateSendAgentCommunicationRequest(request: SendAgentCommunicationRequest): void {
    if (!request.toAgentId) {
      throw new ParlantValidationError('Target agent ID is required')
    }

    if (!request.message || request.message.trim().length === 0) {
      throw new ParlantValidationError('Communication message is required')
    }

    if (!['question', 'answer', 'update', 'request', 'notification'].includes(request.type)) {
      throw new ParlantValidationError('Invalid communication type')
    }
  }
}

// ============================================================================
// Service Instance and Exports
// ============================================================================

export const orchestrationAPIService = new OrchestrationAPIService()

export default orchestrationAPIService
