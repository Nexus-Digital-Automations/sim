# Parlant Agent Management API Documentation

## Overview

The Parlant Agent Management API provides comprehensive REST endpoints for managing AI agents within the Sim platform. This API enables users to create, configure, monitor, and interact with Parlant agents through their workspaces.

## Base URL

```
https://your-sim-instance.com/api/v1
```

## Authentication

All API endpoints require authentication using an API key. Include your API key in the request header:

```http
X-API-Key: your_api_key_here
```

## Rate Limiting

API requests are rate-limited based on your subscription plan. Rate limit headers are included in all responses:

- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: When the rate limit window resets

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "additional": "error details"
  },
  "requestId": "req_123456789",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error

## Endpoints

### 1. Create Agent

**POST** `/api/v1/agents`

Creates a new Parlant agent in the specified workspace.

#### Request Body

```json
{
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
  "compositionMode": "fluid",
  "systemPrompt": "You are a helpful customer support agent...",
  "modelProvider": "openai",
  "modelName": "gpt-4",
  "temperature": 70,
  "maxTokens": 2000
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Agent name (1-255 characters) |
| `description` | string | No | Agent description (max 1000 characters) |
| `workspaceId` | string | Yes | UUID of the target workspace |
| `compositionMode` | string | No | "fluid" or "strict" (default: "fluid") |
| `systemPrompt` | string | No | Custom system prompt (max 10000 characters) |
| `modelProvider` | string | No | AI provider (default: "openai") |
| `modelName` | string | No | Model name (default: "gpt-4") |
| `temperature` | number | No | Temperature 0-100 (default: 70) |
| `maxTokens` | number | No | Max tokens 1-32000 (default: 2000) |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440001",
  "createdBy": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "status": "active",
  "compositionMode": "fluid",
  "systemPrompt": "You are a helpful customer support agent...",
  "modelProvider": "openai",
  "modelName": "gpt-4",
  "temperature": 70,
  "maxTokens": 2000,
  "totalSessions": 0,
  "totalMessages": 0,
  "lastActiveAt": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### 2. List Agents

**GET** `/api/v1/agents`

Lists agents with optional filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `workspaceId` | string | - | Filter by workspace UUID |
| `status` | string | - | Filter by status ("active", "inactive", "archived") |
| `limit` | number | 20 | Number of agents per page (1-100) |
| `offset` | number | 0 | Number of agents to skip |
| `sortBy` | string | "createdAt" | Sort field ("name", "createdAt", "updatedAt", "lastActiveAt") |
| `sortOrder` | string | "desc" | Sort order ("asc", "desc") |
| `search` | string | - | Search in name and description |

#### Example Request

```bash
curl -X GET "https://your-sim-instance.com/api/v1/agents?workspaceId=550e8400-e29b-41d4-a716-446655440001&status=active&limit=10" \
  -H "X-API-Key: your_api_key_here"
```

#### Response

```json
{
  "agents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Customer Support Agent",
      // ... other agent fields
    }
  ],
  "pagination": {
    "total": 25,
    "offset": 0,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Agent Details

**GET** `/api/v1/agents/{id}`

Retrieves detailed information about a specific agent.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Example Request

```bash
curl -X GET "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: your_api_key_here"
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440001",
  "createdBy": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "status": "active",
  "compositionMode": "fluid",
  "systemPrompt": "You are a helpful customer support agent...",
  "modelProvider": "openai",
  "modelName": "gpt-4",
  "temperature": 70,
  "maxTokens": 2000,
  "totalSessions": 15,
  "totalMessages": 342,
  "lastActiveAt": "2024-01-01T11:30:00.000Z",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T11:30:00.000Z"
}
```

### 4. Update Agent

**PUT** `/api/v1/agents/{id}`

Updates an existing agent's configuration. Supports partial updates.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Request Body

```json
{
  "name": "Updated Agent Name",
  "status": "inactive",
  "temperature": 85,
  "systemPrompt": "Updated system prompt..."
}
```

All fields from the create request are supported for updates (except `workspaceId`).

#### Response

Returns the updated agent object (same format as Get Agent Details).

### 5. Delete Agent

**DELETE** `/api/v1/agents/{id}`

Soft deletes an agent by archiving it. This preserves historical data while making the agent inaccessible.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Example Request

```bash
curl -X DELETE "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: your_api_key_here"
```

#### Response

```json
{
  "success": true,
  "message": "Agent 550e8400-e29b-41d4-a716-446655440000 has been successfully deleted",
  "requestId": "req_123456789",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 6. Create Agent Session

**POST** `/api/v1/agents/{id}/sessions`

Creates a new conversation session with the specified agent.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Request Body

```json
{
  "mode": "auto",
  "title": "Customer Support Inquiry",
  "customerId": "customer_12345",
  "metadata": {
    "channel": "web",
    "priority": "high"
  },
  "variables": {
    "customerName": "John Doe",
    "accountType": "premium"
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | No | Session mode ("auto", "manual", "paused") |
| `title` | string | No | Session title (max 255 characters) |
| `customerId` | string | No | External customer identifier |
| `metadata` | object | No | Custom session metadata |
| `variables` | object | No | Session variables |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440002",
  "customerId": "customer_12345",
  "mode": "auto",
  "status": "active",
  "title": "Customer Support Inquiry",
  "metadata": {
    "channel": "web",
    "priority": "high"
  },
  "currentJourneyId": null,
  "currentStateId": null,
  "variables": {
    "customerName": "John Doe",
    "accountType": "premium"
  },
  "eventCount": 0,
  "messageCount": 0,
  "startedAt": "2024-01-01T12:00:00.000Z",
  "lastActivityAt": "2024-01-01T12:00:00.000Z",
  "endedAt": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### 7. List Agent Sessions

**GET** `/api/v1/agents/{id}/sessions`

Lists sessions for the specified agent with optional filtering and pagination.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status ("active", "completed", "abandoned") |
| `limit` | number | 20 | Number of sessions per page (1-100) |
| `offset` | number | 0 | Number of sessions to skip |
| `sortBy` | string | "startedAt" | Sort field ("startedAt", "lastActivityAt", "createdAt") |
| `sortOrder` | string | "desc" | Sort order ("asc", "desc") |

#### Example Request

```bash
curl -X GET "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/sessions?status=active&limit=10" \
  -H "X-API-Key: your_api_key_here"
```

#### Response

```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "agentId": "550e8400-e29b-41d4-a716-446655440000",
      // ... other session fields
    }
  ],
  "pagination": {
    "total": 8,
    "offset": 0,
    "limit": 10,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 8. Get Agent Status

**GET** `/api/v1/agents/{id}/status`

Retrieves comprehensive status and health metrics for an agent.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

#### Example Request

```bash
curl -X GET "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "X-API-Key: your_api_key_here"
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Support Agent",
  "status": "active",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440001",
  "isHealthy": true,
  "lastHealthCheck": "2024-01-01T12:00:00.000Z",
  "metrics": {
    "totalSessions": 15,
    "totalMessages": 342,
    "activeSessions": 3,
    "averageResponseTime": 1200,
    "successRate": 98.5,
    "errorCount": 0,
    "lastActiveAt": "2024-01-01T11:30:00.000Z"
  },
  "configuration": {
    "modelProvider": "openai",
    "modelName": "gpt-4",
    "temperature": 70,
    "maxTokens": 2000,
    "compositionMode": "fluid"
  },
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T11:30:00.000Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SimAgentAPI } from '@sim/sdk'

const client = new SimAgentAPI({
  apiKey: 'your_api_key_here',
  baseUrl: 'https://your-sim-instance.com'
})

// Create an agent
const agent = await client.agents.create({
  name: 'Customer Support Agent',
  workspaceId: 'workspace-uuid',
  description: 'Handles customer inquiries',
  modelName: 'gpt-4',
  temperature: 70
})

// List agents
const agents = await client.agents.list({
  workspaceId: 'workspace-uuid',
  status: 'active',
  limit: 10
})

// Create a session
const session = await client.agents.createSession(agent.id, {
  mode: 'auto',
  title: 'Customer Inquiry',
  customerId: 'customer-123'
})

// Get agent status
const status = await client.agents.getStatus(agent.id)
console.log('Agent health:', status.isHealthy)
console.log('Active sessions:', status.metrics.activeSessions)
```

### Python

```python
from sim_sdk import SimAgentAPI

client = SimAgentAPI(
    api_key='your_api_key_here',
    base_url='https://your-sim-instance.com'
)

# Create an agent
agent = client.agents.create(
    name='Customer Support Agent',
    workspace_id='workspace-uuid',
    description='Handles customer inquiries',
    model_name='gpt-4',
    temperature=70
)

# List agents
agents = client.agents.list(
    workspace_id='workspace-uuid',
    status='active',
    limit=10
)

# Create a session
session = client.agents.create_session(
    agent_id=agent['id'],
    mode='auto',
    title='Customer Inquiry',
    customer_id='customer-123'
)

# Get agent status
status = client.agents.get_status(agent['id'])
print(f"Agent health: {status['isHealthy']}")
print(f"Active sessions: {status['metrics']['activeSessions']}")
```

### cURL Examples

#### Create an agent

```bash
curl -X POST "https://your-sim-instance.com/api/v1/agents" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "name": "Customer Support Agent",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440001",
    "description": "Handles customer inquiries and support requests",
    "modelName": "gpt-4",
    "temperature": 70
  }'
```

#### List agents with filtering

```bash
curl -X GET "https://your-sim-instance.com/api/v1/agents?workspaceId=550e8400-e29b-41d4-a716-446655440001&status=active&limit=10&search=support" \
  -H "X-API-Key: your_api_key_here"
```

#### Update agent configuration

```bash
curl -X PUT "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "temperature": 85,
    "systemPrompt": "Updated system prompt for better customer service..."
  }'
```

#### Create a session

```bash
curl -X POST "https://your-sim-instance.com/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/sessions" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "mode": "auto",
    "title": "Customer Support Inquiry",
    "customerId": "customer_12345",
    "metadata": {
      "channel": "web",
      "priority": "high"
    }
  }'
```

## Best Practices

### Agent Configuration

1. **Naming**: Use descriptive names that indicate the agent's purpose
2. **Temperature**: Lower values (0-30) for consistent responses, higher values (70-100) for creative responses
3. **System Prompts**: Be specific about the agent's role, capabilities, and behavior guidelines
4. **Token Limits**: Set appropriate limits based on your use case and budget

### Session Management

1. **Titles**: Use descriptive titles for easier session identification
2. **Variables**: Store relevant context in session variables for personalization
3. **Metadata**: Include operational data like channels, priorities, and source systems
4. **Customer IDs**: Always include customer identifiers for proper session tracking

### Performance Optimization

1. **Pagination**: Use appropriate page sizes (10-50 items) for list endpoints
2. **Filtering**: Apply workspace and status filters to reduce response sizes
3. **Caching**: Cache agent configurations that don't change frequently
4. **Health Checks**: Monitor agent status regularly for proactive issue detection

### Error Handling

1. **Retry Logic**: Implement exponential backoff for temporary failures
2. **Rate Limiting**: Respect rate limits and implement proper backoff strategies
3. **Validation**: Validate request data on the client side before sending
4. **Logging**: Log request IDs for easier debugging and support

## Changelog

### v1.0.0 (2024-01-01)
- Initial release of Parlant Agent Management API
- Complete CRUD operations for agents
- Session management endpoints
- Status monitoring and health checks
- Comprehensive validation and error handling
- Rate limiting and authentication

## Support

For API support and questions:
- Documentation: [https://docs.sim.ai/api/agents](https://docs.sim.ai/api/agents)
- Support Portal: [https://support.sim.ai](https://support.sim.ai)
- Community Discord: [https://discord.gg/sim](https://discord.gg/sim)