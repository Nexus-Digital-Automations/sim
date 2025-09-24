# Developer Integration Guide

## Overview

This guide provides comprehensive instructions for developers to integrate with, extend, and customize the Sim-Parlant Integration Bridge. It covers best practices, code examples, and detailed workflows for common development scenarios.

## Getting Started

### Development Environment Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Docker (optional but recommended)
- Git

#### Clone and Setup
```bash
# Clone the repository
git clone https://github.com/sim/parlant-integration-bridge.git
cd parlant-integration-bridge

# Setup Python virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies

# Setup Node.js dependencies (for tooling)
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your local settings
```

#### Development Database Setup
```bash
# Start local PostgreSQL with Docker
docker-compose up -d postgres

# Run database migrations
python migrations/migrate.py

# Verify schema
python -c "
import asyncio
from database.init_schema import check_parlant_schema

async def main():
    status = await check_parlant_schema()
    print('Schema ready:', status['ready'])

asyncio.run(main())
"
```

#### Start Development Server
```bash
# Start the FastAPI development server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Or use the development script
python dev_server.py
```

### Development Tools

#### Code Quality Tools
```bash
# Format code with Black
black .

# Sort imports with isort
isort .

# Lint with flake8
flake8 .

# Type checking with mypy
mypy .

# Run all quality checks
make lint

# Auto-fix common issues
make format
```

#### Testing Tools
```bash
# Run unit tests
pytest tests/unit/

# Run integration tests
pytest tests/integration/

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/auth/test_sim_auth_bridge.py -v
```

## Architecture Extension Points

### 1. Custom Authentication Providers

#### Adding a New Auth Provider
```python
# auth/providers/custom_auth.py
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

class AuthProvider(ABC):
    """Base class for authentication providers."""

    @abstractmethod
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate authentication token and return user context."""
        pass

    @abstractmethod
    async def get_user_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        """Get list of workspaces for a user."""
        pass

class CustomAuthProvider(AuthProvider):
    """Custom authentication provider example."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get('api_key')
        self.base_url = config.get('base_url')

    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate token against custom auth system."""
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/validate",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )

            if response.status_code == 200:
                return response.json()
            return None

    async def get_user_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user workspaces from custom system."""
        # Implementation specific to your auth system
        return []

# Register the provider
from auth.middleware import register_auth_provider
register_auth_provider('custom', CustomAuthProvider)
```

#### Using Custom Auth Provider
```python
# config/settings.py
class Settings:
    # ... other settings
    auth_provider: str = "custom"  # Change from "sim"
    custom_auth_config: Dict[str, Any] = {
        "api_key": "your-api-key",
        "base_url": "https://your-auth-system.com/api"
    }
```

### 2. Custom Agent Implementations

#### Creating Custom Agent Types
```python
# agents/custom_agent.py
from typing import Dict, Any, List
from agents.base import BaseAgent

class CustomAgent(BaseAgent):
    """Custom agent implementation with specialized behavior."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.specialized_tools = config.get('specialized_tools', [])

    async def process_message(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process message with custom logic."""

        # Pre-processing
        processed_message = await self.preprocess_message(message, context)

        # Custom routing logic
        if self.should_use_specialized_tool(processed_message):
            response = await self.handle_with_specialized_tool(processed_message)
        else:
            response = await super().process_message(processed_message, context)

        # Post-processing
        final_response = await self.postprocess_response(response, context)

        return final_response

    async def preprocess_message(self, message: str, context: Dict[str, Any]) -> str:
        """Custom preprocessing logic."""
        # Example: Add context-specific prefixes
        workspace_name = context.get('workspace', {}).get('name', 'Unknown')
        return f"[Workspace: {workspace_name}] {message}"

    def should_use_specialized_tool(self, message: str) -> bool:
        """Determine if specialized tools should be used."""
        specialized_keywords = ['analyze', 'report', 'dashboard']
        return any(keyword in message.lower() for keyword in specialized_keywords)

    async def handle_with_specialized_tool(self, message: str) -> Dict[str, Any]:
        """Handle message with specialized tools."""
        # Implementation of specialized logic
        return {
            "content": "Processed with specialized tool",
            "metadata": {
                "tool_used": "specialized",
                "processing_time_ms": 150
            }
        }

# Register custom agent type
from agents.registry import register_agent_type
register_agent_type('custom', CustomAgent)
```

### 3. Tool System Extensions

#### Creating Custom Tools
```python
# tools/custom_tool.py
from typing import Dict, Any, Optional
from tools.base import BaseTool
from tools.registry import register_tool

@register_tool("custom_analytics")
class CustomAnalyticsTool(BaseTool):
    """Custom analytics tool for data processing."""

    name = "custom_analytics"
    description = "Analyze data and generate insights"
    parameters = {
        "data_source": {
            "type": "string",
            "description": "Source of data to analyze",
            "required": True
        },
        "analysis_type": {
            "type": "string",
            "enum": ["trend", "comparison", "summary"],
            "description": "Type of analysis to perform",
            "required": True
        }
    }

    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the analytics tool."""
        data_source = parameters.get("data_source")
        analysis_type = parameters.get("analysis_type")

        # Validate workspace access
        workspace_id = context.get("workspace_id")
        if not await self.validate_workspace_access(workspace_id):
            raise PermissionError(f"No access to workspace {workspace_id}")

        # Perform analysis
        result = await self.perform_analysis(data_source, analysis_type, workspace_id)

        return {
            "success": True,
            "result": result,
            "metadata": {
                "data_source": data_source,
                "analysis_type": analysis_type,
                "execution_time_ms": 500
            }
        }

    async def perform_analysis(self, data_source: str, analysis_type: str, workspace_id: str) -> Dict[str, Any]:
        """Perform the actual data analysis."""
        # Your custom analysis logic here
        return {
            "insights": ["Insight 1", "Insight 2"],
            "metrics": {"accuracy": 0.95, "confidence": 0.87},
            "visualizations": ["chart_url_1", "chart_url_2"]
        }

    async def validate_workspace_access(self, workspace_id: str) -> bool:
        """Validate access to workspace data."""
        # Your workspace validation logic
        return True
```

#### Tool Configuration and Guidelines
```python
# tools/guidelines.py
from typing import Dict, List

class ToolGuidelines:
    """Guidelines for tool usage within agent contexts."""

    @staticmethod
    def get_tool_guidelines(workspace_type: str) -> Dict[str, List[str]]:
        """Get tool usage guidelines based on workspace type."""
        guidelines = {
            "analytics": [
                "Always validate data source permissions before analysis",
                "Include confidence scores in analytical results",
                "Respect data privacy regulations and workspace boundaries",
                "Cache results appropriately to improve performance"
            ],
            "communication": [
                "Use professional tone in all communications",
                "Include proper attribution for generated content",
                "Respect rate limits and API quotas",
                "Log all external communications for audit purposes"
            ],
            "workflow": [
                "Maintain workflow state consistency",
                "Handle errors gracefully with proper rollback",
                "Provide clear progress indicators",
                "Enable user intervention at critical decision points"
            ]
        }

        return guidelines.get(workspace_type, [])

# Usage in agent configuration
def configure_agent_tools(agent_config: Dict[str, Any]) -> Dict[str, Any]:
    """Configure agent tools with appropriate guidelines."""
    workspace_type = agent_config.get('workspace_type', 'general')
    guidelines = ToolGuidelines.get_tool_guidelines(workspace_type)

    agent_config['tool_guidelines'] = guidelines
    return agent_config
```

### 4. Workspace Isolation Enhancements

#### Custom Isolation Policies
```python
# security/isolation.py
from typing import Dict, Any, List
from enum import Enum

class IsolationLevel(Enum):
    """Workspace isolation levels."""
    BASIC = "basic"
    STRICT = "strict"
    ENTERPRISE = "enterprise"

class WorkspaceIsolationManager:
    """Enhanced workspace isolation management."""

    def __init__(self, isolation_level: IsolationLevel = IsolationLevel.BASIC):
        self.isolation_level = isolation_level
        self.policies = self._load_isolation_policies()

    def _load_isolation_policies(self) -> Dict[str, Any]:
        """Load isolation policies based on level."""
        policies = {
            IsolationLevel.BASIC: {
                "data_access": ["own_workspace"],
                "api_limits": {"requests_per_minute": 100},
                "tool_restrictions": []
            },
            IsolationLevel.STRICT: {
                "data_access": ["own_workspace"],
                "api_limits": {"requests_per_minute": 50},
                "tool_restrictions": ["external_api", "file_system"],
                "audit_logging": True
            },
            IsolationLevel.ENTERPRISE: {
                "data_access": ["own_workspace"],
                "api_limits": {"requests_per_minute": 200},
                "tool_restrictions": [],
                "audit_logging": True,
                "encryption_at_rest": True,
                "data_retention_days": 90
            }
        }
        return policies.get(self.isolation_level, policies[IsolationLevel.BASIC])

    async def validate_data_access(
        self,
        user_id: str,
        workspace_id: str,
        requested_data: str
    ) -> bool:
        """Validate data access request against isolation policies."""

        # Check basic workspace access
        if not await self.has_workspace_access(user_id, workspace_id):
            return False

        # Apply policy-specific validations
        if self.isolation_level in [IsolationLevel.STRICT, IsolationLevel.ENTERPRISE]:
            # Additional validation for sensitive data
            if await self.is_sensitive_data(requested_data):
                return await self.validate_sensitive_access(user_id, requested_data)

        return True

    async def apply_rate_limits(self, user_id: str, workspace_id: str) -> bool:
        """Apply rate limiting based on isolation policy."""
        limits = self.policies.get("api_limits", {})
        requests_per_minute = limits.get("requests_per_minute", 100)

        current_usage = await self.get_current_usage(user_id, workspace_id)
        return current_usage < requests_per_minute

    async def audit_action(
        self,
        user_id: str,
        workspace_id: str,
        action: str,
        details: Dict[str, Any]
    ):
        """Audit user actions based on isolation policy."""
        if not self.policies.get("audit_logging", False):
            return

        audit_record = {
            "timestamp": "2024-01-01T12:00:00Z",
            "user_id": user_id,
            "workspace_id": workspace_id,
            "action": action,
            "details": details,
            "isolation_level": self.isolation_level.value
        }

        await self.store_audit_record(audit_record)

# Usage in middleware
from security.isolation import WorkspaceIsolationManager, IsolationLevel

isolation_manager = WorkspaceIsolationManager(IsolationLevel.ENTERPRISE)

async def enhanced_workspace_middleware(request, call_next):
    """Enhanced workspace isolation middleware."""
    user_id = request.state.user.id
    workspace_id = request.path_params.get("workspace_id")

    # Validate access
    if not await isolation_manager.validate_data_access(user_id, workspace_id, request.url.path):
        raise HTTPException(status_code=403, detail="Access denied")

    # Apply rate limits
    if not await isolation_manager.apply_rate_limits(user_id, workspace_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # Process request
    response = await call_next(request)

    # Audit action
    await isolation_manager.audit_action(
        user_id, workspace_id, request.method, {"path": request.url.path}
    )

    return response
```

## Best Practices

### 1. Error Handling Patterns

#### Structured Error Handling
```python
# errors/handlers.py
from typing import Dict, Any, Optional
from enum import Enum
import traceback
import logging

class ErrorCategory(Enum):
    """Error categories for structured handling."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"

class ParlantError(Exception):
    """Base exception for Parlant integration errors."""

    def __init__(
        self,
        message: str,
        category: ErrorCategory,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.details = details or {}
        self.cause = cause

class ErrorHandler:
    """Centralized error handling and reporting."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def handle_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle and format errors for API responses."""

        if isinstance(error, ParlantError):
            return self._handle_parlant_error(error, context)
        else:
            return self._handle_unexpected_error(error, context)

    def _handle_parlant_error(self, error: ParlantError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle known Parlant errors."""

        error_response = {
            "error": {
                "code": f"{error.category.value.upper()}_ERROR",
                "message": error.message,
                "category": error.category.value,
                "details": error.details,
                "timestamp": context.get("timestamp"),
                "request_id": context.get("request_id")
            }
        }

        # Log based on severity
        if error.category in [ErrorCategory.SYSTEM, ErrorCategory.DATABASE]:
            self.logger.error(f"Critical error: {error.message}", extra={
                "category": error.category.value,
                "details": error.details,
                "cause": str(error.cause) if error.cause else None
            })
        else:
            self.logger.warning(f"Application error: {error.message}", extra={
                "category": error.category.value,
                "details": error.details
            })

        return error_response

    def _handle_unexpected_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle unexpected errors."""

        error_id = context.get("request_id", "unknown")

        self.logger.error(f"Unexpected error [{error_id}]: {str(error)}", extra={
            "error_type": type(error).__name__,
            "traceback": traceback.format_exc()
        })

        return {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {
                    "error_id": error_id
                },
                "timestamp": context.get("timestamp"),
                "request_id": context.get("request_id")
            }
        }

# Usage examples
def validate_agent_creation(request_data: Dict[str, Any]):
    """Example of structured error handling."""

    if not request_data.get("name"):
        raise ParlantError(
            "Agent name is required",
            ErrorCategory.VALIDATION,
            details={"field": "name", "provided_value": request_data.get("name")}
        )

    if not request_data.get("workspace_id"):
        raise ParlantError(
            "Workspace ID is required",
            ErrorCategory.VALIDATION,
            details={"field": "workspace_id"}
        )

async def create_agent_with_error_handling(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Example of comprehensive error handling in agent creation."""

    error_handler = ErrorHandler()
    context = {
        "timestamp": "2024-01-01T12:00:00Z",
        "request_id": "req_123",
        "user_id": "user_456",
        "operation": "create_agent"
    }

    try:
        # Validation
        validate_agent_creation(request_data)

        # Business logic
        agent = await create_agent(request_data)

        return {"success": True, "agent": agent}

    except ParlantError as e:
        return error_handler.handle_error(e, context)
    except Exception as e:
        return error_handler.handle_error(e, context)
```

#### Circuit Breaker Pattern
```python
# resilience/circuit_breaker.py
import time
from enum import Enum
from typing import Callable, Any, Dict
from dataclasses import dataclass

class CircuitState(Enum):
    CLOSED = "closed"    # Normal operation
    OPEN = "open"        # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    recovery_timeout: int = 60
    success_threshold: int = 2

class CircuitBreaker:
    """Circuit breaker pattern implementation for external service calls."""

    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""

        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise ParlantError(
                    f"Circuit breaker {self.name} is OPEN",
                    ErrorCategory.EXTERNAL_SERVICE,
                    details={"state": self.state.value, "failure_count": self.failure_count}
                )

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result

        except Exception as e:
            self._on_failure()
            raise

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True
        return (time.time() - self.last_failure_time) >= self.config.recovery_timeout

    def _on_success(self):
        """Handle successful call."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self._reset()
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN

    def _reset(self):
        """Reset circuit breaker to closed state."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None

# Usage with external services
sim_api_breaker = CircuitBreaker("sim_api", CircuitBreakerConfig(
    failure_threshold=3,
    recovery_timeout=30,
    success_threshold=2
))

async def call_sim_api_with_protection(endpoint: str, **kwargs):
    """Call Sim API with circuit breaker protection."""
    return await sim_api_breaker.call(
        httpx_client.get, f"{SIM_BASE_URL}/{endpoint}", **kwargs
    )
```

### 2. Performance Optimization

#### Caching Strategies
```python
# caching/strategies.py
import json
import hashlib
from typing import Any, Optional, Dict, Callable
from datetime import datetime, timedelta
import asyncio

class CacheStrategy:
    """Base class for caching strategies."""

    async def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        raise NotImplementedError

    async def delete(self, key: str) -> bool:
        raise NotImplementedError

class MemoryCacheStrategy(CacheStrategy):
    """In-memory caching strategy."""

    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size

    async def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            entry = self.cache[key]
            if self._is_expired(entry):
                del self.cache[key]
                return None
            return entry['value']
        return None

    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        # Evict oldest entries if at capacity
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(),
                           key=lambda k: self.cache[k]['created_at'])
            del self.cache[oldest_key]

        entry = {
            'value': value,
            'created_at': datetime.now(),
            'ttl': ttl
        }
        self.cache[key] = entry
        return True

    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        if entry['ttl'] is None:
            return False
        return datetime.now() > entry['created_at'] + timedelta(seconds=entry['ttl'])

class CacheManager:
    """High-level cache management with different strategies."""

    def __init__(self, strategy: CacheStrategy):
        self.strategy = strategy

    def cache_key(self, prefix: str, **kwargs) -> str:
        """Generate consistent cache key from parameters."""
        key_data = json.dumps(kwargs, sort_keys=True)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    async def cached_call(
        self,
        func: Callable,
        cache_prefix: str,
        ttl: int = 300,
        **kwargs
    ) -> Any:
        """Execute function with caching."""

        cache_key = self.cache_key(cache_prefix, **kwargs)

        # Try cache first
        cached_result = await self.strategy.get(cache_key)
        if cached_result is not None:
            return cached_result

        # Execute function and cache result
        result = await func(**kwargs)
        await self.strategy.set(cache_key, result, ttl)

        return result

# Usage examples
cache_manager = CacheManager(MemoryCacheStrategy(max_size=1000))

async def get_user_workspaces_cached(user_id: str) -> List[Dict[str, Any]]:
    """Get user workspaces with caching."""
    return await cache_manager.cached_call(
        get_user_workspaces,
        "user_workspaces",
        ttl=300,  # 5 minutes
        user_id=user_id
    )

async def validate_session_cached(token: str) -> Optional[Dict[str, Any]]:
    """Validate session with caching."""
    return await cache_manager.cached_call(
        validate_session_token,
        "session_validation",
        ttl=60,  # 1 minute
        token=token
    )
```

#### Connection Pooling
```python
# database/pool_manager.py
import asyncio
import asyncpg
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

class DatabasePoolManager:
    """Enhanced database connection pooling."""

    def __init__(self, database_url: str, **pool_kwargs):
        self.database_url = database_url
        self.pool_kwargs = {
            'min_size': 5,
            'max_size': 20,
            'command_timeout': 10,
            'server_settings': {
                'application_name': 'parlant-server',
                'timezone': 'UTC'
            },
            **pool_kwargs
        }
        self.pool: Optional[asyncpg.Pool] = None
        self._pool_lock = asyncio.Lock()

    async def initialize(self):
        """Initialize the connection pool."""
        async with self._pool_lock:
            if self.pool is None:
                self.pool = await asyncpg.create_pool(
                    self.database_url,
                    **self.pool_kwargs
                )

    async def close(self):
        """Close the connection pool."""
        async with self._pool_lock:
            if self.pool is not None:
                await self.pool.close()
                self.pool = None

    @asynccontextmanager
    async def acquire_connection(self):
        """Acquire a database connection from the pool."""
        if self.pool is None:
            await self.initialize()

        async with self.pool.acquire() as connection:
            yield connection

    async def execute_query(self, query: str, *args) -> Any:
        """Execute a query using a pooled connection."""
        async with self.acquire_connection() as conn:
            return await conn.fetchval(query, *args)

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Fetch all rows from a query."""
        async with self.acquire_connection() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]

    async def execute_transaction(self, queries: List[tuple]):
        """Execute multiple queries in a transaction."""
        async with self.acquire_connection() as conn:
            async with conn.transaction():
                results = []
                for query, args in queries:
                    result = await conn.execute(query, *args)
                    results.append(result)
                return results

    async def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        if self.pool is None:
            return {"status": "not_initialized"}

        return {
            "size": self.pool.get_size(),
            "min_size": self.pool.get_min_size(),
            "max_size": self.pool.get_max_size(),
            "idle_connections": self.pool.get_idle_size(),
            "status": "healthy" if self.pool.get_size() > 0 else "unhealthy"
        }

# Global pool instance
db_pool = DatabasePoolManager(get_database_url())

# Usage in API endpoints
async def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
    """Get agent by ID using connection pool."""
    query = """
        SELECT id, name, description, workspace_id, created_at
        FROM parlant_agent
        WHERE id = $1
    """
    rows = await db_pool.fetch_all(query, agent_id)
    return rows[0] if rows else None
```

### 3. Testing Strategies

#### Unit Testing Patterns
```python
# tests/unit/test_auth_bridge.py
import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime, timedelta

from auth.sim_auth_bridge import SimAuthBridge, SimUser, SimSession
from config.settings import Settings

@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    return Settings(
        sim_base_url="http://localhost:3000",
        jwt_secret_key="test-secret",
        database_url="postgresql://test:test@localhost/test"
    )

@pytest.fixture
def auth_bridge(mock_settings):
    """Create auth bridge instance for testing."""
    return SimAuthBridge(mock_settings)

@pytest.fixture
def mock_session_data():
    """Mock session data from Sim API."""
    return {
        "user": {
            "id": "user_123",
            "name": "John Doe",
            "email": "john@example.com",
            "emailVerified": True,
            "image": None,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        "session": {
            "id": "session_456",
            "expiresAt": "2024-12-31T23:59:59Z",
            "ipAddress": "127.0.0.1",
            "userAgent": "test-agent",
            "activeOrganizationId": "org_789"
        }
    }

@pytest.mark.asyncio
async def test_validate_session_token_success(auth_bridge, mock_session_data):
    """Test successful session token validation."""

    with patch.object(auth_bridge, 'http_client') as mock_client:
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_session_data
        mock_client.get.return_value = mock_response

        # Mock get_user_workspaces
        with patch.object(auth_bridge, '_get_user_workspaces', return_value=[]):
            result = await auth_bridge.validate_session_token("valid_token")

        assert result is not None
        assert isinstance(result, SimSession)
        assert result.user.email == "john@example.com"
        assert result.id == "session_456"

@pytest.mark.asyncio
async def test_validate_session_token_invalid(auth_bridge):
    """Test invalid session token validation."""

    with patch.object(auth_bridge, 'http_client') as mock_client:
        # Mock 401 response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_client.get.return_value = mock_response

        result = await auth_bridge.validate_session_token("invalid_token")

        assert result is None

@pytest.mark.asyncio
async def test_validate_workspace_access_success(auth_bridge):
    """Test successful workspace access validation."""

    # Create mock session with workspace access
    user = SimUser(
        id="user_123",
        name="John Doe",
        email="john@example.com",
        email_verified=True,
        image=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        workspaces=[
            {
                "id": "workspace_1",
                "name": "Test Workspace",
                "role": "admin",
                "permissions": ["read", "write"]
            }
        ]
    )

    session = SimSession(
        id="session_456",
        user=user,
        expires_at=datetime.now() + timedelta(hours=1),
        token="test_token",
        ip_address="127.0.0.1",
        user_agent="test",
        active_organization_id="org_789"
    )

    result = await auth_bridge.validate_workspace_access(session, "workspace_1")
    assert result is True

@pytest.mark.asyncio
async def test_validate_workspace_access_denied(auth_bridge):
    """Test workspace access denial."""

    user = SimUser(
        id="user_123",
        name="John Doe",
        email="john@example.com",
        email_verified=True,
        image=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        workspaces=[]  # No workspaces
    )

    session = SimSession(
        id="session_456",
        user=user,
        expires_at=datetime.now() + timedelta(hours=1),
        token="test_token",
        ip_address="127.0.0.1",
        user_agent="test",
        active_organization_id=None
    )

    result = await auth_bridge.validate_workspace_access(session, "workspace_1")
    assert result is False

class TestSimAuthBridge:
    """Comprehensive test suite for SimAuthBridge."""

    @pytest.mark.asyncio
    async def test_session_caching(self, auth_bridge, mock_session_data):
        """Test session caching functionality."""

        with patch.object(auth_bridge, 'http_client') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_session_data
            mock_client.get.return_value = mock_response

            with patch.object(auth_bridge, '_get_user_workspaces', return_value=[]):
                # First call - should hit API
                result1 = await auth_bridge.validate_session_token("test_token")

                # Second call - should hit cache
                result2 = await auth_bridge.validate_session_token("test_token")

            # API should only be called once due to caching
            assert mock_client.get.call_count == 1
            assert result1.id == result2.id

    @pytest.mark.asyncio
    async def test_create_agent_session_context(self, auth_bridge):
        """Test agent session context creation."""

        user = SimUser(
            id="user_123",
            name="John Doe",
            email="john@example.com",
            email_verified=True,
            image=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            workspaces=[{"id": "workspace_1", "name": "Test", "role": "admin"}]
        )

        session = SimSession(
            id="session_456",
            user=user,
            expires_at=datetime.now() + timedelta(hours=1),
            token="test_token",
            ip_address="127.0.0.1",
            user_agent="test",
            active_organization_id="org_789"
        )

        context = await auth_bridge.create_agent_session_context(
            session, "workspace_1", "agent_1"
        )

        assert context["workspace_id"] == "workspace_1"
        assert context["agent_id"] == "agent_1"
        assert context["isolation_boundary"] == "workspace_1"
        assert "user_context" in context
```

#### Integration Testing
```python
# tests/integration/test_agent_api.py
import pytest
import httpx
from fastapi.testclient import TestClient

from main import app
from tests.fixtures import test_database, test_user_session

client = TestClient(app)

@pytest.mark.asyncio
async def test_create_agent_integration(test_database, test_user_session):
    """Integration test for agent creation."""

    agent_data = {
        "name": "Test Agent",
        "description": "Integration test agent",
        "workspace_id": "test_workspace_1",
        "guidelines": ["Be helpful"],
        "tools": ["search"],
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.7
    }

    response = client.post(
        "/api/v1/agents",
        json=agent_data,
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )

    assert response.status_code == 201

    response_data = response.json()
    assert response_data["name"] == "Test Agent"
    assert response_data["workspace_id"] == "test_workspace_1"
    assert "id" in response_data
    assert "created_at" in response_data

@pytest.mark.asyncio
async def test_agent_session_flow_integration(test_database, test_user_session):
    """Integration test for complete agent session flow."""

    # 1. Create agent
    agent_response = client.post(
        "/api/v1/agents",
        json={
            "name": "Session Test Agent",
            "workspace_id": "test_workspace_1",
            "description": "Agent for session testing"
        },
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )
    assert agent_response.status_code == 201
    agent_id = agent_response.json()["id"]

    # 2. Start session
    session_response = client.post(
        "/api/v1/agents/sessions",
        json={
            "agent_id": agent_id,
            "workspace_id": "test_workspace_1",
            "context": {"test": True}
        },
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["session_id"]

    # 3. Send message
    message_response = client.post(
        f"/api/v1/agents/sessions/{session_id}/messages",
        json={
            "content": "Hello, test message",
            "session_id": session_id,
            "message_type": "user"
        },
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )
    assert message_response.status_code == 201

    message_data = message_response.json()
    assert message_data["content"] == "Hello, test message"
    assert message_data["session_id"] == session_id

    # 4. Get messages
    messages_response = client.get(
        f"/api/v1/agents/sessions/{session_id}/messages",
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )
    assert messages_response.status_code == 200

    messages_data = messages_response.json()
    assert len(messages_data["messages"]) >= 1
    assert messages_data["messages"][0]["content"] == "Hello, test message"

    # 5. End session
    end_response = client.delete(
        f"/api/v1/agents/sessions/{session_id}",
        headers={"Authorization": f"Bearer {test_user_session.token}"}
    )
    assert end_response.status_code == 200
```

## Security Best Practices

### Input Validation and Sanitization
```python
# validation/security.py
import re
from typing import Any, Dict, List
from pydantic import BaseModel, validator

class SecureInputValidator:
    """Security-focused input validation."""

    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input."""
        if not isinstance(value, str):
            raise ValueError("Input must be string")

        # Remove null bytes
        value = value.replace('\x00', '')

        # Limit length
        if len(value) > max_length:
            raise ValueError(f"Input exceeds maximum length of {max_length}")

        # Basic HTML entity encoding for safety
        value = value.replace('<', '&lt;').replace('>', '&gt;')

        return value.strip()

    @staticmethod
    def validate_workspace_id(workspace_id: str) -> bool:
        """Validate workspace ID format."""
        pattern = r'^[a-zA-Z0-9_-]+$'
        return bool(re.match(pattern, workspace_id)) and len(workspace_id) <= 50

    @staticmethod
    def validate_agent_name(name: str) -> bool:
        """Validate agent name."""
        if not name or len(name) > 100:
            return False
        # Allow alphanumeric, spaces, hyphens, underscores
        pattern = r'^[a-zA-Z0-9\s\-_]+$'
        return bool(re.match(pattern, name))

class SecureAgentRequest(BaseModel):
    """Secure agent creation request with validation."""

    name: str
    description: str = None
    workspace_id: str
    guidelines: List[str] = []
    tools: List[str] = []

    @validator('name')
    def validate_name(cls, v):
        v = SecureInputValidator.sanitize_string(v, 100)
        if not SecureInputValidator.validate_agent_name(v):
            raise ValueError('Invalid agent name format')
        return v

    @validator('description')
    def validate_description(cls, v):
        if v is not None:
            v = SecureInputValidator.sanitize_string(v, 500)
        return v

    @validator('workspace_id')
    def validate_workspace(cls, v):
        v = SecureInputValidator.sanitize_string(v, 50)
        if not SecureInputValidator.validate_workspace_id(v):
            raise ValueError('Invalid workspace ID format')
        return v

    @validator('guidelines')
    def validate_guidelines(cls, v):
        if len(v) > 20:
            raise ValueError('Too many guidelines (max 20)')
        return [SecureInputValidator.sanitize_string(item, 200) for item in v]

    @validator('tools')
    def validate_tools(cls, v):
        if len(v) > 50:
            raise ValueError('Too many tools (max 50)')
        # Validate against allowed tools list
        allowed_tools = get_allowed_tools()  # Implementation specific
        for tool in v:
            if tool not in allowed_tools:
                raise ValueError(f'Tool {tool} is not allowed')
        return v
```

This comprehensive developer guide provides everything needed to integrate with, extend, and customize the Sim-Parlant Integration Bridge while following security best practices and maintaining code quality.