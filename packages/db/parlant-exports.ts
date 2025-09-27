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
  agentStatusEnum,
  compositionModeEnum,
  eventTypeEnum,
  journeyStateTypeEnum,
  // Core Parlant tables
  parlantAgent,
  parlantAgentApiKey,
  parlantAgentKnowledgeBase,
  // Junction tables
  parlantAgentTool,
  // Workspace integration tables
  parlantAgentWorkflow,
  parlantCannedResponse,
  parlantConversionCache,
  parlantConversionHistory,
  // Enums
  parlantEnums,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyGenerationHistory,
  parlantJourneyGuideline,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantSession,
  parlantSessionWorkflow,
  // All tables collection
  parlantTables,
  parlantTemplateParameter,
  parlantTerm,
  parlantTool,
  parlantToolIntegration,
  parlantVariable,
  parlantWorkflowTemplate,
  sessionModeEnum,
  sessionStatusEnum,
} from './parlant-schema'

// =============================================================================
// Re-export Constants
// =============================================================================

export type { TagSlot } from './consts'
export { DEFAULT_FREE_CREDITS, TAG_SLOTS } from './consts'

// =============================================================================
// Re-export Core Types
// =============================================================================

export type {
  // Filter types
  AgentFilters,
  // Statistics and analytics types
  AgentStats,
  // Enum types
  AgentStatus,
  // Composite types with relations
  AgentWithRelations,
  BatchOperationResult,
  CompositionMode,
  // Specialized creation types
  CreateAgentParams,
  CreateEventParams,
  CreateGuidelineParams,
  CreateJourneyParams,
  CreateSessionParams,
  CreateToolParams,
  EventFilters,
  EventType,
  InferInsertModel,
  // Utility types
  InferSelectModel,
  JourneyAnalytics,
  JourneyFilters,
  JourneyStateType,
  JourneyWithFlow,
  PaginatedResponse,
  // Pagination types
  PaginationParams,
  // Core entity types (select models)
  ParlantAgent,
  // Insert types
  ParlantAgentInsert,
  ParlantAgentKnowledgeBase,
  ParlantAgentKnowledgeBaseInsert,
  ParlantAgentKnowledgeBaseUpdate,
  // Junction table types
  ParlantAgentTool,
  ParlantAgentToolInsert,
  ParlantAgentToolUpdate,
  // Update types
  ParlantAgentUpdate,
  // API response types
  ParlantApiResponse,
  ParlantBulkApiResponse,
  ParlantCannedResponse,
  ParlantCannedResponseInsert,
  ParlantCannedResponseUpdate,
  // Error and validation types
  ParlantError,
  ParlantEvent,
  ParlantEventInsert,
  ParlantEventUpdate,
  ParlantGuideline,
  ParlantGuidelineInsert,
  ParlantGuidelineUpdate,
  ParlantJourney,
  ParlantJourneyGuideline,
  ParlantJourneyGuidelineInsert,
  ParlantJourneyGuidelineUpdate,
  ParlantJourneyInsert,
  ParlantJourneyState,
  ParlantJourneyStateInsert,
  ParlantJourneyStateUpdate,
  ParlantJourneyTransition,
  ParlantJourneyTransitionInsert,
  ParlantJourneyTransitionUpdate,
  ParlantJourneyUpdate,
  ParlantSession,
  ParlantSessionInsert,
  ParlantSessionUpdate,
  ParlantTerm,
  ParlantTermInsert,
  ParlantTermUpdate,
  ParlantTool,
  ParlantToolInsert,
  ParlantToolIntegration,
  ParlantToolIntegrationInsert,
  ParlantToolIntegrationUpdate,
  ParlantToolUpdate,
  ParlantVariable,
  ParlantVariableInsert,
  ParlantVariableUpdate,
  SessionAnalytics,
  SessionFilters,
  SessionMode,
  SessionStatus,
  SessionWithRelations,
  ToolWithIntegration,
  ValidationError,
} from './parlant-types'

// =============================================================================
// Re-export Union Types and Polymorphic Relationships
// =============================================================================

export type {
  AgentMessageContent,
  // Query result union types
  AgentQueryResult,
  AnonymousSessionContext,
  AuthenticatedSessionContext,
  ChatStateConfig,
  CustomerMessageContent,
  CustomerSessionContext,
  CustomToolIntegration,
  DecisionStateConfig,
  // Factory interfaces
  EventFactory,
  ExternalApiIntegration,
  FinalStateConfig,
  JourneyQueryResult,
  // Journey state configuration union types
  JourneyStateConfiguration,
  JourneyTransitionContent,
  McpServerIntegration,
  // Event content union types
  ParlantEventContent,
  // All union types collection
  ParlantUnionTypes,
  // Session context union types
  SessionContext,
  SessionQueryResult,
  StateFactory,
  StatusUpdateContent,
  ToolCallContent,
  // Tool integration union types
  ToolIntegrationConfiguration,
  ToolResultContent,
  ToolStateConfig,
  TypedJourneyState,
  // Composite entity types with typing
  TypedParlantEvent,
  TypedParlantSession,
  TypedParlantTool,
  VariableUpdateContent,
  WorkflowBlockIntegration,
} from './parlant-unions'
// Re-export type guard functions
export {
  isAgentMessageContent,
  // Session context type guards
  isAnonymousSession,
  isAuthenticatedSession,
  // Journey state configuration type guards
  isChatStateConfig,
  // Event content type guards
  isCustomerMessageContent,
  isCustomerSession,
  // Tool integration type guards
  isCustomToolIntegration,
  isDecisionStateConfig,
  isFinalStateConfig,
  isJourneyTransitionContent,
  isMcpServerIntegration,
  isToolCallContent,
  isToolResultContent,
  isToolStateConfig,
  isWorkflowBlockIntegration,
} from './parlant-unions'

// =============================================================================
// Re-export Query Helpers
// =============================================================================

export type {
  // Query helper collection type
  ParlantQueries,
} from './parlant-queries'
export {
  batchInsert,
  // Convenience query factory
  createParlantQueries,
  // Query helper classes
  ParlantAgentQueries,
  ParlantEventQueries,
  ParlantSessionQueries,
  // Utility functions
  withErrorHandling,
  withWorkspaceScope,
} from './parlant-queries'

// =============================================================================
// Re-export Validation Schemas
// =============================================================================

export type {
  ValidatedAgentFilters,
  // Validated type definitions
  ValidatedCreateAgent,
  ValidatedCreateEvent,
  ValidatedCreateSession,
  ValidatedPagination,
  ValidatedSessionFilters,
} from './parlant-validation'
export {
  // Filter schemas
  agentFilterSchema,
  // Entity response schemas
  agentResponseSchema,
  // Enum schemas
  agentStatusSchema,
  // API schemas
  apiResponseSchema,
  // Bulk operation schemas
  bulkCreateAgentSchema,
  bulkCreateSessionSchema,
  compositionModeSchema,
  // Entity creation schemas
  createAgentSchema,
  createEventSchema,
  createGuidelineSchema,
  createJourneySchema,
  createJourneyStateSchema,
  createSessionSchema,
  createToolSchema,
  createVariableSchema,
  eventResponseSchema,
  eventTypeSchema,
  formatValidationErrors,
  guidelineResponseSchema,
  journeyResponseSchema,
  journeyStateResponseSchema,
  journeyStateTypeSchema,
  jsonArraySchema,
  jsonObjectSchema,
  jsonSchema,
  paginatedResponseSchema,
  paginationSchema,
  // All schemas collection
  parlantSchemas,
  safeValidate,
  sessionFilterSchema,
  sessionModeSchema,
  sessionResponseSchema,
  sessionStatusSchema,
  timestampSchema,
  toolResponseSchema,
  // Entity update schemas
  updateAgentSchema,
  updateGuidelineSchema,
  updateJourneySchema,
  updateSessionSchema,
  // Base validation schemas
  uuidSchema,
  validateAgentFilters,
  // Validation utility functions
  validateCreateAgent,
  validateCreateEvent,
  validateCreateSession,
  validatePagination,
  validateSessionFilters,
  variableResponseSchema,
} from './parlant-validation'

// =============================================================================
// Convenience Re-exports for Common Patterns
// =============================================================================

/**
 * Common imports collection for easier consumption
 */
// Temporarily commented out to fix import issues
// export const ParlantDatabase = {
//   // Query helpers factory
//   createQueries: createParlantQueries,
//
//   // Validation schemas
//   schemas: parlantSchemas,
// } as const

/**
 * Type utilities collection
 */
// Temporarily commented out to fix import issues
// export const ParlantTypes = {
//   // Type guards
//   guards: {
//     // Event content
//     isCustomerMessage: isCustomerMessageContent,
//     isAgentMessage: isAgentMessageContent,
//     isToolCall: isToolCallContent,
//     isToolResult: isToolResultContent,
//     isJourneyTransition: isJourneyTransitionContent,
//
//     // Journey state config
//     isChatState: isChatStateConfig,
//     isToolState: isToolStateConfig,
//     isDecisionState: isDecisionStateConfig,
//     isFinalState: isFinalStateConfig,
//
//     // Tool integration
//     isCustomTool: isCustomToolIntegration,
//     isWorkflowBlock: isWorkflowBlockIntegration,
//     isMcpServer: isMcpServerIntegration,
//
//     // Session context
//     isAnonymous: isAnonymousSession,
//     isAuthenticated: isAuthenticatedSession,
//     isCustomer: isCustomerSession,
//   },
//
//   // Validation utilities
//   validation: {
//     safeValidate,
//     formatErrors: formatValidationErrors,
//     validateAgent: validateCreateAgent,
//     validateSession: validateCreateSession,
//     validateEvent: validateCreateEvent,
//     validatePagination,
//     validateAgentFilters,
//     validateSessionFilters,
//   },
//
//   // Utility functions
//   utils: {
//     withErrorHandling,
//     batchInsert,
//     withWorkspaceScope,
//   },
// } as const

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
