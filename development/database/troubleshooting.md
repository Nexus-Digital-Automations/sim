# Parlant Database Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when working with the Parlant database schema extension, including diagnostic procedures, performance problems, data consistency issues, and integration failures.

## Quick Diagnostic Commands

### System Health Check

```bash
#!/bin/bash
# parlant-health-check.sh - Quick system diagnostics

echo "=== Parlant Database Health Check ==="

# 1. Check database connectivity
echo "Checking database connectivity..."
psql $DATABASE_URL -c "SELECT version();" || echo "❌ Database connection failed"

# 2. Check Parlant tables exist
echo "Checking Parlant tables..."
TABLE_COUNT=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'parlant_%';
")
echo "Found $TABLE_COUNT Parlant tables"

if [ "$TABLE_COUNT" -lt 15 ]; then
  echo "❌ Missing Parlant tables (expected 15+)"
else
  echo "✅ All Parlant tables present"
fi

# 3. Check for orphaned records
echo "Checking data integrity..."
psql $DATABASE_URL -c "
SELECT
  'Orphaned Events' as issue,
  COUNT(*) as count
FROM parlant_event e
LEFT JOIN parlant_session s ON e.session_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT
  'Sessions without Agents' as issue,
  COUNT(*) as count
FROM parlant_session ps
LEFT JOIN parlant_agent pa ON ps.agent_id = pa.id
WHERE pa.id IS NULL;
"

# 4. Check recent activity
echo "Checking recent activity..."
psql $DATABASE_URL -c "
SELECT
  'Active Sessions' as metric,
  COUNT(*) as count
FROM parlant_session
WHERE status = 'active'

UNION ALL

SELECT
  'Events Last Hour' as metric,
  COUNT(*) as count
FROM parlant_event
WHERE created_at >= NOW() - INTERVAL '1 hour';
"

echo "=== Health Check Complete ==="
```

### Performance Diagnostic

```sql
-- performance-diagnostic.sql - Identify performance issues

-- Check for slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  stddev_time
FROM pg_stat_statements
WHERE query ILIKE '%parlant_%'
  AND mean_time > 100  -- Queries taking > 100ms on average
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  seq_scan,
  CASE
    WHEN idx_scan + seq_scan > 0
    THEN ROUND((idx_scan::numeric / (idx_scan + seq_scan)) * 100, 2)
    ELSE 0
  END AS index_usage_percent
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
ORDER BY index_usage_percent ASC;

-- Check table bloat
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size,
  pg_stat_get_tuples_inserted(c.oid) as inserts,
  pg_stat_get_tuples_updated(c.oid) as updates,
  pg_stat_get_tuples_deleted(c.oid) as deletes,
  ROUND(
    (pg_stat_get_tuples_updated(c.oid) + pg_stat_get_tuples_deleted(c.oid))::numeric /
    NULLIF(pg_stat_get_tuples_inserted(c.oid), 0) * 100, 2
  ) as churn_ratio
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

## Common Issues and Solutions

### 1. Migration Failures

#### Issue: Foreign Key Constraint Violations

**Symptoms:**
- Migration fails with foreign key errors
- Error messages mentioning non-existent referenced records

**Diagnosis:**
```sql
-- Check for orphaned references before migration
SELECT 'parlant_agent' as table_name, COUNT(*) as orphaned_count
FROM parlant_agent pa
LEFT JOIN workspace w ON pa.workspace_id = w.id
WHERE w.id IS NULL

UNION ALL

SELECT 'parlant_session' as table_name, COUNT(*) as orphaned_count
FROM parlant_session ps
LEFT JOIN parlant_agent pa ON ps.agent_id = pa.id
WHERE pa.id IS NULL;
```

**Solutions:**

1. **Clean up orphaned records:**
```sql
-- Remove orphaned agents
DELETE FROM parlant_agent
WHERE workspace_id NOT IN (SELECT id FROM workspace);

-- Remove orphaned sessions
DELETE FROM parlant_session
WHERE agent_id NOT IN (SELECT id FROM parlant_agent);
```

2. **Create missing workspace references:**
```sql
-- Create default workspace if missing
INSERT INTO workspace (id, name, owner_id, created_at, updated_at)
SELECT
  'default-workspace',
  'Default Workspace',
  (SELECT id FROM "user" LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM workspace WHERE id = 'default-workspace');
```

#### Issue: Index Creation Failures

**Symptoms:**
- `CREATE INDEX CONCURRENTLY` fails
- Index creation times out

**Diagnosis:**
```sql
-- Check for long-running queries blocking index creation
SELECT
  pid,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes';
```

**Solutions:**

1. **Kill blocking queries:**
```sql
-- Identify and kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '10 minutes'
  AND query NOT LIKE '%pg_terminate_backend%';
```

2. **Create indexes during low-traffic periods:**
```sql
-- Schedule index creation
SELECT cron.schedule(
  'create-parlant-indexes',
  '0 2 * * *',  -- 2 AM daily
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_analytics_idx ON parlant_session(agent_id, started_at);'
);
```

### 2. Performance Issues

#### Issue: Slow Agent Queries

**Symptoms:**
- Agent list queries taking > 1 second
- Timeout errors in UI

**Diagnosis:**
```sql
-- Check query plan for agent listing
EXPLAIN (ANALYZE, BUFFERS)
SELECT pa.*, COUNT(ps.id) as active_sessions
FROM parlant_agent pa
LEFT JOIN parlant_session ps ON pa.id = ps.agent_id AND ps.status = 'active'
WHERE pa.workspace_id = 'your-workspace-id'
  AND pa.deleted_at IS NULL
GROUP BY pa.id
ORDER BY pa.last_active_at DESC
LIMIT 20;
```

**Solutions:**

1. **Add missing indexes:**
```sql
-- Critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_agent_workspace_active_idx
  ON parlant_agent(workspace_id, last_active_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_session_agent_status_idx
  ON parlant_session(agent_id, status)
  WHERE status = 'active';
```

2. **Optimize query structure:**
```typescript
// Use lateral joins for better performance
const agents = await db
  .select({
    agent: parlantAgent,
    activeSessions: sql<number>`active_session_count.count`
  })
  .from(parlantAgent)
  .leftJoin(
    lateral(() =>
      db.select({ count: sql<number>`count(*)` })
        .from(parlantSession)
        .where(
          and(
            eq(parlantSession.agentId, parlantAgent.id),
            eq(parlantSession.status, 'active')
          )
        )
    ).as('active_session_count'),
    sql`true`
  )
  .where(
    and(
      eq(parlantAgent.workspaceId, workspaceId),
      sql`deleted_at IS NULL`
    )
  )
  .orderBy(desc(parlantAgent.lastActiveAt))
  .limit(20);
```

#### Issue: Event Retrieval Bottlenecks

**Symptoms:**
- Chat interfaces loading slowly
- High database CPU usage

**Diagnosis:**
```sql
-- Check event query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM parlant_event
WHERE session_id = 'session-id'
ORDER BY offset DESC
LIMIT 50;

-- Check event table statistics
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename = 'parlant_event';
```

**Solutions:**

1. **Add covering index for event queries:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS parlant_event_session_covering_idx
  ON parlant_event(session_id, offset DESC)
  INCLUDE (event_type, content, created_at);
```

2. **Implement query pagination:**
```typescript
// Efficient event pagination
async function getSessionEvents(
  sessionId: string,
  params: { fromOffset?: number, limit?: number } = {}
) {
  const { fromOffset = 0, limit = 50 } = params;

  return await db
    .select()
    .from(parlantEvent)
    .where(
      and(
        eq(parlantEvent.sessionId, sessionId),
        gte(parlantEvent.offset, fromOffset)
      )
    )
    .orderBy(parlantEvent.offset)
    .limit(limit);
}
```

3. **Regular maintenance:**
```sql
-- Schedule vacuum and analyze
SELECT cron.schedule(
  'maintain-parlant-events',
  '0 */6 * * *',  -- Every 6 hours
  'VACUUM ANALYZE parlant_event;'
);
```

### 3. Data Consistency Issues

#### Issue: Event Ordering Problems

**Symptoms:**
- Events appearing out of order in chat
- Missing event offsets

**Diagnosis:**
```sql
-- Find gaps in event sequences
WITH event_gaps AS (
  SELECT
    session_id,
    offset,
    LAG(offset) OVER (PARTITION BY session_id ORDER BY offset) as prev_offset
  FROM parlant_event
  WHERE session_id = 'problematic-session-id'
)
SELECT session_id, offset, prev_offset
FROM event_gaps
WHERE offset - COALESCE(prev_offset, -1) > 1;
```

**Solutions:**

1. **Fix event ordering:**
```sql
-- Reorder events by creation time
UPDATE parlant_event
SET offset = new_offset
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) - 1 as new_offset
  FROM parlant_event
  WHERE session_id = 'problematic-session-id'
) reordered
WHERE parlant_event.id = reordered.id;
```

2. **Prevent future ordering issues:**
```typescript
// Atomic event insertion with proper offset
async function addEventSafely(sessionId: string, eventData: any) {
  return await db.transaction(async (tx) => {
    // Get next offset atomically
    const [{ nextOffset }] = await tx
      .select({
        nextOffset: sql<number>`COALESCE(MAX(offset), -1) + 1`
      })
      .from(parlantEvent)
      .where(eq(parlantEvent.sessionId, sessionId))
      .forUpdate(); // Lock to prevent race conditions

    // Insert event with calculated offset
    return await tx
      .insert(parlantEvent)
      .values({
        sessionId,
        offset: nextOffset,
        ...eventData
      })
      .returning();
  });
}
```

#### Issue: Journey State Inconsistencies

**Symptoms:**
- Journeys with no initial states
- Multiple initial states per journey
- Broken state transitions

**Diagnosis:**
```sql
-- Find journeys with incorrect initial states
SELECT
  j.id,
  j.title,
  COUNT(js.id) FILTER (WHERE js.is_initial = true) as initial_count,
  COUNT(js.id) as total_states
FROM parlant_journey j
LEFT JOIN parlant_journey_state js ON j.id = js.journey_id
GROUP BY j.id, j.title
HAVING COUNT(js.id) FILTER (WHERE js.is_initial = true) != 1;

-- Find orphaned transitions
SELECT
  jt.id,
  jt.journey_id,
  jt.from_state_id,
  jt.to_state_id
FROM parlant_journey_transition jt
LEFT JOIN parlant_journey_state js1 ON jt.from_state_id = js1.id
LEFT JOIN parlant_journey_state js2 ON jt.to_state_id = js2.id
WHERE js1.id IS NULL OR js2.id IS NULL;
```

**Solutions:**

1. **Fix journey state issues:**
```sql
-- Fix multiple initial states
WITH ranked_states AS (
  SELECT
    id,
    journey_id,
    ROW_NUMBER() OVER (PARTITION BY journey_id ORDER BY created_at) as rn
  FROM parlant_journey_state
  WHERE is_initial = true
)
UPDATE parlant_journey_state
SET is_initial = false
WHERE id IN (
  SELECT id FROM ranked_states WHERE rn > 1
);

-- Ensure each journey has an initial state
INSERT INTO parlant_journey_state (journey_id, name, state_type, is_initial, created_at, updated_at)
SELECT
  j.id,
  'Start',
  'chat',
  true,
  NOW(),
  NOW()
FROM parlant_journey j
WHERE NOT EXISTS (
  SELECT 1 FROM parlant_journey_state js
  WHERE js.journey_id = j.id AND js.is_initial = true
);
```

2. **Clean up orphaned transitions:**
```sql
-- Remove transitions with missing states
DELETE FROM parlant_journey_transition
WHERE from_state_id NOT IN (SELECT id FROM parlant_journey_state)
   OR to_state_id NOT IN (SELECT id FROM parlant_journey_state);
```

### 4. Integration Issues

#### Issue: Tool Integration Failures

**Symptoms:**
- Tools not appearing in agent configurations
- Tool execution timeouts
- Integration health check failures

**Diagnosis:**
```sql
-- Check tool integration health
SELECT
  pt.name,
  pt.tool_type,
  pti.integration_type,
  pti.health_status,
  pti.error_count,
  pti.last_health_check,
  pti.last_error
FROM parlant_tool pt
LEFT JOIN parlant_tool_integration pti ON pt.id = pti.parlant_tool_id
WHERE pt.workspace_id = 'your-workspace-id'
  AND (pti.health_status != 'healthy' OR pti.health_status IS NULL);
```

**Solutions:**

1. **Reset tool integration health:**
```sql
-- Reset error counts for failing integrations
UPDATE parlant_tool_integration
SET
  error_count = 0,
  health_status = 'unknown',
  last_error = NULL,
  last_health_check = NOW()
WHERE health_status = 'unhealthy';
```

2. **Fix tool parameter mapping:**
```typescript
// Validate and fix tool mappings
async function validateToolIntegration(toolId: string) {
  const tool = await db
    .select()
    .from(parlantTool)
    .innerJoin(parlantToolIntegration, eq(parlantTool.id, parlantToolIntegration.parlantToolId))
    .where(eq(parlantTool.id, toolId));

  if (!tool.length) {
    throw new Error('Tool integration not found');
  }

  const { parameters, parameterMapping } = tool[0].parlant_tool_integration;

  // Validate parameter mapping
  const requiredParams = Object.keys(parameters.properties || {});
  const mappedParams = Object.keys(parameterMapping || {});

  const missingMappings = requiredParams.filter(param => !mappedParams.includes(param));

  if (missingMappings.length > 0) {
    console.warn(`Missing parameter mappings for tool ${toolId}:`, missingMappings);
  }

  return {
    valid: missingMappings.length === 0,
    missingMappings
  };
}
```

#### Issue: Knowledge Base Integration Problems

**Symptoms:**
- Agents can't access knowledge bases
- Search results not returning relevant content
- Permission denied errors

**Diagnosis:**
```sql
-- Check knowledge base access
SELECT
  pa.name as agent_name,
  kb.name as kb_name,
  pakb.enabled,
  pakb.search_threshold,
  pakb.search_count,
  pakb.last_searched_at
FROM parlant_agent pa
JOIN parlant_agent_knowledge_base pakb ON pa.id = pakb.agent_id
JOIN knowledge_base kb ON pakb.knowledge_base_id = kb.id
WHERE pa.workspace_id = 'your-workspace-id'
  AND pakb.enabled = true
ORDER BY pa.name, kb.name;

-- Check for workspace permission issues
SELECT
  kb.id,
  kb.name,
  kb.workspace_id,
  pa.workspace_id as agent_workspace
FROM knowledge_base kb
JOIN parlant_agent_knowledge_base pakb ON kb.id = pakb.knowledge_base_id
JOIN parlant_agent pa ON pakb.agent_id = pa.id
WHERE kb.workspace_id != pa.workspace_id; -- Cross-workspace access
```

**Solutions:**

1. **Fix knowledge base permissions:**
```sql
-- Remove cross-workspace knowledge base assignments
DELETE FROM parlant_agent_knowledge_base
WHERE knowledge_base_id IN (
  SELECT pakb.knowledge_base_id
  FROM parlant_agent_knowledge_base pakb
  JOIN parlant_agent pa ON pakb.agent_id = pa.id
  JOIN knowledge_base kb ON pakb.knowledge_base_id = kb.id
  WHERE kb.workspace_id != pa.workspace_id
);
```

2. **Optimize search thresholds:**
```typescript
// Auto-tune search thresholds based on results
async function optimizeSearchThresholds(agentId: string) {
  const searches = await db
    .select({
      searchThreshold: parlantAgentKnowledgeBase.searchThreshold,
      searchCount: parlantAgentKnowledgeBase.searchCount,
      kbId: parlantAgentKnowledgeBase.knowledgeBaseId
    })
    .from(parlantAgentKnowledgeBase)
    .where(eq(parlantAgentKnowledgeBase.agentId, agentId));

  for (const search of searches) {
    // If search count is low, lower threshold to get more results
    if (search.searchCount > 100 && search.searchThreshold > 60) {
      await db
        .update(parlantAgentKnowledgeBase)
        .set({
          searchThreshold: Math.max(search.searchThreshold - 10, 60)
        })
        .where(
          and(
            eq(parlantAgentKnowledgeBase.agentId, agentId),
            eq(parlantAgentKnowledgeBase.knowledgeBaseId, search.kbId)
          )
        );
    }
  }
}
```

### 5. Connection and Performance Issues

#### Issue: Connection Pool Exhaustion

**Symptoms:**
- "Connection pool exhausted" errors
- Slow response times
- Application timeouts

**Diagnosis:**
```typescript
// Monitor connection pool health
import { getPoolStats } from '@/lib/database';

export function diagnoseConnectionIssues() {
  const stats = getPoolStats();

  console.log('Connection Pool Stats:', {
    total: stats.totalCount,
    idle: stats.idleCount,
    active: stats.totalCount - stats.idleCount,
    waiting: stats.waitingCount,
    utilization: ((stats.totalCount - stats.idleCount) / stats.totalCount * 100).toFixed(2) + '%'
  });

  // Alert conditions
  if (stats.waitingCount > 0) {
    console.error('⚠️  Connections waiting in queue:', stats.waitingCount);
  }

  if ((stats.totalCount - stats.idleCount) / stats.totalCount > 0.8) {
    console.warn('⚠️  High connection utilization (>80%)');
  }
}
```

**Solutions:**

1. **Increase connection pool size:**
```typescript
// Adjust pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 10,      // Increase minimum connections
  max: 50,      // Increase maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

2. **Implement connection retry logic:**
```typescript
// Robust database operation wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Only retry connection-related errors
      if (error.message.includes('connection') && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }

      throw error;
    }
  }

  throw lastError!;
}
```

#### Issue: Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Slow garbage collection

**Diagnosis:**
```typescript
// Memory monitoring utility
export function monitorMemoryUsage() {
  const usage = process.memoryUsage();

  console.log('Memory Usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB',
    heapUtilization: Math.round((usage.heapUsed / usage.heapTotal) * 100) + '%'
  });

  // Alert on high memory usage
  if (usage.heapUsed / usage.heapTotal > 0.9) {
    console.warn('⚠️  High heap utilization (>90%)');
  }
}

// Schedule memory monitoring
setInterval(monitorMemoryUsage, 30000); // Every 30 seconds
```

**Solutions:**

1. **Implement proper cleanup:**
```typescript
// Ensure proper resource cleanup
class SessionManager {
  private sessions = new Map<string, any>();

  async createSession(params: CreateSessionParams) {
    const session = await this.db.insert(parlantSession).values(params).returning();

    // Set cleanup timer
    const timeoutId = setTimeout(() => {
      this.cleanupSession(session.id);
    }, 4 * 60 * 60 * 1000); // 4 hours

    this.sessions.set(session.id, {
      data: session,
      timeoutId,
      lastAccess: Date.now()
    });

    return session;
  }

  private cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearTimeout(session.timeoutId);
      this.sessions.delete(sessionId);
    }
  }
}
```

## Monitoring and Alerting

### Health Check Endpoints

```typescript
// Health check service
export class ParlantHealthService {
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      // Test basic connectivity
      await db.execute(sql`SELECT 1`);

      // Check critical tables exist
      const tableCheck = await db
        .select({ count: sql<number>`count(*)` })
        .from(sql`information_schema.tables`)
        .where(sql`table_name LIKE 'parlant_%'`);

      if (tableCheck[0].count < 15) {
        return { status: 'unhealthy', message: 'Missing Parlant tables' };
      }

      // Check for recent activity
      const recentActivity = await db
        .select({ count: sql<number>`count(*)` })
        .from(parlantEvent)
        .where(sql`created_at >= NOW() - INTERVAL '1 hour'`);

      return {
        status: 'healthy',
        message: 'All systems operational',
        details: {
          tableCount: tableCheck[0].count,
          recentEvents: recentActivity[0].count,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connectivity issues',
        error: error.message
      };
    }
  }

  async checkPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [queryStats] = await db.execute(sql`
      SELECT
        COUNT(*) as total_queries,
        AVG(mean_time) as avg_query_time,
        MAX(mean_time) as max_query_time
      FROM pg_stat_statements
      WHERE query ILIKE '%parlant_%'
    `);

    return {
      totalQueries: queryStats.total_queries,
      avgQueryTime: queryStats.avg_query_time,
      maxQueryTime: queryStats.max_query_time,
      timestamp: new Date()
    };
  }
}
```

### Automated Maintenance

```sql
-- automated-maintenance.sql
-- Schedule regular maintenance tasks

-- Daily cleanup of old events
SELECT cron.schedule(
  'cleanup-old-events',
  '0 2 * * *',  -- 2 AM daily
  $$
    DELETE FROM parlant_event
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND session_id IN (
        SELECT id FROM parlant_session
        WHERE status = 'completed'
        AND ended_at < NOW() - INTERVAL '90 days'
      );
  $$
);

-- Weekly statistics update
SELECT cron.schedule(
  'update-statistics',
  '0 3 * * 0',  -- 3 AM Sunday
  'ANALYZE parlant_agent, parlant_session, parlant_event;'
);

-- Monthly agent analytics refresh
SELECT cron.schedule(
  'refresh-agent-analytics',
  '0 4 1 * *',  -- 4 AM first of month
  'REFRESH MATERIALIZED VIEW CONCURRENTLY parlant_agent_analytics_daily;'
);
```

This comprehensive troubleshooting guide provides solutions for the most common issues encountered with the Parlant database schema extension, helping maintain system reliability and performance.