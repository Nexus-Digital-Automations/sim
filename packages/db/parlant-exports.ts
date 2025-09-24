/**
 * Parlant Database Types - Comprehensive Export Module
 *
 * This file serves as the main entry point for all Parlant database types, schemas,
 * query helpers, and utilities. It provides a clean, organized API for consuming
 * Parlant functionality throughout the application.
 *
 * @example
 * ```typescript
 * // Import specific types
 * import type { ParlantAgent, CreateAgentParams } from '@sim/db/parlant'
 *
 * // Import query helpers
 * import { createParlantQueries } from '@sim/db/parlant'
 *
 * // Import validation schemas
 * import { parlantSchemas, validateCreateAgent } from '@sim/db/parlant'
 *
 * // Import union types and type guards
 * import type { TypedParlantEvent } from '@sim/db/parlant'
 * import { isCustomerMessageContent } from '@sim/db/parlant'
 * ```
 */

// =============================================================================
// Re-export Database Schema
// =============================================================================

export {
  // Core Parlant tables
  parlantAgent,
  parlantSession,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantVariable,
  parlantTool,
  parlantTerm,
  parlantCannedResponse,

  // Workspace integration tables
  parlantAgentWorkflow,
  parlantAgentApiKey,
  parlantSessionWorkflow,

  // Junction tables
  parlantAgentTool,
  parlantJourneyGuideline,
  parlantAgentKnowledgeBase,
  parlantToolIntegration,

  // All tables collection
  parlantTables,

  // Enums
  parlantEnums,
  agentStatusEnum,
  sessionModeEnum,
  sessionStatusEnum,
  eventTypeEnum,
  journeyStateTypeEnum,
  compositionModeEnum,
} from './parlant-schema'

// =============================================================================
// Re-export Core Types
// =============================================================================

export type {
  // Enum types
  AgentStatus,
  SessionMode,
  SessionStatus,
  EventType,
  JourneyStateType,
  CompositionMode,

  // Core entity types (select models)
  ParlantAgent,
  ParlantSession,
  ParlantEvent,
  ParlantGuideline,
  ParlantJourney,
  ParlantJourneyState,
  ParlantJourneyTransition,
  ParlantVariable,
  ParlantTool,
  ParlantTerm,
  ParlantCannedResponse,

  // Junction table types
  ParlantAgentTool,
  ParlantJourneyGuideline,
  ParlantAgentKnowledgeBase,
  ParlantToolIntegration,

  // Insert types
  ParlantAgentInsert,
  ParlantSessionInsert,
  ParlantEventInsert,
  ParlantGuidelineInsert,
  ParlantJourneyInsert,
  ParlantJourneyStateInsert,
  ParlantJourneyTransitionInsert,
  ParlantVariableInsert,
  ParlantToolInsert,
  ParlantTermInsert,
  ParlantCannedResponseInsert,
  ParlantAgentToolInsert,
  ParlantJourneyGuidelineInsert,
  ParlantAgentKnowledgeBaseInsert,
  ParlantToolIntegrationInsert,

  // Update types
  ParlantAgentUpdate,
  ParlantSessionUpdate,
  ParlantEventUpdate,
  ParlantGuidelineUpdate,
  ParlantJourneyUpdate,
  ParlantJourneyStateUpdate,
  ParlantJourneyTransitionUpdate,
  ParlantVariableUpdate,
  ParlantToolUpdate,
  ParlantTermUpdate,
  ParlantCannedResponseUpdate,
  ParlantAgentToolUpdate,
  ParlantJourneyGuidelineUpdate,
  ParlantAgentKnowledgeBaseUpdate,
  ParlantToolIntegrationUpdate,

  // Specialized creation types
  CreateAgentParams,
  CreateSessionParams,
  CreateEventParams,
  CreateGuidelineParams,
  CreateJourneyParams,
  CreateToolParams,

  // Composite types with relations
  AgentWithRelations,
  SessionWithRelations,
  JourneyWithFlow,
  ToolWithIntegration,

  // Filter types
  AgentFilters,
  SessionFilters,
  EventFilters,
  JourneyFilters,

  // Statistics and analytics types
  AgentStats,
  SessionAnalytics,
  JourneyAnalytics,

  // Error and validation types
  ParlantError,
  ValidationError,
  BatchOperationResult,

  // Pagination types
  PaginationParams,
  PaginatedResponse,

  // API response types
  ParlantApiResponse,
  ParlantBulkApiResponse,

  // Utility types
  InferSelectModel,
  InferInsertModel,
} from './parlant-types'

// =============================================================================
// Re-export Union Types and Polymorphic Relationships
// =============================================================================

export type {
  // Event content union types
  ParlantEventContent,
  CustomerMessageContent,
  AgentMessageContent,
  ToolCallContent,
  ToolResultContent,
  StatusUpdateContent,
  JourneyTransitionContent,
  VariableUpdateContent,

  // Journey state configuration union types
  JourneyStateConfiguration,
  ChatStateConfig,
  ToolStateConfig,
  DecisionStateConfig,
  FinalStateConfig,

  // Tool integration union types
  ToolIntegrationConfiguration,
  CustomToolIntegration,
  WorkflowBlockIntegration,
  McpServerIntegration,
  ExternalApiIntegration,

  // Session context union types
  SessionContext,
  AnonymousSessionContext,
  AuthenticatedSessionContext,
  CustomerSessionContext,

  // Composite entity types with typing
  TypedParlantEvent,
  TypedJourneyState,
  TypedParlantTool,
  TypedParlantSession,

  // Query result union types
  AgentQueryResult,
  SessionQueryResult,
  JourneyQueryResult,

  // Factory interfaces
  EventFactory,
  StateFactory,

  // All union types collection
  ParlantUnionTypes,
} from './parlant-unions'

// Re-export type guard functions
export {
  // Event content type guards
  isCustomerMessageContent,
  isAgentMessageContent,
  isToolCallContent,
  isToolResultContent,
  isJourneyTransitionContent,

  // Journey state configuration type guards
  isChatStateConfig,
  isToolStateConfig,
  isDecisionStateConfig,
  isFinalStateConfig,

  // Tool integration type guards
  isCustomToolIntegration,
  isWorkflowBlockIntegration,
  isMcpServerIntegration,

  // Session context type guards
  isAnonymousSession,
  isAuthenticatedSession,
  isCustomerSession,
} from './parlant-unions'

// =============================================================================
// Re-export Query Helpers
// =============================================================================

export {
  // Query helper classes
  ParlantAgentQueries,
  ParlantSessionQueries,
  ParlantEventQueries,

  // Convenience query factory
  createParlantQueries,

  // Utility functions
  withErrorHandling,
  batchInsert,
  withWorkspaceScope,
} from './parlant-queries'

export type {
  // Query helper collection type
  ParlantQueries,
} from './parlant-queries'

// =============================================================================
// Re-export Validation Schemas
// =============================================================================

export {
  // Base validation schemas
  uuidSchema,
  timestampSchema,
  jsonObjectSchema,
  jsonArraySchema,
  jsonSchema,

  // Enum schemas
  agentStatusSchema,
  sessionModeSchema,
  sessionStatusSchema,
  eventTypeSchema,
  journeyStateTypeSchema,
  compositionModeSchema,

  // Entity creation schemas
  createAgentSchema,
  createSessionSchema,
  createEventSchema,
  createGuidelineSchema,
  createJourneySchema,
  createJourneyStateSchema,
  createToolSchema,
  createVariableSchema,

  // Entity update schemas
  updateAgentSchema,
  updateSessionSchema,
  updateGuidelineSchema,
  updateJourneySchema,

  // Entity response schemas
  agentResponseSchema,
  sessionResponseSchema,
  eventResponseSchema,
  guidelineResponseSchema,
  journeyResponseSchema,
  journeyStateResponseSchema,
  toolResponseSchema,
  variableResponseSchema,

  // Filter schemas
  agentFilterSchema,
  sessionFilterSchema,
  paginationSchema,

  // Bulk operation schemas
  bulkCreateAgentSchema,
  bulkCreateSessionSchema,

  // API schemas
  apiResponseSchema,
  paginatedResponseSchema,

  // All schemas collection
  parlantSchemas,

  // Validation utility functions
  validateCreateAgent,
  validateCreateSession,
  validateCreateEvent,
  validatePagination,
  validateAgentFilters,
  validateSessionFilters,
  safeValidate,
  formatValidationErrors,
} from './parlant-validation'

export type {
  // Validated type definitions
  ValidatedCreateAgent,
  ValidatedCreateSession,
  ValidatedCreateEvent,
  ValidatedAgentFilters,
  ValidatedSessionFilters,
  ValidatedPagination,
} from './parlant-validation'

// =============================================================================
// Convenience Re-exports for Common Patterns
// =============================================================================

/**
 * Common imports collection for easier consumption
 */
export const ParlantDatabase = {
  // Query helpers factory
  createQueries: createParlantQueries,

  // Validation schemas
  schemas: parlantSchemas,
} as const

/**
 * Type utilities collection
 */
export const ParlantTypes = {
  // Type guards
  guards: {
    // Event content
    isCustomerMessage: isCustomerMessageContent,
    isAgentMessage: isAgentMessageContent,
    isToolCall: isToolCallContent,
    isToolResult: isToolResultContent,
    isJourneyTransition: isJourneyTransitionContent,

    // Journey state config
    isChatState: isChatStateConfig,
    isToolState: isToolStateConfig,
    isDecisionState: isDecisionStateConfig,
    isFinalState: isFinalStateConfig,

    // Tool integration
    isCustomTool: isCustomToolIntegration,
    isWorkflowBlock: isWorkflowBlockIntegration,
    isMcpServer: isMcpServerIntegration,

    // Session context
    isAnonymous: isAnonymousSession,
    isAuthenticated: isAuthenticatedSession,
    isCustomer: isCustomerSession,
  },

  // Validation utilities
  validation: {
    safeValidate,
    formatErrors: formatValidationErrors,
    validateAgent: validateCreateAgent,
    validateSession: validateCreateSession,
    validateEvent: validateCreateEvent,
    validatePagination,
    validateAgentFilters,
    validateSessionFilters,
  },

  // Utility functions
  utils: {
    withErrorHandling,
    batchInsert,
    withWorkspaceScope,
  },
} as const

// =============================================================================
// Documentation and Usage Examples
// =============================================================================

/**
 * @example Basic Agent Operations
 * ```typescript
 * import { createParlantQueries, CreateAgentParams, ParlantAgent } from '@sim/db/parlant'
 * import { db } from '@sim/db'
 *
 * const queries = createParlantQueries(db)
 *
 * // Create a new agent
 * const agentParams: CreateAgentParams = {
 *   workspaceId: 'workspace-123',
 *   createdBy: 'user-456',
 *   name: 'Customer Support Agent',
 *   description: 'Handles customer inquiries and support tickets',
 *   compositionMode: 'fluid',
 *   modelProvider: 'openai',
 *   modelName: 'gpt-4',
 * }
 *
 * const agent: ParlantAgent = await queries.agents.create(agentParams)
 *
 * // Get agent with relations
 * const fullAgent = await queries.agents.getById(agent.id, true)
 *
 * // List agents with filtering
 * const activeAgents = await queries.agents.getMany(
 *   { workspaceId: 'workspace-123', status: 'active' },
 *   { page: 1, pageSize: 10 }
 * )
 * ```
 */

/**
 * @example Session Management
 * ```typescript
 * import { createParlantQueries, CreateSessionParams, TypedParlantSession } from '@sim/db/parlant'
 *
 * const queries = createParlantQueries(db)
 *
 * // Create a customer session
 * const sessionParams: CreateSessionParams = {
 *   agentId: 'agent-123',
 *   workspaceId: 'workspace-456',
 *   customerId: 'customer-789',
 *   title: 'Support Inquiry - Order #12345',
 *   mode: 'auto',
 *   metadata: {
 *     source: 'chat_widget',
 *     priority: 'high',
 *     category: 'billing'
 *   }
 * }
 *
 * const session = await queries.sessions.create(sessionParams)
 *
 * // Get session with full context
 * const fullSession = await queries.sessions.getById(session.id, true)
 * ```
 */

/**
 * @example Event Handling with Union Types
 * ```typescript
 * import {
 *   createParlantQueries,
 *   TypedParlantEvent,
 *   CustomerMessageContent,
 *   isCustomerMessageContent
 * } from '@sim/db/parlant'
 *
 * const queries = createParlantQueries(db)
 *
 * // Create typed event
 * const messageEvent: TypedParlantEvent<CustomerMessageContent> = {
 *   sessionId: 'session-123',
 *   offset: 0,
 *   eventType: 'customer_message',
 *   content: {
 *     type: 'customer_message',
 *     timestamp: new Date().toISOString(),
 *     message: {
 *       text: 'I need help with my order',
 *       attachments: []
 *     },
 *     sender: {
 *       customerId: 'customer-456',
 *       displayName: 'John Doe',
 *       isAnonymous: false
 *     }
 *   }
 * }
 *
 * // Type guard usage
 * function handleEvent(event: TypedParlantEvent) {
 *   if (isCustomerMessageContent(event.content)) {
 *     // TypeScript knows this is CustomerMessageContent
 *     const messageText = event.content.message.text
 *     const senderName = event.content.sender.displayName
 *     // Handle customer message...
 *   }
 * }
 * ```
 */

/**
 * @example Validation with Schemas
 * ```typescript
 * import { validateCreateAgent, parlantSchemas, safeValidate } from '@sim/db/parlant'
 *
 * // Direct validation
 * try {
 *   const validatedAgent = validateCreateAgent({
 *     workspaceId: 'workspace-123',
 *     createdBy: 'user-456',
 *     name: 'My Agent',
 *     // ... other fields
 *   })
 *   // validatedAgent is now type-safe and validated
 * } catch (error) {
 *   // Handle validation errors
 * }
 *
 * // Safe validation with error handling
 * const result = safeValidate(parlantSchemas.createAgent, userData)
 * if (result.success) {
 *   // result.data is validated and type-safe
 *   const agent = await queries.agents.create(result.data)
 * } else {
 *   // result.errors contains Zod validation errors
 *   const formattedErrors = formatValidationErrors(result.errors)
 * }
 * ```
 */

/**
 * @example Advanced Journey State Management
 * ```typescript
 * import {
 *   TypedJourneyState,
 *   ChatStateConfig,
 *   isChatStateConfig,
 *   parlantSchemas
 * } from '@sim/db/parlant'
 *
 * // Create typed journey state
 * const chatState: TypedJourneyState<ChatStateConfig> = {
 *   journeyId: 'journey-123',
 *   name: 'Welcome Message',
 *   stateType: 'chat',
 *   configuration: {
 *     stateType: 'chat',
 *     prompt: {
 *       template: 'Hello {customerName}! How can I help you today?',
 *       variables: { customerName: 'user.name' },
 *       tone: 'friendly'
 *     },
 *     validation: {
 *       required: true,
 *       minLength: 1
 *     }
 *   }
 * }
 *
 * // Type-safe state handling
 * function handleJourneyState(state: TypedJourneyState) {
 *   if (isChatStateConfig(state.configuration)) {
 *     const prompt = state.configuration.prompt.template
 *     const tone = state.configuration.prompt.tone
 *     // Handle chat state...
 *   }
 * }
 * ```
 */

// =============================================================================
// Version and Metadata
// =============================================================================

/**
 * Parlant database types package metadata
 */
export const PARLANT_TYPES_VERSION = '1.0.0'
export const PARLANT_TYPES_BUILD = new Date().toISOString()

/**
 * Feature flags and capabilities
 */
export const PARLANT_FEATURES = {
  UNION_TYPES: true,
  TYPE_GUARDS: true,
  VALIDATION_SCHEMAS: true,
  QUERY_HELPERS: true,
  POLYMORPHIC_RELATIONSHIPS: true,
  WORKSPACE_SCOPING: true,
  BATCH_OPERATIONS: true,
  ERROR_HANDLING: true,
  ANALYTICS_SUPPORT: true,
  INTEGRATION_SUPPORT: true,
} as const

/**
 * Supported integrations and extensions
 */
export const PARLANT_INTEGRATIONS = {
  SIM_WORKFLOWS: true,
  SIM_KNOWLEDGE_BASES: true,
  SIM_API_KEYS: true,
  SIM_CUSTOM_TOOLS: true,
  MCP_SERVERS: true,
  EXTERNAL_APIS: true,
} as const