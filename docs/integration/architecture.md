# Sim-Parlant Integration Bridge Architecture

## Overview

The Sim-Parlant Integration Bridge creates a secure, scalable connection between Sim's existing infrastructure and Parlant conversational AI agents. This integration enables users to interact with Sim's tools and workflows through natural language while maintaining strict workspace isolation and authentication.

## Architecture Principles

### 1. Security-First Design
- **Authentication Bridge**: Direct integration with Sim's Better Auth system
- **Workspace Isolation**: Strict boundaries preventing cross-workspace access
- **Token Validation**: Real-time session validation against Sim's auth system
- **Permission Enforcement**: Role-based access control at the API level

### 2. Scalable Microservice Architecture
- **Independent Deployment**: Parlant server runs as separate microservice
- **Database Integration**: Shared PostgreSQL instance with Sim
- **API-First**: RESTful APIs with comprehensive error handling
- **Health Monitoring**: Built-in health checks and metrics

### 3. Multi-Tenant Support
- **Workspace Scoping**: All agents and sessions scoped to workspaces
- **User Context**: Rich user context preserved across interactions
- **Resource Isolation**: Physical separation of data and resources

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                           Sim Frontend                          │
│                     (React + Socket.io)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ API Calls & WebSocket
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                      Sim Backend                               │
│                   (Node.js + Express)                         │
│  ┌─────────────────┬─────────────────┬─────────────────────────┐ │
│  │   Better Auth   │  Socket.io Hub  │     Tool Registry       │ │
│  │    System       │                 │    (20+ Tools)          │ │
│  └─────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTP/WebSocket Bridge
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Parlant Integration Bridge                      │
│                   (FastAPI + Python)                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Sim Auth Bridge                               │ │
│  │  • Session validation against Better Auth                  │ │
│  │  • User context mapping                                    │ │
│  │  • Workspace access validation                             │ │
│  │  • Token caching and management                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Agent Management API                         │ │
│  │  • Agent lifecycle (create, update, delete)                │ │
│  │  • Session management with workspace isolation             │ │
│  │  • Message routing and handling                            │ │
│  │  • Real-time event broadcasting                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Error Handling & Monitoring                   │ │
│  │  • Comprehensive error tracking                            │ │
│  │  • Performance metrics and alerts                          │ │
│  │  • Health checks and status reporting                      │ │
│  │  • Integration testing and validation                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Database Connection
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                PostgreSQL Database                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Sim Tables                               │ │
│  │  • users, workspaces, organizations                        │ │
│  │  • tools, workflows, projects                              │ │
│  │  • auth_session, user_session                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Parlant Tables                              │ │
│  │  • parlant_agent, parlant_session                          │ │
│  │  • parlant_event, parlant_guideline                        │ │
│  │  • parlant_journey, parlant_tool                           │ │
│  │  • parlant_canned_response                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Bridge Architecture

### Session Flow Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Browser   │    │ Sim Backend  │    │ Parlant Bridge  │    │ Better Auth  │
└──────┬──────┘    └──────┬───────┘    └────────┬────────┘    └──────┬───────┘
       │                  │                     │                    │
       │ 1. Login         │                     │                    │
       ├─────────────────►│                     │                    │
       │                  │ 2. Validate        │                    │
       │                  ├────────────────────────────────────────►│
       │                  │                     │ 3. Session Token  │
       │                  │◄────────────────────────────────────────┤
       │ 4. Session Token │                     │                    │
       │◄─────────────────┤                     │                    │
       │                  │                     │                    │
       │ 5. API Request with Token              │                    │
       ├────────────────────────────────────────►                    │
       │                  │                     │                    │
       │                  │                     │ 6. Validate Token │
       │                  │                     ├───────────────────►│
       │                  │                     │ 7. User Context   │
       │                  │                     │◄───────────────────┤
       │                  │                     │                    │
       │                  │ 8. Response         │                    │
       │◄────────────────────────────────────────┤                    │
```

### Authentication Components

#### 1. SimAuthBridge Class
**Location**: `/packages/parlant-server/auth/sim_auth_bridge.py`

**Key Features**:
- Session token validation against Sim's Better Auth
- User context mapping and workspace access validation
- In-memory session caching with TTL
- HTTP client management for Sim API calls

**Core Methods**:
```python
async def validate_session_token(token: str) -> Optional[SimSession]
async def validate_workspace_access(session: SimSession, workspace_id: str) -> bool
def create_parlant_user_context(session: SimSession) -> Dict[str, Any]
async def create_agent_session_context(session: SimSession, workspace_id: str, agent_id: str) -> Dict[str, Any]
```

#### 2. Authentication Middleware
**Location**: `/packages/parlant-server/auth/middleware.py`

**Responsibilities**:
- Request interception and token extraction
- Automatic session validation for protected endpoints
- User context injection into request objects
- Error handling for authentication failures

#### 3. User Context Mapping

The bridge transforms Sim user sessions into Parlant-compatible context:

```python
# Sim Session (Better Auth)
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "session": {
    "id": "session_456",
    "expiresAt": "2024-12-31T23:59:59Z",
    "activeOrganizationId": "org_789"
  }
}

# Parlant Context (Generated by Bridge)
{
  "user_id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  "active_organization_id": "org_789",
  "workspaces": [
    {
      "id": "workspace_1",
      "name": "My Workspace",
      "role": "admin",
      "permissions": ["read", "write", "admin"]
    }
  ],
  "session_id": "session_456",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

## Workspace Isolation Implementation

### Isolation Principles

1. **Data Segregation**: All agent data scoped to workspace_id
2. **Access Control**: Permissions validated on every request
3. **Session Boundaries**: Agent sessions cannot cross workspace boundaries
4. **Resource Limits**: Per-workspace quotas and rate limiting

### Implementation Details

#### Database-Level Isolation
```sql
-- All Parlant tables include workspace_id foreign key
CREATE TABLE parlant_agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    user_id UUID NOT NULL REFERENCES "user"(id),
    name VARCHAR(255) NOT NULL,
    -- ... other fields
    CONSTRAINT unique_agent_per_workspace UNIQUE (workspace_id, name)
);

-- Row-level security policies
CREATE POLICY workspace_isolation ON parlant_agent
    FOR ALL TO authenticated_user
    USING (workspace_id = current_workspace_id());
```

#### API-Level Isolation
- All endpoints require workspace_id parameter or derive from agent/session
- Middleware validates workspace access before processing
- Error responses never leak cross-workspace information

#### Session Context Isolation
```python
# Agent sessions are scoped to workspace
session_context = {
    "session_id": f"parlant_{sim_session.id}_{workspace_id}",
    "isolation_boundary": workspace_id,  # Enforced at runtime
    "workspace_id": workspace_id,
    "user_context": {...},
    "agent_id": agent_id
}
```

## Multi-Tenant Security

### Security Layers

#### 1. Network Level
- HTTPS/TLS encryption for all communications
- CORS policies restricting cross-origin requests
- Rate limiting and DDoS protection

#### 2. Authentication Level
- JWT token validation with short TTL
- Session-based authentication with secure cookies
- Multi-factor authentication support (inherited from Sim)

#### 3. Authorization Level
- Role-based access control (RBAC)
- Workspace-scoped permissions
- Fine-grained API permissions

#### 4. Data Level
- Database-level row security policies
- Encryption at rest for sensitive data
- Audit logging for all data access

### Security Configuration

**Environment Variables**:
```bash
# Database Security
DATABASE_URL=postgresql://user:pass@localhost:5432/sim_db?sslmode=require
DATABASE_SSL_MODE=require

# Authentication
JWT_SECRET_KEY=<secure-random-key>
JWT_ALGORITHM=HS256
SESSION_TIMEOUT=3600

# API Security
CORS_ORIGINS=["https://app.sim.com"]
RATE_LIMIT_PER_MINUTE=100
MAX_SESSIONS_PER_USER=10

# Monitoring
ENABLE_AUDIT_LOG=true
LOG_LEVEL=INFO
METRICS_ENABLED=true
```

## Integration Patterns

### 1. Request-Response Pattern
Standard REST API interactions for CRUD operations on agents, sessions, and messages.

### 2. Real-time Events Pattern
WebSocket integration for real-time messaging and status updates.

### 3. Bridge Pattern
Authentication bridge maintains connection between Sim and Parlant systems without tight coupling.

### 4. Circuit Breaker Pattern
Fault tolerance with automatic fallback when Sim services are unavailable.

### 5. Caching Pattern
Multi-layer caching for session validation, user context, and frequently accessed data.

## Performance Considerations

### Scalability Features

1. **Horizontal Scaling**: Stateless design enables multiple Parlant server instances
2. **Database Connection Pooling**: Efficient PostgreSQL connection management
3. **Session Caching**: In-memory cache reduces auth overhead
4. **Async Processing**: FastAPI async/await for non-blocking operations

### Performance Metrics

- **Session Validation**: < 50ms average response time
- **Agent Creation**: < 200ms average response time
- **Message Processing**: < 100ms average response time
- **Database Queries**: < 10ms for simple lookups
- **Memory Usage**: < 512MB per instance under normal load

### Monitoring Points

- API response times and error rates
- Database query performance and connection pool usage
- Session cache hit rates and memory usage
- Authentication bridge connectivity and latency
- Workspace isolation boundary violations

## Error Handling Strategy

### Error Categories

1. **Authentication Errors**: Invalid tokens, expired sessions
2. **Authorization Errors**: Insufficient permissions, workspace access denied
3. **Validation Errors**: Invalid input, malformed requests
4. **System Errors**: Database connectivity, external service failures
5. **Business Logic Errors**: Agent limits exceeded, invalid state transitions

### Error Response Format

```json
{
  "error": {
    "code": "WORKSPACE_ACCESS_DENIED",
    "message": "Access denied to workspace workspace_123",
    "details": {
      "workspace_id": "workspace_123",
      "user_id": "user_456",
      "required_permission": "read"
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "request_id": "req_789"
  }
}
```

### Recovery Mechanisms

- **Retry Logic**: Automatic retry with exponential backoff
- **Circuit Breakers**: Prevent cascade failures
- **Graceful Degradation**: Fallback to cached data when possible
- **Health Checks**: Proactive monitoring and alerting

This architecture provides a robust, secure, and scalable foundation for integrating Parlant conversational AI capabilities into the Sim platform while maintaining strict multi-tenant isolation and leveraging existing authentication infrastructure.