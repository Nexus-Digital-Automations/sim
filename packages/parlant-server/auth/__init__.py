"""
Workspace Isolation Authentication System for Parlant
=====================================================

This package provides comprehensive workspace-scoped isolation for Parlant agents,
ensuring that all operations respect workspace boundaries and prevent unauthorized
cross-workspace access.

Key Components:
- WorkspaceIsolationManager: Core isolation management
- AgentAccessController: Agent-specific access controls
- PermissionValidator: Permission validation system
- WorkspaceContextManager: Operation context management
- SessionIsolationManager: Session and conversation isolation
- SecurityMonitor: Security measures and threat detection
- IntegrationValidator: End-to-end validation system

Legacy Components (Maintained for Compatibility):
- SimAuthBridge: Validates Sim sessions and extracts user context
- AuthenticationMiddleware: FastAPI middleware for request authentication
- SimParlantAuthorizationPolicy: Parlant-compatible authorization policy
- AuthManager: Centralized configuration and lifecycle management

Usage:
------

New Workspace Isolation System:
```python
from auth import WorkspaceIsolationSystem, setup_workspace_isolation

app = FastAPI()

@app.on_event("startup")
async def startup():
    isolation_system = setup_workspace_isolation(app, db_session, settings)
```

Legacy System (Deprecated but Supported):
```python
from fastapi import FastAPI
from auth.config import initialize_auth_system, configure_fastapi_auth

app = FastAPI()

@app.on_event("startup")
async def startup():
    await initialize_auth_system()
    configure_fastapi_auth(app)
```

Workspace Context Usage:
```python
from fastapi import Depends
from auth import get_workspace_context, require_workspace_permission

@app.get("/api/v1/workspaces/{workspace_id}/agents")
async def list_agents(
    workspace_id: str,
    context = Depends(require_workspace_permission('read'))
):
    return {"agents": [...]}
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