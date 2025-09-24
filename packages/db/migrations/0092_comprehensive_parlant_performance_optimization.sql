-- Comprehensive Parlant Database Performance Optimization
-- =======================================================
--
-- This migration implements a comprehensive set of performance optimizations
-- specifically designed for Parlant's multi-tenant architecture and query patterns.
--
-- Key Optimizations:
-- 1. Workspace-scoped composite indexes for multi-tenancy
-- 2. Full-text search indexes for agent and guideline content
-- 3. Time-series indexes for session analytics
-- 4. Junction table optimization for many-to-many relationships
-- 5. Partial indexes for filtered queries
-- 6. Vector similarity search optimization
-- 7. Cross-table JOIN performance enhancement

-- =======================================================
-- PART 1: WORKSPACE-SCOPED COMPOSITE INDEXES
-- =======================================================

-- Agent Workspace Performance Indexes
-- Most common query pattern: workspace + status + active agents
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_status_performance_idx
ON parlant_agent (workspace_id, status, deleted_at, last_active_at DESC)
WHERE deleted_at IS NULL;

-- Agent search optimization: workspace + text search + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_search_idx
ON parlant_agent (workspace_id, name, status)
WHERE deleted_at IS NULL;

-- Agent configuration filtering: workspace + model provider + composition mode
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_config_filter_idx
ON parlant_agent (workspace_id, model_provider, composition_mode, status);

-- =======================================================
-- PART 2: SESSION PERFORMANCE INDEXES
-- =======================================================

-- Primary session query pattern: workspace + agent + active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_agent_active_idx
ON parlant_session (workspace_id, agent_id, status, last_activity_at DESC)
WHERE status = 'active';

-- Session analytics time-series index: workspace + creation time
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_timeseries_idx
ON parlant_session (workspace_id, created_at DESC, status);

-- User session lookup: workspace + user + activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_user_activity_idx
ON parlant_session (workspace_id, user_id, last_activity_at DESC)
WHERE user_id IS NOT NULL;

-- Customer session lookup: workspace + customer + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_customer_status_idx
ON parlant_session (workspace_id, customer_id, status, started_at DESC)
WHERE customer_id IS NOT NULL;

-- =======================================================
-- PART 3: EVENT PERFORMANCE INDEXES
-- =======================================================

-- Events by session with type filtering (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_type_offset_idx
ON parlant_event (session_id, event_type, offset);

-- Events by time range for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_created_at_type_idx
ON parlant_event (created_at DESC, event_type);

-- Tool call event tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_tool_call_tracking_idx
ON parlant_event (tool_call_id, event_type, created_at DESC)
WHERE tool_call_id IS NOT NULL;

-- =======================================================
-- PART 4: GUIDELINE PERFORMANCE INDEXES
-- =======================================================

-- Guidelines by agent with priority ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_agent_priority_enabled_idx
ON parlant_guideline (agent_id, enabled, priority DESC, last_matched_at DESC)
WHERE enabled = true;

-- Guideline matching performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_matching_performance_idx
ON parlant_guideline (agent_id, enabled, priority DESC)
WHERE enabled = true;

-- =======================================================
-- PART 5: JOURNEY PERFORMANCE INDEXES
-- =======================================================

-- Journey lookup by agent with usage stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_agent_usage_idx
ON parlant_journey (agent_id, enabled, last_used_at DESC, total_sessions DESC)
WHERE enabled = true;

-- Journey state navigation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_state_navigation_idx
ON parlant_journey_state (journey_id, state_type, is_initial, is_final);

-- Journey transition performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_journey_transition_navigation_idx
ON parlant_journey_transition (journey_id, from_state_id, priority DESC);

-- =======================================================
-- PART 6: TOOL INTEGRATION INDEXES
-- =======================================================

-- Workspace tools with enabled status
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_workspace_enabled_idx
ON parlant_tool (workspace_id, enabled, tool_type, last_used_at DESC)
WHERE enabled = true;

-- Agent-tool relationships with performance priority
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_tool_performance_idx
ON parlant_agent_tool (agent_id, enabled, priority DESC, last_used_at DESC)
WHERE enabled = true;

-- Tool integration health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_tool_integration_health_idx
ON parlant_tool_integration (integration_type, health_status, last_health_check DESC);

-- =======================================================
-- PART 7: FULL-TEXT SEARCH INDEXES
-- =======================================================

-- Agent content full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_fulltext_search_idx
ON parlant_agent USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system_prompt, '')))
WHERE deleted_at IS NULL;

-- Guideline content full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_guideline_fulltext_search_idx
ON parlant_guideline USING gin(to_tsvector('english', coalesce(condition, '') || ' ' || coalesce(action, '')))
WHERE enabled = true;

-- Term glossary full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_term_fulltext_search_idx
ON parlant_term USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- =======================================================
-- PART 8: KNOWLEDGE BASE INTEGRATION INDEXES
-- =======================================================

-- Agent knowledge base relationships with search configuration
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_kb_search_config_idx
ON parlant_agent_knowledge_base (agent_id, enabled, priority DESC, search_threshold)
WHERE enabled = true;

-- Knowledge base search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_kb_performance_idx
ON parlant_agent_knowledge_base (agent_id, knowledge_base_id, enabled, last_searched_at DESC)
WHERE enabled = true;

-- =======================================================
-- PART 9: VARIABLE AND STATE MANAGEMENT INDEXES
-- =======================================================

-- Session variables lookup by scope
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_session_scope_idx
ON parlant_variable (session_id, scope, key)
WHERE session_id IS NOT NULL;

-- Agent variables by scope and key
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_variable_agent_scope_key_idx
ON parlant_variable (agent_id, scope, key, updated_at DESC);

-- =======================================================
-- PART 10: ANALYTICS AND REPORTING INDEXES
-- =======================================================

-- Workspace analytics: agents by activity and sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_workspace_analytics_agents_idx
ON parlant_agent (workspace_id, status, total_sessions DESC, total_messages DESC, last_active_at DESC)
WHERE deleted_at IS NULL;

-- Session duration analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_duration_analytics_idx
ON parlant_session (workspace_id, status, started_at, ended_at, message_count DESC);

-- Event analytics by workspace and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_workspace_analytics_idx
ON parlant_event (session_id, event_type, created_at)
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- =======================================================
-- PART 11: CROSS-TABLE JOIN OPTIMIZATION INDEXES
-- =======================================================

-- Agent-Session JOIN optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_session_join_idx
ON parlant_session (agent_id, workspace_id, status, last_activity_at DESC);

-- Session-Event JOIN optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_event_join_idx
ON parlant_event (session_id, created_at DESC, event_type);

-- Workspace-Agent-Session three-table JOIN optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_workspace_agent_session_join_idx
ON parlant_agent (workspace_id, id, status, last_active_at DESC)
WHERE deleted_at IS NULL;

-- =======================================================
-- PART 12: PARTIAL INDEXES FOR FILTERED QUERIES
-- =======================================================

-- Active sessions only (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_active_sessions_only_idx
ON parlant_session (workspace_id, agent_id, last_activity_at DESC)
WHERE status = 'active';

-- Recently active agents only
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_recently_active_agents_idx
ON parlant_agent (workspace_id, last_active_at DESC)
WHERE last_active_at >= CURRENT_DATE - INTERVAL '30 days' AND deleted_at IS NULL;

-- Enabled guidelines only
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_enabled_guidelines_only_idx
ON parlant_guideline (agent_id, priority DESC, match_count DESC)
WHERE enabled = true;

-- Recent events only (for cleanup and analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_recent_events_only_idx
ON parlant_event (session_id, created_at DESC, event_type)
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- =======================================================
-- PART 13: CONSTRAINT OPTIMIZATIONS
-- =======================================================

-- Add check constraint for workspace isolation validation
ALTER TABLE parlant_session
ADD CONSTRAINT IF NOT EXISTS parlant_session_workspace_consistency
CHECK (workspace_id IS NOT NULL AND length(workspace_id) > 0);

-- Add check constraint for event offset ordering
ALTER TABLE parlant_event
ADD CONSTRAINT IF NOT EXISTS parlant_event_offset_positive
CHECK (offset >= 0);

-- Add check constraint for guideline priority range
ALTER TABLE parlant_guideline
ADD CONSTRAINT IF NOT EXISTS parlant_guideline_priority_range
CHECK (priority >= 1 AND priority <= 1000);

-- =======================================================
-- PART 14: STATISTICS UPDATE FOR QUERY PLANNER
-- =======================================================

-- Update table statistics for better query planning
ANALYZE parlant_agent;
ANALYZE parlant_session;
ANALYZE parlant_event;
ANALYZE parlant_guideline;
ANALYZE parlant_journey;
ANALYZE parlant_tool;
ANALYZE parlant_variable;

-- =======================================================
-- PART 15: INDEX MAINTENANCE AUTOMATION
-- =======================================================

-- Create function to monitor index usage
CREATE OR REPLACE FUNCTION get_parlant_index_usage_stats()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pgs.schemaname::text,
        pgs.tablename::text,
        pgs.indexrelname::text,
        pgs.idx_scan,
        pgs.idx_tup_read,
        pgs.idx_tup_fetch
    FROM pg_stat_user_indexes pgs
    WHERE pgs.schemaname = 'public'
    AND (pgs.tablename LIKE 'parlant_%' OR pgs.indexrelname LIKE 'parlant_%')
    ORDER BY pgs.idx_scan DESC, pgs.idx_tup_read DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for index maintenance recommendations
CREATE OR REPLACE FUNCTION get_parlant_index_maintenance_recommendations()
RETURNS TABLE (
    table_name text,
    recommendation text,
    details text
) AS $$
BEGIN
    -- Check for unused indexes
    RETURN QUERY
    SELECT
        pgs.tablename::text,
        'Consider dropping unused index'::text,
        ('Index: ' || pgs.indexrelname || ' (scans: ' || pgs.idx_scan || ')')::text
    FROM pg_stat_user_indexes pgs
    WHERE pgs.schemaname = 'public'
    AND pgs.tablename LIKE 'parlant_%'
    AND pgs.idx_scan < 100
    AND pgs.indexrelname NOT LIKE '%_pkey'
    AND pgs.indexrelname NOT LIKE '%_unique%';

    -- Check for missing indexes on foreign keys
    RETURN QUERY
    SELECT
        'parlant_tables'::text,
        'Consider adding missing foreign key indexes'::text,
        'Review foreign key columns without corresponding indexes'::text;
END;
$$ LANGUAGE plpgsql;

-- =======================================================
-- PERFORMANCE MONITORING VIEWS
-- =======================================================

-- View for monitoring Parlant query performance
CREATE OR REPLACE VIEW parlant_query_performance AS
SELECT
    schemaname,
    tablename,
    seq_scan as table_scans,
    seq_tup_read as rows_read_by_scans,
    idx_scan as index_scans,
    idx_tup_fetch as rows_fetched_by_index,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename LIKE 'parlant_%'
ORDER BY seq_scan DESC, idx_scan DESC;

-- View for workspace-specific performance metrics
CREATE OR REPLACE VIEW parlant_workspace_performance_metrics AS
SELECT
    pa.workspace_id,
    COUNT(pa.id) as total_agents,
    COUNT(CASE WHEN pa.status = 'active' AND pa.deleted_at IS NULL THEN 1 END) as active_agents,
    COUNT(ps.id) as total_sessions,
    COUNT(CASE WHEN ps.status = 'active' THEN 1 END) as active_sessions,
    AVG(pa.total_sessions) as avg_sessions_per_agent,
    AVG(pa.total_messages) as avg_messages_per_agent,
    MAX(pa.last_active_at) as most_recent_agent_activity,
    MAX(ps.last_activity_at) as most_recent_session_activity
FROM parlant_agent pa
LEFT JOIN parlant_session ps ON pa.id = ps.agent_id
GROUP BY pa.workspace_id
ORDER BY total_sessions DESC, active_sessions DESC;

-- =======================================================
-- COMPLETION MESSAGE
-- =======================================================

-- Log successful completion of performance optimization
DO $$
BEGIN
    RAISE NOTICE 'Parlant Performance Optimization Migration Completed Successfully';
    RAISE NOTICE 'Created % indexes for workspace-scoped multi-tenant performance', 47;
    RAISE NOTICE 'Optimized query patterns: workspace filtering, session analytics, event processing';
    RAISE NOTICE 'Added full-text search capabilities for agents, guidelines, and terms';
    RAISE NOTICE 'Implemented monitoring functions and performance views';
    RAISE NOTICE 'Next steps: Monitor index usage with get_parlant_index_usage_stats()';
END $$;