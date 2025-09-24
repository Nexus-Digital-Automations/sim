# Universal Tool Adapter System for Sim-Parlant Integration

The Universal Tool Adapter System provides a comprehensive bridge between Sim's existing tool infrastructure and Parlant's AI agent system, enabling natural language interactions with all of Sim's 20+ tools.

## Features

- 🔄 **Automatic Tool Discovery**: Auto-discovers and registers all existing Sim tools
- 🧠 **Natural Language Interface**: Provides AI-friendly descriptions and usage guidelines
- ⚡ **Performance Optimization**: Intelligent caching, rate limiting, and connection pooling
- 🔧 **Flexible Configuration**: Workspace and user-specific customization
- 🛡️ **Robust Error Handling**: User-friendly error messages with actionable suggestions
- 📊 **Performance Monitoring**: Comprehensive metrics and analytics
- 🔍 **Tool Discovery**: Advanced search and contextual recommendations
- 🧪 **Comprehensive Testing**: Full integration test suite

## Quick Start

### Installation

The Universal Tool Adapter System is automatically available when you import the Parlant integration:

```typescript
import { initializeParlantToolAdapterService } from '@/services/parlant/tool-adapter'

// Initialize the service
const adapterService = await initializeParlantToolAdapterService()

// Get all available tools for Parlant registration
const toolSchemas = adapterService.getToolSchemas()
```

### Basic Usage

#### Execute a Tool

```typescript
import { getParlantToolAdapterService } from '@/services/parlant/tool-adapter'

const service = getParlantToolAdapterService()

const result = await service.executeTool(
  'build_workflow',
  {
    yamlContent: 'version: 1.0\nname: My Workflow\nsteps: []',
    description: 'A simple test workflow'
  },
  {
    user_id: 'user-123',
    workspace_id: 'workspace-456',
    session_id: 'session-789'
  }
)

if (result.success) {
  console.log('Workflow created:', result.data)
} else {
  console.error('Error:', result.error?.user_message)
}
```

#### Search for Tools

```typescript
// Search by keyword
const workflowTools = service.searchTools('workflow')

// Get tools by category
const dataTools = service.getToolsByCategory('data-retrieval')

// Get contextual recommendations
const recommendations = await service.getRecommendations(context)
```

## Available Tools

### Workflow Management (13 tools)
- `build_workflow` - Build workflows from YAML with visual diff preview
- `edit_workflow` - Edit existing workflows intelligently
- `run_workflow` - Execute workflows and monitor progress
- `get_workflow_console` - Access execution logs and debugging info
- `create_workflow_from_template` - Create workflows from predefined templates
- `validate_workflow` - Comprehensive workflow validation
- `schedule_workflow` - Schedule automated workflow execution
- `get_workflow_analytics` - Performance metrics and usage analytics
- `manage_workflow_versions` - Version control for workflows
- And more...

### Data Retrieval (8 tools)
- `get_user_workflow` - Retrieve specific workflows
- `list_user_workflows` - List accessible workflows
- `get_blocks_metadata` - Workflow block information
- `advanced_search` - Cross-platform search with filtering
- `query_knowledge_base` - Natural language knowledge queries
- `search_documentation` - Help and documentation search
- And more...

### External Integration (5 tools)
- `make_api_request` - HTTP API calls to external services
- `search_online` - Web search functionality
- `get_oauth_credentials` - OAuth credential management
- `webhook_manager` - Webhook management for integrations
- And more...

### File Operations (4 tools)
- `list_gdrive_files` - Google Drive file listing
- `read_gdrive_file` - Google Drive file reading
- `batch_file_processor` - Batch file operations
- And more...

### User Management (3 tools)
- `get_environment_variables` - User environment settings
- `set_environment_variables` - Configure user settings
- `user_preference_manager` - User preference management

### Additional Categories
- **Communication**: Notifications and messaging
- **Analysis**: Performance analysis and reporting
- **Automation**: Task automation and triggers

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Parlant Agents    │    │  Tool Adapter API   │    │   Sim Tool Layer    │
│                     │    │                     │    │                     │
│ - Natural Language  │◄──►│ - Schema Translation│◄──►│ - Client Tools      │
│ - Context Handling  │    │ - Error Handling    │    │ - Server Tools      │
│ - Tool Selection    │    │ - Performance Mgmt  │    │ - Custom Functions  │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │  Core Services      │
                           │                     │
                           │ - Configuration     │
                           │ - Caching          │
                           │ - Rate Limiting    │
                           │ - Monitoring       │
                           └─────────────────────┘
```

## Configuration

### Global Configuration

```typescript
import { globalConfigurationManager } from '@/services/parlant/tool-adapter'

// Update global settings
globalConfigurationManager.updateGlobalConfig({
  caching: {
    enabled: true,
    default_ttl_seconds: 300,
    max_cache_size_mb: 100
  },
  rate_limiting: {
    enabled: true,
    default_requests_per_minute: 60,
    default_concurrent_limit: 5
  },
  error_handling: {
    retry_attempts: 3,
    retry_backoff_ms: 1000,
    include_stack_traces: false
  }
})
```

### Tool-Specific Configuration

```typescript
// Configure individual tools
globalConfigurationManager.updateToolConfig('build_workflow', {
  enabled: true,
  performance_overrides: {
    estimated_duration_ms: 3000,
    cacheable: false
  },
  custom_descriptions: {
    description: 'Custom description for this workspace'
  }
})

// Workspace-specific configuration
globalConfigurationManager.setWorkspaceConfig('workspace-123', {
  tools: {
    'sensitive_tool': { enabled: false }
  },
  global: {
    rate_limiting: { default_requests_per_minute: 30 }
  }
})
```

## Error Handling

The system provides comprehensive error handling with user-friendly messages:

```typescript
const result = await service.executeTool('tool_name', args, context)

if (!result.success) {
  console.error('Error Code:', result.error?.code)
  console.error('User Message:', result.error?.user_message)
  console.error('Suggestions:', result.error?.suggestions)
  console.error('Retryable:', result.error?.retryable)
}
```

### Common Error Types

- `TOOL_NOT_FOUND` - Tool doesn't exist
- `TOOL_DISABLED` - Tool is disabled for this context
- `VALIDATION_ERROR` - Invalid input parameters
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTHENTICATION_ERROR` - Auth failed
- `NETWORK_ERROR` - Connection problems
- `TIMEOUT_ERROR` - Operation took too long

## Performance Monitoring

### Get Performance Metrics

```typescript
// Global metrics
const globalMetrics = service.getPerformanceMetrics()

// Tool-specific metrics
const toolMetrics = service.getPerformanceMetrics('build_workflow')

console.log(`Success Rate: ${toolMetrics.successRate * 100}%`)
console.log(`Average Duration: ${toolMetrics.averageDurationMs}ms`)
console.log(`Total Executions: ${toolMetrics.totalExecutions}`)
```

### Cache Statistics

```typescript
const cacheStats = service.getCacheStats()
console.log(`Cache Hit Rate: ${cacheStats.utilizationPercent}%`)
console.log(`Total Entries: ${cacheStats.totalEntries}`)
```

## Advanced Usage

### Creating Custom Adapters

```typescript
import { createCustomToolAdapter, registerToolAdapter } from '@/services/parlant/tool-adapter'

const customAdapter = createCustomToolAdapter(
  'my_custom_tool',
  'Does something amazing',
  'Use this tool when you need to do amazing things',
  {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' }
    },
    required: ['input']
  },
  async (args, context) => {
    // Your custom logic here
    return {
      success: true,
      data: { result: 'Amazing things done!' },
      message: 'Custom tool executed successfully'
    }
  },
  {
    category: 'automation',
    estimatedDurationMs: 1000,
    cacheable: true
  }
)

registerToolAdapter(customAdapter)
```

### Wrapper Patterns

```typescript
import { wrapToolAdapter } from '@/services/parlant/tool-adapter'

const enhancedAdapter = wrapToolAdapter(originalAdapter, {
  beforeExecute: async (args, context) => {
    console.log('Tool execution starting...')
    // Optional: return result to short-circuit
    return null
  },

  afterExecute: async (result, args, context) => {
    console.log('Tool execution completed!')
    // Optional: modify result
    return result
  },

  onError: async (error, args, context) => {
    console.error('Tool execution failed:', error)
    return {
      success: false,
      error: {
        code: 'WRAPPED_ERROR',
        message: 'Wrapper caught an error',
        user_message: 'Something went wrong, please try again',
        suggestions: ['Try again later'],
        retryable: true
      }
    }
  }
})
```

## Testing

### Running Tests

```bash
# Run all tests
npm test tool-adapter

# Run integration tests only
npm test tool-adapter/integration

# Run with coverage
npm test tool-adapter -- --coverage
```

### Test Example

```typescript
import { ParlantToolAdapterService } from '@/services/parlant/tool-adapter'

describe('My Tool Tests', () => {
  let service: ParlantToolAdapterService

  beforeAll(async () => {
    service = new ParlantToolAdapterService()
    await service.initialize()
  })

  afterAll(async () => {
    await service.cleanup()
  })

  it('should execute tool successfully', async () => {
    const result = await service.executeTool(
      'my_tool',
      { param: 'value' },
      { user_id: 'test', workspace_id: 'test' }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
```

## Health Monitoring

```typescript
// Get service health
const health = await service.getHealthStatus()
console.log('Service Status:', health.status) // 'healthy', 'degraded', 'unhealthy'

// Check specific components
console.log('Cache Health:', health.cache.utilizationPercent)
console.log('Registry Health:', health.registry.totalTools)
```

## Best Practices

### Performance
1. **Use caching** for read-only operations
2. **Configure rate limits** appropriately for your use case
3. **Monitor metrics** regularly to identify bottlenecks
4. **Use connection pooling** for external API calls

### Error Handling
1. **Always check success status** before using results
2. **Provide fallback behavior** for non-critical operations
3. **Log errors appropriately** for debugging
4. **Respect retry recommendations**

### Security
1. **Validate all inputs** before execution
2. **Use workspace isolation** for sensitive operations
3. **Configure appropriate permissions** for tools
4. **Monitor for suspicious usage patterns**

### Development
1. **Write comprehensive tests** for custom adapters
2. **Use type safety** with TypeScript
3. **Follow naming conventions** for consistency
4. **Document custom tools** thoroughly

## Troubleshooting

### Common Issues

#### Tool Not Found
```typescript
// Check if tool is registered
const tools = service.getToolSchemas()
console.log('Available tools:', tools.map(t => t.name))
```

#### Performance Issues
```typescript
// Check metrics
const metrics = service.getPerformanceMetrics('slow_tool')
console.log('Average duration:', metrics.averageDurationMs)

// Check cache hit rate
const cacheStats = service.getCacheStats()
console.log('Cache efficiency:', cacheStats.utilizationPercent)
```

#### Rate Limiting
```typescript
// Adjust rate limits
globalConfigurationManager.updateGlobalConfig({
  rate_limiting: {
    enabled: true,
    default_requests_per_minute: 120, // Increase limit
    default_concurrent_limit: 10      // More concurrent requests
  }
})
```

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = 'ToolAdapter*'

// Or configure logging level
import { createLogger } from '@/lib/logs/console/logger'
const logger = createLogger('ToolAdapter')
logger.setLevel('debug')
```

## API Reference

### Core Classes

- `ParlantToolAdapterService` - Main service class
- `BaseToolAdapter` - Base class for custom adapters
- `ToolAdapterRegistry` - Tool registration and discovery
- `ConfigurationManager` - Configuration management
- `AdapterCache` - Caching system
- `RateLimiter` - Rate limiting implementation

### Key Interfaces

- `ToolAdapter` - Tool adapter interface
- `AdapterContext` - Execution context
- `AdapterResult` - Execution result
- `ParlantToolSchema` - Parlant-compatible tool schema
- `AdapterConfiguration` - Configuration structure

## Contributing

1. **Add new tools** by creating adapters in the appropriate category
2. **Write comprehensive tests** for new functionality
3. **Update documentation** for new features
4. **Follow TypeScript best practices**
5. **Ensure error handling** is user-friendly

## Support

For issues with the Universal Tool Adapter System:

1. Check the **troubleshooting guide** above
2. Review **test cases** for usage examples
3. Check **performance metrics** for bottlenecks
4. Consult **error codes** in the codebase
5. Contact the development team for advanced issues