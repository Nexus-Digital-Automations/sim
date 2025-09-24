# Sim Codebase Architecture Analysis Report

## Executive Summary

This report provides a comprehensive analysis of the Sim codebase architecture to guide the optimal integration of the Parlant microservice. The analysis reveals a well-structured, modern monorepo with clear patterns for microservices integration.

## Current Architecture Overview

### Project Structure
```
sim/
├── apps/
│   ├── sim/                    # Main Next.js application
│   └── docs/                   # Documentation site
├── packages/
│   ├── db/                     # Shared database package
│   ├── cli/                    # SimStudio CLI tool
│   ├── ts-sdk/                 # TypeScript SDK
│   ├── python-sdk/             # Python SDK
│   └── parlant-server/         # **Parlant microservice (already present)**
└── scripts/                    # Build and deployment scripts
```

### Technology Stack

#### Core Infrastructure
- **Build System**: Turbo monorepo with Bun package manager
- **Main Application**: Next.js 15.4.1 with React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with extensive OAuth providers
- **Real-time**: Socket.IO with dedicated server
- **Language Runtime**: Node.js 20+ and Python 3.8+

#### Key Dependencies
- **WebSocket**: Socket.IO 4.8.1 (client & server)
- **Database**: Drizzle ORM 0.44.5, Postgres 3.4.5
- **Auth**: Better Auth 1.2.9 with Stripe integration
- **UI**: Radix UI components, Tailwind CSS, Framer Motion
- **AI/LLM**: OpenAI, Anthropic, Groq SDKs
- **File Processing**: PDF parsing, Office documents, CSV/Excel
- **Cloud Storage**: AWS S3, Azure Blob Storage support

## Microservices Architecture

### Existing Microservice Pattern
The codebase follows a **packages-based microservices** pattern:

1. **@sim/db** - Shared database layer with Drizzle ORM
2. **simstudio-ts-sdk** - TypeScript client SDK
3. **simstudio (CLI)** - Command-line interface
4. **parlant-server** - Python-based AI agent microservice

### Service Organization
- Services are organized as **npm workspaces** in `/packages/`
- Each service has independent `package.json` and build configuration
- Shared dependencies managed at root level
- Cross-service communication via HTTP/WebSocket

## Socket.IO Server Architecture

### Configuration (`apps/sim/socket-server/`)
```typescript
// Server setup in apps/sim/socket-server/index.ts
const httpServer = createServer()
const io = createSocketIOServer(httpServer)
const roomManager = new RoomManager(io)

// Middleware chain:
// 1. Authentication via Better Auth tokens
// 2. Permission validation
// 3. Room management
```

### Key Features
- **Authentication**: One-time token validation via Better Auth
- **CORS**: Configurable origins for cross-domain support
- **Transports**: WebSocket + polling fallback
- **Room Management**: Collaborative workspace functionality
- **Error Handling**: Comprehensive logging and error tracking

### Integration Points for Parlant
- Authentication middleware can be extended for Parlant auth
- Room management system for agent collaboration
- Existing handler patterns for new agent events

## Authentication & Authorization

### Better Auth Configuration
- **Primary Method**: Email/password with OTP verification
- **OAuth Providers**: 20+ providers (Google, GitHub, Microsoft, etc.)
- **Session Management**: 30-day sessions with 24-hour refresh
- **Organization Support**: Multi-tenant with role-based access

### Key Auth Features for Parlant Integration
```typescript
// Authentication middleware pattern
export async function authenticateSocket(socket: AuthenticatedSocket, next: any) {
  const token = socket.handshake.auth?.token
  const session = await auth.api.verifyOneTimeToken({ body: { token } })
  // Store user context in socket
  socket.userId = session.user.id
  socket.activeOrganizationId = session.session.activeOrganizationId
}
```

### Integration Recommendations
- Parlant can reuse existing auth tokens
- User context (userId, organizationId) available in all authenticated requests
- OAuth tokens stored and managed via Better Auth

## Database Architecture

### Drizzle ORM Configuration
```typescript
// packages/db/index.ts
const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
const postgresClient = postgres(connectionString, {
  max: 60, // Connection pool optimization
  idle_timeout: 20,
  connect_timeout: 30,
})
```

### Connection Pool Strategy
- **Main App**: 60 connections per instance
- **Socket Server**: 30 connections total
- **Total Capacity**: ~400 connections (Supabase 16XL limit)

### Database Integration for Parlant
- Shared database access via `@sim/db` package
- Existing schema can be extended for Parlant entities
- Connection pooling already optimized for multi-service architecture

## Environment Variable Management

### Comprehensive Environment System
The codebase uses `@t3-oss/env-nextjs` with runtime variable support:

```typescript
// 200+ environment variables managed
// Categories:
// - Database & Auth (required)
// - AI/LLM providers (20+ optional)
// - OAuth integrations (15+ optional)
// - Cloud storage (AWS S3, Azure Blob)
// - Monitoring & analytics
// - Feature flags
```

### Parlant-Specific Variables Available
- `ANTHROPIC_API_KEY_1/2/3` - Anthropic Claude API keys
- `OPENAI_API_KEY_1/2/3` - OpenAI API keys
- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Authentication
- `SOCKET_PORT` - WebSocket server port

## Integration Recommendations

### 1. Parlant Server Placement ✅
**Current Status**: Already optimal at `/packages/parlant-server/`
- Follows established microservices pattern
- Inherits monorepo build system benefits
- Can leverage shared packages (`@sim/db`, etc.)

### 2. Shared Dependencies to Leverage

#### Authentication
```python
# Parlant can validate Better Auth tokens
# Example: apps/sim/socket-server/middleware/auth.ts
session = await auth.api.verifyOneTimeToken({"body": {"token": token}})
```

#### Database Access
```python
# Leverage existing PostgreSQL setup
DATABASE_URL = os.getenv('DATABASE_URL')  # Already configured
# Connection pooling handled by existing infrastructure
```

#### Environment Variables
```python
# Rich environment variable system available
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY_1')
SOCKET_PORT = os.getenv('SOCKET_PORT', 3002)
```

### 3. Socket.IO Integration Strategy

#### Extend Existing Handlers
```typescript
// apps/sim/socket-server/handlers/parlant.ts (new)
export function setupParlantHandlers(socket: AuthenticatedSocket, roomManager: RoomManager) {
  socket.on('parlant:agent:create', (data) => {
    // Forward to Parlant server HTTP API
  })

  socket.on('parlant:conversation:start', (data) => {
    // Integrate with existing room management
  })
}
```

#### Leverage Authentication
```python
# Parlant server can validate same tokens
# Used by Socket.IO middleware
def validate_auth_token(token: str):
    # Call Better Auth validation endpoint
    response = requests.post(f"{BETTER_AUTH_URL}/api/verify-one-time-token",
                           json={"token": token})
    return response.json()
```

### 4. Development Integration

#### Turbo Scripts Extension
```json
// Add to root package.json
{
  "scripts": {
    "dev:parlant": "cd packages/parlant-server && python server.py --reload",
    "dev:full": "turbo run dev && bun run dev:parlant",
  }
}
```

#### Docker Compose Integration
```yaml
# Extend existing docker-compose.local.yml
services:
  parlant-server:
    build: ./packages/parlant-server
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
```

## Architectural Considerations

### Strengths for Parlant Integration
1. **Mature Microservices Pattern**: Well-established package-based architecture
2. **Comprehensive Auth System**: 20+ OAuth providers, session management
3. **Robust Database Layer**: Optimized connection pooling, migration system
4. **Rich Environment Management**: 200+ variables, type-safe validation
5. **Real-time Infrastructure**: Production-ready Socket.IO setup
6. **Build System Integration**: Turbo monorepo with parallel execution

### Potential Challenges
1. **Port Management**: Need coordination between Socket.IO (3002) and Parlant (8001)
2. **Authentication Token Sharing**: HTTP API needs Socket.IO token validation
3. **Database Migration Coordination**: Parlant schema changes need Drizzle integration
4. **Development Workflow**: Multiple services need coordinated startup

### Recommended Solutions
1. **Service Discovery**: Use environment variables for inter-service communication
2. **Shared Authentication**: Parlant validates Better Auth tokens via HTTP calls
3. **Schema Management**: Extend Drizzle schema for Parlant entities
4. **Development Scripts**: Coordinated startup via Turbo tasks

## Security Considerations

### Existing Security Measures
- **Token Validation**: One-time tokens for WebSocket connections
- **CORS Configuration**: Configurable allowed origins
- **Environment Security**: Encrypted environment variables
- **Rate Limiting**: Tier-based API limits
- **Database Security**: Connection pooling with timeouts

### Parlant Security Integration
- Reuse existing authentication tokens
- Leverage CORS configuration for cross-service calls
- Follow established environment variable encryption patterns
- Integrate with existing rate limiting system

## Conclusion

The Sim codebase provides an excellent foundation for Parlant integration with:

1. **Optimal Placement**: `/packages/parlant-server/` follows established patterns
2. **Rich Integration Points**: Authentication, database, WebSocket infrastructure
3. **Comprehensive Environment System**: All necessary variables already defined
4. **Mature Development Workflow**: Turbo monorepo with coordinated builds

The architecture analysis indicates that Parlant integration will be straightforward due to the well-structured, microservices-ready foundation already in place.

## Next Steps for Integration Teams

1. **Database Agent**: Extend Drizzle schema for Parlant entities
2. **Authentication Agent**: Implement Better Auth token validation in Parlant
3. **Socket Integration Agent**: Create Parlant-specific WebSocket handlers
4. **Monitoring Agent**: Integrate with existing logging and analytics
5. **Testing Agent**: Develop integration tests across service boundaries

---

*Report generated by Architecture Analysis Agent*
*Analysis Date: 2025-09-23*