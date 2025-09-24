# Parlant Integration Bridge API Documentation

## Overview

The Parlant Integration Bridge provides a comprehensive REST API for managing conversational AI agents within Sim's workspace-isolated environment. All APIs enforce authentication via Sim's Better Auth system and maintain strict workspace boundaries.

## Base Configuration

**Base URL**: `http://localhost:8001` (development) / `https://api.sim.com/parlant` (production)
**API Version**: v1
**Content Type**: `application/json`
**Authentication**: Bearer token (Sim session token)

## Authentication

### Authentication Flow

All API requests must include a valid Sim session token in the Authorization header:

```http
Authorization: Bearer <sim_session_token>
```

The integration bridge validates tokens in real-time against Sim's Better Auth system and caches valid sessions for performance.

### Authentication Endpoints

#### Get Authentication Status
```http
GET /api/v1/auth/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "authenticated": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "email_verified": true
  },
  "session": {
    "id": "session_456",
    "expires_at": "2024-12-31T23:59:59Z"
  },
  "workspaces": [
    {
      "id": "workspace_1",
      "name": "My Workspace",
      "role": "admin",
      "permissions": ["read", "write", "admin"]
    }
  ]
}
```

#### Validate Workspace Access
```http
GET /api/v1/auth/workspaces/{workspace_id}/access
Authorization: Bearer <token>
```

**Response**:
```json
{
  "has_access": true,
  "workspace": {
    "id": "workspace_1",
    "name": "My Workspace",
    "role": "admin",
    "permissions": ["read", "write", "admin"]
  }
}
```

**Error Response** (403):
```json
{
  "error": {
    "code": "WORKSPACE_ACCESS_DENIED",
    "message": "Access denied to workspace workspace_1",
    "details": {
      "workspace_id": "workspace_1",
      "user_id": "user_123"
    }
  }
}
```

## Agent Management API

### Create Agent

Create a new Parlant agent within a workspace.

```http
POST /api/v1/agents
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "guidelines": [
    "Always be polite and professional",
    "Escalate complex issues to human support",
    "Use customer's name when known"
  ],
  "tools": [
    "search_knowledge_base",
    "create_support_ticket",
    "check_order_status"
  ],
  "model": "claude-3-sonnet-20240229",
  "temperature": 0.7,
  "workspace_id": "workspace_1"
}
```

**Response** (201):
```json
{
  "id": "agent_1_workspace_1",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "guidelines": [
    "Always be polite and professional",
    "Escalate complex issues to human support",
    "Use customer's name when known"
  ],
  "tools": [
    "search_knowledge_base",
    "create_support_ticket",
    "check_order_status"
  ],
  "model": "claude-3-sonnet-20240229",
  "temperature": 0.7,
  "workspace_id": "workspace_1",
  "user_id": "user_123",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "status": "active"
}
```

### List Agents

Get all agents accessible to the current user, optionally filtered by workspace.

```http
GET /api/v1/agents?workspace_id={workspace_id}
Authorization: Bearer <token>
```

**Query Parameters**:
- `workspace_id` (optional): Filter agents by workspace

**Response** (200):
```json
[
  {
    "id": "agent_1_workspace_1",
    "name": "Customer Support Agent",
    "description": "Handles customer inquiries and support requests",
    "guidelines": ["Always be polite and professional"],
    "tools": ["search_knowledge_base", "create_support_ticket"],
    "model": "claude-3-sonnet-20240229",
    "temperature": 0.7,
    "workspace_id": "workspace_1",
    "user_id": "user_123",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z",
    "status": "active"
  }
]
```

### Get Agent Details

Retrieve detailed information about a specific agent.

```http
GET /api/v1/agents/{agent_id}
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "id": "agent_1_workspace_1",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "guidelines": [
    "Always be polite and professional",
    "Escalate complex issues to human support"
  ],
  "tools": [
    "search_knowledge_base",
    "create_support_ticket",
    "check_order_status"
  ],
  "model": "claude-3-sonnet-20240229",
  "temperature": 0.7,
  "workspace_id": "workspace_1",
  "user_id": "user_123",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "status": "active"
}
```

### List Workspace Agents

Get all agents within a specific workspace.

```http
GET /api/v1/agents/workspaces/{workspace_id}/agents
Authorization: Bearer <token>
```

**Response** (200):
```json
[
  {
    "id": "agent_1_workspace_1",
    "name": "Customer Support Agent",
    "description": "Handles customer inquiries",
    "workspace_id": "workspace_1",
    "status": "active"
  },
  {
    "id": "agent_2_workspace_1",
    "name": "Sales Assistant",
    "description": "Helps with product recommendations",
    "workspace_id": "workspace_1",
    "status": "active"
  }
]
```

## Session Management API

### Start Agent Session

Create a new conversation session with an agent.

```http
POST /api/v1/agents/sessions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "agent_id": "agent_1_workspace_1",
  "workspace_id": "workspace_1",
  "context": {
    "customer_id": "cust_456",
    "priority": "high",
    "source": "website_chat"
  }
}
```

**Response** (201):
```json
{
  "session_id": "session_1_agent_1_workspace_1",
  "agent_id": "agent_1_workspace_1",
  "workspace_id": "workspace_1",
  "user_id": "user_123",
  "status": "active",
  "created_at": "2024-01-01T12:00:00Z",
  "context": {
    "session_id": "parlant_session_456_workspace_1",
    "user_context": {
      "user_id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "workspaces": [...]
    },
    "workspace_id": "workspace_1",
    "agent_id": "agent_1_workspace_1",
    "created_at": "2024-01-01T12:00:00Z",
    "isolation_boundary": "workspace_1",
    "customer_id": "cust_456",
    "priority": "high",
    "source": "website_chat"
  }
}
```

### Get Session Details

Retrieve information about a specific session.

```http
GET /api/v1/agents/sessions/{session_id}
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "session_id": "session_1_agent_1_workspace_1",
  "agent_id": "agent_1_workspace_1",
  "workspace_id": "workspace_1",
  "user_id": "user_123",
  "status": "active",
  "created_at": "2024-01-01T12:00:00Z",
  "context": {
    "session_id": "parlant_session_456_workspace_1",
    "workspace_id": "workspace_1",
    "isolation_boundary": "workspace_1"
  }
}
```

### End Session

Terminate an agent session and clean up resources.

```http
DELETE /api/v1/agents/sessions/{session_id}
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "message": "Session session_1_agent_1_workspace_1 ended successfully"
}
```

## Messaging API

### Send Message

Send a message to an agent session.

```http
POST /api/v1/agents/sessions/{session_id}/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "I need help with my recent order",
  "session_id": "session_1_agent_1_workspace_1",
  "message_type": "user",
  "metadata": {
    "source": "web_chat",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**Response** (201):
```json
{
  "id": "msg_1_session_1_agent_1_workspace_1",
  "session_id": "session_1_agent_1_workspace_1",
  "content": "I need help with my recent order",
  "message_type": "user",
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "source": "web_chat",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Get Session Messages

Retrieve messages from an agent session with pagination.

```http
GET /api/v1/agents/sessions/{session_id}/messages?limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (optional, default: 50): Maximum number of messages to return
- `offset` (optional, default: 0): Number of messages to skip

**Response** (200):
```json
{
  "messages": [
    {
      "id": "msg_1_session_1",
      "session_id": "session_1_agent_1_workspace_1",
      "content": "I need help with my recent order",
      "message_type": "user",
      "timestamp": "2024-01-01T12:00:00Z",
      "metadata": {}
    },
    {
      "id": "msg_2_session_1",
      "session_id": "session_1_agent_1_workspace_1",
      "content": "I'd be happy to help you with your order. Can you provide your order number?",
      "message_type": "agent",
      "timestamp": "2024-01-01T12:00:05Z",
      "metadata": {
        "agent_id": "agent_1_workspace_1",
        "processing_time_ms": 150
      }
    }
  ],
  "total": 2,
  "offset": 0,
  "limit": 50
}
```

## Health and Monitoring API

### Health Check

Basic health check endpoint.

```http
GET /health
```

**Response** (200):
```json
{
  "status": "healthy",
  "service": "parlant-server",
  "version": "1.0.0"
}
```

### Detailed Health Check

Comprehensive health check including dependencies.

```http
GET /api/v1/health/detailed
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "status": "healthy",
  "service": "parlant-server",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00Z",
  "dependencies": {
    "database": {
      "status": "healthy",
      "response_time_ms": 5,
      "connection_pool": {
        "active": 2,
        "idle": 8,
        "max": 20
      }
    },
    "sim_auth": {
      "status": "healthy",
      "response_time_ms": 25,
      "cache_hit_rate": 0.85
    }
  },
  "metrics": {
    "active_sessions": 15,
    "total_agents": 8,
    "requests_per_minute": 120,
    "average_response_time_ms": 45
  }
}
```

## WebSocket Integration

### Connection

Connect to real-time events for agent sessions.

```javascript
const socket = io('ws://localhost:8001/agents', {
  auth: {
    token: 'sim_session_token'
  },
  query: {
    workspace_id: 'workspace_1'
  }
});
```

### Events

#### Agent Status Updates
```javascript
socket.on('agent:status', (data) => {
  console.log('Agent status changed:', data);
  // {
  //   agent_id: 'agent_1_workspace_1',
  //   status: 'active',
  //   workspace_id: 'workspace_1'
  // }
});
```

#### New Messages
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // {
  //   session_id: 'session_1',
  //   message: {
  //     id: 'msg_3',
  //     content: 'Here is your order status...',
  //     message_type: 'agent',
  //     timestamp: '2024-01-01T12:01:00Z'
  //   }
  // }
});
```

#### Session Events
```javascript
socket.on('session:started', (data) => {
  console.log('Session started:', data);
});

socket.on('session:ended', (data) => {
  console.log('Session ended:', data);
});
```

## Error Handling

### Standard Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field": "additional context"
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | Authentication token is invalid or expired |
| `WORKSPACE_ACCESS_DENIED` | 403 | User lacks access to specified workspace |
| `AGENT_NOT_FOUND` | 404 | Requested agent does not exist |
| `SESSION_NOT_FOUND` | 404 | Requested session does not exist |
| `INVALID_REQUEST` | 400 | Request body validation failed |
| `WORKSPACE_LIMIT_EXCEEDED` | 429 | Too many agents or sessions for workspace |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service outage |

### Error Examples

#### Authentication Error
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid or expired",
    "details": {
      "token_expires_at": "2024-01-01T11:59:59Z",
      "current_time": "2024-01-01T12:00:00Z"
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_123"
  }
}
```

#### Workspace Access Error
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "WORKSPACE_ACCESS_DENIED",
    "message": "Access denied to workspace workspace_2",
    "details": {
      "workspace_id": "workspace_2",
      "user_id": "user_123",
      "required_permission": "read"
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_124"
  }
}
```

#### Validation Error
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "details": {
      "field_errors": {
        "name": "Agent name is required",
        "workspace_id": "Invalid workspace ID format"
      }
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_125"
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
X-RateLimit-Window: 60
```

### Rate Limit Exceeded

When rate limits are exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "window_seconds": 60,
      "retry_after_seconds": 60
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_126"
  }
}
```

## SDK Examples

### Python SDK Example

```python
import requests
from typing import Dict, Any, Optional

class ParlantClient:
    def __init__(self, base_url: str, sim_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {sim_token}',
            'Content-Type': 'application/json'
        }

    def create_agent(self, name: str, workspace_id: str, **kwargs) -> Dict[str, Any]:
        """Create a new agent."""
        payload = {
            'name': name,
            'workspace_id': workspace_id,
            **kwargs
        }

        response = requests.post(
            f'{self.base_url}/api/v1/agents',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def start_session(self, agent_id: str, workspace_id: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Start a new agent session."""
        payload = {
            'agent_id': agent_id,
            'workspace_id': workspace_id,
            'context': context or {}
        }

        response = requests.post(
            f'{self.base_url}/api/v1/agents/sessions',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def send_message(self, session_id: str, content: str, message_type: str = 'user') -> Dict[str, Any]:
        """Send a message to an agent session."""
        payload = {
            'content': content,
            'session_id': session_id,
            'message_type': message_type
        }

        response = requests.post(
            f'{self.base_url}/api/v1/agents/sessions/{session_id}/messages',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

# Usage
client = ParlantClient('http://localhost:8001', 'your_sim_session_token')

# Create agent
agent = client.create_agent(
    name='Support Bot',
    workspace_id='workspace_1',
    description='Customer support assistant'
)

# Start session
session = client.start_session(
    agent_id=agent['id'],
    workspace_id='workspace_1'
)

# Send message
message = client.send_message(
    session_id=session['session_id'],
    content='Hello, I need help!'
)
```

### JavaScript SDK Example

```javascript
class ParlantClient {
  constructor(baseUrl, simToken) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${simToken}`,
      'Content-Type': 'application/json'
    };
  }

  async createAgent(name, workspaceId, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/agents`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name,
        workspace_id: workspaceId,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }

    return response.json();
  }

  async startSession(agentId, workspaceId, context = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/agents/sessions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        agent_id: agentId,
        workspace_id: workspaceId,
        context
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to start session: ${response.statusText}`);
    }

    return response.json();
  }

  async sendMessage(sessionId, content, messageType = 'user') {
    const response = await fetch(`${this.baseUrl}/api/v1/agents/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        content,
        session_id: sessionId,
        message_type: messageType
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage
const client = new ParlantClient('http://localhost:8001', 'your_sim_session_token');

// Create agent and session
const agent = await client.createAgent('Support Bot', 'workspace_1', {
  description: 'Customer support assistant'
});

const session = await client.startSession(agent.id, 'workspace_1');
const message = await client.sendMessage(session.session_id, 'Hello!');
```

This comprehensive API documentation provides all the necessary information for integrating with the Parlant Integration Bridge, including authentication, endpoints, error handling, rate limiting, and SDK examples for both Python and JavaScript.