# Parlant Table Relationships and Business Rules

## Overview

This document provides comprehensive documentation of all foreign key relationships, business rules, constraints, and data integrity requirements within the Parlant database schema extension.

## Foreign Key Relationships

### Core Entity Relationships

#### parlantAgent Relationships
```sql
-- Primary relationships
parlantAgent.workspaceId → workspace.id (CASCADE DELETE)
parlantAgent.createdBy → user.id (CASCADE DELETE)

-- Business Rule: All agents must belong to a workspace and have a creator
-- Constraint: Workspace isolation enforced at application level
-- Index Support: workspace_id, created_by, status combinations
```

**Business Rules:**
- Agents are workspace-scoped and inherit workspace permissions
- Agent creators must have 'write' or 'admin' permissions on the workspace
- Soft delete via `deletedAt` preserves historical references
- Active agents must have valid model provider configurations

#### parlantSession Relationships
```sql
-- Core relationships
parlantSession.agentId → parlantAgent.id (CASCADE DELETE)
parlantSession.workspaceId → workspace.id (CASCADE DELETE)
parlantSession.userId → user.id (SET NULL) -- Nullable for anonymous sessions
parlantSession.currentJourneyId → parlantJourney.id (SET NULL)
parlantSession.currentStateId → parlantJourneyState.id (SET NULL)

-- Business Rule: Sessions must belong to agent's workspace
-- Constraint: workspace_id must match agent.workspace_id
-- Validation: Enforced at application level for performance
```

**Business Rules:**
- Sessions must belong to the same workspace as their agent
- Anonymous sessions (userId = NULL) are permitted for external users
- Current journey/state references must belong to the session's agent
- Session end time must be after start time
- Session cost tracking in cents for precise billing

#### parlantEvent Relationships
```sql
-- Primary relationship
parlantEvent.sessionId → parlantSession.id (CASCADE DELETE)
parlantEvent.journeyId → parlantJourney.id (SET NULL) -- Optional journey reference
parlantEvent.stateId → parlantJourneyState.id (SET NULL) -- Optional state reference

-- Business Rule: Events are immutable once created
-- Constraint: Unique (session_id, offset) for event ordering
-- Validation: Journey/state references must belong to session's agent
```

**Business Rules:**
- Events are immutable and ordered sequentially within sessions
- Event offsets must be consecutive within each session (0, 1, 2, ...)
- Journey and state references must be consistent with session context
- Tool call IDs must be unique across the entire system
- Event content structure varies by event type

### Behavior Configuration Relationships

#### parlantGuideline Relationships
```sql
-- Primary relationship
parlantGuideline.agentId → parlantAgent.id (CASCADE DELETE)

-- Business Rule: Guidelines are agent-specific
-- Constraint: Priority values guide selection order (higher = more important)
-- Usage: Match count tracking for effectiveness analysis
```

**Business Rules:**
- Guidelines are evaluated in priority order (highest first)
- Condition matching uses natural language processing
- Tool IDs in guideline must reference valid parlantTool records
- Match count incremented atomically to prevent race conditions
- Disabled guidelines are ignored but preserved for historical analysis

#### parlantCannedResponse Relationships
```sql
-- Primary relationship
parlantCannedResponse.agentId → parlantAgent.id (CASCADE DELETE)

-- Business Rule: Responses are agent-scoped with category organization
-- Constraint: Template variables must match session context
-- Usage: Compliance-focused with exact matching options
```

**Business Rules:**
- Response templates support variable substitution from session context
- Exact match requirements override fuzzy matching algorithms
- Category hierarchy enables organizational grouping
- Conditions array uses OR logic for matching
- Usage tracking for compliance auditing

#### parlantTerm Relationships
```sql
-- Primary relationship
parlantTerm.agentId → parlantAgent.id (CASCADE DELETE)

-- Business Rule: Terms are agent-specific glossaries
-- Constraint: Unique (agent_id, name) to prevent duplicate definitions
-- Usage: Synonym matching for natural language understanding
```

**Business Rules:**
- Term names must be unique within each agent
- Synonyms array enables flexible term matching
- Importance weights help with disambiguation
- Category grouping for term organization
- Examples provide context for proper usage

### Journey/Workflow Relationships

#### parlantJourney Relationships
```sql
-- Primary relationship
parlantJourney.agentId → parlantAgent.id (CASCADE DELETE)

-- Business Rule: Journeys define multi-step conversational flows
-- Constraint: Condition evaluation determines journey triggering
-- Usage: Completion rate calculation for optimization
```

**Business Rules:**
- Journeys must have at least one initial state
- Completion rate calculated as (completed sessions / total sessions) * 100
- Conditions array uses OR logic for journey triggering
- Skip/revisit permissions apply to entire journey
- Disabled journeys stop accepting new sessions but continue existing ones

#### parlantJourneyState Relationships
```sql
-- Primary relationship
parlantJourneyState.journeyId → parlantJourney.id (CASCADE DELETE)

-- Business Rule: States define conversation flow nodes
-- Constraint: Each journey must have exactly one initial state
-- Constraint: Final states cannot have outgoing transitions
```

**Business Rules:**
- Journey must have exactly one initial state (isInitial = true)
- Journey can have multiple final states (isFinal = true)
- Tool states must reference valid parlantTool records
- Chat states require chatPrompt content
- Decision states use condition logic for automatic transitions
- State metadata supports flexible configuration storage

#### parlantJourneyTransition Relationships
```sql
-- Primary relationships
parlantJourneyTransition.journeyId → parlantJourney.id (CASCADE DELETE)
parlantJourneyTransition.fromStateId → parlantJourneyState.id (CASCADE DELETE)
parlantJourneyTransition.toStateId → parlantJourneyState.id (CASCADE DELETE)

-- Business Rule: Transitions define flow between states
-- Constraint: All state references must belong to the same journey
-- Validation: No transitions from final states allowed
```

**Business Rules:**
- From/to states must belong to the same journey
- Final states cannot have outgoing transitions
- Initial states should not have incoming transitions (except for loops)
- Priority determines transition selection when multiple conditions match
- Circular transitions are permitted for complex flows
- Self-transitions (same from/to state) are allowed

### Tool Integration Relationships

#### parlantTool Relationships
```sql
-- Primary relationship
parlantTool.workspaceId → workspace.id (CASCADE DELETE)

-- Business Rule: Tools are workspace-scoped resources
-- Constraint: Unique (workspace_id, name) for tool identification
-- Integration: Links to Sim's existing tool systems
```

**Business Rules:**
- Tool names must be unique within each workspace
- Parameter schemas must be valid JSON Schema
- Return schemas define expected response structure
- Usage guidelines provide natural language descriptions
- Public tools can be shared across workspace agents
- Success rate calculated from tool execution results

#### parlantToolIntegration Relationships
```sql
-- Primary relationship
parlantToolIntegration.parlantToolId → parlantTool.id (CASCADE DELETE)

-- Business Rule: Concrete mappings to Sim tool implementations
-- Constraint: Integration type determines target validation
-- Health: Monitoring and error tracking for reliability
```

**Business Rules:**
- Integration types: 'custom_tool', 'workflow_block', 'mcp_server'
- Target ID must reference valid records in respective tables
- Parameter mapping translates between Parlant and target schemas
- Health checks run periodically to validate integration status
- Error count tracking with automatic disabling thresholds

### Junction Table Relationships

#### parlantAgentTool Relationships
```sql
-- Many-to-many relationships
parlantAgentTool.agentId → parlantAgent.id (CASCADE DELETE)
parlantAgentTool.toolId → parlantTool.id (CASCADE DELETE)

-- Business Rule: Controls agent tool access with configuration
-- Constraint: Unique (agent_id, tool_id) prevents duplicates
-- Usage: Priority-based tool selection and usage tracking
```

**Business Rules:**
- Agent and tool must belong to the same workspace
- Configuration overrides tool default settings for specific agents
- Priority determines tool selection order (higher = preferred)
- Usage tracking per agent-tool combination for analytics
- Disabled relationships prevent tool usage without deletion

#### parlantAgentKnowledgeBase Relationships
```sql
-- Many-to-many relationships
parlantAgentKnowledgeBase.agentId → parlantAgent.id (CASCADE DELETE)
parlantAgentKnowledgeBase.knowledgeBaseId → knowledgeBase.id (CASCADE DELETE)

-- Business Rule: RAG integration with Sim's knowledge bases
-- Constraint: Knowledge base must be accessible to agent's workspace
-- Usage: Search configuration and analytics tracking
```

**Business Rules:**
- Knowledge base must be accessible to agent's workspace (via permissions)
- Search threshold (0-100) controls similarity matching sensitivity
- Max results limits number of chunks returned per search
- Priority determines search order when multiple KBs are available
- Search analytics track usage patterns for optimization

#### parlantJourneyGuideline Relationships
```sql
-- Many-to-many relationships
parlantJourneyGuideline.journeyId → parlantJourney.id (CASCADE DELETE)
parlantJourneyGuideline.guidelineId → parlantGuideline.id (CASCADE DELETE)

-- Business Rule: Journey-specific guideline applications
-- Constraint: Journey and guideline must belong to same agent
-- Usage: Priority overrides and journey-specific conditions
```

**Business Rules:**
- Journey and guideline must belong to the same agent
- Priority overrides modify guideline priority in journey context
- Journey-specific conditions add additional matching criteria
- Match count tracking within journey context for effectiveness measurement
- Disabled relationships don't apply guidelines but preserve configuration

### Workspace Integration Relationships

#### parlantAgentWorkflow Relationships
```sql
-- Workspace integration relationships
parlantAgentWorkflow.agentId → parlantAgent.id (CASCADE DELETE)
parlantAgentWorkflow.workflowId → workflow.id (CASCADE DELETE)
parlantAgentWorkflow.workspaceId → workspace.id (CASCADE DELETE)

-- Business Rule: Connects agents to Sim workflows
-- Constraint: All entities must belong to same workspace
-- Usage: Bi-directional workflow integration (trigger/monitor)
```

**Business Rules:**
- Agent, workflow, and workspace must all match
- Integration types: 'trigger', 'monitor', 'both'
- Trigger conditions evaluated against session context
- Input/output mappings translate between session and workflow data
- Workflow triggering must respect workspace permissions

#### parlantAgentApiKey Relationships
```sql
-- API key integration relationships
parlantAgentApiKey.agentId → parlantAgent.id (CASCADE DELETE)
parlantAgentApiKey.apiKeyId → apiKey.id (CASCADE DELETE)
parlantAgentApiKey.workspaceId → workspace.id (CASCADE DELETE)

-- Business Rule: Grants agents access to workspace API keys
-- Constraint: API key must be accessible to agent's workspace
-- Usage: Purpose-based key selection and usage tracking
```

**Business Rules:**
- API key must be workspace-scoped or accessible to workspace
- Purpose categories: 'tools', 'llm', 'external_service'
- Priority determines key selection when multiple keys match purpose
- Usage tracking for billing and audit purposes
- Key rotation handled through existing apiKey table

#### parlantSessionWorkflow Relationships
```sql
-- Session workflow execution tracking
parlantSessionWorkflow.sessionId → parlantSession.id (CASCADE DELETE)
parlantSessionWorkflow.workflowId → workflow.id (CASCADE DELETE)

-- Business Rule: Tracks workflow executions from agent sessions
-- Constraint: Workflow must be accessible to session's workspace
-- Usage: Execution status tracking and result storage
```

**Business Rules:**
- Workflow must be accessible to session's workspace
- Execution ID references Sim's workflow execution system
- Status tracking: 'pending', 'running', 'completed', 'failed'
- Input/output data preserved for session context
- Error messages provide debugging information

## Data Integrity Constraints

### Check Constraints

```sql
-- Agent configuration constraints
ALTER TABLE parlant_agent ADD CONSTRAINT
  check_temperature_range CHECK (temperature >= 0 AND temperature <= 100);

ALTER TABLE parlant_agent ADD CONSTRAINT
  check_positive_tokens CHECK (max_tokens > 0);

ALTER TABLE parlant_agent ADD CONSTRAINT
  check_retention_days CHECK (data_retention_days > 0);

-- Session constraints
ALTER TABLE parlant_session ADD CONSTRAINT
  check_session_timing CHECK (started_at <= COALESCE(ended_at, NOW()));

ALTER TABLE parlant_session ADD CONSTRAINT
  check_positive_counts CHECK (event_count >= 0 AND message_count >= 0);

ALTER TABLE parlant_session ADD CONSTRAINT
  check_satisfaction_range CHECK (satisfaction_score BETWEEN 1 AND 5);

-- Event constraints
ALTER TABLE parlant_event ADD CONSTRAINT
  check_positive_offset CHECK (offset >= 0);

-- Journey state constraints
ALTER TABLE parlant_journey_state ADD CONSTRAINT
  check_state_content CHECK (
    (state_type = 'chat' AND chat_prompt IS NOT NULL) OR
    (state_type = 'tool' AND tool_id IS NOT NULL) OR
    (state_type = 'decision' AND condition IS NOT NULL) OR
    state_type = 'final'
  );

-- Tool constraints
ALTER TABLE parlant_tool ADD CONSTRAINT
  check_success_rate CHECK (success_rate >= 0 AND success_rate <= 100);

ALTER TABLE parlant_tool ADD CONSTRAINT
  check_positive_timeouts CHECK (execution_timeout > 0);

-- Knowledge base search constraints
ALTER TABLE parlant_agent_knowledge_base ADD CONSTRAINT
  check_search_threshold CHECK (search_threshold >= 0 AND search_threshold <= 100);

ALTER TABLE parlant_agent_knowledge_base ADD CONSTRAINT
  check_positive_results CHECK (max_results > 0);
```

### Unique Constraints

```sql
-- Prevent duplicate relationships
ALTER TABLE parlant_agent_tool ADD CONSTRAINT
  unique_agent_tool UNIQUE (agent_id, tool_id);

ALTER TABLE parlant_agent_knowledge_base ADD CONSTRAINT
  unique_agent_kb UNIQUE (agent_id, knowledge_base_id);

ALTER TABLE parlant_journey_guideline ADD CONSTRAINT
  unique_journey_guideline UNIQUE (journey_id, guideline_id);

-- Prevent naming conflicts
ALTER TABLE parlant_tool ADD CONSTRAINT
  unique_workspace_tool_name UNIQUE (workspace_id, name);

ALTER TABLE parlant_term ADD CONSTRAINT
  unique_agent_term_name UNIQUE (agent_id, name);

-- Ensure event ordering integrity
ALTER TABLE parlant_event ADD CONSTRAINT
  unique_session_offset UNIQUE (session_id, offset);
```

### Business Logic Constraints (Application Level)

#### Workspace Isolation
```typescript
// Enforced in service layer for performance
async function validateWorkspaceAccess(entityWorkspaceId: string, userWorkspaceId: string) {
  if (entityWorkspaceId !== userWorkspaceId) {
    throw new Error('Cross-workspace access denied');
  }
}
```

#### Journey State Validation
```typescript
// Ensure journey has exactly one initial state
async function validateJourneyStates(journeyId: string) {
  const initialStates = await db.select()
    .from(parlantJourneyState)
    .where(and(
      eq(parlantJourneyState.journeyId, journeyId),
      eq(parlantJourneyState.isInitial, true)
    ));

  if (initialStates.length !== 1) {
    throw new Error('Journey must have exactly one initial state');
  }
}
```

#### Tool Integration Health
```typescript
// Periodic health check validation
async function validateToolIntegrationHealth() {
  const integrations = await db.select()
    .from(parlantToolIntegration)
    .where(eq(parlantToolIntegration.enabled, true));

  for (const integration of integrations) {
    try {
      await performHealthCheck(integration);
      await updateHealthStatus(integration.id, 'healthy');
    } catch (error) {
      await updateHealthStatus(integration.id, 'unhealthy');
      await incrementErrorCount(integration.id);
    }
  }
}
```

## Cascade Behaviors

### DELETE CASCADE
- **parlantAgent deletion** cascades to all related entities (sessions, guidelines, journeys, etc.)
- **parlantSession deletion** cascades to events and variables
- **parlantJourney deletion** cascades to states and transitions
- **Workspace deletion** cascades to all workspace-scoped Parlant entities

### SET NULL
- **User deletion** sets parlantSession.userId to NULL (preserves anonymous sessions)
- **Journey/State deletion** sets current references to NULL in active sessions
- **Tool deletion** sets tool references to NULL in guidelines

### SET DEFAULT
- No SET DEFAULT behaviors used (explicit NULL handling preferred)

## Indexes and Performance

### Query Performance Indexes
- **Agent Lookup**: `(workspace_id, status, last_active_at)`
- **Session Analytics**: `(agent_id, status, started_at)`
- **Event Retrieval**: `(session_id, offset)` for chronological order
- **Journey Flow**: `(journey_id, from_state_id, priority)` for transitions
- **Tool Search**: `(workspace_id, enabled, tool_type)`

### Analytics Indexes
- **Usage Tracking**: Indexes on use_count, last_used_at across all tables
- **Health Monitoring**: Indexes on health_status, error_count
- **Performance Metrics**: Indexes on response times, satisfaction scores

## Maintenance Procedures

### Data Cleanup
```sql
-- Archive old completed sessions (configurable retention period)
DELETE FROM parlant_session
WHERE status = 'completed'
  AND ended_at < NOW() - INTERVAL '90 days';

-- Clean up unused variables (no session reference)
DELETE FROM parlant_variable
WHERE session_id IS NULL
  AND updated_at < NOW() - INTERVAL '30 days';

-- Remove old events from archived sessions
DELETE FROM parlant_event
WHERE session_id NOT IN (SELECT id FROM parlant_session);
```

### Health Monitoring
```sql
-- Check for orphaned records
SELECT 'Orphaned Events' as issue, COUNT(*) as count
FROM parlant_event e
LEFT JOIN parlant_session s ON e.session_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 'Orphaned Variables' as issue, COUNT(*) as count
FROM parlant_variable v
LEFT JOIN parlant_session s ON v.session_id = s.id
WHERE v.session_id IS NOT NULL AND s.id IS NULL;

-- Monitor constraint violations
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
ORDER BY tablename, attname;
```

This comprehensive relationship documentation ensures data integrity and provides clear guidelines for maintaining the Parlant database schema extension.