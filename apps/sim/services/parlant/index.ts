/**
 * Sim-Parlant Integration Bridge - Main Entry Point
 * ================================================
 *
 * This module serves as the primary interface for all Parlant integration
 * functionality within the Sim ecosystem. It provides a unified API for
 * agent management, session handling, and real-time communication.
 *
 * Key Features:
 * - Type-safe service layer with comprehensive error handling
 * - Automatic retry logic and connection management
 * - Workspace-based agent isolation and security
 * - Real-time event streaming and long polling support
 * - Performance monitoring and health checking
 * - Authentication integration with Sim's existing systems
 *
 * Usage Example:
 * ```typescript
 * import { agentService, sessionService, parlantClient } from '@/services/parlant'
 *
 * // Create an agent
 * const agent = await agentService.createAgent({
 *   name: 'Customer Support Agent',
 *   workspace_id: 'workspace-123',
 *   guidelines: [...]
 * }, authContext)
 *
 * // Start a session
 * const session = await sessionService.createSession({
 *   agent_id: agent.data.id,
 *   workspace_id: 'workspace-123'
 * }, authContext)
 *
 * // Send messages
 * await sessionService.sendMessage(
 *   session.data.id,
 *   'Hello, I need help with my account'
 * )
 * ```
 */

export {
  agentLearningService,
  type LearningInsight,
  type LearningMetrics,
  learningUtils,
  type UserInteraction,
} from './agent-learning-service'
export { AgentService, agentService } from './agent-service'
// Core services
export { closeParlantClient, createParlantClient, getParlantClient, ParlantClient } from './client'
// Configuration and utilities
export { getParlantConfig, parlantConfig, serviceConfig, validateConfig } from './config'
// Error handling
export {
  errorHandler,
  formatErrorForUser,
  getRequestId,
  isParlantError,
  isRetryableError,
  ParlantAuthError,
  ParlantConfigError,
  ParlantError,
  ParlantErrorHandler,
  ParlantNetworkError,
  ParlantRateLimitError,
  ParlantServerError,
  ParlantTimeoutError,
  ParlantValidationError,
} from './error-handler'
export {
  type BatchUploadRequest,
  type BatchUploadResult,
  type FileUploadRequest,
  type FileUploadResult,
  fileProcessingUtils,
  fileUploadProcessorService,
} from './file-upload-processor'
// Knowledge Base Integration with RAG Services
export {
  knowledgeIntegrationService,
  type ParlantRetrieverConfig,
  type RAGContext,
  ragUtils,
} from './knowledge-integration'
export {
  type AgentKnowledgeProfile,
  type KnowledgeRAGConfig,
  knowledgeRAGIntegrationService,
  type RAGEnhancedResponse,
  ragOperations,
} from './knowledge-rag-integration'
// Multi-Agent Orchestration System
export {
  type AgentHandoff,
  type AgentTeam,
  type AgentTeamMember,
  type CollaborationRule,
  type EscalationRule,
  type HumanIntervention,
  type HumanInterventionResponse,
  MultiAgentOrchestrationService,
  multiAgentOrchestrationService,
  type OrchestrationProcess,
  type ProcessMetrics,
  type ProcessStep,
  type TeamConfiguration,
} from './multi-agent-orchestration-service'
export {
  type CreateCollaborationRoomRequest,
  type CreateTeamRequest,
  type CreateTeamResponse,
  type InitiateHandoffRequest,
  OrchestrationAPIService,
  orchestrationAPIService,
  type RequestInterventionRequest,
  type RespondToInterventionRequest,
  type StartProcessRequest,
  type StartProcessResponse,
} from './orchestration-api-service'
export {
  type AgentCommunication,
  type CollaborationEvent,
  type CollaborationEventType,
  type CollaborationParticipant,
  type CollaborationRoom,
  OrchestrationCollaborationHub,
  orchestrationCollaborationHub,
  type ProcessAlert,
  type ProcessMonitoringMetrics,
} from './orchestration-collaboration-hub'
export { SessionService, sessionService } from './session-service'
// Type definitions
// Re-export commonly used types with aliases for convenience
export type {
  // Core types
  Agent,
  Agent as ParlantAgent,
  AgentConfig,
  // Request/response types
  AgentCreateRequest,
  AgentCreateRequest as CreateAgentRequest,
  AgentListQuery,
  AgentUpdateRequest,
  // API response types
  ApiResponse,
  AuthContext,
  Event,
  Event as ParlantEvent,
  EventCreateRequest,
  EventCreateRequest as CreateEventRequest,
  EventListQuery,
  // Event types
  EventType,
  Guideline,
  HealthCheck,
  Journey,
  JourneyStep,
  LongPollingOptions,
  PaginatedResponse,
  // Error types
  ParlantApiErrorDetails,
  // Configuration types
  ParlantClientConfig,
  ParlantHealthStatus,
  RateLimitInfo,
  Session,
  Session as ParlantSession,
  SessionCreateRequest,
  SessionCreateRequest as CreateSessionRequest,
  SessionListQuery,
  StreamingEvent,
  // Tool types (for future extension)
  Tool,
  ToolExecution,
  ValidationError,
  WorkspaceContext,
} from './types'
export {
  type WorkflowContext,
  type WorkflowDocumentationQuery,
  type WorkflowHelp,
  workflowDocUtils,
  workflowDocumentationRAGService,
} from './workflow-documentation-rag'

/**
 * Health check utility
 * Performs a comprehensive health check of the Parlant integration
 */
export async function checkParlantHealth(): Promise<{
  healthy: boolean
  status: string
  details: any
  latency?: number
}> {
  const startTime = Date.now()

  try {
    const client = getParlantClient()
    const health = await client.healthCheck(false)
    const latency = Date.now() - startTime

    return {
      healthy: health.status === 'healthy',
      status: health.status,
      details: health,
      latency,
    }
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      latency: Date.now() - startTime,
    }
  }
}

/**
 * Initialize Parlant services
 * Sets up the integration layer with proper configuration and health checks
 */
export async function initializeParlantIntegration(config?: {
  baseUrl?: string
  authToken?: string
  timeout?: number
  enableHealthChecks?: boolean
}): Promise<{
  success: boolean
  services: {
    client: ParlantClient
    agentService: AgentService
    sessionService: SessionService
  }
  health?: any
  error?: string
}> {
  try {
    // Create client with configuration
    const client = getParlantClient(config)

    // Perform initial health check if enabled
    let health
    if (config?.enableHealthChecks !== false) {
      health = await client.healthCheck(false)
    }

    return {
      success: true,
      services: {
        client,
        agentService,
        sessionService,
      },
      health,
    }
  } catch (error) {
    return {
      success: false,
      services: {
        client: getParlantClient(),
        agentService,
        sessionService,
      },
      error: error instanceof Error ? error.message : 'Initialization failed',
    }
  }
}

/**
 * Create an authenticated context for API calls
 * Utility function to create properly typed auth contexts
 */
export function createAuthContext(
  userId: string,
  workspaceId?: string,
  keyType: 'personal' | 'workspace' = 'workspace',
  permissions?: string[]
): AuthContext {
  return {
    user_id: userId,
    workspace_id: workspaceId,
    key_type: keyType,
    permissions,
  }
}

/**
 * Convenience functions for common operations
 */
export const parlantUtils = {
  /**
   * Create a simple agent with default configuration
   */
  async createSimpleAgent(
    name: string,
    workspaceId: string,
    auth: AuthContext,
    options?: {
      description?: string
      model?: string
      temperature?: number
    }
  ) {
    return agentService.createAgent(
      {
        name,
        description: options?.description,
        workspace_id: workspaceId,
        config: {
          model: options?.model || 'gpt-3.5-turbo',
          temperature: options?.temperature || 0.7,
          max_turns: 50,
        },
      },
      auth
    )
  },

  /**
   * Start a conversation with an agent
   */
  async startConversation(
    agentId: string,
    workspaceId: string,
    auth: AuthContext,
    initialMessage?: string,
    customerId?: string
  ) {
    // Create session
    const session = await sessionService.createSession(
      {
        agent_id: agentId,
        workspace_id: workspaceId,
        customer_id: customerId,
      },
      auth
    )

    // Send initial message if provided
    if (initialMessage) {
      await sessionService.sendMessage(session.data.id, initialMessage, undefined, auth)
    }

    return session
  },

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, auth: AuthContext, limit?: number) {
    return sessionService.getEvents(
      sessionId,
      {
        type: 'customer_message',
        limit: limit || 50,
      },
      auth
    )
  },

  /**
   * Search for agents by capability or description
   */
  async findAgentsForTask(task: string, workspaceId: string, auth: AuthContext) {
    return agentService.searchAgents(task, workspaceId, auth, {
      status: 'active',
      limit: 10,
    })
  },

  /**
   * Enhanced conversation with RAG support
   */
  async startRAGConversation(
    agentId: string,
    workspaceId: string,
    knowledgeBaseIds: string[],
    auth: AuthContext,
    initialMessage?: string,
    customerId?: string
  ) {
    // Create session
    const session = await sessionService.createSession(
      {
        agent_id: agentId,
        workspace_id: workspaceId,
        customer_id: customerId,
      },
      auth
    )

    // Process initial message with RAG if provided
    if (initialMessage) {
      const ragResponse = await ragOperations.quickQuery(
        initialMessage,
        agentId,
        knowledgeBaseIds,
        auth
      )

      await sessionService.sendMessage(session.data.id, ragResponse.response, undefined, auth)
    }

    return session
  },

  /**
   * Get agent knowledge profile and insights
   */
  async getAgentInsights(agentId: string, auth: AuthContext) {
    return knowledgeRAGIntegrationService.getAgentKnowledgeProfile(agentId, auth)
  },

  /**
   * Upload files to knowledge base with RAG optimization
   */
  async uploadKnowledgeFiles(
    files: Array<{ name: string; content: string | Buffer; mimeType: string; size: number }>,
    knowledgeBaseId: string,
    auth: AuthContext
  ) {
    return ragOperations.bulkUpload(files, knowledgeBaseId, auth)
  },
}

/**
 * Version information
 */
export const version = {
  major: 1,
  minor: 0,
  patch: 0,
  build: 'integration-bridge',
  toString: () => '1.0.0-integration-bridge',
}

/**
 * Default export for convenience
 */
export default {
  // Core services
  client: getParlantClient,
  agentService,
  sessionService,

  // Utilities
  utils: parlantUtils,
  health: checkParlantHealth,
  initialize: initializeParlantIntegration,
  createAuthContext,

  // Version
  version,
}
