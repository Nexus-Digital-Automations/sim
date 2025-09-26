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

// Agent Learning and Intelligence
export {
  agentLearningService,
  type LearningInsight,
  type LearningMetrics,
  learningUtils,
  type UserInteraction,
} from './agent-learning-service'
// Agent Management
export { AgentService, agentService } from './agent-service'
export {
  type BrandingConfig,
  type CannedResponse,
  type CannedResponseMatch,
  type CreateCannedResponseRequest,
  cannedResponseService,
  getPersonalizedResponse,
  type PersonalizationField,
  type ResponseCategory,
  suggestResponse,
  type UpdateCannedResponseRequest,
} from './canned-response-service'
// Core services
export { closeParlantClient, createParlantClient, getParlantClient, ParlantClient } from './client'
export {
  type AuditEvent,
  type ComplianceFinding,
  type ComplianceMetrics,
  type ComplianceReport,
  type ComplianceReportRequest,
  complianceReportingService,
  type GovernanceDashboardData,
  generateComplianceSummary,
  logAudit,
  type ReportFormat,
  type ReportType,
} from './compliance-reporting-service'
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
// Enterprise Governance and Compliance System
export {
  type CreatePolicyRequest,
  type GovernanceContext,
  type GovernanceHealthCheck,
  type GovernancePolicy,
  governanceComplianceService,
  initializeWorkspaceGovernance,
  type PolicyEvaluationResult,
  quickComplianceCheck,
  type RegulationType,
  type RegulatoryRequirement,
  type UpdatePolicyRequest,
} from './governance-compliance-service'
// Governance and Compliance Types
export type {
  AuditAction,
  AuditChange,
  // Compliance reporting types
  AuditEventType,
  ComplianceRecommendation,
  ComplianceStatus,
  EnforcementLevel,
  FilterPattern,
  FilterType,
  FindingType,
  // Utility types
  GovernanceError,
  GovernanceErrorCode,
  PolicyAction,
  // Core governance types
  PolicyCategory,
  PolicyCondition,
  PolicyPriority,
  PolicyRule,
  PolicyStatus,
  PolicyType,
  ScanStatus,
  // Security scanning types
  ScanType,
  ViolationEvidence,
} from './governance-compliance-types'
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
export {
  type ContentFilter,
  type ContentFilterResult,
  quickSecurityScan,
  type SecurityScan,
  type SecurityScanRequest,
  type SecurityScanResult,
  type SecurityViolation,
  safeFilterContent,
  securityScanningService,
  type ViolationSeverity,
  type ViolationType,
} from './security-scanning-service'
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

  // ==================== GOVERNANCE AND COMPLIANCE UTILITIES ====================

  /**
   * Initialize governance for a workspace with default policies
   */
  async initializeWorkspaceGovernance(workspaceId: string, auth: AuthContext) {
    try {
      await initializeWorkspaceGovernance(workspaceId, auth)
      console.log(`[Parlant] Governance initialized for workspace: ${workspaceId}`)
    } catch (error) {
      console.error(
        `[Parlant] Failed to initialize governance for workspace ${workspaceId}:`,
        error
      )
      throw error
    }
  },

  /**
   * Perform quick compliance check on content
   */
  async checkContentCompliance(
    content: string,
    workspaceId: string,
    userId: string,
    options?: {
      agentId?: string
      sessionId?: string
    }
  ) {
    try {
      return await quickComplianceCheck(content, workspaceId, userId, options?.agentId)
    } catch (error) {
      console.error('[Parlant] Compliance check failed:', error)
      return { compliant: false, violations: [], riskScore: 100 }
    }
  },

  /**
   * Get intelligent response suggestion for query
   */
  async suggestCannedResponse(query: string, workspaceId: string, context?: Record<string, any>) {
    try {
      return await suggestResponse(query, workspaceId, context)
    } catch (error) {
      console.error('[Parlant] Response suggestion failed:', error)
      return null
    }
  },

  /**
   * Apply security filtering to content
   */
  async filterContentSafely(content: string, workspaceId: string) {
    try {
      return await safeFilterContent(content, workspaceId)
    } catch (error) {
      console.error('[Parlant] Content filtering failed:', error)
      return { filteredContent: content, modificationsCount: 0 }
    }
  },

  /**
   * Generate compliance summary report for workspace
   */
  async getComplianceSummary(workspaceId: string, days = 30) {
    try {
      return await generateComplianceSummary(workspaceId, days)
    } catch (error) {
      console.error('[Parlant] Compliance summary generation failed:', error)
      return {
        complianceScore: 0,
        violations: 0,
        recommendations: ['Manual review required due to error'],
      }
    }
  },

  /**
   * Comprehensive governance health check
   */
  async checkGovernanceHealth() {
    try {
      const governanceHealth = await governanceComplianceService.healthCheck()
      const scanningHealth = await securityScanningService.getScanningHealth()

      return {
        overall_status:
          governanceHealth.overall_status === 'healthy' && scanningHealth.status === 'healthy'
            ? 'healthy'
            : 'degraded',
        governance: governanceHealth,
        scanning: scanningHealth,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[Parlant] Governance health check failed:', error)
      return {
        overall_status: 'critical',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  },

  /**
   * Create policy with standard configuration
   */
  async createStandardPolicy(
    name: string,
    category: 'data_governance' | 'content_filtering' | 'security' | 'compliance',
    workspaceId: string,
    auth: AuthContext,
    options?: {
      description?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
      enforcement?: 'monitor' | 'warn' | 'block' | 'escalate'
    }
  ) {
    const policyData = {
      workspace_id: workspaceId,
      name,
      description: options?.description || `Standard ${category} policy`,
      category,
      type: 'mandatory' as const,
      status: 'active' as const,
      priority: options?.priority || 'medium',
      rules: [], // Would be populated based on category
      enforcement_level: options?.enforcement || 'warn',
      created_by: auth.user_id,
      last_modified_by: auth.user_id,
    }

    return governanceComplianceService.createPolicy(policyData, auth)
  },

  /**
   * Integrated conversation flow with governance
   */
  async startGovernedConversation(
    agentId: string,
    workspaceId: string,
    auth: AuthContext,
    initialMessage?: string,
    options?: {
      enableCompliance?: boolean
      enableFiltering?: boolean
      customerId?: string
    }
  ) {
    // Initialize governance if not already done
    try {
      await initializeWorkspaceGovernance(workspaceId, auth)
    } catch (error) {
      console.warn('[Parlant] Governance initialization warning:', error)
    }

    // Check message compliance if enabled and message provided
    if (initialMessage && options?.enableCompliance) {
      const complianceCheck = await this.checkContentCompliance(
        initialMessage,
        workspaceId,
        auth.user_id,
        { agentId }
      )

      if (!complianceCheck.compliant) {
        throw new Error(
          `Message violates compliance policies. Risk score: ${complianceCheck.riskScore}`
        )
      }
    }

    // Filter content if enabled
    let filteredMessage = initialMessage
    if (initialMessage && options?.enableFiltering) {
      const filterResult = await this.filterContentSafely(initialMessage, workspaceId)
      filteredMessage = filterResult.filteredContent

      // Log if modifications were made
      if (filterResult.modificationsCount > 0) {
        await logAudit(
          'content_filter',
          'message',
          'initial_message',
          'filter',
          workspaceId,
          auth.user_id,
          {
            modifications_count: filterResult.modificationsCount,
            original_length: initialMessage.length,
            filtered_length: filteredMessage.length,
          }
        )
      }
    }

    // Start conversation with filtered/validated content
    return this.startConversation(agentId, workspaceId, auth, filteredMessage, options?.customerId)
  },
}

/**
 * Version information
 */
export const version = {
  major: 1,
  minor: 1,
  patch: 0,
  build: 'governance-compliance',
  toString: () => '1.1.0-governance-compliance',
  features: [
    'agent-management',
    'session-handling',
    'rag-integration',
    'multi-agent-orchestration',
    'governance-compliance',
    'security-scanning',
    'canned-responses',
    'audit-trails',
    'regulatory-compliance',
  ],
}

/**
 * Default export for convenience
 */
export default {
  // Core services
  client: getParlantClient,
  agentService,
  sessionService,

  // Governance and Compliance services
  governance: {
    service: governanceComplianceService,
    initialize: initializeWorkspaceGovernance,
    quickCheck: quickComplianceCheck,
  },
  cannedResponses: {
    service: cannedResponseService,
    suggest: suggestResponse,
    personalize: getPersonalizedResponse,
  },
  security: {
    scanning: securityScanningService,
    quickScan: quickSecurityScan,
    filter: safeFilterContent,
  },
  compliance: {
    reporting: complianceReportingService,
    audit: logAudit,
    summary: generateComplianceSummary,
  },

  // Utilities
  utils: parlantUtils,
  health: checkParlantHealth,
  initialize: initializeParlantIntegration,
  createAuthContext,

  // Version and capabilities
  version,
  capabilities: {
    hasGovernance: true,
    hasCompliance: true,
    hasSecurity: true,
    hasAuditTrails: true,
    hasRAG: true,
    hasOrchestration: true,
  },
}
