-- Migration: Add Registry System for Dynamic Tools and Blocks
-- Description: Extends the existing registry system with comprehensive dynamic tool and block registration

-- Registry Tools table (extending existing customTools functionality)
CREATE TABLE IF NOT EXISTS "registry_tools" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "workspace_id" text REFERENCES "workspace"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text,
  "icon" text DEFAULT 'tool-icon',
  "category" text DEFAULT 'custom',
  "version" text NOT NULL DEFAULT '1.0.0',
  "status" text NOT NULL DEFAULT 'active', -- active, inactive, error, pending_approval
  
  -- Tool manifest and configuration
  "manifest" jsonb NOT NULL DEFAULT '{}',
  "config_schema" jsonb NOT NULL DEFAULT '{}',
  "input_schema" jsonb NOT NULL DEFAULT '{}',
  "output_schema" jsonb NOT NULL DEFAULT '{}',
  
  -- Webhook integration
  "webhook_url" text NOT NULL,
  "webhook_method" text NOT NULL DEFAULT 'POST',
  "webhook_timeout" integer DEFAULT 30000, -- milliseconds
  "webhook_retry_count" integer DEFAULT 3,
  
  -- Authentication configuration
  "authentication" jsonb DEFAULT '{}',
  "api_key_encrypted" text, -- Encrypted API key for the tool
  
  -- Usage tracking
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp,
  "error_count" integer NOT NULL DEFAULT 0,
  "last_error_at" timestamp,
  "last_error_message" text,
  
  -- Metadata
  "tags" jsonb DEFAULT '[]',
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  
  CONSTRAINT "registry_tools_name_user_unique" UNIQUE ("name", "user_id")
);

-- Registry Blocks table for custom workflow blocks
CREATE TABLE IF NOT EXISTS "registry_blocks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "workspace_id" text REFERENCES "workspace"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text,
  "icon" text DEFAULT 'block-icon',
  "category" text DEFAULT 'custom',
  "version" text NOT NULL DEFAULT '1.0.0',
  "status" text NOT NULL DEFAULT 'active', -- active, inactive, error, pending_approval
  
  -- Block manifest and configuration
  "manifest" jsonb NOT NULL DEFAULT '{}',
  "input_ports" jsonb NOT NULL DEFAULT '[]',
  "output_ports" jsonb NOT NULL DEFAULT '[]',
  "config_schema" jsonb NOT NULL DEFAULT '{}',
  
  -- Execution configuration
  "execution_url" text NOT NULL,
  "validation_url" text,
  "execution_timeout" integer DEFAULT 300000, -- 5 minutes default
  
  -- Usage tracking
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp,
  "error_count" integer NOT NULL DEFAULT 0,
  "last_error_at" timestamp,
  "last_error_message" text,
  
  -- Metadata
  "tags" jsonb DEFAULT '[]',
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  
  CONSTRAINT "registry_blocks_name_user_unique" UNIQUE ("name", "user_id")
);

-- Webhook Execution Logs for debugging and monitoring
CREATE TABLE IF NOT EXISTS "webhook_execution_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "registry_item_id" text NOT NULL, -- References either registry_tools.id or registry_blocks.id
  "registry_type" text NOT NULL, -- 'tool' or 'block'
  "execution_id" text NOT NULL,
  "workflow_id" text REFERENCES "workflow"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  
  -- Request details
  "webhook_url" text NOT NULL,
  "request_method" text NOT NULL,
  "request_headers" jsonb DEFAULT '{}',
  "request_body" jsonb,
  "request_signature" text, -- HMAC signature for security validation
  
  -- Response details
  "response_status" integer,
  "response_headers" jsonb DEFAULT '{}',
  "response_body" jsonb,
  "response_time_ms" integer,
  
  -- Error handling
  "error_message" text,
  "retry_count" integer DEFAULT 0,
  "is_successful" boolean NOT NULL DEFAULT false,
  
  -- Timing
  "started_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- API Keys for Registry Access (separate from user API keys)
CREATE TABLE IF NOT EXISTS "registry_api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE, -- Hashed API key
  "permissions" jsonb NOT NULL DEFAULT '["read"]', -- ["read", "write", "admin"]
  "rate_limit" integer DEFAULT 100, -- requests per minute
  "last_used_at" timestamp,
  "usage_count" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Registry Rate Limits (separate from general rate limits)
CREATE TABLE IF NOT EXISTS "registry_rate_limits" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "tool_registrations" integer NOT NULL DEFAULT 0,
  "block_registrations" integer NOT NULL DEFAULT 0,
  "webhook_calls" integer NOT NULL DEFAULT 0,
  "window_start" timestamp NOT NULL DEFAULT now(),
  "last_request_at" timestamp NOT NULL DEFAULT now(),
  "is_rate_limited" boolean NOT NULL DEFAULT false,
  "rate_limit_reset_at" timestamp
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "registry_tools_user_id_idx" ON "registry_tools" ("user_id");
CREATE INDEX IF NOT EXISTS "registry_tools_workspace_id_idx" ON "registry_tools" ("workspace_id");
CREATE INDEX IF NOT EXISTS "registry_tools_status_idx" ON "registry_tools" ("status");
CREATE INDEX IF NOT EXISTS "registry_tools_category_idx" ON "registry_tools" ("category");
CREATE INDEX IF NOT EXISTS "registry_tools_usage_idx" ON "registry_tools" ("usage_count" DESC, "last_used_at" DESC);

CREATE INDEX IF NOT EXISTS "registry_blocks_user_id_idx" ON "registry_blocks" ("user_id");
CREATE INDEX IF NOT EXISTS "registry_blocks_workspace_id_idx" ON "registry_blocks" ("workspace_id");
CREATE INDEX IF NOT EXISTS "registry_blocks_status_idx" ON "registry_blocks" ("status");
CREATE INDEX IF NOT EXISTS "registry_blocks_category_idx" ON "registry_blocks" ("category");
CREATE INDEX IF NOT EXISTS "registry_blocks_usage_idx" ON "registry_blocks" ("usage_count" DESC, "last_used_at" DESC);

CREATE INDEX IF NOT EXISTS "webhook_execution_logs_registry_item_idx" ON "webhook_execution_logs" ("registry_item_id", "registry_type");
CREATE INDEX IF NOT EXISTS "webhook_execution_logs_execution_id_idx" ON "webhook_execution_logs" ("execution_id");
CREATE INDEX IF NOT EXISTS "webhook_execution_logs_workflow_id_idx" ON "webhook_execution_logs" ("workflow_id");
CREATE INDEX IF NOT EXISTS "webhook_execution_logs_user_id_idx" ON "webhook_execution_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "webhook_execution_logs_started_at_idx" ON "webhook_execution_logs" ("started_at" DESC);
CREATE INDEX IF NOT EXISTS "webhook_execution_logs_success_idx" ON "webhook_execution_logs" ("is_successful", "started_at" DESC);

CREATE INDEX IF NOT EXISTS "registry_api_keys_user_id_idx" ON "registry_api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "registry_api_keys_active_idx" ON "registry_api_keys" ("is_active", "expires_at");

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registry_tools_updated_at 
    BEFORE UPDATE ON registry_tools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registry_blocks_updated_at 
    BEFORE UPDATE ON registry_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registry_api_keys_updated_at 
    BEFORE UPDATE ON registry_api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();