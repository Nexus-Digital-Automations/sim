# Sim-Parlant Integration Bridge

The Sim-Parlant Integration Bridge provides a comprehensive API layer for integrating Parlant AI agents within the Sim platform. This service layer handles agent lifecycle management, conversation sessions, and real-time messaging with proper workspace isolation and authentication.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sim Frontend  │    │   Sim Backend   │    │ Parlant Server  │
│                 │    │                 │    │                 │
│  - React UI     │◄──►│  - Next.js API  │◄──►│  - Python API   │
│  - Agent Chat   │    │  - Integration  │    │  - AI Agents    │
│  - Session Mgmt │    │    Bridge       │    │  - Conversations│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │                 │
                       │ - User Data     │
                       │ - Workspaces    │
                       │ - Agent Config  │
                       │ - Chat History  │
                       └─────────────────┘
```

## Quick Start

### 1. Initialize the Service

```typescript
import { initializeParlantService } from '@/services/parlant'

const parlantService = await initializeParlantService()
```

### 2. Create an Agent

```typescript
import { createAgent } from '@/services/parlant'

const agent = await createAgent(
  {
    name: 'Customer Support Bot',
    description: 'Helps customers with product questions',
    workspace_id: 'workspace-123',
    guidelines: [
      {
        condition: 'user asks about pricing',
        action: 'provide detailed pricing information'
      }
    ]
  },
  {
    user_id: 'user-456',
    workspace_id: 'workspace-123'
  }
)
```

### 3. Start a Conversation

```typescript
import { createSession, sendMessage } from '@/services/parlant'

const session = await createSession(
  {
    agent_id: agent.id,
    workspace_id: 'workspace-123'
  },
  authContext
)

const response = await sendMessage(
  session.id,
  {
    type: 'customer_message',
    content: 'Hello, I need help with pricing'
  },
  authContext
)
```

## API Reference

### Agent Management

- `createAgent(request, context)` - Create new agent
- `getAgent(agentId, context)` - Get agent by ID
- `updateAgent(agentId, request, context)` - Update agent
- `deleteAgent(agentId, context)` - Delete agent
- `listAgents(query, context)` - List agents with filtering

### Session Management

- `createSession(request, context)` - Create conversation session
- `getSession(sessionId, context)` - Get session details
- `listSessions(query, context)` - List sessions with filtering
- `sendMessage(sessionId, message, context)` - Send message to session
- `getEvents(sessionId, query, context)` - Get session events (supports long polling)
- `endSession(sessionId, context)` - End conversation
- `pauseSession(sessionId, context)` - Pause conversation
- `resumeSession(sessionId, context)` - Resume paused conversation

## Key Features

- **Full CRUD Operations**: Complete agent lifecycle management
- **Workspace Isolation**: Multi-tenant architecture with data isolation
- **Real-time Messaging**: Long polling and event streaming
- **Error Handling**: Comprehensive error handling with proper logging
- **Health Monitoring**: Continuous health checks and status reporting
- **Authentication**: Integration with Sim's existing auth system

## Configuration

Set the following environment variables:

```bash
PARLANT_SERVER_URL=http://localhost:8001
DATABASE_URL=postgresql://user:pass@localhost:5432/sim
```

## Error Handling

```typescript
import { isParlantError } from '@/services/parlant'

try {
  const agent = await createAgent(request, context)
} catch (error) {
  if (isParlantError(error)) {
    console.log(`Error: ${error.code} - ${error.message}`)
  }
}
```

## Health Monitoring

```typescript
const service = getParlantService()
const health = await service.performHealthCheck()
console.log(`Service status: ${health.status}`)
```