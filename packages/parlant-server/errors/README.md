# Parlant Integration Error Handling System

A comprehensive error handling system for the Sim-Parlant integration, providing robust error management, monitoring, and security features.

## Features

- **Comprehensive Error Classification**: Structured error types for all integration points
- **Input Validation**: Schema validation for all API operations
- **Authentication & Authorization**: Secure error handling with rate limiting
- **Workspace Isolation**: Strict boundary enforcement with security monitoring
- **Connectivity Management**: Circuit breakers and retry logic for external services
- **Rate Limiting**: Adaptive rate limiting with abuse prevention
- **Monitoring & Analytics**: Real-time error tracking and performance metrics
- **Security-First Design**: No sensitive data leakage in error responses

## Quick Start

### Basic Setup

```python
from fastapi import FastAPI
from errors import setup_fastapi_error_handling

app = FastAPI()

# Initialize error handling for development
result = await setup_fastapi_error_handling(
    app=app,
    environment="development"
)
```

### Production Setup

```python
from errors import (
    setup_fastapi_error_handling,
    create_production_config
)

app = FastAPI()

# Production configuration with webhooks
webhook_urls = ["https://your-monitoring-service.com/webhooks/errors"]

result = await setup_fastapi_error_handling(
    app=app,
    environment="production",
    webhook_urls=webhook_urls
)
```

## Error Types

### Base Error Classes

```python
from errors import (
    ParlantValidationError,
    ParlantAuthenticationError,
    ParlantConnectivityError,
    ParlantWorkspaceIsolationError
)

# Validation error with field details
raise ParlantValidationError(
    message="Agent creation failed",
    error_code="INVALID_AGENT_DATA",
    field_errors={
        "name": ["Name is required"],
        "model_provider": ["Must be 'openai' or 'anthropic'"]
    }
)

# Workspace isolation error
raise ParlantWorkspaceIsolationError(
    message="Access denied to workspace",
    error_code="WORKSPACE_ACCESS_DENIED",
    attempted_workspace="ws_123",
    authorized_workspaces=["ws_456", "ws_789"]
)
```

## Input Validation

### Agent Creation Validation

```python
from errors import AgentValidator

# Validate agent creation data
try:
    validated_data = AgentValidator.validate_agent_creation({
        "name": "My Agent",
        "model_provider": "openai",
        "model_name": "gpt-4",
        "workspace_id": "ws_123",
        "temperature": 70
    })
except ParlantValidationError as e:
    # Handle validation errors
    print(f"Validation failed: {e.field_errors}")
```

### Custom Validation

```python
from errors import InputValidator

validator = InputValidator()

# Build validation rules
validator.field('email').required().email()
validator.field('age').type(int).range(18, 120)
validator.field('role').choices(['admin', 'user', 'guest'])

# Validate data
try:
    validated = validator.validate(user_data)
except ParlantValidationError as e:
    # Handle validation errors
    pass
```

## Authentication & Authorization

### Validate User Authentication

```python
from errors import validate_authentication, validate_workspace_authorization

# Check authentication with rate limiting
try:
    validate_authentication(
        session=user_session,
        ip_address=request_ip,
        context=error_context
    )
except ParlantAuthenticationError as e:
    # Handle authentication failure
    pass

# Check workspace access
try:
    validate_workspace_authorization(
        user_id="user_123",
        workspace_id="ws_456",
        user_workspaces=user.workspaces,
        context=error_context
    )
except ParlantWorkspaceIsolationError as e:
    # Handle workspace access denial
    pass
```

## Rate Limiting

### Check Rate Limits

```python
from errors import check_user_rate_limit, RateLimitScope

# Check user rate limit
result = await check_user_rate_limit(
    user_id="user_123",
    user_tier="premium",
    context=error_context
)

if not result.allowed:
    raise ParlantRateLimitError(
        message="Rate limit exceeded",
        error_code="RATE_LIMIT_EXCEEDED",
        limit=result.limit,
        remaining=result.remaining,
        reset_at=result.reset_at
    )
```

## Connectivity Management

### Make Requests with Circuit Breakers

```python
from errors import make_request

try:
    # Request with automatic retry and circuit breaker protection
    response = await make_request(
        service_name="parlant_server",
        method="POST",
        endpoint="/api/v1/agents",
        data=agent_data,
        context=error_context
    )
except ParlantConnectivityError as e:
    # Handle connectivity issues
    print(f"Service unavailable: {e.retry_after_seconds}s")
except ParlantCircuitBreakerError as e:
    # Handle circuit breaker open
    print(f"Circuit breaker open for {e.service_name}")
```

## Monitoring & Health Checks

### Get System Health

```python
from errors import get_error_handling_health

# Check overall system health
health = await get_error_handling_health()
print(f"System status: {health['status']}")
print(f"Error rates: {health['monitoring']['error_rates']}")
```

### Get Error Statistics

```python
from errors import get_comprehensive_error_stats

# Get detailed error statistics
stats = await get_comprehensive_error_stats()
print(f"Total errors: {stats['total_error_events']}")
print(f"Top errors: {stats['top_errors']}")
```

## Route Handler Integration

### Using Decorators

```python
from fastapi import APIRouter
from errors import handle_errors, ErrorCategory

router = APIRouter()

@router.post("/agents")
@handle_errors(error_category=ErrorCategory.AGENT_MANAGEMENT)
async def create_agent(agent_data: dict):
    # Your route implementation
    # Any unhandled exceptions are automatically converted to ParlantSystemError
    return {"status": "success"}
```

### Manual Error Handling

```python
from errors import create_error_response, ErrorContext

@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, request: Request):
    try:
        # Your logic here
        return agent_data
    except Exception as e:
        context = ErrorContext(
            endpoint=request.url.path,
            method=request.method,
            agent_id=agent_id
        )
        return create_error_response(e, request, context)
```

## Configuration

### Development Configuration

```python
from errors import create_development_config, initialize_error_handling

config = create_development_config()
result = await initialize_error_handling(app, config)
```

### Production Configuration

```python
from errors import create_production_config

config = create_production_config(
    webhook_urls=["https://alerts.example.com/webhook"]
)
result = await initialize_error_handling(app, config)
```

### Custom Configuration

```python
from errors import ErrorHandlingConfig

config = ErrorHandlingConfig(
    debug_mode=False,
    include_stack_traces=False,
    enable_metrics=True,
    enable_rate_limiting=True,
    enable_abuse_detection=True,
    monitoring_retention_hours=48,
    webhook_urls=["https://your-webhook.com"]
)
```

## Best Practices

### 1. Always Use Contexts

```python
# Create error context for better debugging
context = ErrorContext(
    user_id=user.id,
    workspace_id=workspace.id,
    endpoint=request.url.path,
    method=request.method,
    ip_address=request.client.host
)
```

### 2. Validate Early

```python
# Validate input at API boundaries
@router.post("/agents")
async def create_agent(request: Request):
    try:
        data = await request.json()
        validated_data = AgentValidator.validate_agent_creation(data)
        # Proceed with validated data
    except ParlantValidationError:
        # Validation errors are automatically handled
        raise
```

### 3. Use Appropriate Error Types

```python
# Use specific error types for better error handling
if not user.has_permission('create_agent'):
    raise ParlantAuthorizationError(
        message="Permission denied",
        error_code="INSUFFICIENT_PERMISSIONS",
        required_permissions=['create_agent']
    )
```

### 4. Monitor Error Patterns

```python
# Regular health checks
health = await get_error_handling_health()
if health['monitoring']['error_rates'].get('critical', 0) > 0:
    # Alert operations team
    send_alert("Critical errors detected")
```

## Security Considerations

- All error responses are sanitized to prevent information leakage
- Authentication failures are rate-limited by IP address
- Workspace isolation violations are logged as security events
- Abuse detection automatically blocks malicious actors
- Error details are only included in debug mode

## Testing

The error handling system includes special testing configuration:

```python
from errors import create_testing_config

# Minimal configuration for tests
config = create_testing_config()
await initialize_error_handling(app, config)
```

This disables rate limiting, circuit breakers, and detailed monitoring for faster test execution.

## Migration from Existing Error Handling

To integrate with existing error handling:

1. Install the error handling middleware
2. Replace existing validation with the validation system
3. Update error responses to use the new error classes
4. Configure monitoring and alerting
5. Test error scenarios thoroughly

The system is designed to be backwards compatible and can be gradually adopted.