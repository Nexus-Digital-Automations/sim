# Workflow to Journey Mapping Troubleshooting Guide
## Common Issues, Diagnostics, and Solutions

### Table of Contents
1. [Quick Diagnosis Guide](#quick-diagnosis-guide)
2. [Conversion Issues](#conversion-issues)
3. [Execution Problems](#execution-problems)
4. [Performance Issues](#performance-issues)
5. [Integration Problems](#integration-problems)
6. [Tool Adapter Issues](#tool-adapter-issues)
7. [Database and Migration Issues](#database-and-migration-issues)
8. [Debugging Tools and Utilities](#debugging-tools-and-utilities)

---

## Quick Diagnosis Guide

### Immediate Diagnostics Checklist

When experiencing issues with the Workflow to Journey Mapping system, run through this checklist first:

#### 1. System Health Check

```bash
# Check all required services are running
npm run health:check

# Verify database connectivity
npm run db:status

# Test Parlant server connection
curl http://localhost:8000/health

# Check Socket.io server
curl http://localhost:3001/health
```

#### 2. Environment Verification

```bash
# Verify environment variables
node -e "
const required = ['SIM_API_KEY', 'WORKSPACE_ID', 'PARLANT_SERVER_URL', 'DATABASE_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
} else {
  console.log('All required environment variables are set');
}
"
```

#### 3. Quick API Test

```bash
# Test workflow analysis endpoint
curl -X POST "http://localhost:3000/api/workflows/test-workflow/analyze" \
  -H "Authorization: Bearer $SIM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: $WORKSPACE_ID"

# Test journey conversion endpoint
curl -X POST "http://localhost:3000/api/workflows/test-workflow/convert-to-journey" \
  -H "Authorization: Bearer $SIM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: $WORKSPACE_ID"
```

---

## Conversion Issues

### Issue: "Workflow cannot be converted to journey"

#### Symptoms
- Conversion API returns `canConvert: false`
- Error message: "Complex workflow structure not supported"
- Analysis shows high complexity score (>100)

#### Diagnosis Steps

```typescript
// diagnose-conversion-issue.ts
import { WorkflowAnalysisService } from '@/services/workflow-mapping'

async function diagnoseConversionIssue(workflowId: string) {
  const analyzer = new WorkflowAnalysisService()

  try {
    const analysis = await analyzer.analyzeWorkflow(workflowId)

    console.log('Conversion Diagnosis:')
    console.log(`- Complexity Score: ${analysis.analysis.complexity}`)
    console.log(`- Blocks Count: ${analysis.analysis.blocksCount}`)
    console.log(`- Conditional Paths: ${analysis.analysis.conditionalPaths.length}`)
    console.log(`- Parallel Sections: ${analysis.analysis.parallelSections.length}`)
    console.log(`- Loop Structures: ${analysis.analysis.loopStructures.length}`)

    if (!analysis.feasibility.canConvert) {
      console.log('\nBlocked by:')
      analysis.feasibility.blockedBy.forEach(reason => {
        console.log(`- ${reason}`)
      })

      console.log('\nSuggested Solutions:')
      analysis.feasibility.warnings.forEach(warning => {
        console.log(`- ${warning}`)
      })
    }

    return analysis
  } catch (error) {
    console.error('Analysis failed:', error.message)
    return null
  }
}
```

#### Common Causes and Solutions

**1. Excessive Complexity**
```
Problem: Workflow complexity score > 100
Solution: Break workflow into smaller sub-workflows
```

**2. Unsupported Block Types**
```
Problem: Workflow contains blocks without Parlant adapters
Solution:
- Implement custom tool adapters
- Replace unsupported blocks with supported alternatives
- Use generic tool adapters where possible
```

**3. Deep Nested Conditions**
```
Problem: Conditional logic nesting depth > 5 levels
Solution:
- Flatten conditional logic
- Use lookup tables instead of deep if-else chains
- Split complex decisions into multiple simpler blocks
```

**4. Complex Loop Structures**
```
Problem: Nested loops or complex iteration patterns
Solution:
- Convert to simple for-each or while loops
- Use parallel processing instead of nested iteration
- Implement custom loop handlers
```

#### Resolution Scripts

```typescript
// scripts/fix-conversion-issues.ts
export async function fixCommonConversionIssues(workflowId: string) {
  const fixer = new WorkflowConversionFixer()

  // Attempt automatic fixes
  const fixes = await fixer.analyzeAndFix(workflowId, {
    simplifyConditions: true,
    flattenNesting: true,
    replaceUnsupportedBlocks: true,
    optimizeComplexity: true
  })

  console.log(`Applied ${fixes.length} fixes:`)
  fixes.forEach(fix => {
    console.log(`- ${fix.type}: ${fix.description}`)
  })

  return fixes
}
```

### Issue: "Tool mapping failed during conversion"

#### Symptoms
- Conversion starts but fails mid-process
- Error: "No adapter found for tool type 'custom_block_x'"
- Partial journey definition created

#### Diagnosis and Resolution

```typescript
// diagnose-tool-mapping.ts
export async function diagnoseToolMapping(workflowId: string) {
  const workflow = await getWorkflow(workflowId)
  const toolRegistry = await getToolRegistry()

  const unmappedTools = []

  for (const block of workflow.blocks) {
    const mapping = toolRegistry.findMapping(block.type)
    if (!mapping) {
      unmappedTools.push({
        blockId: block.id,
        blockType: block.type,
        blockName: block.name
      })
    }
  }

  if (unmappedTools.length > 0) {
    console.log('Unmapped tools found:')
    unmappedTools.forEach(tool => {
      console.log(`- ${tool.blockType} (${tool.blockName})`)
    })

    console.log('\nSolutions:')
    console.log('1. Implement custom adapters')
    console.log('2. Use generic tool adapter')
    console.log('3. Replace with supported tool')
  }

  return unmappedTools
}
```

---

## Execution Problems

### Issue: "Journey execution hangs at specific state"

#### Symptoms
- Journey starts but stops progressing
- State remains "in_progress" indefinitely
- No error messages in logs

#### Diagnosis Steps

```typescript
// diagnose-execution-hang.ts
export async function diagnoseExecutionHang(executionId: string) {
  const execution = await getJourneyExecution(executionId)
  const currentState = await getStateDefinition(execution.currentState)

  console.log('Execution Diagnosis:')
  console.log(`- Current State: ${execution.currentState}`)
  console.log(`- State Type: ${currentState.type}`)
  console.log(`- Duration in State: ${Date.now() - execution.stateEntryTime}ms`)

  // Check for common hang causes
  if (currentState.type === 'tool_execution') {
    const toolStatus = await checkToolExecution(currentState.toolId, execution.context)
    console.log(`- Tool Status: ${toolStatus.status}`)
    console.log(`- Tool Response Time: ${toolStatus.responseTime}ms`)
  }

  if (currentState.type === 'input_collection') {
    const pendingInputs = await getPendingInputs(execution.id)
    console.log(`- Pending Inputs: ${pendingInputs.length}`)
    pendingInputs.forEach(input => {
      console.log(`  - ${input.name}: ${input.status}`)
    })
  }

  // Check for timeouts
  if (currentState.timeoutSeconds) {
    const timeInState = (Date.now() - execution.stateEntryTime) / 1000
    if (timeInState > currentState.timeoutSeconds) {
      console.log(`- TIMEOUT: State exceeded ${currentState.timeoutSeconds}s limit`)
    }
  }
}
```

#### Common Causes and Solutions

**1. Tool Execution Timeout**
```bash
# Check tool execution logs
tail -f logs/tool-execution.log | grep "execution_id:${EXECUTION_ID}"

# Manually test the tool
curl -X POST "http://localhost:8000/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "problematic_tool_id",
    "parameters": {...}
  }'
```

**2. Missing User Input**
```sql
-- Check for pending inputs
SELECT * FROM journey_executions
WHERE id = 'execution_id'
AND status = 'waiting_for_input';

-- Check conversation state
SELECT * FROM conversation_sessions
WHERE execution_id = 'execution_id'
ORDER BY created_at DESC LIMIT 10;
```

**3. Database Connection Issues**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check for long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

#### Recovery Commands

```typescript
// scripts/recover-execution.ts
export async function recoverHangingExecution(executionId: string) {
  const execution = await getJourneyExecution(executionId)

  // Attempt automatic recovery
  if (execution.status === 'in_progress') {
    // Check if state should have timed out
    const currentState = await getStateDefinition(execution.currentState)
    const timeInState = (Date.now() - execution.stateEntryTime) / 1000

    if (currentState.timeoutSeconds && timeInState > currentState.timeoutSeconds) {
      console.log('Triggering timeout transition...')
      await triggerStateTimeout(executionId)
      return 'timeout_recovery'
    }

    // Check for stuck tool executions
    if (currentState.type === 'tool_execution') {
      console.log('Checking tool execution status...')
      const toolStatus = await checkToolExecution(currentState.toolId, execution.context)

      if (toolStatus.status === 'failed') {
        console.log('Tool failed, triggering error transition...')
        await triggerErrorTransition(executionId, toolStatus.error)
        return 'tool_error_recovery'
      }

      if (toolStatus.status === 'stuck') {
        console.log('Restarting tool execution...')
        await restartToolExecution(executionId, currentState.toolId)
        return 'tool_restart_recovery'
      }
    }
  }

  return 'no_recovery_needed'
}
```

### Issue: "Journey execution fails with tool errors"

#### Symptoms
- Journey starts but fails at tool execution states
- Error: "Tool execution failed: [specific tool error]"
- Journey status becomes "failed"

#### Diagnosis and Resolution

```typescript
// diagnose-tool-errors.ts
export async function diagnoseToolErrors(executionId: string) {
  const execution = await getJourneyExecution(executionId)
  const errorHistory = await getExecutionErrorHistory(executionId)

  console.log('Tool Error Analysis:')
  errorHistory.forEach(error => {
    console.log(`\nError at ${error.timestamp}:`)
    console.log(`- State: ${error.stateId}`)
    console.log(`- Tool: ${error.toolId}`)
    console.log(`- Error: ${error.message}`)
    console.log(`- Parameters: ${JSON.stringify(error.parameters, null, 2)}`)

    // Analyze error type
    if (error.message.includes('timeout')) {
      console.log('  → Likely cause: Tool timeout')
      console.log('  → Solution: Increase timeout or optimize tool')
    } else if (error.message.includes('authentication')) {
      console.log('  → Likely cause: Authentication failure')
      console.log('  → Solution: Check credentials and permissions')
    } else if (error.message.includes('validation')) {
      console.log('  → Likely cause: Invalid parameters')
      console.log('  → Solution: Check parameter mapping and validation rules')
    }
  })
}
```

---

## Performance Issues

### Issue: "Slow workflow to journey conversion"

#### Symptoms
- Conversion takes >30 seconds
- High CPU usage during conversion
- Memory usage increases significantly

#### Performance Diagnostics

```typescript
// diagnose-performance.ts
import { performance } from 'perf_hooks'

export async function diagnoseConversionPerformance(workflowId: string) {
  const startTime = performance.now()
  const startMemory = process.memoryUsage()

  // Monitor conversion steps
  const stepTimes = {}

  console.log('Starting performance diagnosis...')

  // Analysis phase
  const analysisStart = performance.now()
  const analysis = await analyzeWorkflow(workflowId)
  stepTimes.analysis = performance.now() - analysisStart

  // Mapping phase
  const mappingStart = performance.now()
  const journey = await mapToJourney(analysis)
  stepTimes.mapping = performance.now() - mappingStart

  // Validation phase
  const validationStart = performance.now()
  const validation = await validateJourney(journey)
  stepTimes.validation = performance.now() - validationStart

  const totalTime = performance.now() - startTime
  const endMemory = process.memoryUsage()

  console.log('Performance Report:')
  console.log(`- Total Time: ${totalTime.toFixed(2)}ms`)
  console.log(`- Analysis: ${stepTimes.analysis.toFixed(2)}ms`)
  console.log(`- Mapping: ${stepTimes.mapping.toFixed(2)}ms`)
  console.log(`- Validation: ${stepTimes.validation.toFixed(2)}ms`)
  console.log(`- Memory Delta: ${(endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`)

  // Identify bottlenecks
  const slowestStep = Object.entries(stepTimes)
    .sort(([,a], [,b]) => b - a)[0]

  console.log(`\nBottleneck: ${slowestStep[0]} (${slowestStep[1].toFixed(2)}ms)`)

  // Recommendations
  if (totalTime > 10000) {
    console.log('\nRecommendations:')
    console.log('- Enable caching for workflow analysis')
    console.log('- Use batch processing for large workflows')
    console.log('- Consider workflow complexity reduction')
  }
}
```

#### Performance Solutions

**1. Enable Caching**
```typescript
// config/performance.config.ts
export const PerformanceConfig = {
  caching: {
    enabled: true,
    strategy: 'redis',
    ttl: {
      workflowAnalysis: 3600, // 1 hour
      journeyMapping: 7200,   // 2 hours
      toolMappings: 86400     // 24 hours
    }
  },
  optimization: {
    enableParallelProcessing: true,
    maxConcurrentOperations: 5,
    enableCompression: true,
    enableMinification: false
  }
}
```

**2. Database Query Optimization**
```sql
-- Add indexes for frequently queried fields
CREATE INDEX CONCURRENTLY idx_workflows_workspace_id
ON workflows(workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_journey_executions_status
ON journey_executions(status, created_at);

CREATE INDEX CONCURRENTLY idx_tool_executions_journey_execution_id
ON tool_executions(journey_execution_id, created_at);
```

**3. Memory Usage Optimization**
```typescript
// utils/memory-optimizer.ts
export class MemoryOptimizer {
  static async optimizeWorkflowProcessing(workflowId: string) {
    // Use streaming for large workflows
    const workflowStream = await getWorkflowStream(workflowId)

    // Process in chunks to avoid memory overload
    const chunkSize = 10
    const blocks = []

    for await (const blockChunk of workflowStream.chunk(chunkSize)) {
      const processedChunk = await processBlockChunk(blockChunk)
      blocks.push(...processedChunk)

      // Force garbage collection after each chunk
      if (global.gc) {
        global.gc()
      }
    }

    return blocks
  }

  static monitorMemoryUsage(operation: string): MemoryMonitor {
    return {
      start: () => {
        const startMemory = process.memoryUsage()
        console.log(`[${operation}] Starting memory: ${startMemory.heapUsed / 1024 / 1024}MB`)
        return startMemory
      },
      end: (startMemory: NodeJS.MemoryUsage) => {
        const endMemory = process.memoryUsage()
        const delta = endMemory.heapUsed - startMemory.heapUsed
        console.log(`[${operation}] Memory delta: ${delta / 1024 / 1024}MB`)
        return delta
      }
    }
  }
}
```

### Issue: "High memory usage during journey execution"

#### Diagnosis Script

```typescript
// scripts/memory-leak-detector.ts
export async function detectMemoryLeaks(executionId: string) {
  const initialMemory = process.memoryUsage()
  const execution = await getJourneyExecution(executionId)

  // Monitor memory usage during execution
  const memoryLog = []
  const interval = setInterval(() => {
    const currentMemory = process.memoryUsage()
    memoryLog.push({
      timestamp: new Date(),
      heapUsed: currentMemory.heapUsed,
      external: currentMemory.external,
      state: execution.currentState
    })

    // Check for memory growth
    const growthRate = memoryLog.length > 1
      ? (currentMemory.heapUsed - memoryLog[memoryLog.length - 2].heapUsed) / 1024 / 1024
      : 0

    if (growthRate > 10) { // 10MB growth per interval
      console.warn(`High memory growth detected: ${growthRate}MB`)
    }
  }, 5000)

  // Stop monitoring when execution completes
  execution.on('completed', () => {
    clearInterval(interval)

    const finalMemory = process.memoryUsage()
    console.log('Memory Leak Analysis:')
    console.log(`- Initial: ${initialMemory.heapUsed / 1024 / 1024}MB`)
    console.log(`- Final: ${finalMemory.heapUsed / 1024 / 1024}MB`)
    console.log(`- Growth: ${(finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024}MB`)

    // Analyze memory log for patterns
    const peakMemory = Math.max(...memoryLog.map(m => m.heapUsed))
    const avgMemory = memoryLog.reduce((sum, m) => sum + m.heapUsed, 0) / memoryLog.length

    console.log(`- Peak: ${peakMemory / 1024 / 1024}MB`)
    console.log(`- Average: ${avgMemory / 1024 / 1024}MB`)
  })
}
```

---

## Integration Problems

### Issue: "Parlant server connection failures"

#### Symptoms
- Connection refused errors
- Timeout errors when calling Parlant endpoints
- Intermittent connection drops

#### Diagnostics

```bash
# Test Parlant server connectivity
curl -v http://localhost:8000/health

# Check if Parlant server is running
ps aux | grep parlant

# Check Parlant server logs
tail -f logs/parlant-server.log

# Test network connectivity
netstat -tlnp | grep 8000
```

#### Solutions

**1. Service Recovery Script**
```bash
#!/bin/bash
# scripts/recover-parlant.sh

echo "Checking Parlant server status..."

# Check if server is running
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "Parlant server not responding, attempting restart..."

    # Kill existing process
    pkill -f "parlant.server" || true

    # Wait for cleanup
    sleep 5

    # Start new instance
    cd packages/parlant-server
    source venv/bin/activate
    python -m parlant.server --host 0.0.0.0 --port 8000 &

    # Wait for startup
    sleep 10

    # Verify restart
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "Parlant server restarted successfully"
    else
        echo "Failed to restart Parlant server"
        exit 1
    fi
else
    echo "Parlant server is healthy"
fi
```

**2. Connection Pool Configuration**
```typescript
// config/parlant-client.config.ts
export const ParlantClientConfig = {
  connection: {
    baseUrl: process.env.PARLANT_SERVER_URL || 'http://localhost:8000',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    keepAlive: true,
    maxSockets: 10
  },
  healthCheck: {
    enabled: true,
    interval: 30000,
    retryOnFailure: true,
    maxFailures: 5
  }
}

export class ResilientParlantClient {
  private client: AxiosInstance
  private healthCheckInterval: NodeJS.Timeout

  constructor(config: ParlantClientConfig) {
    this.client = axios.create({
      baseURL: config.connection.baseUrl,
      timeout: config.connection.timeout,
      httpAgent: new http.Agent({
        keepAlive: config.connection.keepAlive,
        maxSockets: config.connection.maxSockets
      })
    })

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error

        if (config.retries > 0 && this.shouldRetry(error)) {
          config.retries--
          await this.delay(config.retryDelay)
          return this.client.request(config)
        }

        throw error
      }
    )

    // Start health checking
    if (config.healthCheck.enabled) {
      this.startHealthCheck(config.healthCheck)
    }
  }
}
```

### Issue: "Socket.io connection problems"

#### Symptoms
- Real-time updates not working
- WebSocket connection drops
- Journey progress not updating in UI

#### Diagnostics and Solutions

```typescript
// utils/socket-diagnostics.ts
export async function diagnoseSocketConnection(executionId: string) {
  const io = require('socket.io-client')
  const socket = io('http://localhost:3001')

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)

    // Join execution room
    socket.emit('join-execution', executionId)

    // Test ping
    const pingStart = Date.now()
    socket.emit('ping', (response) => {
      const latency = Date.now() - pingStart
      console.log(`Socket latency: ${latency}ms`)
    })
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  socket.on('execution-progress', (data) => {
    console.log('Progress update received:', data)
  })

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message)
  })

  // Test for 30 seconds
  setTimeout(() => {
    socket.disconnect()
    console.log('Socket diagnostic completed')
  }, 30000)
}
```

---

## Tool Adapter Issues

### Issue: "Custom tool adapter not working"

#### Symptoms
- Tool execution returns "Adapter not found"
- Custom tools not appearing in journey
- Tool registration failing

#### Debugging Tool Adapters

```typescript
// debug/tool-adapter-debugger.ts
export class ToolAdapterDebugger {
  static async debugAdapter(adapterId: string) {
    console.log(`Debugging adapter: ${adapterId}`)

    // Check if adapter is registered
    const registry = getToolRegistry()
    const adapter = registry.getAdapter(adapterId)

    if (!adapter) {
      console.error('Adapter not found in registry')
      console.log('Available adapters:')
      registry.listAdapters().forEach(a => console.log(`- ${a.id}`))
      return
    }

    console.log('Adapter found:', adapter.metadata)

    // Test adapter initialization
    try {
      await adapter.initialize()
      console.log('Adapter initialized successfully')
    } catch (error) {
      console.error('Adapter initialization failed:', error.message)
      return
    }

    // Test with sample parameters
    try {
      const sampleParams = adapter.getSampleParameters()
      console.log('Testing with sample parameters:', sampleParams)

      const result = await adapter.execute(sampleParams)
      console.log('Adapter execution successful:', result)
    } catch (error) {
      console.error('Adapter execution failed:', error.message)
      console.log('Stack trace:', error.stack)
    }
  }

  static async validateAdapterConfiguration(adapterId: string, config: any) {
    const adapter = getToolRegistry().getAdapter(adapterId)

    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`)
    }

    const validation = await adapter.validateConfiguration(config)

    console.log('Configuration Validation:')
    console.log(`- Valid: ${validation.valid}`)

    if (!validation.valid) {
      console.log('Errors:')
      validation.errors.forEach(error => console.log(`  - ${error}`))
    }

    if (validation.warnings.length > 0) {
      console.log('Warnings:')
      validation.warnings.forEach(warning => console.log(`  - ${warning}`))
    }

    return validation
  }
}
```

#### Tool Adapter Registration Fix

```typescript
// scripts/fix-adapter-registration.ts
export async function fixAdapterRegistration() {
  const registry = getToolRegistry()

  // Re-register all adapters
  const adapterFiles = glob.sync('src/adapters/**/*.adapter.ts')

  for (const file of adapterFiles) {
    try {
      const adapterModule = await import(file)
      const AdapterClass = adapterModule.default || adapterModule[Object.keys(adapterModule)[0]]

      if (AdapterClass) {
        const adapter = new AdapterClass()
        await registry.register(adapter)
        console.log(`Registered adapter: ${adapter.id}`)
      }
    } catch (error) {
      console.error(`Failed to register adapter from ${file}:`, error.message)
    }
  }

  // Verify registration
  const registered = registry.listAdapters()
  console.log(`Total adapters registered: ${registered.length}`)

  return registered
}
```

---

## Database and Migration Issues

### Issue: "Database migration failures"

#### Symptoms
- Migration commands fail
- Database schema inconsistencies
- Foreign key constraint errors

#### Migration Diagnostics

```bash
# Check current migration status
npm run db:migrate:status

# Check for schema differences
npm run db:introspect

# Validate schema integrity
npm run db:validate
```

#### Migration Recovery Scripts

```sql
-- scripts/fix-migrations.sql

-- Check for orphaned records
SELECT 'journey_executions' as table_name, COUNT(*) as orphaned_count
FROM journey_executions je
LEFT JOIN journeys j ON je.journey_id = j.id
WHERE j.id IS NULL;

-- Fix foreign key constraints
UPDATE journey_executions
SET journey_id = NULL
WHERE journey_id NOT IN (SELECT id FROM journeys);

-- Clean up invalid data
DELETE FROM journey_state_transitions
WHERE execution_id NOT IN (SELECT id FROM journey_executions);

-- Rebuild indexes
REINDEX TABLE journey_executions;
REINDEX TABLE journeys;
```

#### Migration Verification

```typescript
// scripts/verify-database-integrity.ts
export async function verifyDatabaseIntegrity() {
  const issues = []

  // Check foreign key constraints
  const orphanedExecutions = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM journey_executions je
    LEFT JOIN journeys j ON je.journey_id = j.id
    WHERE j.id IS NULL
  `)

  if (orphanedExecutions[0].count > 0) {
    issues.push(`${orphanedExecutions[0].count} orphaned journey executions found`)
  }

  // Check data consistency
  const inconsistentStates = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM journey_state_transitions jst
    LEFT JOIN journey_executions je ON jst.execution_id = je.id
    WHERE je.id IS NULL
  `)

  if (inconsistentStates[0].count > 0) {
    issues.push(`${inconsistentStates[0].count} orphaned state transitions found`)
  }

  // Check table health
  const tableStats = await db.execute(sql`
    SELECT
      schemaname,
      tablename,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes,
      n_dead_tup as dead_tuples
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_dead_tup DESC;
  `)

  tableStats.forEach(stat => {
    if (stat.dead_tuples > 1000) {
      issues.push(`Table ${stat.tablename} has ${stat.dead_tuples} dead tuples - consider VACUUM`)
    }
  })

  if (issues.length === 0) {
    console.log('Database integrity check passed')
  } else {
    console.log('Database integrity issues found:')
    issues.forEach(issue => console.log(`- ${issue}`))
  }

  return issues
}
```

---

## Debugging Tools and Utilities

### Comprehensive Debug Dashboard

```typescript
// tools/debug-dashboard.ts
export class WorkflowJourneyDebugDashboard {
  async generateDebugReport(executionId?: string, workflowId?: string) {
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth: await this.checkSystemHealth(),
      databaseStatus: await this.checkDatabaseStatus(),
      serviceConnections: await this.checkServiceConnections()
    }

    if (workflowId) {
      report.workflowAnalysis = await this.analyzeWorkflow(workflowId)
    }

    if (executionId) {
      report.executionDetails = await this.analyzeExecution(executionId)
    }

    // Save report
    const reportPath = `debug-reports/report-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    console.log(`Debug report saved: ${reportPath}`)
    return report
  }

  private async checkSystemHealth() {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV
    }
  }

  private async checkDatabaseStatus() {
    try {
      const result = await db.execute(sql`SELECT NOW() as timestamp`)
      return {
        connected: true,
        timestamp: result[0].timestamp,
        latency: 'healthy'
      }
    } catch (error) {
      return {
        connected: false,
        error: error.message
      }
    }
  }

  private async checkServiceConnections() {
    const services = [
      { name: 'Parlant Server', url: 'http://localhost:8000/health' },
      { name: 'Socket.io Server', url: 'http://localhost:3001/health' }
    ]

    const results = await Promise.all(
      services.map(async service => {
        try {
          const response = await fetch(service.url)
          return {
            name: service.name,
            status: response.ok ? 'healthy' : 'unhealthy',
            statusCode: response.status
          }
        } catch (error) {
          return {
            name: service.name,
            status: 'unreachable',
            error: error.message
          }
        }
      })
    )

    return results
  }
}
```

### Log Analysis Tool

```typescript
// tools/log-analyzer.ts
export class LogAnalyzer {
  async analyzeLogs(timeRange: { start: Date; end: Date }, filters?: LogFilters) {
    const logFiles = [
      'logs/application.log',
      'logs/workflow-conversion.log',
      'logs/journey-execution.log',
      'logs/tool-execution.log'
    ]

    const analysis = {
      errorCount: 0,
      warningCount: 0,
      errorPatterns: new Map(),
      performanceMetrics: [],
      executionFlow: []
    }

    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        const logs = await this.parseLogFile(logFile, timeRange, filters)

        logs.forEach(log => {
          if (log.level === 'error') {
            analysis.errorCount++
            const pattern = this.extractErrorPattern(log.message)
            analysis.errorPatterns.set(
              pattern,
              (analysis.errorPatterns.get(pattern) || 0) + 1
            )
          } else if (log.level === 'warn') {
            analysis.warningCount++
          }

          if (log.duration) {
            analysis.performanceMetrics.push({
              operation: log.operation,
              duration: log.duration,
              timestamp: log.timestamp
            })
          }

          if (log.executionId) {
            analysis.executionFlow.push({
              executionId: log.executionId,
              state: log.state,
              timestamp: log.timestamp,
              message: log.message
            })
          }
        })
      }
    }

    return analysis
  }

  private async parseLogFile(
    filePath: string,
    timeRange: { start: Date; end: Date },
    filters?: LogFilters
  ) {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    return lines
      .map(line => this.parseLogLine(line))
      .filter(log => log && this.isInTimeRange(log.timestamp, timeRange))
      .filter(log => !filters || this.matchesFilters(log, filters))
  }

  generateReport(analysis: LogAnalysis): string {
    const report = []

    report.push(`=== Log Analysis Report ===`)
    report.push(`Total Errors: ${analysis.errorCount}`)
    report.push(`Total Warnings: ${analysis.warningCount}`)

    if (analysis.errorPatterns.size > 0) {
      report.push(`\nTop Error Patterns:`)
      const sortedPatterns = Array.from(analysis.errorPatterns.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)

      sortedPatterns.forEach(([pattern, count]) => {
        report.push(`- ${pattern}: ${count} occurrences`)
      })
    }

    if (analysis.performanceMetrics.length > 0) {
      const avgDuration = analysis.performanceMetrics
        .reduce((sum, m) => sum + m.duration, 0) / analysis.performanceMetrics.length

      const slowOperations = analysis.performanceMetrics
        .filter(m => m.duration > avgDuration * 2)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)

      report.push(`\nSlow Operations (>${(avgDuration * 2).toFixed(0)}ms):`)
      slowOperations.forEach(op => {
        report.push(`- ${op.operation}: ${op.duration}ms at ${op.timestamp}`)
      })
    }

    return report.join('\n')
  }
}
```

### Quick Fix Scripts

```bash
#!/bin/bash
# scripts/quick-fix.sh

echo "Workflow to Journey Mapping - Quick Fix Script"
echo "=============================================="

# Function to run a fix with error handling
run_fix() {
    echo -n "Running: $1... "
    if $2; then
        echo "✓ Success"
    else
        echo "✗ Failed"
        echo "  Error: $2 failed to execute"
    fi
}

# System checks
echo "1. System Health Checks"
run_fix "Database connectivity" "npm run db:ping"
run_fix "Parlant server health" "curl -f http://localhost:8000/health > /dev/null 2>&1"
run_fix "Socket.io server health" "curl -f http://localhost:3001/health > /dev/null 2>&1"

# Quick fixes
echo -e "\n2. Quick Fixes"
run_fix "Clear conversion cache" "redis-cli FLUSHDB"
run_fix "Restart stuck executions" "node scripts/restart-stuck-executions.js"
run_fix "Clean orphaned records" "node scripts/clean-orphaned-records.js"
run_fix "Update tool adapters" "node scripts/refresh-tool-adapters.js"

# Performance optimizations
echo -e "\n3. Performance Optimizations"
run_fix "VACUUM database" "psql \$DATABASE_URL -c 'VACUUM ANALYZE;'"
run_fix "Clear old logs" "find logs/ -name '*.log' -mtime +7 -delete"
run_fix "Restart memory-heavy processes" "pm2 restart workflow-mapper"

echo -e "\nQuick fix completed!"
```

This troubleshooting guide provides comprehensive diagnostics and solutions for common issues encountered in the Workflow to Journey Mapping system. Each section includes both diagnostic tools and practical solutions to help developers quickly identify and resolve problems.