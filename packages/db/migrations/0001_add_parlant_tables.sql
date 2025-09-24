-- Parlant Database Schema Migration
-- This migration adds all Parlant-specific tables to support AI agent functionality
-- Created: 2025-09-23
-- Version: 1.0.0

-- Create enums for Parlant-specific types
CREATE TYPE "agent_status" AS ENUM('active', 'inactive', 'archived');
CREATE TYPE "session_mode" AS ENUM('auto', 'manual', 'paused');
CREATE TYPE "session_status" AS ENUM('active', 'completed', 'abandoned');
CREATE TYPE "event_type" AS ENUM(
  'customer_message',
  'agent_message',
  'tool_call',
  'tool_result',
  'status_update',
  'journey_transition',
  'variable_update'
);
CREATE TYPE "journey_state_type" AS ENUM('chat', 'tool', 'decision', 'final');
CREATE TYPE "composition_mode" AS ENUM('fluid', 'strict');

-- Create Parlant Agents table
CREATE TABLE "parlant_agent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "created_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,

  -- Agent configuration
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "agent_status" NOT NULL DEFAULT 'active',

  -- Behavior configuration
  "composition_mode" "composition_mode" NOT NULL DEFAULT 'fluid',
  "system_prompt" TEXT,

  -- AI Model configuration
  "model_provider" TEXT NOT NULL DEFAULT 'openai',
  "model_name" TEXT NOT NULL DEFAULT 'gpt-4',
  "temperature" INTEGER DEFAULT 70,
  "max_tokens" INTEGER DEFAULT 2000,

  -- Usage tracking
  "total_sessions" INTEGER NOT NULL DEFAULT 0,
  "total_messages" INTEGER NOT NULL DEFAULT 0,
  "last_active_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP
);

-- Create indexes for Parlant Agents
CREATE INDEX "parlant_agent_workspace_id_idx" ON "parlant_agent"("workspace_id");
CREATE INDEX "parlant_agent_created_by_idx" ON "parlant_agent"("created_by");
CREATE INDEX "parlant_agent_status_idx" ON "parlant_agent"("status");
CREATE INDEX "parlant_agent_workspace_status_idx" ON "parlant_agent"("workspace_id", "status");
CREATE INDEX "parlant_agent_deleted_at_idx" ON "parlant_agent"("deleted_at");
CREATE INDEX "parlant_agent_last_active_idx" ON "parlant_agent"("last_active_at");

-- Create Parlant Sessions table
CREATE TABLE "parlant_session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,

  -- User identification (nullable for anonymous sessions)
  "user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  "customer_id" TEXT,

  -- Session configuration
  "mode" "session_mode" NOT NULL DEFAULT 'auto',
  "status" "session_status" NOT NULL DEFAULT 'active',

  -- Session metadata
  "title" TEXT,
  "metadata" JSONB DEFAULT '{}',

  -- Context and state
  "current_journey_id" UUID,
  "current_state_id" UUID,
  "variables" JSONB DEFAULT '{}',

  -- Tracking
  "event_count" INTEGER NOT NULL DEFAULT 0,
  "message_count" INTEGER NOT NULL DEFAULT 0,

  -- Timing
  "started_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_activity_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ended_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Sessions
CREATE INDEX "parlant_session_agent_id_idx" ON "parlant_session"("agent_id");
CREATE INDEX "parlant_session_workspace_id_idx" ON "parlant_session"("workspace_id");
CREATE INDEX "parlant_session_user_id_idx" ON "parlant_session"("user_id");
CREATE INDEX "parlant_session_customer_id_idx" ON "parlant_session"("customer_id");
CREATE INDEX "parlant_session_status_idx" ON "parlant_session"("status");
CREATE INDEX "parlant_session_agent_status_idx" ON "parlant_session"("agent_id", "status");
CREATE INDEX "parlant_session_last_activity_idx" ON "parlant_session"("last_activity_at");
CREATE INDEX "parlant_session_current_journey_idx" ON "parlant_session"("current_journey_id");

-- Create Parlant Events table
CREATE TABLE "parlant_event" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "parlant_session"("id") ON DELETE CASCADE,

  -- Event ordering and identification
  "offset" INTEGER NOT NULL,
  "event_type" "event_type" NOT NULL,

  -- Event content
  "content" JSONB NOT NULL,
  "metadata" JSONB DEFAULT '{}',

  -- References for specific event types
  "tool_call_id" TEXT,
  "journey_id" UUID,
  "state_id" UUID,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Events
CREATE INDEX "parlant_event_session_id_idx" ON "parlant_event"("session_id");
CREATE UNIQUE INDEX "parlant_event_session_offset_idx" ON "parlant_event"("session_id", "offset");
CREATE INDEX "parlant_event_type_idx" ON "parlant_event"("event_type");
CREATE INDEX "parlant_event_session_type_idx" ON "parlant_event"("session_id", "event_type");
CREATE INDEX "parlant_event_tool_call_idx" ON "parlant_event"("tool_call_id");
CREATE INDEX "parlant_event_journey_idx" ON "parlant_event"("journey_id");
CREATE INDEX "parlant_event_created_at_idx" ON "parlant_event"("created_at");

-- Create Parlant Guidelines table
CREATE TABLE "parlant_guideline" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,

  -- Guideline content
  "condition" TEXT NOT NULL,
  "action" TEXT NOT NULL,

  -- Configuration
  "priority" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Associated tools
  "tool_ids" JSONB DEFAULT '[]',

  -- Usage tracking
  "match_count" INTEGER NOT NULL DEFAULT 0,
  "last_matched_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Guidelines
CREATE INDEX "parlant_guideline_agent_id_idx" ON "parlant_guideline"("agent_id");
CREATE INDEX "parlant_guideline_enabled_idx" ON "parlant_guideline"("enabled");
CREATE INDEX "parlant_guideline_agent_enabled_idx" ON "parlant_guideline"("agent_id", "enabled");
CREATE INDEX "parlant_guideline_priority_idx" ON "parlant_guideline"("priority");
CREATE INDEX "parlant_guideline_last_matched_idx" ON "parlant_guideline"("last_matched_at");

-- Create Parlant Journeys table
CREATE TABLE "parlant_journey" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,

  -- Journey configuration
  "title" TEXT NOT NULL,
  "description" TEXT,

  -- Trigger conditions
  "conditions" JSONB NOT NULL,

  -- Configuration
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "allow_skipping" BOOLEAN NOT NULL DEFAULT TRUE,
  "allow_revisiting" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Usage tracking
  "total_sessions" INTEGER NOT NULL DEFAULT 0,
  "completion_rate" INTEGER DEFAULT 0,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Journeys
CREATE INDEX "parlant_journey_agent_id_idx" ON "parlant_journey"("agent_id");
CREATE INDEX "parlant_journey_enabled_idx" ON "parlant_journey"("enabled");
CREATE INDEX "parlant_journey_agent_enabled_idx" ON "parlant_journey"("agent_id", "enabled");
CREATE INDEX "parlant_journey_last_used_idx" ON "parlant_journey"("last_used_at");

-- Create Parlant Journey States table
CREATE TABLE "parlant_journey_state" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "journey_id" UUID NOT NULL REFERENCES "parlant_journey"("id") ON DELETE CASCADE,

  -- State configuration
  "name" TEXT NOT NULL,
  "state_type" "journey_state_type" NOT NULL,

  -- State content based on type
  "chat_prompt" TEXT,
  "tool_id" TEXT,
  "tool_config" JSONB,
  "condition" TEXT,

  -- State behavior
  "is_initial" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_final" BOOLEAN NOT NULL DEFAULT FALSE,
  "allow_skip" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  "metadata" JSONB DEFAULT '{}',

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Journey States
CREATE INDEX "parlant_journey_state_journey_id_idx" ON "parlant_journey_state"("journey_id");
CREATE INDEX "parlant_journey_state_type_idx" ON "parlant_journey_state"("state_type");
CREATE INDEX "parlant_journey_state_journey_type_idx" ON "parlant_journey_state"("journey_id", "state_type");
CREATE INDEX "parlant_journey_state_initial_idx" ON "parlant_journey_state"("is_initial");
CREATE INDEX "parlant_journey_state_final_idx" ON "parlant_journey_state"("is_final");

-- Create Parlant Journey Transitions table
CREATE TABLE "parlant_journey_transition" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "journey_id" UUID NOT NULL REFERENCES "parlant_journey"("id") ON DELETE CASCADE,
  "from_state_id" UUID NOT NULL REFERENCES "parlant_journey_state"("id") ON DELETE CASCADE,
  "to_state_id" UUID NOT NULL REFERENCES "parlant_journey_state"("id") ON DELETE CASCADE,

  -- Transition conditions
  "condition" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,

  -- Tracking
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Journey Transitions
CREATE INDEX "parlant_journey_transition_journey_id_idx" ON "parlant_journey_transition"("journey_id");
CREATE INDEX "parlant_journey_transition_from_state_idx" ON "parlant_journey_transition"("from_state_id");
CREATE INDEX "parlant_journey_transition_to_state_idx" ON "parlant_journey_transition"("to_state_id");
CREATE INDEX "parlant_journey_transition_journey_from_idx" ON "parlant_journey_transition"("journey_id", "from_state_id");
CREATE INDEX "parlant_journey_transition_priority_idx" ON "parlant_journey_transition"("priority");

-- Create Parlant Variables table
CREATE TABLE "parlant_variable" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "session_id" UUID REFERENCES "parlant_session"("id") ON DELETE CASCADE,

  -- Variable identification
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'session',

  -- Variable content
  "value" JSONB NOT NULL,
  "value_type" TEXT NOT NULL,

  -- Configuration
  "is_private" BOOLEAN NOT NULL DEFAULT FALSE,
  "description" TEXT,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Variables
CREATE INDEX "parlant_variable_agent_id_idx" ON "parlant_variable"("agent_id");
CREATE INDEX "parlant_variable_session_id_idx" ON "parlant_variable"("session_id");
CREATE INDEX "parlant_variable_key_idx" ON "parlant_variable"("key");
CREATE INDEX "parlant_variable_agent_key_idx" ON "parlant_variable"("agent_id", "key");
CREATE UNIQUE INDEX "parlant_variable_session_key_idx" ON "parlant_variable"("session_id", "key");
CREATE INDEX "parlant_variable_scope_idx" ON "parlant_variable"("scope");

-- Create Parlant Tools table
CREATE TABLE "parlant_tool" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,

  -- Tool identification
  "name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,

  -- Tool configuration
  "sim_tool_id" TEXT,
  "tool_type" TEXT NOT NULL,

  -- Function signature
  "parameters" JSONB NOT NULL,
  "return_schema" JSONB,

  -- Behavior configuration
  "usage_guidelines" TEXT,
  "error_handling" JSONB DEFAULT '{}',

  -- Status and access
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "is_public" BOOLEAN NOT NULL DEFAULT FALSE,

  -- Usage tracking
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "success_rate" INTEGER DEFAULT 100,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Tools
CREATE INDEX "parlant_tool_workspace_id_idx" ON "parlant_tool"("workspace_id");
CREATE INDEX "parlant_tool_name_idx" ON "parlant_tool"("name");
CREATE UNIQUE INDEX "parlant_tool_workspace_name_idx" ON "parlant_tool"("workspace_id", "name");
CREATE INDEX "parlant_tool_sim_tool_idx" ON "parlant_tool"("sim_tool_id");
CREATE INDEX "parlant_tool_type_idx" ON "parlant_tool"("tool_type");
CREATE INDEX "parlant_tool_enabled_idx" ON "parlant_tool"("enabled");
CREATE INDEX "parlant_tool_public_idx" ON "parlant_tool"("is_public");
CREATE INDEX "parlant_tool_last_used_idx" ON "parlant_tool"("last_used_at");

-- Create Parlant Glossary Terms table
CREATE TABLE "parlant_term" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,

  -- Term definition
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "synonyms" JSONB DEFAULT '[]',

  -- Usage context
  "category" TEXT,
  "examples" JSONB DEFAULT '[]',

  -- Metadata
  "importance" INTEGER NOT NULL DEFAULT 100,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Terms
CREATE INDEX "parlant_term_agent_id_idx" ON "parlant_term"("agent_id");
CREATE INDEX "parlant_term_name_idx" ON "parlant_term"("name");
CREATE UNIQUE INDEX "parlant_term_agent_name_idx" ON "parlant_term"("agent_id", "name");
CREATE INDEX "parlant_term_category_idx" ON "parlant_term"("category");
CREATE INDEX "parlant_term_importance_idx" ON "parlant_term"("importance");

-- Create Parlant Canned Responses table
CREATE TABLE "parlant_canned_response" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,

  -- Response content
  "template" TEXT NOT NULL,
  "category" TEXT,
  "tags" JSONB DEFAULT '[]',

  -- Matching conditions
  "conditions" JSONB DEFAULT '[]',
  "priority" INTEGER NOT NULL DEFAULT 100,

  -- Configuration
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "requires_exact_match" BOOLEAN NOT NULL DEFAULT FALSE,

  -- Usage tracking
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Parlant Canned Responses
CREATE INDEX "parlant_canned_response_agent_id_idx" ON "parlant_canned_response"("agent_id");
CREATE INDEX "parlant_canned_response_category_idx" ON "parlant_canned_response"("category");
CREATE INDEX "parlant_canned_response_agent_category_idx" ON "parlant_canned_response"("agent_id", "category");
CREATE INDEX "parlant_canned_response_enabled_idx" ON "parlant_canned_response"("enabled");
CREATE INDEX "parlant_canned_response_priority_idx" ON "parlant_canned_response"("priority");
CREATE INDEX "parlant_canned_response_last_used_idx" ON "parlant_canned_response"("last_used_at");

-- Add foreign key constraints for cross-table references
ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_current_journey"
FOREIGN KEY ("current_journey_id") REFERENCES "parlant_journey"("id") ON DELETE SET NULL;

ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_current_state"
FOREIGN KEY ("current_state_id") REFERENCES "parlant_journey_state"("id") ON DELETE SET NULL;

ALTER TABLE "parlant_event"
ADD CONSTRAINT "fk_parlant_event_journey"
FOREIGN KEY ("journey_id") REFERENCES "parlant_journey"("id") ON DELETE SET NULL;

ALTER TABLE "parlant_event"
ADD CONSTRAINT "fk_parlant_event_state"
FOREIGN KEY ("state_id") REFERENCES "parlant_journey_state"("id") ON DELETE SET NULL;

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_parlant_agent_updated_at BEFORE UPDATE ON parlant_agent
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_session_updated_at BEFORE UPDATE ON parlant_session
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_guideline_updated_at BEFORE UPDATE ON parlant_guideline
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_journey_updated_at BEFORE UPDATE ON parlant_journey
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_journey_state_updated_at BEFORE UPDATE ON parlant_journey_state
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_variable_updated_at BEFORE UPDATE ON parlant_variable
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_tool_updated_at BEFORE UPDATE ON parlant_tool
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_term_updated_at BEFORE UPDATE ON parlant_term
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_canned_response_updated_at BEFORE UPDATE ON parlant_canned_response
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "parlant_agent" IS 'AI agents with behavior configurations, scoped to workspaces';
COMMENT ON TABLE "parlant_session" IS 'Individual conversations between users and agents, supports anonymous users';
COMMENT ON TABLE "parlant_event" IS 'All events within sessions (messages, tool calls, status updates)';
COMMENT ON TABLE "parlant_guideline" IS 'Behavior rules that guide agent responses in specific situations';
COMMENT ON TABLE "parlant_journey" IS 'Multi-step conversational flows for structured processes';
COMMENT ON TABLE "parlant_journey_state" IS 'Individual states within journeys defining conversation steps';
COMMENT ON TABLE "parlant_journey_transition" IS 'Connections between journey states for flow control';
COMMENT ON TABLE "parlant_variable" IS 'Customer/session-specific data storage for personalization';
COMMENT ON TABLE "parlant_tool" IS 'Function integrations connecting Sim tools with Parlant interface';
COMMENT ON TABLE "parlant_term" IS 'Domain-specific terminology definitions for agent understanding';
COMMENT ON TABLE "parlant_canned_response" IS 'Pre-approved response templates for compliance and brand consistency';

-- Migration complete
-- Tables created: 11
-- Indexes created: 55
-- Constraints added: 4
-- Triggers created: 9