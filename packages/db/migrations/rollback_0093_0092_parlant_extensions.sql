-- Rollback Migration for Parlant Schema Extensions
-- Reverts changes made in 0092_extend_parlant_schema.sql and 0093_extend_parlant_session_tool_schema.sql
-- Created: 2024-09-24
-- WARNING: This will permanently delete data and schema changes

-- Rollback 0093 changes first (session and tool extensions)

-- Remove constraint checks added in 0093
ALTER TABLE "parlant_session" DROP CONSTRAINT IF EXISTS "parlant_session_satisfaction_score_range";
ALTER TABLE "parlant_session" DROP CONSTRAINT IF EXISTS "parlant_session_session_type_valid";
ALTER TABLE "parlant_tool" DROP CONSTRAINT IF EXISTS "parlant_tool_auth_type_valid";
ALTER TABLE "parlant_tool" DROP CONSTRAINT IF EXISTS "parlant_tool_execution_timeout_positive";
ALTER TABLE "parlant_tool" DROP CONSTRAINT IF EXISTS "parlant_tool_rate_limits_positive";

-- Drop indexes added in 0093 for parlant_session
DROP INDEX IF EXISTS "parlant_session_type_idx";
DROP INDEX IF EXISTS "parlant_session_locale_idx";
DROP INDEX IF EXISTS "parlant_session_satisfaction_idx";
DROP INDEX IF EXISTS "parlant_session_workspace_type_idx";
DROP INDEX IF EXISTS "parlant_session_agent_active_idx";

-- Drop indexes added in 0093 for parlant_tool
DROP INDEX IF EXISTS "parlant_tool_deprecated_idx";
DROP INDEX IF EXISTS "parlant_tool_auth_type_idx";
DROP INDEX IF EXISTS "parlant_tool_workspace_deprecated_idx";

-- Remove columns added to parlant_session in 0093
ALTER TABLE "parlant_session"
DROP COLUMN IF EXISTS "tokens_used",
DROP COLUMN IF EXISTS "cost",
DROP COLUMN IF EXISTS "average_response_time",
DROP COLUMN IF EXISTS "satisfaction_score",
DROP COLUMN IF EXISTS "session_type",
DROP COLUMN IF EXISTS "tags",
DROP COLUMN IF EXISTS "user_agent",
DROP COLUMN IF EXISTS "ip_address",
DROP COLUMN IF EXISTS "referrer",
DROP COLUMN IF EXISTS "locale",
DROP COLUMN IF EXISTS "timezone";

-- Remove columns added to parlant_tool in 0093
ALTER TABLE "parlant_tool"
DROP COLUMN IF EXISTS "execution_timeout",
DROP COLUMN IF EXISTS "retry_policy",
DROP COLUMN IF EXISTS "rate_limit_per_minute",
DROP COLUMN IF EXISTS "rate_limit_per_hour",
DROP COLUMN IF EXISTS "requires_auth",
DROP COLUMN IF EXISTS "auth_type",
DROP COLUMN IF EXISTS "auth_config",
DROP COLUMN IF EXISTS "is_deprecated";

-- Rollback 0092 changes (agent extensions and junction tables)

-- Drop triggers added in 0092
DROP TRIGGER IF EXISTS update_parlant_agent_tool_updated_at ON parlant_agent_tool;
DROP TRIGGER IF EXISTS update_parlant_journey_guideline_updated_at ON parlant_journey_guideline;
DROP TRIGGER IF EXISTS update_parlant_agent_knowledge_base_updated_at ON parlant_agent_knowledge_base;
DROP TRIGGER IF EXISTS update_parlant_tool_integration_updated_at ON parlant_tool_integration;

-- Drop junction tables created in 0092
DROP TABLE IF EXISTS "parlant_tool_integration";
DROP TABLE IF EXISTS "parlant_agent_knowledge_base";
DROP TABLE IF EXISTS "parlant_journey_guideline";
DROP TABLE IF EXISTS "parlant_agent_tool";

-- Drop indexes added to parlant_agent in 0092
DROP INDEX IF EXISTS "parlant_agent_composition_mode_idx";
DROP INDEX IF EXISTS "parlant_agent_model_provider_idx";
DROP INDEX IF EXISTS "parlant_agent_conversation_style_idx";
DROP INDEX IF EXISTS "parlant_agent_workspace_active_idx";

-- Remove columns added to parlant_agent in 0092
ALTER TABLE "parlant_agent"
DROP COLUMN IF EXISTS "response_timeout_ms",
DROP COLUMN IF EXISTS "max_context_length",
DROP COLUMN IF EXISTS "system_instructions",
DROP COLUMN IF EXISTS "allow_interruption",
DROP COLUMN IF EXISTS "allow_proactive_messages",
DROP COLUMN IF EXISTS "conversation_style",
DROP COLUMN IF EXISTS "data_retention_days",
DROP COLUMN IF EXISTS "allow_data_export",
DROP COLUMN IF EXISTS "pii_handling_mode",
DROP COLUMN IF EXISTS "integration_metadata",
DROP COLUMN IF EXISTS "custom_config",
DROP COLUMN IF EXISTS "total_tokens_used",
DROP COLUMN IF EXISTS "total_cost",
DROP COLUMN IF EXISTS "average_session_duration";

-- Rollback complete
-- This rollback removes:
-- - 4 junction tables (parlant_agent_tool, parlant_journey_guideline, parlant_agent_knowledge_base, parlant_tool_integration)
-- - 33 columns (14 from parlant_agent, 11 from parlant_session, 8 from parlant_tool)
-- - 33 indexes
-- - 5 constraints
-- - 4 triggers

-- WARNING: All data in the dropped tables and columns has been permanently lost