# Parlant Database Data Dictionary

## Table of Contents
- [Overview](#overview)
- [PostgreSQL Enums](#postgresql-enums)
- [Data Type Conventions](#data-type-conventions)
- [Field Naming Conventions](#field-naming-conventions)
- [JSONB Schema Definitions](#jsonb-schema-definitions)
- [Field Documentation by Table](#field-documentation-by-table)
- [Validation Rules](#validation-rules)
- [Data Format Standards](#data-format-standards)

## Overview

This data dictionary provides comprehensive documentation for all fields, data types, and formatting standards used in the Parlant database schema. It serves as the authoritative reference for understanding data structures, constraints, and business rules.

### Documentation Standards
- **Field Names**: Snake_case for database columns, camelCase in TypeScript
- **Descriptions**: Business-focused explanations of field purpose
- **Constraints**: Technical and business validation rules
- **Examples**: Representative sample data for complex fields

## PostgreSQL Enums

### agent_status
**Purpose**: Defines the operational state of AI agents

| Value | Description | Use Case |
|-------|-------------|----------|
| `active` | Agent is operational and can handle sessions | Normal operational state |
| `inactive` | Agent is disabled but not archived | Temporary disabling for maintenance |
| `archived` | Agent is permanently disabled and hidden | Long-term storage of old agents |

**Business Rules**:
- Only `active` agents can create new sessions
- `inactive` agents can complete existing sessions but not start new ones
- `archived` agents are read-only for historical data

### session_mode
**Purpose**: Controls how agent interactions are managed within a session

| Value | Description | Use Case |
|-------|-------------|----------|
| `auto` | Agent responds automatically to user messages | Standard conversational flow |
| `manual` | Agent requires manual approval for responses | Supervised or training mode |
| `paused` | Session is temporarily suspended | System maintenance or user request |

**Business Rules**:
- `auto` mode enables full autonomous agent operation
- `manual` mode requires human oversight for each response
- `paused` mode prevents any agent responses until resumed

### session_status
**Purpose**: Tracks the lifecycle state of conversation sessions

| Value | Description | Use Case |
|-------|-------------|----------|
| `active` | Session is ongoing and can receive messages | Normal conversation state |
| `completed` | Session ended successfully | Successful conversation conclusion |
| `abandoned` | Session ended without proper closure | User left without completing flow |

**Business Rules**:
- Only `active` sessions can receive new messages
- `completed` sessions indicate successful journey completion
- `abandoned` sessions may trigger follow-up workflows

### event_type
**Purpose**: Categorizes different types of events within sessions

| Value | Description | Data Format |
|-------|-------------|-------------|
| `customer_message` | Message from user/customer | Text content with metadata |
| `agent_message` | Response from AI agent | Generated text with reasoning |
| `tool_call` | Agent invokes a tool/function | Tool name, parameters, call ID |
| `tool_result` | Result from tool execution | Return data, status, errors |
| `status_update` | Session or agent status change | Old/new status, reason |
| `journey_transition` | Movement between journey states | From/to states, trigger condition |
| `variable_update` | Session variable modification | Variable name, old/new values |

**Business Rules**:
- Events must maintain chronological order via `offset` field
- `tool_call` events must have corresponding `tool_result` events
- `journey_transition` events track conversation flow progress

### journey_state_type
**Purpose**: Defines behavior types for conversation flow states

| Value | Description | Required Fields |
|-------|-------------|-----------------|
| `chat` | Conversational interaction state | `chat_prompt` |
| `tool` | Tool execution state | `tool_id`, `tool_config` |
| `decision` | Conditional branching state | `condition` |
| `final` | Journey completion state | `is_final = true` |

**Business Rules**:
- `chat` states present prompts and collect user responses
- `tool` states execute functions and process results
- `decision` states evaluate conditions to determine next state
- `final` states mark journey completion

### composition_mode
**Purpose**: Controls agent response generation strategy

| Value | Description | Behavior |
|-------|-------------|----------|
| `fluid` | Flexible, adaptive response generation | Natural, contextual responses |
| `strict` | Controlled, guideline-enforced responses | Rule-based, consistent responses |

**Business Rules**:
- `fluid` mode allows creative and adaptive responses
- `strict` mode enforces guidelines and canned responses more rigidly
- Mode affects how guidelines and journeys are applied

## Data Type Conventions

### UUID Fields
- **Format**: Standard RFC 4122 UUID v4
- **Generation**: `gen_random_uuid()` for PostgreSQL, `uuid4()` for applications
- **Display**: Lowercase with hyphens (e.g., `123e4567-e89b-12d3-a456-426614174000`)
- **Usage**: Primary keys and foreign key references

### Text Fields
- **Encoding**: UTF-8
- **Max Length**: Unlimited for PostgreSQL TEXT type
- **Trimming**: Leading/trailing whitespace should be trimmed on input
- **Validation**: Business-specific validation rules apply

### Timestamp Fields
- **Format**: ISO 8601 with timezone (stored in UTC)
- **Precision**: Microsecond precision
- **Display**: `2025-01-23T10:30:00.123456Z`
- **Indexing**: Often indexed for time-based queries

### Integer Fields
- **Range**: 32-bit signed integers (-2,147,483,648 to 2,147,483,647)
- **Percentage Values**: Stored as 0-100 integers
- **Monetary Values**: Stored in cents to avoid decimal precision issues
- **Counters**: Non-negative integers with default 0

### Boolean Fields
- **Storage**: PostgreSQL BOOLEAN type
- **Display**: `true`/`false` in JSON, `t`/`f` in PostgreSQL
- **Default Values**: Explicitly set in schema, typically `false` for permissions

### JSONB Fields
- **Storage**: PostgreSQL JSONB (indexed, queryable)
- **Validation**: Application-level schema validation
- **Querying**: Supports GIN indexing and operator queries
- **Defaults**: Empty object `{}` or array `[]` as appropriate

## Field Naming Conventions

### Database Columns (snake_case)
- **Primary Keys**: `id`
- **Foreign Keys**: `{table}_id` (e.g., `workspace_id`, `agent_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`, `last_activity_at`
- **Status Fields**: `status`, `enabled`, `is_active`
- **Counters**: `use_count`, `total_sessions`, `match_count`
- **Configuration**: `config`, `metadata`, `settings`

### TypeScript Properties (camelCase)
- **Conversion**: Automatic mapping between snake_case and camelCase
- **Primary Keys**: `id`
- **Foreign Keys**: `workspaceId`, `agentId`, `sessionId`
- **Timestamps**: `createdAt`, `updatedAt`, `lastActivityAt`
- **Boolean Flags**: `isActive`, `isPublic`, `allowSkipping`

### JSONB Object Keys (camelCase)
- **Consistency**: Use camelCase within JSONB objects
- **Nesting**: Support nested object structures
- **Arrays**: Use plural names for array fields
- **Metadata**: Prefix internal fields with underscore

## JSONB Schema Definitions

### Agent Configuration (`parlant_agent.custom_config`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "personality": {
      "type": "object",
      "properties": {
        "tone": {"type": "string", "enum": ["formal", "casual", "friendly", "professional"]},
        "style": {"type": "string", "enum": ["concise", "detailed", "conversational"]},
        "empathy_level": {"type": "integer", "minimum": 1, "maximum": 10}
      }
    },
    "capabilities": {
      "type": "object",
      "properties": {
        "multimodal": {"type": "boolean"},
        "long_context": {"type": "boolean"},
        "real_time": {"type": "boolean"}
      }
    },
    "restrictions": {
      "type": "object",
      "properties": {
        "forbidden_topics": {"type": "array", "items": {"type": "string"}},
        "content_filters": {"type": "array", "items": {"type": "string"}},
        "rate_limits": {
          "type": "object",
          "properties": {
            "messages_per_hour": {"type": "integer", "minimum": 1},
            "tokens_per_day": {"type": "integer", "minimum": 1}
          }
        }
      }
    }
  }
}
```

### Session Variables (`parlant_session.variables`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "user_context": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "email": {"type": "string", "format": "email"},
        "preferred_language": {"type": "string", "pattern": "^[a-z]{2}(-[A-Z]{2})?$"},
        "timezone": {"type": "string"},
        "account_type": {"type": "string", "enum": ["free", "premium", "enterprise"]}
      }
    },
    "conversation_context": {
      "type": "object",
      "properties": {
        "topic": {"type": "string"},
        "intent": {"type": "string"},
        "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
        "urgency": {"type": "string", "enum": ["low", "medium", "high", "critical"]}
      }
    },
    "business_context": {
      "type": "object",
      "properties": {
        "customer_id": {"type": "string"},
        "account_value": {"type": "number", "minimum": 0},
        "support_tier": {"type": "string", "enum": ["basic", "priority", "premium"]},
        "case_history": {"type": "array", "items": {"type": "string"}}
      }
    }
  }
}
```

### Tool Parameters Schema (`parlant_tool.parameters`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "type": {"const": "object"},
    "properties": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "type": "object",
          "properties": {
            "type": {"type": "string", "enum": ["string", "number", "boolean", "array", "object"]},
            "description": {"type": "string", "minLength": 10},
            "required": {"type": "boolean", "default": false},
            "default": {},
            "enum": {"type": "array"},
            "minimum": {"type": "number"},
            "maximum": {"type": "number"},
            "minLength": {"type": "integer", "minimum": 0},
            "maxLength": {"type": "integer", "minimum": 0},
            "pattern": {"type": "string", "format": "regex"}
          },
          "required": ["type", "description"]
        }
      }
    },
    "required": {"type": "array", "items": {"type": "string"}},
    "additionalProperties": {"type": "boolean", "default": false}
  },
  "required": ["type", "properties"]
}
```

### Event Content Schemas

#### Customer Message Event
```json
{
  "message": "I need help with my order",
  "timestamp": "2025-01-23T10:30:00.123Z",
  "channel": "chat",
  "message_id": "msg_123",
  "user_agent": "Mozilla/5.0...",
  "attachments": [
    {
      "type": "image",
      "url": "https://...",
      "filename": "screenshot.png",
      "size": 1024000
    }
  ]
}
```

#### Agent Message Event
```json
{
  "message": "I can help you with your order. Let me look that up for you.",
  "timestamp": "2025-01-23T10:30:05.456Z",
  "reasoning": "User is asking for order help, should use order lookup tool",
  "confidence": 95,
  "tokens_used": 45,
  "cost_cents": 2,
  "model_version": "gpt-4-1106-preview"
}
```

#### Tool Call Event
```json
{
  "tool_name": "search_orders",
  "tool_call_id": "call_abc123",
  "parameters": {
    "customer_email": "user@example.com",
    "status": "pending",
    "limit": 5
  },
  "timestamp": "2025-01-23T10:30:06.789Z"
}
```

#### Tool Result Event
```json
{
  "tool_call_id": "call_abc123",
  "success": true,
  "result": {
    "orders": [
      {
        "id": "order_789",
        "status": "shipped",
        "total": 4500,
        "currency": "USD"
      }
    ],
    "total_count": 1
  },
  "execution_time_ms": 250,
  "timestamp": "2025-01-23T10:30:07.039Z"
}
```

## Field Documentation by Table

### parlant_agent

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique agent identifier, auto-generated |
| workspace_id | TEXT | NOT NULL, FK | References workspace.id, determines data boundary |
| created_by | TEXT | NOT NULL, FK | References user.id, tracks agent creator |
| name | TEXT | NOT NULL | Agent display name, shown to users |
| description | TEXT | NULLABLE | Detailed agent description and purpose |
| status | agent_status | NOT NULL, DEFAULT 'active' | Operational status: active/inactive/archived |
| composition_mode | composition_mode | NOT NULL, DEFAULT 'fluid' | Response generation mode: fluid/strict |
| system_prompt | TEXT | NULLABLE | Base system instructions for the agent |
| model_provider | TEXT | NOT NULL, DEFAULT 'openai' | AI model provider (openai, anthropic, etc.) |
| model_name | TEXT | NOT NULL, DEFAULT 'gpt-4' | Specific model name (gpt-4, claude-3, etc.) |
| temperature | INTEGER | DEFAULT 70 | Response creativity 0-100 (70 = balanced) |
| max_tokens | INTEGER | DEFAULT 2000 | Maximum response length in tokens |
| response_timeout_ms | INTEGER | DEFAULT 30000 | Maximum response generation time |
| max_context_length | INTEGER | DEFAULT 8000 | Context window size for conversations |
| system_instructions | TEXT | NULLABLE | Additional system-level instructions |
| allow_interruption | BOOLEAN | NOT NULL, DEFAULT true | Can be interrupted mid-response |
| allow_proactive_messages | BOOLEAN | NOT NULL, DEFAULT false | Can send unsolicited messages |
| conversation_style | TEXT | DEFAULT 'professional' | Communication style preference |
| data_retention_days | INTEGER | DEFAULT 30 | Session data retention period |
| allow_data_export | BOOLEAN | NOT NULL, DEFAULT true | Permits data export requests |
| pii_handling_mode | TEXT | DEFAULT 'standard' | PII handling policy level |
| integration_metadata | JSONB | DEFAULT '{}' | External system integration data |
| custom_config | JSONB | DEFAULT '{}' | Flexible custom configuration |
| total_sessions | INTEGER | NOT NULL, DEFAULT 0 | Cumulative session counter |
| total_messages | INTEGER | NOT NULL, DEFAULT 0 | Cumulative message counter |
| total_tokens_used | INTEGER | NOT NULL, DEFAULT 0 | Cumulative token usage |
| total_cost | INTEGER | NOT NULL, DEFAULT 0 | Cumulative cost in cents |
| average_session_duration | INTEGER | NULLABLE | Average session length in seconds |
| last_active_at | TIMESTAMP | NULLABLE | Last activity timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record last update time |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

### parlant_session

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| agent_id | UUID | NOT NULL, FK | References parlant_agent.id |
| workspace_id | TEXT | NOT NULL, FK | References workspace.id for isolation |
| user_id | TEXT | NULLABLE, FK | References user.id, NULL for anonymous |
| customer_id | TEXT | NULLABLE | External customer system identifier |
| mode | session_mode | NOT NULL, DEFAULT 'auto' | Interaction mode: auto/manual/paused |
| status | session_status | NOT NULL, DEFAULT 'active' | Lifecycle status: active/completed/abandoned |
| title | TEXT | NULLABLE | User-friendly session title |
| metadata | JSONB | DEFAULT '{}' | Flexible session metadata |
| current_journey_id | UUID | NULLABLE, FK | Active journey reference |
| current_state_id | UUID | NULLABLE, FK | Current journey state reference |
| variables | JSONB | DEFAULT '{}' | Session-specific variables |
| event_count | INTEGER | NOT NULL, DEFAULT 0 | Total events in session |
| message_count | INTEGER | NOT NULL, DEFAULT 0 | Total messages exchanged |
| tokens_used | INTEGER | NOT NULL, DEFAULT 0 | Total tokens consumed |
| cost | INTEGER | NOT NULL, DEFAULT 0 | Total cost in cents |
| average_response_time | INTEGER | NULLABLE | Average response time in milliseconds |
| satisfaction_score | INTEGER | NULLABLE | User satisfaction rating 1-5 |
| session_type | TEXT | DEFAULT 'conversation' | Session category/type |
| tags | JSONB | DEFAULT '[]' | Classification tags array |
| user_agent | TEXT | NULLABLE | Browser/application information |
| ip_address | TEXT | NULLABLE | Anonymized IP address for analytics |
| referrer | TEXT | NULLABLE | Source of session initiation |
| locale | TEXT | DEFAULT 'en' | User language preference |
| timezone | TEXT | DEFAULT 'UTC' | User timezone |
| started_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Session start time |
| last_activity_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last interaction time |
| ended_at | TIMESTAMP | NULLABLE | Session end time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record last update time |

### parlant_event

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique event identifier |
| session_id | UUID | NOT NULL, FK | References parlant_session.id |
| offset | INTEGER | NOT NULL | Sequential event number within session |
| event_type | event_type | NOT NULL | Event classification |
| content | JSONB | NOT NULL | Event payload data |
| metadata | JSONB | DEFAULT '{}' | Event metadata |
| tool_call_id | TEXT | NULLABLE | Tool invocation identifier |
| journey_id | UUID | NULLABLE, FK | Associated journey reference |
| state_id | UUID | NULLABLE, FK | Associated journey state reference |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event timestamp |

**Unique Constraint**: (session_id, offset) - Ensures event ordering

### parlant_tool

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique tool identifier |
| workspace_id | TEXT | NOT NULL, FK | References workspace.id |
| name | TEXT | NOT NULL | System tool name (must be unique per workspace) |
| display_name | TEXT | NOT NULL | User-friendly tool name |
| description | TEXT | NOT NULL | Tool purpose and functionality description |
| sim_tool_id | TEXT | NULLABLE | Reference to original Sim tool |
| tool_type | TEXT | NOT NULL | Tool classification (sim_native, custom, external) |
| parameters | JSONB | NOT NULL | JSON schema for tool parameters |
| return_schema | JSONB | NULLABLE | Expected return data schema |
| usage_guidelines | TEXT | NULLABLE | When and how to use this tool |
| error_handling | JSONB | DEFAULT '{}' | Error handling configuration |
| execution_timeout | INTEGER | DEFAULT 30000 | Maximum execution time in milliseconds |
| retry_policy | JSONB | DEFAULT '{"max_attempts": 3, "backoff_ms": 1000}' | Retry configuration |
| rate_limit_per_minute | INTEGER | DEFAULT 60 | Per-minute usage limit |
| rate_limit_per_hour | INTEGER | DEFAULT 1000 | Per-hour usage limit |
| requires_auth | BOOLEAN | NOT NULL, DEFAULT false | Authentication requirement |
| auth_type | TEXT | NULLABLE | Authentication method |
| auth_config | JSONB | DEFAULT '{}' | Authentication configuration |
| enabled | BOOLEAN | NOT NULL, DEFAULT true | Tool availability |
| is_public | BOOLEAN | NOT NULL, DEFAULT false | Public tool visibility |
| is_deprecated | BOOLEAN | NOT NULL, DEFAULT false | Deprecation status |
| use_count | INTEGER | NOT NULL, DEFAULT 0 | Usage counter |
| success_rate | INTEGER | DEFAULT 100 | Success rate percentage |
| last_used_at | TIMESTAMP | NULLABLE | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record last update time |

**Unique Constraint**: (workspace_id, name) - Tool names unique per workspace

## Validation Rules

### Business Logic Validations

#### Agent Configuration
- `temperature`: Must be 0-100 (inclusive)
- `max_tokens`: Must be 1-32000 (model dependent)
- `data_retention_days`: Must be 1-365 (regulatory compliance)
- `model_provider` + `model_name`: Must be valid combination

#### Session Management
- `satisfaction_score`: Must be 1-5 (if provided)
- `tokens_used`: Must not exceed agent `max_tokens` * `message_count`
- `cost`: Must be non-negative and correlate with `tokens_used`
- `ended_at`: Must be >= `started_at` (if provided)

#### Event Ordering
- `offset`: Must be sequential within session (no gaps or duplicates)
- `tool_call` events must precede corresponding `tool_result` events
- `journey_transition` events must reference valid state transitions

#### Tool Configuration
- `parameters`: Must be valid JSON Schema
- `rate_limit_per_minute` <= `rate_limit_per_hour`
- `execution_timeout`: Must be 1-300000 milliseconds
- `success_rate`: Must be 0-100

### Data Format Validations

#### Email Addresses
- Pattern: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- Max Length: 320 characters (RFC 5321)

#### URLs
- Must be valid HTTP/HTTPS URLs
- Max Length: 2048 characters
- Required for external tool integrations

#### Language Codes
- Format: ISO 639-1 (e.g., 'en', 'es', 'fr')
- Optional region: ISO 3166-1 (e.g., 'en-US', 'es-MX')

#### Timezone Identifiers
- Format: IANA timezone database (e.g., 'America/New_York', 'Europe/London')
- Validation against known timezone list

## Data Format Standards

### Monetary Values
- **Storage**: Integer values in cents (USD) or smallest currency unit
- **Display**: Convert to decimal for user interfaces
- **Precision**: No floating-point arithmetic for financial calculations

### Timestamps
- **Storage**: UTC timezone in PostgreSQL
- **Format**: ISO 8601 with microseconds
- **Display**: Convert to user timezone for presentation
- **Indexing**: B-tree indexes for range queries

### Text Content
- **Encoding**: UTF-8 throughout system
- **Normalization**: NFC normalization for Unicode text
- **Sanitization**: HTML encoding for user-generated content
- **Search**: Full-text search preparation with stemming

### JSON Data
- **Validation**: JSON Schema validation at application layer
- **Indexing**: GIN indexes for JSONB columns with frequent queries
- **Migration**: Version fields for schema evolution
- **Compression**: Automatic compression for large JSON objects

This comprehensive data dictionary ensures consistent data handling and provides clear guidance for developers working with the Parlant database schema.