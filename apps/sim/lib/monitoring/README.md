# Sim Workflow Monitoring System

## Overview

This comprehensive monitoring and analytics platform provides real-time visibility into Sim workflow executions, enabling proactive issue detection, performance optimization, and business insights.

## Architecture

The monitoring system is built as a modular platform with the following core components:

### 🔄 Real-time Monitoring
- **ExecutionMonitor**: Tracks live workflow executions with real-time status updates
- **PerformanceCollector**: Collects and analyzes execution performance metrics
- **WebSocketHandler**: Provides real-time updates through WebSocket connections

### 🚨 Alerting System
- **AlertEngine**: Evaluates alert rules and manages alert lifecycle
- **NotificationService**: Sends alerts through multiple channels (email, Slack, webhook, SMS)
- **EscalationManager**: Handles alert escalation policies and automatic escalation

### 📊 Analytics & Reporting
- **AnalyticsService**: Generates workflow analytics, trend analysis, and business metrics
- **Dashboard Components**: Real-time visualizations and monitoring dashboards

### 🐛 Debugging Tools
- **DebugService**: Provides step-by-step execution analysis and replay capabilities
- **Variable Inspection**: Allows inspection of workflow state at any execution point
- **Execution Replay**: Enables workflow re-execution with modifications for debugging

## Features

### 1. Real-time Execution Monitoring
- Live execution status tracking with progress indicators
- Current block execution monitoring
- Resource usage tracking (CPU, memory, network)
- Performance bottleneck identification

```typescript
import { executionMonitor } from '@/lib/monitoring'

// Start monitoring an execution
await executionMonitor.startExecution({
  executionId: 'exec-123',
  workflowId: 'workflow-456',
  workflowName: 'Data Processing Pipeline',
  trigger: 'api',
  userId: 'user-789',
  workspaceId: 'workspace-abc'
})

// Update execution status
await executionMonitor.updateExecutionStatus('exec-123', {
  status: 'running',
  progress: 45,
  currentBlock: {
    blockId: 'block-1',
    blockName: 'HTTP Request',
    blockType: 'http',
    startedAt: new Date().toISOString()
  }
})
```

### 2. Performance Metrics Collection
- Execution time tracking per block and workflow
- Resource utilization monitoring
- Throughput and latency measurements
- Automatic bottleneck detection

```typescript
import { performanceCollector } from '@/lib/monitoring'

// Collect performance metrics
await performanceCollector.collectMetrics('exec-123', 'block-1', {
  executionId: 'exec-123',
  workflowId: 'workflow-456',
  blockId: 'block-1',
  metrics: {
    executionTime: 1500, // milliseconds
    resourceUsage: {
      cpu: 45.2, // percentage
      memory: 256000000, // bytes
      network: 1024 // bytes
    },
    throughput: 10.5, // operations per second
    errorRate: 0 // percentage
  },
  timestamp: new Date().toISOString()
})
```

### 3. Configurable Alerting
- Rule-based alert conditions (execution time, error rate, resource usage)
- Multiple notification channels with customizable templates
- Alert escalation policies with time-based escalation
- Alert correlation and suppression

```typescript
import { alertEngine } from '@/lib/monitoring'

// Create an alert rule
const rule = await alertEngine.createRule({
  name: 'High Execution Time Alert',
  description: 'Alert when workflow execution exceeds 30 seconds',
  workspaceId: 'workspace-abc',
  workflowIds: ['workflow-456'], // Optional: specific workflows
  enabled: true,
  conditions: [
    {
      id: 'cond-1',
      type: 'execution_duration',
      operator: 'gt',
      value: 30000, // 30 seconds
      timeWindow: '5m',
      aggregation: 'avg'
    }
  ],
  actions: [
    {
      id: 'action-1',
      type: 'email',
      configuration: {
        email: {
          to: ['team@company.com'],
          subject: 'High Execution Time Alert - {{workflowName}}'
        }
      },
      enabled: true
    }
  ],
  cooldownPeriod: 15 // minutes
})
```

### 4. Analytics & Business Intelligence
- Workflow success/failure rates with trend analysis
- Performance dashboards with customizable metrics
- Cost analysis and resource utilization reports
- Business metrics integration and KPI tracking

```typescript
import { analyticsService } from '@/lib/monitoring'

// Get workflow analytics
const analytics = await analyticsService.getWorkflowAnalytics('workflow-456', {
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-31T23:59:59Z',
  granularity: 'day'
})

console.log('Success Rate:', analytics.executionMetrics.successRate)
console.log('Average Execution Time:', analytics.executionMetrics.averageExecutionTime)
console.log('Total Cost:', analytics.costMetrics.totalCost)
```

### 5. Advanced Debugging
- Step-by-step execution analysis with detailed timeline
- Variable state inspection at any execution point
- Breakpoint support for execution pausing
- Workflow replay with modification capabilities

```typescript
import { debugService } from '@/lib/monitoring'

// Create debug session
const session = await debugService.createDebugSession('exec-123', 'user-789')

// Add breakpoint
await debugService.addBreakpoint(session.id, {
  blockId: 'block-2',
  blockName: 'Data Transform',
  condition: 'input.records.length > 1000', // Optional condition
  enabled: true
})

// Inspect variable
const inspection = await debugService.inspectVariable(session.id, 'block-2', 'outputData')

// Replay execution with modifications
const replay = await debugService.replayExecution({
  executionId: 'exec-123',
  debugMode: true,
  modifiedInputs: {
    'block-1': { timeout: 60000 } // Increase timeout for HTTP block
  }
})
```

## API Endpoints

### Real-time Executions
```
GET /api/monitoring/live-executions?workspaceId={id}&status={status}
POST /api/monitoring/live-executions (update execution status)
```

### Performance Metrics
```
GET /api/monitoring/performance-metrics?workflowIds={ids}&startDate={date}&endDate={date}
POST /api/monitoring/performance-metrics (submit metrics)
```

### Alert Rules
```
GET /api/monitoring/alerts/rules?workspaceId={id}
POST /api/monitoring/alerts/rules (create rule)
PUT /api/monitoring/alerts/rules/{ruleId} (update rule)
DELETE /api/monitoring/alerts/rules/{ruleId} (delete rule)
```

### Analytics
```
GET /api/monitoring/analytics/workflow/{workflowId}?timeRange={range}
GET /api/monitoring/analytics/business/{workspaceId}?timeRange={range}
POST /api/monitoring/analytics/reports (generate custom reports)
```

### Debugging
```
POST /api/monitoring/debug/sessions (create debug session)
GET /api/monitoring/debug/sessions/{sessionId}
POST /api/monitoring/debug/sessions/{sessionId}/breakpoints
POST /api/monitoring/debug/replay (replay execution)
```

## Database Schema

The monitoring system extends the existing database with the following tables:

- `alert_rules` - Configurable alert rules
- `alert_instances` - Triggered alert records
- `alert_notifications` - Notification delivery tracking
- `performance_metrics` - Performance data storage
- `monitoring_dashboards` - Custom dashboard configurations
- `debug_sessions` - Debug session data
- `execution_replays` - Replay execution records
- `monitoring_events` - System event audit trail
- `business_metrics_snapshots` - Periodic business metrics
- `workflow_analytics_cache` - Cached analytics data

## WebSocket Integration

Real-time updates are provided through WebSocket connections:

```typescript
// Client-side WebSocket subscription
const socket = io()

// Subscribe to workspace executions
socket.emit('monitoring_subscribe', {
  type: 'workspace',
  id: 'workspace-subscription',
  workspaceId: 'workspace-abc'
})

// Listen for updates
socket.on('monitoring_update', (update) => {
  if (update.type === 'execution_update') {
    updateExecutionStatus(update.data)
  }
})
```

## React Components

### WorkflowMonitoringPanel
A comprehensive monitoring panel that integrates into the workflow builder:

```tsx
import { WorkflowMonitoringPanel } from '@/components/monitoring/workflow-monitoring-panel'

<WorkflowMonitoringPanel
  workflowId="workflow-456"
  workspaceId="workspace-abc"
  isExecuting={isRunning}
  onStartDebugging={(executionId) => openDebugger(executionId)}
  onViewAnalytics={(workflowId) => openAnalytics(workflowId)}
/>
```

## Configuration

The monitoring system can be configured through the main MonitoringSystem class:

```typescript
import { MonitoringSystem } from '@/lib/monitoring'

const monitoring = MonitoringSystem.getInstance({
  enableRealTimeMonitoring: true,
  enablePerformanceCollection: true,
  enableAlerting: true,
  enableAnalytics: true,
  enableDebugging: true,
  performanceCollectionInterval: 10000, // 10 seconds
  alertEvaluationInterval: 30000, // 30 seconds
  metricsRetentionDays: 30
})

await monitoring.initialize()
```

## Integration with Workflow Executor

To integrate monitoring with the workflow executor, add monitoring hooks:

```typescript
// In your workflow executor
import { monitoringSystem } from '@/lib/monitoring'

class EnhancedExecutor extends Executor {
  async executeWorkflow(workflowId: string, input: any) {
    const executionId = generateExecutionId()
    
    // Start monitoring
    await monitoringSystem.startExecutionMonitoring({
      executionId,
      workflowId,
      workflowName: workflow.name,
      trigger: 'manual',
      userId: this.userId,
      workspaceId: this.workspaceId
    })

    try {
      const result = await super.executeWorkflow(workflowId, input)
      
      // Complete monitoring
      await monitoringSystem.completeExecution(executionId, true, result)
      
      return result
    } catch (error) {
      await monitoringSystem.completeExecution(executionId, false, { error })
      throw error
    }
  }

  async executeBlock(block: Block, context: ExecutionContext) {
    const startTime = performance.now()
    
    try {
      const result = await super.executeBlock(block, context)
      const endTime = performance.now()
      
      // Update monitoring with performance metrics
      await monitoringSystem.updateExecution(context.executionId, {
        progress: context.progress,
        currentBlock: {
          blockId: block.id,
          blockName: block.name,
          blockType: block.type,
          startedAt: new Date().toISOString()
        }
      }, {
        metrics: {
          executionTime: endTime - startTime,
          resourceUsage: {
            cpu: await getCpuUsage(),
            memory: process.memoryUsage().heapUsed,
            network: 0
          },
          errorRate: 0
        }
      })

      return result
    } catch (error) {
      // Report error metrics
      await monitoringSystem.updateExecution(context.executionId, {
        currentBlock: null
      }, {
        metrics: {
          executionTime: performance.now() - startTime,
          resourceUsage: {
            cpu: await getCpuUsage(),
            memory: process.memoryUsage().heapUsed,
            network: 0
          },
          errorRate: 100
        }
      })
      
      throw error
    }
  }
}
```

## Performance Considerations

### Caching
- Analytics calculations are cached for 5 minutes by default
- Metrics are aggregated in memory before database storage
- Dashboard data uses intelligent caching strategies

### Resource Management
- Automatic cleanup of old metrics and alerts
- Configurable data retention policies
- Memory-efficient event streaming

### Scalability
- Horizontal scaling support through Redis pub/sub (future enhancement)
- Database sharding support for high-volume metrics
- Efficient indexing for fast query performance

## Security

### Access Control
- Workspace-scoped permissions for all monitoring data
- User-specific debugging session isolation
- API endpoint authentication and authorization

### Data Privacy
- Sensitive data filtering in logs and metrics
- Configurable data retention and purging
- Audit trails for monitoring system access

## Monitoring the Monitor

The monitoring system includes self-monitoring capabilities:

```typescript
// Health check endpoint
const health = monitoringSystem.getSystemHealth()
console.log('System Status:', health.status)
console.log('Service Details:', health.services)

// Performance statistics
const stats = monitoringSystem.getMonitoringStats()
console.log('Execution Monitor:', stats.executionMonitor)
console.log('Performance Collector:', stats.performanceCollector)
```

## Future Enhancements

### Planned Features
1. **AI-Powered Anomaly Detection**: Machine learning models for automatic anomaly detection
2. **Predictive Analytics**: Forecast workflow performance and resource needs
3. **Advanced Visualization**: Interactive charts and real-time dashboards
4. **Integration Marketplace**: Third-party monitoring tool integrations
5. **Mobile Dashboard**: Native mobile app for monitoring on-the-go

### Roadmap
- **Phase 1** ✅: Core monitoring infrastructure (completed)
- **Phase 2** 🚧: Advanced analytics and business intelligence
- **Phase 3** 📋: AI-powered insights and predictions
- **Phase 4** 📋: Enterprise features and integrations

## Contributing

When extending the monitoring system:

1. **Follow TypeScript Standards**: Use strict typing and proper interfaces
2. **Add Comprehensive Logging**: Include structured logging with operation IDs
3. **Write Tests**: Add unit and integration tests for new features
4. **Document APIs**: Update API documentation for new endpoints
5. **Performance Testing**: Ensure new features don't impact system performance

## Support

For issues, questions, or feature requests related to the monitoring system:

1. Check the existing documentation and examples
2. Review error logs with operation IDs for debugging
3. Test monitoring components in isolation
4. Verify database schema updates are applied correctly
5. Check WebSocket connections and event subscriptions

---

**Built with ❤️ for Sim Workflows** - Providing enterprise-grade observability for workflow automation platforms.