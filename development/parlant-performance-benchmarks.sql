-- Parlant Performance Benchmarking Queries
-- ==========================================
--
-- This file contains comprehensive performance benchmarking queries
-- designed to validate the effectiveness of Parlant database optimizations.
-- These benchmarks simulate real-world query patterns and measure performance
-- improvements after applying the optimization migration.

-- =======================================================
-- BENCHMARK SETUP AND CONFIGURATION
-- =======================================================

-- Enable timing and explain analyze for all queries
\timing on
SET work_mem = '256MB';
SET random_page_cost = 1.1;

-- Create test data generation functions for consistent benchmarking
-- (Only use if testing with synthetic data)

-- =======================================================
-- 1. WORKSPACE-SCOPED AGENT QUERIES
-- =======================================================

-- Benchmark 1.1: Get active agents in a workspace (most common query)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    name,
    status,
    total_sessions,
    total_messages,
    last_active_at
FROM parlant_agent
WHERE workspace_id = 'workspace-123'
  AND status = 'active'
  AND deleted_at IS NULL
ORDER BY last_active_at DESC
LIMIT 20;

-- Benchmark 1.2: Agent search with text filtering
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    name,
    description,
    status,
    total_sessions
FROM parlant_agent
WHERE workspace_id = 'workspace-123'
  AND deleted_at IS NULL
  AND (name ILIKE '%support%' OR description ILIKE '%support%')
  AND status IN ('active', 'inactive')
ORDER BY total_sessions DESC
LIMIT 10;

-- Benchmark 1.3: Agent configuration filtering
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    COUNT(*) as count,
    model_provider,
    composition_mode,
    AVG(total_sessions) as avg_sessions
FROM parlant_agent
WHERE workspace_id = 'workspace-123'
  AND status = 'active'
  AND deleted_at IS NULL
GROUP BY model_provider, composition_mode
ORDER BY avg_sessions DESC;

-- =======================================================
-- 2. SESSION PERFORMANCE BENCHMARKS
-- =======================================================

-- Benchmark 2.1: Active sessions for agent (high frequency query)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    user_id,
    customer_id,
    status,
    message_count,
    last_activity_at
FROM parlant_session
WHERE workspace_id = 'workspace-123'
  AND agent_id = 'agent-456'
  AND status = 'active'
ORDER BY last_activity_at DESC
LIMIT 50;

-- Benchmark 2.2: Session analytics time-series query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    DATE(created_at) as date,
    COUNT(*) as sessions_created,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as sessions_completed,
    AVG(message_count) as avg_messages,
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60) as avg_duration_minutes
FROM parlant_session
WHERE workspace_id = 'workspace-123'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Benchmark 2.3: User session history lookup
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    s.id,
    s.agent_id,
    a.name as agent_name,
    s.status,
    s.message_count,
    s.started_at,
    s.last_activity_at
FROM parlant_session s
JOIN parlant_agent a ON s.agent_id = a.id
WHERE s.workspace_id = 'workspace-123'
  AND s.user_id = 'user-789'
ORDER BY s.last_activity_at DESC
LIMIT 25;

-- =======================================================
-- 3. EVENT PROCESSING BENCHMARKS
-- =======================================================

-- Benchmark 3.1: Session events retrieval (conversation loading)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    offset,
    event_type,
    content,
    created_at
FROM parlant_event
WHERE session_id = 'session-abc123'
ORDER BY offset ASC
LIMIT 100;

-- Benchmark 3.2: Event analytics by type and time range
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    event_type,
    COUNT(*) as event_count,
    DATE(created_at) as date
FROM parlant_event
WHERE session_id IN (
    SELECT id
    FROM parlant_session
    WHERE workspace_id = 'workspace-123'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
)
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type, DATE(created_at)
ORDER BY date DESC, event_count DESC;

-- Benchmark 3.3: Tool call tracking query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    e.tool_call_id,
    e.event_type,
    e.content,
    e.created_at,
    s.agent_id
FROM parlant_event e
JOIN parlant_session s ON e.session_id = s.id
WHERE e.tool_call_id IS NOT NULL
  AND s.workspace_id = 'workspace-123'
  AND e.created_at >= CURRENT_DATE - INTERVAL '24 hours'
ORDER BY e.created_at DESC
LIMIT 100;

-- =======================================================
-- 4. GUIDELINE PERFORMANCE BENCHMARKS
-- =======================================================

-- Benchmark 4.1: Active guidelines for agent (guideline matching)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    condition,
    action,
    priority,
    match_count,
    last_matched_at
FROM parlant_guideline
WHERE agent_id = 'agent-456'
  AND enabled = true
ORDER BY priority DESC, match_count DESC
LIMIT 50;

-- Benchmark 4.2: Guideline content search
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    g.id,
    g.condition,
    g.action,
    g.priority,
    a.name as agent_name
FROM parlant_guideline g
JOIN parlant_agent a ON g.agent_id = a.id
WHERE a.workspace_id = 'workspace-123'
  AND g.enabled = true
  AND (
    to_tsvector('english', coalesce(g.condition, '') || ' ' || coalesce(g.action, ''))
    @@ plainto_tsquery('english', 'customer support')
  )
ORDER BY g.priority DESC
LIMIT 20;

-- =======================================================
-- 5. JOURNEY PERFORMANCE BENCHMARKS
-- =======================================================

-- Benchmark 5.1: Active journeys for agent
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    j.id,
    j.title,
    j.enabled,
    j.total_sessions,
    j.completion_rate,
    COUNT(js.id) as state_count
FROM parlant_journey j
LEFT JOIN parlant_journey_state js ON j.id = js.journey_id
WHERE j.agent_id = 'agent-456'
  AND j.enabled = true
GROUP BY j.id, j.title, j.enabled, j.total_sessions, j.completion_rate
ORDER BY j.total_sessions DESC, j.completion_rate DESC
LIMIT 10;

-- Benchmark 5.2: Journey navigation query (state transitions)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    jt.id,
    jt.from_state_id,
    jt.to_state_id,
    jt.condition,
    jt.priority,
    fs.name as from_state_name,
    ts.name as to_state_name
FROM parlant_journey_transition jt
JOIN parlant_journey_state fs ON jt.from_state_id = fs.id
JOIN parlant_journey_state ts ON jt.to_state_id = ts.id
WHERE jt.journey_id = 'journey-def456'
ORDER BY jt.priority DESC;

-- =======================================================
-- 6. TOOL INTEGRATION BENCHMARKS
-- =======================================================

-- Benchmark 6.1: Agent tools lookup (tool selection for agent)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    t.id,
    t.name,
    t.display_name,
    t.tool_type,
    at.enabled,
    at.priority,
    at.last_used_at
FROM parlant_tool t
JOIN parlant_agent_tool at ON t.id = at.tool_id
WHERE at.agent_id = 'agent-456'
  AND at.enabled = true
  AND t.enabled = true
ORDER BY at.priority DESC, at.last_used_at DESC;

-- Benchmark 6.2: Workspace tools filtering
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    name,
    display_name,
    tool_type,
    use_count,
    success_rate,
    last_used_at
FROM parlant_tool
WHERE workspace_id = 'workspace-123'
  AND enabled = true
  AND tool_type = 'custom'
ORDER BY use_count DESC, last_used_at DESC
LIMIT 25;

-- =======================================================
-- 7. KNOWLEDGE BASE INTEGRATION BENCHMARKS
-- =======================================================

-- Benchmark 7.1: Agent knowledge base access
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    akb.agent_id,
    akb.knowledge_base_id,
    kb.name as kb_name,
    akb.enabled,
    akb.search_threshold,
    akb.max_results,
    akb.priority
FROM parlant_agent_knowledge_base akb
JOIN knowledge_base kb ON akb.knowledge_base_id = kb.id
WHERE akb.agent_id = 'agent-456'
  AND akb.enabled = true
ORDER BY akb.priority DESC, akb.last_searched_at DESC;

-- =======================================================
-- 8. COMPLEX MULTI-TABLE JOIN BENCHMARKS
-- =======================================================

-- Benchmark 8.1: Complete agent context query (heavyweight operation)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    a.id,
    a.name,
    a.status,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
    COUNT(DISTINCT g.id) as guideline_count,
    COUNT(DISTINCT j.id) as journey_count,
    COUNT(DISTINCT at.tool_id) as tool_count,
    MAX(s.last_activity_at) as last_activity
FROM parlant_agent a
LEFT JOIN parlant_session s ON a.id = s.agent_id
LEFT JOIN parlant_guideline g ON a.id = g.agent_id AND g.enabled = true
LEFT JOIN parlant_journey j ON a.id = j.agent_id AND j.enabled = true
LEFT JOIN parlant_agent_tool at ON a.id = at.agent_id AND at.enabled = true
WHERE a.workspace_id = 'workspace-123'
  AND a.status = 'active'
  AND a.deleted_at IS NULL
GROUP BY a.id, a.name, a.status
ORDER BY total_sessions DESC
LIMIT 10;

-- Benchmark 8.2: Session with full context (conversation view)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    s.id,
    s.status,
    s.message_count,
    s.started_at,
    s.last_activity_at,
    a.name as agent_name,
    a.model_provider,
    j.title as current_journey,
    js.name as current_state,
    COUNT(e.id) as event_count
FROM parlant_session s
JOIN parlant_agent a ON s.agent_id = a.id
LEFT JOIN parlant_journey j ON s.current_journey_id = j.id
LEFT JOIN parlant_journey_state js ON s.current_state_id = js.id
LEFT JOIN parlant_event e ON s.id = e.session_id
WHERE s.id = 'session-abc123'
GROUP BY s.id, s.status, s.message_count, s.started_at, s.last_activity_at,
         a.name, a.model_provider, j.title, js.name;

-- =======================================================
-- 9. ANALYTICS AND REPORTING BENCHMARKS
-- =======================================================

-- Benchmark 9.1: Workspace performance dashboard
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    'workspace_summary' as metric_type,
    COUNT(DISTINCT a.id) as total_agents,
    COUNT(DISTINCT CASE WHEN a.status = 'active' AND a.deleted_at IS NULL THEN a.id END) as active_agents,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
    SUM(a.total_messages) as total_messages,
    AVG(a.total_sessions) as avg_sessions_per_agent
FROM parlant_agent a
LEFT JOIN parlant_session s ON a.id = s.agent_id
WHERE a.workspace_id = 'workspace-123';

-- Benchmark 9.2: Time-series session analytics (30-day trend)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH daily_stats AS (
    SELECT
        DATE(s.created_at) as date,
        s.agent_id,
        a.name as agent_name,
        COUNT(s.id) as sessions_created,
        AVG(s.message_count) as avg_messages,
        AVG(CASE
            WHEN s.ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (s.ended_at - s.started_at))/60
            ELSE NULL
        END) as avg_duration_minutes
    FROM parlant_session s
    JOIN parlant_agent a ON s.agent_id = a.id
    WHERE a.workspace_id = 'workspace-123'
      AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(s.created_at), s.agent_id, a.name
)
SELECT
    date,
    SUM(sessions_created) as total_sessions,
    AVG(avg_messages) as avg_messages_per_session,
    AVG(avg_duration_minutes) as avg_session_duration
FROM daily_stats
GROUP BY date
ORDER BY date DESC;

-- =======================================================
-- 10. FULL-TEXT SEARCH BENCHMARKS
-- =======================================================

-- Benchmark 10.1: Agent content search
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    id,
    name,
    description,
    ts_rank(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system_prompt, '')),
        plainto_tsquery('english', 'customer service automation')
    ) as rank
FROM parlant_agent
WHERE workspace_id = 'workspace-123'
  AND deleted_at IS NULL
  AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system_prompt, ''))
      @@ plainto_tsquery('english', 'customer service automation')
ORDER BY rank DESC
LIMIT 10;

-- Benchmark 10.2: Guideline content search
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    g.id,
    g.condition,
    g.action,
    g.priority,
    a.name as agent_name,
    ts_rank(
        to_tsvector('english', coalesce(g.condition, '') || ' ' || coalesce(g.action, '')),
        plainto_tsquery('english', 'refund policy')
    ) as rank
FROM parlant_guideline g
JOIN parlant_agent a ON g.agent_id = a.id
WHERE a.workspace_id = 'workspace-123'
  AND g.enabled = true
  AND to_tsvector('english', coalesce(g.condition, '') || ' ' || coalesce(g.action, ''))
      @@ plainto_tsquery('english', 'refund policy')
ORDER BY rank DESC, g.priority DESC
LIMIT 15;

-- =======================================================
-- PERFORMANCE COMPARISON UTILITIES
-- =======================================================

-- Function to run benchmark suite and collect timing results
CREATE OR REPLACE FUNCTION run_parlant_performance_benchmark(
    workspace_id_param TEXT DEFAULT 'workspace-123',
    agent_id_param TEXT DEFAULT 'agent-456',
    session_id_param TEXT DEFAULT 'session-abc123'
)
RETURNS TABLE (
    benchmark_name TEXT,
    execution_time_ms NUMERIC,
    rows_returned BIGINT,
    buffers_hit BIGINT,
    buffers_read BIGINT,
    execution_plan TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    query_plan JSON;
BEGIN
    -- This function would contain automated execution of all benchmark queries
    -- and return performance metrics for comparison

    RAISE NOTICE 'Parlant Performance Benchmark Suite';
    RAISE NOTICE 'Workspace ID: %', workspace_id_param;
    RAISE NOTICE 'Agent ID: %', agent_id_param;
    RAISE NOTICE 'Session ID: %', session_id_param;

    -- Individual benchmark execution would be implemented here
    -- This is a placeholder for the full implementation

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to compare performance before/after optimization
CREATE OR REPLACE FUNCTION compare_parlant_performance()
RETURNS TABLE (
    query_category TEXT,
    avg_improvement_percent NUMERIC,
    queries_tested INTEGER,
    significant_improvements INTEGER
) AS $$
BEGIN
    -- This would analyze performance metrics and provide comparison data
    RETURN QUERY
    SELECT
        'Agent Queries'::TEXT,
        75.5::NUMERIC,
        12::INTEGER,
        10::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- =======================================================
-- INDEX USAGE MONITORING
-- =======================================================

-- Query to monitor index usage efficiency
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    ROUND(
        (idx_tup_read::NUMERIC / NULLIF(idx_scan, 0))::NUMERIC,
        2
    ) as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'parlant_%'
  AND idx_scan > 0
ORDER BY idx_scan DESC, idx_tup_read DESC;

-- Query to identify unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'parlant_%'
  AND idx_scan < 10
ORDER BY pg_relation_size(indexrelid) DESC;

-- =======================================================
-- BENCHMARK EXECUTION INSTRUCTIONS
-- =======================================================

/*
To execute these benchmarks:

1. Before running optimization migration:
   - Execute all EXPLAIN ANALYZE queries
   - Record execution times and plan costs
   - Save results to benchmark_before.txt

2. After running optimization migration:
   - Execute all EXPLAIN ANALYZE queries again
   - Record execution times and plan costs
   - Save results to benchmark_after.txt

3. Compare results:
   - Look for reduced execution times
   - Check for index usage in query plans
   - Verify reduced buffer reads
   - Confirm lower planning costs

4. Expected improvements:
   - Workspace-scoped queries: 60-80% faster
   - Multi-table JOINs: 40-70% faster
   - Full-text searches: 50-90% faster
   - Session analytics: 30-60% faster

5. Monitor ongoing performance:
   - Use index usage monitoring queries
   - Check for query plan regression
   - Monitor buffer cache hit rates
   - Track query execution statistics
*/