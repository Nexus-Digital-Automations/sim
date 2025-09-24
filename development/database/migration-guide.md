# Parlant Database Migration Guide

## Overview

This guide provides comprehensive procedures for migrating, upgrading, and rolling back the Parlant database schema extension. It covers both development and production scenarios with safety measures and troubleshooting procedures.

## Migration Architecture

### Migration System
The Parlant schema uses Drizzle ORM's migration system integrated with Sim's existing database management approach:

```
packages/db/
├── drizzle.config.ts          # Database configuration
├── migrations/                # Migration files
│   ├── 0001_parlant_initial.sql
│   ├── 0002_parlant_indexes.sql
│   └── 0003_parlant_constraints.sql
├── schema.ts                  # Main schema with imports
├── parlant-schema.ts         # Parlant-specific tables
└── migrate.ts                # Migration runner
```

### Migration Strategy
- **Additive Migrations**: New tables, columns, indexes added safely
- **Schema Versioning**: Sequential numbering with descriptive names
- **Rollback Support**: Each migration includes rollback procedures
- **Data Preservation**: Existing Sim data unaffected by Parlant additions

## Pre-Migration Checklist

### Environment Validation
```bash
# 1. Verify database connectivity
psql $DATABASE_URL -c "SELECT version();"

# 2. Check available space (Parlant adds ~50MB + data)
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# 3. Verify Drizzle CLI version
npx drizzle-kit --version  # Should be >= 0.20.0

# 4. Check for conflicting table names
psql $DATABASE_URL -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'parlant_%';
"
```

### Backup Procedures
```bash
# 1. Full database backup (recommended for production)
pg_dump $DATABASE_URL > backup_pre_parlant_$(date +%Y%m%d_%H%M%S).sql

# 2. Schema-only backup (faster for development)
pg_dump $DATABASE_URL --schema-only > schema_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Specific table backup (if needed)
pg_dump $DATABASE_URL --table=workspace --table=user --table=knowledge_base \
  > sim_core_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Permission Verification
```sql
-- Verify migration user has necessary permissions
SELECT
  has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
  has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect,
  has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public,
  has_schema_privilege(current_user, 'public', 'USAGE') as can_use_public;
```

## Migration Execution

### Development Environment

#### Automatic Migration
```bash
# 1. Generate migration files
cd packages/db
npm run generate

# 2. Review generated migration
cat migrations/0001_parlant_initial.sql

# 3. Apply migration
npm run migrate

# 4. Verify migration
npm run studio  # Open Drizzle Studio to verify tables
```

#### Manual Migration Steps
```bash
# 1. Start transaction for safety
psql $DATABASE_URL -c "BEGIN;"

# 2. Apply schema changes
psql $DATABASE_URL -f migrations/0001_parlant_initial.sql

# 3. Verify tables created
psql $DATABASE_URL -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'parlant_%'
  ORDER BY tablename;
"

# 4. Commit if successful
psql $DATABASE_URL -c "COMMIT;"
```

### Production Environment

#### Blue-Green Deployment
```bash
# 1. Create staging database copy
createdb sim_staging_$(date +%Y%m%d)

# 2. Restore production data to staging
pg_dump $PROD_DATABASE_URL | psql $STAGING_DATABASE_URL

# 3. Run migration on staging
DATABASE_URL=$STAGING_DATABASE_URL npm run migrate

# 4. Validate staging environment
npm run validate:staging

# 5. Switch production (coordinated downtime)
# Update environment variables to point to new database
```

#### Hot Migration (Zero Downtime)
```bash
# 1. Apply additive changes first
psql $DATABASE_URL -f migrations/0001_parlant_tables_only.sql

# 2. Deploy application code with backward compatibility
npm run deploy:parlant-compatible

# 3. Apply indexes and constraints
psql $DATABASE_URL -f migrations/0002_parlant_indexes.sql

# 4. Enable Parlant features
npm run deploy:parlant-full
```

## Specific Migration Scripts

### Initial Schema Creation (0001_parlant_initial.sql)
```sql
-- Create enums first
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE session_mode AS ENUM ('auto', 'manual', 'paused');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE event_type AS ENUM (
  'customer_message', 'agent_message', 'tool_call',
  'tool_result', 'status_update', 'journey_transition', 'variable_update'
);
CREATE TYPE journey_state_type AS ENUM ('chat', 'tool', 'decision', 'final');
CREATE TYPE composition_mode AS ENUM ('fluid', 'strict');

-- Create core tables
CREATE TABLE parlant_agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status agent_status NOT NULL DEFAULT 'active',
  composition_mode composition_mode NOT NULL DEFAULT 'fluid',
  system_prompt TEXT,
  model_provider TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL DEFAULT 'gpt-4',
  temperature INTEGER DEFAULT 70 CHECK (temperature >= 0 AND temperature <= 100),
  max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens > 0),
  response_timeout_ms INTEGER DEFAULT 30000,
  max_context_length INTEGER DEFAULT 8000,
  system_instructions TEXT,
  allow_interruption BOOLEAN NOT NULL DEFAULT true,
  allow_proactive_messages BOOLEAN NOT NULL DEFAULT false,
  conversation_style TEXT DEFAULT 'professional',
  data_retention_days INTEGER DEFAULT 30 CHECK (data_retention_days > 0),
  allow_data_export BOOLEAN NOT NULL DEFAULT true,
  pii_handling_mode TEXT DEFAULT 'standard',
  integration_metadata JSONB DEFAULT '{}',
  custom_config JSONB DEFAULT '{}',
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  average_session_duration INTEGER,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Continue with other tables...
-- [Additional CREATE TABLE statements for all Parlant tables]

-- Add foreign key constraints with proper error handling
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Add constraints with error handling
  FOR constraint_name IN
    SELECT 'fk_parlant_session_agent'
    UNION SELECT 'fk_parlant_event_session'
    -- Add other constraint names
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I ...', 'table_name', constraint_name);
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint % already exists, skipping', constraint_name;
    END;
  END LOOP;
END $$;
```

### Index Creation (0002_parlant_indexes.sql)
```sql
-- Performance indexes for core queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_idx
  ON parlant_agent(workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_status_idx
  ON parlant_agent(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_status_idx
  ON parlant_agent(workspace_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_last_active_idx
  ON parlant_agent(last_active_at);

-- Session query indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_agent_idx
  ON parlant_session(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_workspace_idx
  ON parlant_session(workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_user_idx
  ON parlant_session(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_status_idx
  ON parlant_session(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_agent_status_idx
  ON parlant_session(agent_id, status);

-- Event retrieval indexes
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_offset_idx
  ON parlant_event(session_id, offset);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_type_idx
  ON parlant_event(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_created_at_idx
  ON parlant_event(created_at);

-- Continue with specialized indexes for tools, journeys, etc...
```

### Data Migration (0003_parlant_data.sql)
```sql
-- Migrate existing data if needed
-- This script runs after schema creation

-- Create default agents for existing workspaces (optional)
INSERT INTO parlant_agent (workspace_id, created_by, name, description)
SELECT
  w.id as workspace_id,
  w.owner_id as created_by,
  'Default Assistant' as name,
  'Auto-created agent for workspace ' || w.name as description
FROM workspace w
WHERE NOT EXISTS (
  SELECT 1 FROM parlant_agent pa WHERE pa.workspace_id = w.id
);

-- Migrate any existing tool configurations
-- [Tool migration logic if upgrading from previous system]

-- Update usage statistics
UPDATE parlant_agent SET updated_at = NOW();
```

## Rollback Procedures

### Quick Rollback (Development)
```bash
# 1. Drop all Parlant tables
psql $DATABASE_URL -c "
  DO \$\$
  DECLARE
    table_name TEXT;
  BEGIN
    FOR table_name IN
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'parlant_%'
    LOOP
      EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
    END LOOP;
  END \$\$;
"

# 2. Drop enums
psql $DATABASE_URL -c "
  DROP TYPE IF EXISTS agent_status CASCADE;
  DROP TYPE IF EXISTS session_mode CASCADE;
  DROP TYPE IF EXISTS session_status CASCADE;
  DROP TYPE IF EXISTS event_type CASCADE;
  DROP TYPE IF EXISTS journey_state_type CASCADE;
  DROP TYPE IF EXISTS composition_mode CASCADE;
"

# 3. Reset migration state
npm run drizzle:reset
```

### Production Rollback
```bash
# 1. Prepare rollback database
createdb sim_rollback_$(date +%Y%m%d)
pg_dump $BACKUP_DATABASE_URL | psql $ROLLBACK_DATABASE_URL

# 2. Validate rollback database
npm run validate:rollback

# 3. Coordinated switch (planned downtime)
# Update environment variables
# Restart services

# 4. Verify rollback success
curl -f $HEALTH_CHECK_URL/status
```

### Selective Rollback (Partial)
```sql
-- Remove specific Parlant features while preserving data
BEGIN;

-- 1. Disable Parlant endpoints
UPDATE configuration SET parlant_enabled = false WHERE key = 'features';

-- 2. Drop indexes to improve performance
DROP INDEX CONCURRENTLY parlant_agent_workspace_idx;
DROP INDEX CONCURRENTLY parlant_session_agent_idx;
-- Continue with other indexes...

-- 3. Archive data instead of deleting
UPDATE parlant_agent SET deleted_at = NOW() WHERE deleted_at IS NULL;

-- 4. Commit changes
COMMIT;
```

## Troubleshooting Common Issues

### Migration Failures

#### Foreign Key Constraint Violations
```sql
-- Check for orphaned references
SELECT 'parlant_agent' as table_name, COUNT(*) as orphaned_count
FROM parlant_agent pa
LEFT JOIN workspace w ON pa.workspace_id = w.id
WHERE w.id IS NULL

UNION ALL

SELECT 'parlant_session' as table_name, COUNT(*) as orphaned_count
FROM parlant_session ps
LEFT JOIN parlant_agent pa ON ps.agent_id = pa.id
WHERE pa.id IS NULL;

-- Fix orphaned references
DELETE FROM parlant_agent WHERE workspace_id NOT IN (SELECT id FROM workspace);
DELETE FROM parlant_session WHERE agent_id NOT IN (SELECT id FROM parlant_agent);
```

#### Index Creation Failures
```sql
-- Check for duplicate indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
  AND indexname LIKE '%_idx';

-- Remove duplicate indexes
DROP INDEX IF EXISTS parlant_agent_workspace_idx;
DROP INDEX IF EXISTS parlant_agent_workspace_id_idx;  -- If duplicate exists
```

#### Permission Issues
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sim_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sim_user;
GRANT USAGE ON SCHEMA public TO sim_user;

-- Verify permissions
SELECT table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'sim_user'
  AND table_name LIKE 'parlant_%';
```

### Performance Issues After Migration

#### Query Performance Problems
```sql
-- Update table statistics
ANALYZE parlant_agent;
ANALYZE parlant_session;
ANALYZE parlant_event;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
  AND n_distinct < 0.1;  -- Low cardinality columns may need indexes

-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%parlant_%'
ORDER BY mean_time DESC
LIMIT 10;
```

#### Connection Pool Exhaustion
```bash
# Check current connections
psql $DATABASE_URL -c "
  SELECT state, COUNT(*)
  FROM pg_stat_activity
  GROUP BY state;
"

# Adjust connection pool settings
# In your database configuration:
# max_connections = 200 (increase if needed)
# shared_buffers = 256MB (adjust based on available memory)
```

### Data Consistency Issues

#### Event Ordering Problems
```sql
-- Check for gaps in event sequences
WITH event_gaps AS (
  SELECT
    session_id,
    offset,
    LAG(offset) OVER (PARTITION BY session_id ORDER BY offset) as prev_offset
  FROM parlant_event
)
SELECT session_id, offset, prev_offset
FROM event_gaps
WHERE offset - COALESCE(prev_offset, -1) > 1;

-- Fix event ordering
UPDATE parlant_event
SET offset = new_offset
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) - 1 as new_offset
  FROM parlant_event
) reordered
WHERE parlant_event.id = reordered.id;
```

#### Journey State Inconsistencies
```sql
-- Find journeys with incorrect initial states
SELECT j.id, j.title, COUNT(js.id) as initial_count
FROM parlant_journey j
LEFT JOIN parlant_journey_state js ON j.id = js.journey_id AND js.is_initial = true
GROUP BY j.id, j.title
HAVING COUNT(js.id) != 1;

-- Fix journey initial states
UPDATE parlant_journey_state
SET is_initial = false
WHERE journey_id IN (
  SELECT journey_id
  FROM parlant_journey_state
  WHERE is_initial = true
  GROUP BY journey_id
  HAVING COUNT(*) > 1
);

-- Set the first created state as initial
UPDATE parlant_journey_state
SET is_initial = true
WHERE id IN (
  SELECT DISTINCT ON (journey_id) id
  FROM parlant_journey_state
  ORDER BY journey_id, created_at
);
```

## Monitoring and Validation

### Post-Migration Validation
```bash
# 1. Table count verification
psql $DATABASE_URL -c "
  SELECT 'Parlant Tables' as category, COUNT(*) as count
  FROM pg_tables
  WHERE tablename LIKE 'parlant_%'

  UNION ALL

  SELECT 'Total Tables' as category, COUNT(*) as count
  FROM pg_tables
  WHERE schemaname = 'public';
"

# 2. Foreign key integrity check
psql $DATABASE_URL -c "
  SELECT conname, confrelid::regclass as parent_table, conrelid::regclass as child_table
  FROM pg_constraint
  WHERE contype = 'f'
    AND (confrelid::regclass::text LIKE '%parlant%' OR conrelid::regclass::text LIKE '%parlant%');
"

# 3. Index verification
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, COUNT(*) as index_count
  FROM pg_indexes
  WHERE tablename LIKE 'parlant_%'
  GROUP BY schemaname, tablename
  ORDER BY tablename;
"
```

### Health Check Queries
```sql
-- Agent health check
SELECT
  pa.workspace_id,
  COUNT(*) as agent_count,
  COUNT(CASE WHEN pa.status = 'active' THEN 1 END) as active_agents,
  MAX(pa.last_active_at) as last_activity
FROM parlant_agent pa
WHERE pa.deleted_at IS NULL
GROUP BY pa.workspace_id;

-- Session activity check
SELECT
  DATE_TRUNC('hour', ps.started_at) as hour,
  COUNT(*) as session_count,
  AVG(ps.message_count) as avg_messages,
  AVG(ps.cost) as avg_cost
FROM parlant_session ps
WHERE ps.started_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', ps.started_at)
ORDER BY hour DESC;
```

### Continuous Monitoring Setup
```bash
# Set up monitoring alerts
echo "*/5 * * * * psql \$DATABASE_URL -c \"SELECT COUNT(*) FROM parlant_session WHERE status = 'active' AND last_activity_at < NOW() - INTERVAL '1 hour';\" | mail -s \"Stale Sessions Alert\" admin@sim.com" | crontab -

# Performance monitoring
echo "0 */6 * * * psql \$DATABASE_URL -c \"ANALYZE;\" > /dev/null 2>&1" | crontab -

# Daily backup verification
echo "0 2 * * * pg_dump \$DATABASE_URL --schema-only | grep -c 'parlant_' > /tmp/parlant_table_count" | crontab -
```

This comprehensive migration guide ensures safe and reliable deployment of the Parlant database schema extension with proper rollback procedures and troubleshooting support.