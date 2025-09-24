import { type SQL, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user, workspace } from './schema'

/**
 * Parlant Database Schema Extension
 *
 * This schema extends Sim's existing database with Parlant-specific tables
 * for AI agent management, conversations, and behavior modeling.
 *
 * Key design principles:
 * - All Parlant entities are scoped to workspaces for multi-tenancy
 * - Sessions support both authenticated and anonymous users
 * - Foreign key relationships maintain data integrity
 * - Indexes optimized for common query patterns
 */

// Enums for Parlant-specific types
export const agentStatusEnum = pgEnum('agent_status', ['active', 'inactive', 'archived'])
export const sessionModeEnum = pgEnum('session_mode', ['auto', 'manual', 'paused'])
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed', 'abandoned'])
export const eventTypeEnum = pgEnum('event_type', [
  'customer_message',
  'agent_message',
  'tool_call',
  'tool_result',
  'status_update',
  'journey_transition',
  'variable_update'
])
export const journeyStateTypeEnum = pgEnum('journey_state_type', ['chat', 'tool', 'decision', 'final'])
export const compositionModeEnum = pgEnum('composition_mode', ['fluid', 'strict'])

/**
 * Parlant Agents - AI agents with behavior configurations
 * Each agent belongs to a workspace and can have multiple sessions
 */
export const parlantAgent = pgTable(
  'parlant_agent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Agent configuration
    name: text('name').notNull(),
    description: text('description'),
    status: agentStatusEnum('status').notNull().default('active'),

    // Behavior configuration
    compositionMode: compositionModeEnum('composition_mode').notNull().default('fluid'),
    systemPrompt: text('system_prompt'),

    // AI Model configuration
    modelProvider: text('model_provider').notNull().default('openai'),
    modelName: text('model_name').notNull().default('gpt-4'),
    temperature: integer('temperature').default(70), // 0-100 scale for easier UI handling
    maxTokens: integer('max_tokens').default(2000),

    // Usage tracking
    totalSessions: integer('total_sessions').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    lastActiveAt: timestamp('last_active_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete support
  },
  (table) => ({
    workspaceIdIdx: index('parlant_agent_workspace_id_idx').on(table.workspaceId),
    createdByIdx: index('parlant_agent_created_by_idx').on(table.createdBy),
    statusIdx: index('parlant_agent_status_idx').on(table.status),
    workspaceStatusIdx: index('parlant_agent_workspace_status_idx').on(table.workspaceId, table.status),
    deletedAtIdx: index('parlant_agent_deleted_at_idx').on(table.deletedAt),
    lastActiveIdx: index('parlant_agent_last_active_idx').on(table.lastActiveAt),
  })
)

/**
 * Parlant Sessions - Individual conversations between users and agents
 * Supports both authenticated Sim users and anonymous external users
 */
export const parlantSession = pgTable(
  'parlant_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // User identification (nullable for anonymous sessions)
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    customerId: text('customer_id'), // External customer identifier

    // Session configuration
    mode: sessionModeEnum('mode').notNull().default('auto'),
    status: sessionStatusEnum('status').notNull().default('active'),

    // Session metadata
    title: text('title'),
    metadata: jsonb('metadata').default('{}'), // Flexible metadata storage

    // Context and state
    currentJourneyId: uuid('current_journey_id'), // Reference to active journey
    currentStateId: uuid('current_state_id'), // Current state in journey
    variables: jsonb('variables').default('{}'), // Session-specific variables

    // Tracking
    eventCount: integer('event_count').notNull().default(0),
    messageCount: integer('message_count').notNull().default(0),

    // Timing
    startedAt: timestamp('started_at').notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_session_agent_id_idx').on(table.agentId),
    workspaceIdIdx: index('parlant_session_workspace_id_idx').on(table.workspaceId),
    userIdIdx: index('parlant_session_user_id_idx').on(table.userId),
    customerIdIdx: index('parlant_session_customer_id_idx').on(table.customerId),
    statusIdx: index('parlant_session_status_idx').on(table.status),
    agentStatusIdx: index('parlant_session_agent_status_idx').on(table.agentId, table.status),
    lastActivityIdx: index('parlant_session_last_activity_idx').on(table.lastActivityAt),
    currentJourneyIdx: index('parlant_session_current_journey_idx').on(table.currentJourneyId),
  })
)

/**
 * Parlant Events - All events that occur within sessions (messages, tool calls, etc.)
 * This is the main event log for all session activities
 */
export const parlantEvent = pgTable(
  'parlant_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => parlantSession.id, { onDelete: 'cascade' }),

    // Event ordering and identification
    offset: integer('offset').notNull(), // Sequential offset within session
    eventType: eventTypeEnum('event_type').notNull(),

    // Event content
    content: jsonb('content').notNull(), // Message content, tool data, etc.
    metadata: jsonb('metadata').default('{}'),

    // References for specific event types
    toolCallId: text('tool_call_id'), // For tool calls and results
    journeyId: uuid('journey_id'), // For journey-related events
    stateId: uuid('state_id'), // For journey state transitions

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('parlant_event_session_id_idx').on(table.sessionId),
    sessionOffsetIdx: uniqueIndex('parlant_event_session_offset_idx').on(table.sessionId, table.offset),
    eventTypeIdx: index('parlant_event_type_idx').on(table.eventType),
    sessionTypeIdx: index('parlant_event_session_type_idx').on(table.sessionId, table.eventType),
    toolCallIdIdx: index('parlant_event_tool_call_idx').on(table.toolCallId),
    journeyIdIdx: index('parlant_event_journey_idx').on(table.journeyId),
    createdAtIdx: index('parlant_event_created_at_idx').on(table.createdAt),
  })
)

/**
 * Parlant Guidelines - Behavior rules that guide agent responses
 * These define when and how agents should behave in specific situations
 */
export const parlantGuideline = pgTable(
  'parlant_guideline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),

    // Guideline content
    condition: text('condition').notNull(), // When this guideline applies
    action: text('action').notNull(), // What the agent should do

    // Configuration
    priority: integer('priority').notNull().default(100), // Higher = more important
    enabled: boolean('enabled').notNull().default(true),

    // Associated tools (stored as array of tool IDs)
    toolIds: jsonb('tool_ids').default('[]'),

    // Usage tracking
    matchCount: integer('match_count').notNull().default(0),
    lastMatchedAt: timestamp('last_matched_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_guideline_agent_id_idx').on(table.agentId),
    enabledIdx: index('parlant_guideline_enabled_idx').on(table.enabled),
    agentEnabledIdx: index('parlant_guideline_agent_enabled_idx').on(table.agentId, table.enabled),
    priorityIdx: index('parlant_guideline_priority_idx').on(table.priority),
    lastMatchedIdx: index('parlant_guideline_last_matched_idx').on(table.lastMatchedAt),
  })
)

/**
 * Parlant Journeys - Multi-step conversational flows
 * These define structured processes that agents can guide users through
 */
export const parlantJourney = pgTable(
  'parlant_journey',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),

    // Journey configuration
    title: text('title').notNull(),
    description: text('description'),

    // Trigger conditions (when to start this journey)
    conditions: jsonb('conditions').notNull(), // Array of condition strings

    // Configuration
    enabled: boolean('enabled').notNull().default(true),
    allowSkipping: boolean('allow_skipping').notNull().default(true),
    allowRevisiting: boolean('allow_revisiting').notNull().default(true),

    // Usage tracking
    totalSessions: integer('total_sessions').notNull().default(0),
    completionRate: integer('completion_rate').default(0), // Percentage
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_journey_agent_id_idx').on(table.agentId),
    enabledIdx: index('parlant_journey_enabled_idx').on(table.enabled),
    agentEnabledIdx: index('parlant_journey_agent_enabled_idx').on(table.agentId, table.enabled),
    lastUsedIdx: index('parlant_journey_last_used_idx').on(table.lastUsedAt),
  })
)

/**
 * Parlant Journey States - Individual states within journeys
 * These define the steps in a conversational flow
 */
export const parlantJourneyState = pgTable(
  'parlant_journey_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => parlantJourney.id, { onDelete: 'cascade' }),

    // State configuration
    name: text('name').notNull(),
    stateType: journeyStateTypeEnum('state_type').notNull(),

    // State content based on type
    chatPrompt: text('chat_prompt'), // For chat states
    toolId: text('tool_id'), // For tool states
    toolConfig: jsonb('tool_config'), // Tool-specific configuration
    condition: text('condition'), // For decision states

    // State behavior
    isInitial: boolean('is_initial').notNull().default(false),
    isFinal: boolean('is_final').notNull().default(false),
    allowSkip: boolean('allow_skip').notNull().default(true),

    // Metadata
    metadata: jsonb('metadata').default('{}'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    journeyIdIdx: index('parlant_journey_state_journey_id_idx').on(table.journeyId),
    stateTypeIdx: index('parlant_journey_state_type_idx').on(table.stateType),
    journeyTypeIdx: index('parlant_journey_state_journey_type_idx').on(table.journeyId, table.stateType),
    isInitialIdx: index('parlant_journey_state_initial_idx').on(table.isInitial),
    isFinalIdx: index('parlant_journey_state_final_idx').on(table.isFinal),
  })
)

/**
 * Parlant Journey Transitions - Connections between journey states
 * These define how users move through conversational flows
 */
export const parlantJourneyTransition = pgTable(
  'parlant_journey_transition',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => parlantJourney.id, { onDelete: 'cascade' }),
    fromStateId: uuid('from_state_id')
      .notNull()
      .references(() => parlantJourneyState.id, { onDelete: 'cascade' }),
    toStateId: uuid('to_state_id')
      .notNull()
      .references(() => parlantJourneyState.id, { onDelete: 'cascade' }),

    // Transition conditions
    condition: text('condition'), // When this transition should occur
    priority: integer('priority').notNull().default(100),

    // Tracking
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    journeyIdIdx: index('parlant_journey_transition_journey_id_idx').on(table.journeyId),
    fromStateIdx: index('parlant_journey_transition_from_state_idx').on(table.fromStateId),
    toStateIdx: index('parlant_journey_transition_to_state_idx').on(table.toStateId),
    journeyFromIdx: index('parlant_journey_transition_journey_from_idx').on(table.journeyId, table.fromStateId),
    priorityIdx: index('parlant_journey_transition_priority_idx').on(table.priority),
  })
)

/**
 * Parlant Variables - Customer/session-specific data storage
 * These store contextual information about users and sessions
 */
export const parlantVariable = pgTable(
  'parlant_variable',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .references(() => parlantSession.id, { onDelete: 'cascade' }),

    // Variable identification
    key: text('key').notNull(),
    scope: text('scope').notNull().default('session'), // 'session', 'customer', 'global'

    // Variable content
    value: jsonb('value').notNull(),
    valueType: text('value_type').notNull(), // 'string', 'number', 'boolean', 'object', 'array'

    // Configuration
    isPrivate: boolean('is_private').notNull().default(false),
    description: text('description'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_variable_agent_id_idx').on(table.agentId),
    sessionIdIdx: index('parlant_variable_session_id_idx').on(table.sessionId),
    keyIdx: index('parlant_variable_key_idx').on(table.key),
    agentKeyIdx: index('parlant_variable_agent_key_idx').on(table.agentId, table.key),
    sessionKeyIdx: uniqueIndex('parlant_variable_session_key_idx').on(table.sessionId, table.key),
    scopeIdx: index('parlant_variable_scope_idx').on(table.scope),
  })
)

/**
 * Parlant Tools - Function integrations available to agents
 * These connect Sim's existing tools with Parlant's tool interface
 */
export const parlantTool = pgTable(
  'parlant_tool',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Tool identification
    name: text('name').notNull(),
    displayName: text('display_name').notNull(),
    description: text('description').notNull(),

    // Tool configuration
    simToolId: text('sim_tool_id'), // Reference to original Sim tool
    toolType: text('tool_type').notNull(), // 'sim_native', 'custom', 'external'

    // Function signature
    parameters: jsonb('parameters').notNull(), // JSON schema for parameters
    returnSchema: jsonb('return_schema'), // Expected return format

    // Behavior configuration
    usageGuidelines: text('usage_guidelines'), // When and how to use this tool
    errorHandling: jsonb('error_handling').default('{}'),

    // Status and access
    enabled: boolean('enabled').notNull().default(true),
    isPublic: boolean('is_public').notNull().default(false),

    // Usage tracking
    useCount: integer('use_count').notNull().default(0),
    successRate: integer('success_rate').default(100),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('parlant_tool_workspace_id_idx').on(table.workspaceId),
    nameIdx: index('parlant_tool_name_idx').on(table.name),
    workspaceNameIdx: uniqueIndex('parlant_tool_workspace_name_idx').on(table.workspaceId, table.name),
    simToolIdIdx: index('parlant_tool_sim_tool_idx').on(table.simToolId),
    toolTypeIdx: index('parlant_tool_type_idx').on(table.toolType),
    enabledIdx: index('parlant_tool_enabled_idx').on(table.enabled),
    isPublicIdx: index('parlant_tool_public_idx').on(table.isPublic),
    lastUsedIdx: index('parlant_tool_last_used_idx').on(table.lastUsedAt),
  })
)

/**
 * Parlant Glossary Terms - Domain-specific terminology definitions
 * These help agents understand business-specific language and concepts
 */
export const parlantTerm = pgTable(
  'parlant_term',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),

    // Term definition
    name: text('name').notNull(),
    description: text('description').notNull(),
    synonyms: jsonb('synonyms').default('[]'), // Array of alternative terms

    // Usage context
    category: text('category'), // Optional categorization
    examples: jsonb('examples').default('[]'), // Usage examples

    // Metadata
    importance: integer('importance').notNull().default(100), // Higher = more important

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_term_agent_id_idx').on(table.agentId),
    nameIdx: index('parlant_term_name_idx').on(table.name),
    agentNameIdx: uniqueIndex('parlant_term_agent_name_idx').on(table.agentId, table.name),
    categoryIdx: index('parlant_term_category_idx').on(table.category),
    importanceIdx: index('parlant_term_importance_idx').on(table.importance),
  })
)

/**
 * Parlant Canned Responses - Pre-approved response templates
 * These provide controlled, brand-consistent responses for compliance
 */
export const parlantCannedResponse = pgTable(
  'parlant_canned_response',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),

    // Response content
    template: text('template').notNull(), // Response template with variables
    category: text('category'), // Grouping/classification
    tags: jsonb('tags').default('[]'), // Array of tags for matching

    // Matching conditions
    conditions: jsonb('conditions').default('[]'), // When to use this response
    priority: integer('priority').notNull().default(100),

    // Configuration
    enabled: boolean('enabled').notNull().default(true),
    requiresExactMatch: boolean('requires_exact_match').notNull().default(false),

    // Usage tracking
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_canned_response_agent_id_idx').on(table.agentId),
    categoryIdx: index('parlant_canned_response_category_idx').on(table.category),
    agentCategoryIdx: index('parlant_canned_response_agent_category_idx').on(table.agentId, table.category),
    enabledIdx: index('parlant_canned_response_enabled_idx').on(table.enabled),
    priorityIdx: index('parlant_canned_response_priority_idx').on(table.priority),
    lastUsedIdx: index('parlant_canned_response_last_used_idx').on(table.lastUsedAt),
  })
)

// Export all Parlant tables for use in the main schema
export const parlantTables = {
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
}

// Export enums for type checking
export const parlantEnums = {
  agentStatusEnum,
  sessionModeEnum,
  sessionStatusEnum,
  eventTypeEnum,
  journeyStateTypeEnum,
  compositionModeEnum,
}