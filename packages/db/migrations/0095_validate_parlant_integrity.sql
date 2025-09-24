-- Parlant Schema Integrity Validation
-- Validates all foreign key relationships and data integrity constraints
-- Created: 2024-09-24
-- Version: 2.3.0

-- This migration performs validation checks to ensure data integrity
-- It can be run safely after the main Parlant migrations

-- Validate foreign key constraints exist and are properly named
DO $$
BEGIN
  -- Check that all expected foreign key constraints exist
  ASSERT (SELECT COUNT(*) FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY' AND table_name LIKE 'parlant_%') >= 25,
    'Missing foreign key constraints on Parlant tables';

  -- Check that all Parlant tables have proper workspace scoping
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name IN ('parlant_agent', 'parlant_session', 'parlant_tool')
          AND column_name = 'workspace_id') = 3,
    'Missing workspace_id columns for multi-tenancy';

  -- Check that all tables have created_at and updated_at timestamps
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name LIKE 'parlant_%'
          AND column_name IN ('created_at', 'updated_at')
          AND is_nullable = 'NO') >= 30,
    'Missing required timestamp columns';

  RAISE NOTICE 'Parlant schema integrity validation passed';
END
$$;

-- Add additional integrity constraints for data quality

-- Ensure agent names are meaningful (not empty strings)
ALTER TABLE "parlant_agent"
ADD CONSTRAINT "parlant_agent_name_not_empty"
CHECK (LENGTH(TRIM("name")) > 0);

-- Ensure session message and event counts are consistent
ALTER TABLE "parlant_session"
ADD CONSTRAINT "parlant_session_counts_non_negative"
CHECK ("event_count" >= 0 AND "message_count" >= 0);

-- Ensure journey states have valid state types
ALTER TABLE "parlant_journey_state"
ADD CONSTRAINT "parlant_journey_state_content_required"
CHECK (
  (state_type = 'chat' AND chat_prompt IS NOT NULL) OR
  (state_type = 'tool' AND tool_id IS NOT NULL) OR
  (state_type = 'decision' AND condition IS NOT NULL) OR
  (state_type = 'final')
);

-- Ensure guideline priorities are reasonable
ALTER TABLE "parlant_guideline"
ADD CONSTRAINT "parlant_guideline_priority_range"
CHECK ("priority" >= 0 AND "priority" <= 1000);

-- Ensure tool success rates are valid percentages
ALTER TABLE "parlant_tool"
ADD CONSTRAINT "parlant_tool_success_rate_valid"
CHECK ("success_rate" IS NULL OR ("success_rate" >= 0 AND "success_rate" <= 100));

-- Ensure variable values are not null (empty objects/arrays are ok)
ALTER TABLE "parlant_variable"
ADD CONSTRAINT "parlant_variable_value_not_null"
CHECK ("value" IS NOT NULL);

-- Ensure session times are logical
ALTER TABLE "parlant_session"
ADD CONSTRAINT "parlant_session_time_logic"
CHECK (
  "last_activity_at" >= "started_at" AND
  ("ended_at" IS NULL OR "ended_at" >= "started_at")
);

-- Create performance monitoring views
CREATE OR REPLACE VIEW "parlant_agent_performance" AS
SELECT
  a.id,
  a.name,
  a.workspace_id,
  a.total_sessions,
  a.total_messages,
  a.total_tokens_used,
  a.total_cost,
  a.average_session_duration,
  CASE
    WHEN a.total_sessions > 0 THEN ROUND(a.total_messages::NUMERIC / a.total_sessions, 2)
    ELSE 0
  END as avg_messages_per_session,
  CASE
    WHEN a.total_tokens_used > 0 THEN ROUND(a.total_cost::NUMERIC / a.total_tokens_used * 1000, 4)
    ELSE 0
  END as cost_per_1k_tokens,
  a.last_active_at,
  a.status
FROM parlant_agent a
WHERE a.deleted_at IS NULL;

CREATE OR REPLACE VIEW "parlant_workspace_stats" AS
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  COUNT(DISTINCT a.id) as total_agents,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') as active_agents,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_sessions,
  SUM(a.total_messages) as total_messages,
  SUM(a.total_tokens_used) as total_tokens,
  SUM(a.total_cost) as total_cost,
  MAX(s.last_activity_at) as last_activity
FROM workspace w
LEFT JOIN parlant_agent a ON w.id = a.workspace_id AND a.deleted_at IS NULL
LEFT JOIN parlant_session s ON a.id = s.agent_id
GROUP BY w.id, w.name;

-- Add indexes for performance views
CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_agent_performance_idx"
ON "parlant_agent"("workspace_id", "status", "last_active_at")
WHERE "deleted_at" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "parlant_session_activity_idx"
ON "parlant_session"("agent_id", "status", "last_activity_at");

-- Add comments for new constraints and views
COMMENT ON CONSTRAINT "parlant_agent_name_not_empty" ON "parlant_agent" IS 'Ensures agent names are not empty strings';
COMMENT ON CONSTRAINT "parlant_session_counts_non_negative" ON "parlant_session" IS 'Ensures event and message counts are non-negative';
COMMENT ON CONSTRAINT "parlant_journey_state_content_required" ON "parlant_journey_state" IS 'Ensures journey states have required content based on their type';
COMMENT ON CONSTRAINT "parlant_guideline_priority_range" ON "parlant_guideline" IS 'Ensures guideline priorities are within reasonable range (0-1000)';
COMMENT ON CONSTRAINT "parlant_tool_success_rate_valid" ON "parlant_tool" IS 'Ensures success rates are valid percentages (0-100)';
COMMENT ON CONSTRAINT "parlant_variable_value_not_null" ON "parlant_variable" IS 'Ensures variable values are never null';
COMMENT ON CONSTRAINT "parlant_session_time_logic" ON "parlant_session" IS 'Ensures session timestamps are logically consistent';

COMMENT ON VIEW "parlant_agent_performance" IS 'Performance metrics and statistics for Parlant agents';
COMMENT ON VIEW "parlant_workspace_stats" IS 'Aggregated statistics for Parlant usage by workspace';

-- Integrity validation complete
-- Constraints added: 7
-- Views created: 2
-- Performance indexes added: 2