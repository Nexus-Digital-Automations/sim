import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user, workspace } from './base-schema'
import { parlantEvent, parlantSession } from './parlant-schema'

/**
 * Chat Persistence Schema Extension
 *
 * This schema extends the existing Parlant schema with chat-specific optimizations
 * for message persistence, conversation threading, and session restoration.
 *
 * Key design principles:
 * - Builds on existing Parlant infrastructure
 * - Optimized indexes for chat history queries
 * - Workspace isolation for multi-tenancy
 * - Browser session persistence support
 * - Efficient pagination and filtering
 */

// Enums for chat-specific types
export const messageStatusEnum = pgEnum('message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
])

export const conversationTypeEnum = pgEnum('conversation_type', [
  'direct',
  'group',
  'workflow',
  'support',
  'onboarding',
])

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'tool_call',
  'tool_result',
  'system',
  'error',
  'media',
  'file',
])

/**
 * Chat Messages - Enhanced message storage with metadata and status tracking
 * Extends parlantEvent with chat-specific optimizations
 */
export const chatMessage = pgTable(
  'chat_message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => parlantSession.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Message identification and ordering
    eventId: uuid('event_id').references(() => parlantEvent.id, {
      onDelete: 'cascade',
    }), // Link to underlying event
    sequenceNumber: integer('sequence_number').notNull(), // Sequential ordering within session

    // Message content and metadata
    messageType: messageTypeEnum('message_type').notNull(),
    content: jsonb('content').notNull(), // Message content with rich formatting support
    rawContent: text('raw_content'), // Raw text content for search

    // Sender information
    senderId: text('sender_id'), // User ID for user messages, agent ID for agent messages
    senderType: text('sender_type').notNull(), // 'user', 'agent', 'system'
    senderName: text('sender_name'), // Display name

    // Message status and delivery tracking
    status: messageStatusEnum('status').notNull().default('sent'),
    deliveredAt: timestamp('delivered_at'),
    readAt: timestamp('read_at'),

    // Threading and conversation context
    threadId: uuid('thread_id'), // For conversation threading
    parentMessageId: uuid('parent_message_id'), // For reply chains
    mentionedUserIds: text('mentioned_user_ids').array(), // User mentions

    // Rich content metadata
    attachments: jsonb('attachments').default('[]'), // File attachments
    reactions: jsonb('reactions').default('{}'), // Message reactions
    editHistory: jsonb('edit_history').default('[]'), // Edit tracking

    // Tool integration
    toolCallId: text('tool_call_id'), // Reference to tool executions
    toolResults: jsonb('tool_results'), // Tool execution results

    // Search and categorization
    tags: text('tags').array().default([]), // Message tags
    category: text('category'), // Message categorization
    priority: integer('priority').default(0), // Message priority

    // Analytics and metrics
    tokenCount: integer('token_count').default(0), // Token usage
    cost: integer('cost').default(0), // Processing cost in cents
    processingTime: integer('processing_time'), // Time to generate (ms)

    // Metadata and customization
    metadata: jsonb('metadata').default('{}'), // Flexible metadata storage
    customData: jsonb('custom_data').default('{}'), // Custom application data

    // Audit and compliance
    ipAddress: text('ip_address'), // Source IP (anonymized)
    userAgent: text('user_agent'), // Client information

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete support
  },
  (table) => ({
    // Primary access patterns - optimized for chat history queries
    sessionSequenceIdx: uniqueIndex('chat_message_session_sequence_idx').on(
      table.sessionId,
      table.sequenceNumber
    ),
    sessionCreatedIdx: index('chat_message_session_created_idx').on(
      table.sessionId,
      table.createdAt
    ),

    // Workspace isolation indexes
    workspaceCreatedIdx: index('chat_message_workspace_created_idx').on(
      table.workspaceId,
      table.createdAt
    ),
    workspaceSessionIdx: index('chat_message_workspace_session_idx').on(
      table.workspaceId,
      table.sessionId
    ),

    // Message status and delivery tracking
    statusIdx: index('chat_message_status_idx').on(table.status),
    sessionStatusIdx: index('chat_message_session_status_idx').on(table.sessionId, table.status),
    deliveredAtIdx: index('chat_message_delivered_at_idx').on(table.deliveredAt),

    // Threading and conversation context
    threadIdx: index('chat_message_thread_idx').on(table.threadId),
    parentMessageIdx: index('chat_message_parent_idx').on(table.parentMessageId),
    threadCreatedIdx: index('chat_message_thread_created_idx').on(table.threadId, table.createdAt),

    // Sender-based queries
    senderTypeIdx: index('chat_message_sender_type_idx').on(table.senderType),
    senderIdIdx: index('chat_message_sender_id_idx').on(table.senderId),
    sessionSenderIdx: index('chat_message_session_sender_idx').on(
      table.sessionId,
      table.senderType
    ),

    // Message type filtering
    messageTypeIdx: index('chat_message_type_idx').on(table.messageType),
    sessionTypeIdx: index('chat_message_session_type_idx').on(table.sessionId, table.messageType),

    // Tool integration indexes
    toolCallIdx: index('chat_message_tool_call_idx').on(table.toolCallId),

    // Search and analytics indexes
    categoryIdx: index('chat_message_category_idx').on(table.category),
    priorityIdx: index('chat_message_priority_idx').on(table.priority),
    tagsIdx: index('chat_message_tags_idx').on(table.tags),

    // Performance analytics
    tokenCountIdx: index('chat_message_token_count_idx').on(table.tokenCount),
    costIdx: index('chat_message_cost_idx').on(table.cost),

    // Soft delete filtering
    deletedAtIdx: index('chat_message_deleted_at_idx').on(table.deletedAt),
    activeSessionIdx: index('chat_message_active_session_idx').on(table.sessionId, table.deletedAt),
  })
)

/**
 * Chat Conversations - Logical grouping of related chat sessions
 * Enables conversation threading and persistent chat history
 */
export const chatConversation = pgTable(
  'chat_conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),

    // Conversation identification
    title: text('title'), // User-defined or auto-generated title
    description: text('description'),
    conversationType: conversationTypeEnum('conversation_type').notNull().default('direct'),

    // Participant management
    participantIds: text('participant_ids').array().default([]), // User IDs
    agentIds: uuid('agent_ids').array().default([]), // Agent IDs participating
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Conversation state and settings
    isActive: boolean('is_active').notNull().default(true),
    isArchived: boolean('is_archived').notNull().default(false),
    isPinned: boolean('is_pinned').notNull().default(false),

    // Privacy and access control
    isPrivate: boolean('is_private').notNull().default(false),
    accessLevel: text('access_level').default('workspace'), // 'workspace', 'private', 'public'

    // Conversation analytics
    messageCount: integer('message_count').notNull().default(0),
    participantCount: integer('participant_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at'),
    lastActivityAt: timestamp('last_activity_at'),

    // Session management
    currentSessionId: uuid('current_session_id').references(() => parlantSession.id, {
      onDelete: 'set null',
    }),
    sessionIds: uuid('session_ids').array().default([]), // All associated session IDs

    // Conversation metadata
    tags: text('tags').array().default([]),
    category: text('category'),
    priority: integer('priority').default(0),
    customData: jsonb('custom_data').default('{}'),

    // Analytics and metrics
    totalTokens: integer('total_tokens').default(0),
    totalCost: integer('total_cost').default(0), // Total cost in cents
    averageResponseTime: integer('average_response_time'), // Average response time in ms
    satisfactionScore: integer('satisfaction_score'), // 1-5 rating if collected

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    archivedAt: timestamp('archived_at'),
    deletedAt: timestamp('deleted_at'), // Soft delete support
  },
  (table) => ({
    // Primary access patterns
    workspaceActiveIdx: index('chat_conversation_workspace_active_idx').on(
      table.workspaceId,
      table.isActive,
      table.deletedAt
    ),
    workspaceUpdatedIdx: index('chat_conversation_workspace_updated_idx').on(
      table.workspaceId,
      table.updatedAt
    ),

    // Conversation filtering and sorting
    conversationTypeIdx: index('chat_conversation_type_idx').on(table.conversationType),
    workspaceTypeIdx: index('chat_conversation_workspace_type_idx').on(
      table.workspaceId,
      table.conversationType
    ),

    // Status filtering
    isActiveIdx: index('chat_conversation_is_active_idx').on(table.isActive),
    isArchivedIdx: index('chat_conversation_is_archived_idx').on(table.isArchived),
    isPinnedIdx: index('chat_conversation_is_pinned_idx').on(table.isPinned),

    // Participant and creator queries
    createdByIdx: index('chat_conversation_created_by_idx').on(table.createdBy),
    participantIdsIdx: index('chat_conversation_participant_ids_idx').on(table.participantIds),
    agentIdsIdx: index('chat_conversation_agent_ids_idx').on(table.agentIds),

    // Activity and engagement tracking
    lastActivityIdx: index('chat_conversation_last_activity_idx').on(table.lastActivityAt),
    lastMessageIdx: index('chat_conversation_last_message_idx').on(table.lastMessageAt),
    messageCountIdx: index('chat_conversation_message_count_idx').on(table.messageCount),

    // Session management
    currentSessionIdx: index('chat_conversation_current_session_idx').on(table.currentSessionId),
    sessionIdsIdx: index('chat_conversation_session_ids_idx').on(table.sessionIds),

    // Search and categorization
    categoryIdx: index('chat_conversation_category_idx').on(table.category),
    tagsIdx: index('chat_conversation_tags_idx').on(table.tags),
    priorityIdx: index('chat_conversation_priority_idx').on(table.priority),

    // Analytics indexes
    totalTokensIdx: index('chat_conversation_total_tokens_idx').on(table.totalTokens),
    totalCostIdx: index('chat_conversation_total_cost_idx').on(table.totalCost),
    satisfactionIdx: index('chat_conversation_satisfaction_idx').on(table.satisfactionScore),

    // Soft delete support
    deletedAtIdx: index('chat_conversation_deleted_at_idx').on(table.deletedAt),
  })
)

/**
 * Browser Session Persistence - Maintains chat state across browser sessions
 * Enables seamless conversation restoration and cross-device continuity
 */
export const chatBrowserSession = pgTable(
  'chat_browser_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionToken: text('session_token').notNull().unique(), // Browser session identifier

    // Associated entities
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => chatConversation.id, {
      onDelete: 'cascade',
    }),
    parlantSessionId: uuid('parlant_session_id').references(() => parlantSession.id, {
      onDelete: 'cascade',
    }),

    // Session state persistence
    chatState: jsonb('chat_state').notNull().default('{}'), // Full chat interface state
    conversationState: jsonb('conversation_state').default('{}'), // Conversation context
    uiState: jsonb('ui_state').default('{}'), // UI preferences and state

    // Session metadata
    deviceInfo: jsonb('device_info').default('{}'), // Device/browser information
    lastActiveUrl: text('last_active_url'), // Last active page URL
    scrollPosition: integer('scroll_position').default(0), // Chat scroll position

    // Session management
    isActive: boolean('is_active').notNull().default(true),
    lastHeartbeat: timestamp('last_heartbeat').notNull().defaultNow(),
    heartbeatCount: integer('heartbeat_count').default(0),

    // Analytics and tracking
    sessionDuration: integer('session_duration').default(0), // Total session time in seconds
    messagesInSession: integer('messages_in_session').default(0),
    lastMessageAt: timestamp('last_message_at'),

    // Browser session details
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'), // Anonymized IP for analytics
    referrer: text('referrer'),
    locale: text('locale').default('en'),
    timezone: text('timezone').default('UTC'),

    // Expiration and cleanup
    expiresAt: timestamp('expires_at').notNull(), // Session expiration

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access patterns - session restoration
    sessionTokenIdx: uniqueIndex('chat_browser_session_token_unique').on(table.sessionToken),

    // Workspace and user queries
    workspaceActiveIdx: index('chat_browser_session_workspace_active_idx').on(
      table.workspaceId,
      table.isActive
    ),
    userActiveIdx: index('chat_browser_session_user_active_idx').on(table.userId, table.isActive),

    // Session state queries
    conversationSessionIdx: index('chat_browser_session_conversation_idx').on(
      table.conversationId,
      table.isActive
    ),
    parlantSessionIdx: index('chat_browser_session_parlant_idx').on(table.parlantSessionId),

    // Session management and cleanup
    isActiveIdx: index('chat_browser_session_is_active_idx').on(table.isActive),
    lastHeartbeatIdx: index('chat_browser_session_last_heartbeat_idx').on(table.lastHeartbeat),
    expiresAtIdx: index('chat_browser_session_expires_at_idx').on(table.expiresAt),

    // Analytics indexes
    sessionDurationIdx: index('chat_browser_session_duration_idx').on(table.sessionDuration),
    messagesCountIdx: index('chat_browser_session_messages_count_idx').on(table.messagesInSession),
    lastMessageIdx: index('chat_browser_session_last_message_idx').on(table.lastMessageAt),

    // Cleanup and maintenance indexes
    workspaceExpiresIdx: index('chat_browser_session_workspace_expires_idx').on(
      table.workspaceId,
      table.expiresAt
    ),
    userExpiresIdx: index('chat_browser_session_user_expires_idx').on(
      table.userId,
      table.expiresAt
    ),
  })
)

/**
 * Chat Search Index - Optimized full-text search for chat messages
 * Provides fast message search across conversations and sessions
 */
export const chatSearchIndex = pgTable(
  'chat_search_index',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => chatMessage.id, { onDelete: 'cascade' })
      .unique(), // One-to-one with messages

    // Context references
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => chatConversation.id, {
      onDelete: 'cascade',
    }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => parlantSession.id, { onDelete: 'cascade' }),

    // Searchable content - extracted and processed for optimal search
    searchableContent: text('searchable_content').notNull(), // Processed text content
    keywords: text('keywords').array().default([]), // Extracted keywords
    entities: jsonb('entities').default('[]'), // Named entities and mentions

    // Content categorization for filtered search
    contentType: text('content_type'), // 'question', 'answer', 'instruction', etc.
    language: text('language').default('en'), // Detected language
    sentiment: text('sentiment'), // Detected sentiment: 'positive', 'negative', 'neutral'

    // Search optimization metadata
    wordCount: integer('word_count').default(0),
    characterCount: integer('character_count').default(0),
    searchableTerms: text('searchable_terms').array().default([]), // Stemmed search terms

    // Relevance and ranking factors
    messageImportance: integer('message_importance').default(0), // 0-100 importance score
    engagementScore: integer('engagement_score').default(0), // Based on reactions, replies

    // Indexing metadata
    lastIndexed: timestamp('last_indexed').notNull().defaultNow(),
    indexVersion: integer('index_version').default(1), // For index migrations

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Full-text search indexes (PostgreSQL specific)
    searchContentIdx: index('chat_search_content_idx').on(table.searchableContent),

    // Context-based search
    workspaceSearchIdx: index('chat_search_workspace_idx').on(
      table.workspaceId,
      table.searchableContent
    ),
    conversationSearchIdx: index('chat_search_conversation_idx').on(
      table.conversationId,
      table.searchableContent
    ),
    sessionSearchIdx: index('chat_search_session_idx').on(table.sessionId, table.searchableContent),

    // Keyword and entity search
    keywordsIdx: index('chat_search_keywords_idx').on(table.keywords),
    entitiesIdx: index('chat_search_entities_idx').on(table.entities),
    searchableTermsIdx: index('chat_search_terms_idx').on(table.searchableTerms),

    // Content classification
    contentTypeIdx: index('chat_search_content_type_idx').on(table.contentType),
    languageIdx: index('chat_search_language_idx').on(table.language),
    sentimentIdx: index('chat_search_sentiment_idx').on(table.sentiment),

    // Relevance and ranking
    importanceIdx: index('chat_search_importance_idx').on(table.messageImportance),
    engagementIdx: index('chat_search_engagement_idx').on(table.engagementScore),

    // Composite indexes for common search patterns
    workspaceTypeImportanceIdx: index('chat_search_workspace_type_importance_idx').on(
      table.workspaceId,
      table.contentType,
      table.messageImportance
    ),

    // Index maintenance
    lastIndexedIdx: index('chat_search_last_indexed_idx').on(table.lastIndexed),
    indexVersionIdx: index('chat_search_index_version_idx').on(table.indexVersion),
  })
)

/**
 * Chat Export Requests - Data portability and export management
 * Handles user data export requests for compliance and data portability
 */
export const chatExportRequest = pgTable(
  'chat_export_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestToken: text('request_token').notNull().unique(), // Unique export identifier

    // Request context
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    requestedBy: text('requested_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Export scope and filtering
    exportScope: text('export_scope').notNull(), // 'workspace', 'user', 'conversation', 'session'
    targetIds: text('target_ids').array().default([]), // IDs of conversations/sessions to export
    dateRange: jsonb('date_range'), // Start and end date filtering
    includeMetadata: boolean('include_metadata').default(true),
    includeAttachments: boolean('include_attachments').default(true),

    // Export format and options
    exportFormat: text('export_format').notNull().default('json'), // 'json', 'csv', 'markdown'
    compressionType: text('compression_type').default('zip'), // 'zip', 'gzip', 'none'

    // Export processing status
    status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
    processingStartedAt: timestamp('processing_started_at'),
    processingCompletedAt: timestamp('processing_completed_at'),

    // Export results
    exportFilePath: text('export_file_path'), // Path to generated export file
    exportFileSize: integer('export_file_size'), // File size in bytes
    recordCount: integer('record_count'), // Number of exported records

    // Error handling
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),

    // Access and security
    downloadCount: integer('download_count').default(0),
    lastDownloadAt: timestamp('last_download_at'),
    expiresAt: timestamp('expires_at').notNull(), // Export link expiration

    // Audit trail
    requestMetadata: jsonb('request_metadata').default('{}'), // Request context

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access patterns
    requestTokenIdx: uniqueIndex('chat_export_request_token_unique').on(table.requestToken),

    // User and workspace queries
    workspaceStatusIdx: index('chat_export_workspace_status_idx').on(
      table.workspaceId,
      table.status
    ),
    requestedByIdx: index('chat_export_requested_by_idx').on(table.requestedBy),

    // Status and processing tracking
    statusIdx: index('chat_export_status_idx').on(table.status),
    processingIdx: index('chat_export_processing_idx').on(table.status, table.processingStartedAt),

    // Cleanup and maintenance
    expiresAtIdx: index('chat_export_expires_at_idx').on(table.expiresAt),
    completedExpiresIdx: index('chat_export_completed_expires_idx').on(
      table.status,
      table.expiresAt
    ),

    // Analytics
    downloadCountIdx: index('chat_export_download_count_idx').on(table.downloadCount),
    exportSizeIdx: index('chat_export_file_size_idx').on(table.exportFileSize),
    recordCountIdx: index('chat_export_record_count_idx').on(table.recordCount),
  })
)

// Export all chat persistence tables
export const chatPersistenceTables = {
  chatMessage,
  chatConversation,
  chatBrowserSession,
  chatSearchIndex,
  chatExportRequest,
}

// Export enums
export const chatPersistenceEnums = {
  messageStatusEnum,
  conversationTypeEnum,
  messageTypeEnum,
}

/**
 * Chat Persistence Query Helpers and Types
 * Type definitions for enhanced chat persistence functionality
 */
export type ChatMessage = typeof chatMessage.$inferSelect
export type ChatConversation = typeof chatConversation.$inferSelect
export type ChatBrowserSession = typeof chatBrowserSession.$inferSelect
export type ChatSearchIndex = typeof chatSearchIndex.$inferSelect
export type ChatExportRequest = typeof chatExportRequest.$inferSelect

export type NewChatMessage = typeof chatMessage.$inferInsert
export type NewChatConversation = typeof chatConversation.$inferInsert
export type NewChatBrowserSession = typeof chatBrowserSession.$inferInsert
export type NewChatSearchIndex = typeof chatSearchIndex.$inferInsert
export type NewChatExportRequest = typeof chatExportRequest.$inferInsert
