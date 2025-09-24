# Parlant Database Schema Design Specification

## Overview

This document provides comprehensive specifications for the Parlant database schema extension that integrates seamlessly with Sim's existing PostgreSQL database structure. The schema supports AI agent functionality while maintaining strict workspace isolation and data integrity.

## Architecture Integration

### Core Integration Points

The Parlant schema integrates with Sim's core tables:

- **`workspace`** (id: text) - Multi-tenant isolation boundary
- **`user`** (id: text) - User authentication and ownership
- **Shared authentication** via Better Auth system
- **Consistent data types** and naming conventions

### Schema Design Principles

1. **Workspace Isolation**: All Parlant tables include `workspace_id` foreign keys
2. **Cascade Rules**: Proper CASCADE/SET NULL rules for data integrity
3. **Performance Optimization**: Strategic indexing for query patterns
4. **Audit Trails**: Comprehensive timestamps and tracking fields
5. **Flexible Configuration**: JSONB fields for extensible configurations

## Table Specifications

### 1. parlant_agent

**Purpose**: Core AI agent definitions with behavior configurations

```sql
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
```

**Key Features**:
- **Workspace Scoped**: All agents belong to specific workspaces
- **User Ownership**: Tracks agent creator for permissions
- **Flexible AI Config**: Supports multiple LLM providers
- **Usage Analytics**: Built-in session and message counters
- **Soft Deletion**: `deleted_at` field for safe archival

**Indexes**:
- Primary access patterns: workspace + status queries
- Performance optimization for active agent lookups
- Last activity tracking for usage analytics

### 2. parlant_session

**Purpose**: Individual conversation instances between users and agents

```sql
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
```

**Key Features**:
- **Anonymous Support**: Nullable `user_id` for guest conversations
- **Journey State**: Tracks current position in conversation flows
- **Variable Storage**: JSONB for session-scoped data
- **Flexible Metadata**: Extensible configuration storage
- **Activity Tracking**: Comprehensive timing and usage counters

### 3. parlant_event

**Purpose**: All events within sessions (messages, tool calls, state changes)

```sql
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
```

**Key Features**:
- **Event Ordering**: Sequential `offset` within each session
- **Type Safety**: Enum-based event type classification
- **Rich Content**: JSONB storage for flexible event data
- **Cross-References**: Links to journeys, states, and tool calls
- **Immutable Log**: Append-only design for audit trails

### 4. parlant_guideline

**Purpose**: Behavior rules that guide agent responses in specific situations

```sql
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
```

**Key Features**:
- **Rule-Based Logic**: Condition-action pairs for agent behavior
- **Priority System**: Weighted rule evaluation order
- **Tool Integration**: Links to specific tool permissions
- **Usage Analytics**: Tracks rule effectiveness
- **Dynamic Control**: Enable/disable rules without deletion

### 5. parlant_journey

**Purpose**: Multi-step conversational flows for structured processes

```sql
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
```

**Key Features**:
- **Flow Control**: State machine definitions for complex conversations
- **Trigger Logic**: JSONB conditions for journey activation
- **Flexibility Controls**: Skip/revisit configuration options
- **Success Metrics**: Built-in completion rate tracking
- **Dynamic Management**: Runtime enable/disable capability

### 6. parlant_journey_state

**Purpose**: Individual states within journeys defining conversation steps

```sql
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
```

**Key Features**:
- **Type-Specific Content**: Different fields for chat/tool/decision states
- **Flow Markers**: Initial and final state designations
- **Skip Control**: Per-state skip permission configuration
- **Tool Integration**: Direct tool execution capabilities
- **Extensible Metadata**: JSONB for state-specific data

### 7. parlant_journey_transition

**Purpose**: Connections between journey states for flow control

```sql
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
```

**Key Features**:
- **Graph Structure**: Defines state machine connections
- **Conditional Logic**: Rules for transition evaluation
- **Priority System**: Weighted transition selection
- **Usage Analytics**: Tracks transition effectiveness
- **Flow Visualization**: Supports journey diagram generation

### 8. parlant_variable

**Purpose**: Customer/session-specific data storage for personalization

```sql
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
```

**Key Features**:
- **Scoped Storage**: Session, agent, or global variable scopes
- **Type Safety**: Explicit value type tracking
- **Privacy Control**: Private variable protection
- **Rich Values**: JSONB supports complex data types
- **Documentation**: Built-in variable descriptions

### 9. parlant_tool

**Purpose**: Function integrations connecting Sim tools with Parlant interface

```sql
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
```

**Key Features**:
- **Sim Integration**: Links to existing Sim tool definitions
- **Schema Validation**: JSON Schema for parameters and returns
- **Usage Guidelines**: Human-readable tool usage instructions
- **Error Handling**: Configurable error response strategies
- **Success Metrics**: Built-in reliability tracking

### 10. parlant_term

**Purpose**: Domain-specific terminology definitions for agent understanding

```sql
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
```

**Key Features**:
- **Semantic Understanding**: Business terminology definitions
- **Synonym Support**: Alternative term recognition
- **Contextual Examples**: Usage examples for clarity
- **Importance Weighting**: Priority-based term significance
- **Category Organization**: Structured term taxonomy

### 11. parlant_canned_response

**Purpose**: Pre-approved response templates for compliance and brand consistency

```sql
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
```

**Key Features**:
- **Template System**: Variable interpolation support
- **Conditional Matching**: Smart response selection
- **Compliance Control**: Exact match requirements
- **Tag Organization**: Flexible response categorization
- **Usage Analytics**: Response effectiveness tracking

## Enumeration Types

### agent_status
```sql
CREATE TYPE "agent_status" AS ENUM('active', 'inactive', 'archived');
```
- **active**: Agent available for new sessions
- **inactive**: Agent temporarily disabled
- **archived**: Agent permanently deactivated

### session_mode
```sql
CREATE TYPE "session_mode" AS ENUM('auto', 'manual', 'paused');
```
- **auto**: Fully automated agent responses
- **manual**: Human oversight required
- **paused**: Session temporarily suspended

### session_status
```sql
CREATE TYPE "session_status" AS ENUM('active', 'completed', 'abandoned');
```
- **active**: Session in progress
- **completed**: Session ended successfully
- **abandoned**: Session ended without completion

### event_type
```sql
CREATE TYPE "event_type" AS ENUM(
  'customer_message',
  'agent_message',
  'tool_call',
  'tool_result',
  'status_update',
  'journey_transition',
  'variable_update'
);
```
Comprehensive event classification for audit trails and analytics.

### journey_state_type
```sql
CREATE TYPE "journey_state_type" AS ENUM('chat', 'tool', 'decision', 'final');
```
- **chat**: Text-based conversation state
- **tool**: Tool execution state
- **decision**: Conditional branching state
- **final**: Journey completion state

### composition_mode
```sql
CREATE TYPE "composition_mode" AS ENUM('fluid', 'strict');
```
- **fluid**: Dynamic response composition
- **strict**: Template-based responses

## Foreign Key Relationships

### Primary Relationships

1. **Workspace Isolation**
   ```sql
   workspace(id) ← parlant_agent(workspace_id)
   workspace(id) ← parlant_session(workspace_id)
   workspace(id) ← parlant_tool(workspace_id)
   ```

2. **User Ownership**
   ```sql
   user(id) ← parlant_agent(created_by)
   user(id) ← parlant_session(user_id) [nullable]
   ```

3. **Agent Hierarchy**
   ```sql
   parlant_agent(id) ← parlant_session(agent_id)
   parlant_agent(id) ← parlant_guideline(agent_id)
   parlant_agent(id) ← parlant_journey(agent_id)
   parlant_agent(id) ← parlant_variable(agent_id)
   parlant_agent(id) ← parlant_term(agent_id)
   parlant_agent(id) ← parlant_canned_response(agent_id)
   ```

4. **Session Relationships**
   ```sql
   parlant_session(id) ← parlant_event(session_id)
   parlant_session(id) ← parlant_variable(session_id) [nullable]
   ```

5. **Journey Flow**
   ```sql
   parlant_journey(id) ← parlant_journey_state(journey_id)
   parlant_journey(id) ← parlant_journey_transition(journey_id)
   parlant_journey_state(id) ← parlant_journey_transition(from_state_id)
   parlant_journey_state(id) ← parlant_journey_transition(to_state_id)
   ```

6. **Cross-References**
   ```sql
   parlant_journey(id) ← parlant_session(current_journey_id) [nullable]
   parlant_journey_state(id) ← parlant_session(current_state_id) [nullable]
   parlant_journey(id) ← parlant_event(journey_id) [nullable]
   parlant_journey_state(id) ← parlant_event(state_id) [nullable]
   ```

### Cascading Rules

#### CASCADE Deletions
- **Workspace deletion**: All Parlant data removed
- **User deletion**: Agent ownership transferred or archived
- **Agent deletion**: All related data removed
- **Session deletion**: All events and variables removed
- **Journey deletion**: All states and transitions removed

#### SET NULL Operations
- **User deletion**: Session `user_id` set to null (preserves anonymous sessions)
- **Journey/State deletion**: Session current references nullified
- **Journey/State deletion**: Event references nullified

## Indexing Strategy

### Performance Indexes

1. **Workspace Queries**
   ```sql
   CREATE INDEX "parlant_agent_workspace_status_idx" ON "parlant_agent"("workspace_id", "status");
   CREATE INDEX "parlant_session_agent_status_idx" ON "parlant_session"("agent_id", "status");
   ```

2. **Active Session Lookups**
   ```sql
   CREATE INDEX "parlant_session_last_activity_idx" ON "parlant_session"("last_activity_at");
   CREATE INDEX "parlant_agent_last_active_idx" ON "parlant_agent"("last_active_at");
   ```

3. **Event Ordering**
   ```sql
   CREATE UNIQUE INDEX "parlant_event_session_offset_idx" ON "parlant_event"("session_id", "offset");
   CREATE INDEX "parlant_event_session_type_idx" ON "parlant_event"("session_id", "event_type");
   ```

4. **Variable Lookups**
   ```sql
   CREATE UNIQUE INDEX "parlant_variable_session_key_idx" ON "parlant_variable"("session_id", "key");
   CREATE INDEX "parlant_variable_agent_key_idx" ON "parlant_variable"("agent_id", "key");
   ```

5. **Tool Access**
   ```sql
   CREATE UNIQUE INDEX "parlant_tool_workspace_name_idx" ON "parlant_tool"("workspace_id", "name");
   CREATE INDEX "parlant_tool_enabled_idx" ON "parlant_tool"("enabled");
   ```

### Analytics Indexes

1. **Usage Tracking**
   ```sql
   CREATE INDEX "parlant_guideline_last_matched_idx" ON "parlant_guideline"("last_matched_at");
   CREATE INDEX "parlant_journey_last_used_idx" ON "parlant_journey"("last_used_at");
   CREATE INDEX "parlant_tool_last_used_idx" ON "parlant_tool"("last_used_at");
   ```

2. **Priority Ordering**
   ```sql
   CREATE INDEX "parlant_guideline_priority_idx" ON "parlant_guideline"("priority");
   CREATE INDEX "parlant_journey_transition_priority_idx" ON "parlant_journey_transition"("priority");
   ```

## Workspace Isolation Design

### Row-Level Security (RLS) Policies

#### 1. Agent Access Policy
```sql
CREATE POLICY "agent_workspace_isolation" ON "parlant_agent"
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_member
    WHERE user_id = current_user_id()
  ));
```

#### 2. Session Access Policy
```sql
CREATE POLICY "session_workspace_isolation" ON "parlant_session"
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_member
    WHERE user_id = current_user_id()
  ));
```

#### 3. Tool Access Policy
```sql
CREATE POLICY "tool_workspace_isolation" ON "parlant_tool"
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_member
    WHERE user_id = current_user_id()
  ));
```

### Application-Level Isolation

#### 1. Query Patterns
All application queries must include workspace filtering:
```sql
-- Correct: Workspace-scoped query
SELECT * FROM parlant_agent
WHERE workspace_id = $1 AND status = 'active';

-- Incorrect: Missing workspace filter
SELECT * FROM parlant_agent WHERE status = 'active';
```

#### 2. Insert Patterns
All inserts must specify workspace_id:
```sql
-- Agent creation
INSERT INTO parlant_agent (workspace_id, created_by, name)
VALUES ($workspace_id, $user_id, $name);

-- Session creation
INSERT INTO parlant_session (agent_id, workspace_id, user_id)
VALUES ($agent_id, $workspace_id, $user_id);
```

#### 3. Cross-Workspace Validation
```sql
-- Validate agent belongs to workspace before session creation
SELECT id FROM parlant_agent
WHERE id = $agent_id AND workspace_id = $workspace_id;
```

### Data Access Patterns

#### 1. User Permission Levels
- **Owner**: Full access to workspace Parlant data
- **Admin**: Create/edit agents, manage sessions
- **Member**: Use agents, view own sessions
- **Viewer**: Read-only access to permitted data

#### 2. Anonymous Session Handling
```sql
-- Anonymous sessions must still be workspace-scoped
INSERT INTO parlant_session (agent_id, workspace_id, user_id, customer_id)
VALUES ($agent_id, $workspace_id, NULL, $anonymous_customer_id);
```

#### 3. Cross-Workspace Prevention
- Foreign key constraints prevent cross-workspace references
- Application validation ensures workspace consistency
- Database triggers can enforce additional constraints if needed

## Data Integrity Constraints

### 1. Session Consistency
```sql
-- Ensure session agent belongs to same workspace
ALTER TABLE parlant_session
ADD CONSTRAINT session_agent_workspace_consistency
CHECK (
  workspace_id = (
    SELECT workspace_id FROM parlant_agent
    WHERE id = agent_id
  )
);
```

### 2. Journey State Consistency
```sql
-- Ensure current state belongs to current journey
ALTER TABLE parlant_session
ADD CONSTRAINT session_journey_state_consistency
CHECK (
  current_state_id IS NULL OR
  current_journey_id IS NOT NULL
);
```

### 3. Variable Scope Validation
```sql
-- Ensure session variables have valid session reference
ALTER TABLE parlant_variable
ADD CONSTRAINT variable_session_scope_consistency
CHECK (
  scope != 'session' OR session_id IS NOT NULL
);
```

### 4. Tool Permission Validation
```sql
-- Ensure tool workspace matches guideline agent workspace
-- (Enforced at application level due to JSONB tool_ids field)
```

## Performance Considerations

### 1. Connection Pooling
- Shared PostgreSQL connection pool with Sim
- Separate pool for Parlant-specific queries
- Connection limits based on expected concurrent sessions

### 2. Query Optimization
- Workspace-scoped index prefixes for optimal filtering
- Event pagination using offset-based ordering
- Session cleanup procedures for completed conversations

### 3. Data Archival Strategy
- Soft deletion for agents using `deleted_at`
- Event retention policies (e.g., 1 year for completed sessions)
- Variable cleanup for abandoned sessions
- Usage statistics aggregation and raw data cleanup

### 4. Cache Strategies
- Agent configuration caching (Redis)
- Frequently used guidelines and journeys
- Tool definitions and schemas
- Variable lookups for active sessions

## Migration and Deployment

### 1. Schema Creation Order
1. Create enumeration types
2. Create base tables (agent, tool)
3. Create dependent tables (session, guideline, journey)
4. Create relationship tables (journey_state, journey_transition)
5. Create event and variable tables
6. Add foreign key constraints
7. Create indexes and triggers

### 2. Data Migration Considerations
- Existing agent configurations
- Historical conversation data
- Tool permission mappings
- User workspace associations

### 3. Rollback Procedures
- Each migration includes rollback SQL
- Data backup before schema changes
- Gradual rollout with canary deployments
- Feature flags for Parlant functionality

## Security Considerations

### 1. Data Encryption
- Sensitive fields encrypted at application level
- API keys stored in separate secure storage
- Session variables with privacy flags
- Audit log encryption for compliance

### 2. Access Control
- Row-level security policies enforced
- API-level workspace validation
- User permission checking middleware
- Anonymous session data protection

### 3. Audit Requirements
- All data modifications logged
- User action attribution
- Compliance reporting capabilities
- Data retention policy enforcement

## Monitoring and Maintenance

### 1. Health Monitoring
- Table growth monitoring
- Index usage statistics
- Query performance tracking
- Foreign key constraint violations

### 2. Maintenance Tasks
- Regular statistics updates
- Index maintenance and optimization
- Session cleanup procedures
- Archive data migration

### 3. Performance Metrics
- Session creation/completion rates
- Agent response times
- Tool execution success rates
- Database query performance

## Integration Testing Requirements

### 1. Schema Validation Tests
- All foreign key constraints functional
- Enum types properly enforced
- Index effectiveness verified
- Trigger functionality confirmed

### 2. Workspace Isolation Tests
- Cross-workspace access prevention
- User permission enforcement
- Anonymous session handling
- Data leak prevention

### 3. Performance Tests
- Concurrent session handling
- Large dataset query performance
- Index optimization verification
- Memory usage under load

### 4. Data Integrity Tests
- Cascade deletion behavior
- Constraint enforcement
- Transaction rollback handling
- Concurrent modification safety

## Conclusion

The Parlant database schema provides a comprehensive foundation for AI agent functionality while maintaining strict integration with Sim's existing architecture. The design prioritizes:

- **Workspace Isolation**: Complete multi-tenant data separation
- **Performance**: Strategic indexing and query optimization
- **Flexibility**: JSONB fields for extensible configurations
- **Integrity**: Comprehensive foreign key constraints and validation
- **Scalability**: Efficient data access patterns and archival strategies
- **Security**: Row-level security and audit trail capabilities

This schema design enables sophisticated AI agent conversations while ensuring enterprise-grade reliability, security, and performance within the Sim ecosystem.