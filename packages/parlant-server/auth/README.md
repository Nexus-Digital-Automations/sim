# Sim-Parlant Authentication Bridge

A comprehensive authentication and authorization system that bridges Sim's Better Auth system with Parlant's agent framework, providing secure user context passing, workspace isolation, and subscription-based access control.

## Overview

This authentication bridge enables seamless integration between:
- **Sim's Better Auth** - User authentication and session management
- **Parlant's Agent Framework** - AI agent interactions and authorization
- **Workspace Isolation** - Multi-tenant security boundaries
- **Subscription Control** - Feature access based on user plans

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Sim Frontend  │───▶│  Auth Middleware │───▶│ Parlant Agents  │
│  (Better Auth)  │    │   (FastAPI)      │    │   (Authorized)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Session Store   │    │ User Context     │    │ Workspace       │
│ (PostgreSQL)    │    │ Mapping          │    │ Isolation       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

### 🔐 Authentication
- **Better Auth Integration**: Validates Sim session tokens
- **JWT Support**: Handles JSON Web Tokens and session cookies
- **Session Caching**: In-memory caching with configurable TTL
- **Token Validation**: Both session tokens and one-time tokens

### 🛡️ Authorization
- **Parlant Integration**: Native Parlant authorization policy
- **Subscription-Based**: Access control by user subscription plan
- **Rate Limiting**: Per-plan rate limiting with organization pooling
- **Operation Permissions**: Fine-grained operation-level controls

### 🏢 Workspace Isolation
- **Multi-Tenant**: Workspace-scoped agent sessions
- **Access Control**: User permissions per workspace
- **Context Isolation**: Isolated user context per workspace
- **Resource Boundaries**: Enforced workspace boundaries

### 🔒 Security
- **Security Headers**: Comprehensive HTTP security headers
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Request Logging**: Detailed authentication and authorization logging
- **Error Handling**: Secure error responses without information leakage

## Quick Start

### Basic Setup

```python
from fastapi import FastAPI
from auth.config import initialize_auth_system, configure_fastapi_auth

app = FastAPI()

@app.on_event("startup")
async def startup():
    await initialize_auth_system()
    configure_fastapi_auth(app)

@app.on_event("shutdown")
async def shutdown():
    from auth.config import cleanup_auth_system
    await cleanup_auth_system()
```

### With Custom Configuration

```python
from auth.config import AuthConfig, initialize_auth_system, configure_fastapi_auth

# Create custom configuration
config = AuthConfig()
config.sim_base_url = "https://your-sim-instance.com"
config.development_mode = False
config.rate_limit_enabled = True

# Initialize with custom config
await initialize_auth_system(config)
configure_fastapi_auth(app, config)
```

### Route Dependencies

```python
from fastapi import Depends
from auth.middleware import get_current_session, require_workspace_access

@app.get("/api/v1/profile")
async def get_profile(session = Depends(get_current_session)):
    return {"user": session.user.email}

@app.get("/api/v1/workspaces/{workspace_id}/agents")
async def workspace_agents(
    workspace_id: str,
    session = Depends(lambda req: require_workspace_access(workspace_id, req))
):
    return {"workspace_agents": [...]}
```

## Configuration

### Environment Variables

```bash
# Sim Integration
SIM_BASE_URL=http://localhost:3000
SIM_API_TIMEOUT=30.0

# JWT Settings
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_TOKEN_EXPIRE_MINUTES=30

# Session Management
SESSION_CACHE_TTL_MINUTES=5

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE=memory
REDIS_URL=redis://localhost:6379

# Security
SECURITY_HEADERS_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Development
DEVELOPMENT_MODE=false
DEBUG_HEADERS_ENABLED=false
AUTH_LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sim
```

### Configuration Presets

```python
# Development configuration
from auth.config import create_development_config
config = create_development_config()

# Production configuration
from auth.config import create_production_config
config = create_production_config()
```

## Core Components

### SimAuthBridge

The main authentication bridge that validates Sim tokens and manages user sessions.

```python
from auth.sim_auth_bridge import SimAuthBridge

bridge = SimAuthBridge(settings)
await bridge.initialize()

# Validate session
session = await bridge.validate_session_token(token)
if session:
    print(f"Authenticated user: {session.user.email}")
```

### AuthenticationMiddleware

FastAPI middleware that handles request authentication and user context injection.

```python
from auth.middleware import AuthenticationMiddleware

# Applied automatically when using configure_fastapi_auth()
app.add_middleware(AuthenticationMiddleware, auth_bridge=bridge)
```

### SimParlantAuthorizationPolicy

Parlant-compatible authorization policy with subscription-based permissions.

```python
from auth.parlant_authorization import SimParlantAuthorizationPolicy

policy = SimParlantAuthorizationPolicy(auth_bridge)

# Check permissions
allowed = await policy.check_permission(request, Operation.CREATE_AGENT)
rate_ok = await policy.check_rate_limit(request, Operation.CREATE_AGENT)
```

## User Context

### User Context Structure

```python
{
    "user": {
        "id": "user-123",
        "name": "John Doe",
        "email": "john@example.com",
        "email_verified": true,
        "image": "https://example.com/avatar.jpg"
    },
    "session": {
        "id": "session-456",
        "expires_at": "2025-01-24T10:30:00Z",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
    },
    "organization": {
        "id": "org-789",
        "workspaces": [
            {
                "id": "workspace-1",
                "name": "Main Workspace",
                "role": "admin",
                "permissions": ["read", "write", "admin"]
            }
        ]
    },
    "subscription": {
        "plan": "team",
        "features": ["create_agent", "update_agent", ...]
    },
    "request_context": {
        "workspace_id": "workspace-1",
        "timestamp": "2025-01-23T10:30:00Z",
        "rate_limit_key": "org:org-789"
    }
}
```

### Accessing User Context

```python
from auth.parlant_authorization import get_user_context

@app.post("/api/v1/chat")
async def chat_with_agent(request: Request):
    user_context = await get_user_context(request)

    # Pass context to Parlant agent
    agent_response = await agent.chat(
        message="Hello",
        user_context=user_context
    )

    return {"response": agent_response}
```

## Subscription Plans & Permissions

### Plan Hierarchy

- **Free**: Basic operations (guest sessions, read access)
- **Team**: Advanced features (agent creation, workspace management)
- **Enterprise**: Full access (all operations, advanced features)

### Operation Permissions

```python
# Free plan operations
Operation.CREATE_GUEST_SESSION
Operation.READ_SESSION
Operation.READ_AGENT
Operation.READ_EVENT
Operation.LIST_EVENTS
Operation.CREATE_CUSTOMER_EVENT

# Team plan (includes free + team operations)
Operation.CREATE_AGENT
Operation.UPDATE_AGENT
Operation.DELETE_AGENT
Operation.LIST_AGENTS
Operation.CREATE_CUSTOMER_SESSION

# Enterprise plan (includes all operations)
Operation.* # All operations allowed
```

### Rate Limits by Plan

```python
# Requests per minute
"free": {
    Operation.CREATE_CUSTOMER_EVENT: 30,
    Operation.READ_SESSION: 50,
    Operation.LIST_EVENTS: 100,
}

"team": {
    Operation.CREATE_CUSTOMER_EVENT: 200,
    Operation.READ_SESSION: 300,
    Operation.LIST_EVENTS: 500,
}

"enterprise": {
    Operation.CREATE_CUSTOMER_EVENT: 1000,
    Operation.READ_SESSION: 2000,
    Operation.LIST_EVENTS: 3000,
}
```

## Workspace Isolation

### Workspace-Scoped Operations

Operations that require workspace access validation:
- `CREATE_AGENT`, `UPDATE_AGENT`, `DELETE_AGENT`
- `LIST_AGENTS`, `CREATE_CUSTOMER_SESSION`
- `UPDATE_SESSION`, `DELETE_SESSION`

### Workspace Access Validation

```python
@app.get("/api/v1/workspaces/{workspace_id}/agents")
async def list_agents(
    workspace_id: str,
    session = Depends(lambda req: require_workspace_access(workspace_id, req))
):
    # User has been validated to have access to workspace_id
    return {"agents": get_workspace_agents(workspace_id)}
```

### Agent Session Context

```python
# Create isolated agent session for workspace
context = await auth_bridge.create_agent_session_context(
    session=user_session,
    workspace_id="workspace-123",
    agent_id="agent-456"
)

# Context includes isolation boundary
{
    "session_id": "parlant_session-abc_workspace-123",
    "user_context": {...},
    "workspace_id": "workspace-123",
    "isolation_boundary": "workspace-123"
}
```

## Error Handling

### Authentication Errors

```python
# 401 Unauthorized - No valid token
{
    "error": "Authentication required",
    "message": "Valid authorization token required"
}

# 403 Forbidden - Invalid permissions
{
    "error": "Access denied",
    "message": "Insufficient permissions for this operation"
}

# 429 Rate Limited - Too many requests
{
    "error": "Rate limit exceeded",
    "message": "Too many requests, please try again later"
}
```

### Workspace Access Errors

```python
# 403 Forbidden - No workspace access
{
    "error": "Access denied",
    "message": "Access denied to workspace workspace-123"
}
```

### Subscription Errors

```python
# 403 Forbidden - Plan upgrade required
{
    "error": "Subscription required",
    "message": "This operation requires team subscription or higher"
}
```

## Security Considerations

### Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000`

### Token Security

- Tokens are validated against Sim's auth system
- Session tokens are cached with configurable TTL
- No sensitive information in error responses
- Request/response logging excludes token contents

### Rate Limiting

- Per-user rate limiting for free plans
- Per-organization rate limiting for team/enterprise
- Different limits based on operation type
- Graceful degradation on rate limit storage issues

## Health Monitoring

### Health Check Endpoint

```python
@app.get("/health")
async def health():
    return await auth_health_check()
```

### Health Response

```json
{
    "status": "healthy",
    "components": {
        "auth_bridge": "healthy",
        "authorization_policy": "healthy"
    },
    "cache_stats": {
        "total_cached_sessions": 25,
        "active_sessions": 20,
        "expired_sessions": 5,
        "cache_ttl_minutes": 5
    },
    "config": {
        "development_mode": false,
        "rate_limit_enabled": true,
        "security_headers_enabled": true
    }
}
```

## Testing

### Unit Tests

```python
import pytest
from auth.sim_auth_bridge import SimAuthBridge
from auth.parlant_authorization import SimParlantAuthorizationPolicy

@pytest.mark.asyncio
async def test_session_validation():
    bridge = SimAuthBridge(test_settings)
    await bridge.initialize()

    session = await bridge.validate_session_token("valid-token")
    assert session is not None
    assert session.user.email == "test@example.com"
```

### Integration Tests

```python
from fastapi.testclient import TestClient
from auth.config import create_development_config

def test_authenticated_endpoint():
    client = TestClient(app)

    response = client.get(
        "/api/v1/profile",
        headers={"Authorization": "Bearer valid-token"}
    )

    assert response.status_code == 200
    assert "user" in response.json()
```

## Deployment

### Docker Configuration

```dockerfile
FROM python:3.11-slim

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . /app
WORKDIR /app

# Environment configuration
ENV SIM_BASE_URL=https://your-sim-instance.com
ENV DATABASE_URL=postgresql://...
ENV JWT_SECRET_KEY=your-production-secret

# Run server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Checklist

- [ ] Set secure `JWT_SECRET_KEY`
- [ ] Configure `DATABASE_URL`
- [ ] Enable rate limiting with Redis
- [ ] Set production `SIM_BASE_URL`
- [ ] Configure proper CORS origins
- [ ] Enable security headers
- [ ] Set up health monitoring
- [ ] Configure logging levels
- [ ] Test subscription plan validation
- [ ] Verify workspace isolation

## Troubleshooting

### Common Issues

**Authentication fails**
- Verify `SIM_BASE_URL` is correct
- Check token format (Bearer prefix)
- Validate Sim auth endpoint availability

**Rate limiting not working**
- Check `RATE_LIMIT_ENABLED=true`
- Verify Redis connection if using Redis storage
- Monitor rate limit logs

**Workspace access denied**
- Verify user has workspace permissions in Sim
- Check workspace ID in request path/params
- Review workspace membership in database

**Authorization policy errors**
- Check subscription plan configuration
- Verify operation permissions mapping
- Review Parlant integration logs

### Debug Mode

Enable debug mode for detailed logging:

```python
config = AuthConfig()
config.development_mode = True
config.debug_headers = True
config.auth_log_level = "DEBUG"
```

Debug headers in responses:
- `X-User-ID`: Current user ID
- `X-User-Plan`: Subscription plan
- `X-Organization-ID`: Active organization
- `X-Session-ID`: Session identifier

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Test against both development and production configurations
5. Ensure security considerations are addressed

## License

This authentication bridge is part of the Sim-Parlant integration and follows the same licensing terms as the parent project.