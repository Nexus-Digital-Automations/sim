import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// =============================================================================
// Database Schema Exports (Main Schema)
// =============================================================================

// Re-export core database types and utilities
export type { PostgresJsDatabase };

// Constants (from consts.ts)
export { DEFAULT_FREE_CREDITS, TAG_SLOTS, type TagSlot } from "./consts";
// Parlant types (only export what actually exists)
// Parlant query helpers
// Parlant validation schemas
// Parlant union types and type guards
export {
  // Utility types
  type AgentFilters,
  type AgentMessageContent,
  // Query result union types
  type AgentQueryResult,
  // Enum types (aliased for clarity)
  type AgentStatus as ParlantAgentStatus,
  // Session context union types
  type AnonymousSessionContext,
  type AuthenticatedSessionContext,
  // Filter schemas
  agentFilterSchema,
  // Response schemas
  agentResponseSchema,
  // Enum schemas
  agentStatusSchema,
  // API schemas
  apiResponseSchema,
  type BatchOperationResult,
  batchInsert,
  // Bulk operation schemas
  bulkCreateAgentSchema,
  bulkCreateSessionSchema,
  type ChatStateConfig,
  type CompositionMode as ParlantCompositionMode,
  // Creation parameter types
  type CreateAgentParams,
  type CreateEventParams,
  type CreateGuidelineParams,
  type CreateJourneyParams,
  type CreateSessionParams,
  type CreateToolParams,
  type CustomerMessageContent,
  type CustomerSessionContext,
  type CustomToolIntegration,
  compositionModeSchema,
  // Entity creation schemas
  createAgentSchema,
  createEventSchema,
  createGuidelineSchema,
  createJourneySchema,
  createJourneyStateSchema,
  createParlantQueries,
  createSessionSchema,
  createToolSchema,
  createVariableSchema,
  type DecisionStateConfig,
  type EventFilters,
  type EventType as ParlantEventType,
  type ExternalApiIntegration,
  eventResponseSchema,
  eventTypeSchema,
  type FinalStateConfig,
  formatValidationErrors,
  guidelineResponseSchema,
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
  type JourneyFilters,
  type JourneyQueryResult,
  // Journey state configuration union types
  type JourneyStateConfiguration,
  type JourneyStateType as ParlantJourneyStateType,
  type JourneyTransitionContent,
  journeyResponseSchema,
  journeyStateResponseSchema,
  journeyStateTypeSchema,
  jsonArraySchema,
  jsonObjectSchema,
  jsonSchema,
  type McpServerIntegration,
  type PaginatedResponse,
  type PaginationParams,
  // Core entity types
  type ParlantAgent,
  type ParlantAgentInsert,
  type ParlantAgentKnowledgeBase,
  type ParlantAgentKnowledgeBaseInsert,
  type ParlantAgentKnowledgeBaseUpdate,
  ParlantAgentQueries,
  // Junction table types
  type ParlantAgentTool,
  type ParlantAgentToolInsert,
  type ParlantAgentToolUpdate,
  type ParlantAgentUpdate,
  type ParlantCannedResponse,
  type ParlantCannedResponseInsert,
  type ParlantCannedResponseUpdate,
  type ParlantEvent,
  type ParlantEventInsert,
  ParlantEventQueries,
  type ParlantEventUpdate,
  type ParlantGuideline,
  type ParlantGuidelineInsert,
  type ParlantGuidelineUpdate,
  type ParlantJourney,
  type ParlantJourneyGuideline,
  type ParlantJourneyGuidelineInsert,
  type ParlantJourneyGuidelineUpdate,
  type ParlantJourneyInsert,
  type ParlantJourneyState,
  type ParlantJourneyStateInsert,
  type ParlantJourneyStateUpdate,
  type ParlantJourneyTransition,
  type ParlantJourneyTransitionInsert,
  type ParlantJourneyTransitionUpdate,
  type ParlantJourneyUpdate,
  type ParlantQueries,
  type ParlantSession,
  type ParlantSessionInsert,
  ParlantSessionQueries,
  type ParlantSessionUpdate,
  type ParlantTerm,
  type ParlantTermInsert,
  type ParlantTermUpdate,
  type ParlantTool,
  type ParlantToolInsert,
  type ParlantToolIntegration,
  type ParlantToolIntegrationInsert,
  type ParlantToolIntegrationUpdate,
  type ParlantToolUpdate,
  type ParlantVariable,
  type ParlantVariableInsert,
  type ParlantVariableUpdate,
  paginatedResponseSchema,
  paginationSchema,
  // Schema collections
  parlantSchemas,
  type SessionContext,
  type SessionFilters,
  type SessionMode as ParlantSessionMode,
  type SessionQueryResult,
  type SessionStatus as ParlantSessionStatus,
  type StatusUpdateContent,
  safeValidate,
  sessionFilterSchema,
  sessionModeSchema,
  sessionResponseSchema,
  sessionStatusSchema,
  type ToolCallContent,
  // Tool integration union types
  type ToolIntegrationConfiguration,
  type ToolResultContent,
  type ToolStateConfig,
  // Union content types
  type TypedParlantEvent,
  timestampSchema,
  toolResponseSchema,
  // Entity update schemas
  updateAgentSchema,
  updateGuidelineSchema,
  updateJourneySchema,
  updateSessionSchema,
  // Base validation utilities
  uuidSchema,
  type ValidationError,
  type VariableUpdateContent,
  type WorkflowBlockIntegration,
  withErrorHandling,
  withWorkspaceScope,
} from "./parlant-exports";
// Core database schema tables and enums (from main schema.ts)
// Chat persistence schema exports (with chatPersistence prefix to avoid conflicts)
// Parlant schema exports (with parlant prefix to avoid conflicts)
export {
  account,
  // Parlant enums with unique names
  agentStatusEnum as parlantAgentStatusEnum,
  apiKey,
  chat,
  chatBrowserSession as chatPersistenceChatBrowserSession,
  chatConversation as chatPersistenceChatConversation,
  chatExportRequest as chatPersistenceChatExportRequest,
  chatMessage as chatPersistenceChatMessage,
  chatSearchIndex as chatPersistenceChatSearchIndex,
  compositionModeEnum as parlantCompositionModeEnum,
  conversationTypeEnum as chatPersistenceConversationTypeEnum,
  copilotChats,
  copilotFeedback,
  customTools,
  docsEmbeddings,
  document,
  embedding,
  environment,
  eventTypeEnum as parlantEventTypeEnum,
  idempotencyKey,
  invitation,
  journeyStateTypeEnum as parlantJourneyStateTypeEnum,
  knowledgeBase,
  knowledgeBaseTagDefinitions,
  marketplace,
  mcpServers,
  member,
  memory,
  // Chat persistence enums with unique names
  messageStatusEnum as chatPersistenceMessageStatusEnum,
  messageTypeEnum as chatPersistenceMessageTypeEnum,
  organization,
  parlantAgent,
  parlantAgentApiKey,
  parlantAgentKnowledgeBase,
  parlantAgentTool,
  parlantAgentWorkflow,
  parlantCannedResponse,
  parlantConversionCache,
  parlantConversionHistory,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyGenerationHistory,
  parlantJourneyGuideline,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantSession,
  parlantSessionWorkflow,
  parlantTemplateParameter,
  parlantTerm,
  parlantTool,
  parlantToolIntegration,
  parlantVariable,
  parlantWorkflowTemplate,
  permissions,
  permissionTypeEnum,
  session,
  sessionModeEnum as parlantSessionModeEnum,
  sessionStatusEnum as parlantSessionStatusEnum,
  settings,
  subscription,
  templateStars,
  templates,
  toolCategories,
  toolConfigurations,
  toolRecommendations,
  toolRegistry,
  toolScopeEnum,
  toolStatusEnum,
  toolTypeEnum,
  toolUsageAnalytics,
  tsvector,
  // Core tables - using actual table names from schema.ts
  user,
  userRateLimits,
  userStats,
  verification,
  // Type exports
  type WorkspaceInvitationStatus,
  waitlist,
  webhook,
  // Core enums (main schema)
  webhookDeliveryStatusEnum,
  workflow,
  workflowBlocks,
  workflowCheckpoints,
  workflowDeploymentVersion,
  workflowEdges,
  workflowExecutionLogs,
  workflowExecutionSnapshots,
  workflowFolder,
  workflowLogWebhook,
  workflowLogWebhookDelivery,
  workflowSchedule,
  workflowSubflows,
  workspace,
  workspaceEnvironment,
  workspaceInvitation,
  workspaceInvitationStatusEnum,
} from "./schema";

// In production, use the Vercel-generated POSTGRES_URL
// In development, use the direct DATABASE_URL
const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";
if (!connectionString) {
  throw new Error("Missing POSTGRES_URL or DATABASE_URL environment variable");
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
});

const drizzleClient = drizzle(postgresClient, { schema });

declare global {
  // eslint-disable-next-line no-var
  var database: PostgresJsDatabase<typeof schema> | undefined;
}

export const db = globalThis.database || drizzleClient;
if (process.env.NODE_ENV !== "production") globalThis.database = db;
