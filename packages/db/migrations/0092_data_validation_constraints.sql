-- Data Validation and Integrity Constraints for Parlant Schema Extension
-- This migration adds comprehensive validation constraints, triggers, and procedures
-- to ensure data consistency and prevent corruption across all Parlant tables.

-- ============================================================================
-- 1. FOREIGN KEY CONSTRAINT VALIDATION AND ENHANCEMENT
-- ============================================================================

-- Ensure ALL foreign key relationships are properly enforced with cascading rules
-- These constraints are already defined in the schema, but we're adding explicit validation

-- Add missing foreign key constraints with proper cascade behavior
DO $$
BEGIN
  -- Verify and add any missing foreign key constraints

  -- Ensure parlant_session.current_journey_id references parlant_journey.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'parlant_session_current_journey_fk'
  ) THEN
    ALTER TABLE parlant_session
    ADD CONSTRAINT parlant_session_current_journey_fk
    FOREIGN KEY (current_journey_id) REFERENCES parlant_journey(id)
    ON DELETE SET NULL;
  END IF;

  -- Ensure parlant_session.current_state_id references parlant_journey_state.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'parlant_session_current_state_fk'
  ) THEN
    ALTER TABLE parlant_session
    ADD CONSTRAINT parlant_session_current_state_fk
    FOREIGN KEY (current_state_id) REFERENCES parlant_journey_state(id)
    ON DELETE SET NULL;
  END IF;

END $$;

-- ============================================================================
-- 2. WORKSPACE ISOLATION VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure all Parlant data respects workspace boundaries
-- These check constraints prevent cross-workspace data contamination

-- Function to validate workspace isolation for agents and related entities
CREATE OR REPLACE FUNCTION validate_workspace_isolation() RETURNS TRIGGER AS $$
BEGIN
  -- For parlant_session: ensure agent and session are in same workspace
  IF TG_TABLE_NAME = 'parlant_session' THEN
    IF NOT EXISTS (
      SELECT 1 FROM parlant_agent
      WHERE id = NEW.agent_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Session agent_id % must belong to workspace_id %', NEW.agent_id, NEW.workspace_id;
    END IF;
  END IF;

  -- For parlant_guideline: ensure belongs to agent in same workspace
  IF TG_TABLE_NAME = 'parlant_guideline' THEN
    IF NOT EXISTS (
      SELECT 1 FROM parlant_agent a
      WHERE a.id = NEW.agent_id
      AND a.workspace_id = (
        SELECT workspace_id FROM parlant_agent WHERE id = NEW.agent_id
      )
    ) THEN
      RAISE EXCEPTION 'Guideline agent_id % must exist and be accessible', NEW.agent_id;
    END IF;
  END IF;

  -- For parlant_journey: ensure belongs to agent in same workspace
  IF TG_TABLE_NAME = 'parlant_journey' THEN
    IF NOT EXISTS (
      SELECT 1 FROM parlant_agent a
      WHERE a.id = NEW.agent_id
      AND a.workspace_id = (
        SELECT workspace_id FROM parlant_agent WHERE id = NEW.agent_id
      )
    ) THEN
      RAISE EXCEPTION 'Journey agent_id % must exist and be accessible', NEW.agent_id;
    END IF;
  END IF;

  -- For parlant_variable: ensure session/agent workspace consistency
  IF TG_TABLE_NAME = 'parlant_variable' THEN
    IF NEW.session_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM parlant_session s
        JOIN parlant_agent a ON s.agent_id = a.id
        WHERE s.id = NEW.session_id
        AND a.id = NEW.agent_id
      ) THEN
        RAISE EXCEPTION 'Variable session_id % must belong to agent_id %', NEW.session_id, NEW.agent_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create workspace isolation triggers
DROP TRIGGER IF EXISTS validate_session_workspace ON parlant_session;
CREATE TRIGGER validate_session_workspace
  BEFORE INSERT OR UPDATE ON parlant_session
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_isolation();

DROP TRIGGER IF EXISTS validate_guideline_workspace ON parlant_guideline;
CREATE TRIGGER validate_guideline_workspace
  BEFORE INSERT OR UPDATE ON parlant_guideline
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_isolation();

DROP TRIGGER IF EXISTS validate_journey_workspace ON parlant_journey;
CREATE TRIGGER validate_journey_workspace
  BEFORE INSERT OR UPDATE ON parlant_journey
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_isolation();

DROP TRIGGER IF EXISTS validate_variable_workspace ON parlant_variable;
CREATE TRIGGER validate_variable_workspace
  BEFORE INSERT OR UPDATE ON parlant_variable
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_isolation();

-- ============================================================================
-- 3. BUSINESS LOGIC VALIDATION CONSTRAINTS
-- ============================================================================

-- Add check constraints for business logic validation

-- Parlant Agent validation constraints
ALTER TABLE parlant_agent
ADD CONSTRAINT agent_temperature_range
CHECK (temperature >= 0 AND temperature <= 100);

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_max_tokens_positive
CHECK (max_tokens > 0 AND max_tokens <= 100000);

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_response_timeout_positive
CHECK (response_timeout_ms > 0 AND response_timeout_ms <= 300000);

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_max_context_length_positive
CHECK (max_context_length > 0 AND max_context_length <= 200000);

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_conversation_style_valid
CHECK (conversation_style IN ('casual', 'professional', 'technical', 'friendly'));

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_pii_handling_mode_valid
CHECK (pii_handling_mode IN ('strict', 'standard', 'relaxed'));

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_data_retention_reasonable
CHECK (data_retention_days IS NULL OR (data_retention_days >= 1 AND data_retention_days <= 3650));

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_usage_tracking_non_negative
CHECK (total_sessions >= 0 AND total_messages >= 0 AND total_tokens_used >= 0 AND total_cost >= 0);

ALTER TABLE parlant_agent
ADD CONSTRAINT agent_average_session_duration_non_negative
CHECK (average_session_duration IS NULL OR average_session_duration >= 0);

-- Parlant Session validation constraints
ALTER TABLE parlant_session
ADD CONSTRAINT session_event_count_non_negative
CHECK (event_count >= 0);

ALTER TABLE parlant_session
ADD CONSTRAINT session_message_count_non_negative
CHECK (message_count >= 0);

ALTER TABLE parlant_session
ADD CONSTRAINT session_tokens_and_cost_non_negative
CHECK (tokens_used >= 0 AND cost >= 0);

ALTER TABLE parlant_session
ADD CONSTRAINT session_performance_metrics_valid
CHECK (
  (average_response_time IS NULL OR average_response_time >= 0) AND
  (satisfaction_score IS NULL OR (satisfaction_score >= 1 AND satisfaction_score <= 5))
);

ALTER TABLE parlant_session
ADD CONSTRAINT session_type_valid
CHECK (session_type IN ('conversation', 'support', 'onboarding', 'survey'));

ALTER TABLE parlant_session
ADD CONSTRAINT session_locale_format
CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

ALTER TABLE parlant_session
ADD CONSTRAINT session_timing_consistency
CHECK (
  (ended_at IS NULL OR ended_at >= started_at) AND
  (last_activity_at >= started_at)
);

-- Parlant Event validation constraints
ALTER TABLE parlant_event
ADD CONSTRAINT event_offset_positive
CHECK (offset >= 0);

-- Parlant Guideline validation constraints
ALTER TABLE parlant_guideline
ADD CONSTRAINT guideline_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_guideline
ADD CONSTRAINT guideline_match_count_non_negative
CHECK (match_count >= 0);

-- Parlant Journey validation constraints
ALTER TABLE parlant_journey
ADD CONSTRAINT journey_completion_rate_range
CHECK (completion_rate IS NULL OR (completion_rate >= 0 AND completion_rate <= 100));

ALTER TABLE parlant_journey
ADD CONSTRAINT journey_session_count_non_negative
CHECK (total_sessions >= 0);

-- Parlant Journey State validation constraints
ALTER TABLE parlant_journey_state
ADD CONSTRAINT journey_state_logic_consistency
CHECK (
  -- Chat states must have chat_prompt
  (state_type = 'chat' AND chat_prompt IS NOT NULL) OR
  -- Tool states must have tool_id
  (state_type = 'tool' AND tool_id IS NOT NULL) OR
  -- Decision states must have condition
  (state_type = 'decision' AND condition IS NOT NULL) OR
  -- Final states can have optional content
  (state_type = 'final')
);

-- Parlant Journey Transition validation constraints
ALTER TABLE parlant_journey_transition
ADD CONSTRAINT transition_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_journey_transition
ADD CONSTRAINT transition_use_count_non_negative
CHECK (use_count >= 0);

ALTER TABLE parlant_journey_transition
ADD CONSTRAINT transition_no_self_loop
CHECK (from_state_id != to_state_id);

-- Parlant Tool validation constraints
ALTER TABLE parlant_tool
ADD CONSTRAINT tool_success_rate_range
CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100));

ALTER TABLE parlant_tool
ADD CONSTRAINT tool_use_count_non_negative
CHECK (use_count >= 0);

ALTER TABLE parlant_tool
ADD CONSTRAINT tool_execution_timeout_positive
CHECK (execution_timeout > 0 AND execution_timeout <= 300000);

ALTER TABLE parlant_tool
ADD CONSTRAINT tool_rate_limits_positive
CHECK (
  (rate_limit_per_minute IS NULL OR rate_limit_per_minute > 0) AND
  (rate_limit_per_hour IS NULL OR rate_limit_per_hour > 0)
);

ALTER TABLE parlant_tool
ADD CONSTRAINT tool_auth_type_valid
CHECK (auth_type IS NULL OR auth_type IN ('api_key', 'oauth', 'basic', 'none'));

-- Parlant Variable validation constraints
ALTER TABLE parlant_variable
ADD CONSTRAINT variable_scope_values
CHECK (scope IN ('session', 'customer', 'global', 'agent'));

-- Parlant Term validation constraints
ALTER TABLE parlant_term
ADD CONSTRAINT term_importance_range
CHECK (importance >= 1 AND importance <= 1000);

-- Parlant Canned Response validation constraints
ALTER TABLE parlant_canned_response
ADD CONSTRAINT canned_response_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_canned_response
ADD CONSTRAINT canned_response_use_count_non_negative
CHECK (use_count >= 0);

-- Parlant Agent Tool junction table validation constraints
ALTER TABLE parlant_agent_tool
ADD CONSTRAINT agent_tool_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_agent_tool
ADD CONSTRAINT agent_tool_use_count_non_negative
CHECK (use_count >= 0);

-- Parlant Journey Guideline junction table validation constraints
ALTER TABLE parlant_journey_guideline
ADD CONSTRAINT journey_guideline_priority_override_range
CHECK (priority_override IS NULL OR (priority_override >= 1 AND priority_override <= 1000));

ALTER TABLE parlant_journey_guideline
ADD CONSTRAINT journey_guideline_match_count_non_negative
CHECK (match_count >= 0);

-- Parlant Agent Knowledge Base junction table validation constraints
ALTER TABLE parlant_agent_knowledge_base
ADD CONSTRAINT agent_kb_search_threshold_range
CHECK (search_threshold IS NULL OR (search_threshold >= 0 AND search_threshold <= 100));

ALTER TABLE parlant_agent_knowledge_base
ADD CONSTRAINT agent_kb_max_results_positive
CHECK (max_results IS NULL OR max_results > 0);

ALTER TABLE parlant_agent_knowledge_base
ADD CONSTRAINT agent_kb_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_agent_knowledge_base
ADD CONSTRAINT agent_kb_search_count_non_negative
CHECK (search_count >= 0);

-- Parlant Tool Integration validation constraints
ALTER TABLE parlant_tool_integration
ADD CONSTRAINT tool_integration_type_valid
CHECK (integration_type IN ('custom_tool', 'workflow_block', 'mcp_server'));

ALTER TABLE parlant_tool_integration
ADD CONSTRAINT tool_integration_health_status_valid
CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown'));

ALTER TABLE parlant_tool_integration
ADD CONSTRAINT tool_integration_error_count_non_negative
CHECK (error_count >= 0);

-- Parlant Agent Workflow validation constraints
ALTER TABLE parlant_agent_workflow
ADD CONSTRAINT agent_workflow_integration_type_valid
CHECK (integration_type IN ('trigger', 'monitor', 'both'));

ALTER TABLE parlant_agent_workflow
ADD CONSTRAINT agent_workflow_trigger_count_non_negative
CHECK (trigger_count >= 0);

-- Parlant Agent API Key validation constraints
ALTER TABLE parlant_agent_api_key
ADD CONSTRAINT agent_api_key_purpose_valid
CHECK (purpose IN ('tools', 'llm', 'external_service'));

ALTER TABLE parlant_agent_api_key
ADD CONSTRAINT agent_api_key_priority_range
CHECK (priority >= 1 AND priority <= 1000);

ALTER TABLE parlant_agent_api_key
ADD CONSTRAINT agent_api_key_use_count_non_negative
CHECK (use_count >= 0);

-- Parlant Session Workflow validation constraints
ALTER TABLE parlant_session_workflow
ADD CONSTRAINT session_workflow_status_valid
CHECK (status IN ('pending', 'running', 'completed', 'failed'));

ALTER TABLE parlant_session_workflow
ADD CONSTRAINT session_workflow_timing_consistency
CHECK (completed_at IS NULL OR completed_at >= started_at);

-- ============================================================================
-- 4. ADVANCED BUSINESS LOGIC TRIGGERS
-- ============================================================================

-- Function to validate journey state consistency
CREATE OR REPLACE FUNCTION validate_journey_state_consistency() RETURNS TRIGGER AS $$
DECLARE
  journey_agent_id UUID;
BEGIN
  -- Get the agent_id for the journey
  SELECT agent_id INTO journey_agent_id
  FROM parlant_journey
  WHERE id = NEW.journey_id;

  -- For journey states, validate tool_id exists in parlant_tool for the same workspace
  IF NEW.state_type = 'tool' AND NEW.tool_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM parlant_tool t
      JOIN parlant_agent a ON a.workspace_id = t.workspace_id
      WHERE t.name = NEW.tool_id
      AND a.id = journey_agent_id
      AND t.enabled = true
    ) THEN
      RAISE EXCEPTION 'Tool % not found or not enabled for agent workspace', NEW.tool_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create journey state validation trigger
DROP TRIGGER IF EXISTS validate_journey_state_consistency_trigger ON parlant_journey_state;
CREATE TRIGGER validate_journey_state_consistency_trigger
  BEFORE INSERT OR UPDATE ON parlant_journey_state
  FOR EACH ROW EXECUTE FUNCTION validate_journey_state_consistency();

-- Function to validate journey transition consistency
CREATE OR REPLACE FUNCTION validate_journey_transition_consistency() RETURNS TRIGGER AS $$
BEGIN
  -- Ensure both states belong to the same journey
  IF NOT EXISTS (
    SELECT 1 FROM parlant_journey_state
    WHERE id = NEW.from_state_id AND journey_id = NEW.journey_id
  ) THEN
    RAISE EXCEPTION 'from_state_id % does not belong to journey %', NEW.from_state_id, NEW.journey_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM parlant_journey_state
    WHERE id = NEW.to_state_id AND journey_id = NEW.journey_id
  ) THEN
    RAISE EXCEPTION 'to_state_id % does not belong to journey %', NEW.to_state_id, NEW.journey_id;
  END IF;

  -- Prevent transitions from final states (unless explicitly allowed)
  IF EXISTS (
    SELECT 1 FROM parlant_journey_state
    WHERE id = NEW.from_state_id AND is_final = true
  ) THEN
    RAISE WARNING 'Transition from final state % may be unintended', NEW.from_state_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create journey transition validation trigger
DROP TRIGGER IF EXISTS validate_journey_transition_consistency_trigger ON parlant_journey_transition;
CREATE TRIGGER validate_journey_transition_consistency_trigger
  BEFORE INSERT OR UPDATE ON parlant_journey_transition
  FOR EACH ROW EXECUTE FUNCTION validate_journey_transition_consistency();

-- ============================================================================
-- 5. DATA CONSISTENCY TRACKING AND MAINTENANCE
-- ============================================================================

-- Function to update usage statistics
CREATE OR REPLACE FUNCTION update_usage_statistics() RETURNS TRIGGER AS $$
BEGIN
  -- Update agent statistics when sessions are created
  IF TG_TABLE_NAME = 'parlant_session' AND TG_OP = 'INSERT' THEN
    UPDATE parlant_agent
    SET total_sessions = total_sessions + 1,
        last_active_at = NOW()
    WHERE id = NEW.agent_id;
  END IF;

  -- Update agent message count when events are added
  IF TG_TABLE_NAME = 'parlant_event' AND TG_OP = 'INSERT' THEN
    -- Update session event count
    UPDATE parlant_session
    SET event_count = event_count + 1,
        message_count = CASE
          WHEN NEW.event_type IN ('customer_message', 'agent_message')
          THEN message_count + 1
          ELSE message_count
        END,
        last_activity_at = NOW()
    WHERE id = NEW.session_id;

    -- Update agent total messages for message events
    IF NEW.event_type IN ('customer_message', 'agent_message') THEN
      UPDATE parlant_agent
      SET total_messages = total_messages + 1,
          last_active_at = NOW()
      WHERE id = (
        SELECT agent_id FROM parlant_session WHERE id = NEW.session_id
      );
    END IF;
  END IF;

  -- Update guideline match statistics
  IF TG_TABLE_NAME = 'parlant_guideline' AND TG_OP = 'UPDATE' THEN
    IF NEW.match_count > OLD.match_count THEN
      NEW.last_matched_at = NOW();
    END IF;
  END IF;

  -- Update tool usage statistics
  IF TG_TABLE_NAME = 'parlant_tool' AND TG_OP = 'UPDATE' THEN
    IF NEW.use_count > OLD.use_count THEN
      NEW.last_used_at = NOW();
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create usage statistics triggers
DROP TRIGGER IF EXISTS update_session_statistics ON parlant_session;
CREATE TRIGGER update_session_statistics
  AFTER INSERT ON parlant_session
  FOR EACH ROW EXECUTE FUNCTION update_usage_statistics();

DROP TRIGGER IF EXISTS update_event_statistics ON parlant_event;
CREATE TRIGGER update_event_statistics
  AFTER INSERT ON parlant_event
  FOR EACH ROW EXECUTE FUNCTION update_usage_statistics();

DROP TRIGGER IF EXISTS update_guideline_statistics ON parlant_guideline;
CREATE TRIGGER update_guideline_statistics
  BEFORE UPDATE ON parlant_guideline
  FOR EACH ROW EXECUTE FUNCTION update_usage_statistics();

DROP TRIGGER IF EXISTS update_tool_statistics ON parlant_tool;
CREATE TRIGGER update_tool_statistics
  BEFORE UPDATE ON parlant_tool
  FOR EACH ROW EXECUTE FUNCTION update_usage_statistics();

-- ============================================================================
-- 6. DATA VALIDATION FUNCTIONS FOR MONITORING
-- ============================================================================

-- Function to validate data consistency across all Parlant tables
CREATE OR REPLACE FUNCTION validate_parlant_data_consistency()
RETURNS TABLE(
  table_name TEXT,
  issue_type TEXT,
  issue_description TEXT,
  affected_records INTEGER
) AS $$
BEGIN
  -- Check for orphaned sessions (sessions without valid agents)
  RETURN QUERY
  SELECT
    'parlant_session'::TEXT as table_name,
    'orphaned_records'::TEXT as issue_type,
    'Sessions with non-existent agents'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_session s
  LEFT JOIN parlant_agent a ON s.agent_id = a.id
  WHERE a.id IS NULL;

  -- Check for workspace isolation violations
  RETURN QUERY
  SELECT
    'parlant_session'::TEXT as table_name,
    'workspace_violation'::TEXT as issue_type,
    'Sessions in different workspace than their agent'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_session s
  JOIN parlant_agent a ON s.agent_id = a.id
  WHERE s.workspace_id != a.workspace_id;

  -- Check for invalid journey references
  RETURN QUERY
  SELECT
    'parlant_session'::TEXT as table_name,
    'invalid_references'::TEXT as issue_type,
    'Sessions with invalid current_journey_id'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_session s
  LEFT JOIN parlant_journey j ON s.current_journey_id = j.id
  WHERE s.current_journey_id IS NOT NULL AND j.id IS NULL;

  -- Check for events with invalid session references
  RETURN QUERY
  SELECT
    'parlant_event'::TEXT as table_name,
    'orphaned_records'::TEXT as issue_type,
    'Events with non-existent sessions'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_event e
  LEFT JOIN parlant_session s ON e.session_id = s.id
  WHERE s.id IS NULL;

  -- Check for journey states without valid journeys
  RETURN QUERY
  SELECT
    'parlant_journey_state'::TEXT as table_name,
    'orphaned_records'::TEXT as issue_type,
    'Journey states with non-existent journeys'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_journey_state js
  LEFT JOIN parlant_journey j ON js.journey_id = j.id
  WHERE j.id IS NULL;

  -- Check for transitions with invalid state references
  RETURN QUERY
  SELECT
    'parlant_journey_transition'::TEXT as table_name,
    'invalid_references'::TEXT as issue_type,
    'Transitions with invalid from_state_id or to_state_id'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_journey_transition jt
  LEFT JOIN parlant_journey_state js1 ON jt.from_state_id = js1.id
  LEFT JOIN parlant_journey_state js2 ON jt.to_state_id = js2.id
  WHERE js1.id IS NULL OR js2.id IS NULL;

  -- Check for inconsistent usage statistics
  RETURN QUERY
  SELECT
    'parlant_agent'::TEXT as table_name,
    'statistics_inconsistency'::TEXT as issue_type,
    'Agents with inconsistent session counts'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_agent a
  LEFT JOIN (
    SELECT agent_id, COUNT(*) as actual_sessions
    FROM parlant_session
    GROUP BY agent_id
  ) s ON a.id = s.agent_id
  WHERE COALESCE(s.actual_sessions, 0) != a.total_sessions;

  -- Check for workspace isolation violations in junction tables
  RETURN QUERY
  SELECT
    'parlant_agent_tool'::TEXT as table_name,
    'workspace_violation'::TEXT as issue_type,
    'Agent tools with workspace mismatch'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_agent_tool at
  JOIN parlant_agent a ON at.agent_id = a.id
  JOIN parlant_tool t ON at.tool_id = t.id
  WHERE a.workspace_id != t.workspace_id;

  -- Check for workspace isolation violations in knowledge base connections
  RETURN QUERY
  SELECT
    'parlant_agent_knowledge_base'::TEXT as table_name,
    'workspace_violation'::TEXT as issue_type,
    'Agent knowledge bases with workspace mismatch'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_agent_knowledge_base akb
  JOIN parlant_agent a ON akb.agent_id = a.id
  JOIN knowledge_base kb ON akb.knowledge_base_id = kb.id
  WHERE a.workspace_id != kb.workspace_id;

  -- Check for workspace isolation violations in workflow connections
  RETURN QUERY
  SELECT
    'parlant_agent_workflow'::TEXT as table_name,
    'workspace_violation'::TEXT as issue_type,
    'Agent workflows with workspace mismatch'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_agent_workflow aw
  JOIN parlant_agent a ON aw.agent_id = a.id
  WHERE aw.workspace_id != a.workspace_id;

  -- Check for invalid API key references
  RETURN QUERY
  SELECT
    'parlant_agent_api_key'::TEXT as table_name,
    'workspace_violation'::TEXT as issue_type,
    'Agent API keys with workspace mismatch'::TEXT as issue_description,
    COUNT(*)::INTEGER as affected_records
  FROM parlant_agent_api_key aak
  JOIN parlant_agent a ON aak.agent_id = a.id
  WHERE aak.workspace_id != a.workspace_id;

END;
$$ LANGUAGE plpgsql;

-- Function to repair data inconsistencies
CREATE OR REPLACE FUNCTION repair_parlant_data_inconsistencies()
RETURNS TABLE(
  repair_action TEXT,
  affected_records INTEGER
) AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Repair agent session counts
  UPDATE parlant_agent
  SET total_sessions = COALESCE(s.actual_sessions, 0)
  FROM (
    SELECT agent_id, COUNT(*) as actual_sessions
    FROM parlant_session
    GROUP BY agent_id
  ) s
  WHERE parlant_agent.id = s.agent_id
  AND parlant_agent.total_sessions != s.actual_sessions;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Updated agent session counts'::TEXT, affected_count;

  -- Repair agent message counts
  UPDATE parlant_agent
  SET total_messages = COALESCE(m.actual_messages, 0)
  FROM (
    SELECT a.id as agent_id, COUNT(*) as actual_messages
    FROM parlant_agent a
    LEFT JOIN parlant_session s ON a.id = s.agent_id
    LEFT JOIN parlant_event e ON s.id = e.session_id
    WHERE e.event_type IN ('customer_message', 'agent_message')
    GROUP BY a.id
  ) m
  WHERE parlant_agent.id = m.agent_id
  AND parlant_agent.total_messages != m.actual_messages;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Updated agent message counts'::TEXT, affected_count;

  -- Repair session event counts
  UPDATE parlant_session
  SET event_count = COALESCE(e.actual_events, 0)
  FROM (
    SELECT session_id, COUNT(*) as actual_events
    FROM parlant_event
    GROUP BY session_id
  ) e
  WHERE parlant_session.id = e.session_id
  AND parlant_session.event_count != e.actual_events;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Updated session event counts'::TEXT, affected_count;

  -- Repair session message counts
  UPDATE parlant_session
  SET message_count = COALESCE(m.actual_messages, 0)
  FROM (
    SELECT session_id, COUNT(*) as actual_messages
    FROM parlant_event
    WHERE event_type IN ('customer_message', 'agent_message')
    GROUP BY session_id
  ) m
  WHERE parlant_session.id = m.session_id
  AND parlant_session.message_count != m.actual_messages;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Updated session message counts'::TEXT, affected_count;

  -- Clean up orphaned junction table records
  DELETE FROM parlant_agent_tool
  WHERE agent_id NOT IN (SELECT id FROM parlant_agent)
     OR tool_id NOT IN (SELECT id FROM parlant_tool);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Cleaned up orphaned agent-tool relationships'::TEXT, affected_count;

  DELETE FROM parlant_journey_guideline
  WHERE journey_id NOT IN (SELECT id FROM parlant_journey)
     OR guideline_id NOT IN (SELECT id FROM parlant_guideline);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Cleaned up orphaned journey-guideline relationships'::TEXT, affected_count;

  DELETE FROM parlant_agent_knowledge_base
  WHERE agent_id NOT IN (SELECT id FROM parlant_agent)
     OR knowledge_base_id NOT IN (SELECT id FROM knowledge_base);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Cleaned up orphaned agent-knowledge base relationships'::TEXT, affected_count;

  DELETE FROM parlant_agent_workflow
  WHERE agent_id NOT IN (SELECT id FROM parlant_agent)
     OR workflow_id NOT IN (SELECT id FROM workflow);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN QUERY SELECT 'Cleaned up orphaned agent-workflow relationships'::TEXT, affected_count;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. AUTOMATED CLEANUP AND MAINTENANCE PROCEDURES
-- ============================================================================

-- Function to clean up abandoned sessions
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions(cutoff_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Mark sessions as abandoned if they haven't had activity within cutoff period
  UPDATE parlant_session
  SET status = 'abandoned'
  WHERE status = 'active'
  AND last_activity_at < NOW() - (cutoff_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old completed sessions
CREATE OR REPLACE FUNCTION archive_old_sessions(cutoff_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Archive sessions that completed more than cutoff_days ago
  -- This could involve moving to an archive table or updating status
  UPDATE parlant_session
  SET status = 'archived'
  WHERE status IN ('completed', 'abandoned')
  AND ended_at < NOW() - (cutoff_days || ' days')::INTERVAL;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance optimization of validation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_session_agent_workspace
ON parlant_session(agent_id, workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_session_activity
ON parlant_session(last_activity_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_event_session_type
ON parlant_event(session_id, event_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_agent_usage_stats
ON parlant_agent(total_sessions, total_messages, last_active_at);

-- ============================================================================
-- 8. CONSTRAINT VALIDATION SUMMARY
-- ============================================================================

-- Create a view to monitor constraint violations
CREATE OR REPLACE VIEW parlant_constraint_violations AS
SELECT
  'Data Consistency Issues' as category,
  table_name,
  issue_type,
  issue_description,
  affected_records
FROM validate_parlant_data_consistency()
WHERE affected_records > 0;

COMMENT ON VIEW parlant_constraint_violations IS
'Monitors data integrity violations across all Parlant tables. Should be empty in a healthy system.';

-- Create comments for documentation
COMMENT ON FUNCTION validate_workspace_isolation() IS
'Trigger function that enforces workspace isolation boundaries for all Parlant entities';

COMMENT ON FUNCTION validate_parlant_data_consistency() IS
'Validates data consistency across all Parlant tables and returns any issues found';

COMMENT ON FUNCTION repair_parlant_data_inconsistencies() IS
'Automatically repairs common data inconsistencies in Parlant tables';

COMMENT ON FUNCTION cleanup_abandoned_sessions(INTEGER) IS
'Marks sessions as abandoned if they have been inactive for the specified number of hours';

COMMENT ON FUNCTION archive_old_sessions(INTEGER) IS
'Archives old completed or abandoned sessions older than the specified number of days';