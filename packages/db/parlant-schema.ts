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
import { user, workspace, knowledgeBase, customTools, workflowBlocks, mcpServers, workflow, apiKey } from './schema'

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

    // Advanced configuration
    responseTimeoutMs: integer('response_timeout_ms').default(30000), // Max response time
    maxContextLength: integer('max_context_length').default(8000), // Context window size
    systemInstructions: text('system_instructions'), // Additional system-level instructions

    // Behavior controls
    allowInterruption: boolean('allow_interruption').notNull().default(true), // Can be interrupted mid-response
    allowProactiveMessages: boolean('allow_proactive_messages').notNull().default(false), // Can send unsolicited messages
    conversationStyle: text('conversation_style').default('professional'), // 'casual', 'professional', 'technical', 'friendly'

    // Privacy and security
    dataRetentionDays: integer('data_retention_days').default(30), // How long to keep session data
    allowDataExport: boolean('allow_data_export').notNull().default(true),
    piiHandlingMode: text('pii_handling_mode').default('standard'), // 'strict', 'standard', 'relaxed'

    // Integration metadata
    integrationMetadata: jsonb('integration_metadata').default('{}'), // External system metadata
    customConfig: jsonb('custom_config').default('{}'), // Flexible custom configuration

    // Usage tracking
    totalSessions: integer('total_sessions').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),
    totalTokensUsed: integer('total_tokens_used').notNull().default(0),
    totalCost: integer('total_cost').notNull().default(0), // Cost in cents
    averageSessionDuration: integer('average_session_duration'), // In seconds
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
    compositionModeIdx: index('parlant_agent_composition_mode_idx').on(table.compositionMode),
    modelProviderIdx: index('parlant_agent_model_provider_idx').on(table.modelProvider),
    conversationStyleIdx: index('parlant_agent_conversation_style_idx').on(table.conversationStyle),
    workspaceActiveIdx: index('parlant_agent_workspace_active_idx').on(table.workspaceId, table.lastActiveAt),
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

    // Session analytics and tracking
    eventCount: integer('event_count').notNull().default(0),
    messageCount: integer('message_count').notNull().default(0),
    tokensUsed: integer('tokens_used').notNull().default(0),
    cost: integer('cost').notNull().default(0), // Cost in cents

    // Performance metrics
    averageResponseTime: integer('average_response_time'), // In milliseconds
    satisfactionScore: integer('satisfaction_score'), // 1-5 rating if collected

    // Session categorization
    sessionType: text('session_type').default('conversation'), // 'conversation', 'support', 'onboarding', 'survey'
    tags: jsonb('tags').default('[]'), // Array of tags for categorization

    // User context
    userAgent: text('user_agent'), // Browser/app info
    ipAddress: text('ip_address'), // For analytics (anonymized)
    referrer: text('referrer'), // How they arrived
    locale: text('locale').default('en'), // User language preference
    timezone: text('timezone').default('UTC'), // User timezone

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
    sessionTypeIdx: index('parlant_session_type_idx').on(table.sessionType),
    localeIdx: index('parlant_session_locale_idx').on(table.locale),
    satisfactionIdx: index('parlant_session_satisfaction_idx').on(table.satisfactionScore),
    workspaceTypeIdx: index('parlant_session_workspace_type_idx').on(table.workspaceId, table.sessionType),
    agentActiveIdx: index('parlant_session_agent_active_idx').on(table.agentId, table.lastActivityAt),
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
    executionTimeout: integer('execution_timeout').default(30000), // Max execution time in ms
    retryPolicy: jsonb('retry_policy').default('{"max_attempts": 3, "backoff_ms": 1000}'),

    // Rate limiting and throttling
    rateLimitPerMinute: integer('rate_limit_per_minute').default(60), // Calls per minute limit
    rateLimitPerHour: integer('rate_limit_per_hour').default(1000), // Calls per hour limit

    // Authentication and security
    requiresAuth: boolean('requires_auth').notNull().default(false),
    authType: text('auth_type'), // 'api_key', 'oauth', 'basic', 'none'
    authConfig: jsonb('auth_config').default('{}'), // Auth-specific configuration

    // Status and access
    enabled: boolean('enabled').notNull().default(true),
    isPublic: boolean('is_public').notNull().default(false),
    isDeprecated: boolean('is_deprecated').notNull().default(false),

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

/**
 * Workspace Integration Tables
 * These tables connect Parlant entities with existing Sim workspace resources
 */

/**
 * Parlant Agent Workflows - Connect agents to Sim workflows for enhanced capabilities
 * Enables agents to trigger or monitor specific workflows
 */
export const parlantAgentWorkflow = pgTable(
  'parlant_agent_workflow',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflow.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Configuration for workflow integration
    integrationType: text('integration_type').notNull(), // 'trigger', 'monitor', 'both'
    enabled: boolean('enabled').notNull().default(true),

    // Trigger configuration
    triggerConditions: jsonb('trigger_conditions').default('[]'), // When to trigger workflow
    inputMapping: jsonb('input_mapping').default('{}'), // Map session data to workflow inputs

    // Monitoring configuration
    monitorEvents: jsonb('monitor_events').default('[]'), // Which workflow events to track
    outputMapping: jsonb('output_mapping').default('{}'), // Map workflow outputs to session

    // Usage tracking
    triggerCount: integer('trigger_count').notNull().default(0),
    lastTriggeredAt: timestamp('last_triggered_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_agent_workflow_agent_id_idx').on(table.agentId),
    workflowIdIdx: index('parlant_agent_workflow_workflow_id_idx').on(table.workflowId),
    workspaceIdIdx: index('parlant_agent_workflow_workspace_id_idx').on(table.workspaceId),
    agentWorkflowUnique: uniqueIndex('parlant_agent_workflow_unique').on(table.agentId, table.workflowId),
    integrationTypeIdx: index('parlant_agent_workflow_type_idx').on(table.integrationType),
    agentEnabledIdx: index('parlant_agent_workflow_agent_enabled_idx').on(table.agentId, table.enabled),
  })
)

/**
 * Parlant Agent API Keys - Connect agents to workspace API keys for external service access
 * Enables agents to use specific API keys for tool executions
 */
export const parlantAgentApiKey = pgTable(
  'parlant_agent_api_key',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    apiKeyId: text('api_key_id')
      .notNull()
      .references(() => apiKey.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Configuration
    purpose: text('purpose').notNull(), // 'tools', 'llm', 'external_service'
    enabled: boolean('enabled').notNull().default(true),
    priority: integer('priority').notNull().default(100), // Key selection priority

    // Usage tracking
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_agent_api_key_agent_id_idx').on(table.agentId),
    apiKeyIdIdx: index('parlant_agent_api_key_api_key_id_idx').on(table.apiKeyId),
    workspaceIdIdx: index('parlant_agent_api_key_workspace_id_idx').on(table.workspaceId),
    agentApiKeyUnique: uniqueIndex('parlant_agent_api_key_unique').on(table.agentId, table.apiKeyId),
    purposeIdx: index('parlant_agent_api_key_purpose_idx').on(table.purpose),
    agentEnabledIdx: index('parlant_agent_api_key_agent_enabled_idx').on(table.agentId, table.enabled),
  })
)

/**
 * Parlant Session Workflows - Track workflow executions initiated by sessions
 * Maintains the connection between agent conversations and triggered workflows
 */
export const parlantSessionWorkflow = pgTable(
  'parlant_session_workflow',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => parlantSession.id, { onDelete: 'cascade' }),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflow.id, { onDelete: 'cascade' }),
    executionId: text('execution_id'), // Reference to workflow execution

    // Execution context
    triggerReason: text('trigger_reason').notNull(), // Why this workflow was triggered
    inputData: jsonb('input_data').default('{}'), // Data passed to workflow
    outputData: jsonb('output_data').default('{}'), // Data returned from workflow

    // Status tracking
    status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('parlant_session_workflow_session_id_idx').on(table.sessionId),
    workflowIdIdx: index('parlant_session_workflow_workflow_id_idx').on(table.workflowId),
    executionIdIdx: index('parlant_session_workflow_execution_id_idx').on(table.executionId),
    statusIdx: index('parlant_session_workflow_status_idx').on(table.status),
    sessionStatusIdx: index('parlant_session_workflow_session_status_idx').on(table.sessionId, table.status),
    startedAtIdx: index('parlant_session_workflow_started_at_idx').on(table.startedAt),
  })
)

/**
 * Junction Tables for Many-to-Many Relationships
 */

/**
 * Parlant Agent Tools - Many-to-many relationship between agents and tools
 * Allows agents to have access to multiple tools with specific configurations
 */
export const parlantAgentTool = pgTable(
  'parlant_agent_tool',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    toolId: uuid('tool_id')
      .notNull()
      .references(() => parlantTool.id, { onDelete: 'cascade' }),

    // Configuration for this specific agent-tool combination
    configuration: jsonb('configuration').default('{}'), // Tool-specific config
    enabled: boolean('enabled').notNull().default(true),
    priority: integer('priority').notNull().default(100), // Execution priority

    // Usage tracking for this specific combination
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_agent_tool_agent_id_idx').on(table.agentId),
    toolIdIdx: index('parlant_agent_tool_tool_id_idx').on(table.toolId),
    agentToolUnique: uniqueIndex('parlant_agent_tool_unique').on(table.agentId, table.toolId),
    agentEnabledIdx: index('parlant_agent_tool_agent_enabled_idx').on(table.agentId, table.enabled),
    priorityIdx: index('parlant_agent_tool_priority_idx').on(table.priority),
  })
)

/**
 * Parlant Journey Guidelines - Many-to-many relationship between journeys and guidelines
 * Allows journeys to inherit guidelines from the agent with journey-specific overrides
 */
export const parlantJourneyGuideline = pgTable(
  'parlant_journey_guideline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => parlantJourney.id, { onDelete: 'cascade' }),
    guidelineId: uuid('guideline_id')
      .notNull()
      .references(() => parlantGuideline.id, { onDelete: 'cascade' }),

    // Override configuration for this journey context
    priorityOverride: integer('priority_override'), // Override default guideline priority
    enabled: boolean('enabled').notNull().default(true),
    journeySpecificCondition: text('journey_specific_condition'), // Additional context-specific condition

    // Usage tracking in this journey context
    matchCount: integer('match_count').notNull().default(0),
    lastMatchedAt: timestamp('last_matched_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    journeyIdIdx: index('parlant_journey_guideline_journey_id_idx').on(table.journeyId),
    guidelineIdIdx: index('parlant_journey_guideline_guideline_id_idx').on(table.guidelineId),
    journeyGuidelineUnique: uniqueIndex('parlant_journey_guideline_unique').on(table.journeyId, table.guidelineId),
    journeyEnabledIdx: index('parlant_journey_guideline_journey_enabled_idx').on(table.journeyId, table.enabled),
    priorityOverrideIdx: index('parlant_journey_guideline_priority_override_idx').on(table.priorityOverride),
  })
)

/**
 * Parlant Agent Knowledge Base - Connection between agents and Sim's knowledge bases
 * Enables agents to access workspace knowledge bases for RAG operations
 */
export const parlantAgentKnowledgeBase = pgTable(
  'parlant_agent_knowledge_base',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),

    // Configuration for knowledge base usage
    enabled: boolean('enabled').notNull().default(true),
    searchThreshold: integer('search_threshold').default(80), // Similarity threshold 0-100
    maxResults: integer('max_results').default(5), // Max chunks to retrieve
    priority: integer('priority').notNull().default(100), // Search priority

    // Usage tracking
    searchCount: integer('search_count').notNull().default(0),
    lastSearchedAt: timestamp('last_searched_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    agentIdIdx: index('parlant_agent_kb_agent_id_idx').on(table.agentId),
    knowledgeBaseIdIdx: index('parlant_agent_kb_kb_id_idx').on(table.knowledgeBaseId),
    agentKbUnique: uniqueIndex('parlant_agent_kb_unique').on(table.agentId, table.knowledgeBaseId),
    agentEnabledIdx: index('parlant_agent_kb_agent_enabled_idx').on(table.agentId, table.enabled),
    priorityIdx: index('parlant_agent_kb_priority_idx').on(table.priority),
  })
)

/**
 * Parlant Tool Integrations - Connection between Parlant tools and Sim's existing tools
 * Maps Parlant tool definitions to actual Sim workflow tools and custom tools
 */
export const parlantToolIntegration = pgTable(
  'parlant_tool_integration',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parlantToolId: uuid('parlant_tool_id')
      .notNull()
      .references(() => parlantTool.id, { onDelete: 'cascade' }),

    // Integration type and target references
    integrationType: text('integration_type').notNull(), // 'custom_tool', 'workflow_block', 'mcp_server'
    targetId: text('target_id').notNull(), // ID of the target (customTools.id, workflowBlocks.id, etc.)

    // Integration configuration
    configuration: jsonb('configuration').default('{}'), // Integration-specific settings
    enabled: boolean('enabled').notNull().default(true),

    // Mapping configuration for parameter translation
    parameterMapping: jsonb('parameter_mapping').default('{}'), // Maps Parlant params to target params
    responseMapping: jsonb('response_mapping').default('{}'), // Maps target response to Parlant format

    // Health and monitoring
    lastHealthCheck: timestamp('last_health_check'),
    healthStatus: text('health_status').default('unknown'), // 'healthy', 'degraded', 'unhealthy', 'unknown'
    errorCount: integer('error_count').notNull().default(0),
    lastError: text('last_error'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    parlantToolIdIdx: index('parlant_tool_integration_parlant_tool_idx').on(table.parlantToolId),
    integrationTypeIdx: index('parlant_tool_integration_type_idx').on(table.integrationType),
    targetIdIdx: index('parlant_tool_integration_target_idx').on(table.targetId),
    typeTargetIdx: index('parlant_tool_integration_type_target_idx').on(table.integrationType, table.targetId),
    healthStatusIdx: index('parlant_tool_integration_health_idx').on(table.healthStatus),
    parlantToolUniqueTarget: uniqueIndex('parlant_tool_integration_unique').on(table.parlantToolId, table.integrationType, table.targetId),
  })
)

/**
 * Journey Conversion System Tables
 * ================================
 * Tables for workflow-to-journey conversion, template management, and caching
 */

// Workflow Templates for Journey Conversion
export const parlantWorkflowTemplate = pgTable(
  'parlant_workflow_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Template identification
    name: text('name').notNull(),
    description: text('description'),
    workflowId: text('workflow_id').notNull(),
    version: text('version').notNull().default('1.0.0'),

    // Template data
    workflowData: jsonb('workflow_data').notNull().default('{}'),
    tags: text('tags').array().default([]),

    // Usage tracking
    usageCount: integer('usage_count').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => user.id),
  },
  (table) => ({
    workspaceIdIdx: index('parlant_workflow_template_workspace_idx').on(table.workspaceId),
    workflowIdIdx: index('parlant_workflow_template_workflow_idx').on(table.workflowId),
    nameIdx: index('parlant_workflow_template_name_idx').on(table.name),
    tagsIdx: index('parlant_workflow_template_tags_idx').on(table.tags),
    usageCountIdx: index('parlant_workflow_template_usage_count_idx').on(table.usageCount),
    uniqueWorkspaceWorkflowName: uniqueIndex('parlant_workflow_template_unique')
      .on(table.workspaceId, table.workflowId, table.name),
  })
)

// Template Parameters
export const parlantTemplateParameter = pgTable(
  'parlant_template_parameter',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => parlantWorkflowTemplate.id, { onDelete: 'cascade' }),

    // Parameter definition
    name: text('name').notNull(),
    type: text('type').notNull(), // 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json'
    description: text('description').notNull(),
    defaultValue: jsonb('default_value'),
    required: boolean('required').notNull().default(false),
    validation: jsonb('validation').default('{}'),
    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateIdIdx: index('parlant_template_parameter_template_idx').on(table.templateId),
    orderIdx: index('parlant_template_parameter_order_idx').on(table.displayOrder),
    uniqueTemplateName: uniqueIndex('parlant_template_parameter_unique')
      .on(table.templateId, table.name),
  })
)

// Conversion Cache for Performance
export const parlantConversionCache = pgTable(
  'parlant_conversion_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheKey: text('cache_key').notNull(),
    workflowId: text('workflow_id').notNull(),
    templateId: uuid('template_id').references(() => parlantWorkflowTemplate.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Cache data
    parametersHash: text('parameters_hash').notNull(),
    conversionResult: jsonb('conversion_result').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),

    // Cache management
    hitCount: integer('hit_count').notNull().default(0),
    lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    cacheKeyIdx: uniqueIndex('parlant_conversion_cache_key_unique').on(table.cacheKey),
    workflowIdx: index('parlant_conversion_cache_workflow_idx').on(table.workflowId),
    templateIdx: index('parlant_conversion_cache_template_idx').on(table.templateId),
    workspaceIdx: index('parlant_conversion_cache_workspace_idx').on(table.workspaceId),
    expiresAtIdx: index('parlant_conversion_cache_expires_at_idx').on(table.expiresAt),
    lastAccessedIdx: index('parlant_conversion_cache_last_accessed_idx').on(table.lastAccessed),
  })
)

// Conversion History and Analytics
export const parlantConversionHistory = pgTable(
  'parlant_conversion_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversionId: text('conversion_id').notNull(),
    workflowId: text('workflow_id').notNull(),
    templateId: uuid('template_id').references(() => parlantWorkflowTemplate.id),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => user.id),
    agentId: uuid('agent_id').references(() => parlantAgent.id),

    // Conversion data
    parameters: jsonb('parameters').notNull().default('{}'),
    status: text('status').notNull(), // 'queued' | 'processing' | 'completed' | 'failed'
    result: jsonb('result'),
    errorDetails: jsonb('error_details'),
    metadata: jsonb('metadata').notNull().default('{}'),

    // Performance metrics
    durationMs: integer('duration_ms'),
    blocksConverted: integer('blocks_converted').default(0),
    edgesConverted: integer('edges_converted').default(0),
    warningsCount: integer('warnings_count').default(0),
    cacheHit: boolean('cache_hit').default(false),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    conversionIdIdx: uniqueIndex('parlant_conversion_history_conversion_id_unique').on(table.conversionId),
    workflowIdx: index('parlant_conversion_history_workflow_idx').on(table.workflowId),
    templateIdx: index('parlant_conversion_history_template_idx').on(table.templateId),
    workspaceIdx: index('parlant_conversion_history_workspace_idx').on(table.workspaceId),
    statusIdx: index('parlant_conversion_history_status_idx').on(table.status),
    createdAtIdx: index('parlant_conversion_history_created_at_idx').on(table.createdAt),
  })
)

// Journey Generation History
export const parlantJourneyGenerationHistory = pgTable(
  'parlant_journey_generation_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id').notNull(),
    conversionId: uuid('conversion_id')
      .references(() => parlantConversionHistory.id, { onDelete: 'set null' }),
    templateId: uuid('template_id').references(() => parlantWorkflowTemplate.id),
    workflowId: text('workflow_id').notNull(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => parlantAgent.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => user.id),

    // Journey data
    parametersUsed: jsonb('parameters_used').notNull().default('{}'),
    journeyTitle: text('journey_title').notNull(),
    journeyDescription: text('journey_description'),
    stepsCreated: integer('steps_created').notNull().default(0),
    optimizationLevel: text('optimization_level').notNull().default('standard'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    journeyIdx: uniqueIndex('parlant_journey_generation_journey_unique').on(table.journeyId),
    conversionIdx: index('parlant_journey_generation_conversion_idx').on(table.conversionId),
    templateIdx: index('parlant_journey_generation_template_idx').on(table.templateId),
    agentIdx: index('parlant_journey_generation_agent_idx').on(table.agentId),
    workspaceIdx: index('parlant_journey_generation_workspace_idx').on(table.workspaceId),
  })
)

// Export all Parlant tables for use in the main schema
export const parlantTables = {
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

  // Journey conversion tables
  parlantWorkflowTemplate,
  parlantTemplateParameter,
  parlantConversionCache,
  parlantConversionHistory,
  parlantJourneyGenerationHistory,
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