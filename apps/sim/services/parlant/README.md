# Sim-Parlant Integration Bridge

A comprehensive integration layer connecting Sim's Next.js frontend with the Parlant AI agent server. This service provides type-safe APIs, robust error handling, and workspace-based isolation for managing AI agents and conversations.

## 🚀 Features

- **Type-Safe Service Layer**: Complete TypeScript definitions for all Parlant entities
- **Robust HTTP Client**: Axios-based client with retry logic and connection pooling
- **Comprehensive Error Handling**: Custom error types with retry strategies
- **Workspace Isolation**: Secure agent and session management per workspace
- **Real-time Communication**: Long polling and event streaming support
- **Health Monitoring**: Service health checks and performance monitoring
- **Authentication Integration**: Seamless integration with Sim's auth system

## 📁 Architecture

```
/apps/sim/services/parlant/
├── types.ts              # TypeScript type definitions
├── config.ts             # Configuration management
├── client.ts             # HTTP client implementation
├── agent-service.ts      # Agent management service
├── session-service.ts    # Session and event handling
├── error-handler.ts      # Error handling and logging
├── index.ts              # Main exports and utilities
├── __tests__/            # Integration tests
│   └── integration.test.ts
└── README.md             # This documentation
```

## 🔧 Installation & Setup

### Environment Variables

Add these environment variables to your `.env` file:

```env
# Parlant server configuration
PARLANT_SERVER_URL=http://localhost:8001
PARLANT_API_TOKEN=your-auth-token-here

# Optional configuration
PARLANT_TIMEOUT=30000
PARLANT_RETRY_ATTEMPTS=3
PARLANT_LOG_LEVEL=info
```

### Basic Setup

```typescript
import {
  initializeParlantIntegration,
  createAuthContext,
  agentService,
  sessionService
} from '@/services/parlant'

// Initialize the integration
const { success, services, health } = await initializeParlantIntegration({
  baseUrl: 'http://localhost:8001',
  enableHealthChecks: true
})

if (!success) {
  throw new Error('Failed to initialize Parlant integration')
}

// Create auth context
const auth = createAuthContext('user-123', 'workspace-456')
```

## 📖 Usage Guide

### Agent Management

#### Create an Agent

```typescript
import { agentService, createAuthContext } from '@/services/parlant'

const auth = createAuthContext('user-id', 'workspace-id')

const agent = await agentService.createAgent({
  name: 'Customer Support Agent',
  description: 'Helps customers with product questions',
  workspace_id: 'workspace-123',
  guidelines: [
    {
      condition: 'user asks about pricing',
      action: 'provide current pricing information',
      priority: 1
    }
  ],
  config: {
    model: 'gpt-4',
    temperature: 0.7,
    max_turns: 50
  }
}, auth)

console.log('Created agent:', agent.data)
```

#### List Workspace Agents

```typescript
const agents = await agentService.listAgents({
  workspace_id: 'workspace-123',
  status: 'active',
  limit: 20,
  sortBy: 'name'
}, auth)

console.log(`Found ${agents.data.length} agents`)
```

#### Update Agent Configuration

```typescript
await agentService.updateAgent(agentId, {
  config: {
    temperature: 0.8,
    model: 'gpt-4-turbo'
  }
}, auth)
```

### Session Management

#### Start a Conversation

```typescript
import { sessionService, parlantUtils } from '@/services/parlant'

// Method 1: Create session directly
const session = await sessionService.createSession({
  agent_id: 'agent-123',
  workspace_id: 'workspace-456',
  customer_id: 'customer-789'
}, auth)

// Method 2: Use utility function
const session = await parlantUtils.startConversation(
  'agent-123',
  'workspace-456',
  auth,
  'Hello, I need help with my account',
  'customer-789'
)
```

#### Send Messages

```typescript
// Send a customer message
await sessionService.sendMessage(
  session.data.id,
  'I cannot access my dashboard',
  { source: 'web-chat', priority: 'high' },
  auth
)

// Get conversation events
const events = await sessionService.getEvents(
  session.data.id,
  { limit: 50 },
  auth
)

console.log(`Conversation has ${events.data.length} events`)
```

#### Long Polling for Real-time Updates

```typescript
// Wait for new events with timeout
const newEvents = await sessionService.getEvents(
  session.data.id,
  { offset: lastEventOffset, limit: 10 },
  auth,
  { wait_for_data: true, timeout: 30000 }
)
```

### Error Handling

```typescript
import {
  isParlantError,
  ParlantNetworkError,
  ParlantRateLimitError,
  formatErrorForUser
} from '@/services/parlant'

try {
  const agent = await agentService.createAgent(request, auth)
} catch (error) {
  if (isParlantError(error)) {
    if (error instanceof ParlantNetworkError) {
      console.log('Network issue, retrying later...')
    } else if (error instanceof ParlantRateLimitError) {
      console.log(`Rate limited. Retry after: ${error.rateLimitInfo.retry_after}s`)
    }

    // Show user-friendly error message
    const userMessage = formatErrorForUser(error)
    showErrorToUser(userMessage)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## 🔍 Health Monitoring

### Check Service Health

```typescript
import { checkParlantHealth } from '@/services/parlant'

const healthCheck = await checkParlantHealth()

console.log(`Parlant service is ${healthCheck.healthy ? 'healthy' : 'unhealthy'}`)
console.log(`Response time: ${healthCheck.latency}ms`)

if (!healthCheck.healthy) {
  console.error('Health check details:', healthCheck.details)
}
```

### Monitor Connection Status

```typescript
import { getParlantClient } from '@/services/parlant'

const client = getParlantClient()

// Test connection
const isConnected = await client.testConnection()
console.log('Connection status:', isConnected)

// Get detailed health status
const health = await client.healthCheck()
console.log('Server status:', health.status)
console.log('Database status:', health.checks.database.status)
```

## 🧪 Testing

### Running Integration Tests

```bash
# Install test dependencies
npm install --dev

# Run integration tests (requires Parlant server)
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Test Configuration

Set up test environment variables:

```env
PARLANT_TEST_URL=http://localhost:8801
PARLANT_TEST_TOKEN=test-token
NODE_ENV=test
```

### Writing Custom Tests

```typescript
import { describe, it, expect } from 'vitest'
import { agentService, createAuthContext } from '@/services/parlant'

describe('Custom Agent Tests', () => {
  const auth = createAuthContext('test-user', 'test-workspace')

  it('should create agent with custom guidelines', async () => {
    const agent = await agentService.createAgent({
      name: 'Test Agent',
      workspace_id: 'test-workspace',
      guidelines: [
        { condition: 'test condition', action: 'test action', priority: 1 }
      ]
    }, auth)

    expect(agent.success).toBe(true)
    expect(agent.data.guidelines).toHaveLength(1)
  })
})
```

## ⚙️ Configuration

### Client Configuration

```typescript
import { createParlantClient } from '@/services/parlant'

const client = createParlantClient({
  baseUrl: 'https://parlant.mycompany.com',
  timeout: 45000,
  retries: 5,
  authToken: 'my-api-token',
  enableCompression: true,
  headers: {
    'X-Custom-Header': 'value'
  }
})
```

### Service Configuration

```typescript
import { getParlantConfig, validateConfig } from '@/services/parlant'

// Get current configuration
const config = getParlantConfig()
console.log('Parlant URL:', config.baseUrl)

// Validate configuration
const validation = validateConfig()
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)
}
```

## 🔒 Security Considerations

### Workspace Isolation

All operations are automatically scoped to the authenticated user's workspace:

```typescript
// Auth context determines access scope
const auth = createAuthContext('user-123', 'workspace-456', 'workspace')

// This will only return agents from workspace-456
const agents = await agentService.listAgents({ workspace_id: 'workspace-456' }, auth)
```

### API Key Management

```typescript
import { getParlantClient } from '@/services/parlant'

const client = getParlantClient()

// Update auth token
client.setAuthToken('new-token')

// Clear token
client.clearAuthToken()
```

## 🚨 Error Reference

### Error Types

| Error Class | Description | Retryable | Action |
|-------------|-------------|-----------|---------|
| `ParlantNetworkError` | Connection/network issues | Yes | Retry with backoff |
| `ParlantTimeoutError` | Request timeout | Yes | Retry with shorter timeout |
| `ParlantRateLimitError` | Rate limit exceeded | Yes | Wait for retry_after |
| `ParlantAuthError` | Authentication failed | No | Check credentials |
| `ParlantValidationError` | Invalid request data | No | Fix request data |
| `ParlantServerError` | Server error (5xx) | Sometimes | Check server status |

### Common Error Patterns

```typescript
import { errorHandler } from '@/services/parlant'

try {
  const result = await agentService.createAgent(request, auth)
} catch (error) {
  // Log error with context
  errorHandler.logError(error, { userId: auth.user_id })

  // Determine if retryable
  if (errorHandler.shouldRetry(error, attempt, maxAttempts)) {
    const delay = errorHandler.getRetryDelay(error, attempt)
    await sleep(delay)
    return retry()
  }

  throw error
}
```

## 🔧 Troubleshooting

### Common Issues

**Connection Refused**
```typescript
// Check if Parlant server is running
const client = getParlantClient()
const isHealthy = await client.testConnection()
if (!isHealthy) {
  console.error('Parlant server is not accessible')
}
```

**Authentication Errors**
```typescript
// Verify auth context
const auth = createAuthContext('user-123', 'workspace-456')
console.log('Auth context:', auth)

// Check API token
const config = getParlantConfig()
console.log('Has API key:', !!config.apiKey)
```

**Timeout Issues**
```typescript
// Increase timeout for slow operations
const client = createParlantClient({
  timeout: 60000 // 60 seconds
})
```

### Debug Logging

Enable debug logging:

```env
PARLANT_LOG_LEVEL=debug
```

Or programmatically:

```typescript
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ParlantDebug')
logger.debug('Debug information', { data: 'value' })
```

## 📚 API Reference

### Core Services

- **[AgentService](./agent-service.ts)**: Complete agent lifecycle management
- **[SessionService](./session-service.ts)**: Session and conversation handling
- **[ParlantClient](./client.ts)**: Low-level HTTP communication

### Type Definitions

- **[Types](./types.ts)**: All TypeScript interfaces and types
- **[Error Types](./error-handler.ts)**: Custom error classes

### Utilities

- **[Config](./config.ts)**: Configuration management
- **[Utils](./index.ts#parlantUtils)**: Convenience functions

## 📈 Performance Optimization

### Connection Pooling

The client automatically manages HTTP connections:

```typescript
// Client reuses connections for efficiency
const client = getParlantClient({
  // Connection pool managed automatically
  enableCompression: true,
  timeout: 30000
})
```

### Batch Operations

```typescript
// Process multiple agents concurrently
const agentPromises = agentData.map(data =>
  agentService.createAgent(data, auth)
)
const results = await Promise.allSettled(agentPromises)
```

### Caching Health Checks

```typescript
// Health check results are cached for 30 seconds
const health = await client.healthCheck(true) // Uses cache
const freshHealth = await client.healthCheck(false) // Forces refresh
```

## 🤝 Contributing

When contributing to this integration layer:

1. **Follow TypeScript patterns**: Use strict typing
2. **Add comprehensive tests**: Cover happy path and error cases
3. **Document public APIs**: Include JSDoc comments
4. **Handle errors gracefully**: Use custom error types
5. **Log appropriately**: Use structured logging

### Development Setup

```bash
# Install dependencies
npm install

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test
```

## 📄 License

This integration layer is part of the Sim project and follows the same licensing terms.