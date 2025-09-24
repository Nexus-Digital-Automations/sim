# Universal Tool Adapter System - Integration Guide

## Overview

The Universal Tool Adapter System bridges Sim's existing tool ecosystem with Parlant's conversational AI platform. This system converts Sim's 70+ tools into Parlant-compatible interfaces that can be used naturally through conversation.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
- [Creating Custom Adapters](#creating-custom-adapters)
- [Testing and Validation](#testing-and-validation)
- [Monitoring and Observability](#monitoring-and-observability)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Architecture Overview

### System Components

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│    Parlant Agent    │◄──►│ Universal Adapter    │◄──►│   Sim Tools         │
│                     │    │ Registry             │    │                     │
│ - Natural Language  │    │                      │    │ - 70+ Tool Blocks   │
│ - Tool Requests     │    │ - Parameter Mapping  │    │ - Existing APIs     │
│ - Context Aware     │    │ - Error Handling     │    │ - Authentication    │
│                     │    │ - Quality Assurance  │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Data Flow

1. **Parlant Agent** makes tool requests with natural language parameters
2. **Adapter Framework** validates and transforms parameters
3. **Specific Adapters** execute underlying Sim tools
4. **Results** are transformed back into conversational format
5. **Monitoring System** tracks performance and health

## Quick Start

### 1. Initialize the Registry

```typescript
import { globalAdapterRegistry } from '@/services/parlant/tools/adapter-registry'
import { OpenAIAdapter } from '@/services/parlant/tools/adapters/openai-adapter'
import { GitHubAdapter } from '@/services/parlant/tools/adapters/github-adapter'

// Register adapters during application startup
async function initializeAdapters() {
  await globalAdapterRegistry.registerAdapter(new OpenAIAdapter())
  await globalAdapterRegistry.registerAdapter(new GitHubAdapter())

  console.log('Registered adapters:', globalAdapterRegistry.listAdapters())
}
```

### 2. Execute Tools Through Adapters

```typescript
import { globalAdapterRegistry } from '@/services/parlant/tools/adapter-registry'

// Execute a tool with natural language parameters
const result = await globalAdapterRegistry.executeTool(
  'openai_embeddings',
  {
    text: 'Convert this sentence into embeddings',
    model: 'text-embedding-3-small',
    api_key: process.env.OPENAI_API_KEY
  },
  {
    userId: 'user_123',
    workspaceId: 'workspace_456',
    agentId: 'agent_789'
  }
)

if (result.success) {
  console.log('Embeddings generated:', result.data.embeddings)
} else {
  console.error('Error:', result.error)
}
```

### 3. Get Available Tools

```typescript
// Get all Parlant-compatible tools
const tools = globalAdapterRegistry.getParlantTools()

// Get tools by category
const aiTools = globalAdapterRegistry.getToolsByCategory('ai')
const productivityTools = globalAdapterRegistry.getToolsByCategory('productivity')

// Search for tools
const searchResults = globalAdapterRegistry.searchTools('github')
```

## Core Components

### UniversalToolAdapter

Base class for all tool adapters. Provides standardized parameter validation, error handling, and result transformation.

```typescript
export abstract class UniversalToolAdapter {
  // Abstract methods that must be implemented
  protected abstract transformToParlant(blockConfig: BlockConfig): ParlantTool
  protected abstract transformParameters(params: Record<string, any>, context: ToolExecutionContext): Promise<Record<string, any>>
  protected abstract executeSimTool(params: Record<string, any>, context: ToolExecutionContext): Promise<ToolResponse>
  protected abstract transformResult(result: ToolResponse, context: ToolExecutionContext): Promise<any>

  // Public execution method
  async execute(parameters: Record<string, any>, context: ToolExecutionContext): Promise<AdapterExecutionResult>
}
```

### UniversalToolAdapterRegistry

Central registry for managing adapters with caching, retries, and health monitoring.

```typescript
export class UniversalToolAdapterRegistry {
  // Adapter management
  async registerAdapter(adapter: UniversalToolAdapter): Promise<void>
  async unregisterAdapter(adapterId: string): Promise<boolean>

  // Tool discovery
  getParlantTools(): ParlantTool[]
  getToolsByCategory(category: string): ParlantTool[]
  searchTools(query: string): ParlantTool[]

  // Execution
  async executeTool(toolId: string, parameters: Record<string, any>, context: ToolExecutionContext): Promise<AdapterExecutionResult>

  // Health and metrics
  getHealthSummary(): HealthSummary
  clearCache(): void
}
```

### ParlantTool Interface

Simplified, conversational tool definition optimized for LLM interaction.

```typescript
export interface ParlantTool {
  id: string
  name: string
  description: string
  longDescription?: string
  category: 'communication' | 'productivity' | 'data' | 'ai' | 'integration' | 'utility'
  parameters: ParlantToolParameter[]
  outputs: ParlantToolOutput[]
  examples?: ParlantToolExample[]
  usageHints?: string[]
  requiresAuth?: AuthRequirement
}
```

## Creating Custom Adapters

### Step 1: Implement the Adapter Class

```typescript
import { UniversalToolAdapter, ParlantTool, ToolExecutionContext, AdapterExecutionResult } from '../adapter-framework'
import { MyServiceBlock } from '@/blocks/blocks/my-service'

export class MyServiceAdapter extends UniversalToolAdapter {
  constructor() {
    super(MyServiceBlock)
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'my_service',
      name: 'My Service',
      description: 'Integration with my custom service',
      category: 'integration',
      parameters: [
        {
          name: 'action',
          description: 'Action to perform',
          type: 'string',
          required: true,
          constraints: { enum: ['create', 'read', 'update', 'delete'] }
        },
        {
          name: 'api_key',
          description: 'API key for authentication',
          type: 'string',
          required: true
        }
      ],
      outputs: [
        {
          name: 'result',
          description: 'Operation result',
          type: 'object'
        }
      ],
      requiresAuth: {
        type: 'api_key',
        provider: 'my_service'
      }
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    return {
      action: parlantParams.action,
      apiKey: parlantParams.api_key,
      // Transform other parameters as needed
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    try {
      // Implement your service integration here
      const response = await fetch(`https://api.myservice.com/${simParams.action}`, {
        headers: {
          'Authorization': `Bearer ${simParams.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      return {
        success: true,
        output: { result: data },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error.message,
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || 'Service operation failed')
    }

    return {
      result: simResult.output.result,
      status: 'success',
      timestamp: new Date().toISOString()
    }
  }
}
```

### Step 2: Register the Adapter

```typescript
import { globalAdapterRegistry } from '../adapter-registry'
import { MyServiceAdapter } from './my-service-adapter'

// Register during application initialization
await globalAdapterRegistry.registerAdapter(new MyServiceAdapter())
```

### Step 3: Use Template Helpers (Optional)

```typescript
import { AdapterTemplates } from '../templates/adapter-templates'

// Use predefined parameter templates
const apiKeyParam = AdapterTemplates.createApiKeyParameter('MyService', ['ms_abc123...'])
const timeoutParam = AdapterTemplates.createTimeoutParameter(30, 120)

// Use base classes for common patterns
export class MyServiceAdapter extends AdapterTemplates.ApiKeyAdapter {
  constructor() {
    super(MyServiceBlock, 'MyService', 'https://api.myservice.com')
  }

  // Override only the methods you need to customize
}
```

## Testing and Validation

### Creating Test Suites

```typescript
import { AdapterTestingFramework } from '../testing/adapter-testing-framework'
import { globalAdapterRegistry } from '../adapter-registry'

const testingFramework = new AdapterTestingFramework(globalAdapterRegistry)

// Create standard test suite
const testCases = testingFramework.createStandardTestSuite('my_service')

// Register custom test suite
testingFramework.registerTestSuite('my_service_tests', [
  {
    id: 'my_service_create_test',
    description: 'Test creating a new resource',
    category: 'integration',
    priority: 'high',
    input: {
      parameters: {
        action: 'create',
        api_key: 'test_key_123'
      },
      context: {
        userId: 'test_user',
        workspaceId: 'test_workspace'
      }
    },
    expectations: {
      success: true,
      performanceThresholds: {
        maxLatencyMs: 5000
      }
    }
  }
])

// Execute test suite
const results = await testingFramework.executeTestSuite('my_service', 'my_service_tests')
console.log(`Tests: ${results.summary.passed}/${results.summary.total} passed`)
```

### Mock Environment Setup

```typescript
const mockEnv = testingFramework.getMockEnvironment()

// Mock API responses
mockEnv.mockApiResponse('POST:https://api.myservice.com/create', {
  success: true,
  id: 'new_resource_123',
  created_at: new Date().toISOString()
})

// Mock credentials
mockEnv.mockCredentials('my_service', {
  api_key: 'mock_test_key'
})
```

## Monitoring and Observability

### Setup Monitoring

```typescript
import { globalAdapterMonitoring } from '../quality/adapter-monitoring'

// Log adapter operations
globalAdapterMonitoring.log(
  'info',
  'my_service',
  'create_resource',
  'Resource created successfully',
  { resourceId: 'abc123' },
  context
)

// Register alerts
globalAdapterMonitoring.registerAlert({
  name: 'high_error_rate',
  adapterId: 'my_service',
  condition: {
    metric: 'error_rate',
    operator: 'gt',
    threshold: 0.1, // 10%
    duration: 300 // 5 minutes
  },
  severity: 'high',
  actions: [
    { type: 'log', config: {} },
    { type: 'auto_recover', config: {} }
  ],
  enabled: true
})
```

### Health Checks

```typescript
// Perform health check
const healthStatus = await globalAdapterMonitoring.performHealthCheck('my_service')
console.log(`Health: ${healthStatus.status} (${healthStatus.score}/100)`)

// Get aggregated metrics
const metrics = globalAdapterMonitoring.getAggregatedMetrics()
console.log(`Total requests: ${metrics.totalRequests}`)
console.log(`Average success rate: ${metrics.averageSuccessRate}%`)
```

## Performance Optimization

### Caching Strategy

```typescript
// Enable caching for expensive operations
const result = await globalAdapterRegistry.executeTool(
  'my_service',
  parameters,
  context,
  {
    useCache: true,
    timeout: 10000
  }
)

// Cache is automatically managed based on parameter signatures
// Clear cache manually if needed
globalAdapterRegistry.clearCache()
```

### Retry Configuration

```typescript
// Configure retry behavior
const result = await globalAdapterRegistry.executeTool(
  'my_service',
  parameters,
  context,
  {
    retries: 3,
    timeout: 30000
  }
)
```

### Parallel Execution

```typescript
// Execute multiple tools in parallel
const results = await Promise.all([
  globalAdapterRegistry.executeTool('openai_embeddings', params1, context),
  globalAdapterRegistry.executeTool('github', params2, context),
  globalAdapterRegistry.executeTool('slack', params3, context)
])
```

## Troubleshooting

### Common Issues

#### 1. Parameter Validation Errors

```
Error: Parameter validation failed: Required parameter 'api_key' is missing
```

**Solution:** Ensure all required parameters are provided with correct types.

```typescript
// ✅ Correct
const result = await registry.executeTool('github', {
  operation: 'get_pr_details',
  repository_owner: 'microsoft',
  repository_name: 'vscode',
  pull_request_number: 123,
  github_token: 'ghp_...'
}, context)

// ❌ Incorrect - missing required parameters
const result = await registry.executeTool('github', {
  operation: 'get_pr_details'
}, context)
```

#### 2. Authentication Failures

```
Error: GitHub API error (401): Bad credentials
```

**Solution:** Verify API keys and OAuth tokens are valid and have required permissions.

```typescript
// Check token validity before use
if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_TOKEN.startsWith('ghp_')) {
  throw new Error('Invalid GitHub token format')
}
```

#### 3. Timeout Issues

```
Error: Tool execution timed out after 30000ms
```

**Solution:** Increase timeout for slow operations or optimize the underlying service.

```typescript
const result = await registry.executeTool('slow_service', params, context, {
  timeout: 60000 // Increase to 60 seconds
})
```

#### 4. Rate Limiting

```
Error: Rate limit exceeded
```

**Solution:** Implement exponential backoff and respect rate limits.

```typescript
// The registry automatically handles retries with exponential backoff
// You can also implement custom rate limiting
const result = await registry.executeTool('api_service', params, context, {
  retries: 5 // Will automatically wait between retries
})
```

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
// Set environment variable
process.env.NODE_ENV = 'development'

// Or enable logging programmatically
const registry = new UniversalToolAdapterRegistry({
  enableLogging: true,
  maxRetries: 3
})
```

### Log Analysis

Search and analyze logs for debugging:

```typescript
import { globalAdapterMonitoring } from '../quality/adapter-monitoring'

// Search for errors in the last hour
const errorLogs = globalAdapterMonitoring.searchLogs({
  level: 'error',
  startTime: new Date(Date.now() - 3600000).toISOString(),
  limit: 100
})

errorLogs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.adapterId}: ${log.message}`)
  if (log.error) {
    console.log('Stack trace:', log.error.stack)
  }
})
```

## API Reference

### Core Classes

- [`UniversalToolAdapter`](./adapter-framework.ts) - Base adapter class
- [`UniversalToolAdapterRegistry`](./adapter-registry.ts) - Adapter registry and execution engine
- [`AdapterTestingFramework`](./testing/adapter-testing-framework.ts) - Testing utilities
- [`AdapterMonitoringSystem`](./quality/adapter-monitoring.ts) - Monitoring and observability

### Template Utilities

- [`AdapterTemplates`](./templates/adapter-templates.ts) - Reusable adapter components
- [`ApiKeyAdapter`](./templates/adapter-templates.ts#ApiKeyAdapter) - Base class for API key authentication
- [`OAuthAdapter`](./templates/adapter-templates.ts#OAuthAdapter) - Base class for OAuth authentication

### Built-in Adapters

- [`OpenAIAdapter`](./adapters/openai-adapter.ts) - OpenAI embeddings and AI services
- [`GitHubAdapter`](./adapters/github-adapter.ts) - GitHub repository operations
- [`SlackAdapter`](./adapters/slack-adapter.ts) - Slack messaging and workspace management
- [`PostgreSQLAdapter`](./adapters/postgresql-adapter.ts) - PostgreSQL database operations
- [`GoogleSheetsAdapter`](./adapters/google-sheets-adapter.ts) - Google Sheets data management

### Configuration Options

```typescript
// Registry configuration
interface RegistryConfig {
  enableCaching: boolean
  cacheTTL: number
  maxRetries: number
  healthCheckInterval: number
  enableLogging: boolean
}

// Execution options
interface AdapterExecutionOptions {
  useCache?: boolean
  retries?: number
  timeout?: number
  tags?: Record<string, string>
}

// Testing configuration
interface TestSuiteConfig {
  name: string
  timeout: number
  concurrency: number
  failFast: boolean
  environment: 'development' | 'staging' | 'production'
  mocking: {
    enabled: boolean
    mockApiResponses: boolean
    mockAuthCredentials: boolean
  }
}
```

## Best Practices

### 1. Error Handling
- Always implement comprehensive error handling in adapters
- Use structured error messages with codes and context
- Implement circuit breaker patterns for external services

### 2. Security
- Never log sensitive information like API keys or tokens
- Validate all input parameters to prevent injection attacks
- Use secure credential storage and retrieval mechanisms

### 3. Performance
- Implement caching for expensive operations
- Use connection pooling for database adapters
- Monitor and optimize slow operations

### 4. Testing
- Create comprehensive test suites for all custom adapters
- Use mock environments for reliable testing
- Implement both unit and integration tests

### 5. Monitoring
- Set up health checks and alerts for critical adapters
- Monitor performance metrics and error rates
- Implement automated recovery mechanisms where possible

## Support and Contributing

For questions, issues, or contributions to the Universal Tool Adapter System:

1. Check the troubleshooting section above
2. Review existing adapter implementations for examples
3. Use the testing framework to validate new adapters
4. Monitor system health and performance regularly

The adapter system is designed to be extensible and maintainable. Follow the established patterns and use the provided utilities to ensure consistency and reliability across all integrations.