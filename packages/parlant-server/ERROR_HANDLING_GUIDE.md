# Universal Tool Adapter Error Handling System

## Overview

The Universal Tool Adapter Error Handling System provides comprehensive error management, recovery, monitoring, and analytics for the Parlant integration. This system ensures reliable operation, user-friendly error messages, and proactive issue resolution.

## Architecture

### Core Components

1. **Error Taxonomy & Classification** (`error-taxonomy.ts`)
   - Hierarchical error categorization
   - Severity-based processing
   - Impact assessment
   - Recovery strategy determination

2. **Error Handler** (`error-handler.ts`)
   - Custom error classes with context
   - Severity-based processing
   - Automatic error tracking integration
   - User-friendly message generation

3. **Error Explanations** (`error-explanations.ts`)
   - Multi-skill-level explanations
   - Interactive troubleshooting
   - Step-by-step resolution guidance
   - Prevention tips

4. **Error Recovery** (`error-recovery.ts`)
   - Intelligent retry mechanisms
   - Circuit breaker patterns
   - Adaptive configuration
   - Fallback strategies

5. **Error Monitoring** (`error-monitoring.ts`)
   - Real-time metrics collection
   - Alert management
   - Dashboard generation
   - System health monitoring

6. **Error Analytics** (`error-analytics.ts`)
   - Trend analysis
   - Pattern recognition
   - Root cause analysis
   - Predictive insights

## Error Categories

### Primary Categories

- `TOOL_ADAPTER` - Issues with tool interface adaptation
- `TOOL_EXECUTION` - Problems during tool execution
- `TOOL_AUTHENTICATION` - Authentication and authorization errors
- `TOOL_VALIDATION` - Input/output validation failures
- `SYSTEM_RESOURCE` - System resource constraints
- `INTEGRATION_API` - API integration issues
- `USER_INPUT` - User input validation errors
- `EXTERNAL_SERVICE` - External service failures

### Severity Levels

- `TRACE` - Detailed debugging information
- `DEBUG` - Development debugging
- `INFO` - Informational messages
- `WARNING` - Potential issues (system continues)
- `ERROR` - Errors requiring attention
- `CRITICAL` - Immediate attention required
- `FATAL` - System-breaking errors

## Error Handling Patterns

### Basic Error Handling

```typescript
import {
  createToolExecutionError,
  handleError,
  ErrorCategory
} from './error-handler'

try {
  const result = await executeToolOperation()
  return result
} catch (originalError) {
  const toolError = createToolExecutionError(
    'Tool operation failed',
    'timeout',
    'my-tool',
    { operation: 'data-fetch', userId: 'user123' },
    originalError
  )

  const handled = await handleError(toolError)

  if (handled.recovered) {
    // Operation was recovered, return success
    return handled.recoveryResult
  } else {
    // Show user-friendly error message
    throw new Error(handled.userMessage)
  }
}
```

### With Retry and Recovery

```typescript
import { executeWithRecovery, RetryConfig } from './error-recovery'

const customRetryConfig: Partial<RetryConfig> = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  adaptiveAdjustment: true
}

const result = await executeWithRecovery(
  async () => {
    return await callExternalAPI()
  },
  {
    operationId: 'api-call-123',
    component: 'external-service-client',
    category: ErrorCategory.EXTERNAL_SERVICE,
    subcategory: 'api_error',
    toolName: 'external-api'
  },
  customRetryConfig
)
```

### With Performance Monitoring

```typescript
import { MonitorPerformance } from './error-monitoring'

class ToolService {
  @MonitorPerformance('tool-service', 'execute-operation')
  async executeOperation(params: any): Promise<any> {
    // Your tool operation logic here
    return await this.performOperation(params)
  }
}
```

### Using Decorators for Automatic Retry

```typescript
import { WithRetry } from './error-recovery'

class DataProcessor {
  @WithRetry('data-processor', ErrorCategory.TOOL_EXECUTION, 'timeout')
  async processLargeDataset(data: any[]): Promise<any> {
    // Processing logic that might timeout
    return await this.performProcessing(data)
  }
}
```

## Error Explanation System

### Multi-Level User Messages

The error explanation system provides different message levels based on user skill:

- **Beginner**: Simple, action-oriented messages
- **Intermediate**: Technical context with guidance
- **Advanced**: Detailed technical information
- **Developer**: Full technical details and debugging info

```typescript
import { explainError, UserSkillLevel } from './error-explanations'

const explanation = explainError(
  toolError,
  UserSkillLevel.INTERMEDIATE,
  ExplanationFormat.INTERACTIVE,
  { userRole: 'admin', previousErrors: 2 }
)

// Use explanation.messages.intermediate for user display
// Use explanation.resolutionSteps for step-by-step guidance
// Use explanation.quickActions for immediate fixes
```

## Monitoring and Analytics

### Setting Up Monitoring

```typescript
import {
  errorMonitoringService,
  AlertNotificationConfig,
  DashboardConfig
} from './error-monitoring'

// Configure alerts
const alertConfig: AlertNotificationConfig = {
  id: 'high-error-rate',
  name: 'High Error Rate Alert',
  enabled: true,
  email: {
    recipients: ['admin@company.com'],
    subject: 'High Error Rate Detected',
    template: 'Error rate exceeded: {{errorRate}}/min'
  },
  throttling: {
    enabled: true,
    windowMs: 300000,
    maxNotifications: 1
  }
}

errorMonitoringService.configureAlert(alertConfig)

// Register health checks
errorMonitoringService.registerHealthCheck('my-component', async () => ({
  name: 'my-component',
  status: 'healthy',
  lastCheck: Date.now(),
  uptime: process.uptime() * 1000,
  metrics: {
    activeConnections: await getActiveConnections(),
    responseTime: await getAverageResponseTime()
  },
  errors: [],
  dependencies: ['database', 'external-api']
}))
```

### Analytics and Reporting

```typescript
import { errorAnalyticsService } from './error-analytics'

// Analyze trends
const trendAnalysis = errorAnalyticsService.analyzeTrends(
  'error_rate',
  { start: Date.now() - 86400000, end: Date.now() },
  'hour'
)

// Identify patterns
const patterns = errorAnalyticsService.identifyErrorPatterns(
  { start: Date.now() - 86400000, end: Date.now() },
  5 // Minimum frequency
)

// Root cause analysis
const rootCauseAnalysis = await errorAnalyticsService.performRootCauseAnalysis(
  'error-id-123',
  3600000 // 1 hour context window
)

// Generate comprehensive report
const report = errorAnalyticsService.generateAnalyticsReport({
  start: Date.now() - 86400000,
  end: Date.now()
})
```

## Configuration

### Environment Variables

```bash
# Error Handling Configuration
ERROR_HANDLING_ENABLED=true
ERROR_TRACKING_MAX_HISTORY=5000
ERROR_ALERT_COOLDOWN_MS=900000

# Retry Configuration
DEFAULT_MAX_RETRIES=3
DEFAULT_RETRY_DELAY_MS=1000
DEFAULT_MAX_DELAY_MS=30000

# Circuit Breaker Configuration
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_WINDOW_MS=300000

# Monitoring Configuration
MONITORING_RETENTION_DAYS=7
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
```

### Custom Configuration

```typescript
import {
  DEFAULT_RETRY_CONFIGS,
  errorRecoveryService
} from './error-recovery'

// Customize retry configuration for specific tools
DEFAULT_RETRY_CONFIGS['my-special-tool'] = {
  maxAttempts: 10,
  initialDelayMs: 500,
  maxDelayMs: 60000,
  backoffMultiplier: 1.5,
  jitterFactor: 0.2,
  retryableErrors: [ErrorCategory.TOOL_EXECUTION],
  retryableSubcategories: ['timeout', 'rate_limit_exceeded'],
  circuitBreakerThreshold: 8,
  circuitBreakerWindowMs: 600000,
  adaptiveAdjustment: true
}
```

## Best Practices

### 1. Error Context

Always provide rich context when creating errors:

```typescript
const context: ParlantLogContext = {
  operation: 'data-import',
  userId: user.id,
  workspaceId: workspace.id,
  toolName: 'csv-importer',
  sessionId: session.id,
  metadata: {
    fileName: 'data.csv',
    rowCount: 1000,
    requestId: req.id
  }
}

const error = createToolExecutionError(
  'CSV import failed due to invalid format',
  'data_corruption',
  'csv-importer',
  context,
  originalError
)
```

### 2. Proper Error Propagation

```typescript
// DON'T: Swallow errors silently
try {
  await riskyOperation()
} catch (error) {
  console.log('Something went wrong') // Bad!
}

// DO: Properly handle and propagate
try {
  await riskyOperation()
} catch (originalError) {
  const toolError = createToolExecutionError(
    'Operation failed',
    'execution_failed',
    'my-tool',
    { operation: 'risky-op' },
    originalError
  )

  const handled = await handleError(toolError)
  if (!handled.recovered) {
    throw toolError
  }
}
```

### 3. Circuit Breaker Usage

```typescript
// Use circuit breakers for external dependencies
const circuitBreakerKey = `external-api-${serviceName}`

if (errorRecoveryService.getCircuitBreakerStatus(circuitBreakerKey).state === 'open') {
  throw new ExternalServiceError(
    'Service temporarily unavailable',
    'circuit_breaker_open',
    serviceName
  )
}
```

### 4. Monitoring Integration

```typescript
import { recordError, recordSuccess } from './error-monitoring'

async function performOperation(): Promise<any> {
  const startTime = Date.now()

  try {
    const result = await executeOperation()

    // Record successful operation
    recordSuccess(
      'my-component',
      'perform-operation',
      Date.now() - startTime,
      { operationType: 'data-processing' }
    )

    return result
  } catch (error) {
    if (error instanceof BaseToolError) {
      // Record error with performance data
      recordError(error, {
        duration: Date.now() - startTime,
        component: 'my-component',
        operation: 'perform-operation'
      })
    }
    throw error
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Circuit Breaker Stuck Open

**Symptoms**: Operations failing with "Circuit breaker is open"

**Solutions**:
```typescript
// Check circuit breaker status
const status = errorRecoveryService.getCircuitBreakerStatus('my-service')
console.log('Circuit breaker status:', status)

// Manually reset if needed
if (status.state === 'open') {
  errorRecoveryService.resetCircuitBreaker('my-service')
}
```

#### 2. High Memory Usage from Error Storage

**Symptoms**: Increasing memory usage over time

**Solutions**:
- Check error retention settings
- Implement periodic cleanup
- Adjust `maxErrorHistory` configuration

#### 3. Alert Spam

**Symptoms**: Too many alert notifications

**Solutions**:
```typescript
// Adjust alert throttling
const alertConfig = {
  // ... other config
  throttling: {
    enabled: true,
    windowMs: 600000, // Increase window
    maxNotifications: 1 // Limit notifications
  }
}
```

### Debugging Tools

#### Error Statistics

```typescript
import { parlantErrorTracker } from './error-tracking'

// Get error statistics
const stats = parlantErrorTracker.getErrorStats(3600000) // Last hour
console.log('Error statistics:', stats)

// Get active alerts
const activeAlerts = parlantErrorTracker.getActiveAlerts()
console.log('Active alerts:', activeAlerts)
```

#### Recovery Statistics

```typescript
import { errorRecoveryService } from './error-recovery'

// Get recovery statistics
const recoveryStats = errorRecoveryService.getRecoveryStatistics(3600000)
console.log('Recovery statistics:', recoveryStats)

// Get circuit breaker status for all services
const allBreakers = errorRecoveryService.getCircuitBreakerStatus()
console.log('Circuit breakers:', allBreakers)
```

#### Analytics Insights

```typescript
import { errorAnalyticsService } from './error-analytics'

// Get monitoring statistics
const monitoringStats = errorAnalyticsService.getMonitoringStats(3600000)
console.log('Monitoring statistics:', monitoringStats)

// Analyze recent trends
const trends = errorAnalyticsService.analyzeTrends(
  'error_rate',
  { start: Date.now() - 3600000, end: Date.now() }
)
console.log('Error rate trends:', trends)
```

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express'
import { BaseToolError, handleError } from './error-handler'

const app = express()

// Error handling middleware
app.use(async (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof BaseToolError) {
    const handled = await handleError(error)

    res.status(handled.shouldEscalate ? 500 : 400).json({
      error: {
        id: error.id,
        message: handled.userMessage,
        recoveryActions: handled.recoveryActions,
        canRetry: error.recoverable
      }
    })
  } else {
    // Handle non-tool errors
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

### React Error Boundary

```tsx
import React from 'react'
import { explainError, UserSkillLevel } from './error-explanations'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  explanation?: any
}

class ToolErrorBoundary extends React.Component<any, ErrorBoundaryState> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    if (error instanceof BaseToolError) {
      const explanation = explainError(error, UserSkillLevel.INTERMEDIATE)
      return {
        hasError: true,
        error,
        explanation
      }
    }

    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError && this.state.explanation) {
      return (
        <div className="error-boundary">
          <h2>{this.state.explanation.title}</h2>
          <p>{this.state.explanation.summary}</p>

          <div className="quick-actions">
            {this.state.explanation.quickActions.map((action: any) => (
              <button key={action.id} onClick={() => this.executeAction(action)}>
                {action.title}
              </button>
            ))}
          </div>
        </div>
      )
    }

    return this.props.children
  }

  private executeAction = (action: any) => {
    // Execute quick action
    if (action.action === 'retry') {
      window.location.reload()
    }
  }
}
```

## API Reference

### Error Classes

- `BaseToolError` - Base class for all tool errors
- `ToolAdapterError` - Tool interface adaptation errors
- `ToolExecutionError` - Tool execution errors
- `ToolAuthenticationError` - Authentication errors
- `UserInputError` - Input validation errors
- `SystemResourceError` - System resource errors
- `ExternalServiceError` - External service errors

### Services

- `errorClassifier` - Error classification and taxonomy
- `universalErrorHandler` - Central error processing
- `errorExplanationService` - User-friendly explanations
- `errorRecoveryService` - Retry and recovery logic
- `errorMonitoringService` - Monitoring and alerting
- `errorAnalyticsService` - Analytics and insights

### Utilities

- `executeWithRecovery()` - Execute with automatic retry
- `handleError()` - Process error with full pipeline
- `explainError()` - Generate user explanation
- `recordError()` - Record error for monitoring
- `recordSuccess()` - Record successful operation

This comprehensive error handling system provides robust error management with intelligent recovery, user-friendly explanations, proactive monitoring, and deep analytics for the Universal Tool Adapter System.