# Nexus Tools - Advanced Workflow Execution and Management

## Overview

The Nexus tools provide enterprise-grade workflow execution and monitoring capabilities for the Sim workflow automation platform. These tools enable comprehensive workflow orchestration with real-time monitoring, performance analytics, and error handling.

## Features

### Workflow Execution (`nexus_execute_workflow`)
- **Synchronous execution**: Wait for workflow completion with immediate results
- **Asynchronous execution**: Start workflows and poll for completion
- **Debug mode**: Detailed logging and trace collection
- **Parameter injection**: Dynamic input parameter passing
- **Error handling**: Comprehensive error tracking and reporting
- **Performance monitoring**: Execution timing and cost tracking
- **Priority levels**: Execution prioritization (low, normal, high, urgent)
- **Timeout management**: Configurable execution timeouts

### Workflow Monitoring (`nexus_monitor_workflows`)
- **Execution tracking**: Real-time status monitoring
- **Performance analytics**: Detailed metrics and trends
- **Error analysis**: Pattern detection and recommendations
- **Historical data**: Comprehensive execution history
- **Cost tracking**: Resource utilization monitoring
- **Log analysis**: Detailed execution logs and traces
- **Real-time status**: Live execution monitoring

## Usage Examples

### Execute Workflow Synchronously

```typescript
import { executeWorkflow } from '@/tools/nexus'

const result = await executeWorkflow.execute({
  workflowId: 'workflow-123',
  executionMode: 'sync',
  inputs: {
    userEmail: 'test@example.com',
    processType: 'automation'
  },
  priority: 'high',
  timeout: 300,
  enableDebug: true
})

console.log('Execution result:', result)
```

### Execute Workflow Asynchronously

```typescript
const result = await executeWorkflow.execute({
  workflowId: 'workflow-123',
  executionMode: 'async',
  inputs: { data: 'example' },
  triggerSource: 'api'
})

// Poll for completion using the returned status URL
const { polling } = result.output
console.log(`Poll status at: ${polling.statusUrl}`)
```

### Monitor Workflow Executions

```typescript
import { monitorWorkflows } from '@/tools/nexus'

// Get execution metrics
const metrics = await monitorWorkflows.execute({
  action: 'getMetrics',
  workflowId: 'workflow-123',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z'
})

console.log('Success rate:', metrics.output.metrics.successRate)
console.log('Average execution time:', metrics.output.metrics.averageExecutionTime)

// List recent executions
const executions = await monitorWorkflows.execute({
  action: 'listExecutions',
  workflowId: 'workflow-123',
  status: 'completed',
  limit: 10
})

console.log('Recent executions:', executions.output.executions)
```

### Get Execution Details

```typescript
// Get detailed execution information
const details = await monitorWorkflows.execute({
  action: 'getExecution',
  executionId: 'exec-456',
  includeTraceSpans: true
})

console.log('Execution details:', details.output.execution)
```

### Error Analysis

```typescript
// Analyze workflow errors
const analysis = await monitorWorkflows.execute({
  action: 'getErrorAnalysis',
  workflowId: 'workflow-123',
  startDate: '2024-01-01T00:00:00Z'
})

console.log('Top errors:', analysis.output.analysis.topErrors)
console.log('Recommendations:', analysis.output.analysis.recommendations)
```

## API Reference

### Execute Workflow Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `workflowId` | string | - | **Required.** ID of the workflow to execute |
| `executionMode` | 'async' \| 'sync' \| 'debug' | 'async' | Execution mode |
| `inputs` | Record<string, any> | {} | Input parameters for the workflow |
| `triggerSource` | 'manual' \| 'api' \| 'schedule' \| 'webhook' \| 'nexus' | 'nexus' | Source of the execution trigger |
| `priority` | 'low' \| 'normal' \| 'high' \| 'urgent' | 'normal' | Execution priority |
| `timeout` | number | 300 | Execution timeout in seconds (1-3600) |
| `enableDebug` | boolean | false | Enable detailed debug logging |

### Monitor Workflows Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | - | **Required.** Monitoring action to perform |
| `workflowId` | string | - | Specific workflow ID (required for some actions) |
| `executionId` | string | - | Specific execution ID (required for some actions) |
| `status` | 'running' \| 'completed' \| 'failed' \| 'cancelled' | - | Filter by execution status |
| `trigger` | 'manual' \| 'api' \| 'schedule' \| 'webhook' \| 'nexus' | - | Filter by trigger source |
| `limit` | number | 20 | Maximum number of results (1-100) |
| `offset` | number | 0 | Pagination offset |
| `startDate` | string | - | Start date for analytics (ISO format) |
| `endDate` | string | - | End date for analytics (ISO format) |
| `includeTraceSpans` | boolean | false | Include detailed trace spans |
| `includeErrorDetails` | boolean | false | Include error details and stack traces |

### Available Monitoring Actions

- `getExecution`: Get detailed information about a specific execution
- `listExecutions`: List executions with filtering and pagination
- `getMetrics`: Get comprehensive metrics for a workflow
- `getLogs`: Get detailed logs for a specific execution
- `getPerformanceAnalytics`: Get performance analytics (coming soon)
- `getExecutionDetail`: Get detailed execution information with traces
- `getRealtimeStatus`: Get real-time status of running executions
- `getErrorAnalysis`: Get error analysis and failure patterns

## Response Format

All tools return a consistent response format:

```typescript
{
  status: 'success' | 'error',
  output: {
    // Tool-specific response data
  }
}
```

### Error Handling

Errors are returned in the response with detailed information:

```typescript
{
  status: 'error',
  output: {
    message: 'Error description',
    error: 'Detailed error message',
    operationId: 'unique-operation-id'
  }
}
```

## Architecture

### Database Integration

The Nexus tools integrate with the existing Sim database schema:

- **workflowExecutionLogs**: Main execution tracking table
- **workflowExecutionSnapshots**: Workflow state snapshots
- **workflow**: Workflow definitions and metadata
- **workflowBlocks**: Individual workflow components
- **workflowEdges**: Workflow connections and data flow

### Security

- **Authentication**: All operations require valid user authentication
- **Authorization**: Users can only access their own workflows
- **Workspace isolation**: Multi-tenant workspace support
- **Audit logging**: Comprehensive operation logging

### Performance

- **Optimized queries**: Strategic database indexing
- **Pagination**: Efficient large dataset handling
- **Caching**: Snapshot-based state caching
- **Concurrent execution**: Parallel workflow processing
- **Resource monitoring**: Execution resource tracking

## Development

### Testing

```bash
# Run tests for Nexus tools
cd apps/sim
bun test tools/nexus/

# Run linting
bunx biome check --write tools/nexus/
```

### Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive logging for all operations
3. Include proper error handling and validation
4. Update types and interfaces as needed
5. Add tests for new functionality

## Troubleshooting

### Common Issues

1. **Authentication errors**: Ensure valid user session
2. **Workflow not found**: Verify workflow ID and permissions
3. **Execution timeout**: Increase timeout or optimize workflow
4. **Database connection**: Check database connectivity
5. **Permission denied**: Verify workspace access

### Debug Mode

Enable debug mode for detailed execution information:

```typescript
await executeWorkflow.execute({
  workflowId: 'workflow-123',
  executionMode: 'debug',
  enableDebug: true
})
```

## Version History

- **v1.0.0**: Initial implementation with core execution and monitoring features

---

For more information, see the [Sim Platform Documentation](../../README.md).