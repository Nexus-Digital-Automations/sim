# Sim-Parlant Authentication Bridge Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the Sim-Parlant authentication bridge, enabling seamless authentication between Sim's Better Auth system and Parlant agents.

## Quick Start

### 1. Environment Setup

Create or update your `.env` file with the required configuration:

```bash
# Copy from example
cp .env.example .env

# Required environment variables
DATABASE_URL=postgresql://user:pass@localhost/simdb
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-sim-app.com
NEXT_PUBLIC_APP_URL=https://your-sim-app.com
REDIS_URL=redis://localhost:6379/0
```

### 2. Install Dependencies

```bash
# Python dependencies for Parlant server
pip install -r requirements.txt

# JavaScript dependencies for Sim app
npm install
```

### 3. Initialize Authentication Bridge

```python
# In your Parlant server startup
from auth.sim_auth_bridge import SimAuthBridge
from auth.middleware import set_auth_bridge
from config.settings import get_settings

settings = get_settings()
auth_bridge = SimAuthBridge(settings)
await auth_bridge.initialize()
set_auth_bridge(auth_bridge)
```

### 4. Apply Middleware

```python
# Add authentication middleware to FastAPI app
from auth.middleware import AuthenticationMiddleware

app.add_middleware(AuthenticationMiddleware, auth_bridge=auth_bridge)
```

## Integration Components

### 1. Sim Frontend Integration

#### Using the Parlant API Client

```typescript
// apps/sim/lib/auth/parlant-bridge.ts
import { ParlantApiClient, validateWorkspaceAccess } from '@/lib/auth/parlant-bridge'

// Create authenticated client
const parlantClient = new ParlantApiClient()

// Example: Create agent session
async function createAgentSession(agentId: string, workspaceId: string) {
  // Validate workspace access first
  const hasAccess = await validateWorkspaceAccess(workspaceId)
  if (!hasAccess) {
    throw new Error('Access denied to workspace')
  }

  // Create session with authentication
  const session = await parlantClient.post('/api/v1/sessions', {
    agent_id: agentId,
    workspace_id: workspaceId,
    metadata: {
      created_from: 'sim_frontend',
      timestamp: new Date().toISOString()
    }
  }, workspaceId)

  return session
}
```

#### Session Management

```typescript
// Check authentication status
import { isParlantAuthenticated, getParlantUserContext } from '@/lib/auth/parlant-bridge'

async function checkAuthStatus() {
  const isAuthenticated = await isParlantAuthenticated()

  if (isAuthenticated) {
    const userContext = await getParlantUserContext()
    console.log('User context:', userContext)
  }
}

// Create session with context
import { createParlantSession } from '@/lib/auth/parlant-bridge'

async function initializeAgent(agentId: string, workspaceId: string) {
  const result = await createParlantSession(agentId, workspaceId, {
    feature: 'chat_interface',
    version: '1.0.0'
  })

  if (result) {
    console.log('Parlant session created:', result.sessionId)
  }
}
```

### 2. Parlant Server Integration

#### Route Protection

```python
from fastapi import Depends
from auth.middleware import get_current_session, get_current_user, require_workspace_access

@app.get("/api/v1/agents")
async def list_agents(
    session: SimSession = Depends(get_current_session)
):
    """List agents accessible to the current user."""
    user_workspaces = [w["id"] for w in session.user.workspaces]
    agents = await get_agents_for_workspaces(user_workspaces)
    return {"agents": agents}

@app.post("/api/v1/workspaces/{workspace_id}/agents")
async def create_agent(
    workspace_id: str,
    agent_data: AgentCreateRequest,
    session: SimSession = Depends(lambda req: require_workspace_access(workspace_id, req))
):
    """Create agent in specific workspace with access validation."""
    agent = await create_agent_in_workspace(workspace_id, agent_data, session.user.id)
    return {"agent": agent}
```

#### User Context Access

```python
from auth.user_agent_mapping import get_user_agent_mapper

@app.post("/api/v1/sessions")
async def create_session(
    request: SessionRequest,
    session: SimSession = Depends(get_current_session)
):
    """Create Parlant session with user context."""
    mapper = get_user_agent_mapper()

    # Create agent mapping with context
    mapping = await mapper.create_agent_mapping(
        session,
        request.agent_id,
        request.workspace_id,
        request.metadata
    )

    # Get comprehensive user context for agent
    user_context = await mapper.get_user_context_for_agent(
        session,
        request.agent_id,
        request.workspace_id
    )

    # Create Parlant session
    parlant_session = await create_parlant_session_with_context(
        request.agent_id,
        user_context
    )

    return {"session_id": parlant_session.id}
```

### 3. Token Management

#### Creating Workspace Tokens

```python
from auth.token_exchange import get_token_service

@app.post("/api/v1/tokens/workspace")
async def create_workspace_token(
    request: TokenRequest,
    session: SimSession = Depends(get_current_session)
):
    """Create workspace-scoped access token."""
    token_service = get_token_service()

    # Validate workspace access
    has_access = await validate_workspace_access(session, request.workspace_id)
    if not has_access:
        raise workspace_not_found(request.workspace_id, session.user.id)

    # Create token
    token = await token_service.create_workspace_token(
        session,
        request.workspace_id,
        request.permissions
    )

    return {"token": token, "expires_in": 3600 * 12}  # 12 hours
```

#### Token Validation

```python
from auth.token_exchange import get_token_service

async def validate_request_token(authorization: str) -> Optional[Dict[str, Any]]:
    """Validate token from request header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        # For session tokens (encrypted)
        if token.startswith("encrypted:"):
            token_service = get_token_service()
            session_token = SessionToken(token=token, ...)
            return await token_service.validate_session_token(session_token)

        # For workspace tokens (JWT)
        else:
            token_service = get_token_service()
            return token_service.verify_workspace_token(token)

    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None
```

## Error Handling

### Frontend Error Handling

```typescript
// apps/sim/lib/auth/parlant-bridge.ts
import { ParlantApiClient } from '@/lib/auth/parlant-bridge'

const client = new ParlantApiClient()

try {
  const agents = await client.get('/api/v1/agents', workspaceId)
} catch (error: any) {
  if (error.message.includes('401')) {
    // Authentication required
    redirectToLogin()
  } else if (error.message.includes('403')) {
    // Access denied
    showAccessDeniedMessage()
  } else {
    // Other errors
    showErrorMessage(error.message)
  }
}
```

### Backend Error Handling

```python
from auth.error_handling import get_exception_handler, AuthErrorCode

@app.exception_handler(HTTPException)
async def auth_exception_handler(request: Request, exc: HTTPException):
    """Handle authentication exceptions."""
    exception_handler = get_exception_handler()

    # Log security events for auth errors
    if exc.status_code in [401, 403]:
        user_id = getattr(request.state, 'user', {}).get('id')
        ip_address = request.headers.get('X-Forwarded-For', 'unknown')

        if exc.status_code == 401:
            error_code = AuthErrorCode.AUTHENTICATION_REQUIRED
        else:
            error_code = AuthErrorCode.FORBIDDEN

        security_monitor = get_security_monitor()
        security_monitor.record_failed_authentication(
            user_id, ip_address, error_code
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )
```

## Testing Integration

### Unit Tests

```python
# tests/auth/test_auth_bridge.py
import pytest
from auth.sim_auth_bridge import SimAuthBridge
from auth.token_exchange import TokenExchangeService

@pytest.mark.asyncio
async def test_session_validation():
    """Test session token validation."""
    auth_bridge = SimAuthBridge(test_settings)
    await auth_bridge.initialize()

    # Test valid token
    session = await auth_bridge.validate_session_token(valid_token)
    assert session is not None
    assert session.user.email == "test@example.com"

    # Test invalid token
    invalid_session = await auth_bridge.validate_session_token("invalid_token")
    assert invalid_session is None

@pytest.mark.asyncio
async def test_workspace_access():
    """Test workspace access validation."""
    auth_bridge = SimAuthBridge(test_settings)
    session = create_test_session()

    # Test valid workspace
    has_access = await auth_bridge.validate_workspace_access(
        session, "workspace_user_has_access"
    )
    assert has_access is True

    # Test invalid workspace
    no_access = await auth_bridge.validate_workspace_access(
        session, "workspace_user_no_access"
    )
    assert no_access is False
```

### Integration Tests

```python
# tests/integration/test_auth_flow.py
import pytest
from fastapi.testclient import TestClient

def test_authenticated_request():
    """Test full authentication flow."""
    client = TestClient(app)

    # Get session token from Sim
    auth_response = client.post("/auth/login", {
        "email": "test@example.com",
        "password": "password"
    })
    token = auth_response.cookies["better-auth.session_token"]

    # Use token for Parlant request
    response = client.get(
        "/api/v1/agents",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert "agents" in response.json()

def test_workspace_isolation():
    """Test workspace isolation enforcement."""
    client = TestClient(app)

    # Attempt to access workspace without permission
    response = client.get(
        "/api/v1/workspaces/unauthorized_workspace/agents",
        headers={
            "Authorization": f"Bearer {valid_token}",
            "X-Workspace-Id": "unauthorized_workspace"
        }
    )

    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]["message"]
```

### Frontend Tests

```typescript
// apps/sim/__tests__/auth/parlant-bridge.test.ts
import { ParlantApiClient, validateWorkspaceAccess } from '@/lib/auth/parlant-bridge'

describe('ParlantApiClient', () => {
  it('should authenticate and make successful requests', async () => {
    const client = new ParlantApiClient()

    // Mock authentication
    jest.spyOn(client as any, 'getAuthenticatedHeaders').mockResolvedValue({
      'Authorization': 'Bearer valid_token',
      'X-User-Context': 'base64_encoded_context',
      'Content-Type': 'application/json'
    })

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] })
    })

    const result = await client.get('/api/v1/agents', 'workspace_id')
    expect(result.agents).toBeDefined()
  })

  it('should handle authentication errors', async () => {
    const client = new ParlantApiClient()

    // Mock authentication failure
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(client.get('/api/v1/agents')).rejects.toThrow('Parlant API error: 401')
  })
})
```

## Monitoring and Debugging

### Logging Configuration

```python
# Configure logging in main.py
import logging
from auth.utils import SecurityValidator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Security logging
security_logger = logging.getLogger('security')
security_handler = logging.FileHandler('/var/log/parlant/security.log')
security_handler.setLevel(logging.WARNING)
security_logger.addHandler(security_handler)

# Authentication logging
auth_logger = logging.getLogger('auth')
auth_handler = logging.FileHandler('/var/log/parlant/auth.log')
auth_handler.setLevel(logging.INFO)
auth_logger.addHandler(auth_handler)
```

### Health Check Endpoint

```python
@app.get("/health/auth")
async def auth_health_check():
    """Check authentication system health."""
    try:
        auth_bridge = get_auth_bridge()

        # Test Sim API connectivity
        sim_healthy = await auth_bridge._test_sim_connection()

        # Test Redis connectivity
        token_service = get_token_service()
        redis_healthy = token_service.redis_client.ping()

        # Get cache statistics
        cache_stats = auth_bridge.get_cache_stats()

        return {
            "status": "healthy" if sim_healthy and redis_healthy else "degraded",
            "sim_api": "connected" if sim_healthy else "disconnected",
            "redis": "connected" if redis_healthy else "disconnected",
            "cache_stats": cache_stats
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

### Debug Utilities

```python
# Debug utility for token inspection
async def debug_token(token: str):
    """Debug token validation process."""
    auth_bridge = get_auth_bridge()

    print(f"Token: {token[:20]}...")
    print(f"Length: {len(token)}")

    try:
        session = await auth_bridge.validate_session_token(token)
        if session:
            print(f"Valid session for user: {session.user.email}")
            print(f"Workspaces: {[w['id'] for w in session.user.workspaces]}")
        else:
            print("Invalid token")
    except Exception as e:
        print(f"Validation error: {e}")

# Usage in development
if __name__ == "__main__":
    import asyncio
    asyncio.run(debug_token("your_token_here"))
```

## Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile for Parlant server
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Security: Run as non-root user
RUN adduser --disabled-password --gecos '' parlant
USER parlant

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  parlant-server:
    build: .
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/simdb
      - REDIS_URL=redis://redis:6379/0
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
    depends_on:
      - redis
      - db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: simdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Environment Variables for Production

```bash
# Production .env
DEBUG=false
PARLANT_LOG_LEVEL=INFO

# Database (use managed service)
DATABASE_URL=postgresql://user:pass@prod-db:5432/simdb

# Redis (use managed service)
REDIS_URL=redis://prod-redis:6379/0

# Authentication (use secrets management)
BETTER_AUTH_SECRET=PRODUCTION_SECRET_FROM_VAULT
BETTER_AUTH_URL=https://prod-sim-app.com

# Security
ENABLE_WORKSPACE_ISOLATION=true
MAX_AGENTS_PER_WORKSPACE=10
ALLOWED_ORIGINS=https://prod-sim-app.com

# Rate limiting
MAX_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_WINDOW_SECONDS=60
```

This integration guide provides everything needed to successfully implement the Sim-Parlant authentication bridge. Follow the steps sequentially and refer to the troubleshooting section for common issues.