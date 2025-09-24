# Parlant Database Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing the performance of the Parlant database schema extension, including indexing strategies, query optimization, caching, connection management, and monitoring best practices.

## Performance Architecture

### Query Performance Targets
- **Agent Lookup**: < 10ms (heavily indexed)
- **Session Queries**: < 50ms (optimized for real-time)
- **Event Retrieval**: < 25ms (time-series optimized)
- **Analytics Queries**: < 200ms (complex aggregations)
- **Tool Integration**: < 100ms (excluding external API latency)

### Workload Characteristics
- **Read-Heavy**: 80% reads, 20% writes
- **Session Events**: High-frequency inserts (1000+ events/minute)
- **Agent Queries**: Medium-frequency lookups (100+ queries/minute)
- **Analytics**: Low-frequency complex queries (10+ queries/minute)
- **Real-time**: Low-latency requirements for chat interfaces

## Index Optimization Strategy

### Core Performance Indexes

```sql
-- Agent performance indexes
CREATE INDEX CONCURRENTLY parlant_agent_workspace_status_active_idx
  ON parlant_agent(workspace_id, status, last_active_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY parlant_agent_search_idx
  ON parlant_agent USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))
  WHERE deleted_at IS NULL;

-- Session high-performance indexes
CREATE INDEX CONCURRENTLY parlant_session_agent_active_idx
  ON parlant_session(agent_id, last_activity_at DESC)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY parlant_session_workspace_type_idx
  ON parlant_session(workspace_id, session_type, started_at DESC);

CREATE INDEX CONCURRENTLY parlant_session_analytics_idx
  ON parlant_session(agent_id, started_at DESC, status)
  WHERE started_at >= NOW() - INTERVAL '90 days';

-- Event retrieval optimization
CREATE INDEX CONCURRENTLY parlant_event_session_offset_covering_idx
  ON parlant_event(session_id, offset DESC)
  INCLUDE (event_type, content, created_at);

CREATE INDEX CONCURRENTLY parlant_event_type_time_idx
  ON parlant_event(event_type, created_at DESC)
  WHERE created_at >= NOW() - INTERVAL '7 days';

-- Tool performance indexes
CREATE INDEX CONCURRENTLY parlant_tool_workspace_enabled_type_idx
  ON parlant_tool(workspace_id, enabled, tool_type)
  WHERE enabled = true;

CREATE INDEX CONCURRENTLY parlant_agent_tool_usage_idx
  ON parlant_agent_tool(agent_id, enabled, priority DESC)
  WHERE enabled = true;
```

### Specialized Analytics Indexes

```sql
-- Time-series analytics optimization
CREATE INDEX CONCURRENTLY parlant_session_daily_analytics_idx
  ON parlant_session(DATE_TRUNC('day', started_at), agent_id)
  INCLUDE (message_count, tokens_used, cost, satisfaction_score);

CREATE INDEX CONCURRENTLY parlant_session_hourly_analytics_idx
  ON parlant_session(DATE_TRUNC('hour', started_at), workspace_id)
  WHERE started_at >= NOW() - INTERVAL '7 days';

-- Journey performance indexes
CREATE INDEX CONCURRENTLY parlant_journey_state_flow_idx
  ON parlant_journey_transition(journey_id, from_state_id, priority DESC)
  INCLUDE (to_state_id, condition);

-- Knowledge base search optimization
CREATE INDEX CONCURRENTLY parlant_agent_kb_search_idx
  ON parlant_agent_knowledge_base(agent_id, enabled, priority DESC)
  WHERE enabled = true;
```

### Partial Indexes for Common Filters

```sql
-- Active entities only
CREATE INDEX CONCURRENTLY parlant_agent_active_workspace_idx
  ON parlant_agent(workspace_id, name)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY parlant_session_active_agent_idx
  ON parlant_session(agent_id, started_at DESC)
  WHERE status = 'active';

-- Recent activity indexes
CREATE INDEX CONCURRENTLY parlant_session_recent_activity_idx
  ON parlant_session(last_activity_at DESC, agent_id)
  WHERE last_activity_at >= NOW() - INTERVAL '24 hours';

CREATE INDEX CONCURRENTLY parlant_event_recent_idx
  ON parlant_event(created_at DESC, session_id)
  WHERE created_at >= NOW() - INTERVAL '1 hour';
```

## Query Optimization Patterns

### Efficient Agent Queries

```sql
-- Optimized agent lookup with session counts
EXPLAIN (ANALYZE, BUFFERS) SELECT
  pa.id,
  pa.name,
  pa.status,
  pa.last_active_at,
  COUNT(ps.id) FILTER (WHERE ps.status = 'active') as active_sessions,
  pa.total_sessions
FROM parlant_agent pa
LEFT JOIN parlant_session ps ON pa.id = ps.agent_id AND ps.status = 'active'
WHERE pa.workspace_id = $1
  AND pa.status = 'active'
  AND pa.deleted_at IS NULL
GROUP BY pa.id, pa.name, pa.status, pa.last_active_at, pa.total_sessions
ORDER BY pa.last_active_at DESC NULLS LAST
LIMIT 20;

-- Alternative optimized version using window functions
EXPLAIN (ANALYZE, BUFFERS) SELECT
  pa.*,
  COALESCE(session_counts.active_sessions, 0) as active_sessions
FROM parlant_agent pa
LEFT JOIN LATERAL (
  SELECT COUNT(*) as active_sessions
  FROM parlant_session ps
  WHERE ps.agent_id = pa.id AND ps.status = 'active'
) session_counts ON true
WHERE pa.workspace_id = $1
  AND pa.status = 'active'
  AND pa.deleted_at IS NULL
ORDER BY pa.last_active_at DESC NULLS LAST
LIMIT 20;
```

### High-Performance Session Queries

```sql
-- Optimized session event retrieval for real-time chat
-- Uses covering index to avoid heap lookups
SELECT
  pe.offset,
  pe.event_type,
  pe.content,
  pe.created_at
FROM parlant_event pe
WHERE pe.session_id = $1
  AND pe.offset >= $2  -- Starting offset for pagination
ORDER BY pe.offset
LIMIT 50;

-- Session analytics with time window optimization
SELECT
  DATE_TRUNC('hour', ps.started_at) as hour,
  COUNT(*) as session_count,
  AVG(ps.message_count) as avg_messages,
  AVG(ps.cost) as avg_cost,
  AVG(ps.satisfaction_score) FILTER (WHERE ps.satisfaction_score IS NOT NULL) as avg_satisfaction
FROM parlant_session ps
WHERE ps.agent_id = $1
  AND ps.started_at >= $2  -- Time window start
  AND ps.started_at < $3   -- Time window end
GROUP BY DATE_TRUNC('hour', ps.started_at)
ORDER BY hour;
```

### Efficient Tool and Journey Queries

```sql
-- Optimized tool availability for agent
SELECT
  pt.id,
  pt.name,
  pt.display_name,
  pt.parameters,
  pat.configuration,
  pat.priority
FROM parlant_tool pt
INNER JOIN parlant_agent_tool pat ON pt.id = pat.tool_id
WHERE pat.agent_id = $1
  AND pat.enabled = true
  AND pt.enabled = true
ORDER BY pat.priority DESC, pt.name;

-- Journey state transitions with path optimization
WITH RECURSIVE journey_path AS (
  -- Initial state
  SELECT
    js.id,
    js.name,
    js.state_type,
    js.chat_prompt,
    js.tool_id,
    0 as depth,
    ARRAY[js.id] as path
  FROM parlant_journey_state js
  WHERE js.journey_id = $1
    AND js.is_initial = true

  UNION ALL

  -- Recursive transitions
  SELECT
    js.id,
    js.name,
    js.state_type,
    js.chat_prompt,
    js.tool_id,
    jp.depth + 1,
    jp.path || js.id
  FROM journey_path jp
  INNER JOIN parlant_journey_transition jt ON jt.from_state_id = jp.id
  INNER JOIN parlant_journey_state js ON js.id = jt.to_state_id
  WHERE jp.depth < 10  -- Prevent infinite recursion
    AND NOT js.id = ANY(jp.path)  -- Prevent cycles
)
SELECT * FROM journey_path
ORDER BY depth, name;
```

## Caching Strategies

### Application-Level Caching

```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

export class ParlantCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  // Agent configuration caching
  async getAgent(agentId: string): Promise<ParlantAgent | null> {
    const cacheKey = `agent:${agentId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const agent = await db.select()
      .from(parlantAgent)
      .where(eq(parlantAgent.id, agentId));

    if (agent.length > 0) {
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(agent[0]));
      return agent[0];
    }

    return null;
  }

  // Session context caching
  async cacheSessionContext(sessionId: string, context: any): Promise<void> {
    const cacheKey = `session:context:${sessionId}`;
    // Cache session context for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(context));
  }

  async getSessionContext(sessionId: string): Promise<any> {
    const cacheKey = `session:context:${sessionId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // Tool configuration caching
  async cacheAgentTools(agentId: string, tools: any[]): Promise<void> {
    const cacheKey = `agent:tools:${agentId}`;
    // Cache for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(tools));
  }

  async getAgentTools(agentId: string): Promise<any[] | null> {
    const cacheKey = `agent:tools:${agentId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  // Invalidation patterns
  async invalidateAgent(agentId: string): Promise<void> {
    const patterns = [
      `agent:${agentId}`,
      `agent:tools:${agentId}`,
      `agent:analytics:${agentId}:*`,
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.del(pattern);
      }
    }
  }
}
```

### Database Query Result Caching

```sql
-- PostgreSQL query result caching using materialized views
CREATE MATERIALIZED VIEW parlant_agent_analytics_daily AS
SELECT
  pa.id as agent_id,
  pa.workspace_id,
  DATE_TRUNC('day', ps.started_at) as date,
  COUNT(ps.id) as session_count,
  AVG(ps.message_count) as avg_message_count,
  AVG(ps.tokens_used) as avg_tokens_used,
  AVG(ps.cost) as avg_cost,
  AVG(ps.satisfaction_score) FILTER (WHERE ps.satisfaction_score IS NOT NULL) as avg_satisfaction,
  COUNT(ps.id) FILTER (WHERE ps.status = 'completed') as completed_sessions,
  COUNT(ps.id) FILTER (WHERE ps.status = 'abandoned') as abandoned_sessions
FROM parlant_agent pa
LEFT JOIN parlant_session ps ON pa.id = ps.agent_id
WHERE ps.started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY pa.id, pa.workspace_id, DATE_TRUNC('day', ps.started_at)
WITH DATA;

-- Index for fast lookups
CREATE INDEX ON parlant_agent_analytics_daily(agent_id, date DESC);
CREATE INDEX ON parlant_agent_analytics_daily(workspace_id, date DESC);

-- Refresh procedure
CREATE OR REPLACE FUNCTION refresh_parlant_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY parlant_agent_analytics_daily;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-parlant-analytics', '0 * * * *', 'SELECT refresh_parlant_analytics();');
```

## Connection Pool Optimization

### Drizzle Connection Pool Configuration

```typescript
// Database connection pool optimization
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings optimized for Parlant workload
  min: 5,                    // Minimum connections
  max: 25,                   // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection timeout

  // Performance optimization
  statement_timeout: 30000,  // Query timeout
  query_timeout: 30000,

  // Connection reliability
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export const db = drizzle(pool);

// Monitor connection pool health
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

// Connection pool monitoring middleware
export async function monitorConnectionPool() {
  const stats = getPoolStats();

  // Alert if pool utilization is high
  const utilizationRate = (stats.totalCount - stats.idleCount) / stats.totalCount;

  if (utilizationRate > 0.8) {
    console.warn('High database connection pool utilization:', {
      utilizationRate,
      ...stats,
    });
  }

  // Alert if there are waiting connections
  if (stats.waitingCount > 0) {
    console.warn('Database connections waiting in queue:', stats.waitingCount);
  }
}

// Schedule connection pool monitoring
setInterval(monitorConnectionPool, 30000); // Every 30 seconds
```

### Connection Management Best Practices

```typescript
// Efficient transaction management
export class TransactionManager {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  // Optimized transaction wrapper with proper error handling
  async withTransaction<T>(
    operation: (tx: any) => Promise<T>,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<T> {
    const { timeout = 10000, retries = 3 } = options;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          this.db.transaction(operation),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout')), timeout)
          ),
        ]);
      } catch (error) {
        lastError = error as Error;

        // Only retry on specific errors
        if (
          error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('deadlock')
        ) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError!;
  }

  // Batch operations for better performance
  async batchInsert<T>(
    table: any,
    records: T[],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await this.withTransaction(async (tx) => {
        await tx.insert(table).values(batch);
      });
    }
  }
}
```

## Real-Time Performance Optimization

### Socket.io Performance Tuning

```typescript
// Optimized Socket.io configuration for Parlant
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export function createOptimizedSocketServer() {
  const io = new Server({
    // Connection optimization
    pingTimeout: 20000,
    pingInterval: 25000,
    upgradeTimeout: 10000,

    // Performance settings
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling'],

    // CORS optimization
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(','),
      credentials: true,
    },
  });

  // Redis adapter for horizontal scaling
  const pubClient = new Redis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Efficient room management
  const parlantNamespace = io.of('/parlant');

  parlantNamespace.use(async (socket, next) => {
    // Optimize authentication middleware
    try {
      const token = socket.handshake.auth.token;
      const user = await validateTokenWithCache(token); // Use cached validation
      socket.userId = user.id;
      socket.workspaceId = socket.handshake.query.workspaceId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  parlantNamespace.on('connection', (socket) => {
    // Optimized session joining
    socket.on('join-session', async (data) => {
      const { sessionId } = data;

      // Validate session access with caching
      const hasAccess = await validateSessionAccessWithCache(
        socket.userId,
        socket.workspaceId,
        sessionId
      );

      if (hasAccess) {
        socket.join(`session:${sessionId}`);

        // Send cached recent events
        const events = await getCachedSessionEvents(sessionId);
        socket.emit('events', { events });
      } else {
        socket.emit('error', { message: 'Access denied' });
      }
    });

    // Optimized message handling
    socket.on('send-message', async (data) => {
      const { sessionId, content, metadata } = data;

      try {
        // Queue message processing to avoid blocking
        await messageQueue.add('process-message', {
          sessionId,
          userId: socket.userId,
          content,
          metadata,
          socketId: socket.id,
        });

        // Immediate acknowledgment
        socket.emit('message-queued', { sessionId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to queue message' });
      }
    });
  });

  return io;
}

// Cached validation functions
const validationCache = new Map();

async function validateTokenWithCache(token: string) {
  if (validationCache.has(token)) {
    return validationCache.get(token);
  }

  const user = await validateToken(token);
  validationCache.set(token, user);

  // Expire cache entry after 5 minutes
  setTimeout(() => validationCache.delete(token), 5 * 60 * 1000);

  return user;
}

async function validateSessionAccessWithCache(
  userId: string,
  workspaceId: string,
  sessionId: string
) {
  const cacheKey = `access:${userId}:${sessionId}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }

  const hasAccess = await checkSessionAccess(userId, workspaceId, sessionId);
  validationCache.set(cacheKey, hasAccess);

  // Expire cache entry after 1 minute
  setTimeout(() => validationCache.delete(cacheKey), 60 * 1000);

  return hasAccess;
}
```

### Background Job Processing

```typescript
// Optimized background job processing for analytics
import Bull from 'bull';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Separate queues for different job types
export const messageQueue = new Bull('parlant-messages', { redis });
export const analyticsQueue = new Bull('parlant-analytics', { redis });
export const cleanupQueue = new Bull('parlant-cleanup', { redis });

// Message processing with batching
messageQueue.process('process-message', 10, async (job) => {
  const { sessionId, userId, content, metadata, socketId } = job.data;

  try {
    // Add user message to database
    const event = await parlantService.addSessionEvent(sessionId, {
      eventType: 'customer_message',
      content: { text: content },
      metadata,
    });

    // Broadcast to session room
    io.to(`session:${sessionId}`).emit('event', { event });

    // Queue agent response processing
    await messageQueue.add('process-agent-response', {
      sessionId,
      userMessage: content,
      metadata,
    }, {
      delay: 100, // Small delay to batch multiple messages
    });

  } catch (error) {
    console.error('Message processing error:', error);
    io.to(socketId).emit('error', { message: 'Processing failed' });
  }
});

// Analytics processing with batching
analyticsQueue.process('update-analytics', 5, async (job) => {
  const { agentId, sessionId, metrics } = job.data;

  try {
    // Batch analytics updates
    await updateAgentAnalytics(agentId, metrics);

    // Update cached analytics
    await parlantCache.invalidateAgent(agentId);

  } catch (error) {
    console.error('Analytics update error:', error);
    throw error; // Will retry automatically
  }
});

// Cleanup processing
cleanupQueue.process('cleanup-old-data', 1, async (job) => {
  const retentionDays = 90;

  try {
    // Clean up old sessions and events
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      // Delete old events first (due to foreign keys)
      await tx.delete(parlantEvent)
        .where(sql`created_at < ${cutoffDate}`);

      // Delete old completed sessions
      await tx.delete(parlantSession)
        .where(
          and(
            sql`ended_at < ${cutoffDate}`,
            eq(parlantSession.status, 'completed')
          )
        );
    });

    console.log('Cleanup completed for data older than', cutoffDate);

  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
});

// Schedule regular cleanup
cleanupQueue.add('cleanup-old-data', {}, {
  repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
});
```

## Monitoring and Metrics

### Performance Monitoring Setup

```typescript
// Comprehensive performance monitoring
export class ParlantPerformanceMonitor {
  private metrics: Map<string, any> = new Map();

  // Database query performance tracking
  async trackQuery(queryName: string, operation: () => Promise<any>) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      this.recordQueryMetrics(queryName, startTime, startMemory, 'success');
      return result;
    } catch (error) {
      this.recordQueryMetrics(queryName, startTime, startMemory, 'error');
      throw error;
    }
  }

  private recordQueryMetrics(queryName: string, startTime: number, startMemory: number, status: string) {
    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;

    if (!this.metrics.has(queryName)) {
      this.metrics.set(queryName, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0,
        avgMemory: 0,
      });
    }

    const metric = this.metrics.get(queryName);
    metric.count++;
    metric.totalDuration += duration;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.avgMemory = (metric.avgMemory * (metric.count - 1) + memoryUsed) / metric.count;

    if (status === 'error') {
      metric.errors++;
    }

    // Log slow queries
    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
  }

  // Get performance report
  getReport(): any {
    const report: any = {};

    for (const [queryName, metrics] of this.metrics.entries()) {
      report[queryName] = {
        avgDuration: Math.round(metrics.totalDuration / metrics.count),
        maxDuration: metrics.maxDuration,
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        count: metrics.count,
        errorRate: Math.round((metrics.errors / metrics.count) * 100),
        avgMemoryMB: Math.round(metrics.avgMemory / 1024 / 1024),
      };
    }

    return report;
  }

  // Reset metrics
  reset(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new ParlantPerformanceMonitor();
```

### Database Performance Queries

```sql
-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  (total_time / sum(total_time) OVER ()) * 100 AS percentage
FROM pg_stat_statements
WHERE query ILIKE '%parlant_%'
  AND calls > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Monitor index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  seq_scan as table_scans,
  CASE
    WHEN seq_scan + idx_scan > 0
    THEN (idx_scan::float / (seq_scan + idx_scan) * 100)::int
    ELSE 0
  END AS index_usage_percentage
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
ORDER BY index_usage_percentage DESC;

-- Monitor table sizes and bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_stat_get_tuples_inserted(c.oid) AS inserts,
  pg_stat_get_tuples_updated(c.oid) AS updates,
  pg_stat_get_tuples_deleted(c.oid) AS deletes
FROM pg_tables
JOIN pg_class c ON c.relname = tablename
WHERE schemaname = 'public'
  AND tablename LIKE 'parlant_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor connection usage
SELECT
  state,
  COUNT(*) as connection_count,
  AVG(EXTRACT(epoch FROM (now() - state_change))) as avg_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;
```

## Performance Tuning Checklist

### Query Optimization
- [ ] All foreign key columns are indexed
- [ ] Composite indexes exist for common WHERE clause combinations
- [ ] Partial indexes used for filtered queries (e.g., active records only)
- [ ] Covering indexes minimize heap lookups for hot queries
- [ ] Query plans reviewed with EXPLAIN ANALYZE
- [ ] Appropriate use of LIMIT and pagination

### Caching Strategy
- [ ] Frequently accessed agent configurations cached in Redis
- [ ] Session context cached during active conversations
- [ ] Tool configurations cached with proper invalidation
- [ ] Analytics queries use materialized views
- [ ] Cache hit rates monitored and optimized

### Connection Management
- [ ] Connection pool sized appropriately for workload
- [ ] Connection timeouts configured
- [ ] Long-running transactions avoided
- [ ] Proper transaction scope minimization
- [ ] Connection pool health monitored

### Real-Time Performance
- [ ] Socket.io optimized for concurrent connections
- [ ] Message processing queued asynchronously
- [ ] Room management efficient for session isolation
- [ ] Broadcasting optimized to avoid unnecessary network traffic
- [ ] Authentication cached to reduce database load

### Monitoring and Alerting
- [ ] Slow query monitoring enabled
- [ ] Index usage tracked
- [ ] Connection pool utilization monitored
- [ ] Cache hit rates tracked
- [ ] Performance regression alerts configured
- [ ] Regular performance reviews scheduled

This performance optimization guide provides a comprehensive framework for maintaining high-performance operations of the Parlant database schema extension at scale.