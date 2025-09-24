"""
Sim-Parlant Authentication Integration
=====================================

This package provides a comprehensive authentication and authorization system
that bridges Sim's Better Auth with Parlant's agent framework.

Key Components:
- SimAuthBridge: Validates Sim sessions and extracts user context
- AuthenticationMiddleware: FastAPI middleware for request authentication
- SimParlantAuthorizationPolicy: Parlant-compatible authorization policy
- AuthManager: Centralized configuration and lifecycle management

Usage:
------

Basic Setup:
```python
from fastapi import FastAPI
from auth.config import initialize_auth_system, configure_fastapi_auth

app = FastAPI()

@app.on_event("startup")
async def startup():
    await initialize_auth_system()
    configure_fastapi_auth(app)
```

With Custom Configuration:
```python
from auth.config import AuthConfig, initialize_auth_system, configure_fastapi_auth

config = AuthConfig()
config.sim_base_url = "https://your-sim-instance.com"
config.development_mode = False

app = FastAPI()

@app.on_event("startup")
async def startup():
    await initialize_auth_system(config)
    configure_fastapi_auth(app)
```

Route Dependencies:
```python
from fastapi import Depends
from auth.middleware import get_current_session, require_workspace_access

@app.get("/api/v1/agents")
async def list_agents(session = Depends(get_current_session)):
    return {"user": session.user.email, "agents": [...]}

@app.get("/api/v1/workspaces/{workspace_id}/agents")
async def workspace_agents(
    workspace_id: str,
    session = Depends(lambda req: require_workspace_access(workspace_id, req))
):
    return {"workspace_agents": [...]}
```
"""

# Core authentication components
from .sim_auth_bridge import SimAuthBridge, SimSession, SimUser

# FastAPI middleware and dependencies
from .middleware import (
    AuthenticationMiddleware,
    auth_middleware,
    get_current_session,
    get_current_user,
    require_workspace_access,
    get_auth_bridge,
    set_auth_bridge,
)

# Parlant authorization integration
from .parlant_authorization import (
    SimParlantAuthorizationPolicy,
    EnhancedAuthorizationMiddleware,
    create_sim_parlant_authorization,
    get_user_context,
    require_subscription_plan,
)

# Configuration and lifecycle management
from .config import (
    AuthConfig,
    AuthManager,
    initialize_auth_system,
    get_auth_manager,
    cleanup_auth_system,
    configure_fastapi_auth,
    create_development_config,
    create_production_config,
    auth_health_check,
)

# Version and metadata
__version__ = "1.0.0"
__description__ = "Sim-Parlant Authentication Integration"

# Convenience exports for common use cases
__all__ = [
    # Core classes
    "SimAuthBridge",
    "SimSession",
    "SimUser",
    "AuthenticationMiddleware",
    "SimParlantAuthorizationPolicy",
    "AuthConfig",
    "AuthManager",

    # Middleware and dependencies
    "auth_middleware",
    "get_current_session",
    "get_current_user",
    "require_workspace_access",
    "get_user_context",
    "require_subscription_plan",

    # Lifecycle management
    "initialize_auth_system",
    "configure_fastapi_auth",
    "cleanup_auth_system",
    "auth_health_check",

    # Configuration helpers
    "create_development_config",
    "create_production_config",

    # Utilities
    "get_auth_bridge",
    "set_auth_bridge",
    "get_auth_manager",
]