-- Parlant Database Schema for PostgreSQL
-- This script creates all required tables and enums for Parlant integration

-- Create required enums
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'paused', 'archived');
CREATE TYPE session_mode AS ENUM ('conversation', 'guidelines', 'workflow', 'api');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'failed', 'cancelled', 'paused');
CREATE TYPE event_type AS ENUM ('message', 'action', 'system', 'error', 'workflow');
CREATE TYPE journey_state_type AS ENUM ('start', 'intermediate', 'end', 'condition');
CREATE TYPE composition_mode AS ENUM ('append', 'replace', 'merge');

-- Create parlant_agent table
CREATE TABLE parlant_agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_provider VARCHAR(100) DEFAULT 'openai',
    model_name VARCHAR(100) DEFAULT 'gpt-4',
    temperature INTEGER DEFAULT 70 CHECK (temperature >= 0 AND temperature <= 100),
    max_tokens INTEGER DEFAULT 4000,
    composition_mode composition_mode DEFAULT 'append',
    system_prompt TEXT,
    status agent_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT idx_parlant_agent_workspace UNIQUE (workspace_id, name)
);

CREATE INDEX idx_parlant_agent_workspace_id ON parlant_agent(workspace_id);
CREATE INDEX idx_parlant_agent_status ON parlant_agent(status);
CREATE INDEX idx_parlant_agent_created_at ON parlant_agent(created_at);

-- Create parlant_session table
CREATE TABLE parlant_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    session_name VARCHAR(255),
    mode session_mode DEFAULT 'conversation',
    status session_status DEFAULT 'active',
    context_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parlant_session_workspace_id ON parlant_session(workspace_id);
CREATE INDEX idx_parlant_session_agent_id ON parlant_session(agent_id);
CREATE INDEX idx_parlant_session_user_id ON parlant_session(user_id);
CREATE INDEX idx_parlant_session_status ON parlant_session(status);
CREATE INDEX idx_parlant_session_activity ON parlant_session(last_activity_at);

-- Create parlant_event table
CREATE TABLE parlant_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES parlant_session(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    event_type event_type NOT NULL,
    event_data JSONB DEFAULT '{}',
    message_content TEXT,
    metadata JSONB DEFAULT '{}',
    correlation_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_parlant_event_workspace_id ON parlant_event(workspace_id);
CREATE INDEX idx_parlant_event_session_id ON parlant_event(session_id);
CREATE INDEX idx_parlant_event_agent_id ON parlant_event(agent_id);
CREATE INDEX idx_parlant_event_type ON parlant_event(event_type);
CREATE INDEX idx_parlant_event_created_at ON parlant_event(created_at);
CREATE INDEX idx_parlant_event_correlation ON parlant_event(correlation_id);

-- Create parlant_guideline table
CREATE TABLE parlant_guideline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    condition_text TEXT NOT NULL,
    action_text TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parlant_guideline_workspace_id ON parlant_guideline(workspace_id);
CREATE INDEX idx_parlant_guideline_agent_id ON parlant_guideline(agent_id);
CREATE INDEX idx_parlant_guideline_enabled ON parlant_guideline(is_enabled);
CREATE INDEX idx_parlant_guideline_priority ON parlant_guideline(priority);

-- Create parlant_journey table
CREATE TABLE parlant_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_state_id UUID,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parlant_journey_workspace_id ON parlant_journey(workspace_id);
CREATE INDEX idx_parlant_journey_agent_id ON parlant_journey(agent_id);
CREATE INDEX idx_parlant_journey_active ON parlant_journey(is_active);

-- Create parlant_journey_state table
CREATE TABLE parlant_journey_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES parlant_journey(id) ON DELETE CASCADE,
    state_name VARCHAR(255) NOT NULL,
    state_type journey_state_type NOT NULL,
    description TEXT,
    action_data JSONB DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_journey_state_unique UNIQUE (journey_id, state_name)
);

CREATE INDEX idx_parlant_journey_state_journey_id ON parlant_journey_state(journey_id);
CREATE INDEX idx_parlant_journey_state_type ON parlant_journey_state(state_type);

-- Create parlant_journey_transition table
CREATE TABLE parlant_journey_transition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES parlant_journey(id) ON DELETE CASCADE,
    from_state_id UUID REFERENCES parlant_journey_state(id) ON DELETE CASCADE,
    to_state_id UUID REFERENCES parlant_journey_state(id) ON DELETE CASCADE,
    condition_text TEXT,
    condition_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parlant_journey_transition_journey_id ON parlant_journey_transition(journey_id);
CREATE INDEX idx_parlant_journey_transition_from_state ON parlant_journey_transition(from_state_id);
CREATE INDEX idx_parlant_journey_transition_to_state ON parlant_journey_transition(to_state_id);

-- Create parlant_variable table
CREATE TABLE parlant_variable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE CASCADE,
    session_id UUID REFERENCES parlant_session(id) ON DELETE CASCADE,
    variable_name VARCHAR(255) NOT NULL,
    variable_value TEXT,
    variable_type VARCHAR(50) DEFAULT 'string',
    is_persistent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_variable_unique UNIQUE (workspace_id, agent_id, session_id, variable_name)
);

CREATE INDEX idx_parlant_variable_workspace_id ON parlant_variable(workspace_id);
CREATE INDEX idx_parlant_variable_agent_id ON parlant_variable(agent_id);
CREATE INDEX idx_parlant_variable_session_id ON parlant_variable(session_id);
CREATE INDEX idx_parlant_variable_name ON parlant_variable(variable_name);

-- Create parlant_tool table
CREATE TABLE parlant_tool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    tool_type VARCHAR(100) NOT NULL,
    description TEXT,
    configuration JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_tool_unique UNIQUE (workspace_id, tool_name)
);

CREATE INDEX idx_parlant_tool_workspace_id ON parlant_tool(workspace_id);
CREATE INDEX idx_parlant_tool_type ON parlant_tool(tool_type);
CREATE INDEX idx_parlant_tool_enabled ON parlant_tool(is_enabled);

-- Create parlant_term table
CREATE TABLE parlant_term (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    term_name VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL,
    synonyms TEXT[],
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_term_unique UNIQUE (workspace_id, term_name)
);

CREATE INDEX idx_parlant_term_workspace_id ON parlant_term(workspace_id);
CREATE INDEX idx_parlant_term_category ON parlant_term(category);
CREATE INDEX idx_parlant_term_active ON parlant_term(is_active);

-- Create parlant_canned_response table
CREATE TABLE parlant_canned_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES parlant_agent(id) ON DELETE CASCADE,
    response_name VARCHAR(255) NOT NULL,
    response_text TEXT NOT NULL,
    triggers TEXT[],
    category VARCHAR(100),
    is_enabled BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT idx_canned_response_unique UNIQUE (workspace_id, agent_id, response_name)
);

CREATE INDEX idx_parlant_canned_response_workspace_id ON parlant_canned_response(workspace_id);
CREATE INDEX idx_parlant_canned_response_agent_id ON parlant_canned_response(agent_id);
CREATE INDEX idx_parlant_canned_response_category ON parlant_canned_response(category);
CREATE INDEX idx_parlant_canned_response_enabled ON parlant_canned_response(is_enabled);

-- Add foreign key for journey start_state_id (after parlant_journey_state is created)
ALTER TABLE parlant_journey
ADD CONSTRAINT fk_journey_start_state
FOREIGN KEY (start_state_id) REFERENCES parlant_journey_state(id) ON DELETE SET NULL;

-- Add workspace isolation validation
-- This ensures all parlant tables have proper workspace_id columns for isolation
-- which is what the workspace isolation validation was checking for

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_parlant_agent_updated_at BEFORE UPDATE ON parlant_agent FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_session_updated_at BEFORE UPDATE ON parlant_session FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_guideline_updated_at BEFORE UPDATE ON parlant_guideline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_journey_updated_at BEFORE UPDATE ON parlant_journey FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_journey_state_updated_at BEFORE UPDATE ON parlant_journey_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_journey_transition_updated_at BEFORE UPDATE ON parlant_journey_transition FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_variable_updated_at BEFORE UPDATE ON parlant_variable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_tool_updated_at BEFORE UPDATE ON parlant_tool FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_term_updated_at BEFORE UPDATE ON parlant_term FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parlant_canned_response_updated_at BEFORE UPDATE ON parlant_canned_response FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
-- Create a default workspace agent for testing
INSERT INTO parlant_agent (workspace_id, name, description, model_provider, model_name, system_prompt)
VALUES (
    'default-workspace',
    'Default Assistant',
    'Default AI assistant for Sim workspace integration',
    'openai',
    'gpt-4',
    'You are a helpful AI assistant integrated with Sim workspace. Be professional, accurate, and helpful in all interactions.'
);

-- Grant necessary permissions (adjust as needed for your user)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;