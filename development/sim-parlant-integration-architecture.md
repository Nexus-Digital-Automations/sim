# Sim-Parlant Integration Bridge - Integration Architecture Analysis

## Executive Summary

This document provides a comprehensive integration architecture analysis for creating a seamless bridge between Sim's workflow platform and Parlant agents. The integration follows Sim's existing patterns and extends their infrastructure to support agent lifecycle management, workspace isolation, and real-time communication.

## 1. Sim Infrastructure Analysis

### 1.1 Core Architecture

**Technology Stack:**
- Next.js 15.4.1 with App Router
- Turbo monorepo with bun package manager
- PostgreSQL with Drizzle ORM
- Better Auth for authentication
- Socket.io for real-time communication
- TypeScript with strict configuration

**Project Structure:**
```
sim/
├── apps/
│   ├── sim/           # Main Next.js application
│   └── docs/          # Documentation site
├── packages/
│   ├── db/            # Database package with Drizzle schema
│   ├── parlant-server/ # Existing Parlant server package
│   ├── cli/           # CLI tools
│   ├── python-sdk/    # Python SDK
│   └── ts-sdk/        # TypeScript SDK
```

### 1.2 Authentication Architecture

**Better Auth Configuration:**
- Multi-provider OAuth support (GitHub, Google, Microsoft, Slack, etc.)
- Organization plugin with team management
- Custom session management with `activeOrganizationId`
- One-time tokens for Socket.io authentication
- Database hooks for user/session lifecycle

**Key Authentication Features:**
- Account linking across providers
- Email OTP verification
- Organization-based sessions
- Stripe billing integration
- Middleware-based route protection

### 1.3 Multi-tenancy Structure

**Workspace Model:**
```typescript
workspace {
  id: text (primary key)
  name: text
  ownerId: text (references user.id)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Organization Model:**
```typescript
organization {
  id: text (primary key)
  name: text
  slug: text
  logo: text
  metadata: json
  orgUsageLimit: decimal
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Permission System:**
- Entity-based permissions (workspace, workflow, organization)
- Permission types: admin, write, read
- User sessions track `activeOrganizationId`
- Workspace ownership with member management

### 1.4 Socket.io Real-time Communication

**Architecture:**
- Dedicated socket server with HTTP health checks
- Better Auth token-based socket authentication
- Room-based communication with workspace isolation
- AuthenticatedSocket interface with user context
- Comprehensive logging and error handling

## 2. Integration Layer Design

### 2.1 Proposed Integration Structure

Following Sim's monorepo patterns, the integration will be implemented as:

```
apps/sim/services/parlant/
├── agent-lifecycle/     # Agent creation, management, deletion
├── auth-bridge/         # Authentication bridge to Parlant
├── workspace-isolation/ # Workspace-scoped agent management
├── socket-integration/  # Real-time agent communication
├── api-layer/          # RESTful API endpoints
└── types/              # TypeScript type definitions
```

### 2.2 Database Schema Extensions

**Agent Management Tables:**
```sql
-- Workspace-scoped agent instances
CREATE TABLE workspace_agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user.id ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_config JSONB NOT NULL DEFAULT '{}',
  parlant_agent_id TEXT, -- Reference to Parlant agent
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive, starting, active, error
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure unique agent names per workspace
  UNIQUE(workspace_id, agent_name)
);

-- Agent authentication tokens
CREATE TABLE agent_auth_tokens (
  id TEXT PRIMARY KEY,
  workspace_agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Agent communication sessions
CREATE TABLE agent_sessions (
  id TEXT PRIMARY KEY,
  workspace_agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE,
  socket_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user.id ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,

  INDEX(workspace_agent_id, socket_id)
);
```

### 2.3 API Endpoint Structure

Following Sim's Next.js App Router patterns:

```
app/api/parlant/
├── agents/
│   ├── route.ts                    # GET /api/parlant/agents (list workspace agents)
│   │                              # POST /api/parlant/agents (create agent)
│   └── [agentId]/
│       ├── route.ts               # GET/PUT/DELETE /api/parlant/agents/[agentId]
│       ├── start/route.ts         # POST /api/parlant/agents/[agentId]/start
│       ├── stop/route.ts          # POST /api/parlant/agents/[agentId]/stop
│       └── chat/route.ts          # POST /api/parlant/agents/[agentId]/chat
├── auth/
│   ├── token/route.ts             # POST /api/parlant/auth/token (get agent token)
│   └── verify/route.ts            # POST /api/parlant/auth/verify (verify agent token)
└── workspaces/
    └── [workspaceId]/
        └── agents/route.ts        # GET /api/parlant/workspaces/[workspaceId]/agents
```

### 2.4 Authentication Bridge Architecture

**Token Flow:**
1. User authenticates with Better Auth → gets session
2. Session includes `activeOrganizationId` and workspace context
3. Agent creation requires workspace permissions
4. Parlant agents receive workspace-scoped authentication tokens
5. Socket.io connections use workspace-isolated rooms

**Implementation Pattern:**
```typescript
// Authentication middleware for Parlant APIs
export async function authenticateParlantRequest(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Verify workspace permissions
  const workspaceId = extractWorkspaceFromRequest(req)
  const hasPermission = await checkWorkspacePermission(
    session.user.id,
    workspaceId,
    'write'
  )

  return { session, workspaceId, hasPermission }
}
```

## 3. Integration Points

### 3.1 Agent Lifecycle Management

**Creation Flow:**
1. User creates agent through Sim UI
2. Sim validates workspace permissions
3. Sim creates `workspace_agents` record
4. Sim initializes Parlant agent with workspace context
5. Sim stores agent reference and authentication tokens

**Management Operations:**
- Start/Stop agents with workspace isolation
- Configure agent parameters within workspace scope
- Monitor agent status and health
- Handle agent errors and recovery

### 3.2 Workspace Isolation Implementation

**Isolation Strategy:**
- All agent operations scoped to workspace
- Permission checks on every agent interaction
- Workspace-specific agent naming
- Isolated agent communication channels
- Workspace-based resource limits

**Implementation:**
```typescript
export class WorkspaceAgentManager {
  async createAgent(workspaceId: string, userId: string, config: AgentConfig) {
    // Validate workspace permissions
    await this.validateWorkspaceAccess(workspaceId, userId)

    // Create workspace-scoped agent
    const agent = await this.parlantService.createAgent({
      ...config,
      workspaceId,
      userId,
      isolation: 'workspace'
    })

    // Store in workspace_agents table
    return this.storeWorkspaceAgent(workspaceId, userId, agent)
  }
}
```

### 3.3 Socket.io Integration

**Enhanced Socket Authentication:**
```typescript
export interface ParlantSocket extends AuthenticatedSocket {
  workspaceId?: string
  activeAgents?: string[] // Agent IDs user can access
}

// Workspace room management
export class ParlantRoomManager extends RoomManager {
  joinWorkspaceAgentRoom(socket: ParlantSocket, agentId: string) {
    const room = `workspace:${socket.workspaceId}:agent:${agentId}`
    socket.join(room)
    return room
  }
}
```

## 4. Implementation Strategy

### 4.1 Phase 1: Foundation
1. Create integration service structure
2. Implement database schema extensions
3. Set up basic API endpoints
4. Implement authentication bridge

### 4.2 Phase 2: Core Features
1. Agent lifecycle management
2. Workspace isolation
3. Socket.io integration
4. Error handling and monitoring

### 4.3 Phase 3: Advanced Features
1. Agent communication optimization
2. Real-time status updates
3. Advanced workspace features
4. Performance optimization

## 5. Technical Specifications

### 5.1 Dependencies

**New Dependencies:**
```json
{
  "dependencies": {
    "@sim/parlant-types": "workspace:*",
    "ws": "^8.14.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.5",
    "@types/uuid": "^9.0.4"
  }
}
```

### 5.2 Environment Configuration

**Environment Variables:**
```bash
# Parlant Integration
PARLANT_SERVER_URL=http://localhost:8000
PARLANT_API_KEY=your-parlant-api-key
PARLANT_WORKSPACE_ISOLATION=true
PARLANT_MAX_AGENTS_PER_WORKSPACE=10

# Integration Features
ENABLE_PARLANT_INTEGRATION=true
PARLANT_SOCKET_NAMESPACE=/parlant
```

### 5.3 Type Definitions

```typescript
export interface WorkspaceAgent {
  id: string
  workspaceId: string
  userId: string
  agentName: string
  agentConfig: AgentConfig
  parlantAgentId?: string
  status: 'inactive' | 'starting' | 'active' | 'error'
  createdAt: Date
  updatedAt: Date
}

export interface AgentConfig {
  name: string
  description?: string
  model?: string
  parameters?: Record<string, any>
  capabilities?: string[]
}

export interface AgentSession {
  id: string
  workspaceAgentId: string
  socketId: string
  userId: string
  startedAt: Date
  endedAt?: Date
}
```

## 6. Integration Guidelines for Other Agents

### 6.1 API Layer Agent
- Implement all endpoint handlers in `/app/api/parlant/`
- Follow Sim's authentication and error handling patterns
- Use Drizzle ORM for database operations
- Implement request validation using Sim's patterns

### 6.2 Authentication Agent
- Extend Better Auth integration
- Implement workspace-scoped token management
- Create authentication middleware for Parlant endpoints
- Handle token lifecycle and renewal

### 6.3 Workspace Isolation Agent
- Implement permission checking utilities
- Create workspace-scoped resource managers
- Implement isolation validation
- Handle workspace-based limits and quotas

### 6.4 Socket.io Integration Agent
- Extend existing socket server
- Implement Parlant-specific socket handlers
- Create workspace-based room management
- Handle real-time agent status updates

### 6.5 Error Handling Agent
- Implement comprehensive error tracking
- Create agent-specific error recovery
- Implement monitoring and alerting
- Handle graceful degradation

### 6.6 Testing Agent
- Create integration test suite
- Implement workspace isolation testing
- Create authentication flow tests
- Implement real-time communication tests

### 6.7 Documentation Agent
- Create comprehensive API documentation
- Document integration patterns
- Create user guides and examples
- Document troubleshooting procedures

## 7. Success Criteria

### 7.1 Functional Requirements
- ✅ Users can create agents within workspace context
- ✅ Agents are isolated per workspace with proper permissions
- ✅ Real-time communication works through Socket.io
- ✅ Authentication bridge maintains security
- ✅ Agent lifecycle is properly managed

### 7.2 Technical Requirements
- ✅ Integration follows Sim's architectural patterns
- ✅ Database schema extends existing models consistently
- ✅ API endpoints follow Next.js App Router conventions
- ✅ Socket.io integration extends existing server
- ✅ Error handling and logging match Sim's standards

### 7.3 Performance Requirements
- ✅ Agent operations complete within 2 seconds
- ✅ Socket connections support 100+ concurrent agents
- ✅ Database queries optimized with proper indexing
- ✅ Memory usage remains stable under load

## 8. Conclusion

This integration architecture leverages Sim's existing infrastructure to create a seamless bridge to Parlant agents. By following established patterns and extending existing systems, the integration maintains consistency while adding powerful agent capabilities. The workspace-scoped isolation ensures proper multi-tenancy, while the Socket.io integration enables real-time agent communication within Sim's collaborative environment.

The modular design allows for concurrent implementation by specialized agents, each focusing on their domain expertise while contributing to a cohesive integration solution.