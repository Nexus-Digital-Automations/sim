# Sim-Parlant Authentication Bridge Security Guide

## Overview

This document outlines the security architecture and best practices for the authentication bridge between Sim's Better Auth system and the Parlant server. The bridge ensures secure user context sharing, session management, and workspace isolation.

## Architecture Overview

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Sim as Sim Frontend
    participant Auth as Better Auth
    participant Bridge as Auth Bridge
    participant Parlant as Parlant Server
    participant Redis as Redis Cache
    participant DB as Database

    User->>Sim: Login Request
    Sim->>Auth: Authenticate User
    Auth->>DB: Validate Credentials
    DB-->>Auth: User Data + Session
    Auth-->>Sim: Session Token + User Context

    User->>Sim: Request Parlant Feature
    Sim->>Bridge: Create Agent Session
    Bridge->>Auth: Validate Session Token
    Auth-->>Bridge: Session Data + Permissions
    Bridge->>Parlant: User Context + Encrypted Token
    Bridge->>Redis: Cache Session Data

    Parlant->>Bridge: Validate Token
    Bridge->>Redis: Check Cache
    Redis-->>Bridge: Session Data
    Bridge-->>Parlant: User Context + Permissions

    Parlant->>User: Agent Response
```

## Security Components

### 1. Authentication Bridge (`SimAuthBridge`)

**Purpose**: Validates Sim session tokens and provides user context to Parlant.

**Security Features**:
- Token validation against Sim's Better Auth system
- Session caching with TTL for performance
- Workspace permission validation
- User context mapping and enrichment

**Key Security Measures**:
```python
# Token validation with cache
async def validate_session_token(self, token: str) -> Optional[SimSession]:
    # Check cache first with expiry validation
    if token in self._session_cache:
        cached_session = self._session_cache[token]
        if cached_session.expires_at > datetime.now():
            return cached_session

    # Validate against Sim API with proper error handling
    response = await self.http_client.get(
        "/api/auth/session",
        headers={"Authorization": f"Bearer {token}"}
    )
```

### 2. Token Exchange System

**Purpose**: Secure token exchange between Sim and Parlant with encryption.

**Security Features**:
- JWT tokens with HMAC-SHA256 signatures
- Encrypted payloads using Fernet (AES 128)
- Token metadata storage in Redis with TTL
- Token revocation and refresh capabilities

**Token Types**:
- **Session Tokens**: User authentication (24h TTL)
- **Workspace Tokens**: Workspace-scoped access (12h TTL)
- **Exchange Tokens**: Service-to-service (5min TTL)

**Encryption Process**:
```python
# Create encrypted session token
fernet = Fernet(self._encryption_key)
encrypted_payload = fernet.encrypt(json.dumps(payload).encode())

# Create JWT with token reference
token = jwt.encode(
    {"jti": token_id, "type": "encrypted_session"},
    self.settings.jwt_secret_key,
    algorithm="HS256"
)

# Create integrity signature
signature = self._create_token_signature(token, encrypted_payload)
```

### 3. User-Agent Mapping

**Purpose**: Maps user context to agent execution with permission isolation.

**Security Features**:
- Workspace isolation enforcement
- Permission-based tool access control
- User context enrichment and validation
- Conversation context management

**Permission Model**:
```python
@dataclass
class AgentPermissions:
    agent_id: str
    workspace_id: str
    can_read: bool = False
    can_write: bool = False
    can_delete: bool = False
    can_manage: bool = False
```

### 4. Error Handling and Validation

**Purpose**: Comprehensive error handling with security monitoring.

**Security Features**:
- Input validation and sanitization
- Security event logging
- Rate limiting and lockout protection
- Suspicious activity detection

**Error Categories**:
- Authentication errors (invalid tokens, expired sessions)
- Authorization errors (insufficient permissions)
- Validation errors (malformed requests)
- Security events (suspicious activity, rate limits)

## Security Best Practices

### 1. Token Management

**Token Security**:
- Use strong, cryptographically secure random tokens
- Implement proper token expiration and refresh
- Store tokens securely with encryption
- Implement token revocation capabilities

**Implementation**:
```python
# Generate secure token ID
token_id = secrets.token_urlsafe(32)

# Derive encryption key using PBKDF2
key = hashlib.pbkdf2_hmac(
    'sha256',
    self.settings.jwt_secret_key.encode(),
    b'parlant_token_salt',
    100000,  # iterations
    32  # key length
)
```

### 2. Session Management

**Session Security**:
- Validate session expiration on every request
- Implement session invalidation across systems
- Use secure session storage (Redis with TTL)
- Monitor for concurrent session abuse

**Session Validation**:
```python
async def validate_session_expiry(self, session: SimSession) -> bool:
    current_time = datetime.utcnow()
    if current_time >= session.expires_at:
        # Invalidate session
        await self.invalidate_session(session.id)
        return False
    return True
```

### 3. Workspace Isolation

**Isolation Principles**:
- Strict workspace boundary enforcement
- User permission validation for each workspace
- Agent-to-workspace mapping validation
- Resource access control by workspace

**Validation Flow**:
```python
async def validate_workspace_access(
    self,
    session: SimSession,
    workspace_id: str
) -> bool:
    # Check user's workspace memberships
    user_workspaces = session.user.workspaces

    for workspace in user_workspaces:
        if workspace["id"] == workspace_id:
            # Validate permissions within workspace
            required_permissions = ["read"]
            user_permissions = workspace.get("permissions", [])
            return any(perm in user_permissions for perm in required_permissions)

    return False
```

### 4. Input Validation

**Validation Requirements**:
- Sanitize all user inputs
- Validate token formats and signatures
- Check parameter boundaries and types
- Prevent injection attacks

**Validation Examples**:
```python
class AuthenticationValidator:
    @staticmethod
    def validate_session_token(token: str) -> bool:
        if not token or not isinstance(token, str):
            return False

        # Check length and format
        if len(token) < 10 or len(token) > 2048:
            return False

        # Check for suspicious characters
        if any(char in token for char in [' ', '\n', '\r', '\t']):
            return False

        return True
```

### 5. Logging and Monitoring

**Security Logging**:
- Log all authentication attempts
- Monitor failed authentication patterns
- Track privilege escalation attempts
- Alert on suspicious activities

**Monitoring Implementation**:
```python
class SecurityMonitor:
    def record_failed_authentication(
        self,
        user_id: Optional[str],
        ip_address: str,
        error_code: AuthErrorCode
    ):
        # Record failed attempt
        attempt_data = {
            "user_id": user_id,
            "ip_address": ip_address,
            "error_code": error_code.value,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Log security event
        self.security_logger.warning(
            f"Failed authentication: {error_code.value}",
            extra=attempt_data
        )

        # Check for rate limiting
        if self._should_rate_limit(user_id or ip_address):
            self._apply_rate_limit(user_id or ip_address)
```

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/simdb
POSTGRES_URL=postgresql://user:pass@localhost/simdb  # Alternative for Vercel

# Authentication Configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-sim-app.com
NEXT_PUBLIC_APP_URL=https://your-sim-app.com

# JWT Configuration
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_KEY_PREFIX=parlant:

# Security Configuration
ENABLE_WORKSPACE_ISOLATION=true
MAX_AGENTS_PER_WORKSPACE=10
PARLANT_SESSION_TIMEOUT=3600

# CORS Configuration
ALLOWED_ORIGINS=https://your-sim-app.com,http://localhost:3000
```

### Development vs Production Configuration

**Development**:
```bash
DEBUG=true
PARLANT_LOG_LEVEL=DEBUG
JWT_EXPIRE_HOURS=1  # Shorter for testing
```

**Production**:
```bash
DEBUG=false
PARLANT_LOG_LEVEL=INFO
JWT_EXPIRE_HOURS=24
# Use secrets management for sensitive values
```

## Security Checklist

### Deployment Security

- [ ] All environment variables properly configured
- [ ] Database connections use SSL/TLS
- [ ] Redis connections secured with authentication
- [ ] CORS origins properly configured
- [ ] Rate limiting implemented and configured
- [ ] Logging configured for security monitoring
- [ ] Token encryption keys properly generated
- [ ] Session management tested end-to-end

### Runtime Security

- [ ] Authentication flows tested with valid tokens
- [ ] Authentication rejection tested with invalid tokens
- [ ] Workspace isolation verified
- [ ] Permission boundaries tested
- [ ] Token expiration handling verified
- [ ] Session invalidation working across systems
- [ ] Error handling doesn't leak sensitive information
- [ ] Security logging captures all relevant events

### Monitoring and Alerting

- [ ] Failed authentication rate monitoring
- [ ] Suspicious IP address detection
- [ ] Token usage anomaly detection
- [ ] Workspace access pattern monitoring
- [ ] Error rate threshold alerting
- [ ] Session duration monitoring
- [ ] Rate limiting effectiveness tracking

## Integration Testing

### Authentication Flow Test

```python
async def test_authentication_flow():
    # Test valid session token
    session = await auth_bridge.validate_session_token(valid_token)
    assert session is not None
    assert session.user.id == expected_user_id

    # Test invalid token
    invalid_session = await auth_bridge.validate_session_token(invalid_token)
    assert invalid_session is None

    # Test expired token
    expired_session = await auth_bridge.validate_session_token(expired_token)
    assert expired_session is None
```

### Workspace Isolation Test

```python
async def test_workspace_isolation():
    # User should have access to their workspace
    has_access = await auth_bridge.validate_workspace_access(
        session, user_workspace_id
    )
    assert has_access is True

    # User should not have access to other workspace
    no_access = await auth_bridge.validate_workspace_access(
        session, other_workspace_id
    )
    assert no_access is False
```

## Troubleshooting

### Common Issues

1. **Token validation failures**
   - Check Better Auth secret key configuration
   - Verify token format and expiration
   - Confirm Sim API connectivity

2. **Session inconsistencies**
   - Check Redis connection and TTL settings
   - Verify session synchronization
   - Confirm clock synchronization between services

3. **Workspace access denied**
   - Verify user workspace memberships
   - Check permission mapping logic
   - Confirm workspace ID format

4. **Performance issues**
   - Monitor Redis cache hit rates
   - Check token validation response times
   - Analyze database query performance

### Debugging Commands

```bash
# Check Redis connection
redis-cli ping

# Monitor authentication logs
tail -f /var/log/parlant/auth.log

# Test token validation endpoint
curl -H "Authorization: Bearer $TOKEN" \
     https://your-sim-app.com/api/auth/session

# Check workspace permissions
curl -H "Authorization: Bearer $TOKEN" \
     https://your-sim-app.com/api/v1/users/$USER_ID/workspaces
```

## Security Updates and Maintenance

### Regular Security Tasks

1. **Token Rotation**: Implement regular JWT secret rotation
2. **Cache Cleanup**: Monitor and clean expired session cache
3. **Log Review**: Regular security log analysis
4. **Dependency Updates**: Keep authentication libraries updated
5. **Permission Audit**: Regular review of user permissions and workspace access

### Incident Response

1. **Token Compromise**: Immediate token revocation and secret rotation
2. **Session Hijacking**: Session invalidation and user notification
3. **Permission Escalation**: User permission audit and remediation
4. **Rate Limiting Bypass**: Enhanced monitoring and blocking

This security guide provides comprehensive coverage of the authentication bridge security architecture. Regular review and updates ensure continued protection against evolving security threats.