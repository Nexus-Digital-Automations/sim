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
export { agentStatusEnum, compositionModeEnum, eventTypeEnum, journeyStateTypeEnum, parlantAgent, parlantAgentApiKey, parlantAgentKnowledgeBase, parlantAgentTool, parlantAgentWorkflow, parlantCannedResponse, parlantEnums, parlantEvent, parlantGuideline, parlantJourney, parlantJourneyGuideline, parlantJourneyState, parlantJourneyTransition, parlantSession, parlantSessionWorkflow, parlantTables, parlantTerm, parlantTool, parlantToolIntegration, parlantVariable, sessionModeEnum, sessionStatusEnum, } from './parlant-schema';
export type { AgentFilters, AgentStats, AgentStatus, AgentWithRelations, BatchOperationResult, CompositionMode, CreateAgentParams, CreateEventParams, CreateGuidelineParams, CreateJourneyParams, CreateSessionParams, CreateToolParams, EventFilters, EventType, InferInsertModel, InferSelectModel, JourneyAnalytics, JourneyFilters, JourneyStateType, JourneyWithFlow, PaginatedResponse, PaginationParams, ParlantAgent, ParlantAgentInsert, ParlantAgentKnowledgeBase, ParlantAgentKnowledgeBaseInsert, ParlantAgentKnowledgeBaseUpdate, ParlantAgentTool, ParlantAgentToolInsert, ParlantAgentToolUpdate, ParlantAgentUpdate, ParlantApiResponse, ParlantBulkApiResponse, ParlantCannedResponse, ParlantCannedResponseInsert, ParlantCannedResponseUpdate, ParlantError, ParlantEvent, ParlantEventInsert, ParlantEventUpdate, ParlantGuideline, ParlantGuidelineInsert, ParlantGuidelineUpdate, ParlantJourney, ParlantJourneyGuideline, ParlantJourneyGuidelineInsert, ParlantJourneyGuidelineUpdate, ParlantJourneyInsert, ParlantJourneyState, ParlantJourneyStateInsert, ParlantJourneyStateUpdate, ParlantJourneyTransition, ParlantJourneyTransitionInsert, ParlantJourneyTransitionUpdate, ParlantJourneyUpdate, ParlantSession, ParlantSessionInsert, ParlantSessionUpdate, ParlantTerm, ParlantTermInsert, ParlantTermUpdate, ParlantTool, ParlantToolInsert, ParlantToolIntegration, ParlantToolIntegrationInsert, ParlantToolIntegrationUpdate, ParlantToolUpdate, ParlantVariable, ParlantVariableInsert, ParlantVariableUpdate, SessionAnalytics, SessionFilters, SessionMode, SessionStatus, SessionWithRelations, ToolWithIntegration, ValidationError, } from './parlant-types';
export type { AgentMessageContent, AgentQueryResult, AnonymousSessionContext, AuthenticatedSessionContext, ChatStateConfig, CustomerMessageContent, CustomerSessionContext, CustomToolIntegration, DecisionStateConfig, EventFactory, ExternalApiIntegration, FinalStateConfig, JourneyQueryResult, JourneyStateConfiguration, JourneyTransitionContent, McpServerIntegration, ParlantEventContent, ParlantUnionTypes, SessionContext, SessionQueryResult, StateFactory, StatusUpdateContent, ToolCallContent, ToolIntegrationConfiguration, ToolResultContent, ToolStateConfig, TypedJourneyState, TypedParlantEvent, TypedParlantSession, TypedParlantTool, VariableUpdateContent, WorkflowBlockIntegration, } from './parlant-unions';
export { isAgentMessageContent, isAnonymousSession, isAuthenticatedSession, isChatStateConfig, isCustomerMessageContent, isCustomerSession, isCustomToolIntegration, isDecisionStateConfig, isFinalStateConfig, isJourneyTransitionContent, isMcpServerIntegration, isToolCallContent, isToolResultContent, isToolStateConfig, isWorkflowBlockIntegration, } from './parlant-unions';
export type { ParlantQueries, } from './parlant-queries';
export { batchInsert, createParlantQueries, ParlantAgentQueries, ParlantEventQueries, ParlantSessionQueries, withErrorHandling, withWorkspaceScope, } from './parlant-queries';
export type { ValidatedAgentFilters, ValidatedCreateAgent, ValidatedCreateEvent, ValidatedCreateSession, ValidatedPagination, ValidatedSessionFilters, } from './parlant-validation';
export { agentFilterSchema, agentResponseSchema, agentStatusSchema, apiResponseSchema, bulkCreateAgentSchema, bulkCreateSessionSchema, compositionModeSchema, createAgentSchema, createEventSchema, createGuidelineSchema, createJourneySchema, createJourneyStateSchema, createSessionSchema, createToolSchema, createVariableSchema, eventResponseSchema, eventTypeSchema, formatValidationErrors, guidelineResponseSchema, journeyResponseSchema, journeyStateResponseSchema, journeyStateTypeSchema, jsonArraySchema, jsonObjectSchema, jsonSchema, paginatedResponseSchema, paginationSchema, parlantSchemas, safeValidate, sessionFilterSchema, sessionModeSchema, sessionResponseSchema, sessionStatusSchema, timestampSchema, toolResponseSchema, updateAgentSchema, updateGuidelineSchema, updateJourneySchema, updateSessionSchema, uuidSchema, validateAgentFilters, validateCreateAgent, validateCreateEvent, validateCreateSession, validatePagination, validateSessionFilters, variableResponseSchema, } from './parlant-validation';
/**
 * Common imports collection for easier consumption
 */
/**
 * Type utilities collection
 */
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
/**
 * Parlant database types package metadata
 */
export declare const PARLANT_TYPES_VERSION = "1.0.0";
export declare const PARLANT_TYPES_BUILD: string;
/**
 * Feature flags and capabilities
 */
export declare const PARLANT_FEATURES: {
    readonly UNION_TYPES: true;
    readonly TYPE_GUARDS: true;
    readonly VALIDATION_SCHEMAS: true;
    readonly QUERY_HELPERS: true;
    readonly POLYMORPHIC_RELATIONSHIPS: true;
    readonly WORKSPACE_SCOPING: true;
    readonly BATCH_OPERATIONS: true;
    readonly ERROR_HANDLING: true;
    readonly ANALYTICS_SUPPORT: true;
    readonly INTEGRATION_SUPPORT: true;
};
/**
 * Supported integrations and extensions
 */
export declare const PARLANT_INTEGRATIONS: {
    readonly SIM_WORKFLOWS: true;
    readonly SIM_KNOWLEDGE_BASES: true;
    readonly SIM_API_KEYS: true;
    readonly SIM_CUSTOM_TOOLS: true;
    readonly MCP_SERVERS: true;
    readonly EXTERNAL_APIS: true;
};
