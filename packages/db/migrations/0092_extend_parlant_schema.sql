-- Parlant Schema Extension Migration
-- Updates the existing Parlant schema to match the current TypeScript schema
-- Created: 2024-09-24
-- Version: 2.0.0

-- Add missing columns to parlant_agent table
ALTER TABLE "parlant_agent"
ADD COLUMN "response_timeout_ms" INTEGER DEFAULT 30000,
ADD COLUMN "max_context_length" INTEGER DEFAULT 8000,
ADD COLUMN "system_instructions" TEXT,
ADD COLUMN "allow_interruption" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "allow_proactive_messages" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "conversation_style" TEXT DEFAULT 'professional',
ADD COLUMN "data_retention_days" INTEGER DEFAULT 30,
ADD COLUMN "allow_data_export" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "pii_handling_mode" TEXT DEFAULT 'standard',
ADD COLUMN "integration_metadata" JSONB DEFAULT '{}',
ADD COLUMN "custom_config" JSONB DEFAULT '{}',
ADD COLUMN "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "total_cost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "average_session_duration" INTEGER;

-- Add new indexes for parlant_agent
CREATE INDEX "parlant_agent_composition_mode_idx" ON "parlant_agent"("composition_mode");
CREATE INDEX "parlant_agent_model_provider_idx" ON "parlant_agent"("model_provider");
CREATE INDEX "parlant_agent_conversation_style_idx" ON "parlant_agent"("conversation_style");
CREATE INDEX "parlant_agent_workspace_active_idx" ON "parlant_agent"("workspace_id", "last_active_at");

-- Create missing junction tables

-- Parlant Agent Tools - Many-to-many relationship between agents and tools
CREATE TABLE "parlant_agent_tool" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "tool_id" UUID NOT NULL REFERENCES "parlant_tool"("id") ON DELETE CASCADE,

  -- Configuration for this specific agent-tool combination
  "configuration" JSONB DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "priority" INTEGER NOT NULL DEFAULT 100,

  -- Usage tracking for this specific combination
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_agent_tool
CREATE INDEX "parlant_agent_tool_agent_id_idx" ON "parlant_agent_tool"("agent_id");
CREATE INDEX "parlant_agent_tool_tool_id_idx" ON "parlant_agent_tool"("tool_id");
CREATE UNIQUE INDEX "parlant_agent_tool_unique" ON "parlant_agent_tool"("agent_id", "tool_id");
CREATE INDEX "parlant_agent_tool_agent_enabled_idx" ON "parlant_agent_tool"("agent_id", "enabled");
CREATE INDEX "parlant_agent_tool_priority_idx" ON "parlant_agent_tool"("priority");

-- Parlant Journey Guidelines - Many-to-many relationship between journeys and guidelines
CREATE TABLE "parlant_journey_guideline" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "journey_id" UUID NOT NULL REFERENCES "parlant_journey"("id") ON DELETE CASCADE,
  "guideline_id" UUID NOT NULL REFERENCES "parlant_guideline"("id") ON DELETE CASCADE,

  -- Override configuration for this journey context
  "priority_override" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "journey_specific_condition" TEXT,

  -- Usage tracking in this journey context
  "match_count" INTEGER NOT NULL DEFAULT 0,
  "last_matched_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_journey_guideline
CREATE INDEX "parlant_journey_guideline_journey_id_idx" ON "parlant_journey_guideline"("journey_id");
CREATE INDEX "parlant_journey_guideline_guideline_id_idx" ON "parlant_journey_guideline"("guideline_id");
CREATE UNIQUE INDEX "parlant_journey_guideline_unique" ON "parlant_journey_guideline"("journey_id", "guideline_id");
CREATE INDEX "parlant_journey_guideline_journey_enabled_idx" ON "parlant_journey_guideline"("journey_id", "enabled");
CREATE INDEX "parlant_journey_guideline_priority_override_idx" ON "parlant_journey_guideline"("priority_override");

-- Parlant Agent Knowledge Base - Connection between agents and Sim's knowledge bases
CREATE TABLE "parlant_agent_knowledge_base" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "knowledge_base_id" TEXT NOT NULL REFERENCES "knowledge_base"("id") ON DELETE CASCADE,

  -- Configuration for knowledge base usage
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "search_threshold" INTEGER DEFAULT 80,
  "max_results" INTEGER DEFAULT 5,
  "priority" INTEGER NOT NULL DEFAULT 100,

  -- Usage tracking
  "search_count" INTEGER NOT NULL DEFAULT 0,
  "last_searched_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_agent_knowledge_base
CREATE INDEX "parlant_agent_kb_agent_id_idx" ON "parlant_agent_knowledge_base"("agent_id");
CREATE INDEX "parlant_agent_kb_kb_id_idx" ON "parlant_agent_knowledge_base"("knowledge_base_id");
CREATE UNIQUE INDEX "parlant_agent_kb_unique" ON "parlant_agent_knowledge_base"("agent_id", "knowledge_base_id");
CREATE INDEX "parlant_agent_kb_agent_enabled_idx" ON "parlant_agent_knowledge_base"("agent_id", "enabled");
CREATE INDEX "parlant_agent_kb_priority_idx" ON "parlant_agent_knowledge_base"("priority");

-- Parlant Tool Integrations - Connection between Parlant tools and Sim's existing tools
CREATE TABLE "parlant_tool_integration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "parlant_tool_id" UUID NOT NULL REFERENCES "parlant_tool"("id") ON DELETE CASCADE,

  -- Integration type and target references
  "integration_type" TEXT NOT NULL, -- 'custom_tool', 'workflow_block', 'mcp_server'
  "target_id" TEXT NOT NULL, -- ID of the target

  -- Integration configuration
  "configuration" JSONB DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Mapping configuration for parameter translation
  "parameter_mapping" JSONB DEFAULT '{}',
  "response_mapping" JSONB DEFAULT '{}',

  -- Health and monitoring
  "last_health_check" TIMESTAMP,
  "health_status" TEXT DEFAULT 'unknown',
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_tool_integration
CREATE INDEX "parlant_tool_integration_parlant_tool_idx" ON "parlant_tool_integration"("parlant_tool_id");
CREATE INDEX "parlant_tool_integration_type_idx" ON "parlant_tool_integration"("integration_type");
CREATE INDEX "parlant_tool_integration_target_idx" ON "parlant_tool_integration"("target_id");
CREATE INDEX "parlant_tool_integration_type_target_idx" ON "parlant_tool_integration"("integration_type", "target_id");
CREATE INDEX "parlant_tool_integration_health_idx" ON "parlant_tool_integration"("health_status");
CREATE UNIQUE INDEX "parlant_tool_integration_unique" ON "parlant_tool_integration"("parlant_tool_id", "integration_type", "target_id");

-- Add triggers for updated_at timestamps on new tables
CREATE TRIGGER update_parlant_agent_tool_updated_at BEFORE UPDATE ON parlant_agent_tool
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_journey_guideline_updated_at BEFORE UPDATE ON parlant_journey_guideline
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_agent_knowledge_base_updated_at BEFORE UPDATE ON parlant_agent_knowledge_base
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_tool_integration_updated_at BEFORE UPDATE ON parlant_tool_integration
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "parlant_agent_tool" IS 'Many-to-many relationship between agents and tools with specific configurations';
COMMENT ON TABLE "parlant_journey_guideline" IS 'Journey-specific guideline overrides and configurations';
COMMENT ON TABLE "parlant_agent_knowledge_base" IS 'Agent access to workspace knowledge bases for RAG operations';
COMMENT ON TABLE "parlant_tool_integration" IS 'Integration mappings between Parlant tools and Sim tools/blocks/MCP servers';

-- Migration metadata
COMMENT ON COLUMN "parlant_agent"."response_timeout_ms" IS 'Maximum response time in milliseconds';
COMMENT ON COLUMN "parlant_agent"."max_context_length" IS 'Maximum context window size for this agent';
COMMENT ON COLUMN "parlant_agent"."system_instructions" IS 'Additional system-level instructions beyond prompt';
COMMENT ON COLUMN "parlant_agent"."allow_interruption" IS 'Whether agent can be interrupted mid-response';
COMMENT ON COLUMN "parlant_agent"."allow_proactive_messages" IS 'Whether agent can send unsolicited messages';
COMMENT ON COLUMN "parlant_agent"."conversation_style" IS 'Agent conversation style: casual, professional, technical, friendly';
COMMENT ON COLUMN "parlant_agent"."data_retention_days" IS 'How long to keep session data in days';
COMMENT ON COLUMN "parlant_agent"."pii_handling_mode" IS 'PII handling mode: strict, standard, relaxed';
COMMENT ON COLUMN "parlant_agent"."total_cost" IS 'Total cost for this agent in cents';

-- Extension complete
-- Tables extended: 1 (parlant_agent)
-- New tables created: 4 (parlant_agent_tool, parlant_journey_guideline, parlant_agent_knowledge_base, parlant_tool_integration)
-- New indexes created: 25
-- Triggers added: 4