# Parlant React Chat Interface - API Reference

## Overview

The Parlant React Chat Interface provides a comprehensive API for integrating conversational AI agents into the Sim platform. This documentation covers all API endpoints, data structures, and integration patterns for the chat interface system.

## Table of Contents

- [Chat API Endpoints](#chat-api-endpoints)
- [Agent Management API](#agent-management-api)
- [Session Management API](#session-management-api)
- [Real-time Communication](#real-time-communication)
- [Authentication & Security](#authentication--security)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Chat API Endpoints

### Chat Configuration Endpoint

#### `GET /api/chat/[subdomain]`

Retrieves chat configuration and metadata for a specific subdomain.

**Parameters:**
- `subdomain` (path): The unique subdomain identifier for the chat

**Response:**
```json
{
  "id": "chat_123",
  "title": "Customer Support Chat",
  "description": "Get help with your account",
  "customizations": {
    "primaryColor": "#007bff",
    "logoUrl": "https://example.com/logo.png",
    "imageUrl": "https://example.com/banner.jpg",
    "welcomeMessage": "Hello! How can I help you today?",
    "headerText": "Support Chat"
  },
  "authType": "public",
  "outputConfigs": [
    {
      "blockId": "response_block",
      "path": "output.message"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Authentication required
- `403`: Chat unavailable
- `404`: Chat not found

### Chat Message Endpoint

#### `POST /api/chat/[subdomain]`

Sends a message to the chat and receives streaming response.

**Parameters:**
- `subdomain` (path): The unique subdomain identifier

**Request Body:**
```json
{
  "input": "Hello, I need help with my account",
  "conversationId": "conv_abc123",
  "password": "optional_password",
  "email": "optional_email"
}
```

**Response:**
Server-Sent Events (SSE) stream with the following event types:

```
event: message_start
data: {"messageId": "msg_123", "timestamp": "2024-01-01T10:00:00Z"}

event: content_delta
data: {"content": "Hello! I'd be happy to help"}

event: tool_call
data: {"toolName": "getUserInfo", "parameters": {"userId": "user_123"}}

event: tool_result
data: {"toolName": "getUserInfo", "result": {"name": "John Doe", "status": "active"}}

event: message_end
data: {"messageId": "msg_123", "finishReason": "complete"}
```

**Status Codes:**
- `200`: Success (streaming response)
- `400`: Invalid input
- `401`: Authentication required
- `500`: Server error

## Agent Management API

### Create Agent

#### `POST /api/v1/agents`

Creates a new Parlant agent within a workspace.

**Request Body:**
```json
{
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "workspace_id": "ws_123",
  "guidelines": [
    {
      "condition": "user asks about billing",
      "action": "redirect to billing support"
    }
  ],
  "tools": ["gmail", "slack", "knowledge_base"],
  "customizations": {
    "personality": "friendly",
    "language": "en",
    "expertise_level": "expert"
  }
}
```

**Response:**
```json
{
  "id": "agent_456",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "workspace_id": "ws_123",
  "status": "active",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Get Agent

#### `GET /api/v1/agents/[id]`

Retrieves agent configuration and metadata.

**Parameters:**
- `id` (path): The agent ID

**Response:**
```json
{
  "id": "agent_456",
  "name": "Customer Support Agent",
  "description": "Handles customer inquiries and support requests",
  "workspace_id": "ws_123",
  "guidelines": [...],
  "tools": ["gmail", "slack", "knowledge_base"],
  "status": "active",
  "analytics": {
    "total_conversations": 1247,
    "average_response_time": "2.3s",
    "satisfaction_score": 4.7
  }
}
```

### Update Agent

#### `PUT /api/v1/agents/[id]`

Updates agent configuration.

**Request Body:** (partial updates supported)
```json
{
  "name": "Updated Agent Name",
  "guidelines": [
    {
      "condition": "updated condition",
      "action": "updated action"
    }
  ]
}
```

### Delete Agent

#### `DELETE /api/v1/agents/[id]`

Deletes an agent and all associated data.

**Response:**
```json
{
  "message": "Agent successfully deleted",
  "deleted_at": "2024-01-01T10:00:00Z"
}
```

### List Agents

#### `GET /api/v1/agents`

Lists agents with filtering and pagination.

**Query Parameters:**
- `workspace_id`: Filter by workspace
- `status`: Filter by status (active, inactive, archived)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (name, created_at, updated_at)
- `order`: Sort order (asc, desc)

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_456",
      "name": "Customer Support Agent",
      "workspace_id": "ws_123",
      "status": "active",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

## Session Management API

### Create Session

#### `POST /api/v1/sessions`

Creates a new conversation session with an agent.

**Request Body:**
```json
{
  "agent_id": "agent_456",
  "workspace_id": "ws_123",
  "context": {
    "user_id": "user_789",
    "channel": "web_chat",
    "metadata": {
      "page_url": "https://example.com/support",
      "user_agent": "Mozilla/5.0..."
    }
  }
}
```

**Response:**
```json
{
  "id": "session_abc123",
  "agent_id": "agent_456",
  "workspace_id": "ws_123",
  "status": "active",
  "created_at": "2024-01-01T10:00:00Z",
  "expires_at": "2024-01-01T18:00:00Z"
}
```

### Send Message

#### `POST /api/v1/sessions/[id]/messages`

Sends a message to an active session.

**Request Body:**
```json
{
  "type": "customer_message",
  "content": "I need help with my billing",
  "metadata": {
    "timestamp": "2024-01-01T10:05:00Z",
    "attachments": []
  }
}
```

**Response:** (Streaming)
Same SSE format as the chat endpoint.

### Get Session Events

#### `GET /api/v1/sessions/[id]/events`

Retrieves session events with optional long-polling support.

**Query Parameters:**
- `since`: ISO timestamp to get events after
- `limit`: Maximum events to return
- `poll`: Enable long-polling (boolean)
- `timeout`: Long-polling timeout in seconds

**Response:**
```json
{
  "events": [
    {
      "id": "event_123",
      "type": "message",
      "timestamp": "2024-01-01T10:00:00Z",
      "data": {
        "content": "Hello! How can I help you?",
        "sender": "agent"
      }
    }
  ],
  "has_more": false,
  "next_cursor": "cursor_456"
}
```

### Session Control

#### `POST /api/v1/sessions/[id]/pause`
Pauses an active session.

#### `POST /api/v1/sessions/[id]/resume`
Resumes a paused session.

#### `POST /api/v1/sessions/[id]/end`
Ends a session permanently.

## Real-time Communication

### Socket.io Integration

The chat interface uses Socket.io for real-time communication.

**Connection:**
```javascript
import io from 'socket.io-client'

const socket = io('/chat', {
  auth: {
    token: 'jwt_token',
    workspace_id: 'ws_123'
  }
})
```

**Events:**

#### Client → Server

```javascript
// Join session room
socket.emit('join_session', {
  session_id: 'session_abc123'
})

// Send message
socket.emit('message', {
  session_id: 'session_abc123',
  content: 'Hello!',
  type: 'customer_message'
})

// Typing indicator
socket.emit('typing', {
  session_id: 'session_abc123',
  is_typing: true
})
```

#### Server → Client

```javascript
// New message received
socket.on('message', (data) => {
  console.log('New message:', data)
})

// Agent typing
socket.on('agent_typing', (data) => {
  console.log('Agent is typing:', data.is_typing)
})

// Session status change
socket.on('session_status', (data) => {
  console.log('Session status:', data.status)
})

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error)
})
```

## Authentication & Security

### Authentication Methods

#### JWT Tokens
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
})

const { token } = await response.json()

// Use token in subsequent requests
fetch('/api/v1/agents', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

#### API Keys
```javascript
fetch('/api/v1/agents', {
  headers: {
    'X-API-Key': 'api_key_here'
  }
})
```

#### Chat Authentication
For public chats with authentication requirements:

```javascript
// Password authentication
const response = await fetch('/api/chat/subdomain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'chat_password'
  })
})

// Email authentication
const response = await fetch('/api/chat/subdomain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com'
  })
})
```

### Security Headers

All API endpoints include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### CORS Configuration

```javascript
// Allowed origins are configurable per deployment
const corsOptions = {
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}
```

## Data Structures

### ChatMessage

```typescript
interface ChatMessage {
  id: string
  content: string | StructuredContent
  type: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    tool_calls?: ToolCall[]
    attachments?: Attachment[]
    confidence_score?: number
    processing_time?: number
  }
  isInitialMessage?: boolean
}
```

### StructuredContent

```typescript
interface StructuredContent {
  text?: string
  components?: ContentComponent[]
  suggestions?: string[]
  quick_replies?: QuickReply[]
}

interface ContentComponent {
  type: 'table' | 'chart' | 'image' | 'card' | 'list'
  data: any
  styling?: ComponentStyling
}
```

### Agent Configuration

```typescript
interface AgentConfig {
  id: string
  name: string
  description: string
  workspace_id: string
  guidelines: Guideline[]
  tools: string[]
  customizations: {
    personality?: 'professional' | 'friendly' | 'casual' | 'formal'
    language?: string
    expertise_level?: 'beginner' | 'intermediate' | 'expert'
    response_length?: 'concise' | 'detailed' | 'comprehensive'
  }
  status: 'active' | 'inactive' | 'archived'
}

interface Guideline {
  id?: string
  condition: string
  action: string
  priority?: number
  enabled?: boolean
}
```

### Session Context

```typescript
interface SessionContext {
  user_id?: string
  workspace_id: string
  channel: 'web_chat' | 'mobile_app' | 'api' | 'embedded'
  metadata: {
    page_url?: string
    user_agent?: string
    referrer?: string
    ip_address?: string
    location?: GeoLocation
    device_info?: DeviceInfo
  }
  preferences?: {
    language?: string
    timezone?: string
    accessibility?: AccessibilityPreferences
  }
}
```

## Error Handling

### Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": "validation_failed",
  "message": "The request validation failed",
  "details": {
    "field": "email",
    "code": "invalid_format",
    "message": "Email address format is invalid"
  },
  "request_id": "req_123456",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `validation_failed` | Request validation error | 400 |
| `unauthorized` | Authentication required | 401 |
| `forbidden` | Insufficient permissions | 403 |
| `not_found` | Resource not found | 404 |
| `rate_limited` | Rate limit exceeded | 429 |
| `server_error` | Internal server error | 500 |
| `service_unavailable` | Service temporarily unavailable | 503 |

### Client Error Handling

```javascript
try {
  const response = await fetch('/api/v1/agents', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new ParlantApiError(error)
  }

  const data = await response.json()
  return data
} catch (error) {
  if (error instanceof ParlantApiError) {
    console.error(`API Error: ${error.code} - ${error.message}`)
    // Handle specific error types
    switch (error.code) {
      case 'unauthorized':
        redirectToLogin()
        break
      case 'rate_limited':
        await delay(error.retryAfter * 1000)
        return retryRequest()
      default:
        showErrorMessage(error.message)
    }
  } else {
    console.error('Network error:', error)
    showErrorMessage('Connection error. Please try again.')
  }
}
```

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Chat messages | 60 per minute | 60 seconds |
| Agent management | 100 per hour | 3600 seconds |
| Session operations | 120 per minute | 60 seconds |
| Authentication | 10 per minute | 60 seconds |

### Rate Limit Handling

```javascript
const handleRateLimit = async (response) => {
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
    console.log(`Rate limited. Retrying in ${retryAfter} seconds.`)

    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
    return fetch(response.url, response.config)
  }
  return response
}
```

## WebSocket Events Reference

### Connection Events

```javascript
socket.on('connect', () => {
  console.log('Connected to chat server')
})

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason)
  if (reason === 'io server disconnect') {
    // Reconnection needed
    socket.connect()
  }
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
})
```

### Chat Events

```javascript
// Message events
socket.on('message', (message) => {
  // Handle incoming message
  displayMessage(message)
})

socket.on('message_update', (update) => {
  // Handle message updates (edits, status changes)
  updateMessage(update.messageId, update.changes)
})

// Typing indicators
socket.on('typing_start', (data) => {
  showTypingIndicator(data.userId)
})

socket.on('typing_stop', (data) => {
  hideTypingIndicator(data.userId)
})

// Session events
socket.on('session_joined', (data) => {
  console.log('Joined session:', data.sessionId)
})

socket.on('session_ended', (data) => {
  console.log('Session ended:', data.reason)
  handleSessionEnd()
})

// Agent events
socket.on('agent_status', (data) => {
  updateAgentStatus(data.agentId, data.status)
})
```

### Emitting Events

```javascript
// Join a session
socket.emit('join_session', {
  sessionId: 'session_123',
  userId: 'user_456'
})

// Send a message
socket.emit('send_message', {
  sessionId: 'session_123',
  content: 'Hello!',
  type: 'text'
})

// Send typing indicator
socket.emit('typing', {
  sessionId: 'session_123',
  isTyping: true
})

// Leave session
socket.emit('leave_session', {
  sessionId: 'session_123'
})
```

This API reference provides comprehensive coverage of all endpoints, data structures, and integration patterns for the Parlant React Chat Interface. Refer to the specific endpoint documentation for detailed parameter specifications and response formats.