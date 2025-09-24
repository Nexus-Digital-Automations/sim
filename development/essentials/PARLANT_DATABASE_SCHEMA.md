# Parlant Database Schema Integration Analysis

## Overview
This document provides a comprehensive analysis of the Parlant database schema integration with Sim's existing database architecture. The integration maintains multi-tenant isolation, leverages existing Sim infrastructure, and provides a scalable foundation for AI agent management.

## Database Architecture Overview

### Core Design Principles
1. **Multi-tenant Isolation**: All Parlant entities are scoped to workspaces
2. **Foreign Key Integrity**: Strong referential integrity between Sim and Parlant tables
3. **Scalable Indexing**: Optimized indexes for common query patterns
4. **Soft Delete Support**: Graceful data retention and cleanup
5. **Performance Optimization**: Strategic use of JSONB and composite indexes

## Sim Core Schema Analysis

### User & Organization Hierarchy
```
organization
├── member (user ↔ organization relationships)
├── invitation (pending memberships)
└── subscription (billing per organization)

user
├── session (auth sessions)
├── account (OAuth providers)
├── settings (user preferences)
├── userStats (usage tracking)
└── workspace ownership
```

### Workspace Structure
```
workspace
├── workspaceEnvironment (environment variables)
├── workspaceInvitation (user invitations)
├── permissions (user access control)
├── workflow (user workflows)
├── knowledgeBase (RAG data)
├── apiKey (workspace API keys)
└── mcpServers (external tool integrations)
```

### Workflow System
```
workflow
├── workflowBlocks (individual workflow nodes)
├── workflowEdges (connections between blocks)
├── workflowSubflows (loops and parallel execution)
├── workflowExecutionLogs (run history)
├── workflowExecutionSnapshots (state snapshots)
├── workflowSchedule (scheduled execution)
└── webhook (external triggers)
```

## Parlant Schema Integration

### Core Agent Management

#### parlantAgent Table
**Purpose**: Central agent definitions with comprehensive configuration
**Key Relationships**:
- `workspaceId` → `workspace.id` (CASCADE DELETE)
- `createdBy` → `user.id` (CASCADE DELETE)

**Multi-tenant Isolation**: Agents are workspace-scoped, ensuring complete tenant separation.

**Configuration Fields**:
- AI model settings (provider, model, temperature, max tokens)
- Behavior controls (interruption, proactive messaging, conversation style)
- Privacy settings (data retention, PII handling)
- Usage analytics (sessions, messages, tokens, cost)

#### parlantSession Table
**Purpose**: Individual conversations between users and agents
**Key Relationships**:
- `agentId` → `parlantAgent.id` (CASCADE DELETE)
- `workspaceId` → `workspace.id` (CASCADE DELETE)
- `userId` → `user.id` (SET NULL) - Optional for anonymous sessions
- `currentJourneyId` → `parlantJourney.id` (RESTRICT)

**Session Types**: Supports both authenticated Sim users and anonymous external customers.

**Analytics Integration**: Comprehensive tracking of user engagement, performance metrics, and session categorization.

#### parlantEvent Table
**Purpose**: Immutable event log for all session activities
**Key Relationships**:
- `sessionId` → `parlantSession.id` (CASCADE DELETE)
- `journeyId` → `parlantJourney.id` (RESTRICT)
- `stateId` → `parlantJourneyState.id` (RESTRICT)

**Event Ordering**: Sequential `offset` field ensures proper event ordering within sessions.

**Event Types**:
- `customer_message`: User inputs
- `agent_message`: AI responses
- `tool_call`/`tool_result`: Function execution
- `status_update`: System events
- `journey_transition`: Flow state changes
- `variable_update`: Context changes

### Behavior Management

#### parlantGuideline Table
**Purpose**: Behavior rules that guide agent responses
**Key Relationships**:
- `agentId` → `parlantAgent.id` (CASCADE DELETE)

**Rule Engine**: Condition-action pairs with priority ordering and usage analytics.

#### parlantJourney/parlantJourneyState/parlantJourneyTransition Tables
**Purpose**: Multi-step conversational flows
**Key Relationships**:
- `journeyId` → `parlantAgent.id` (CASCADE DELETE)
- `fromStateId`/`toStateId` → `parlantJourneyState.id` (CASCADE DELETE)

**State Machine**: Implements finite state machine for structured conversations with conditional transitions.

### Tool Integration

#### parlantTool Table
**Purpose**: Function definitions available to agents
**Key Relationships**:
- `workspaceId` → `workspace.id` (CASCADE DELETE)

**Tool Types**:
- `sim_native`: Built-in Sim workflow blocks
- `custom`: User-defined functions from customTools table
- `external`: MCP server integrations

#### parlantToolIntegration Table
**Purpose**: Maps Parlant tools to actual Sim implementations
**Key Relationships**:
- `parlantToolId` → `parlantTool.id` (CASCADE DELETE)
- `targetId` references various Sim tables based on `integrationType`

**Integration Types**:
- `custom_tool` → `customTools.id`
- `workflow_block` → `workflowBlocks.id`
- `mcp_server` → `mcpServers.id`

**Parameter Mapping**: Flexible parameter and response translation between Parlant and Sim tool formats.

### Junction Tables (Many-to-Many Relationships)

#### parlantAgentTool
**Purpose**: Agent-specific tool configurations
- Agents can access multiple tools with custom settings
- Usage tracking per agent-tool combination
- Priority-based tool execution ordering

#### parlantAgentKnowledgeBase
**Purpose**: RAG integration with Sim's knowledge bases
- Search threshold and result limit configuration
- Usage analytics for knowledge base queries
- Priority-based search ordering

#### parlantJourneyGuideline
**Purpose**: Context-specific guideline overrides
- Journey-specific behavior modifications
- Priority overrides for contextual rules
- Usage tracking in journey context

## Foreign Key Relationships & Data Integrity

### Cascade Delete Patterns
1. **Workspace Deletion**: Removes all Parlant agents and related data
2. **Agent Deletion**: Cascades to sessions, guidelines, journeys, tools
3. **Session Deletion**: Cascades to events and variables
4. **User Deletion**: Sets agent createdBy to NULL, preserves agents

### SET NULL Patterns
1. **User Sessions**: Anonymous sessions survive user deletion
2. **API Keys**: Workspace keys survive creator deletion

### RESTRICT Patterns
1. **Active Journey References**: Prevents deletion of active journey states
2. **Knowledge Base References**: Protects referenced knowledge bases

## Multi-Tenant Isolation Strategy

### Workspace-Level Isolation
All Parlant entities are directly or indirectly linked to workspaces:
- `parlantAgent.workspaceId` provides direct workspace scoping
- `parlantSession.workspaceId` ensures session isolation
- `parlantTool.workspaceId` scopes tool definitions
- Junction tables inherit isolation through parent relationships

### Permission Integration
Parlant leverages Sim's existing permission system:
- Workspace permissions control agent access
- User permissions govern tool usage
- Organization-level policies apply to all workspace agents

### Data Access Patterns
```sql
-- Get user's agents across all accessible workspaces
SELECT a.* FROM parlant_agent a
JOIN permissions p ON p.entity_id = a.workspace_id
WHERE p.user_id = ? AND p.entity_type = 'workspace'

-- Get workspace-scoped sessions with user filtering
SELECT s.* FROM parlant_session s
WHERE s.workspace_id = ?
  AND (s.user_id = ? OR s.user_id IS NULL)
```

## Index Optimization Strategy

### Primary Access Patterns
1. **Workspace Queries**: `workspace_id` indexes on all primary tables
2. **User Context**: `user_id` indexes for user-specific queries
3. **Session Analytics**: Composite indexes on `(workspace_id, last_activity_at)`
4. **Event Ordering**: Unique index on `(session_id, offset)`

### Performance Optimizations
1. **JSONB Indexes**: GIN indexes on metadata and configuration fields
2. **Composite Indexes**: Multi-column indexes for common join patterns
3. **Partial Indexes**: Filtered indexes for active/enabled entities
4. **Text Search**: TSVector indexes for full-text search capabilities

## Integration with Existing Sim Features

### Knowledge Base Integration
- Direct foreign key to `knowledgeBase.id`
- Leverages existing embedding infrastructure
- Inherits document processing and chunking
- Uses existing vector similarity search

### Custom Tools Integration
- References `customTools.id` for user-defined functions
- Inherits code execution sandbox
- Uses existing parameter validation
- Leverages tool caching mechanisms

### MCP Server Integration
- References `mcpServers.id` for external tools
- Uses existing connection management
- Inherits health monitoring
- Leverages existing retry logic

### Workflow Block Integration
- References `workflowBlocks.id` for native tools
- Inherits execution context
- Uses existing data flow patterns
- Leverages workflow state management

## Migration Strategy

### Phase 1: Core Tables
1. Create Parlant enums
2. Create `parlantAgent` table
3. Create `parlantSession` table
4. Create `parlantEvent` table

### Phase 2: Behavior Management
1. Create `parlantGuideline` table
2. Create journey-related tables
3. Create `parlantVariable` table

### Phase 3: Tool Integration
1. Create `parlantTool` table
2. Create integration mapping tables
3. Create junction tables

### Phase 4: Advanced Features
1. Create glossary and canned response tables
2. Add performance indexes
3. Create analytics views

## Performance Considerations

### Query Optimization
- Workspace-scoped queries use primary indexes
- Event ordering uses unique composite index
- Tool lookups use workspace-name composite index
- Session analytics use time-based partitioning potential

### Storage Optimization
- JSONB for flexible metadata storage
- Strategic denormalization for frequently accessed data
- Soft deletes minimize referential integrity issues
- Compression-friendly data types

### Scalability Factors
- Horizontal partitioning potential by workspace
- Event table can be time-partitioned
- Read replicas for analytics queries
- Connection pooling for concurrent sessions

## Data Retention & Cleanup

### Automatic Cleanup
- Session data respects agent `dataRetentionDays` setting
- Soft-deleted entities can be purged after grace period
- Event logs can be archived based on age
- Analytics data can be aggregated and purged

### Compliance Features
- `allowDataExport` enables GDPR compliance
- `piiHandlingMode` controls sensitive data processing
- Audit trail through event logging
- User data deletion cascades appropriately

## Conclusion

The Parlant database schema integration provides a robust, scalable foundation for AI agent management within the Sim ecosystem. The design maintains strict multi-tenant isolation while leveraging existing Sim infrastructure for optimal performance and consistency. The comprehensive foreign key relationships ensure data integrity while supporting flexible integration patterns for tools, knowledge bases, and user management.

The schema is designed for both current needs and future scalability, with careful consideration for performance optimization, data retention compliance, and seamless integration with Sim's existing workflow and knowledge management systems.