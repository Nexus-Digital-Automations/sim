import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  agentStatusEnum,
  compositionModeEnum,
  eventTypeEnum,
  journeyStateTypeEnum,
  parlantAgent,
  parlantAgentKnowledgeBase,
  parlantAgentTool,
  parlantCannedResponse,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyGuideline,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantSession,
  parlantTerm,
  parlantTool,
  parlantToolIntegration,
  parlantVariable,
  sessionModeEnum,
  sessionStatusEnum,
} from "./parlant-schema";

/**
 * Parlant Database Types
 *
 * This file provides comprehensive TypeScript type definitions for all Parlant database entities.
 * It follows the established Sim patterns for database type definitions and provides both
 * select and insert types for all tables.
 */

// =============================================================================
// Enum Types
// =============================================================================

export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];
export type SessionMode = (typeof sessionModeEnum.enumValues)[number];
export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type JourneyStateType = (typeof journeyStateTypeEnum.enumValues)[number];
export type CompositionMode = (typeof compositionModeEnum.enumValues)[number];

// =============================================================================
// Core Entity Types (Select Models)
// =============================================================================

/**
 * Parlant Agent - Complete agent record as stored in database
 */
export type ParlantAgent = InferSelectModel<typeof parlantAgent>;

/**
 * Parlant Session - Complete session record as stored in database
 */
export type ParlantSession = InferSelectModel<typeof parlantSession>;

/**
 * Parlant Event - Complete event record as stored in database
 */
export type ParlantEvent = InferSelectModel<typeof parlantEvent>;

/**
 * Parlant Guideline - Complete guideline record as stored in database
 */
export type ParlantGuideline = InferSelectModel<typeof parlantGuideline>;

/**
 * Parlant Journey - Complete journey record as stored in database
 */
export type ParlantJourney = InferSelectModel<typeof parlantJourney>;

/**
 * Parlant Journey State - Complete journey state record as stored in database
 */
export type ParlantJourneyState = InferSelectModel<typeof parlantJourneyState>;

/**
 * Parlant Journey Transition - Complete journey transition record as stored in database
 */
export type ParlantJourneyTransition = InferSelectModel<
  typeof parlantJourneyTransition
>;

/**
 * Parlant Variable - Complete variable record as stored in database
 */
export type ParlantVariable = InferSelectModel<typeof parlantVariable>;

/**
 * Parlant Tool - Complete tool record as stored in database
 */
export type ParlantTool = InferSelectModel<typeof parlantTool>;

/**
 * Parlant Term - Complete term record as stored in database
 */
export type ParlantTerm = InferSelectModel<typeof parlantTerm>;

/**
 * Parlant Canned Response - Complete canned response record as stored in database
 */
export type ParlantCannedResponse = InferSelectModel<
  typeof parlantCannedResponse
>;

// =============================================================================
// Junction Table Types (Select Models)
// =============================================================================

/**
 * Parlant Agent Tool - Junction table for agent-tool relationships
 */
export type ParlantAgentTool = InferSelectModel<typeof parlantAgentTool>;

/**
 * Parlant Journey Guideline - Junction table for journey-guideline relationships
 */
export type ParlantJourneyGuideline = InferSelectModel<
  typeof parlantJourneyGuideline
>;

/**
 * Parlant Agent Knowledge Base - Junction table for agent-knowledge base relationships
 */
export type ParlantAgentKnowledgeBase = InferSelectModel<
  typeof parlantAgentKnowledgeBase
>;

/**
 * Parlant Tool Integration - Junction table for tool integrations
 */
export type ParlantToolIntegration = InferSelectModel<
  typeof parlantToolIntegration
>;

// =============================================================================
// Insert Types (for database inserts)
// =============================================================================

/**
 * Parlant Agent Insert - Type for creating new agents
 * Omits auto-generated fields like timestamps and usage tracking
 */
export type ParlantAgentInsert = InferInsertModel<typeof parlantAgent>;

/**
 * Parlant Session Insert - Type for creating new sessions
 */
export type ParlantSessionInsert = InferInsertModel<typeof parlantSession>;

/**
 * Parlant Event Insert - Type for creating new events
 */
export type ParlantEventInsert = InferInsertModel<typeof parlantEvent>;

/**
 * Parlant Guideline Insert - Type for creating new guidelines
 */
export type ParlantGuidelineInsert = InferInsertModel<typeof parlantGuideline>;

/**
 * Parlant Journey Insert - Type for creating new journeys
 */
export type ParlantJourneyInsert = InferInsertModel<typeof parlantJourney>;

/**
 * Parlant Journey State Insert - Type for creating new journey states
 */
export type ParlantJourneyStateInsert = InferInsertModel<
  typeof parlantJourneyState
>;

/**
 * Parlant Journey Transition Insert - Type for creating new journey transitions
 */
export type ParlantJourneyTransitionInsert = InferInsertModel<
  typeof parlantJourneyTransition
>;

/**
 * Parlant Variable Insert - Type for creating new variables
 */
export type ParlantVariableInsert = InferInsertModel<typeof parlantVariable>;

/**
 * Parlant Tool Insert - Type for creating new tools
 */
export type ParlantToolInsert = InferInsertModel<typeof parlantTool>;

/**
 * Parlant Term Insert - Type for creating new terms
 */
export type ParlantTermInsert = InferInsertModel<typeof parlantTerm>;

/**
 * Parlant Canned Response Insert - Type for creating new canned responses
 */
export type ParlantCannedResponseInsert = InferInsertModel<
  typeof parlantCannedResponse
>;

/**
 * Parlant Agent Tool Insert - Type for creating new agent-tool relationships
 */
export type ParlantAgentToolInsert = InferInsertModel<typeof parlantAgentTool>;

/**
 * Parlant Journey Guideline Insert - Type for creating new journey-guideline relationships
 */
export type ParlantJourneyGuidelineInsert = InferInsertModel<
  typeof parlantJourneyGuideline
>;

/**
 * Parlant Agent Knowledge Base Insert - Type for creating new agent-knowledge base relationships
 */
export type ParlantAgentKnowledgeBaseInsert = InferInsertModel<
  typeof parlantAgentKnowledgeBase
>;

/**
 * Parlant Tool Integration Insert - Type for creating new tool integrations
 */
export type ParlantToolIntegrationInsert = InferInsertModel<
  typeof parlantToolIntegration
>;

// =============================================================================
// Update Types (for database updates)
// =============================================================================

/**
 * Update types for partial database updates - these make all fields optional
 * except for the ID which is typically required for updates
 */

export type ParlantAgentUpdate = Partial<Omit<ParlantAgentInsert, "id">> & {
  id: string;
};
export type ParlantSessionUpdate = Partial<Omit<ParlantSessionInsert, "id">> & {
  id: string;
};
export type ParlantEventUpdate = Partial<Omit<ParlantEventInsert, "id">> & {
  id: string;
};
export type ParlantGuidelineUpdate = Partial<
  Omit<ParlantGuidelineInsert, "id">
> & { id: string };
export type ParlantJourneyUpdate = Partial<Omit<ParlantJourneyInsert, "id">> & {
  id: string;
};
export type ParlantJourneyStateUpdate = Partial<
  Omit<ParlantJourneyStateInsert, "id">
> & {
  id: string;
};
export type ParlantJourneyTransitionUpdate = Partial<
  Omit<ParlantJourneyTransitionInsert, "id">
> & {
  id: string;
};
export type ParlantVariableUpdate = Partial<
  Omit<ParlantVariableInsert, "id">
> & { id: string };
export type ParlantToolUpdate = Partial<Omit<ParlantToolInsert, "id">> & {
  id: string;
};
export type ParlantTermUpdate = Partial<Omit<ParlantTermInsert, "id">> & {
  id: string;
};
export type ParlantCannedResponseUpdate = Partial<
  Omit<ParlantCannedResponseInsert, "id">
> & {
  id: string;
};
export type ParlantAgentToolUpdate = Partial<
  Omit<ParlantAgentToolInsert, "id">
> & { id: string };
export type ParlantJourneyGuidelineUpdate = Partial<
  Omit<ParlantJourneyGuidelineInsert, "id">
> & {
  id: string;
};
export type ParlantAgentKnowledgeBaseUpdate = Partial<
  Omit<ParlantAgentKnowledgeBaseInsert, "id">
> & { id: string };
export type ParlantToolIntegrationUpdate = Partial<
  Omit<ParlantToolIntegrationInsert, "id">
> & {
  id: string;
};

// =============================================================================
// Specialized Types for Common Operations
// =============================================================================

/**
 * Agent Creation - Required fields for creating a new agent
 */
export type CreateAgentParams = {
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  compositionMode?: CompositionMode;
  systemPrompt?: string;
  modelProvider?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  responseTimeoutMs?: number;
  maxContextLength?: number;
  systemInstructions?: string;
  allowInterruption?: boolean;
  allowProactiveMessages?: boolean;
  conversationStyle?: string;
  dataRetentionDays?: number;
  allowDataExport?: boolean;
  piiHandlingMode?: string;
  integrationMetadata?: Record<string, unknown>;
  customConfig?: Record<string, unknown>;
};

/**
 * Session Creation - Required fields for creating a new session
 */
export type CreateSessionParams = {
  agentId: string;
  workspaceId: string;
  userId?: string;
  customerId?: string;
  mode?: SessionMode;
  title?: string;
  metadata?: Record<string, unknown>;
  variables?: Record<string, unknown>;
};

/**
 * Event Creation - Required fields for creating a new event
 */
export type CreateEventParams = {
  sessionId: string;
  offset: number;
  eventType: EventType;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  toolCallId?: string;
  journeyId?: string;
  stateId?: string;
};

/**
 * Guideline Creation - Required fields for creating a new guideline
 */
export type CreateGuidelineParams = {
  agentId: string;
  condition: string;
  action: string;
  priority?: number;
  enabled?: boolean;
  toolIds?: string[];
};

/**
 * Journey Creation - Required fields for creating a new journey
 */
export type CreateJourneyParams = {
  agentId: string;
  title: string;
  description?: string;
  conditions: string[];
  enabled?: boolean;
  allowSkipping?: boolean;
  allowRevisiting?: boolean;
};

/**
 * Tool Creation - Required fields for creating a new tool
 */
export type CreateToolParams = {
  workspaceId: string;
  name: string;
  displayName: string;
  description: string;
  simToolId?: string;
  toolType: "sim_native" | "custom" | "external";
  parameters: Record<string, unknown>;
  returnSchema?: Record<string, unknown>;
  usageGuidelines?: string;
  errorHandling?: Record<string, unknown>;
  enabled?: boolean;
  isPublic?: boolean;
};

// =============================================================================
// Composite Types for Complex Operations
// =============================================================================

/**
 * Agent with related data - includes commonly queried relationships
 */
export type AgentWithRelations = ParlantAgent & {
  tools?: (ParlantAgentTool & { tool: ParlantTool })[];
  guidelines?: ParlantGuideline[];
  journeys?: ParlantJourney[];
  knowledgeBases?: (ParlantAgentKnowledgeBase & {
    knowledgeBase: { id: string; name: string };
  })[];
  sessions?: ParlantSession[];
};

/**
 * Session with related data - includes events and current journey info
 */
export type SessionWithRelations = ParlantSession & {
  agent?: ParlantAgent;
  events?: ParlantEvent[];
  currentJourney?: ParlantJourney;
  currentState?: ParlantJourneyState;
  variables?: ParlantVariable[];
};

/**
 * Journey with complete flow definition
 */
export type JourneyWithFlow = ParlantJourney & {
  agent?: ParlantAgent;
  states: ParlantJourneyState[];
  transitions: ParlantJourneyTransition[];
  guidelines?: (ParlantJourneyGuideline & { guideline: ParlantGuideline })[];
};

/**
 * Tool with integration details
 */
export type ToolWithIntegration = ParlantTool & {
  integrations: ParlantToolIntegration[];
  agentTools?: (ParlantAgentTool & { agent: { id: string; name: string } })[];
};

// =============================================================================
// Filter and Query Types
// =============================================================================

/**
 * Agent filtering options
 */
export type AgentFilters = {
  workspaceId?: string;
  status?: AgentStatus | AgentStatus[];
  compositionMode?: CompositionMode | CompositionMode[];
  modelProvider?: string | string[];
  conversationStyle?: string | string[];
  createdBy?: string;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
  hasActiveSessions?: boolean;
  search?: string; // Search in name, description
};

/**
 * Session filtering options
 */
export type SessionFilters = {
  agentId?: string | string[];
  workspaceId?: string;
  userId?: string;
  customerId?: string;
  status?: SessionStatus | SessionStatus[];
  mode?: SessionMode | SessionMode[];
  hasEvents?: boolean;
  startedAfter?: Date;
  startedBefore?: Date;
  endedAfter?: Date;
  endedBefore?: Date;
  currentJourneyId?: string;
  search?: string; // Search in title, metadata
};

/**
 * Event filtering options
 */
export type EventFilters = {
  sessionId?: string | string[];
  eventType?: EventType | EventType[];
  journeyId?: string;
  stateId?: string;
  toolCallId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  hasToolCall?: boolean;
  search?: string; // Search in content, metadata
};

/**
 * Journey filtering options
 */
export type JourneyFilters = {
  agentId?: string | string[];
  enabled?: boolean;
  allowSkipping?: boolean;
  allowRevisiting?: boolean;
  lastUsedAfter?: Date;
  lastUsedBefore?: Date;
  completionRateMin?: number;
  completionRateMax?: number;
  search?: string; // Search in title, description
};

// =============================================================================
// Statistics and Analytics Types
// =============================================================================

/**
 * Agent usage statistics
 */
export type AgentStats = {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalCost: number;
  averageSessionDuration: number;
  popularJourneys: Array<{
    journeyId: string;
    title: string;
    usageCount: number;
    completionRate: number;
  }>;
  topTools: Array<{
    toolId: string;
    name: string;
    usageCount: number;
    successRate: number;
  }>;
  messageVolumeByHour: Array<{
    hour: number;
    messageCount: number;
  }>;
};

/**
 * Session analytics
 */
export type SessionAnalytics = {
  duration: number;
  messageCount: number;
  eventCount: number;
  journeysCompleted: number;
  journeysAbandoned: number;
  toolCallsSuccessful: number;
  toolCallsFailed: number;
  customerSatisfactionScore?: number;
  conversationTopics: string[];
};

/**
 * Journey analytics
 */
export type JourneyAnalytics = {
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
  completionRate: number;
  averageDuration: number;
  dropoffPoints: Array<{
    stateId: string;
    stateName: string;
    dropoffRate: number;
  }>;
  commonPaths: Array<{
    path: string[];
    frequency: number;
  }>;
};

// =============================================================================
// Error and Validation Types
// =============================================================================

/**
 * Parlant-specific error types
 */
export type ParlantError = {
  code:
    | "AGENT_NOT_FOUND"
    | "SESSION_NOT_FOUND"
    | "INVALID_EVENT"
    | "JOURNEY_INVALID"
    | "TOOL_NOT_FOUND"
    | "GUIDELINE_CONFLICT"
    | "WORKSPACE_ACCESS_DENIED"
    | "VALIDATION_ERROR";
  message: string;
  details?: Record<string, unknown>;
  field?: string;
};

/**
 * Validation error details
 */
export type ValidationError = {
  field: string;
  message: string;
  code: string;
  value?: unknown;
};

/**
 * Batch operation results
 */
export type BatchOperationResult<T> = {
  successful: T[];
  failed: Array<{
    item: Partial<T>;
    error: ParlantError;
  }>;
  totalAttempted: number;
  totalSuccessful: number;
  totalFailed: number;
};

// =============================================================================
// Pagination and Sorting Types
// =============================================================================

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response structure
 */
export type ParlantApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ParlantError;
  timestamp: string;
};

/**
 * Bulk API response structure
 */
export type ParlantBulkApiResponse<T = unknown> = {
  success: boolean;
  data?: T[];
  errors?: ParlantError[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  timestamp: string;
};

// =============================================================================
// Export all types for use throughout the application
// =============================================================================

export type {
  // Re-export the schema types for direct access
  InferSelectModel,
  InferInsertModel,
};
