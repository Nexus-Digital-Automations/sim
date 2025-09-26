import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// =============================================================================
// Database Schema Exports (Main Schema)
// =============================================================================

// Re-export core database types and utilities
export type { PostgresJsDatabase }

// Core database schema tables and enums (from main schema.ts)
export {
  // Core tables - using actual table names from schema.ts
  user,
  session,
  account,
  verification,
  workflowFolder,
  workflow,
  workflowBlocks,
  workflowEdges,
  workflowSubflows,
  waitlist,
  workflowExecutionSnapshots,
  workflowExecutionLogs,
  environment,
  workspaceEnvironment,
  settings,
  workflowSchedule,
  webhook,
  workflowLogWebhook,
  workflowLogWebhookDelivery,
  apiKey,
  marketplace,
  userStats,
  customTools,
  toolCategories,
  toolRegistry,
  toolConfigurations,
  toolUsageAnalytics,
  toolRecommendations,
  subscription,
  userRateLimits,
  chat,
  organization,
  member,
  invitation,
  workspace,
  workspaceInvitation,
  permissions,
  memory,
  knowledgeBase,
  document,
  knowledgeBaseTagDefinitions,
  embedding,
  docsEmbeddings,
  copilotChats,
  workflowCheckpoints,
  templates,
  templateStars,
  copilotFeedback,
  workflowDeploymentVersion,
  idempotencyKey,
  mcpServers,
  // Core enums (main schema)
  webhookDeliveryStatusEnum,
  toolStatusEnum,
  toolScopeEnum,
  toolTypeEnum,
  permissionTypeEnum,
  workspaceInvitationStatusEnum,
  // Type exports
  type WorkspaceInvitationStatus,
  tsvector,
} from './schema'

// Constants (from consts.ts)
export {
  DEFAULT_FREE_CREDITS,
  TAG_SLOTS,
  type TagSlot,
} from './consts'

// Chat persistence schema exports (with chatPersistence prefix to avoid conflicts)
export {
  chatMessage as chatPersistenceChatMessage,
  chatConversation as chatPersistenceChatConversation,
  chatBrowserSession as chatPersistenceChatBrowserSession,
  chatSearchIndex as chatPersistenceChatSearchIndex,
  chatExportRequest as chatPersistenceChatExportRequest,
  // Chat persistence enums with unique names
  messageStatusEnum as chatPersistenceMessageStatusEnum,
  conversationTypeEnum as chatPersistenceConversationTypeEnum,
  messageTypeEnum as chatPersistenceMessageTypeEnum,
} from './schema'

// Parlant schema exports (with parlant prefix to avoid conflicts)
export {
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
  parlantAgentWorkflow,
  parlantAgentApiKey,
  parlantSessionWorkflow,
  parlantAgentTool,
  parlantJourneyGuideline,
  parlantAgentKnowledgeBase,
  parlantToolIntegration,
  parlantWorkflowTemplate,
  parlantTemplateParameter,
  parlantConversionCache,
  parlantConversionHistory,
  parlantJourneyGenerationHistory,
  // Parlant enums with unique names
  agentStatusEnum as parlantAgentStatusEnum,
  sessionModeEnum as parlantSessionModeEnum,
  sessionStatusEnum as parlantSessionStatusEnum,
  eventTypeEnum as parlantEventTypeEnum,
  journeyStateTypeEnum as parlantJourneyStateTypeEnum,
  compositionModeEnum as parlantCompositionModeEnum,
} from './schema'

// =============================================================================
// Parlant Exports (Types, Queries, Validation)
// =============================================================================

// Parlant types (only export what actually exists)
export {
  // Core entity types
  type ParlantAgent,
  type ParlantAgentInsert,
  type ParlantAgentUpdate,
  type ParlantSession,
  type ParlantSessionInsert,
  type ParlantSessionUpdate,
  type ParlantEvent,
  type ParlantEventInsert,
  type ParlantEventUpdate,
  type ParlantGuideline,
  type ParlantGuidelineInsert,
  type ParlantGuidelineUpdate,
  type ParlantJourney,
  type ParlantJourneyInsert,
  type ParlantJourneyUpdate,
  type ParlantJourneyState,
  type ParlantJourneyStateInsert,
  type ParlantJourneyStateUpdate,
  type ParlantJourneyTransition,
  type ParlantJourneyTransitionInsert,
  type ParlantJourneyTransitionUpdate,
  type ParlantVariable,
  type ParlantVariableInsert,
  type ParlantVariableUpdate,
  type ParlantTool,
  type ParlantToolInsert,
  type ParlantToolUpdate,
  type ParlantTerm,
  type ParlantTermInsert,
  type ParlantTermUpdate,
  type ParlantCannedResponse,
  type ParlantCannedResponseInsert,
  type ParlantCannedResponseUpdate,
  // Junction table types
  type ParlantAgentTool,
  type ParlantAgentToolInsert,
  type ParlantAgentToolUpdate,
  type ParlantAgentKnowledgeBase,
  type ParlantAgentKnowledgeBaseInsert,
  type ParlantAgentKnowledgeBaseUpdate,
  type ParlantToolIntegration,
  type ParlantToolIntegrationInsert,
  type ParlantToolIntegrationUpdate,
  type ParlantJourneyGuideline,
  type ParlantJourneyGuidelineInsert,
  type ParlantJourneyGuidelineUpdate,
  // Creation parameter types
  type CreateAgentParams,
  type CreateSessionParams,
  type CreateEventParams,
  type CreateGuidelineParams,
  type CreateJourneyParams,
  type CreateToolParams,
  // Enum types (aliased for clarity)
  type AgentStatus as ParlantAgentStatus,
  type SessionMode as ParlantSessionMode,
  type SessionStatus as ParlantSessionStatus,
  type EventType as ParlantEventType,
  type JourneyStateType as ParlantJourneyStateType,
  type CompositionMode as ParlantCompositionMode,
  // Utility types
  type AgentFilters,
  type EventFilters,
  type JourneyFilters,
  type SessionFilters,
  type PaginationParams,
  type PaginatedResponse,
  type BatchOperationResult,
  type ValidationError,
} from './parlant-exports'

// Parlant query helpers
export {
  createParlantQueries,
  type ParlantQueries,
  ParlantAgentQueries,
  ParlantEventQueries,
  ParlantSessionQueries,
  batchInsert,
  withErrorHandling,
  withWorkspaceScope,
} from './parlant-exports'

// Parlant validation schemas
export {
  // Schema collections
  parlantSchemas,
  // Entity creation schemas
  createAgentSchema,
  createEventSchema,
  createGuidelineSchema,
  createJourneySchema,
  createJourneyStateSchema,
  createSessionSchema,
  createToolSchema,
  createVariableSchema,
  // Entity update schemas
  updateAgentSchema,
  updateGuidelineSchema,
  updateJourneySchema,
  updateSessionSchema,
  // Bulk operation schemas
  bulkCreateAgentSchema,
  bulkCreateSessionSchema,
  // Enum schemas
  agentStatusSchema,
  sessionModeSchema,
  sessionStatusSchema,
  eventTypeSchema,
  journeyStateTypeSchema,
  compositionModeSchema,
  // Filter schemas
  agentFilterSchema,
  sessionFilterSchema,
  // Response schemas
  agentResponseSchema,
  eventResponseSchema,
  guidelineResponseSchema,
  journeyResponseSchema,
  journeyStateResponseSchema,
  sessionResponseSchema,
  toolResponseSchema,
  // API schemas
  apiResponseSchema,
  paginatedResponseSchema,
  paginationSchema,
  // Base validation utilities
  uuidSchema,
  timestampSchema,
  jsonSchema,
  jsonObjectSchema,
  jsonArraySchema,
  formatValidationErrors,
  safeValidate,
} from './parlant-exports'

// Parlant union types and type guards
export {
  // Union content types
  type TypedParlantEvent,
  type CustomerMessageContent,
  type AgentMessageContent,
  type ToolCallContent,
  type ToolResultContent,
  type StatusUpdateContent,
  type JourneyTransitionContent,
  type VariableUpdateContent,
  // Query result union types
  type AgentQueryResult,
  type JourneyQueryResult,
  type SessionQueryResult,
  // Session context union types
  type AnonymousSessionContext,
  type AuthenticatedSessionContext,
  type CustomerSessionContext,
  type SessionContext,
  // Journey state configuration union types
  type JourneyStateConfiguration,
  type ChatStateConfig,
  type ToolStateConfig,
  type DecisionStateConfig,
  type FinalStateConfig,
  // Tool integration union types
  type ToolIntegrationConfiguration,
  type CustomToolIntegration,
  type McpServerIntegration,
  type WorkflowBlockIntegration,
  type ExternalApiIntegration,
  // Event content type guards
  isCustomerMessageContent,
  isAgentMessageContent,
  isToolCallContent,
  isToolResultContent,
  isJourneyTransitionContent,
  // Session context type guards
  isAnonymousSession,
  isAuthenticatedSession,
  isCustomerSession,
  // Journey state configuration type guards
  isChatStateConfig,
  isToolStateConfig,
  isDecisionStateConfig,
  isFinalStateConfig,
  // Tool integration type guards
  isCustomToolIntegration,
  isMcpServerIntegration,
  isWorkflowBlockIntegration,
} from './parlant-exports'

// In production, use the Vercel-generated POSTGRES_URL
// In development, use the direct DATABASE_URL
const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? ''
if (!connectionString) {
  throw new Error('Missing POSTGRES_URL or DATABASE_URL environment variable')
}

/**
 * Connection Pool Allocation Strategy
 *
 * Main App: 60 connections per instance
 * Socket Server: 25 connections (operations) + 5 connections (room manager) = 30 total
 *
 * With ~3-4 Vercel serverless instances typically active:
 * - Main app: 60 × 4 = 240 connections
 * - Socket server: 30 connections total
 * - Buffer: 130 connections
 * - Total: ~400 connections
 * - Supabase limit: 400 connections (16XL instance direct connection pool)
 */

const postgresClient = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 30,
  max: 60,
  onnotice: () => {},
})

const drizzleClient = drizzle(postgresClient, { schema })

declare global {
  // eslint-disable-next-line no-var
  var database: PostgresJsDatabase<typeof schema> | undefined
}

export const db = globalThis.database || drizzleClient
if (process.env.NODE_ENV !== 'production') globalThis.database = db
