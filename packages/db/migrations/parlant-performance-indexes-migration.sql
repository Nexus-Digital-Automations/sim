/**
 * Parlant Performance Indexes Migration
 *
 * This migration adds comprehensive performance indexes for the Parlant
 * database schema extension, focusing on workspace isolation, query
 * performance, and multi-tenant access patterns.
 *
 * MIGRATION STRATEGY:
 * 1. Create indexes with IF NOT EXISTS to handle re-runs safely
 * 2. Use CONCURRENTLY for zero-downtime index creation
 * 3. Implement partial indexes for specific optimization scenarios
 * 4. Add composite indexes for common query patterns
 * 5. Include workspace isolation security indexes
 *
 * ESTIMATED TIME: 5-15 minutes depending on data volume
 * REQUIRES: PostgreSQL 12+ for enhanced index features
 */

-- Begin transaction for atomic migration
BEGIN;

-- Set maintenance_work_mem for faster index creation
SET maintenance_work_mem = '1GB';

-- ============================================================================
-- ENHANCED AGENT PERFORMANCE INDEXES
-- ============================================================================

-- Critical workspace isolation index - prevents cross-workspace queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_active_performance_idx
ON parlant_agent (workspace_id, status, deleted_at, last_active_at, total_sessions)
WHERE deleted_at IS NULL;

-- Agent discovery and listing - common UI operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_created_at_idx
ON parlant_agent (workspace_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Active agent monitoring - real-time dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_last_active_idx
ON parlant_agent (workspace_id, last_active_at DESC, status)
WHERE status = 'active' AND deleted_at IS NULL;

-- User's agents across workspaces - multi-workspace scenarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_created_by_status_idx
ON parlant_agent (created_by, status, workspace_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Model provider analytics - for cost tracking and optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_model_provider_idx
ON parlant_agent (workspace_id, model_provider, status, total_cost)
WHERE deleted_at IS NULL;

-- Performance metrics tracking - usage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_total_sessions_idx
ON parlant_agent (workspace_id, total_sessions DESC, total_messages DESC, status)
WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================================
-- ENHANCED SESSION PERFORMANCE INDEXES
-- ============================================================================

-- Critical workspace-agent session queries - most common operation
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_agent_active_idx
ON parlant_session (workspace_id, agent_id, status, last_activity_at DESC)
WHERE status = 'active';

-- Customer session tracking - external user identification
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_customer_idx
ON parlant_session (workspace_id, customer_id, status, started_at DESC)
WHERE customer_id IS NOT NULL;

-- Session activity monitoring - real-time updates
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_last_activity_idx
ON parlant_session (workspace_id, last_activity_at DESC, status, agent_id)
WHERE status IN ('active', 'completed');

-- Journey tracking - conversational flow monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_journey_state_idx
ON parlant_session (workspace_id, current_journey_id, current_state_id, status)
WHERE current_journey_id IS NOT NULL;

-- User session history - authenticated user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_user_active_idx
ON parlant_session (workspace_id, user_id, status, last_activity_at DESC)
WHERE user_id IS NOT NULL;

-- Session lifecycle tracking - start to completion analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_started_ended_idx
ON parlant_session (workspace_id, started_at DESC, ended_at, session_type);

-- Agent performance metrics - session count and activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_agent_event_message_count_idx
ON parlant_session (agent_id, event_count DESC, message_count DESC, status, tokens_used)
WHERE status IN ('active', 'completed');

-- Session type and analytics - categorization queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_type_analytics_idx
ON parlant_session (workspace_id, session_type, satisfaction_score, cost)
WHERE satisfaction_score IS NOT NULL;

-- ============================================================================
-- ENHANCED EVENT PERFORMANCE INDEXES
-- ============================================================================

-- Session event ordering - critical for message history
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_offset_created_idx
ON parlant_event (session_id, offset, created_at DESC);

-- Event type filtering within sessions - message vs tool call analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_type_offset_idx
ON parlant_event (session_id, event_type, offset ASC);

-- Tool usage tracking - cross-session tool analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_tool_call_session_idx
ON parlant_event (tool_call_id, session_id, created_at DESC)
WHERE tool_call_id IS NOT NULL;

-- Journey transition tracking - conversational flow analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_journey_state_session_idx
ON parlant_event (journey_id, state_id, session_id, created_at DESC)
WHERE journey_id IS NOT NULL;

-- Time-based event analysis - activity monitoring and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_created_at_type_idx
ON parlant_event (created_at DESC, event_type, session_id);

-- Batch event processing - efficient bulk operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_created_at_idx
ON parlant_event (session_id, created_at DESC);

-- ============================================================================
-- ENHANCED GUIDELINE PERFORMANCE INDEXES
-- ============================================================================

-- Agent guideline execution - priority-based matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_agent_enabled_priority_idx
ON parlant_guideline (agent_id, enabled, priority DESC, match_count DESC)
WHERE enabled = true;

-- Guideline usage analytics - effectiveness tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_agent_match_count_idx
ON parlant_guideline (agent_id, match_count DESC, enabled, last_matched_at DESC)
WHERE enabled = true;

-- Recent guideline activity - performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_agent_last_matched_idx
ON parlant_guideline (agent_id, last_matched_at DESC, enabled, priority DESC)
WHERE last_matched_at IS NOT NULL;

-- Guideline maintenance - priority and usage optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_enabled_priority_updated_idx
ON parlant_guideline (enabled, priority DESC, updated_at DESC);

-- ============================================================================
-- ENHANCED JOURNEY PERFORMANCE INDEXES
-- ============================================================================

-- Agent journey management - active journey discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_agent_enabled_completion_idx
ON parlant_journey (agent_id, enabled, completion_rate DESC, total_sessions DESC)
WHERE enabled = true;

-- Journey usage analytics - performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_agent_total_sessions_idx
ON parlant_journey (agent_id, total_sessions DESC, enabled, last_used_at DESC)
WHERE enabled = true;

-- Recent journey activity - monitoring and optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_agent_last_used_idx
ON parlant_journey (agent_id, last_used_at DESC, enabled, completion_rate DESC)
WHERE last_used_at IS NOT NULL;

-- ============================================================================
-- ENHANCED JOURNEY STATE PERFORMANCE INDEXES
-- ============================================================================

-- Journey state navigation - step-by-step flow
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_state_journey_type_initial_final_idx
ON parlant_journey_state (journey_id, state_type, is_initial, is_final, allow_skip);

-- State discovery and filtering - UI operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_state_journey_initial_final_idx
ON parlant_journey_state (journey_id, is_initial, is_final, created_at DESC);

-- ============================================================================
-- ENHANCED JOURNEY TRANSITION PERFORMANCE INDEXES
-- ============================================================================

-- Transition execution - state navigation performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_transition_journey_from_to_priority_idx
ON parlant_journey_transition (journey_id, from_state_id, to_state_id, priority DESC);

-- Transition usage analytics - flow optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_transition_journey_use_count_idx
ON parlant_journey_transition (journey_id, use_count DESC, priority DESC, last_used_at DESC);

-- Recent transition activity - performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_transition_journey_last_used_idx
ON parlant_journey_transition (journey_id, last_used_at DESC, use_count DESC)
WHERE last_used_at IS NOT NULL;

-- ============================================================================
-- ENHANCED VARIABLE PERFORMANCE INDEXES
-- ============================================================================

-- Variable access by scope - session vs customer vs global
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_agent_scope_key_idx
ON parlant_variable (agent_id, scope, key, value_type, is_private);

-- Session variable access - real-time context retrieval
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_session_key_type_idx
ON parlant_variable (session_id, key, value_type, updated_at DESC)
WHERE session_id IS NOT NULL;

-- Variable privacy filtering - secure access control
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_agent_private_updated_idx
ON parlant_variable (agent_id, is_private, updated_at DESC, scope);

-- ============================================================================
-- ENHANCED TOOL PERFORMANCE INDEXES
-- ============================================================================

-- Workspace tool discovery - active tool listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_workspace_enabled_type_idx
ON parlant_tool (workspace_id, enabled, tool_type, success_rate DESC, use_count DESC)
WHERE enabled = true;

-- Tool usage analytics - performance and success tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_workspace_use_count_success_idx
ON parlant_tool (workspace_id, use_count DESC, success_rate DESC, enabled, last_used_at DESC)
WHERE enabled = true;

-- Public tool discovery - cross-workspace tool sharing
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_enabled_public_last_used_idx
ON parlant_tool (enabled, is_public, last_used_at DESC, success_rate DESC)
WHERE enabled = true AND is_public = true;

-- Sim tool integration - native tool mapping
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_workspace_sim_tool_idx
ON parlant_tool (workspace_id, sim_tool_id, enabled, tool_type)
WHERE sim_tool_id IS NOT NULL;

-- Tool rate limiting and auth - access control optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_workspace_rate_limit_idx
ON parlant_tool (workspace_id, rate_limit_per_minute DESC, requires_auth, enabled)
WHERE enabled = true;

-- ============================================================================
-- ENHANCED TERM PERFORMANCE INDEXES
-- ============================================================================

-- Term importance and categorization - knowledge base optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_term_agent_importance_category_idx
ON parlant_term (agent_id, importance DESC, category, updated_at DESC);

-- Term maintenance - content management
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_term_agent_updated_idx
ON parlant_term (agent_id, updated_at DESC, importance DESC, category);

-- ============================================================================
-- ENHANCED CANNED RESPONSE PERFORMANCE INDEXES
-- ============================================================================

-- Response matching - priority-based template selection
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_canned_response_agent_enabled_priority_match_idx
ON parlant_canned_response (agent_id, enabled, priority DESC, requires_exact_match, use_count DESC)
WHERE enabled = true;

-- Response usage analytics - template effectiveness
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_canned_response_agent_use_count_last_used_idx
ON parlant_canned_response (agent_id, use_count DESC, last_used_at DESC, enabled)
WHERE enabled = true;

-- Category-based response organization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_canned_response_agent_category_enabled_idx
ON parlant_canned_response (agent_id, category, enabled, priority DESC, use_count DESC)
WHERE enabled = true;

-- ============================================================================
-- JUNCTION TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Agent-Tool relationship performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_tool_performance_idx
ON parlant_agent_tool (agent_id, enabled, priority DESC, use_count DESC, last_used_at DESC)
WHERE enabled = true;

-- Journey-Guideline relationship performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_guideline_performance_idx
ON parlant_journey_guideline (journey_id, enabled, priority_override DESC, match_count DESC)
WHERE enabled = true;

-- Agent-Knowledge Base relationship performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_kb_performance_idx
ON parlant_agent_knowledge_base (agent_id, enabled, priority DESC, search_count DESC)
WHERE enabled = true;

-- Tool Integration performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_integration_performance_idx
ON parlant_tool_integration (parlant_tool_id, enabled, health_status, integration_type)
WHERE enabled = true;

-- Workspace integration performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workflow_performance_idx
ON parlant_agent_workflow (agent_id, enabled, integration_type, trigger_count DESC)
WHERE enabled = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_api_key_performance_idx
ON parlant_agent_api_key (agent_id, enabled, purpose, priority DESC, use_count DESC)
WHERE enabled = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workflow_performance_idx
ON parlant_session_workflow (session_id, status, started_at DESC, workflow_id);

-- ============================================================================
-- WORKSPACE ISOLATION SECURITY INDEXES
-- ============================================================================

-- Workspace-scoped agent operations - security boundary enforcement
CREATE INDEX CONCURRENTLY IF NOT EXISTS workspace_agent_security_isolation_idx
ON parlant_agent (workspace_id, id, status, deleted_at)
WHERE deleted_at IS NULL;

-- Workspace-scoped session operations - multi-tenant isolation
CREATE INDEX CONCURRENTLY IF NOT EXISTS workspace_session_security_isolation_idx
ON parlant_session (workspace_id, id, agent_id, status);

-- Workspace tool isolation - secure tool access
CREATE INDEX CONCURRENTLY IF NOT EXISTS workspace_tool_security_isolation_idx
ON parlant_tool (workspace_id, id, enabled, is_public);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON JOIN PATTERNS
-- ============================================================================

-- Agent-Session join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_session_join_optimization_idx
ON parlant_agent (workspace_id, id, status, last_active_at DESC)
WHERE status = 'active' AND deleted_at IS NULL;

-- Session-Event join optimization (complement to existing event indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_event_join_optimization_idx
ON parlant_session (id, agent_id, workspace_id, last_activity_at DESC, status);

-- Journey-State-Transition join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_state_transition_join_idx
ON parlant_journey (id, agent_id, enabled, total_sessions DESC)
WHERE enabled = true;

-- ============================================================================
-- GIN INDEXES FOR JSONB COLUMNS
-- ============================================================================

-- Agent configuration search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_custom_config_gin_idx
ON parlant_agent USING gin (custom_config)
WHERE custom_config IS NOT NULL;

-- Session metadata search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_metadata_gin_idx
ON parlant_session USING gin (metadata)
WHERE metadata != '{}'::jsonb;

-- Session variables search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_variables_gin_idx
ON parlant_session USING gin (variables)
WHERE variables != '{}'::jsonb;

-- Event content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_content_gin_idx
ON parlant_event USING gin (content);

-- Tool parameters and error handling search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_parameters_gin_idx
ON parlant_tool USING gin (parameters);

CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_error_handling_gin_idx
ON parlant_tool USING gin (error_handling)
WHERE error_handling != '{}'::jsonb;

-- Variable values search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_value_gin_idx
ON parlant_variable USING gin (value);

-- ============================================================================
-- TEXT SEARCH INDEXES FOR CONTENT FIELDS
-- ============================================================================

-- Agent text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_text_search_idx
ON parlant_agent USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system_prompt, '')));

-- Guideline text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_text_search_idx
ON parlant_guideline USING gin (to_tsvector('english', coalesce(condition, '') || ' ' || coalesce(action, '')));

-- Journey text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_text_search_idx
ON parlant_journey USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Tool text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_text_search_idx
ON parlant_tool USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(usage_guidelines, '')));

-- Term text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_term_text_search_idx
ON parlant_term USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Canned response text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_canned_response_text_search_idx
ON parlant_canned_response USING gin (to_tsvector('english', coalesce(template, '') || ' ' || coalesce(category, '')));

-- ============================================================================
-- MAINTENANCE AND MONITORING
-- ============================================================================

-- Create table for tracking index usage and performance
CREATE TABLE IF NOT EXISTS parlant_index_usage_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    index_name text NOT NULL,
    table_name text NOT NULL,
    scans_count bigint NOT NULL,
    tuples_read bigint NOT NULL,
    tuples_fetched bigint NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamp DEFAULT NOW()
);

CREATE INDEX parlant_index_usage_log_created_at_idx
ON parlant_index_usage_log (created_at DESC);

-- Function to log index usage statistics
CREATE OR REPLACE FUNCTION log_parlant_index_usage()
RETURNS void AS $$
BEGIN
    INSERT INTO parlant_index_usage_log (
        index_name, table_name, scans_count, tuples_read, tuples_fetched, size_bytes
    )
    SELECT
        indexname,
        tablename,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_relation_size(indexrelid)
    FROM pg_stat_user_indexes
    WHERE tablename LIKE 'parlant_%';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINTS AND VALIDATION
-- ============================================================================

-- Add check constraint for workspace consistency in sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'session_agent_workspace_consistency'
    ) THEN
        ALTER TABLE parlant_session
        ADD CONSTRAINT session_agent_workspace_consistency
        CHECK (
            workspace_id = (
                SELECT workspace_id
                FROM parlant_agent
                WHERE id = parlant_session.agent_id
            )
        );
    END IF;
END $$;

-- ============================================================================
-- FINALIZATION
-- ============================================================================

-- Update table statistics after index creation
ANALYZE parlant_agent;
ANALYZE parlant_session;
ANALYZE parlant_event;
ANALYZE parlant_guideline;
ANALYZE parlant_journey;
ANALYZE parlant_journey_state;
ANALYZE parlant_journey_transition;
ANALYZE parlant_variable;
ANALYZE parlant_tool;
ANALYZE parlant_term;
ANALYZE parlant_canned_response;
ANALYZE parlant_agent_tool;
ANALYZE parlant_journey_guideline;
ANALYZE parlant_agent_knowledge_base;
ANALYZE parlant_tool_integration;
ANALYZE parlant_agent_workflow;
ANALYZE parlant_agent_api_key;
ANALYZE parlant_session_workflow;

-- Reset maintenance_work_mem to default
RESET maintenance_work_mem;

-- Log completion
INSERT INTO parlant_index_usage_log (index_name, table_name, scans_count, tuples_read, tuples_fetched, size_bytes)
VALUES ('MIGRATION_COMPLETE', 'ALL_PARLANT_TABLES', 0, 0, 0, 0);

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

/*
-- Verify all indexes were created successfully
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'parlant_%'
    AND indexname LIKE '%performance%' OR indexname LIKE '%security%'
ORDER BY tablename, indexname;

-- Check index sizes and usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename LIKE 'parlant_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verify workspace isolation constraints
SELECT
    conname,
    contype,
    conkey,
    confkey,
    consrc
FROM pg_constraint
WHERE conname LIKE '%workspace%';
*/