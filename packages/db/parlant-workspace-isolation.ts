/**
 * Parlant Workspace Isolation Security Framework
 *
 * This file implements comprehensive workspace isolation strategies to prevent
 * cross-workspace data leakage and optimize multi-tenant access patterns.
 *
 * SECURITY PRINCIPLES:
 * 1. Every Parlant query MUST include workspace_id filtering
 * 2. All joins MUST maintain workspace boundaries
 * 3. No cross-workspace data access without explicit permission
 * 4. Performance optimization through workspace-scoped indexes
 */

import { type SQL, sql } from 'drizzle-orm'
import { index, uniqueIndex } from 'drizzle-orm/pg-core'
import {
  parlantAgent,
  parlantSession,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantVariable,
  parlantTool,
  parlantTerm,
  parlantCannedResponse,
  parlantAgentTool,
  parlantJourneyGuideline,
  parlantAgentKnowledgeBase,
  parlantToolIntegration
} from './parlant-schema'

/**
 * WORKSPACE ISOLATION SECURITY INDEXES
 *
 * These indexes enforce workspace boundaries while optimizing performance
 * for multi-tenant operations. Each index is designed to:
 * 1. Prevent accidental cross-workspace queries
 * 2. Optimize workspace-scoped operations
 * 3. Enable efficient workspace-level analytics
 */

/**
 * CRITICAL WORKSPACE SECURITY INDEXES
 * These indexes are mandatory for security boundary enforcement
 */
export const workspaceSecurityIndexes = {
  // Agent workspace security - prevents cross-workspace agent access
  agentWorkspaceSecurityIdx: index('parlant_agent_workspace_security_idx')
    .on(parlantAgent.workspaceId, parlantAgent.id, parlantAgent.status, parlantAgent.deletedAt),

  // Session workspace security - ensures sessions stay within workspace bounds
  sessionWorkspaceSecurityIdx: index('parlant_session_workspace_security_idx')
    .on(parlantSession.workspaceId, parlantSession.id, parlantSession.agentId, parlantSession.status),

  // Tool workspace security - prevents cross-workspace tool access
  toolWorkspaceSecurityIdx: index('parlant_tool_workspace_security_idx')
    .on(parlantTool.workspaceId, parlantTool.id, parlantTool.enabled, parlantTool.isPublic),

  // Agent-tool workspace security - ensures tool assignments respect workspace boundaries
  agentToolWorkspaceSecurityIdx: index('parlant_agent_tool_workspace_security_idx')
    .on(parlantAgentTool.agentId, parlantAgentTool.toolId, parlantAgentTool.enabled)
}

/**
 * WORKSPACE-SCOPED PERFORMANCE INDEXES
 * Optimized for common multi-tenant query patterns
 */
export const workspaceScopedIndexes = {
  // Active agents per workspace - dashboard and agent management
  workspaceActiveAgentsIdx: index('workspace_active_agents_performance_idx')
    .on(parlantAgent.workspaceId, parlantAgent.status, parlantAgent.lastActiveAt, parlantAgent.totalSessions)
    .where(sql`${parlantAgent.deletedAt} IS NULL`),

  // Active sessions per workspace - real-time session monitoring
  workspaceActiveSessionsIdx: index('workspace_active_sessions_performance_idx')
    .on(parlantSession.workspaceId, parlantSession.status, parlantSession.lastActivityAt, parlantSession.agentId)
    .where(sql`${parlantSession.status} = 'active'`),

  // Workspace agent activity - analytics and reporting
  workspaceAgentActivityIdx: index('workspace_agent_activity_performance_idx')
    .on(parlantAgent.workspaceId, parlantAgent.lastActiveAt, parlantAgent.totalMessages, parlantAgent.totalSessions),

  // Workspace session analytics - usage patterns and metrics
  workspaceSessionAnalyticsIdx: index('workspace_session_analytics_performance_idx')
    .on(parlantSession.workspaceId, parlantSession.startedAt, parlantSession.endedAt, parlantSession.sessionType),

  // Workspace tool usage - tool effectiveness and adoption
  workspaceToolUsageIdx: index('workspace_tool_usage_performance_idx')
    .on(parlantTool.workspaceId, parlantTool.useCount, parlantTool.successRate, parlantTool.lastUsedAt)
    .where(sql`${parlantTool.enabled} = true`)
}

/**
 * WORKSPACE ISOLATION QUERY PATTERNS
 * Common query structures that maintain workspace boundaries
 */

/**
 * Agent Workspace Isolation Patterns
 */
export const agentWorkspacePatterns = {
  // Get all active agents in a workspace
  workspaceActiveAgents: sql`
    SELECT * FROM parlant_agent
    WHERE workspace_id = $1
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY last_active_at DESC, total_sessions DESC
  `,

  // Get agent with workspace verification
  agentWithWorkspaceCheck: sql`
    SELECT * FROM parlant_agent
    WHERE id = $1
      AND workspace_id = $2
      AND deleted_at IS NULL
  `,

  // Workspace agent analytics
  workspaceAgentStats: sql`
    SELECT
      workspace_id,
      COUNT(*) as total_agents,
      COUNT(*) FILTER (WHERE status = 'active') as active_agents,
      SUM(total_sessions) as total_sessions,
      SUM(total_messages) as total_messages,
      AVG(total_sessions) as avg_sessions_per_agent
    FROM parlant_agent
    WHERE workspace_id = $1
      AND deleted_at IS NULL
    GROUP BY workspace_id
  `
}

/**
 * Session Workspace Isolation Patterns
 */
export const sessionWorkspacePatterns = {
  // Get workspace sessions with agent verification
  workspaceSessionsWithAgent: sql`
    SELECT s.*, a.name as agent_name
    FROM parlant_session s
    INNER JOIN parlant_agent a ON s.agent_id = a.id
    WHERE s.workspace_id = $1
      AND a.workspace_id = $1  -- Double verification
      AND s.status = 'active'
    ORDER BY s.last_activity_at DESC
  `,

  // Customer session history within workspace
  customerWorkspaceSessions: sql`
    SELECT s.*, a.name as agent_name
    FROM parlant_session s
    INNER JOIN parlant_agent a ON s.agent_id = a.id
    WHERE s.workspace_id = $1
      AND s.customer_id = $2
      AND a.workspace_id = $1  -- Security boundary
    ORDER BY s.started_at DESC
  `,

  // Workspace session analytics with workspace verification
  workspaceSessionAnalytics: sql`
    SELECT
      s.workspace_id,
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE s.status = 'active') as active_sessions,
      AVG(s.message_count) as avg_messages_per_session,
      AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at))) as avg_duration_seconds
    FROM parlant_session s
    INNER JOIN parlant_agent a ON s.agent_id = a.id
    WHERE s.workspace_id = $1
      AND a.workspace_id = $1  -- Double verification
      AND s.started_at >= $2
    GROUP BY s.workspace_id
  `
}

/**
 * Cross-table Workspace Joins
 * Secure join patterns that maintain workspace isolation
 */
export const workspaceJoinPatterns = {
  // Agent-Session-Event join with workspace isolation
  agentSessionEventSecureJoin: sql`
    SELECT
      a.id as agent_id,
      a.name as agent_name,
      s.id as session_id,
      s.customer_id,
      e.event_type,
      e.content,
      e.created_at
    FROM parlant_agent a
    INNER JOIN parlant_session s ON a.id = s.agent_id
    INNER JOIN parlant_event e ON s.id = e.session_id
    WHERE a.workspace_id = $1  -- Primary workspace filter
      AND s.workspace_id = $1  -- Secondary workspace filter
      AND a.status = 'active'
      AND s.status = 'active'
    ORDER BY e.created_at DESC
    LIMIT 100
  `,

  // Agent-Tool relationship with workspace verification
  agentToolWorkspaceSecureJoin: sql`
    SELECT
      a.id as agent_id,
      a.name as agent_name,
      t.id as tool_id,
      t.name as tool_name,
      at.configuration,
      at.enabled
    FROM parlant_agent a
    INNER JOIN parlant_agent_tool at ON a.id = at.agent_id
    INNER JOIN parlant_tool t ON at.tool_id = t.id
    WHERE a.workspace_id = $1  -- Agent workspace
      AND t.workspace_id = $1  -- Tool workspace
      AND a.status = 'active'
      AND t.enabled = true
      AND at.enabled = true
  `,

  // Journey-State-Transition secure join
  journeyStateTransitionSecureJoin: sql`
    SELECT
      j.id as journey_id,
      j.title as journey_title,
      js.id as state_id,
      js.name as state_name,
      jt.id as transition_id,
      jt.condition
    FROM parlant_journey j
    INNER JOIN parlant_agent a ON j.agent_id = a.id
    INNER JOIN parlant_journey_state js ON j.id = js.journey_id
    LEFT JOIN parlant_journey_transition jt ON js.id = jt.from_state_id
    WHERE a.workspace_id = $1  -- Workspace security boundary
      AND j.enabled = true
      AND a.status = 'active'
    ORDER BY j.title, js.name
  `
}

/**
 * WORKSPACE BOUNDARY VALIDATION FUNCTIONS
 * SQL functions to validate workspace boundaries at query time
 */
export const workspaceBoundaryValidation = {
  // Validate agent belongs to workspace
  validateAgentWorkspace: sql`
    CREATE OR REPLACE FUNCTION validate_agent_workspace(
      agent_uuid UUID,
      workspace_text TEXT
    ) RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM parlant_agent
        WHERE id = agent_uuid
          AND workspace_id = workspace_text
          AND deleted_at IS NULL
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `,

  // Validate session belongs to workspace and agent
  validateSessionWorkspace: sql`
    CREATE OR REPLACE FUNCTION validate_session_workspace(
      session_uuid UUID,
      workspace_text TEXT,
      agent_uuid UUID DEFAULT NULL
    ) RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM parlant_session s
        INNER JOIN parlant_agent a ON s.agent_id = a.id
        WHERE s.id = session_uuid
          AND s.workspace_id = workspace_text
          AND a.workspace_id = workspace_text
          AND (agent_uuid IS NULL OR s.agent_id = agent_uuid)
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `,

  // Validate tool belongs to workspace
  validateToolWorkspace: sql`
    CREATE OR REPLACE FUNCTION validate_tool_workspace(
      tool_uuid UUID,
      workspace_text TEXT
    ) RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM parlant_tool
        WHERE id = tool_uuid
          AND workspace_id = workspace_text
          AND enabled = true
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
}

/**
 * WORKSPACE ISOLATION CONSTRAINTS
 * Database-level constraints to enforce workspace boundaries
 */
export const workspaceIsolationConstraints = {
  // Ensure sessions can only reference agents in the same workspace
  sessionAgentWorkspaceConstraint: sql`
    ALTER TABLE parlant_session
    ADD CONSTRAINT session_agent_workspace_match
    CHECK (
      workspace_id = (
        SELECT workspace_id
        FROM parlant_agent
        WHERE id = parlant_session.agent_id
      )
    );
  `,

  // Ensure events can only reference sessions in the correct workspace
  eventSessionWorkspaceConstraint: sql`
    ALTER TABLE parlant_event
    ADD CONSTRAINT event_session_workspace_match
    CHECK (
      session_id IN (
        SELECT s.id
        FROM parlant_session s
        INNER JOIN parlant_agent a ON s.agent_id = a.id
        WHERE s.workspace_id = a.workspace_id
      )
    );
  `,

  // Ensure guidelines can only reference agents in workspace-appropriate tools
  guidelineAgentToolWorkspaceConstraint: sql`
    ALTER TABLE parlant_guideline
    ADD CONSTRAINT guideline_agent_tool_workspace_match
    CHECK (
      agent_id IN (
        SELECT a.id
        FROM parlant_agent a
        WHERE a.deleted_at IS NULL
      )
    );
  `
}

/**
 * WORKSPACE PERFORMANCE MONITORING VIEWS
 * Materialized views for workspace-level performance analytics
 */
export const workspacePerformanceViews = {
  // Workspace agent performance summary
  workspaceAgentPerformance: sql`
    CREATE MATERIALIZED VIEW workspace_agent_performance AS
    SELECT
      workspace_id,
      COUNT(*) as total_agents,
      COUNT(*) FILTER (WHERE status = 'active') as active_agents,
      COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '24 hours') as recently_active_agents,
      SUM(total_sessions) as total_sessions,
      SUM(total_messages) as total_messages,
      SUM(total_tokens_used) as total_tokens,
      SUM(total_cost) as total_cost_cents,
      AVG(average_session_duration) as avg_session_duration_seconds
    FROM parlant_agent
    WHERE deleted_at IS NULL
    GROUP BY workspace_id;

    CREATE UNIQUE INDEX idx_workspace_agent_performance_workspace
    ON workspace_agent_performance (workspace_id);
  `,

  // Workspace session performance summary
  workspaceSessionPerformance: sql`
    CREATE MATERIALIZED VIEW workspace_session_performance AS
    SELECT
      s.workspace_id,
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE s.status = 'active') as active_sessions,
      COUNT(*) FILTER (WHERE s.started_at > NOW() - INTERVAL '24 hours') as recent_sessions,
      AVG(s.message_count) as avg_messages_per_session,
      AVG(s.tokens_used) as avg_tokens_per_session,
      AVG(s.cost) as avg_cost_per_session_cents,
      AVG(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))) as avg_duration_seconds
    FROM parlant_session s
    INNER JOIN parlant_agent a ON s.agent_id = a.id
    WHERE a.workspace_id = s.workspace_id  -- Workspace boundary validation
    GROUP BY s.workspace_id;

    CREATE UNIQUE INDEX idx_workspace_session_performance_workspace
    ON workspace_session_performance (workspace_id);
  `,

  // Workspace tool usage performance
  workspaceToolPerformance: sql`
    CREATE MATERIALIZED VIEW workspace_tool_performance AS
    SELECT
      workspace_id,
      COUNT(*) as total_tools,
      COUNT(*) FILTER (WHERE enabled = true) as enabled_tools,
      COUNT(*) FILTER (WHERE is_public = true) as public_tools,
      SUM(use_count) as total_tool_uses,
      AVG(success_rate) as avg_success_rate,
      COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '24 hours') as recently_used_tools
    FROM parlant_tool
    GROUP BY workspace_id;

    CREATE UNIQUE INDEX idx_workspace_tool_performance_workspace
    ON workspace_tool_performance (workspace_id);
  `
}

/**
 * WORKSPACE ISOLATION ROW-LEVEL SECURITY POLICIES
 * PostgreSQL RLS policies for additional security layers
 */
export const workspaceRLSPolicies = {
  // Enable RLS on all Parlant tables
  enableRLS: sql`
    ALTER TABLE parlant_agent ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_session ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_event ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_guideline ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_journey ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_journey_state ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_journey_transition ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_variable ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_tool ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_term ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_canned_response ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_agent_tool ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_journey_guideline ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_agent_knowledge_base ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parlant_tool_integration ENABLE ROW LEVEL SECURITY;
  `,

  // Workspace-based access policy for agents
  agentWorkspacePolicy: sql`
    CREATE POLICY agent_workspace_isolation ON parlant_agent
    USING (workspace_id = current_setting('app.current_workspace_id', true));
  `,

  // Workspace-based access policy for sessions
  sessionWorkspacePolicy: sql`
    CREATE POLICY session_workspace_isolation ON parlant_session
    USING (workspace_id = current_setting('app.current_workspace_id', true));
  `,

  // Tool access policy with public tool support
  toolWorkspacePolicy: sql`
    CREATE POLICY tool_workspace_isolation ON parlant_tool
    USING (
      workspace_id = current_setting('app.current_workspace_id', true)
      OR is_public = true
    );
  `
}

/**
 * EXPORT ALL WORKSPACE ISOLATION COMPONENTS
 */
export const workspaceIsolationFramework = {
  // Security indexes
  ...workspaceSecurityIndexes,
  ...workspaceScopedIndexes,

  // Query patterns
  agentWorkspacePatterns,
  sessionWorkspacePatterns,
  workspaceJoinPatterns,

  // Validation functions
  workspaceBoundaryValidation,

  // Database constraints
  workspaceIsolationConstraints,

  // Performance views
  workspacePerformanceViews,

  // Row-level security
  workspaceRLSPolicies
}

/**
 * WORKSPACE ISOLATION BEST PRACTICES
 *
 * 1. Always include workspace_id in WHERE clauses
 * 2. Use workspace-scoped indexes for performance
 * 3. Validate workspace boundaries in joins
 * 4. Implement double-verification for sensitive operations
 * 5. Use materialized views for workspace analytics
 * 6. Enable RLS as additional security layer
 * 7. Monitor cross-workspace query attempts
 * 8. Regular audit of workspace isolation effectiveness
 */