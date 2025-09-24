# Parlant Database Schema Documentation

## Table of Contents
- [Overview](#overview)
- [Schema Design Principles](#schema-design-principles)
- [Core Tables](#core-tables)
- [Junction Tables](#junction-tables)
- [Data Types and Enums](#data-types-and-enums)
- [Foreign Key Relationships](#foreign-key-relationships)
- [Indexes and Performance](#indexes-and-performance)
- [Workspace Isolation](#workspace-isolation)

## Overview

The Parlant database schema extends Sim's existing PostgreSQL database with AI agent functionality. The schema consists of **15 tables** supporting conversational AI agents, workflow journeys, tool integrations, and session management with complete workspace isolation.

### Schema Statistics
- **Core Tables**: 11 primary tables
- **Junction Tables**: 4 many-to-many relationship tables
- **Indexes**: 55+ optimized indexes
- **Foreign Key Constraints**: 15+ referential integrity constraints
- **Triggers**: 9 automatic timestamp update triggers
- **Enums**: 6 PostgreSQL enums for type safety

## Schema Design Principles

### Multi-Tenancy and Isolation
- **Workspace Scoping**: All data is scoped to workspaces for complete multi-tenant isolation
- **User Association**: Tables reference Sim's existing user and workspace tables
- **Anonymous Support**: Sessions support both authenticated users and anonymous customers
- **Data Boundaries**: Cryptographic isolation boundaries prevent cross-workspace access

### Data Integrity
- **Foreign Key Constraints**: Comprehensive referential integrity with appropriate cascade rules
- **Unique Constraints**: Prevent duplicate data within logical boundaries
- **NOT NULL Constraints**: Enforce required fields for data consistency
- **Enum Types**: Type-safe status fields using PostgreSQL enums

### Performance Optimization
- **Strategic Indexing**: 55+ indexes covering common query patterns
- **Composite Indexes**: Multi-column indexes for complex filtering
- **Unique Indexes**: Enforce business rules while providing query optimization
- **Partition-Ready**: Schema design supports future table partitioning

### Audit and Tracking
- **Timestamp Fields**: Created/updated timestamps on all tables
- **Soft Deletes**: Support for soft deletion with deleted_at fields
- **Usage Tracking**: Counters and timestamps for analytics and optimization
- **Event Logging**: Comprehensive event tracking for session activities

## Core Tables

### 1. parlant_agent
**Purpose**: AI agents with behavior configurations, scoped to workspaces

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique agent identifier |
| workspace_id | TEXT | NOT NULL, REFERENCES workspace(id) CASCADE | Workspace isolation |
| created_by | TEXT | NOT NULL, REFERENCES user(id) CASCADE | Creator user |
| name | TEXT | NOT NULL | Agent display name |
| description | TEXT | | Agent description |
| status | agent_status | NOT NULL, DEFAULT 'active' | Agent operational status |
| composition_mode | composition_mode | NOT NULL, DEFAULT 'fluid' | Response generation mode |
| system_prompt | TEXT | | Base system instructions |
| model_provider | TEXT | NOT NULL, DEFAULT 'openai' | AI model provider |
| model_name | TEXT | NOT NULL, DEFAULT 'gpt-4' | Specific model name |
| temperature | INTEGER | DEFAULT 70 | Response creativity (0-100) |
| max_tokens | INTEGER | DEFAULT 2000 | Maximum response length |
| total_sessions | INTEGER | NOT NULL, DEFAULT 0 | Session counter |
| total_messages | INTEGER | NOT NULL, DEFAULT 0 | Message counter |
| last_active_at | TIMESTAMP | | Last activity timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | | Soft delete timestamp |

**Key Relationships**:
- Belongs to `workspace` (CASCADE delete)
- Created by `user` (CASCADE delete)
- Has many `parlant_session`, `parlant_guideline`, `parlant_journey`

**Indexes**:
- `parlant_agent_workspace_id_idx` - Workspace queries
- `parlant_agent_workspace_status_idx` - Active agents per workspace
- `parlant_agent_last_active_idx` - Activity-based sorting

### 2. parlant_session
**Purpose**: Individual conversations between users and agents, supports anonymous users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Associated agent |
| workspace_id | TEXT | NOT NULL, REFERENCES workspace(id) CASCADE | Workspace isolation |
| user_id | TEXT | REFERENCES user(id) SET NULL | Authenticated user (nullable) |
| customer_id | TEXT | | External customer identifier |
| mode | session_mode | NOT NULL, DEFAULT 'auto' | Session interaction mode |
| status | session_status | NOT NULL, DEFAULT 'active' | Session lifecycle status |
| title | TEXT | | Session display title |
| metadata | JSONB | DEFAULT '{}' | Flexible metadata storage |
| current_journey_id | UUID | REFERENCES parlant_journey(id) SET NULL | Active journey |
| current_state_id | UUID | REFERENCES parlant_journey_state(id) SET NULL | Current journey state |
| variables | JSONB | DEFAULT '{}' | Session variables |
| event_count | INTEGER | NOT NULL, DEFAULT 0 | Event counter |
| message_count | INTEGER | NOT NULL, DEFAULT 0 | Message counter |
| started_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Session start time |
| last_activity_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last activity time |
| ended_at | TIMESTAMP | | Session end time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)
- Belongs to `workspace` (CASCADE delete)
- Optionally belongs to `user` (SET NULL delete)
- Has many `parlant_event`, `parlant_variable`

**Indexes**:
- `parlant_session_agent_status_idx` - Active sessions per agent
- `parlant_session_last_activity_idx` - Recent activity sorting
- `parlant_session_customer_id_idx` - Customer session lookup

### 3. parlant_event
**Purpose**: All events within sessions (messages, tool calls, status updates)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique event identifier |
| session_id | UUID | NOT NULL, REFERENCES parlant_session(id) CASCADE | Parent session |
| offset | INTEGER | NOT NULL | Sequential event number |
| event_type | event_type | NOT NULL | Event classification |
| content | JSONB | NOT NULL | Event payload data |
| metadata | JSONB | DEFAULT '{}' | Event metadata |
| tool_call_id | TEXT | | Tool call identifier |
| journey_id | UUID | REFERENCES parlant_journey(id) SET NULL | Associated journey |
| state_id | UUID | REFERENCES parlant_journey_state(id) SET NULL | Associated state |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event timestamp |

**Key Relationships**:
- Belongs to `parlant_session` (CASCADE delete)
- Optionally references `parlant_journey` and `parlant_journey_state`

**Indexes**:
- `parlant_event_session_offset_idx` - UNIQUE ordering within session
- `parlant_event_session_type_idx` - Event type filtering per session
- `parlant_event_tool_call_idx` - Tool call event lookup

### 4. parlant_guideline
**Purpose**: Behavior rules that guide agent responses in specific situations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique guideline identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Owner agent |
| condition | TEXT | NOT NULL | When guideline applies |
| action | TEXT | NOT NULL | What agent should do |
| priority | INTEGER | NOT NULL, DEFAULT 100 | Execution priority |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| tool_ids | JSONB | DEFAULT '[]' | Associated tool IDs |
| match_count | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| last_matched_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)

**Indexes**:
- `parlant_guideline_agent_enabled_idx` - Active guidelines per agent
- `parlant_guideline_priority_idx` - Priority-based ordering

### 5. parlant_journey
**Purpose**: Multi-step conversational flows for structured processes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique journey identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Owner agent |
| title | TEXT | NOT NULL | Journey display name |
| description | TEXT | | Journey description |
| conditions | JSONB | NOT NULL | Trigger conditions |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| allow_skipping | BOOLEAN | NOT NULL, DEFAULT TRUE | Skip step permission |
| allow_revisiting | BOOLEAN | NOT NULL, DEFAULT TRUE | Revisit permission |
| total_sessions | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| completion_rate | INTEGER | DEFAULT 0 | Success percentage |
| last_used_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)
- Has many `parlant_journey_state`, `parlant_journey_transition`

**Indexes**:
- `parlant_journey_agent_enabled_idx` - Active journeys per agent
- `parlant_journey_last_used_idx` - Usage-based sorting

### 6. parlant_journey_state
**Purpose**: Individual states within journeys defining conversation steps

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique state identifier |
| journey_id | UUID | NOT NULL, REFERENCES parlant_journey(id) CASCADE | Parent journey |
| name | TEXT | NOT NULL | State display name |
| state_type | journey_state_type | NOT NULL | State behavior type |
| chat_prompt | TEXT | | Chat state prompt |
| tool_id | TEXT | | Tool state tool ID |
| tool_config | JSONB | | Tool configuration |
| condition | TEXT | | Decision condition |
| is_initial | BOOLEAN | NOT NULL, DEFAULT FALSE | Entry state flag |
| is_final | BOOLEAN | NOT NULL, DEFAULT FALSE | Exit state flag |
| allow_skip | BOOLEAN | NOT NULL, DEFAULT TRUE | Skip permission |
| metadata | JSONB | DEFAULT '{}' | State metadata |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_journey` (CASCADE delete)

**Indexes**:
- `parlant_journey_state_journey_type_idx` - State type queries per journey
- `parlant_journey_state_initial_idx` - Initial state lookup
- `parlant_journey_state_final_idx` - Final state lookup

### 7. parlant_journey_transition
**Purpose**: Connections between journey states for flow control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique transition identifier |
| journey_id | UUID | NOT NULL, REFERENCES parlant_journey(id) CASCADE | Parent journey |
| from_state_id | UUID | NOT NULL, REFERENCES parlant_journey_state(id) CASCADE | Source state |
| to_state_id | UUID | NOT NULL, REFERENCES parlant_journey_state(id) CASCADE | Target state |
| condition | TEXT | | Transition trigger condition |
| priority | INTEGER | NOT NULL, DEFAULT 100 | Evaluation priority |
| use_count | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| last_used_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Key Relationships**:
- Belongs to `parlant_journey` (CASCADE delete)
- References `parlant_journey_state` for source and target

**Indexes**:
- `parlant_journey_transition_journey_from_idx` - Outgoing transitions per state
- `parlant_journey_transition_priority_idx` - Priority evaluation order

### 8. parlant_variable
**Purpose**: Customer/session-specific data storage for personalization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique variable identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Owner agent |
| session_id | UUID | REFERENCES parlant_session(id) CASCADE | Associated session |
| key | TEXT | NOT NULL | Variable name |
| scope | TEXT | NOT NULL, DEFAULT 'session' | Variable scope |
| value | JSONB | NOT NULL | Variable data |
| value_type | TEXT | NOT NULL | Data type indicator |
| is_private | BOOLEAN | NOT NULL, DEFAULT FALSE | Privacy flag |
| description | TEXT | | Variable description |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)
- Optionally belongs to `parlant_session` (CASCADE delete)

**Indexes**:
- `parlant_variable_session_key_idx` - UNIQUE session variable names
- `parlant_variable_agent_key_idx` - Agent variable lookup

### 9. parlant_tool
**Purpose**: Function integrations connecting Sim tools with Parlant interface

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique tool identifier |
| workspace_id | TEXT | NOT NULL, REFERENCES workspace(id) CASCADE | Workspace scope |
| name | TEXT | NOT NULL | Tool system name |
| display_name | TEXT | NOT NULL | Tool display name |
| description | TEXT | NOT NULL | Tool description |
| sim_tool_id | TEXT | | Sim tool reference |
| tool_type | TEXT | NOT NULL | Tool classification |
| parameters | JSONB | NOT NULL | Parameter schema |
| return_schema | JSONB | | Return format schema |
| usage_guidelines | TEXT | | Usage instructions |
| error_handling | JSONB | DEFAULT '{}' | Error handling config |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| is_public | BOOLEAN | NOT NULL, DEFAULT FALSE | Visibility flag |
| use_count | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| success_rate | INTEGER | DEFAULT 100 | Success percentage |
| last_used_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `workspace` (CASCADE delete)

**Indexes**:
- `parlant_tool_workspace_name_idx` - UNIQUE tool names per workspace
- `parlant_tool_sim_tool_idx` - Sim tool mapping lookup
- `parlant_tool_type_idx` - Tool type filtering

### 10. parlant_term
**Purpose**: Domain-specific terminology definitions for agent understanding

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique term identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Owner agent |
| name | TEXT | NOT NULL | Term name |
| description | TEXT | NOT NULL | Term definition |
| synonyms | JSONB | DEFAULT '[]' | Alternative terms |
| category | TEXT | | Term classification |
| examples | JSONB | DEFAULT '[]' | Usage examples |
| importance | INTEGER | NOT NULL, DEFAULT 100 | Relevance weight |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)

**Indexes**:
- `parlant_term_agent_name_idx` - UNIQUE term names per agent
- `parlant_term_category_idx` - Term category grouping

### 11. parlant_canned_response
**Purpose**: Pre-approved response templates for compliance and brand consistency

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique response identifier |
| agent_id | UUID | NOT NULL, REFERENCES parlant_agent(id) CASCADE | Owner agent |
| template | TEXT | NOT NULL | Response template |
| category | TEXT | | Response classification |
| tags | JSONB | DEFAULT '[]' | Matching tags |
| conditions | JSONB | DEFAULT '[]' | Usage conditions |
| priority | INTEGER | NOT NULL, DEFAULT 100 | Selection priority |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| requires_exact_match | BOOLEAN | NOT NULL, DEFAULT FALSE | Matching strictness |
| use_count | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| last_used_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Key Relationships**:
- Belongs to `parlant_agent` (CASCADE delete)

**Indexes**:
- `parlant_canned_response_agent_category_idx` - Category lookup per agent
- `parlant_canned_response_priority_idx` - Priority-based selection

## Junction Tables

### 1. parlant_agent_tool
**Purpose**: Many-to-many relationship between agents and tools with specific configurations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | Referenced agent |
| tool_id | UUID | Referenced tool |
| configuration | JSONB | Agent-specific tool config |
| enabled | BOOLEAN | Tool availability for agent |
| priority | INTEGER | Execution priority |
| use_count | INTEGER | Usage tracking |
| last_used_at | TIMESTAMP | Last usage time |

**Unique Constraint**: `(agent_id, tool_id)` - One configuration per agent-tool pair

### 2. parlant_journey_guideline
**Purpose**: Many-to-many relationship between journeys and guidelines with context overrides

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| journey_id | UUID | Referenced journey |
| guideline_id | UUID | Referenced guideline |
| priority_override | INTEGER | Journey-specific priority |
| enabled | BOOLEAN | Guideline active in journey |
| journey_specific_condition | TEXT | Additional context condition |
| match_count | INTEGER | Usage tracking |
| last_matched_at | TIMESTAMP | Last match time |

**Unique Constraint**: `(journey_id, guideline_id)` - One override per journey-guideline pair

### 3. parlant_agent_knowledge_base
**Purpose**: Connection between agents and Sim's knowledge bases for RAG operations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | Referenced agent |
| knowledge_base_id | TEXT | Sim knowledge base ID |
| enabled | BOOLEAN | Knowledge base access |
| search_threshold | INTEGER | Similarity threshold (0-100) |
| max_results | INTEGER | Maximum search results |
| priority | INTEGER | Search priority |
| search_count | INTEGER | Usage tracking |
| last_searched_at | TIMESTAMP | Last search time |

**Unique Constraint**: `(agent_id, knowledge_base_id)` - One config per agent-KB pair

### 4. parlant_tool_integration
**Purpose**: Connection between Parlant tools and Sim's existing tools with mapping configurations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| parlant_tool_id | UUID | Parlant tool definition |
| integration_type | TEXT | Integration type ('custom_tool', 'workflow_block', 'mcp_server') |
| target_id | TEXT | Target system ID |
| configuration | JSONB | Integration settings |
| enabled | BOOLEAN | Integration status |
| parameter_mapping | JSONB | Parameter translation rules |
| response_mapping | JSONB | Response transformation rules |
| last_health_check | TIMESTAMP | Health monitoring |
| health_status | TEXT | Current health status |
| error_count | INTEGER | Error tracking |
| last_error | TEXT | Most recent error |

**Unique Constraint**: `(parlant_tool_id, integration_type, target_id)` - One integration per target

## Data Types and Enums

### PostgreSQL Enums

#### agent_status
- `active` - Agent is operational and available
- `inactive` - Agent is disabled but not archived
- `archived` - Agent is archived and unavailable

#### session_mode
- `auto` - Automatic conversation flow
- `manual` - Manual conversation control
- `paused` - Session temporarily paused

#### session_status
- `active` - Session is ongoing
- `completed` - Session ended successfully
- `abandoned` - Session ended without completion

#### event_type
- `customer_message` - Message from user/customer
- `agent_message` - Response from agent
- `tool_call` - Agent tool invocation
- `tool_result` - Tool execution result
- `status_update` - Session status change
- `journey_transition` - Journey state change
- `variable_update` - Variable modification

#### journey_state_type
- `chat` - Conversational interaction state
- `tool` - Tool execution state
- `decision` - Conditional branching state
- `final` - Journey completion state

#### composition_mode
- `fluid` - Flexible response generation
- `strict` - Controlled response generation

### JSONB Field Schemas

#### Session Variables
```json
{
  "customer_name": "string",
  "customer_email": "string",
  "preferences": {
    "language": "en",
    "timezone": "UTC"
  },
  "context": {
    "last_order_id": "order_123",
    "support_level": "premium"
  }
}
```

#### Tool Parameters Schema
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 10
    }
  },
  "required": ["query"]
}
```

#### Event Content Examples
```json
// Customer Message Event
{
  "message": "I need help with my order",
  "channel": "chat",
  "timestamp": "2025-01-23T10:30:00Z"
}

// Tool Call Event
{
  "tool_name": "search_orders",
  "parameters": {
    "customer_id": "cust_123",
    "status": "pending"
  },
  "call_id": "call_abc123"
}
```

## Foreign Key Relationships

### Cascade Delete Rules

#### Workspace Isolation (CASCADE)
- `parlant_agent.workspace_id` → `workspace.id` CASCADE
- `parlant_session.workspace_id` → `workspace.id` CASCADE
- `parlant_tool.workspace_id` → `workspace.id` CASCADE

**Effect**: Deleting a workspace removes all Parlant data for that workspace

#### Agent Hierarchy (CASCADE)
- `parlant_session.agent_id` → `parlant_agent.id` CASCADE
- `parlant_guideline.agent_id` → `parlant_agent.id` CASCADE
- `parlant_journey.agent_id` → `parlant_agent.id` CASCADE
- `parlant_variable.agent_id` → `parlant_agent.id` CASCADE
- `parlant_term.agent_id` → `parlant_agent.id` CASCADE

**Effect**: Deleting an agent removes all associated guidelines, journeys, sessions

#### Session Data (CASCADE)
- `parlant_event.session_id` → `parlant_session.id` CASCADE
- `parlant_variable.session_id` → `parlant_session.id` CASCADE

**Effect**: Deleting a session removes all events and session variables

#### Journey Flow (CASCADE)
- `parlant_journey_state.journey_id` → `parlant_journey.id` CASCADE
- `parlant_journey_transition.journey_id` → `parlant_journey.id` CASCADE
- `parlant_journey_transition.from_state_id` → `parlant_journey_state.id` CASCADE
- `parlant_journey_transition.to_state_id` → `parlant_journey_state.id` CASCADE

**Effect**: Deleting a journey removes all states and transitions

### SET NULL Rules

#### User References (SET NULL)
- `parlant_session.user_id` → `user.id` SET NULL

**Effect**: Deleting a user preserves their sessions but removes user association

#### Journey References (SET NULL)
- `parlant_session.current_journey_id` → `parlant_journey.id` SET NULL
- `parlant_session.current_state_id` → `parlant_journey_state.id` SET NULL
- `parlant_event.journey_id` → `parlant_journey.id` SET NULL
- `parlant_event.state_id` → `parlant_journey_state.id` SET NULL

**Effect**: Deleting journeys/states preserves sessions but removes journey context

### Junction Table Relationships

All junction tables use CASCADE deletes for both sides:
- `parlant_agent_tool` cascades from both agent and tool deletion
- `parlant_journey_guideline` cascades from both journey and guideline deletion
- `parlant_agent_knowledge_base` cascades from agent deletion
- `parlant_tool_integration` cascades from tool deletion

## Indexes and Performance

### Index Categories

#### Primary Access Patterns
- **Workspace Isolation**: All tables have workspace-scoped indexes
- **User Access**: User-specific data retrieval indexes
- **Agent Operations**: Agent-centric query optimization
- **Session Management**: Session lifecycle and activity indexes

#### Composite Indexes
- `parlant_agent_workspace_status_idx` - Active agents per workspace
- `parlant_session_agent_status_idx` - Active sessions per agent
- `parlant_event_session_type_idx` - Event type filtering per session
- `parlant_guideline_agent_enabled_idx` - Active guidelines per agent

#### Unique Indexes
- `parlant_event_session_offset_idx` - Event ordering within sessions
- `parlant_tool_workspace_name_idx` - Tool name uniqueness per workspace
- `parlant_variable_session_key_idx` - Variable name uniqueness per session
- `parlant_term_agent_name_idx` - Term name uniqueness per agent

#### Performance Indexes
- Time-based indexes for activity sorting and filtering
- Status indexes for active/inactive filtering
- Priority indexes for guideline and transition ordering
- Usage tracking indexes for analytics queries

### Query Optimization Guidelines

#### Workspace Queries
```sql
-- Always include workspace_id in WHERE clauses
SELECT * FROM parlant_agent
WHERE workspace_id = $1 AND status = 'active';
```

#### Session Activity
```sql
-- Use composite indexes for session filtering
SELECT * FROM parlant_session
WHERE agent_id = $1 AND status = 'active'
ORDER BY last_activity_at DESC;
```

#### Event Retrieval
```sql
-- Use session_id + offset for efficient event pagination
SELECT * FROM parlant_event
WHERE session_id = $1 AND offset > $2
ORDER BY offset ASC LIMIT 50;
```

## Workspace Isolation

### Isolation Mechanisms

#### Database Level
- **Foreign Key Constraints**: All tables reference workspace table
- **Row-Level Security**: Future RLS implementation ready
- **Query Patterns**: All queries filtered by workspace_id

#### Application Level
- **Session Store**: Workspace-scoped session storage
- **Access Control**: Permission validation before database access
- **Data Boundaries**: Cryptographic isolation verification

#### Security Features
- **Cross-Workspace Prevention**: Queries cannot access other workspace data
- **User Validation**: User workspace membership verification
- **Audit Logging**: All data access logged with workspace context
- **Boundary Hashing**: Data integrity verification using workspace hashes

### Multi-Tenant Architecture

#### Tenant Separation
```sql
-- All Parlant queries include workspace isolation
WHERE workspace_id = :current_user_workspace_id
```

#### Performance Considerations
- Workspace-scoped indexes prevent full table scans
- Partition-ready design for large tenant scaling
- Connection pooling optimized for multi-tenant access
- Query plan caching per workspace pattern

#### Compliance and Security
- GDPR compliance through workspace-scoped data deletion
- SOC2 compliance through audit logging and access controls
- Data residency through workspace-specific configurations
- Zero-trust access patterns with workspace verification

### Future Enhancements

#### Planned Improvements
- **Row-Level Security**: PostgreSQL RLS for additional security layer
- **Table Partitioning**: Partition large tables by workspace for performance
- **Read Replicas**: Workspace-aware read replica routing
- **Backup Isolation**: Workspace-specific backup and recovery procedures

This completes the comprehensive database schema documentation for the Parlant system, providing detailed information about all tables, relationships, indexes, and architectural patterns used to support AI agent functionality within Sim's multi-tenant environment.