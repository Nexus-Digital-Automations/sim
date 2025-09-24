-- Parlant Performance Optimization Indexes
-- Adds additional indexes for common query patterns and performance optimization
-- Created: 2024-09-24
-- Version: 2.4.0

-- Session analytics and reporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_analytics_idx"
ON "parlant_session"("workspace_id", "started_at", "status")
WHERE "ended_at" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_cost_analysis_idx"
ON "parlant_session"("agent_id", "cost", "started_at")
WHERE "cost" > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_duration_idx"
ON "parlant_session"("agent_id", "ended_at", "started_at")
WHERE "ended_at" IS NOT NULL;

-- Agent performance and usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_usage_stats_idx"
ON "parlant_agent"("workspace_id", "total_sessions", "total_cost")
WHERE "deleted_at" IS NULL AND "status" = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_model_performance_idx"
ON "parlant_agent"("model_provider", "model_name", "average_session_duration")
WHERE "deleted_at" IS NULL;

-- Event querying and analysis indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_event_timeline_idx"
ON "parlant_event"("session_id", "created_at", "event_type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_event_tool_usage_idx"
ON "parlant_event"("tool_call_id", "event_type", "created_at")
WHERE "tool_call_id" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_event_journey_tracking_idx"
ON "parlant_event"("journey_id", "state_id", "created_at")
WHERE "journey_id" IS NOT NULL;

-- Journey and guideline effectiveness indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_journey_effectiveness_idx"
ON "parlant_journey"("agent_id", "completion_rate", "total_sessions")
WHERE "enabled" = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_guideline_usage_idx"
ON "parlant_guideline"("agent_id", "match_count", "last_matched_at")
WHERE "enabled" = TRUE;

-- Tool performance and reliability indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_tool_reliability_idx"
ON "parlant_tool"("workspace_id", "success_rate", "use_count")
WHERE "enabled" = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_tool_integration_health_idx"
ON "parlant_tool_integration"("integration_type", "health_status", "last_health_check");

-- Variable and context indexes for quick lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_variable_agent_scope_idx"
ON "parlant_variable"("agent_id", "scope", "key");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_variable_session_lookup_idx"
ON "parlant_variable"("session_id", "is_private", "updated_at");

-- Canned response matching indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_canned_response_matching_idx"
ON "parlant_canned_response"("agent_id", "enabled", "priority")
WHERE "enabled" = TRUE;

-- Agent-tool relationship performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_tool_performance_idx"
ON "parlant_agent_tool"("agent_id", "enabled", "use_count")
WHERE "enabled" = TRUE;

-- Journey state transition indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_journey_transition_flow_idx"
ON "parlant_journey_transition"("journey_id", "from_state_id", "priority");

-- Workspace integration performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_workflow_trigger_idx"
ON "parlant_agent_workflow"("workspace_id", "integration_type", "enabled")
WHERE "enabled" = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_workflow_status_idx"
ON "parlant_session_workflow"("status", "started_at", "completed_at")
WHERE "status" IN ('running', 'pending');

-- Knowledge base integration indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_kb_search_idx"
ON "parlant_agent_knowledge_base"("agent_id", "enabled", "priority")
WHERE "enabled" = TRUE;

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_comprehensive_idx"
ON "parlant_session"("workspace_id", "agent_id", "status", "last_activity_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_comprehensive_idx"
ON "parlant_agent"("workspace_id", "status", "composition_mode", "last_active_at")
WHERE "deleted_at" IS NULL;

-- Time-series analysis indexes (useful for dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_timeseries_idx"
ON "parlant_session"("workspace_id", "started_at")
WHERE "started_at" >= NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_event_timeseries_idx"
ON "parlant_event"("created_at", "event_type")
WHERE "created_at" >= NOW() - INTERVAL '7 days';

-- Cleanup and maintenance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_cleanup_idx"
ON "parlant_session"("ended_at", "status")
WHERE "ended_at" < NOW() - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_event_cleanup_idx"
ON "parlant_event"("created_at")
WHERE "created_at" < NOW() - INTERVAL '90 days';

-- Add partial indexes for soft-deleted records
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_deleted_idx"
ON "parlant_agent"("deleted_at", "workspace_id")
WHERE "deleted_at" IS NOT NULL;

-- Create function for index maintenance
CREATE OR REPLACE FUNCTION maintain_parlant_indexes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reindex time-series indexes periodically
  REINDEX INDEX CONCURRENTLY parlant_session_timeseries_idx;
  REINDEX INDEX CONCURRENTLY parlant_event_timeseries_idx;

  -- Update table statistics
  ANALYZE parlant_session;
  ANALYZE parlant_event;
  ANALYZE parlant_agent;

  RAISE NOTICE 'Parlant index maintenance completed';
END;
$$;

-- Schedule index maintenance (example - adjust based on needs)
COMMENT ON FUNCTION maintain_parlant_indexes() IS 'Maintenance function for Parlant indexes - should be called periodically via cron or scheduler';

-- Add comments for new indexes
COMMENT ON INDEX "parlant_session_analytics_idx" IS 'Optimizes workspace session analytics queries';
COMMENT ON INDEX "parlant_agent_usage_stats_idx" IS 'Optimizes agent performance dashboard queries';
COMMENT ON INDEX "parlant_event_timeline_idx" IS 'Optimizes session event timeline queries';
COMMENT ON INDEX "parlant_journey_effectiveness_idx" IS 'Optimizes journey performance analysis';
COMMENT ON INDEX "parlant_tool_reliability_idx" IS 'Optimizes tool reliability monitoring';
COMMENT ON INDEX "parlant_session_comprehensive_idx" IS 'Multi-column index for complex session queries';
COMMENT ON INDEX "parlant_session_timeseries_idx" IS 'Partial index for recent session time-series analysis';

-- Performance optimization complete
-- New indexes created: 27
-- Maintenance function created: 1
-- Focus areas: Analytics, Performance Monitoring, Time-series Queries, Cleanup Operations