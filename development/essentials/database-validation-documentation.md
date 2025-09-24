# Parlant Database Validation and Integrity System

## Overview

This document describes the comprehensive data validation and integrity system implemented for the Parlant database schema extension. The system ensures data consistency, prevents corruption, and maintains referential integrity across all Parlant-related tables.

## Core Components

### 1. Foreign Key Constraints
- **Referential Integrity**: All foreign key relationships enforce cascade behaviors
- **Workspace Isolation**: Ensures all Parlant data respects workspace boundaries
- **Soft References**: Optional references (like `current_journey_id`) use `SET NULL` on delete

### 2. Business Logic Validation Constraints

#### Agent Constraints
- `temperature`: Must be between 0-100
- `max_tokens`: Must be positive and ≤ 100,000
- `response_timeout_ms`: Must be positive and ≤ 300,000ms (5 minutes)
- `max_context_length`: Must be positive and ≤ 200,000
- `conversation_style`: Must be one of: 'casual', 'professional', 'technical', 'friendly'
- `pii_handling_mode`: Must be one of: 'strict', 'standard', 'relaxed'
- `data_retention_days`: Must be between 1-3650 days if specified
- Usage metrics: All counts and costs must be non-negative

#### Session Constraints
- Event and message counts: Must be non-negative
- Token usage and costs: Must be non-negative
- Performance metrics: Response times ≥ 0, satisfaction scores 1-5
- Session type: Must be one of: 'conversation', 'support', 'onboarding', 'survey'
- Locale format: Must match pattern `^[a-z]{2}(-[A-Z]{2})?$`
- Timing consistency: `ended_at ≥ started_at`, `last_activity_at ≥ started_at`

#### Journey and State Constraints
- Completion rates: 0-100% if specified
- Journey state logic consistency:
  - Chat states must have `chat_prompt`
  - Tool states must have `tool_id`
  - Decision states must have `condition`
- Transition validation: No self-loops allowed
- Priority ranges: 1-1000 for all priority fields

#### Tool Constraints
- Success rates: 0-100% if specified
- Execution timeout: 1ms to 300,000ms
- Rate limits: Must be positive if specified
- Auth types: 'api_key', 'oauth', 'basic', 'none', or NULL
- Error counts: Must be non-negative

### 3. Workspace Isolation Triggers

#### Purpose
Prevents cross-workspace data contamination and ensures multi-tenant security.

#### Validated Relationships
- **Sessions**: Agent and session must belong to same workspace
- **Guidelines**: Must belong to agent in accessible workspace
- **Journeys**: Must belong to agent in accessible workspace
- **Variables**: Session must belong to specified agent
- **Agent Tools**: Agent and tool must be in same workspace
- **Agent Knowledge Bases**: Agent and KB must be in same workspace
- **Agent Workflows**: Agent and workflow must be in same workspace
- **Agent API Keys**: Agent and API key must be in same workspace

### 4. Data Consistency Monitoring

#### Validation Functions

**`validate_parlant_data_consistency()`**
Returns a table of data consistency issues:
- Orphaned records (sessions without agents, events without sessions)
- Workspace isolation violations
- Invalid references (journey states without journeys)
- Statistical inconsistencies (mismatched usage counts)

**Example Usage:**
```sql
SELECT * FROM validate_parlant_data_consistency();
```

#### Monitoring View
**`parlant_constraint_violations`**
A view that shows current data integrity violations. Should be empty in a healthy system.

### 5. Data Repair and Cleanup

#### Repair Functions

**`repair_parlant_data_inconsistencies()`**
Automatically fixes common data issues:
- Recalculates agent session and message counts
- Recalculates session event and message counts
- Removes orphaned junction table records

**`cleanup_abandoned_sessions(cutoff_hours)`**
Marks sessions as abandoned if inactive for specified hours (default: 24).

**`archive_old_sessions(cutoff_days)`**
Archives completed/abandoned sessions older than specified days (default: 90).

#### Example Usage:
```sql
-- Fix data inconsistencies
SELECT * FROM repair_parlant_data_inconsistencies();

-- Clean up old data
SELECT cleanup_abandoned_sessions(48); -- 48 hours
SELECT archive_old_sessions(180); -- 6 months
```

### 6. Usage Statistics Triggers

#### Automatic Updates
- Agent session count updates when sessions created
- Agent message count updates when message events added
- Session event/message counts update automatically
- Guideline match statistics update with timestamp
- Tool usage statistics update with timestamp

#### Performance Impact
- Triggers are optimized for minimal performance impact
- Statistics updates use efficient queries
- Indexes support common monitoring queries

## Database Schema Additions

### New Indexes for Performance
```sql
-- Workspace isolation validation
CREATE INDEX idx_parlant_session_agent_workspace ON parlant_session(agent_id, workspace_id);

-- Active session monitoring
CREATE INDEX idx_parlant_session_activity ON parlant_session(last_activity_at) WHERE status = 'active';

-- Event type analysis
CREATE INDEX idx_parlant_event_session_type ON parlant_event(session_id, event_type);

-- Usage statistics optimization
CREATE INDEX idx_parlant_agent_usage_stats ON parlant_agent(total_sessions, total_messages, last_active_at);
```

### Constraint Naming Convention
All constraints follow a consistent naming pattern:
- `{table}_{field}_{constraint_type}`
- Examples: `agent_temperature_range`, `session_locale_format`, `tool_auth_type_valid`

## Testing and Validation

### Automated Testing
The system includes comprehensive test suite (`0093_test_data_validation.sql`) that validates:
- All check constraints work correctly
- Trigger functions prevent invalid data
- Workspace isolation is enforced
- Data consistency functions execute properly
- Cleanup functions work as expected

### Test Categories
1. **Constraint Validation**: Tests each check constraint with valid/invalid data
2. **Workspace Isolation**: Tests cross-workspace data prevention
3. **Business Logic**: Tests complex validation rules
4. **Function Testing**: Tests monitoring and repair functions
5. **Junction Tables**: Tests relationship constraints

### Running Tests
```sql
-- Run full test suite
\i 0093_test_data_validation.sql

-- Check for violations
SELECT * FROM parlant_constraint_violations;

-- Run consistency check
SELECT * FROM validate_parlant_data_consistency();
```

## Monitoring and Maintenance

### Daily Monitoring Queries
```sql
-- Check for any constraint violations
SELECT COUNT(*) as violation_count FROM parlant_constraint_violations;

-- Monitor data consistency
SELECT table_name, issue_type, affected_records
FROM validate_parlant_data_consistency()
WHERE affected_records > 0;

-- Check session activity
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE last_activity_at < NOW() - INTERVAL '24 hours' AND status = 'active') as stale_sessions
FROM parlant_session;
```

### Weekly Maintenance Tasks
```sql
-- Clean up abandoned sessions
SELECT cleanup_abandoned_sessions(24);

-- Archive old sessions
SELECT archive_old_sessions(90);

-- Repair any inconsistencies
SELECT * FROM repair_parlant_data_inconsistencies();
```

### Performance Monitoring
- Monitor constraint violation view regularly
- Check index usage for validation queries
- Monitor trigger performance impact
- Track cleanup function execution times

## Best Practices

### Development Guidelines
1. **Always Test Constraints**: New features should validate against all constraints
2. **Respect Workspace Boundaries**: Never bypass workspace isolation
3. **Use Validation Functions**: Incorporate consistency checks in application logic
4. **Handle Constraint Violations Gracefully**: Provide meaningful error messages
5. **Monitor Data Quality**: Regular consistency checks in production

### Data Migration
1. **Pre-Migration Validation**: Run consistency checks before schema changes
2. **Constraint-Aware Migrations**: Consider validation rules when migrating data
3. **Post-Migration Testing**: Validate all constraints after migrations
4. **Rollback Plans**: Prepare rollback strategies for constraint violations

### Performance Considerations
1. **Batch Operations**: Use efficient batch queries for large data operations
2. **Index Maintenance**: Monitor and maintain validation-supporting indexes
3. **Trigger Impact**: Monitor performance impact of validation triggers
4. **Cleanup Scheduling**: Schedule maintenance during low-traffic periods

## Error Handling

### Common Error Scenarios
1. **Check Constraint Violations**: Invalid data format or range
2. **Foreign Key Violations**: References to non-existent records
3. **Unique Constraint Violations**: Duplicate unique field combinations
4. **Trigger Exceptions**: Workspace isolation or business rule violations

### Error Response Patterns
```sql
-- Example error handling in application
BEGIN
  INSERT INTO parlant_agent (...);
EXCEPTION
  WHEN check_violation THEN
    -- Handle validation constraint error
    RAISE NOTICE 'Validation error: %', SQLERRM;
  WHEN foreign_key_violation THEN
    -- Handle referential integrity error
    RAISE NOTICE 'Reference error: %', SQLERRM;
  WHEN unique_violation THEN
    -- Handle uniqueness constraint error
    RAISE NOTICE 'Duplicate error: %', SQLERRM;
END;
```

## Future Enhancements

### Planned Improvements
1. **Enhanced Monitoring**: Real-time constraint violation alerting
2. **Automated Repair**: More sophisticated auto-repair capabilities
3. **Performance Optimization**: Query optimization based on usage patterns
4. **Extended Validation**: Additional business rule validations
5. **Integration Testing**: Automated integration testing framework

### Extension Points
- Custom validation functions for specific business rules
- Additional monitoring views for different use cases
- Enhanced cleanup strategies for specific data patterns
- Integration with external monitoring systems

---

This validation system provides comprehensive data integrity protection for the Parlant schema extension while maintaining optimal performance and providing clear monitoring and maintenance capabilities.