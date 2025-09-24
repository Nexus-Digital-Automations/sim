-- Parlant Session and Tool Schema Extension Migration
-- Adds additional fields to parlant_session and parlant_tool tables
-- Created: 2024-09-24
-- Version: 2.1.0

-- Add missing columns to parlant_session table
ALTER TABLE "parlant_session"
ADD COLUMN "tokens_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "average_response_time" INTEGER,
ADD COLUMN "satisfaction_score" INTEGER,
ADD COLUMN "session_type" TEXT DEFAULT 'conversation',
ADD COLUMN "tags" JSONB DEFAULT '[]',
ADD COLUMN "user_agent" TEXT,
ADD COLUMN "ip_address" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "locale" TEXT DEFAULT 'en',
ADD COLUMN "timezone" TEXT DEFAULT 'UTC';

-- Add new indexes for parlant_session
CREATE INDEX "parlant_session_type_idx" ON "parlant_session"("session_type");
CREATE INDEX "parlant_session_locale_idx" ON "parlant_session"("locale");
CREATE INDEX "parlant_session_satisfaction_idx" ON "parlant_session"("satisfaction_score");
CREATE INDEX "parlant_session_workspace_type_idx" ON "parlant_session"("workspace_id", "session_type");
CREATE INDEX "parlant_session_agent_active_idx" ON "parlant_session"("agent_id", "last_activity_at");

-- Add missing columns to parlant_tool table
ALTER TABLE "parlant_tool"
ADD COLUMN "execution_timeout" INTEGER DEFAULT 30000,
ADD COLUMN "retry_policy" JSONB DEFAULT '{"max_attempts": 3, "backoff_ms": 1000}',
ADD COLUMN "rate_limit_per_minute" INTEGER DEFAULT 60,
ADD COLUMN "rate_limit_per_hour" INTEGER DEFAULT 1000,
ADD COLUMN "requires_auth" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "auth_type" TEXT,
ADD COLUMN "auth_config" JSONB DEFAULT '{}',
ADD COLUMN "is_deprecated" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add new indexes for parlant_tool
CREATE INDEX "parlant_tool_deprecated_idx" ON "parlant_tool"("is_deprecated");
CREATE INDEX "parlant_tool_auth_type_idx" ON "parlant_tool"("auth_type");
CREATE INDEX "parlant_tool_workspace_deprecated_idx" ON "parlant_tool"("workspace_id", "is_deprecated");

-- Add constraint checks for new fields
ALTER TABLE "parlant_session"
ADD CONSTRAINT "parlant_session_satisfaction_score_range"
CHECK ("satisfaction_score" IS NULL OR ("satisfaction_score" >= 1 AND "satisfaction_score" <= 5));

ALTER TABLE "parlant_session"
ADD CONSTRAINT "parlant_session_session_type_valid"
CHECK ("session_type" IN ('conversation', 'support', 'onboarding', 'survey', 'demo', 'feedback'));

ALTER TABLE "parlant_tool"
ADD CONSTRAINT "parlant_tool_auth_type_valid"
CHECK ("auth_type" IS NULL OR "auth_type" IN ('api_key', 'oauth', 'basic', 'none', 'bearer'));

ALTER TABLE "parlant_tool"
ADD CONSTRAINT "parlant_tool_execution_timeout_positive"
CHECK ("execution_timeout" IS NULL OR "execution_timeout" > 0);

ALTER TABLE "parlant_tool"
ADD CONSTRAINT "parlant_tool_rate_limits_positive"
CHECK (
  ("rate_limit_per_minute" IS NULL OR "rate_limit_per_minute" > 0) AND
  ("rate_limit_per_hour" IS NULL OR "rate_limit_per_hour" > 0)
);

-- Add comments for new columns
COMMENT ON COLUMN "parlant_session"."tokens_used" IS 'Total tokens consumed in this session';
COMMENT ON COLUMN "parlant_session"."cost" IS 'Total cost for this session in cents';
COMMENT ON COLUMN "parlant_session"."average_response_time" IS 'Average agent response time in milliseconds';
COMMENT ON COLUMN "parlant_session"."satisfaction_score" IS 'User satisfaction rating 1-5';
COMMENT ON COLUMN "parlant_session"."session_type" IS 'Type of session: conversation, support, onboarding, survey, demo, feedback';
COMMENT ON COLUMN "parlant_session"."tags" IS 'Array of tags for session categorization';
COMMENT ON COLUMN "parlant_session"."user_agent" IS 'Browser/app information for analytics';
COMMENT ON COLUMN "parlant_session"."ip_address" IS 'User IP address (anonymized for analytics)';
COMMENT ON COLUMN "parlant_session"."referrer" IS 'How the user arrived at the session';
COMMENT ON COLUMN "parlant_session"."locale" IS 'User language preference (ISO 639-1)';
COMMENT ON COLUMN "parlant_session"."timezone" IS 'User timezone (IANA timezone identifier)';

COMMENT ON COLUMN "parlant_tool"."execution_timeout" IS 'Maximum tool execution time in milliseconds';
COMMENT ON COLUMN "parlant_tool"."retry_policy" IS 'JSON configuration for retry behavior';
COMMENT ON COLUMN "parlant_tool"."rate_limit_per_minute" IS 'Maximum calls per minute';
COMMENT ON COLUMN "parlant_tool"."rate_limit_per_hour" IS 'Maximum calls per hour';
COMMENT ON COLUMN "parlant_tool"."requires_auth" IS 'Whether tool requires authentication';
COMMENT ON COLUMN "parlant_tool"."auth_type" IS 'Authentication type: api_key, oauth, basic, none, bearer';
COMMENT ON COLUMN "parlant_tool"."auth_config" IS 'Authentication-specific configuration';
COMMENT ON COLUMN "parlant_tool"."is_deprecated" IS 'Whether tool is deprecated and should not be used';

-- Extension complete
-- Tables extended: 2 (parlant_session, parlant_tool)
-- New indexes created: 8
-- Constraints added: 5