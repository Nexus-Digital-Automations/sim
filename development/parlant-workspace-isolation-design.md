# Parlant Workspace Isolation Design

## Overview

This document specifies the comprehensive workspace isolation strategy for Parlant tables, ensuring complete multi-tenant data separation while maintaining performance and usability. The design leverages PostgreSQL's Row-Level Security (RLS) combined with application-level validation for defense-in-depth.

## Core Isolation Principles

### 1. Multi-Tenant Architecture
- **Workspace Boundary**: All Parlant data scoped to specific workspaces
- **Zero Cross-Tenant Access**: No data leakage between workspaces
- **User Permission Integration**: Leverages Sim's existing workspace membership
- **Anonymous Session Support**: Workspace-scoped anonymous conversations

### 2. Defense in Depth
- **Database Level**: Row-Level Security policies
- **Application Level**: Mandatory workspace filtering
- **API Level**: Workspace context validation
- **UI Level**: Workspace-aware data presentation

### 3. Performance Optimization
- **Index Strategy**: Workspace-prefixed indexes for optimal performance
- **Query Patterns**: Workspace-first filtering in all queries
- **Connection Pooling**: Workspace-aware connection management
- **Caching Strategy**: Workspace-scoped cache keys

## Row-Level Security (RLS) Implementation

### 1. Security Policy Foundation

#### Helper Function for Current User Workspaces
```sql
-- Create function to get current user's accessible workspaces
CREATE OR REPLACE FUNCTION get_user_workspaces(check_user_id TEXT DEFAULT NULL)
RETURNS TABLE(workspace_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT wm.workspace_id
  FROM workspace_member wm
  WHERE wm.user_id = COALESCE(check_user_id, current_setting('app.current_user_id', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_workspaces(TEXT) TO PUBLIC;
```

#### Session Context Management
```sql
-- Function to set current user context
CREATE OR REPLACE FUNCTION set_user_context(user_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql;

-- Function to get current user context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
END;
$$ LANGUAGE plpgsql;
```

### 2. Core Table RLS Policies

#### parlant_agent Table
```sql
-- Enable RLS on parlant_agent
ALTER TABLE parlant_agent ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access agents in their workspaces
CREATE POLICY "agent_workspace_access" ON parlant_agent
  FOR ALL
  TO PUBLIC
  USING (
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
  );

-- Policy: Agent creation restricted to workspace members
CREATE POLICY "agent_workspace_insert" ON parlant_agent
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces()) AND
    created_by = get_current_user_id()
  );
```

#### parlant_session Table
```sql
-- Enable RLS on parlant_session
ALTER TABLE parlant_session ENABLE ROW LEVEL SECURITY;

-- Policy: Session access restricted to workspace members
CREATE POLICY "session_workspace_access" ON parlant_session
  FOR ALL
  TO PUBLIC
  USING (
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
  );

-- Policy: Session creation with workspace validation
CREATE POLICY "session_workspace_insert" ON parlant_session
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces()) AND
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id = parlant_session.workspace_id
    )
  );
```

#### parlant_event Table
```sql
-- Enable RLS on parlant_event
ALTER TABLE parlant_event ENABLE ROW LEVEL SECURITY;

-- Policy: Event access through session workspace membership
CREATE POLICY "event_workspace_access" ON parlant_event
  FOR ALL
  TO PUBLIC
  USING (
    session_id IN (
      SELECT id FROM parlant_session
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_guideline Table
```sql
-- Enable RLS on parlant_guideline
ALTER TABLE parlant_guideline ENABLE ROW LEVEL SECURITY;

-- Policy: Guideline access through agent workspace membership
CREATE POLICY "guideline_workspace_access" ON parlant_guideline
  FOR ALL
  TO PUBLIC
  USING (
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_journey Table
```sql
-- Enable RLS on parlant_journey
ALTER TABLE parlant_journey ENABLE ROW LEVEL SECURITY;

-- Policy: Journey access through agent workspace membership
CREATE POLICY "journey_workspace_access" ON parlant_journey
  FOR ALL
  TO PUBLIC
  USING (
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_journey_state Table
```sql
-- Enable RLS on parlant_journey_state
ALTER TABLE parlant_journey_state ENABLE ROW LEVEL SECURITY;

-- Policy: Journey state access through journey workspace membership
CREATE POLICY "journey_state_workspace_access" ON parlant_journey_state
  FOR ALL
  TO PUBLIC
  USING (
    journey_id IN (
      SELECT pj.id FROM parlant_journey pj
      JOIN parlant_agent pa ON pj.agent_id = pa.id
      WHERE pa.workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_journey_transition Table
```sql
-- Enable RLS on parlant_journey_transition
ALTER TABLE parlant_journey_transition ENABLE ROW LEVEL SECURITY;

-- Policy: Transition access through journey workspace membership
CREATE POLICY "journey_transition_workspace_access" ON parlant_journey_transition
  FOR ALL
  TO PUBLIC
  USING (
    journey_id IN (
      SELECT pj.id FROM parlant_journey pj
      JOIN parlant_agent pa ON pj.agent_id = pa.id
      WHERE pa.workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_variable Table
```sql
-- Enable RLS on parlant_variable
ALTER TABLE parlant_variable ENABLE ROW LEVEL SECURITY;

-- Policy: Variable access through agent workspace membership
CREATE POLICY "variable_workspace_access" ON parlant_variable
  FOR ALL
  TO PUBLIC
  USING (
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_tool Table
```sql
-- Enable RLS on parlant_tool
ALTER TABLE parlant_tool ENABLE ROW LEVEL SECURITY;

-- Policy: Tool access restricted to workspace members
CREATE POLICY "tool_workspace_access" ON parlant_tool
  FOR ALL
  TO PUBLIC
  USING (
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
  );
```

#### parlant_term Table
```sql
-- Enable RLS on parlant_term
ALTER TABLE parlant_term ENABLE ROW LEVEL SECURITY;

-- Policy: Term access through agent workspace membership
CREATE POLICY "term_workspace_access" ON parlant_term
  FOR ALL
  TO PUBLIC
  USING (
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

#### parlant_canned_response Table
```sql
-- Enable RLS on parlant_canned_response
ALTER TABLE parlant_canned_response ENABLE ROW LEVEL SECURITY;

-- Policy: Canned response access through agent workspace membership
CREATE POLICY "canned_response_workspace_access" ON parlant_canned_response
  FOR ALL
  TO PUBLIC
  USING (
    agent_id IN (
      SELECT id FROM parlant_agent
      WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
    )
  );
```

### 3. Special Cases and Anonymous Sessions

#### Anonymous Session Handling
```sql
-- Policy for anonymous session access (customer support scenarios)
CREATE POLICY "session_anonymous_access" ON parlant_session
  FOR SELECT
  TO PUBLIC
  USING (
    user_id IS NULL AND
    customer_id = current_setting('app.current_customer_id', true) AND
    workspace_id = current_setting('app.current_workspace_id', true)
  );

-- Function to set anonymous session context
CREATE OR REPLACE FUNCTION set_anonymous_session_context(
  customer_id TEXT,
  workspace_id TEXT
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_customer_id', customer_id, true);
  PERFORM set_config('app.current_workspace_id', workspace_id, true);
END;
$$ LANGUAGE plpgsql;
```

#### Service Account Access
```sql
-- Policy for service accounts (system operations)
CREATE POLICY "service_account_access" ON parlant_agent
  FOR ALL
  TO PUBLIC
  USING (
    current_setting('app.service_account_access', true) = 'true' OR
    workspace_id IN (SELECT workspace_id FROM get_user_workspaces())
  );

-- Function to enable service account mode
CREATE OR REPLACE FUNCTION enable_service_account_access()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.service_account_access', 'true', true);
END;
$$ LANGUAGE plpgsql;
```

## Application-Level Validation

### 1. Mandatory Query Patterns

#### Repository Layer Validation
```typescript
// TypeScript interface for workspace-scoped queries
interface WorkspaceScoped {
  workspace_id: string;
}

// Base repository class with workspace enforcement
abstract class WorkspaceScopedRepository<T extends WorkspaceScoped> {
  constructor(protected workspaceId: string) {}

  protected validateWorkspaceId(entity: T): void {
    if (entity.workspace_id !== this.workspaceId) {
      throw new Error('Workspace ID mismatch');
    }
  }

  protected addWorkspaceFilter(query: QueryBuilder): QueryBuilder {
    return query.where('workspace_id', '=', this.workspaceId);
  }
}

// Agent repository implementation
class AgentRepository extends WorkspaceScopedRepository<ParlantAgent> {
  async findActiveAgents(): Promise<ParlantAgent[]> {
    return this.addWorkspaceFilter(
      db.selectFrom('parlant_agent')
    ).where('status', '=', 'active').execute();
  }

  async createAgent(agent: CreateAgentRequest): Promise<ParlantAgent> {
    const newAgent = {
      ...agent,
      workspace_id: this.workspaceId, // Enforce workspace
    };
    return db.insertInto('parlant_agent').values(newAgent).execute();
  }
}
```

#### Service Layer Validation
```typescript
class AgentService {
  constructor(
    private agentRepo: AgentRepository,
    private workspaceId: string,
    private userId: string
  ) {}

  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    // Validate user has permission to create agents in workspace
    await this.validateWorkspaceAccess();

    // Enforce workspace scoping
    const agentData = {
      ...request,
      workspace_id: this.workspaceId,
      created_by: this.userId,
    };

    return this.agentRepo.createAgent(agentData);
  }

  private async validateWorkspaceAccess(): Promise<void> {
    const hasAccess = await db
      .selectFrom('workspace_member')
      .where('workspace_id', '=', this.workspaceId)
      .where('user_id', '=', this.userId)
      .executeTakeFirst();

    if (!hasAccess) {
      throw new UnauthorizedError('No access to workspace');
    }
  }
}
```

### 2. Cross-Reference Validation

#### Agent-Session Consistency
```typescript
async function createSession(
  workspaceId: string,
  agentId: string,
  userId: string | null
): Promise<Session> {
  // Validate agent belongs to workspace
  const agent = await db
    .selectFrom('parlant_agent')
    .where('id', '=', agentId)
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirst();

  if (!agent) {
    throw new Error('Agent not found in workspace');
  }

  // Create session with validated workspace context
  return db
    .insertInto('parlant_session')
    .values({
      agent_id: agentId,
      workspace_id: workspaceId,
      user_id: userId,
    })
    .execute();
}
```

#### Tool Permission Validation
```typescript
async function validateToolAccess(
  workspaceId: string,
  toolId: string
): Promise<boolean> {
  const tool = await db
    .selectFrom('parlant_tool')
    .where('id', '=', toolId)
    .where('workspace_id', '=', workspaceId)
    .where('enabled', '=', true)
    .executeTakeFirst();

  return tool !== undefined;
}
```

### 3. Middleware Implementation

#### Express Middleware for Workspace Context
```typescript
interface AuthenticatedRequest extends Request {
  userId: string;
  workspaceId: string;
}

function requireWorkspaceAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate workspace access
    const hasAccess = await db
      .selectFrom('workspace_member')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!hasAccess) {
      return res.status(403).json({ error: 'Workspace access denied' });
    }

    // Set database session context
    await db.raw('SELECT set_user_context(?)', [userId]);

    // Extend request object
    (req as AuthenticatedRequest).userId = userId;
    (req as AuthenticatedRequest).workspaceId = workspaceId;

    next();
  };
}

// Usage in route handlers
app.get('/workspaces/:workspaceId/agents',
  requireWorkspaceAccess(),
  async (req: AuthenticatedRequest, res) => {
    const agents = await new AgentRepository(req.workspaceId)
      .findActiveAgents();
    res.json(agents);
  }
);
```

## Performance Optimization

### 1. Index Strategy for Workspace Isolation

#### Composite Indexes with Workspace Prefix
```sql
-- Optimize workspace + status queries
CREATE INDEX CONCURRENTLY "idx_parlant_agent_workspace_status_active"
ON "parlant_agent"("workspace_id", "status")
WHERE status = 'active';

-- Optimize session lookups by workspace and user
CREATE INDEX CONCURRENTLY "idx_parlant_session_workspace_user_active"
ON "parlant_session"("workspace_id", "user_id", "status")
WHERE status = 'active';

-- Optimize event queries by workspace through session
CREATE INDEX CONCURRENTLY "idx_parlant_event_session_workspace"
ON "parlant_event"("session_id")
INCLUDE ("workspace_id"); -- Include workspace_id from session join

-- Function to add workspace_id to event table for direct indexing
ALTER TABLE parlant_event ADD COLUMN workspace_id TEXT;

-- Populate workspace_id from session
UPDATE parlant_event
SET workspace_id = ps.workspace_id
FROM parlant_session ps
WHERE parlant_event.session_id = ps.id;

-- Add constraint to maintain consistency
ALTER TABLE parlant_event
ADD CONSTRAINT fk_parlant_event_workspace_consistency
FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE;

-- Create workspace index on events
CREATE INDEX CONCURRENTLY "idx_parlant_event_workspace_type_created"
ON "parlant_event"("workspace_id", "event_type", "created_at");
```

#### Partial Indexes for Active Data
```sql
-- Index only active agents per workspace
CREATE INDEX CONCURRENTLY "idx_parlant_agent_workspace_active_only"
ON "parlant_agent"("workspace_id", "last_active_at")
WHERE status = 'active' AND deleted_at IS NULL;

-- Index only enabled guidelines per workspace
CREATE INDEX CONCURRENTLY "idx_parlant_guideline_workspace_enabled"
ON "parlant_guideline"("agent_id", "priority")
WHERE enabled = true;

-- Index only active sessions per workspace
CREATE INDEX CONCURRENTLY "idx_parlant_session_workspace_active_recent"
ON "parlant_session"("workspace_id", "last_activity_at")
WHERE status = 'active';
```

### 2. Query Optimization Patterns

#### Efficient Workspace Filtering
```sql
-- Good: Workspace filter first
EXPLAIN (ANALYZE, BUFFERS)
SELECT pa.*, ps.id as session_id
FROM parlant_agent pa
JOIN parlant_session ps ON pa.id = ps.agent_id
WHERE pa.workspace_id = 'ws_123'
  AND pa.status = 'active'
  AND ps.status = 'active';

-- Better: Use workspace-prefixed indexes
SELECT pa.*, ps.id as session_id
FROM parlant_agent pa
JOIN parlant_session ps ON pa.id = ps.agent_id
WHERE pa.workspace_id = 'ws_123'
  AND ps.workspace_id = 'ws_123'  -- Redundant but enables better index usage
  AND pa.status = 'active'
  AND ps.status = 'active';
```

#### Subquery Optimization for RLS
```sql
-- Optimize RLS policy subqueries with materialization
CREATE OR REPLACE FUNCTION get_user_workspaces_cached(check_user_id TEXT)
RETURNS TABLE(workspace_id TEXT) AS $$
DECLARE
  cache_key TEXT;
  cached_result TEXT[];
BEGIN
  cache_key := 'user_workspaces:' || COALESCE(check_user_id, 'null');

  -- Try to get from cache (implement with pg_advisory_lock or extension)
  SELECT cached_workspaces INTO cached_result
  FROM user_workspace_cache
  WHERE user_id = check_user_id
    AND expires_at > NOW();

  IF cached_result IS NOT NULL THEN
    RETURN QUERY SELECT UNNEST(cached_result);
    RETURN;
  END IF;

  -- Cache miss, query and cache result
  RETURN QUERY
  SELECT wm.workspace_id
  FROM workspace_member wm
  WHERE wm.user_id = COALESCE(check_user_id, current_setting('app.current_user_id', true));
END;
$$ LANGUAGE plpgsql;
```

### 3. Connection Pool Optimization

#### Workspace-Aware Connection Pooling
```typescript
class WorkspaceConnectionPool {
  private pools: Map<string, Pool> = new Map();

  getConnection(workspaceId: string): Pool {
    if (!this.pools.has(workspaceId)) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10, // Per-workspace connection limit
        application_name: `parlant-ws-${workspaceId}`,
      });

      // Set workspace context on connection
      pool.on('connect', async (client) => {
        await client.query('SELECT set_config($1, $2, false)', [
          'app.current_workspace_id',
          workspaceId
        ]);
      });

      this.pools.set(workspaceId, pool);
    }

    return this.pools.get(workspaceId)!;
  }
}
```

## Cache Strategy

### 1. Workspace-Scoped Cache Keys

#### Redis Cache Implementation
```typescript
class WorkspaceScopedCache {
  constructor(private redis: Redis, private workspaceId: string) {}

  private getKey(key: string): string {
    return `ws:${this.workspaceId}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(this.getKey(key));
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.redis.setex(
      this.getKey(key),
      ttl,
      JSON.stringify(value)
    );
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(this.getKey(pattern));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage example
class CachedAgentRepository extends AgentRepository {
  constructor(
    workspaceId: string,
    private cache: WorkspaceScopedCache
  ) {
    super(workspaceId);
  }

  async findActiveAgents(): Promise<ParlantAgent[]> {
    const cacheKey = 'agents:active';

    let agents = await this.cache.get<ParlantAgent[]>(cacheKey);
    if (!agents) {
      agents = await super.findActiveAgents();
      await this.cache.set(cacheKey, agents, 300); // 5 min cache
    }

    return agents;
  }

  async updateAgent(id: string, updates: Partial<ParlantAgent>): Promise<ParlantAgent> {
    const agent = await super.updateAgent(id, updates);

    // Invalidate related caches
    await this.cache.invalidatePattern('agents:*');
    await this.cache.invalidatePattern(`agent:${id}:*`);

    return agent;
  }
}
```

### 2. Session State Caching

#### Active Session Cache
```typescript
interface SessionState {
  id: string;
  agentId: string;
  workspaceId: string;
  currentJourneyId?: string;
  currentStateId?: string;
  variables: Record<string, any>;
  lastActivity: Date;
}

class SessionStateCache {
  constructor(
    private cache: WorkspaceScopedCache,
    private workspaceId: string
  ) {}

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    return this.cache.get(`session:${sessionId}:state`);
  }

  async setSessionState(
    sessionId: string,
    state: SessionState
  ): Promise<void> {
    // Cache for 1 hour or until session ends
    await this.cache.set(`session:${sessionId}:state`, state, 3600);
  }

  async updateSessionVariable(
    sessionId: string,
    key: string,
    value: any
  ): Promise<void> {
    const state = await this.getSessionState(sessionId);
    if (state) {
      state.variables[key] = value;
      state.lastActivity = new Date();
      await this.setSessionState(sessionId, state);
    }
  }
}
```

## Security Considerations

### 1. Data Encryption

#### Sensitive Field Encryption
```typescript
import { encrypt, decrypt } from './crypto-utils';

class SecureAgentRepository extends AgentRepository {
  async createAgent(agent: CreateAgentRequest): Promise<ParlantAgent> {
    // Encrypt sensitive fields before storage
    const secureAgent = {
      ...agent,
      system_prompt: agent.system_prompt
        ? await encrypt(agent.system_prompt)
        : null,
    };

    return super.createAgent(secureAgent);
  }

  async getAgent(id: string): Promise<ParlantAgent | null> {
    const agent = await super.getAgent(id);
    if (agent && agent.system_prompt) {
      // Decrypt on retrieval
      agent.system_prompt = await decrypt(agent.system_prompt);
    }
    return agent;
  }
}
```

### 2. Audit Logging

#### Workspace Activity Audit
```typescript
interface AuditLogEntry {
  workspaceId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

class WorkspaceAuditLogger {
  async logAccess(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const auditEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Log to secure audit table
    await db
      .insertInto('workspace_audit_log')
      .values(auditEntry)
      .execute();

    // Send to external audit system if required
    await this.sendToExternalAudit(auditEntry);
  }

  async logDataAccess(
    workspaceId: string,
    userId: string,
    table: string,
    recordIds: string[]
  ): Promise<void> {
    await this.logAccess({
      workspaceId,
      userId,
      action: 'data_access',
      resourceType: table,
      resourceId: recordIds.join(','),
      metadata: { recordCount: recordIds.length },
    });
  }
}
```

## Testing Strategy

### 1. Isolation Verification Tests

#### Cross-Workspace Access Prevention
```typescript
describe('Workspace Isolation', () => {
  let workspace1: string, workspace2: string;
  let user1: string, user2: string;

  beforeEach(async () => {
    // Setup test workspaces and users
    workspace1 = await createTestWorkspace();
    workspace2 = await createTestWorkspace();
    user1 = await createTestUser(workspace1);
    user2 = await createTestUser(workspace2);
  });

  it('prevents cross-workspace agent access', async () => {
    // Create agent in workspace1
    const agent1 = await new AgentRepository(workspace1)
      .createAgent({ name: 'Test Agent 1' });

    // Try to access from workspace2 - should fail
    const agent2Repo = new AgentRepository(workspace2);
    const result = await agent2Repo.getAgent(agent1.id);

    expect(result).toBeNull();
  });

  it('prevents cross-workspace session creation', async () => {
    const agent1 = await new AgentRepository(workspace1)
      .createAgent({ name: 'Test Agent 1' });

    // Try to create session in workspace2 with workspace1 agent
    await expect(
      new SessionRepository(workspace2).createSession({
        agentId: agent1.id,
        userId: user2,
      })
    ).rejects.toThrow('Agent not found in workspace');
  });
});
```

### 2. RLS Policy Tests

#### Database-Level Isolation Tests
```sql
-- Test RLS policies directly
BEGIN;

-- Set user context for workspace1 member
SELECT set_user_context('user1');

-- Create test data
INSERT INTO parlant_agent (workspace_id, created_by, name)
VALUES ('ws1', 'user1', 'Agent 1');

INSERT INTO parlant_agent (workspace_id, created_by, name)
VALUES ('ws2', 'user2', 'Agent 2');

-- Should only see agent from user's workspace
SELECT COUNT(*) FROM parlant_agent; -- Should return 1

-- Switch to user2 context
SELECT set_user_context('user2');

-- Should only see different agent
SELECT COUNT(*) FROM parlant_agent; -- Should return 1

-- Verify agent names are workspace-appropriate
SELECT name FROM parlant_agent; -- Should return 'Agent 2'

ROLLBACK;
```

### 3. Performance Tests

#### Workspace Scale Testing
```typescript
describe('Workspace Performance', () => {
  it('handles large workspace data efficiently', async () => {
    const workspaceId = await createTestWorkspace();
    const agentRepo = new AgentRepository(workspaceId);

    // Create many agents
    const agents = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        agentRepo.createAgent({ name: `Agent ${i}` })
      )
    );

    // Measure query performance
    const start = performance.now();
    const activeAgents = await agentRepo.findActiveAgents();
    const duration = performance.now() - start;

    expect(activeAgents).toHaveLength(1000);
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });
});
```

## Monitoring and Alerting

### 1. Isolation Breach Detection

#### Monitoring Queries
```sql
-- Detect potential isolation breaches
WITH cross_workspace_access AS (
  SELECT
    ps.workspace_id as session_workspace,
    pa.workspace_id as agent_workspace,
    COUNT(*) as breach_count
  FROM parlant_session ps
  JOIN parlant_agent pa ON ps.agent_id = pa.id
  WHERE ps.workspace_id != pa.workspace_id
  GROUP BY ps.workspace_id, pa.workspace_id
)
SELECT * FROM cross_workspace_access WHERE breach_count > 0;

-- Monitor RLS policy effectiveness
SELECT
  schemaname,
  tablename,
  rowsecurity,
  COUNT(*) FILTER (WHERE rowsecurity = false) as unprotected_tables
FROM pg_tables pt
LEFT JOIN pg_class pc ON pt.tablename = pc.relname
LEFT JOIN pg_namespace pn ON pc.relnamespace = pn.oid AND pn.nspname = pt.schemaname
WHERE tablename LIKE 'parlant_%'
GROUP BY schemaname, tablename, rowsecurity;
```

### 2. Performance Monitoring

#### Workspace Query Performance
```sql
-- Monitor slow workspace queries
SELECT
  query,
  mean_time,
  calls,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%workspace_id%'
  AND mean_time > 100  -- Queries taking >100ms
ORDER BY mean_time DESC
LIMIT 20;
```

### 3. Alert Configuration

#### Critical Isolation Alerts
```typescript
class WorkspaceIsolationMonitor {
  async checkIsolationBreach(): Promise<void> {
    // Check for cross-workspace data access
    const breaches = await db.raw(`
      SELECT COUNT(*) as breach_count
      FROM parlant_session ps
      JOIN parlant_agent pa ON ps.agent_id = pa.id
      WHERE ps.workspace_id != pa.workspace_id
    `);

    if (breaches.rows[0].breach_count > 0) {
      await this.sendCriticalAlert(
        'WORKSPACE_ISOLATION_BREACH',
        `Detected ${breaches.rows[0].breach_count} workspace isolation breaches`
      );
    }
  }

  async checkRLSPolicyStatus(): Promise<void> {
    const unprotectedTables = await db.raw(`
      SELECT tablename
      FROM pg_tables pt
      LEFT JOIN pg_class pc ON pt.tablename = pc.relname
      LEFT JOIN pg_namespace pn ON pc.relnamespace = pn.oid
      WHERE pt.schemaname = 'public'
        AND pt.tablename LIKE 'parlant_%'
        AND NOT pc.relrowsecurity
    `);

    if (unprotectedTables.rows.length > 0) {
      await this.sendCriticalAlert(
        'RLS_POLICY_DISABLED',
        `RLS disabled on tables: ${unprotectedTables.rows.map(r => r.tablename).join(', ')}`
      );
    }
  }

  private async sendCriticalAlert(type: string, message: string): Promise<void> {
    // Implement alert sending (email, Slack, PagerDuty, etc.)
    console.error(`CRITICAL ALERT [${type}]: ${message}`);

    // Log to audit system
    await db.insertInto('security_alerts').values({
      alert_type: type,
      message,
      severity: 'critical',
      created_at: new Date(),
    });
  }
}
```

## Conclusion

This comprehensive workspace isolation design ensures complete data separation between Parlant workspaces while maintaining optimal performance and usability. The multi-layered approach provides:

- **Database-level protection** through Row-Level Security policies
- **Application-level validation** with mandatory workspace filtering
- **Performance optimization** through strategic indexing and caching
- **Security monitoring** with breach detection and alerting
- **Comprehensive testing** to verify isolation effectiveness

The design supports both authenticated users and anonymous sessions while preventing any cross-workspace data leakage, making it suitable for enterprise multi-tenant deployments.