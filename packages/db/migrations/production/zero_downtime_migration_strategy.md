# Zero-Downtime Production Migration Strategy
## Parlant Schema Extension for Sim

**Document Version:** 1.0.0
**Created:** 2025-09-24
**Target Migration:** 0092_parlant_schema_comprehensive.sql

---

## Executive Summary

This document outlines a comprehensive zero-downtime migration strategy for deploying the Parlant schema extension to Sim's production database. The strategy ensures continuous service availability while adding 11+ new tables, 6 enums, 75+ indexes, and comprehensive constraints.

**Migration Overview:**
- **Scope:** Complete Parlant schema extension
- **Downtime:** Zero (service remains available)
- **Rollback:** Safe with data preservation options
- **Duration:** Estimated 15-30 minutes for large databases
- **Risk Level:** Low (additive changes only)

---

## Pre-Migration Prerequisites

### System Requirements Validation

Before proceeding with production migration, verify:

1. **Database Version:** PostgreSQL 14+ required
2. **Available Disk Space:** Minimum 20% free space on database volume
3. **Connection Pool:** Reserve 10+ connections for migration
4. **Backup Status:** Recent backup within 24 hours
5. **Monitoring:** Database monitoring systems operational

### Application Compatibility

Ensure application code is prepared:

1. **Feature Flags:** Parlant features disabled in production
2. **Code Deployment:** Updated code with Parlant schema references deployed but inactive
3. **API Endpoints:** Parlant endpoints return 404/disabled status
4. **Database Connections:** Application handles new tables gracefully (no errors)

### Team Readiness

Required personnel on-call:

- **Database Administrator:** Schema changes and monitoring
- **DevOps Engineer:** Application deployment and rollback
- **Backend Developer:** Parlant system knowledge
- **Site Reliability Engineer:** Monitoring and incident response

---

## Migration Strategy Overview

### Phase-Based Approach

The migration follows a 5-phase approach:

1. **Phase 1:** Pre-flight validation and preparation
2. **Phase 2:** Schema objects creation (no data)
3. **Phase 3:** Constraint and index creation
4. **Phase 4:** Validation and testing
5. **Phase 5:** Cleanup and monitoring setup

### Zero-Downtime Techniques

**Additive-Only Changes:**
- All changes are additions (no modifications to existing tables)
- New foreign keys reference existing tables safely
- No data migration required (fresh installation)

**Lock-Free Operations:**
- Use `IF NOT EXISTS` for all schema objects
- Create indexes `CONCURRENTLY` where possible
- Minimize transaction scope and duration

**Rollback Safety:**
- All changes can be safely rolled back
- Data preservation options available
- No breaking changes to existing functionality

---

## Detailed Migration Plan

### Phase 1: Pre-flight Validation (5 minutes)

**Objective:** Validate system readiness and acquire migration lock

**Steps:**

1. **Run Pre-Migration Validation:**
   ```sql
   -- Execute validation script
   \i /path/to/pre_migration_validation.sql

   -- Review results - all ERROR-level issues must be resolved
   -- WARN-level issues should be addressed but don't block migration
   ```

2. **Acquire Advisory Lock:**
   ```sql
   -- Prevent concurrent migrations
   SELECT pg_advisory_lock(5555, 2024);

   -- Verify lock acquired successfully
   SELECT COUNT(*) FROM pg_locks WHERE locktype = 'advisory' AND classid = 5555;
   ```

3. **Verify System State:**
   ```sql
   -- Check for active long-running transactions
   SELECT pid, state, query_start, query
   FROM pg_stat_activity
   WHERE state = 'active'
   AND query_start < NOW() - INTERVAL '5 minutes';

   -- Check connection count
   SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = 'active';
   ```

4. **Application Health Check:**
   - Verify Sim application is responding normally
   - Check error rates in monitoring systems
   - Confirm no active deployments or maintenance

**Success Criteria:**
- All ERROR-level pre-flight checks pass
- Advisory lock acquired successfully
- No long-running transactions blocking schema changes
- Application health metrics normal

**Rollback Procedure:**
If any critical issues found, execute:
```sql
SELECT pg_advisory_unlock(5555, 2024);
-- Address issues and retry
```

### Phase 2: Core Schema Creation (10-15 minutes)

**Objective:** Create enums, tables, and basic structure

**Steps:**

1. **Create Enums (Fast - <1 minute):**
   ```sql
   -- Create all Parlant enums
   DO $$
   BEGIN
       -- agent_status enum
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
           CREATE TYPE agent_status AS ENUM('active', 'inactive', 'archived', 'maintenance');
       END IF;

       -- Continue for all 6 enums...
   END $$;
   ```

2. **Create Core Tables (5-10 minutes):**
   ```sql
   -- Create tables in dependency order
   -- 1. Independent tables first
   CREATE TABLE IF NOT EXISTS parlant_agent (...);
   CREATE TABLE IF NOT EXISTS parlant_tool (...);

   -- 2. Tables with foreign keys
   CREATE TABLE IF NOT EXISTS parlant_session (...);
   CREATE TABLE IF NOT EXISTS parlant_event (...);
   -- Continue for all tables...
   ```

3. **Create Basic Indexes (5-7 minutes):**
   ```sql
   -- Create essential indexes first (non-concurrent for speed)
   CREATE INDEX IF NOT EXISTS idx_parlant_agent_workspace_id
   ON parlant_agent(workspace_id);

   -- Create primary key indexes (already handled by PRIMARY KEY constraint)
   -- Create foreign key indexes for performance
   ```

**Success Criteria:**
- All 11 core tables created successfully
- All 6 enums created
- Basic indexes in place
- No application errors or service disruption

**Monitoring During Phase:**
- Database CPU and I/O usage
- Application response times
- Error rates in logs
- Connection pool usage

### Phase 3: Advanced Constraints and Optimization (5-8 minutes)

**Objective:** Add foreign key constraints, complex indexes, and triggers

**Steps:**

1. **Add Foreign Key Constraints (2-3 minutes):**
   ```sql
   -- Add FK constraints in dependency order
   ALTER TABLE parlant_session
   ADD CONSTRAINT IF NOT EXISTS fk_parlant_session_current_journey
   FOREIGN KEY (current_journey_id) REFERENCES parlant_journey(id) ON DELETE SET NULL;

   -- Continue for all cross-table references...
   ```

2. **Create Complex Indexes Concurrently (3-5 minutes):**
   ```sql
   -- Use CONCURRENTLY for large/complex indexes to avoid blocking
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_session_last_activity
   ON parlant_session(last_activity_at DESC);

   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parlant_event_session_type
   ON parlant_event(session_id, event_type);
   ```

3. **Create Triggers and Functions (1-2 minutes):**
   ```sql
   -- Create updated_at trigger function if not exists
   CREATE OR REPLACE FUNCTION update_updated_at_column() ...;

   -- Apply triggers to all relevant tables
   CREATE TRIGGER update_parlant_agent_updated_at
   BEFORE UPDATE ON parlant_agent
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```

**Success Criteria:**
- All foreign key constraints added without violations
- Complex indexes created successfully
- Triggers operational on all tables
- No performance degradation observed

### Phase 4: Validation and Testing (3-5 minutes)

**Objective:** Comprehensive validation of migration success

**Steps:**

1. **Run Post-Migration Validation:**
   ```sql
   \i /path/to/post_migration_validation.sql

   -- Review all validation results
   -- Ensure no FAIL status results
   -- Address any WARN status issues if critical
   ```

2. **Test Basic Operations:**
   ```sql
   -- Test insert into core tables
   INSERT INTO parlant_agent (workspace_id, created_by, name, status)
   SELECT
       w.id,
       u.id,
       '__migration_test__',
       'inactive'
   FROM workspace w, "user" u
   LIMIT 1;

   -- Verify insert succeeded and clean up
   DELETE FROM parlant_agent WHERE name = '__migration_test__';
   ```

3. **Application Integration Test:**
   - Enable feature flag for Parlant (non-production endpoint)
   - Test basic API endpoints return expected responses
   - Verify no database connection errors
   - Disable feature flag immediately

**Success Criteria:**
- All post-migration validation passes
- Test operations complete successfully
- No application integration issues
- Database performance metrics stable

### Phase 5: Cleanup and Monitoring (2-3 minutes)

**Objective:** Finalize migration and establish monitoring

**Steps:**

1. **Release Migration Lock:**
   ```sql
   SELECT pg_advisory_unlock(5555, 2024);

   -- Verify lock released
   SELECT COUNT(*) FROM pg_locks WHERE locktype = 'advisory' AND classid = 5555;
   -- Should return 0
   ```

2. **Update Statistics:**
   ```sql
   -- Update table statistics for query planner
   ANALYZE parlant_agent;
   ANALYZE parlant_session;
   ANALYZE parlant_event;
   -- Continue for all tables...

   -- Or analyze all at once
   VACUUM ANALYZE;
   ```

3. **Enable Monitoring:**
   - Add Parlant tables to database monitoring
   - Set up alerts for table size growth
   - Monitor index usage statistics
   - Track query performance on new tables

**Success Criteria:**
- Migration lock released successfully
- Table statistics updated
- Monitoring systems configured
- All systems operational

---

## Rollback Procedures

### Emergency Rollback (5-10 minutes)

If critical issues are discovered during migration:

1. **Immediate Assessment:**
   - Stop migration immediately
   - Do not proceed to next phase
   - Assess severity and impact

2. **Quick Rollback for Application Issues:**
   ```sql
   -- If application errors but schema is fine
   -- Just disable feature flags and revert application code
   -- Keep schema changes (they're additive and safe)
   ```

3. **Full Schema Rollback (if necessary):**
   ```sql
   \i /path/to/rollbacks/0092_rollback_parlant_schema_comprehensive.sql

   -- This will completely remove all Parlant schema objects
   -- WARNING: This is destructive if any data exists
   ```

### Post-Migration Rollback (15-30 minutes)

If issues are discovered after migration completion:

1. **Data Preservation Rollback:**
   ```sql
   -- Create backup before rollback
   CREATE SCHEMA parlant_backup;
   -- Copy all data to backup schema
   -- Then proceed with rollback script
   ```

2. **Gradual Rollback:**
   - Disable Parlant features first (application level)
   - Monitor for 24-48 hours
   - If stable, schedule maintenance window for schema removal

---

## Monitoring and Observability

### Key Metrics to Monitor

**During Migration:**
- Database CPU usage (should stay <80%)
- I/O wait times (should not spike significantly)
- Connection pool usage (should not exceed 80%)
- Application response times (should remain stable)
- Error rates (should not increase)

**Post-Migration:**
- Table sizes and growth rates
- Index usage statistics
- Query performance on new tables
- Foreign key constraint validation
- Trigger execution performance

### Monitoring Queries

```sql
-- Monitor table sizes
SELECT
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM information_schema.tables
WHERE table_name LIKE 'parlant_%'
ORDER BY pg_total_relation_size(table_name::regclass) DESC;

-- Monitor index usage
SELECT
    schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE 'parlant_%'
ORDER BY idx_tup_read DESC;

-- Monitor foreign key constraint performance
SELECT
    conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND conrelid::regclass::text LIKE 'parlant_%';
```

### Alert Thresholds

Set up alerts for:
- Table size growth >100MB/day (unexpected)
- Query execution time >1s on Parlant tables
- Foreign key violation errors
- Index scan ratios <90% on primary indexes

---

## Risk Assessment and Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Schema lock contention | Low | Medium | Use advisory locks, monitor active transactions |
| Index creation blocking | Low | High | Use CONCURRENTLY, off-peak execution |
| Disk space exhaustion | Very Low | High | Pre-validate space, monitor during migration |
| Application errors | Low | Medium | Feature flags, gradual rollout |
| Foreign key violations | Very Low | Medium | Pre-validate data integrity |

### Mitigation Strategies

1. **Lock Contention:**
   - Monitor active transactions before migration
   - Use advisory locks to prevent concurrent migrations
   - Keep transaction scopes minimal

2. **Performance Impact:**
   - Execute during low-traffic periods
   - Use CONCURRENTLY for large index creation
   - Monitor system resources continuously

3. **Data Integrity:**
   - Comprehensive pre and post validation scripts
   - Test rollback procedures in staging
   - Backup data before destructive operations

4. **Application Impact:**
   - Feature flags to control Parlant activation
   - Gradual rollout to small user percentage
   - Immediate rollback capability

---

## Communication Plan

### Stakeholder Notification

**24 hours before migration:**
- Engineering teams notified of maintenance window
- Customer support aware of potential impact
- Monitoring teams on standby

**2 hours before migration:**
- Final go/no-go decision
- All team members confirmed available
- Backup procedures verified

**During migration:**
- Status updates every 5 minutes
- Immediate escalation for any issues
- Continuous monitoring results shared

**Post-migration:**
- Success confirmation to all stakeholders
- Performance metrics shared
- Post-mortem scheduled for lessons learned

### Emergency Contacts

- **Database Administrator:** Primary migration executor
- **DevOps Lead:** Application and infrastructure oversight
- **Backend Team Lead:** Parlant system expertise
- **Site Reliability Engineer:** Monitoring and incident response

---

## Success Criteria

The migration is considered successful when:

1. **Schema Creation Complete:**
   - All 11 Parlant tables created
   - All 6 enums installed
   - 75+ indexes created successfully
   - All foreign key constraints active

2. **Validation Passes:**
   - Post-migration validation script shows 100% PASS rate
   - No critical errors or violations
   - All integration tests successful

3. **System Stability:**
   - Application response times within normal range
   - No increase in error rates
   - Database performance metrics stable
   - Connection pool usage normal

4. **Operational Readiness:**
   - Monitoring systems updated
   - Alert thresholds configured
   - Documentation updated
   - Team knowledge transfer complete

---

## Post-Migration Activities

### Immediate (0-24 hours)

1. **Monitor system stability**
2. **Review performance metrics**
3. **Address any warnings from validation**
4. **Update documentation**

### Short-term (1-7 days)

1. **Gradual feature rollout planning**
2. **Performance optimization if needed**
3. **User acceptance testing preparation**
4. **Team training on new schema**

### Long-term (1-4 weeks)

1. **Full Parlant system activation**
2. **Production workload testing**
3. **Scaling and optimization**
4. **Post-mortem and lessons learned**

---

## Appendix

### Useful Commands

```sql
-- Check migration status
SELECT
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'parlant_%';

-- Monitor active connections
SELECT datname, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE state = 'active';

-- Check lock status
SELECT locktype, database, relation::regclass, page, tuple, virtualxid, transactionid, mode, granted
FROM pg_locks
WHERE NOT granted;

-- Verify foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
AND conname LIKE '%parlant%';
```

### Emergency Procedures

**If migration fails:**
1. Do not panic - assess the situation
2. Stop migration at current phase
3. Execute rollback procedure appropriate to phase
4. Document all issues for post-mortem
5. Schedule retry after issue resolution

**If application errors occur:**
1. Disable Parlant feature flags immediately
2. Monitor error rates for stabilization
3. If errors persist, consider schema rollback
4. Investigate root cause thoroughly

**If performance degrades:**
1. Monitor system resources continuously
2. Consider pausing non-critical index creation
3. Enable query logging for problematic queries
4. Scale database resources if necessary

---

**Document Control:**
- **Version:** 1.0.0
- **Last Updated:** 2025-09-24
- **Next Review:** After migration completion
- **Approved By:** Database Team, DevOps Team, Engineering Leadership