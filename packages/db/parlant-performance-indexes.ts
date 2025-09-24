/**
 * Parlant Database Performance Indexes
 *
 * This file contains comprehensive performance optimization indexes for the Parlant
 * database schema extension, focusing on workspace isolation, query performance,
 * and multi-tenant access patterns.
 *
 * Performance Analysis Strategy:
 * - Workspace isolation queries (99% of operations are workspace-scoped)
 * - Agent lifecycle operations (create, read, update, delete)
 * - Session and conversation history queries (real-time operations)
 * - Cross-table joins for agent-session-event relationships
 * - Time-based queries for activity tracking and analytics
 */

import { type SQL, sql } from 'drizzle-orm'
import { index, uniqueIndex, type PgTableWithColumns } from 'drizzle-orm/pg-core'
import {
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
  parlantCannedResponse
} from './parlant-schema'

/**
 * PERFORMANCE OPTIMIZATION ANALYSIS
 *
 * Based on expected Parlant usage patterns:
 *
 * 1. Workspace Isolation (Critical):
 *    - 99% of queries are workspace-scoped
 *    - Need composite indexes combining workspace_id with other filters
 *    - Prevent accidental cross-workspace data leakage
 *
 * 2. Agent Lifecycle Operations:
 *    - Agent creation and configuration updates
 *    - Status changes (active, inactive, archived)
 *    - Session management and tracking
 *
 * 3. Real-time Session Operations:
 *    - Message processing and event logging
 *    - Journey state transitions
 *    - Variable updates and context management
 *
 * 4. Analytics and Monitoring:
 *    - Usage statistics and performance metrics
 *    - Activity tracking and reporting
 *    - Performance regression testing
 */

/**
 * ENHANCED PARLANT AGENT INDEXES
 * Additional performance indexes for agent operations
 */
export const parlantAgentPerformanceIndexes = {
  // Critical workspace isolation index - prevents cross-workspace queries
  workspaceActiveAgentsIdx: index('parlant_agent_workspace_active_performance_idx')
    .on(parlantAgent.workspaceId, parlantAgent.status, parlantAgent.deletedAt),

  // Agent discovery and listing - common UI operations
  workspaceCreatedAtIdx: index('parlant_agent_workspace_created_at_idx')
    .on(parlantAgent.workspaceId, parlantAgent.createdAt),

  // Active agent monitoring - real-time dashboard queries
  workspaceLastActiveIdx: index('parlant_agent_workspace_last_active_idx')
    .on(parlantAgent.workspaceId, parlantAgent.lastActiveAt, parlantAgent.status),

  // User's agents across workspaces - multi-workspace scenarios
  createdByStatusIdx: index('parlant_agent_created_by_status_idx')
    .on(parlantAgent.createdBy, parlantAgent.status, parlantAgent.workspaceId),

  // Model provider analytics - for cost tracking and optimization
  workspaceModelProviderIdx: index('parlant_agent_workspace_model_provider_idx')
    .on(parlantAgent.workspaceId, parlantAgent.modelProvider, parlantAgent.status),

  // Performance metrics tracking - usage analytics
  workspaceTotalSessionsIdx: index('parlant_agent_workspace_total_sessions_idx')
    .on(parlantAgent.workspaceId, parlantAgent.totalSessions, parlantAgent.status)
}

/**
 * ENHANCED PARLANT SESSION INDEXES
 * Optimized for real-time session operations and workspace isolation
 */
export const parlantSessionPerformanceIndexes = {
  // Critical workspace-agent session queries - most common operation
  workspaceAgentActiveIdx: index('parlant_session_workspace_agent_active_idx')
    .on(parlantSession.workspaceId, parlantSession.agentId, parlantSession.status),

  // Customer session tracking - external user identification
  workspaceCustomerIdx: index('parlant_session_workspace_customer_idx')
    .on(parlantSession.workspaceId, parlantSession.customerId, parlantSession.status),

  // Session activity monitoring - real-time updates
  workspaceLastActivityIdx: index('parlant_session_workspace_last_activity_idx')
    .on(parlantSession.workspaceId, parlantSession.lastActivityAt, parlantSession.status),

  // Journey tracking - conversational flow monitoring
  workspaceJourneyStateIdx: index('parlant_session_workspace_journey_state_idx')
    .on(parlantSession.workspaceId, parlantSession.currentJourneyId, parlantSession.currentStateId),

  // User session history - authenticated user sessions
  workspaceUserActiveIdx: index('parlant_session_workspace_user_active_idx')
    .on(parlantSession.workspaceId, parlantSession.userId, parlantSession.status),

  // Session lifecycle tracking - start to completion analytics
  workspaceStartedEndedIdx: index('parlant_session_workspace_started_ended_idx')
    .on(parlantSession.workspaceId, parlantSession.startedAt, parlantSession.endedAt),

  // Agent performance metrics - session count and activity
  agentEventMessageCountIdx: index('parlant_session_agent_event_message_count_idx')
    .on(parlantSession.agentId, parlantSession.eventCount, parlantSession.messageCount, parlantSession.status)
}

/**
 * ENHANCED PARLANT EVENT INDEXES
 * High-performance event processing and retrieval
 */
export const parlantEventPerformanceIndexes = {
  // Session event ordering - critical for message history
  sessionOffsetCreatedIdx: index('parlant_event_session_offset_created_idx')
    .on(parlantEvent.sessionId, parlantEvent.offset, parlantEvent.createdAt),

  // Event type filtering within sessions - message vs tool call analysis
  sessionTypeOffsetIdx: index('parlant_event_session_type_offset_idx')
    .on(parlantEvent.sessionId, parlantEvent.eventType, parlantEvent.offset),

  // Tool usage tracking - cross-session tool analysis
  toolCallSessionIdx: index('parlant_event_tool_call_session_idx')
    .on(parlantEvent.toolCallId, parlantEvent.sessionId, parlantEvent.createdAt),

  // Journey transition tracking - conversational flow analysis
  journeyStateSessionIdx: index('parlant_event_journey_state_session_idx')
    .on(parlantEvent.journeyId, parlantEvent.stateId, parlantEvent.sessionId),

  // Time-based event analysis - activity monitoring and analytics
  createdAtTypeIdx: index('parlant_event_created_at_type_idx')
    .on(parlantEvent.createdAt, parlantEvent.eventType, parlantEvent.sessionId),

  // Batch event processing - efficient bulk operations
  sessionCreatedAtIdx: index('parlant_event_session_created_at_idx')
    .on(parlantEvent.sessionId, parlantEvent.createdAt)
}

/**
 * ENHANCED PARLANT GUIDELINE INDEXES
 * Behavior rule matching and performance optimization
 */
export const parlantGuidelinePerformanceIndexes = {
  // Agent guideline execution - priority-based matching
  agentEnabledPriorityIdx: index('parlant_guideline_agent_enabled_priority_idx')
    .on(parlantGuideline.agentId, parlantGuideline.enabled, parlantGuideline.priority),

  // Guideline usage analytics - effectiveness tracking
  agentMatchCountIdx: index('parlant_guideline_agent_match_count_idx')
    .on(parlantGuideline.agentId, parlantGuideline.matchCount, parlantGuideline.enabled),

  // Recent guideline activity - performance monitoring
  agentLastMatchedIdx: index('parlant_guideline_agent_last_matched_idx')
    .on(parlantGuideline.agentId, parlantGuideline.lastMatchedAt, parlantGuideline.enabled),

  // Guideline maintenance - priority and usage optimization
  enabledPriorityUpdatedIdx: index('parlant_guideline_enabled_priority_updated_idx')
    .on(parlantGuideline.enabled, parlantGuideline.priority, parlantGuideline.updatedAt)
}

/**
 * ENHANCED PARLANT JOURNEY INDEXES
 * Conversational flow performance optimization
 */
export const parlantJourneyPerformanceIndexes = {
  // Agent journey management - active journey discovery
  agentEnabledCompletionIdx: index('parlant_journey_agent_enabled_completion_idx')
    .on(parlantJourney.agentId, parlantJourney.enabled, parlantJourney.completionRate),

  // Journey usage analytics - performance tracking
  agentTotalSessionsIdx: index('parlant_journey_agent_total_sessions_idx')
    .on(parlantJourney.agentId, parlantJourney.totalSessions, parlantJourney.enabled),

  // Recent journey activity - monitoring and optimization
  agentLastUsedIdx: index('parlant_journey_agent_last_used_idx')
    .on(parlantJourney.agentId, parlantJourney.lastUsedAt, parlantJourney.enabled)
}

/**
 * ENHANCED PARLANT JOURNEY STATE INDEXES
 * Journey step navigation optimization
 */
export const parlantJourneyStatePerformanceIndexes = {
  // Journey state navigation - step-by-step flow
  journeyTypeInitialFinalIdx: index('parlant_journey_state_journey_type_initial_final_idx')
    .on(parlantJourneyState.journeyId, parlantJourneyState.stateType, parlantJourneyState.isInitial, parlantJourneyState.isFinal),

  // State discovery and filtering - UI operations
  journeyInitialFinalIdx: index('parlant_journey_state_journey_initial_final_idx')
    .on(parlantJourneyState.journeyId, parlantJourneyState.isInitial, parlantJourneyState.isFinal)
}

/**
 * ENHANCED PARLANT JOURNEY TRANSITION INDEXES
 * Journey flow optimization and analytics
 */
export const parlantJourneyTransitionPerformanceIndexes = {
  // Transition execution - state navigation performance
  journeyFromToPriorityIdx: index('parlant_journey_transition_journey_from_to_priority_idx')
    .on(parlantJourneyTransition.journeyId, parlantJourneyTransition.fromStateId, parlantJourneyTransition.toStateId, parlantJourneyTransition.priority),

  // Transition usage analytics - flow optimization
  journeyUseCountIdx: index('parlant_journey_transition_journey_use_count_idx')
    .on(parlantJourneyTransition.journeyId, parlantJourneyTransition.useCount, parlantJourneyTransition.priority),

  // Recent transition activity - performance monitoring
  journeyLastUsedIdx: index('parlant_journey_transition_journey_last_used_idx')
    .on(parlantJourneyTransition.journeyId, parlantJourneyTransition.lastUsedAt)
}

/**
 * ENHANCED PARLANT VARIABLE INDEXES
 * Session and customer context optimization
 */
export const parlantVariablePerformanceIndexes = {
  // Variable access by scope - session vs customer vs global
  agentScopeKeyIdx: index('parlant_variable_agent_scope_key_idx')
    .on(parlantVariable.agentId, parlantVariable.scope, parlantVariable.key),

  // Session variable access - real-time context retrieval
  sessionKeyTypeIdx: index('parlant_variable_session_key_type_idx')
    .on(parlantVariable.sessionId, parlantVariable.key, parlantVariable.valueType),

  // Variable privacy filtering - secure access control
  agentPrivateUpdatedIdx: index('parlant_variable_agent_private_updated_idx')
    .on(parlantVariable.agentId, parlantVariable.isPrivate, parlantVariable.updatedAt)
}

/**
 * ENHANCED PARLANT TOOL INDEXES
 * Tool discovery and performance optimization
 */
export const parlantToolPerformanceIndexes = {
  // Workspace tool discovery - active tool listing
  workspaceEnabledTypeIdx: index('parlant_tool_workspace_enabled_type_idx')
    .on(parlantTool.workspaceId, parlantTool.enabled, parlantTool.toolType),

  // Tool usage analytics - performance and success tracking
  workspaceUseCountSuccessIdx: index('parlant_tool_workspace_use_count_success_idx')
    .on(parlantTool.workspaceId, parlantTool.useCount, parlantTool.successRate, parlantTool.enabled),

  // Public tool discovery - cross-workspace tool sharing
  enabledPublicLastUsedIdx: index('parlant_tool_enabled_public_last_used_idx')
    .on(parlantTool.enabled, parlantTool.isPublic, parlantTool.lastUsedAt),

  // Sim tool integration - native tool mapping
  workspaceSimToolIdx: index('parlant_tool_workspace_sim_tool_idx')
    .on(parlantTool.workspaceId, parlantTool.simToolId, parlantTool.enabled)
}

/**
 * ENHANCED PARLANT TERM INDEXES
 * Glossary and terminology optimization
 */
export const parlantTermPerformanceIndexes = {
  // Term importance and categorization - knowledge base optimization
  agentImportanceCategoryIdx: index('parlant_term_agent_importance_category_idx')
    .on(parlantTerm.agentId, parlantTerm.importance, parlantTerm.category),

  // Term maintenance - content management
  agentUpdatedIdx: index('parlant_term_agent_updated_idx')
    .on(parlantTerm.agentId, parlantTerm.updatedAt, parlantTerm.importance)
}

/**
 * ENHANCED PARLANT CANNED RESPONSE INDEXES
 * Response template optimization and matching
 */
export const parlantCannedResponsePerformanceIndexes = {
  // Response matching - priority-based template selection
  agentEnabledPriorityMatchIdx: index('parlant_canned_response_agent_enabled_priority_match_idx')
    .on(parlantCannedResponse.agentId, parlantCannedResponse.enabled, parlantCannedResponse.priority, parlantCannedResponse.requiresExactMatch),

  // Response usage analytics - template effectiveness
  agentUseCountLastUsedIdx: index('parlant_canned_response_agent_use_count_last_used_idx')
    .on(parlantCannedResponse.agentId, parlantCannedResponse.useCount, parlantCannedResponse.lastUsedAt),

  // Category-based response organization
  agentCategoryEnabledIdx: index('parlant_canned_response_agent_category_enabled_idx')
    .on(parlantCannedResponse.agentId, parlantCannedResponse.category, parlantCannedResponse.enabled, parlantCannedResponse.priority)
}

/**
 * WORKSPACE ISOLATION SECURITY INDEXES
 * Prevent cross-workspace data leakage with performance-optimized isolation
 */
export const workspaceIsolationIndexes = {
  // Workspace-scoped agent operations - security boundary enforcement
  workspaceAgentSecurityIdx: index('workspace_agent_security_isolation_idx')
    .on(parlantAgent.workspaceId, parlantAgent.id, parlantAgent.status),

  // Workspace-scoped session operations - multi-tenant isolation
  workspaceSessionSecurityIdx: index('workspace_session_security_isolation_idx')
    .on(parlantSession.workspaceId, parlantSession.id, parlantSession.agentId),

  // Workspace tool isolation - secure tool access
  workspaceToolSecurityIdx: index('workspace_tool_security_isolation_idx')
    .on(parlantTool.workspaceId, parlantTool.id, parlantTool.enabled)
}

/**
 * PARTIAL INDEXES FOR SPECIFIC OPTIMIZATION SCENARIOS
 * These indexes only include relevant rows to minimize size and maximize performance
 */

// Only index active agents to optimize common queries
export const activeAgentsPartialIdx = index('parlant_agent_active_partial_idx')
  .on(parlantAgent.workspaceId, parlantAgent.lastActiveAt, parlantAgent.totalSessions)
  .where(sql`${parlantAgent.status} = 'active' AND ${parlantAgent.deletedAt} IS NULL`)

// Only index active sessions for real-time operations
export const activeSessionsPartialIdx = index('parlant_session_active_partial_idx')
  .on(parlantSession.workspaceId, parlantSession.agentId, parlantSession.lastActivityAt)
  .where(sql`${parlantSession.status} = 'active'`)

// Only index enabled guidelines for rule matching
export const enabledGuidelinesPartialIdx = index('parlant_guideline_enabled_partial_idx')
  .on(parlantGuideline.agentId, parlantGuideline.priority, parlantGuideline.matchCount)
  .where(sql`${parlantGuideline.enabled} = true`)

// Only index enabled journeys for flow execution
export const enabledJourneysPartialIdx = index('parlant_journey_enabled_partial_idx')
  .on(parlantJourney.agentId, parlantJourney.completionRate, parlantJourney.totalSessions)
  .where(sql`${parlantJourney.enabled} = true`)

// Only index enabled tools for discovery
export const enabledToolsPartialIdx = index('parlant_tool_enabled_partial_idx')
  .on(parlantTool.workspaceId, parlantTool.toolType, parlantTool.successRate)
  .where(sql`${parlantTool.enabled} = true`)

// Only index enabled canned responses for template matching
export const enabledCannedResponsesPartialIdx = index('parlant_canned_response_enabled_partial_idx')
  .on(parlantCannedResponse.agentId, parlantCannedResponse.priority, parlantCannedResponse.category)
  .where(sql`${parlantCannedResponse.enabled} = true`)

/**
 * COMPOSITE INDEXES FOR COMMON JOIN PATTERNS
 * Optimize frequently used table joins and relationships
 */

// Agent-Session join optimization
export const agentSessionJoinIdx = index('parlant_agent_session_join_idx')
  .on(parlantAgent.workspaceId, parlantAgent.id, parlantAgent.status)

// Session-Event join optimization
export const sessionEventJoinIdx = index('parlant_session_event_join_idx')
  .on(parlantSession.id, parlantSession.agentId, parlantSession.workspaceId)

// Journey-State join optimization
export const journeyStateJoinIdx = index('parlant_journey_state_join_idx')
  .on(parlantJourney.id, parlantJourney.agentId, parlantJourney.enabled)

// Agent-Tool workspace join optimization
export const agentToolJoinIdx = index('parlant_agent_tool_join_idx')
  .on(parlantAgent.workspaceId, parlantTool.workspaceId, parlantTool.enabled)

/**
 * EXPORT ALL PERFORMANCE INDEXES
 * Centralized export for migration and deployment
 */
export const allParlantPerformanceIndexes = {
  // Agent performance indexes
  ...parlantAgentPerformanceIndexes,

  // Session performance indexes
  ...parlantSessionPerformanceIndexes,

  // Event performance indexes
  ...parlantEventPerformanceIndexes,

  // Guideline performance indexes
  ...parlantGuidelinePerformanceIndexes,

  // Journey performance indexes
  ...parlantJourneyPerformanceIndexes,

  // Journey state performance indexes
  ...parlantJourneyStatePerformanceIndexes,

  // Journey transition performance indexes
  ...parlantJourneyTransitionPerformanceIndexes,

  // Variable performance indexes
  ...parlantVariablePerformanceIndexes,

  // Tool performance indexes
  ...parlantToolPerformanceIndexes,

  // Term performance indexes
  ...parlantTermPerformanceIndexes,

  // Canned response performance indexes
  ...parlantCannedResponsePerformanceIndexes,

  // Workspace isolation indexes
  ...workspaceIsolationIndexes,

  // Partial indexes
  activeAgentsPartialIdx,
  activeSessionsPartialIdx,
  enabledGuidelinesPartialIdx,
  enabledJourneysPartialIdx,
  enabledToolsPartialIdx,
  enabledCannedResponsesPartialIdx,

  // Join optimization indexes
  agentSessionJoinIdx,
  sessionEventJoinIdx,
  journeyStateJoinIdx,
  agentToolJoinIdx
}

/**
 * INDEX NAMING CONVENTION
 *
 * Format: [table]_[columns]_[type]_idx
 * - table: parlant_agent, parlant_session, etc.
 * - columns: workspace_agent, created_at, etc.
 * - type: performance, security, partial, join
 * - idx: always ends with _idx
 *
 * Examples:
 * - parlant_agent_workspace_active_performance_idx
 * - parlant_session_workspace_customer_security_idx
 * - parlant_guideline_enabled_partial_idx
 * - parlant_agent_session_join_idx
 */