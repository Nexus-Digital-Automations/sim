-- Parlant Workspace Integration Tables Migration
-- Adds workspace integration tables for connecting Parlant agents to Sim resources
-- Created: 2024-09-24
-- Version: 2.2.0

-- Parlant Agent Workflows - Connect agents to Sim workflows for enhanced capabilities
CREATE TABLE "parlant_agent_workflow" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "workflow_id" TEXT NOT NULL REFERENCES "workflow"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,

  -- Configuration for workflow integration
  "integration_type" TEXT NOT NULL, -- 'trigger', 'monitor', 'both'
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Trigger configuration
  "trigger_conditions" JSONB DEFAULT '[]', -- When to trigger workflow
  "input_mapping" JSONB DEFAULT '{}', -- Map session data to workflow inputs

  -- Monitoring configuration
  "monitor_events" JSONB DEFAULT '[]', -- Which workflow events to track
  "output_mapping" JSONB DEFAULT '{}', -- Map workflow outputs to session

  -- Usage tracking
  "trigger_count" INTEGER NOT NULL DEFAULT 0,
  "last_triggered_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_agent_workflow
CREATE INDEX "parlant_agent_workflow_agent_id_idx" ON "parlant_agent_workflow"("agent_id");
CREATE INDEX "parlant_agent_workflow_workflow_id_idx" ON "parlant_agent_workflow"("workflow_id");
CREATE INDEX "parlant_agent_workflow_workspace_id_idx" ON "parlant_agent_workflow"("workspace_id");
CREATE UNIQUE INDEX "parlant_agent_workflow_unique" ON "parlant_agent_workflow"("agent_id", "workflow_id");
CREATE INDEX "parlant_agent_workflow_type_idx" ON "parlant_agent_workflow"("integration_type");
CREATE INDEX "parlant_agent_workflow_agent_enabled_idx" ON "parlant_agent_workflow"("agent_id", "enabled");

-- Parlant Agent API Keys - Connect agents to workspace API keys for external service access
CREATE TABLE "parlant_agent_api_key" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "parlant_agent"("id") ON DELETE CASCADE,
  "api_key_id" TEXT NOT NULL REFERENCES "api_key"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,

  -- Configuration
  "purpose" TEXT NOT NULL, -- 'tools', 'llm', 'external_service'
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "priority" INTEGER NOT NULL DEFAULT 100, -- Key selection priority

  -- Usage tracking
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_agent_api_key
CREATE INDEX "parlant_agent_api_key_agent_id_idx" ON "parlant_agent_api_key"("agent_id");
CREATE INDEX "parlant_agent_api_key_api_key_id_idx" ON "parlant_agent_api_key"("api_key_id");
CREATE INDEX "parlant_agent_api_key_workspace_id_idx" ON "parlant_agent_api_key"("workspace_id");
CREATE UNIQUE INDEX "parlant_agent_api_key_unique" ON "parlant_agent_api_key"("agent_id", "api_key_id");
CREATE INDEX "parlant_agent_api_key_purpose_idx" ON "parlant_agent_api_key"("purpose");
CREATE INDEX "parlant_agent_api_key_agent_enabled_idx" ON "parlant_agent_api_key"("agent_id", "enabled");

-- Parlant Session Workflows - Track workflow executions initiated by sessions
CREATE TABLE "parlant_session_workflow" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "parlant_session"("id") ON DELETE CASCADE,
  "workflow_id" TEXT NOT NULL REFERENCES "workflow"("id") ON DELETE CASCADE,
  "execution_id" TEXT, -- Reference to workflow execution

  -- Execution context
  "trigger_reason" TEXT NOT NULL, -- Why this workflow was triggered
  "input_data" JSONB DEFAULT '{}', -- Data passed to workflow
  "output_data" JSONB DEFAULT '{}', -- Data returned from workflow

  -- Status tracking
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  "started_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "error_message" TEXT,

  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for parlant_session_workflow
CREATE INDEX "parlant_session_workflow_session_id_idx" ON "parlant_session_workflow"("session_id");
CREATE INDEX "parlant_session_workflow_workflow_id_idx" ON "parlant_session_workflow"("workflow_id");
CREATE INDEX "parlant_session_workflow_execution_id_idx" ON "parlant_session_workflow"("execution_id");
CREATE INDEX "parlant_session_workflow_status_idx" ON "parlant_session_workflow"("status");
CREATE INDEX "parlant_session_workflow_session_status_idx" ON "parlant_session_workflow"("session_id", "status");
CREATE INDEX "parlant_session_workflow_started_at_idx" ON "parlant_session_workflow"("started_at");

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_parlant_agent_workflow_updated_at BEFORE UPDATE ON parlant_agent_workflow
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_agent_api_key_updated_at BEFORE UPDATE ON parlant_agent_api_key
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parlant_session_workflow_updated_at BEFORE UPDATE ON parlant_session_workflow
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint checks
ALTER TABLE "parlant_agent_workflow"
ADD CONSTRAINT "parlant_agent_workflow_integration_type_valid"
CHECK ("integration_type" IN ('trigger', 'monitor', 'both'));

ALTER TABLE "parlant_agent_api_key"
ADD CONSTRAINT "parlant_agent_api_key_purpose_valid"
CHECK ("purpose" IN ('tools', 'llm', 'external_service', 'general'));

ALTER TABLE "parlant_session_workflow"
ADD CONSTRAINT "parlant_session_workflow_status_valid"
CHECK ("status" IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

-- Add comments for documentation
COMMENT ON TABLE "parlant_agent_workflow" IS 'Connects agents to workflows for trigger/monitor capabilities';
COMMENT ON TABLE "parlant_agent_api_key" IS 'Associates API keys with agents for tool execution access';
COMMENT ON TABLE "parlant_session_workflow" IS 'Tracks workflow executions initiated by agent sessions';

COMMENT ON COLUMN "parlant_agent_workflow"."integration_type" IS 'How agent interacts with workflow: trigger, monitor, or both';
COMMENT ON COLUMN "parlant_agent_workflow"."trigger_conditions" IS 'JSON array of conditions that trigger the workflow';
COMMENT ON COLUMN "parlant_agent_workflow"."input_mapping" IS 'Maps session variables to workflow input parameters';
COMMENT ON COLUMN "parlant_agent_workflow"."monitor_events" IS 'Array of workflow events to monitor';
COMMENT ON COLUMN "parlant_agent_workflow"."output_mapping" IS 'Maps workflow outputs back to session variables';

COMMENT ON COLUMN "parlant_agent_api_key"."purpose" IS 'Purpose of API key: tools, llm, external_service, general';
COMMENT ON COLUMN "parlant_agent_api_key"."priority" IS 'Priority for API key selection when multiple available';

COMMENT ON COLUMN "parlant_session_workflow"."trigger_reason" IS 'Human-readable reason why the workflow was triggered';
COMMENT ON COLUMN "parlant_session_workflow"."execution_id" IS 'Reference ID to the actual workflow execution';
COMMENT ON COLUMN "parlant_session_workflow"."status" IS 'Current status: pending, running, completed, failed, cancelled';

-- Extension complete
-- New tables created: 3 (parlant_agent_workflow, parlant_agent_api_key, parlant_session_workflow)
-- New indexes created: 18
-- Constraints added: 3
-- Triggers added: 3