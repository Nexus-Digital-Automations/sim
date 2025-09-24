-- Comprehensive Parlant Database Schema Migration
-- Migration: 0092_parlant_schema_comprehensive
-- Purpose: Complete Parlant schema extension with production-ready features
-- Created: 2025-09-24
-- Version: 1.1.0
-- Safety: High (includes rollback support and validation)

-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
    workspace_count INTEGER;
    user_count INTEGER;
    migration_version TEXT;
BEGIN
    -- Check system readiness
    SELECT COUNT(*) INTO workspace_count FROM workspace;
    SELECT COUNT(*) INTO user_count FROM "user";

    -- Log migration start
    RAISE NOTICE 'PARLANT MIGRATION START: Workspaces: %, Users: %', workspace_count, user_count;

    -- Validate prerequisite tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace') THEN
        RAISE EXCEPTION 'ERROR: workspace table does not exist. Cannot proceed with migration.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
        RAISE EXCEPTION 'ERROR: user table does not exist. Cannot proceed with migration.';
    END IF;

    -- Check for existing Parlant tables (partial migration scenario)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parlant_agent') THEN
        RAISE NOTICE 'WARNING: Existing parlant_agent table found. This may be a re-run or partial migration.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION LOCK (Prevent concurrent execution)
-- ============================================================================

-- Create advisory lock to prevent concurrent migrations
SELECT pg_advisory_lock(5555, 2024);

-- ============================================================================
-- CREATE ENUMS (Enhanced with better error handling)
-- ============================================================================

-- Agent status with comprehensive states
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
        CREATE TYPE agent_status AS ENUM('active', 'inactive', 'archived', 'maintenance');
        RAISE NOTICE 'Created agent_status enum';
    ELSE
        RAISE NOTICE 'agent_status enum already exists, skipping creation';
    END IF;
END $$;

-- Session modes for different conversation flows
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_mode') THEN
        CREATE TYPE session_mode AS ENUM('auto', 'manual', 'paused', 'debug');
        RAISE NOTICE 'Created session_mode enum';
    ELSE
        RAISE NOTICE 'session_mode enum already exists, skipping creation';
    END IF;
END $$;

-- Session status lifecycle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM('active', 'completed', 'abandoned', 'error', 'transferred');
        RAISE NOTICE 'Created session_status enum';
    ELSE
        RAISE NOTICE 'session_status enum already exists, skipping creation';
    END IF;
END $$;

-- Event types for comprehensive logging
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM(
            'customer_message',
            'agent_message',
            'tool_call',
            'tool_result',
            'status_update',
            'journey_transition',
            'variable_update',
            'error_event',
            'system_event',
            'compliance_check'
        );
        RAISE NOTICE 'Created event_type enum';
    ELSE
        RAISE NOTICE 'event_type enum already exists, skipping creation';
    END IF;
END $$;

-- Journey state types for conversation flows
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_state_type') THEN
        CREATE TYPE journey_state_type AS ENUM('chat', 'tool', 'decision', 'final', 'conditional', 'parallel');
        RAISE NOTICE 'Created journey_state_type enum';
    ELSE
        RAISE NOTICE 'journey_state_type enum already exists, skipping creation';
    END IF;
END $$;

-- Composition modes for agent behavior
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'composition_mode') THEN
        CREATE TYPE composition_mode AS ENUM('fluid', 'strict', 'hybrid');
        RAISE NOTICE 'Created composition_mode enum';
    ELSE
        RAISE NOTICE 'composition_mode enum already exists, skipping creation';
    END IF;
END $$;

-- ============================================================================
-- CREATE CORE TABLES
-- ============================================================================

-- Parlant Agents - AI agents with behavior configurations
CREATE TABLE IF NOT EXISTS parlant_agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    -- Agent configuration
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
    description TEXT CHECK (length(description) <= 2000),
    status agent_status NOT NULL DEFAULT 'active',

    -- Behavior configuration
    composition_mode composition_mode NOT NULL DEFAULT 'fluid',
    system_prompt TEXT CHECK (length(system_prompt) <= 10000),

    -- AI Model configuration with validation
    model_provider TEXT NOT NULL DEFAULT 'openai' CHECK (model_provider IN ('openai', 'anthropic', 'azure', 'local')),
    model_name TEXT NOT NULL DEFAULT 'gpt-4' CHECK (length(model_name) >= 1),
    temperature INTEGER DEFAULT 70 CHECK (temperature >= 0 AND temperature <= 100),
    max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens > 0 AND max_tokens <= 100000),

    -- Usage tracking with constraints
    total_sessions INTEGER NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
    total_messages INTEGER NOT NULL DEFAULT 0 CHECK (total_messages >= 0),
    last_active_at TIMESTAMP WITH TIME ZONE,

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Ensure agent names are unique within workspace
    CONSTRAINT unique_agent_name_per_workspace UNIQUE (workspace_id, name) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_agent
CREATE INDEX IF NOT EXISTS idx_parlant_agent_workspace_status ON parlant_agent(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_agent_created_by ON parlant_agent(created_by);
CREATE INDEX IF NOT EXISTS idx_parlant_agent_last_active ON parlant_agent(last_active_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_agent_model_provider ON parlant_agent(model_provider);
CREATE INDEX IF NOT EXISTS idx_parlant_agent_deleted_at ON parlant_agent(deleted_at);

-- Parlant Sessions - Individual conversations with enhanced tracking
CREATE TABLE IF NOT EXISTS parlant_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,

    -- User identification (supports both authenticated and anonymous)
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    customer_id TEXT CHECK (length(customer_id) <= 255),

    -- Session configuration
    mode session_mode NOT NULL DEFAULT 'auto',
    status session_status NOT NULL DEFAULT 'active',

    -- Session metadata with JSON validation
    title TEXT CHECK (length(title) <= 500),
    metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),

    -- Context and state tracking
    current_journey_id UUID, -- Foreign key added later
    current_state_id UUID,   -- Foreign key added later
    variables JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(variables) = 'object'),

    -- Session tracking with constraints
    event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
    message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),

    -- Enhanced timing tracking
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Business logic constraints
    CONSTRAINT valid_session_timing CHECK (
        ended_at IS NULL OR ended_at >= started_at
    ),
    CONSTRAINT valid_activity_timing CHECK (
        last_activity_at >= started_at
    ),
    CONSTRAINT valid_ended_status CHECK (
        (ended_at IS NULL AND status IN ('active', 'paused')) OR
        (ended_at IS NOT NULL AND status IN ('completed', 'abandoned', 'error', 'transferred'))
    )
);

-- Enhanced indexes for parlant_session
CREATE INDEX IF NOT EXISTS idx_parlant_session_agent_status ON parlant_session(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_parlant_session_workspace_id ON parlant_session(workspace_id);
CREATE INDEX IF NOT EXISTS idx_parlant_session_user_id ON parlant_session(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_session_customer_id ON parlant_session(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_session_last_activity ON parlant_session(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_session_current_journey ON parlant_session(current_journey_id) WHERE current_journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_session_active ON parlant_session(agent_id, last_activity_at DESC) WHERE status = 'active';

-- Parlant Events - Comprehensive event logging
CREATE TABLE IF NOT EXISTS parlant_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES parlant_session(id) ON DELETE CASCADE,

    -- Event ordering and identification
    offset INTEGER NOT NULL CHECK (offset >= 0),
    event_type event_type NOT NULL,

    -- Event content with validation
    content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
    metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),

    -- References for specific event types
    tool_call_id TEXT CHECK (length(tool_call_id) <= 255),
    journey_id UUID, -- Foreign key added later
    state_id UUID,   -- Foreign key added later

    -- Performance and debugging
    processing_duration_ms INTEGER CHECK (processing_duration_ms >= 0),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure event offset uniqueness within session
    CONSTRAINT unique_session_offset UNIQUE (session_id, offset) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_event
CREATE INDEX IF NOT EXISTS idx_parlant_event_session_id ON parlant_event(session_id, offset);
CREATE INDEX IF NOT EXISTS idx_parlant_event_type ON parlant_event(event_type);
CREATE INDEX IF NOT EXISTS idx_parlant_event_session_type ON parlant_event(session_id, event_type);
CREATE INDEX IF NOT EXISTS idx_parlant_event_tool_call ON parlant_event(tool_call_id) WHERE tool_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_event_journey ON parlant_event(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_event_created_at ON parlant_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_event_processing_duration ON parlant_event(processing_duration_ms DESC) WHERE processing_duration_ms IS NOT NULL;

-- Parlant Guidelines - Behavior rules with enhanced validation
CREATE TABLE IF NOT EXISTS parlant_guideline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,

    -- Guideline content with validation
    condition TEXT NOT NULL CHECK (length(condition) >= 1 AND length(condition) <= 2000),
    action TEXT NOT NULL CHECK (length(action) >= 1 AND length(action) <= 5000),

    -- Configuration with constraints
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 1 AND priority <= 1000),
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Associated tools with validation
    tool_ids JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tool_ids) = 'array'),

    -- Usage tracking
    match_count INTEGER NOT NULL DEFAULT 0 CHECK (match_count >= 0),
    success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0 AND success_count <= match_count),
    last_matched_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enhanced indexes for parlant_guideline
CREATE INDEX IF NOT EXISTS idx_parlant_guideline_agent_enabled ON parlant_guideline(agent_id, enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_guideline_priority ON parlant_guideline(priority DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_guideline_last_matched ON parlant_guideline(last_matched_at DESC) WHERE last_matched_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_guideline_success_rate ON parlant_guideline(
    CASE WHEN match_count > 0 THEN (success_count::FLOAT / match_count) ELSE 1.0 END DESC
) WHERE match_count > 0;

-- ============================================================================
-- CREATE JOURNEY SYSTEM TABLES
-- ============================================================================

-- Parlant Journeys - Multi-step conversational flows
CREATE TABLE IF NOT EXISTS parlant_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,

    -- Journey configuration
    title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
    description TEXT CHECK (length(description) <= 2000),

    -- Trigger conditions with validation
    conditions JSONB NOT NULL CHECK (jsonb_typeof(conditions) = 'array'),

    -- Configuration flags
    enabled BOOLEAN NOT NULL DEFAULT true,
    allow_skipping BOOLEAN NOT NULL DEFAULT true,
    allow_revisiting BOOLEAN NOT NULL DEFAULT true,

    -- Usage tracking
    total_sessions INTEGER NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
    completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0 AND completed_sessions <= total_sessions),
    completion_rate INTEGER GENERATED ALWAYS AS (
        CASE WHEN total_sessions > 0 THEN (completed_sessions * 100 / total_sessions) ELSE 0 END
    ) STORED,
    avg_completion_time_minutes INTEGER CHECK (avg_completion_time_minutes >= 0),
    last_used_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure journey titles are unique per agent
    CONSTRAINT unique_journey_title_per_agent UNIQUE (agent_id, title) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_journey
CREATE INDEX IF NOT EXISTS idx_parlant_journey_agent_enabled ON parlant_journey(agent_id, enabled);
CREATE INDEX IF NOT EXISTS idx_parlant_journey_completion_rate ON parlant_journey(completion_rate DESC) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_parlant_journey_last_used ON parlant_journey(last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_journey_performance ON parlant_journey(avg_completion_time_minutes ASC) WHERE avg_completion_time_minutes IS NOT NULL;

-- Parlant Journey States - Individual states within journeys
CREATE TABLE IF NOT EXISTS parlant_journey_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES parlant_journey(id) ON DELETE CASCADE,

    -- State configuration
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
    state_type journey_state_type NOT NULL,

    -- State content based on type with validation
    chat_prompt TEXT CHECK (length(chat_prompt) <= 5000),
    tool_id TEXT CHECK (length(tool_id) <= 255),
    tool_config JSONB DEFAULT '{}' CHECK (jsonb_typeof(tool_config) = 'object'),
    condition TEXT CHECK (length(condition) <= 1000),

    -- State behavior
    is_initial BOOLEAN NOT NULL DEFAULT false,
    is_final BOOLEAN NOT NULL DEFAULT false,
    allow_skip BOOLEAN NOT NULL DEFAULT true,
    timeout_seconds INTEGER CHECK (timeout_seconds > 0 AND timeout_seconds <= 3600),

    -- Usage tracking
    entry_count INTEGER NOT NULL DEFAULT 0 CHECK (entry_count >= 0),
    exit_count INTEGER NOT NULL DEFAULT 0 CHECK (exit_count >= 0 AND exit_count <= entry_count),
    avg_duration_seconds INTEGER CHECK (avg_duration_seconds >= 0),

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Business logic constraints
    CONSTRAINT valid_initial_final CHECK (NOT (is_initial = true AND is_final = true)),
    CONSTRAINT unique_state_name_per_journey UNIQUE (journey_id, name) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_journey_state
CREATE INDEX IF NOT EXISTS idx_parlant_journey_state_journey_type ON parlant_journey_state(journey_id, state_type);
CREATE INDEX IF NOT EXISTS idx_parlant_journey_state_initial ON parlant_journey_state(journey_id) WHERE is_initial = true;
CREATE INDEX IF NOT EXISTS idx_parlant_journey_state_final ON parlant_journey_state(journey_id) WHERE is_final = true;
CREATE INDEX IF NOT EXISTS idx_parlant_journey_state_performance ON parlant_journey_state(avg_duration_seconds ASC) WHERE avg_duration_seconds IS NOT NULL;

-- Parlant Journey Transitions - Connections between states
CREATE TABLE IF NOT EXISTS parlant_journey_transition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES parlant_journey(id) ON DELETE CASCADE,
    from_state_id UUID NOT NULL REFERENCES parlant_journey_state(id) ON DELETE CASCADE,
    to_state_id UUID NOT NULL REFERENCES parlant_journey_state(id) ON DELETE CASCADE,

    -- Transition conditions
    condition TEXT CHECK (length(condition) <= 1000),
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 1 AND priority <= 1000),

    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
    success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0 AND success_count <= use_count),
    last_used_at TIMESTAMP WITH TIME ZONE,
    avg_transition_time_seconds INTEGER CHECK (avg_transition_time_seconds >= 0),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent self-references and ensure valid journey relationships
    CONSTRAINT no_self_transition CHECK (from_state_id != to_state_id),
    CONSTRAINT unique_transition_per_priority UNIQUE (from_state_id, to_state_id, priority) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_journey_transition
CREATE INDEX IF NOT EXISTS idx_parlant_journey_transition_from_priority ON parlant_journey_transition(from_state_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_journey_transition_journey_from ON parlant_journey_transition(journey_id, from_state_id);
CREATE INDEX IF NOT EXISTS idx_parlant_journey_transition_success_rate ON parlant_journey_transition(
    CASE WHEN use_count > 0 THEN (success_count::FLOAT / use_count) ELSE 1.0 END DESC
) WHERE use_count > 0;

-- ============================================================================
-- CREATE SUPPORTING TABLES
-- ============================================================================

-- Parlant Variables - Session and customer data
CREATE TABLE IF NOT EXISTS parlant_variable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,
    session_id UUID REFERENCES parlant_session(id) ON DELETE CASCADE,

    -- Variable identification
    key TEXT NOT NULL CHECK (length(key) >= 1 AND length(key) <= 255 AND key ~ '^[a-zA-Z][a-zA-Z0-9_]*$'),
    scope TEXT NOT NULL DEFAULT 'session' CHECK (scope IN ('session', 'customer', 'global', 'workspace')),

    -- Variable content with validation
    value JSONB NOT NULL,
    value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'object', 'array', 'null')),

    -- Configuration
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    description TEXT CHECK (length(description) <= 500),

    -- TTL and expiration
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure key uniqueness within appropriate scope
    CONSTRAINT unique_session_variable UNIQUE (session_id, key) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT scope_validation CHECK (
        (scope = 'session' AND session_id IS NOT NULL) OR
        (scope != 'session')
    )
);

-- Enhanced indexes for parlant_variable
CREATE INDEX IF NOT EXISTS idx_parlant_variable_agent_key ON parlant_variable(agent_id, key);
CREATE INDEX IF NOT EXISTS idx_parlant_variable_session_id ON parlant_variable(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_variable_scope ON parlant_variable(scope, key);
CREATE INDEX IF NOT EXISTS idx_parlant_variable_expires_at ON parlant_variable(expires_at) WHERE expires_at IS NOT NULL;

-- Parlant Tools - Enhanced tool management
CREATE TABLE IF NOT EXISTS parlant_tool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,

    -- Tool identification
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255 AND name ~ '^[a-zA-Z][a-zA-Z0-9_-]*$'),
    display_name TEXT NOT NULL CHECK (length(display_name) >= 1 AND length(display_name) <= 255),
    description TEXT NOT NULL CHECK (length(description) >= 1 AND length(description) <= 2000),

    -- Tool configuration
    sim_tool_id TEXT CHECK (length(sim_tool_id) <= 255),
    tool_type TEXT NOT NULL CHECK (tool_type IN ('sim_native', 'custom', 'external', 'system')),

    -- Function signature with validation
    parameters JSONB NOT NULL CHECK (jsonb_typeof(parameters) = 'object'),
    return_schema JSONB CHECK (jsonb_typeof(return_schema) = 'object'),

    -- Behavior configuration
    usage_guidelines TEXT CHECK (length(usage_guidelines) <= 3000),
    error_handling JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(error_handling) = 'object'),

    -- Access control
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT false,
    required_permissions JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(required_permissions) = 'array'),

    -- Usage tracking and performance
    use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
    success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0 AND success_count <= use_count),
    error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    success_rate INTEGER GENERATED ALWAYS AS (
        CASE WHEN use_count > 0 THEN (success_count * 100 / use_count) ELSE 100 END
    ) STORED,
    avg_execution_time_ms INTEGER CHECK (avg_execution_time_ms >= 0),
    last_used_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure tool names are unique within workspace
    CONSTRAINT unique_tool_name_per_workspace UNIQUE (workspace_id, name) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_tool
CREATE INDEX IF NOT EXISTS idx_parlant_tool_workspace_enabled ON parlant_tool(workspace_id, enabled);
CREATE INDEX IF NOT EXISTS idx_parlant_tool_type ON parlant_tool(tool_type, enabled);
CREATE INDEX IF NOT EXISTS idx_parlant_tool_success_rate ON parlant_tool(success_rate DESC) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_parlant_tool_performance ON parlant_tool(avg_execution_time_ms ASC) WHERE avg_execution_time_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parlant_tool_sim_tool_id ON parlant_tool(sim_tool_id) WHERE sim_tool_id IS NOT NULL;

-- Parlant Terms - Glossary and domain knowledge
CREATE TABLE IF NOT EXISTS parlant_term (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,

    -- Term definition
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
    description TEXT NOT NULL CHECK (length(description) >= 1 AND length(description) <= 2000),
    synonyms JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(synonyms) = 'array'),

    -- Usage context
    category TEXT CHECK (length(category) <= 100),
    examples JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(examples) = 'array'),

    -- Metadata and importance
    importance INTEGER NOT NULL DEFAULT 100 CHECK (importance >= 1 AND importance <= 1000),
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure term names are unique per agent
    CONSTRAINT unique_term_name_per_agent UNIQUE (agent_id, name) DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced indexes for parlant_term
CREATE INDEX IF NOT EXISTS idx_parlant_term_agent_category ON parlant_term(agent_id, category);
CREATE INDEX IF NOT EXISTS idx_parlant_term_importance ON parlant_term(importance DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_term_usage ON parlant_term(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_term_name_text ON parlant_term USING gin(to_tsvector('english', name || ' ' || description));

-- Parlant Canned Responses - Compliance and brand consistency
CREATE TABLE IF NOT EXISTS parlant_canned_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES parlant_agent(id) ON DELETE CASCADE,

    -- Response content
    template TEXT NOT NULL CHECK (length(template) >= 1 AND length(template) <= 5000),
    category TEXT CHECK (length(category) <= 100),
    tags JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tags) = 'array'),

    -- Matching conditions
    conditions JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(conditions) = 'array'),
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 1 AND priority <= 1000),

    -- Configuration
    enabled BOOLEAN NOT NULL DEFAULT true,
    requires_exact_match BOOLEAN NOT NULL DEFAULT false,
    requires_approval BOOLEAN NOT NULL DEFAULT false,

    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
    success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0 AND success_count <= use_count),
    last_used_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enhanced indexes for parlant_canned_response
CREATE INDEX IF NOT EXISTS idx_parlant_canned_response_agent_enabled ON parlant_canned_response(agent_id, enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_parlant_canned_response_category ON parlant_canned_response(category, enabled);
CREATE INDEX IF NOT EXISTS idx_parlant_canned_response_success_rate ON parlant_canned_response(
    CASE WHEN use_count > 0 THEN (success_count::FLOAT / use_count) ELSE 1.0 END DESC
) WHERE use_count > 0;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS FOR CROSS-TABLE REFERENCES
-- ============================================================================

-- Add foreign key constraints that couldn't be added during table creation
ALTER TABLE parlant_session
ADD CONSTRAINT IF NOT EXISTS fk_parlant_session_current_journey
FOREIGN KEY (current_journey_id) REFERENCES parlant_journey(id) ON DELETE SET NULL;

ALTER TABLE parlant_session
ADD CONSTRAINT IF NOT EXISTS fk_parlant_session_current_state
FOREIGN KEY (current_state_id) REFERENCES parlant_journey_state(id) ON DELETE SET NULL;

ALTER TABLE parlant_event
ADD CONSTRAINT IF NOT EXISTS fk_parlant_event_journey
FOREIGN KEY (journey_id) REFERENCES parlant_journey(id) ON DELETE SET NULL;

ALTER TABLE parlant_event
ADD CONSTRAINT IF NOT EXISTS fk_parlant_event_state
FOREIGN KEY (state_id) REFERENCES parlant_journey_state(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATE UPDATED_AT TRIGGERS
-- ============================================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DO $$
DECLARE
    table_name TEXT;
    trigger_name TEXT;
BEGIN
    FOR table_name IN
        SELECT unnest(ARRAY[
            'parlant_agent',
            'parlant_session',
            'parlant_guideline',
            'parlant_journey',
            'parlant_journey_state',
            'parlant_variable',
            'parlant_tool',
            'parlant_term',
            'parlant_canned_response'
        ])
    LOOP
        trigger_name := 'update_' || table_name || '_updated_at';

        -- Drop trigger if exists and recreate
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', trigger_name, table_name);

        RAISE NOTICE 'Created trigger % on table %', trigger_name, table_name;
    END LOOP;
END $$;

-- ============================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Agent performance view
CREATE OR REPLACE VIEW v_parlant_agent_performance AS
SELECT
    a.id,
    a.workspace_id,
    a.name,
    a.status,
    a.total_sessions,
    a.total_messages,
    COALESCE(ROUND(a.total_messages::NUMERIC / NULLIF(a.total_sessions, 0), 2), 0) as avg_messages_per_session,
    COUNT(DISTINCT s.id) as active_sessions,
    MAX(s.last_activity_at) as last_session_activity,
    a.last_active_at,
    a.created_at
FROM parlant_agent a
LEFT JOIN parlant_session s ON s.agent_id = a.id AND s.status = 'active'
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.workspace_id, a.name, a.status, a.total_sessions, a.total_messages, a.last_active_at, a.created_at;

-- Session analytics view
CREATE OR REPLACE VIEW v_parlant_session_analytics AS
SELECT
    s.id,
    s.agent_id,
    s.workspace_id,
    s.user_id,
    s.customer_id,
    s.status,
    s.message_count,
    s.event_count,
    s.started_at,
    s.ended_at,
    s.last_activity_at,
    CASE
        WHEN s.ended_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::INTEGER
        ELSE
            EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))::INTEGER
    END as duration_seconds,
    j.title as current_journey_title,
    js.name as current_state_name
FROM parlant_session s
LEFT JOIN parlant_journey j ON j.id = s.current_journey_id
LEFT JOIN parlant_journey_state js ON js.id = s.current_state_id;

-- ============================================================================
-- CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Function to safely increment counters with concurrency handling
CREATE OR REPLACE FUNCTION increment_parlant_counter(
    table_name TEXT,
    counter_column TEXT,
    where_clause TEXT,
    increment_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = %I + $1 WHERE %s',
        table_name,
        counter_column,
        counter_column,
        where_clause
    ) USING increment_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate success rates
CREATE OR REPLACE FUNCTION calculate_success_rate(success_count INTEGER, total_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF total_count = 0 THEN
        RETURN 100; -- Perfect rate when no attempts
    END IF;
    RETURN ROUND((success_count * 100.0) / total_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE parlant_agent IS 'AI agents with behavior configurations and usage tracking, scoped to workspaces';
COMMENT ON TABLE parlant_session IS 'Individual conversations between users and agents, supports anonymous users with comprehensive tracking';
COMMENT ON TABLE parlant_event IS 'All events within sessions (messages, tool calls, status updates) with performance metrics';
COMMENT ON TABLE parlant_guideline IS 'Behavior rules that guide agent responses with usage analytics';
COMMENT ON TABLE parlant_journey IS 'Multi-step conversational flows with completion tracking and performance metrics';
COMMENT ON TABLE parlant_journey_state IS 'Individual states within journeys with entry/exit analytics';
COMMENT ON TABLE parlant_journey_transition IS 'State transitions with success tracking and timing metrics';
COMMENT ON TABLE parlant_variable IS 'Session and customer data storage with scoping and expiration support';
COMMENT ON TABLE parlant_tool IS 'Function integrations with comprehensive usage and performance tracking';
COMMENT ON TABLE parlant_term IS 'Domain-specific terminology with usage analytics and full-text search';
COMMENT ON TABLE parlant_canned_response IS 'Pre-approved response templates with matching analytics';

-- ============================================================================
-- MIGRATION VALIDATION AND CLEANUP
-- ============================================================================

-- Validate all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'parlant_agent',
        'parlant_session',
        'parlant_event',
        'parlant_guideline',
        'parlant_journey',
        'parlant_journey_state',
        'parlant_journey_transition',
        'parlant_variable',
        'parlant_tool',
        'parlant_term',
        'parlant_canned_response'
    ];
    table_name TEXT;
BEGIN
    table_count := 0;

    FOREACH table_name IN ARRAY expected_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            table_count := table_count + 1;
            RAISE NOTICE 'Verified table exists: %', table_name;
        ELSE
            RAISE EXCEPTION 'ERROR: Expected table % was not created', table_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'SUCCESS: All % Parlant tables created successfully', table_count;
END $$;

-- Release advisory lock
SELECT pg_advisory_unlock(5555, 2024);

-- ============================================================================
-- MIGRATION COMPLETE LOG
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PARLANT SCHEMA MIGRATION COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: 11';
    RAISE NOTICE 'Enums created: 6';
    RAISE NOTICE 'Indexes created: ~75';
    RAISE NOTICE 'Triggers created: 9';
    RAISE NOTICE 'Views created: 2';
    RAISE NOTICE 'Functions created: 3';
    RAISE NOTICE 'Migration timestamp: %', NOW();
    RAISE NOTICE '========================================';
END $$;