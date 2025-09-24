# Parlant Database Migration Guide

## Overview

This guide covers the comprehensive database migration strategy for integrating Parlant AI agent functionality into the Sim platform. The migration extends the existing Sim database with Parlant-specific tables while maintaining full compatibility with existing systems.

## Migration Files

### Core Migrations

1. **0001_add_parlant_tables.sql** (Existing)
   - Original Parlant schema migration
   - Contains basic tables and enums
   - Status: Already applied

2. **0092_extend_parlant_schema.sql** (New)
   - Extends `parlant_agent` table with advanced configuration fields
   - Adds junction tables for many-to-many relationships
   - Creates agent-tool, journey-guideline, agent-knowledge base relationships

3. **0093_extend_parlant_session_tool_schema.sql** (New)
   - Extends `parlant_session` table with analytics and context fields
   - Extends `parlant_tool` table with rate limiting and authentication
   - Adds data validation constraints

4. **0094_add_parlant_workspace_integration.sql** (New)
   - Creates workspace integration tables
   - Enables agent-workflow connections
   - Adds API key management for agents

5. **0095_validate_parlant_integrity.sql** (New)
   - Validates foreign key relationships
   - Adds data integrity constraints
   - Creates performance monitoring views

6. **0096_parlant_performance_indexes.sql** (New)
   - Adds comprehensive performance indexes
   - Optimizes common query patterns
   - Includes maintenance functions

### Rollback Migration

- **rollback_0093_0092_parlant_extensions.sql**
  - Complete rollback for migrations 0092-0096
  - Removes all added tables, columns, indexes, and constraints
  - ⚠️ **WARNING**: This will permanently delete data

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Relationships | Enhanced Features |
|-------|---------|-------------------|-------------------|
| `parlant_agent` | AI agents with behavior configurations | → workspace, user | Advanced config, privacy settings, conversation styles, cost tracking |
| `parlant_session` | Individual conversations | → agent, user (optional), workspace | Analytics tracking, user context, performance metrics, tags |
| `parlant_event` | Session activity log | → session | Event sourcing with offsets, content storage, metadata |
| `parlant_guideline` | Behavior rules | → agent | Priority system, usage tracking, tool associations |
| `parlant_journey` | Conversational flows | → agent | Conditions, completion tracking, configuration options |
| `parlant_journey_state` | Journey steps | → journey | Multiple state types, metadata, flow control |
| `parlant_journey_transition` | State connections | → journey, states | Conditional transitions, usage statistics |
| `parlant_variable` | Context storage | → agent, session | Scoped variables, type checking, privacy controls |
| `parlant_tool` | Function integrations | → workspace | Rate limiting, authentication, retry policies, health monitoring |
| `parlant_term` | Glossary definitions | → agent | Synonyms, examples, importance weighting |
| `parlant_canned_response` | Response templates | → agent | Categorization, conditions matching, usage tracking |

### Junction Tables

| Table | Purpose | Relationship |
|-------|---------|--------------|
| `parlant_agent_tool` | Agent-tool access | agent ↔ tool |
| `parlant_journey_guideline` | Journey-specific guidelines | journey ↔ guideline |
| `parlant_agent_knowledge_base` | Knowledge base access | agent ↔ knowledge_base |
| `parlant_tool_integration` | Tool-system mapping | tool ↔ external_systems |

### Workspace Integration Tables

| Table | Purpose | Integration |
|-------|---------|-------------|
| `parlant_agent_workflow` | Workflow triggers | agent ↔ workflow |
| `parlant_agent_api_key` | API key access | agent ↔ api_key |
| `parlant_session_workflow` | Workflow executions | session → workflow |

## Migration Execution Strategy

### Phase 1: Schema Extensions (0092-0094)

```bash
# Apply schema extensions
bunx drizzle-kit migrate --config=./drizzle.config.ts

# Verify migration success
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'parlant_%';"
```

Expected result: 18+ Parlant tables (includes new junction and integration tables)

### Phase 2: Validation and Integrity (0095)

```bash
# Apply integrity validation
bunx drizzle-kit migrate --config=./drizzle.config.ts

# Check constraints
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name LIKE 'parlant_%';"
```

Expected result: 25+ foreign key constraints

### Phase 3: Performance Optimization (0096)

```bash
# Apply performance indexes
bunx drizzle-kit migrate --config=./drizzle.config.ts

# Verify index creation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename LIKE 'parlant_%';"
```

Expected result: 80+ indexes on Parlant tables

## Deployment Checklist

### Pre-Deployment

- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify application compatibility with existing schema
- [ ] Check available disk space for indexes
- [ ] Plan maintenance window for index creation

### During Deployment

1. **Apply migrations in sequence** (0092 → 0093 → 0094 → 0095 → 0096)
2. **Monitor query performance** during index creation
3. **Verify foreign key relationships** after each migration
4. **Test basic CRUD operations** on new tables

### Post-Deployment

- [ ] Run `ANALYZE` on all new tables
- [ ] Monitor index usage with `pg_stat_user_indexes`
- [ ] Verify performance monitoring views work correctly
- [ ] Test rollback procedures in non-production environment
- [ ] Update application monitoring for new tables

## Performance Considerations

### Index Strategy

The migration includes several types of indexes:

1. **Primary access patterns**: workspace, agent, session relationships
2. **Analytics queries**: time-series, aggregation, reporting
3. **Junction table optimization**: many-to-many relationship queries
4. **Partial indexes**: active records, recent data
5. **Composite indexes**: complex multi-column queries

### Query Optimization

Key optimized query patterns:

```sql
-- Agent performance by workspace
SELECT * FROM parlant_agent_performance WHERE workspace_id = ?;

-- Recent session analytics
SELECT * FROM parlant_session
WHERE workspace_id = ? AND started_at >= NOW() - INTERVAL '7 days';

-- Tool usage patterns
SELECT * FROM parlant_tool_integration
WHERE health_status = 'healthy' AND integration_type = ?;
```

## Monitoring and Maintenance

### Health Checks

```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables WHERE tablename LIKE 'parlant_%' ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes WHERE tablename LIKE 'parlant_%' ORDER BY idx_scan DESC;

-- Check constraint violations
SELECT conname, conrelid::regclass FROM pg_constraint WHERE NOT convalidated;
```

### Maintenance Tasks

1. **Weekly**: Run `maintain_parlant_indexes()` function
2. **Monthly**: Analyze table statistics
3. **Quarterly**: Review index usage and optimize
4. **As needed**: Clean up old session data based on retention policies

## Troubleshooting

### Common Issues

1. **Foreign key violations**
   - Check that referenced tables exist
   - Verify workspace/user relationships are valid
   - Ensure proper cascade rules

2. **Index creation timeouts**
   - Use `CONCURRENTLY` option for production
   - Monitor disk space during creation
   - Consider creating indexes during maintenance windows

3. **Performance degradation**
   - Check for missing indexes on new query patterns
   - Verify statistics are up to date
   - Monitor for table bloat

### Rollback Procedures

If rollback is necessary:

```bash
# ⚠️ WARNING: This will delete all Parlant data
psql $DATABASE_URL -f rollback_0093_0092_parlant_extensions.sql

# Verify rollback
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'parlant_%';"
```

Expected result after rollback: Only original Parlant tables remain

## Security Considerations

### Data Privacy

- PII handling modes configured per agent
- Session data retention policies enforced
- Anonymous session support maintained

### Access Control

- All tables scoped to workspaces for multi-tenancy
- Foreign key constraints prevent unauthorized access
- Soft delete support maintains audit trails

### Compliance

- GDPR-compliant data retention
- Audit trail for all agent interactions
- Configurable data export capabilities

## Support and Escalation

### Monitoring Alerts

Set up alerts for:
- Foreign key constraint violations
- Unusual table growth rates
- Index usage patterns
- Performance degradation

### Escalation Path

1. Check migration logs and error messages
2. Verify database connectivity and permissions
3. Review constraint violations and data integrity
4. Contact database administrator for production issues
5. Consider rollback if critical issues persist

---

**Last Updated**: 2024-09-24
**Version**: 2.4.0
**Author**: Migration Development Agent