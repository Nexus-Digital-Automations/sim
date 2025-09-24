# Parlant Database Foreign Key Relationships and Cascading Rules

## Table of Contents
- [Overview](#overview)
- [Cascade Delete Rules](#cascade-delete-rules)
- [Set Null Rules](#set-null-rules)
- [Foreign Key Constraints by Table](#foreign-key-constraints-by-table)
- [Referential Integrity Implications](#referential-integrity-implications)
- [Data Cleanup Procedures](#data-cleanup-procedures)
- [Constraint Violation Handling](#constraint-violation-handling)

## Overview

The Parlant database schema implements comprehensive foreign key constraints to maintain referential integrity and enforce proper data relationships. The cascading rules are carefully designed to support both data consistency and workspace isolation requirements.

### Constraint Categories

1. **CASCADE DELETE**: Child records are automatically deleted when parent is deleted
2. **SET NULL DELETE**: Foreign key fields are set to NULL when referenced record is deleted
3. **RESTRICT DELETE**: Prevents deletion if dependent records exist (not used in Parlant schema)

### Design Principles

- **Workspace Isolation**: All workspace-scoped data cascades from workspace deletion
- **Agent Hierarchy**: Agent deletion removes all dependent agent data
- **Session Preservation**: User deletion preserves anonymous sessions
- **Journey Flexibility**: Journey deletion allows sessions to continue without structure

## Cascade Delete Rules

### Workspace Cascade Chain

**Trigger**: Deleting a workspace record
**Effect**: Complete removal of all Parlant data for that workspace

```sql
workspace (CASCADE) →
├── parlant_agent (CASCADE) →
│   ├── parlant_session (CASCADE) →
│   │   ├── parlant_event (CASCADE)
│   │   ├── parlant_variable (CASCADE)
│   │   └── parlant_session_workflow (CASCADE)
│   ├── parlant_guideline (CASCADE)
│   ├── parlant_journey (CASCADE) →
│   │   ├── parlant_journey_state (CASCADE) →
│   │   │   └── parlant_journey_transition (CASCADE)
│   │   └── parlant_journey_guideline (CASCADE)
│   ├── parlant_term (CASCADE)
│   ├── parlant_canned_response (CASCADE)
│   ├── parlant_agent_tool (CASCADE)
│   ├── parlant_agent_knowledge_base (CASCADE)
│   ├── parlant_agent_workflow (CASCADE)
│   └── parlant_agent_api_key (CASCADE)
├── parlant_tool (CASCADE) →
│   ├── parlant_agent_tool (CASCADE)
│   └── parlant_tool_integration (CASCADE)
└── parlant_agent_workflow (CASCADE)
```

**SQL Implementation**:
```sql
-- Workspace constraints
ALTER TABLE "parlant_agent"
ADD CONSTRAINT "fk_parlant_agent_workspace"
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_workspace"
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_tool"
ADD CONSTRAINT "fk_parlant_tool_workspace"
FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;
```

### User Cascade Chain

**Trigger**: Deleting a user record
**Effect**: Removal of user-created agents, preservation of sessions

```sql
user (CASCADE) →
└── parlant_agent (CASCADE) →
    └── [Full Agent Cascade Chain as above]
```

**SQL Implementation**:
```sql
ALTER TABLE "parlant_agent"
ADD CONSTRAINT "fk_parlant_agent_created_by"
FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE;
```

### Agent Cascade Chain

**Trigger**: Deleting an agent record
**Effect**: Complete removal of all agent-specific data

```sql
parlant_agent (CASCADE) →
├── parlant_session (CASCADE) →
│   ├── parlant_event (CASCADE)
│   ├── parlant_variable (CASCADE)
│   └── parlant_session_workflow (CASCADE)
├── parlant_guideline (CASCADE)
├── parlant_journey (CASCADE) →
│   ├── parlant_journey_state (CASCADE) →
│   │   └── parlant_journey_transition (CASCADE)
│   └── parlant_journey_guideline (CASCADE)
├── parlant_term (CASCADE)
├── parlant_canned_response (CASCADE)
├── parlant_agent_tool (CASCADE)
├── parlant_agent_knowledge_base (CASCADE)
├── parlant_agent_workflow (CASCADE)
└── parlant_agent_api_key (CASCADE)
```

**SQL Implementation**:
```sql
-- Agent-dependent tables
ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_guideline"
ADD CONSTRAINT "fk_parlant_guideline_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_journey"
ADD CONSTRAINT "fk_parlant_journey_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_variable"
ADD CONSTRAINT "fk_parlant_variable_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_term"
ADD CONSTRAINT "fk_parlant_term_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_canned_response"
ADD CONSTRAINT "fk_parlant_canned_response_agent"
FOREIGN KEY ("agent_id") REFERENCES "parlant_agent"("id") ON DELETE CASCADE;
```

### Session Cascade Chain

**Trigger**: Deleting a session record
**Effect**: Removal of all session-specific events and data

```sql
parlant_session (CASCADE) →
├── parlant_event (CASCADE)
├── parlant_variable (CASCADE) [session-scoped only]
└── parlant_session_workflow (CASCADE)
```

**SQL Implementation**:
```sql
ALTER TABLE "parlant_event"
ADD CONSTRAINT "fk_parlant_event_session"
FOREIGN KEY ("session_id") REFERENCES "parlant_session"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_variable"
ADD CONSTRAINT "fk_parlant_variable_session"
FOREIGN KEY ("session_id") REFERENCES "parlant_session"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_session_workflow"
ADD CONSTRAINT "fk_parlant_session_workflow_session"
FOREIGN KEY ("session_id") REFERENCES "parlant_session"("id") ON DELETE CASCADE;
```

### Journey Cascade Chain

**Trigger**: Deleting a journey record
**Effect**: Removal of journey structure and configuration

```sql
parlant_journey (CASCADE) →
├── parlant_journey_state (CASCADE) →
│   └── parlant_journey_transition (CASCADE)
└── parlant_journey_guideline (CASCADE)
```

**SQL Implementation**:
```sql
ALTER TABLE "parlant_journey_state"
ADD CONSTRAINT "fk_parlant_journey_state_journey"
FOREIGN KEY ("journey_id") REFERENCES "parlant_journey"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_journey_transition"
ADD CONSTRAINT "fk_parlant_journey_transition_journey"
FOREIGN KEY ("journey_id") REFERENCES "parlant_journey"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_journey_transition"
ADD CONSTRAINT "fk_parlant_journey_transition_from_state"
FOREIGN KEY ("from_state_id") REFERENCES "parlant_journey_state"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_journey_transition"
ADD CONSTRAINT "fk_parlant_journey_transition_to_state"
FOREIGN KEY ("to_state_id") REFERENCES "parlant_journey_state"("id") ON DELETE CASCADE;
```

### Tool Integration Cascade Chain

**Trigger**: Deleting a tool record
**Effect**: Removal of tool integrations and agent associations

```sql
parlant_tool (CASCADE) →
├── parlant_agent_tool (CASCADE)
└── parlant_tool_integration (CASCADE)
```

**SQL Implementation**:
```sql
ALTER TABLE "parlant_agent_tool"
ADD CONSTRAINT "fk_parlant_agent_tool_tool"
FOREIGN KEY ("tool_id") REFERENCES "parlant_tool"("id") ON DELETE CASCADE;

ALTER TABLE "parlant_tool_integration"
ADD CONSTRAINT "fk_parlant_tool_integration_parlant_tool"
FOREIGN KEY ("parlant_tool_id") REFERENCES "parlant_tool"("id") ON DELETE CASCADE;
```

### Junction Table Cascade Rules

All junction tables implement CASCADE on both sides:

```sql
-- Agent-Tool junction
parlant_agent (CASCADE) → parlant_agent_tool (CASCADE) ← parlant_tool

-- Journey-Guideline junction
parlant_journey (CASCADE) → parlant_journey_guideline (CASCADE) ← parlant_guideline

-- Agent-Knowledge Base junction
parlant_agent (CASCADE) → parlant_agent_knowledge_base (CASCADE) ← knowledge_base

-- Agent-Workflow junction
parlant_agent (CASCADE) → parlant_agent_workflow (CASCADE) ← workflow

-- Agent-API Key junction
parlant_agent (CASCADE) → parlant_agent_api_key (CASCADE) ← api_key
```

## Set Null Rules

### User Session Preservation

**Trigger**: Deleting a user record
**Effect**: Sessions become anonymous but are preserved

```sql
user (SET NULL) → parlant_session.user_id = NULL
```

**Rationale**: Preserves valuable session data and conversation history even after user account deletion.

**SQL Implementation**:
```sql
ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_user"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;
```

### Journey Context Preservation

**Trigger**: Deleting journey or journey state records
**Effect**: Sessions lose journey context but continue functioning

```sql
parlant_journey (SET NULL) → parlant_session.current_journey_id = NULL
parlant_journey_state (SET NULL) → parlant_session.current_state_id = NULL
```

**Rationale**: Allows sessions to continue even if their journey structure is modified or removed.

**SQL Implementation**:
```sql
ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_current_journey"
FOREIGN KEY ("current_journey_id") REFERENCES "parlant_journey"("id") ON DELETE SET NULL;

ALTER TABLE "parlant_session"
ADD CONSTRAINT "fk_parlant_session_current_state"
FOREIGN KEY ("current_state_id") REFERENCES "parlant_journey_state"("id") ON DELETE SET NULL;
```

### Event Journey References

**Trigger**: Deleting journey or state records
**Effect**: Events lose journey context but remain for audit trail

```sql
parlant_journey (SET NULL) → parlant_event.journey_id = NULL
parlant_journey_state (SET NULL) → parlant_event.state_id = NULL
```

**SQL Implementation**:
```sql
ALTER TABLE "parlant_event"
ADD CONSTRAINT "fk_parlant_event_journey"
FOREIGN KEY ("journey_id") REFERENCES "parlant_journey"("id") ON DELETE SET NULL;

ALTER TABLE "parlant_event"
ADD CONSTRAINT "fk_parlant_event_state"
FOREIGN KEY ("state_id") REFERENCES "parlant_journey_state"("id") ON DELETE SET NULL;
```

## Foreign Key Constraints by Table

### parlant_agent
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| workspace_id | workspace.id | CASCADE | Workspace isolation |
| created_by | user.id | CASCADE | Creator tracking |

### parlant_session
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |
| workspace_id | workspace.id | CASCADE | Workspace isolation |
| user_id | user.id | SET NULL | User association |
| current_journey_id | parlant_journey.id | SET NULL | Journey context |
| current_state_id | parlant_journey_state.id | SET NULL | State context |

### parlant_event
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| session_id | parlant_session.id | CASCADE | Event ownership |
| journey_id | parlant_journey.id | SET NULL | Journey context |
| state_id | parlant_journey_state.id | SET NULL | State context |

### parlant_guideline
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |

### parlant_journey
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |

### parlant_journey_state
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| journey_id | parlant_journey.id | CASCADE | Journey membership |

### parlant_journey_transition
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| journey_id | parlant_journey.id | CASCADE | Journey membership |
| from_state_id | parlant_journey_state.id | CASCADE | Source state |
| to_state_id | parlant_journey_state.id | CASCADE | Target state |

### parlant_variable
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |
| session_id | parlant_session.id | CASCADE | Session scope |

### parlant_tool
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| workspace_id | workspace.id | CASCADE | Workspace isolation |

### parlant_term
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |

### parlant_canned_response
| Column | References | Delete Rule | Purpose |
|--------|------------|-------------|---------|
| agent_id | parlant_agent.id | CASCADE | Agent ownership |

### Junction Tables
| Table | FK 1 | FK 2 | Delete Rules |
|-------|------|------|-------------|
| parlant_agent_tool | agent_id → parlant_agent.id | tool_id → parlant_tool.id | CASCADE / CASCADE |
| parlant_journey_guideline | journey_id → parlant_journey.id | guideline_id → parlant_guideline.id | CASCADE / CASCADE |
| parlant_agent_knowledge_base | agent_id → parlant_agent.id | knowledge_base_id → knowledge_base.id | CASCADE / CASCADE |
| parlant_tool_integration | parlant_tool_id → parlant_tool.id | - | CASCADE |
| parlant_agent_workflow | agent_id → parlant_agent.id | workflow_id → workflow.id | CASCADE / CASCADE |
| parlant_agent_api_key | agent_id → parlant_agent.id | api_key_id → api_key.id | CASCADE / CASCADE |
| parlant_session_workflow | session_id → parlant_session.id | workflow_id → workflow.id | CASCADE / CASCADE |

## Referential Integrity Implications

### Data Consistency Benefits

1. **Automatic Cleanup**: No orphaned records when parent entities are deleted
2. **Workspace Isolation**: Complete workspace data removal when workspace deleted
3. **Audit Trail Preservation**: Important events preserved even when context is removed
4. **Session Continuity**: Sessions can continue even when structure changes

### Performance Considerations

1. **Cascade Overhead**: Large cascade deletions can be expensive operations
2. **Lock Contention**: Cascade deletions may lock multiple tables simultaneously
3. **Transaction Size**: Large cascades should be performed in appropriate transaction sizes
4. **Index Usage**: Proper indexing on foreign key columns is crucial

### Backup and Recovery Impact

1. **Point-in-Time Recovery**: Cascade rules must be considered for partial recoveries
2. **Cross-Table Dependencies**: Restoring individual tables may violate referential integrity
3. **Disaster Recovery**: Full schema must be restored to maintain constraint relationships

## Data Cleanup Procedures

### Workspace Deletion Process

```sql
-- Single workspace cleanup (automatic cascade)
DELETE FROM workspace WHERE id = 'workspace_123';

-- Manual verification of cleanup
SELECT
    'parlant_agent' as table_name, COUNT(*) as remaining_records
FROM parlant_agent
WHERE workspace_id = 'workspace_123'
UNION ALL
SELECT
    'parlant_session' as table_name, COUNT(*) as remaining_records
FROM parlant_session
WHERE workspace_id = 'workspace_123'
UNION ALL
SELECT
    'parlant_tool' as table_name, COUNT(*) as remaining_records
FROM parlant_tool
WHERE workspace_id = 'workspace_123';
```

### Agent Cleanup Process

```sql
-- Agent deletion with cascade verification
BEGIN;

-- Record counts before deletion
SELECT
    (SELECT COUNT(*) FROM parlant_session WHERE agent_id = 'agent_123') as sessions_count,
    (SELECT COUNT(*) FROM parlant_guideline WHERE agent_id = 'agent_123') as guidelines_count,
    (SELECT COUNT(*) FROM parlant_journey WHERE agent_id = 'agent_123') as journeys_count;

-- Perform deletion
DELETE FROM parlant_agent WHERE id = 'agent_123';

-- Verify cleanup
SELECT
    (SELECT COUNT(*) FROM parlant_session WHERE agent_id = 'agent_123') as remaining_sessions,
    (SELECT COUNT(*) FROM parlant_guideline WHERE agent_id = 'agent_123') as remaining_guidelines,
    (SELECT COUNT(*) FROM parlant_journey WHERE agent_id = 'agent_123') as remaining_journeys;

COMMIT;
```

### Session Data Retention

```sql
-- Anonymous session cleanup (preserve sessions, remove user association)
UPDATE parlant_session
SET user_id = NULL
WHERE user_id = 'user_123';

-- Later cleanup of old anonymous sessions
DELETE FROM parlant_session
WHERE user_id IS NULL
AND ended_at < NOW() - INTERVAL '90 days';
```

## Constraint Violation Handling

### Common Violation Scenarios

1. **Circular Journey References**: Journey states referencing invalid transitions
2. **Invalid Tool References**: Tools referencing non-existent Sim tools
3. **Workspace Permission Violations**: Agents accessing cross-workspace resources

### Violation Prevention Strategies

```sql
-- Check for circular journey references before insertion
WITH RECURSIVE journey_path AS (
    SELECT from_state_id, to_state_id, 1 as depth,
           ARRAY[from_state_id] as path
    FROM parlant_journey_transition
    WHERE journey_id = 'journey_123'

    UNION ALL

    SELECT jt.from_state_id, jt.to_state_id, jp.depth + 1,
           jp.path || jt.from_state_id
    FROM parlant_journey_transition jt
    JOIN journey_path jp ON jt.from_state_id = jp.to_state_id
    WHERE jt.journey_id = 'journey_123'
    AND jt.from_state_id != ALL(jp.path)
    AND jp.depth < 50
)
SELECT * FROM journey_path
WHERE from_state_id = to_state_id; -- Circular reference detected
```

### Error Recovery Procedures

```sql
-- Recover from constraint violation during data migration
BEGIN;

-- Temporarily disable triggers if needed
SET session_replication_role = replica;

-- Perform data corrections
UPDATE parlant_session
SET current_journey_id = NULL
WHERE current_journey_id IN (
    SELECT id FROM parlant_journey WHERE deleted_at IS NOT NULL
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;
```

### Monitoring Constraint Health

```sql
-- Check for potential orphaned references (should return 0 rows)
SELECT 'parlant_session.current_journey_id' as potential_orphan, COUNT(*)
FROM parlant_session s
LEFT JOIN parlant_journey j ON s.current_journey_id = j.id
WHERE s.current_journey_id IS NOT NULL AND j.id IS NULL

UNION ALL

SELECT 'parlant_session.current_state_id' as potential_orphan, COUNT(*)
FROM parlant_session s
LEFT JOIN parlant_journey_state js ON s.current_state_id = js.id
WHERE s.current_state_id IS NOT NULL AND js.id IS NULL

UNION ALL

SELECT 'parlant_event.journey_id' as potential_orphan, COUNT(*)
FROM parlant_event e
LEFT JOIN parlant_journey j ON e.journey_id = j.id
WHERE e.journey_id IS NOT NULL AND j.id IS NULL;
```

This comprehensive documentation of foreign key relationships and cascading rules ensures proper understanding of data dependencies and cleanup procedures for the Parlant database schema.