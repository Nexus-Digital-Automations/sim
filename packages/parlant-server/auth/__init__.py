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

# New workspace isolation system (Primary)
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from config.settings import Settings
except ImportError:
    Settings = None

from .workspace_isolation import WorkspaceIsolationManager, WorkspaceContext
from .agent_access_control import AgentAccessController, AccessRequest, AccessResult
from .permission_validator import PermissionValidator, PermissionResult
from .workspace_context import WorkspaceContextManager, OperationContext
from .session_isolation import SessionIsolationManager, IsolatedSession
from .security_measures import SecurityMonitor, SecurityMiddleware
from .integration_validator import WorkspaceIsolationValidator, ValidationReport

# Legacy authentication components (Maintained for compatibility)
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
try:
    from .parlant_authorization import (
        SimParlantAuthorizationPolicy,
        EnhancedAuthorizationMiddleware,
        create_sim_parlant_authorization,
        get_user_context,
        require_subscription_plan,
    )
except ImportError:
    # Handle case where parlant_authorization module doesn't exist
    SimParlantAuthorizationPolicy = None
    EnhancedAuthorizationMiddleware = None
    create_sim_parlant_authorization = None
    get_user_context = None
    require_subscription_plan = None

# Configuration and lifecycle management
try:
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
except ImportError:
    # Handle case where config module doesn't exist
    AuthConfig = None
    AuthManager = None
    initialize_auth_system = None
    get_auth_manager = None
    cleanup_auth_system = None
    configure_fastapi_auth = None
    create_development_config = None
    create_production_config = None
    auth_health_check = None


logger = logging.getLogger(__name__)


class WorkspaceIsolationSystem:
    """
    Complete workspace isolation system for Parlant agents.

    Integrates all isolation components into a cohesive system that can be
    easily initialized and integrated into the Parlant server application.
    """

    def __init__(self, db_session: Session, settings: Any):
        self.db_session = db_session
        self.settings = settings

        # Core components
        self.auth_bridge = SimAuthBridge(settings)
        self.isolation_manager = WorkspaceIsolationManager(settings)
        self.permission_validator = PermissionValidator(db_session)
        self.context_manager = WorkspaceContextManager(
            db_session,
            None,  # Will be set after isolation_manager is initialized
            self.permission_validator
        )
        self.access_controller = AgentAccessController(None, db_session)  # Will be set after initialization
        self.session_manager = SessionIsolationManager(db_session, self.context_manager)
        self.security_monitor = SecurityMonitor(db_session)
        self.integration_validator = None  # Will be initialized after all components

        # System state
        self._initialized = False
        self._startup_time = None

    async def initialize(self):
        """Initialize the complete workspace isolation system."""
        if self._initialized:
            logger.warning("Workspace isolation system already initialized")
            return

        logger.info("Initializing workspace isolation system...")
        self._startup_time = datetime.now()

        try:
            # Initialize auth bridge
            await self.auth_bridge.initialize()

            # Initialize isolation manager
            await self.isolation_manager.initialize(self.db_session)

            # Set up component dependencies
            self.context_manager.isolation_manager = self.isolation_manager
            self.access_controller.isolation_manager = self.isolation_manager

            # Initialize integration validator with all components
            self.integration_validator = WorkspaceIsolationValidator(
                self.db_session,
                self.isolation_manager,
                self.access_controller,
                self.permission_validator,
                self.context_manager,
                self.session_manager,
                self.security_monitor
            )

            self._initialized = True

            startup_duration = (datetime.now() - self._startup_time).total_seconds()
            logger.info(f"Workspace isolation system initialized successfully in {startup_duration:.3f}s")

        except Exception as e:
            logger.error(f"Failed to initialize workspace isolation system: {e}")
            raise RuntimeError(f"Workspace isolation initialization failed: {e}") from e

    async def shutdown(self):
        """Shutdown the workspace isolation system."""
        if not self._initialized:
            return

        logger.info("Shutting down workspace isolation system...")

        try:
            # Cleanup auth bridge
            await self.auth_bridge.cleanup()

            # Cleanup managers
            await self.isolation_manager.cleanup_expired_contexts()
            await self.session_manager.cleanup_expired_sessions()
            await self.security_monitor.cleanup_security_data()
            await self.context_manager.cleanup_expired_contexts()

            self._initialized = False
            logger.info("Workspace isolation system shut down successfully")

        except Exception as e:
            logger.error(f"Error during workspace isolation shutdown: {e}")

    def get_middleware(self) -> BaseHTTPMiddleware:
        """
        Get middleware for FastAPI integration.

        Returns:
            Configured middleware for workspace isolation
        """
        if not self._initialized:
            raise RuntimeError("System must be initialized before getting middleware")

        return WorkspaceIsolationMiddleware(self)

    async def create_workspace_context(
        self,
        session: SimSession,
        workspace_id: str,
        agent_id: Optional[str] = None
    ) -> WorkspaceContext:
        """
        Create workspace context for operations.

        Args:
            session: Authenticated session
            workspace_id: Target workspace
            agent_id: Optional agent ID

        Returns:
            WorkspaceContext for the operation
        """
        if not self._initialized:
            raise RuntimeError("System must be initialized before creating contexts")

        return await self.isolation_manager.create_workspace_context(
            session, workspace_id, agent_id
        )

    async def validate_agent_access(
        self,
        request: AccessRequest,
        session: SimSession
    ) -> AccessResult:
        """
        Validate agent access request.

        Args:
            request: Access request details
            session: Authenticated session

        Returns:
            AccessResult with validation outcome
        """
        if not self._initialized:
            raise RuntimeError("System must be initialized before validating access")

        return await self.access_controller.validate_agent_access(request, session)

    async def validate_workspace_isolation(
        self,
        workspace_id: str,
        user_id: str,
        session: SimSession
    ) -> ValidationReport:
        """
        Validate workspace isolation for a specific workspace.

        Args:
            workspace_id: Workspace to validate
            user_id: User context
            session: Authenticated session

        Returns:
            Validation report
        """
        if not self._initialized:
            raise RuntimeError("System must be initialized before validation")

        return await self.integration_validator.validate_complete_workspace_isolation(
            workspace_id, user_id, session
        )

    async def get_system_status(self) -> Dict[str, Any]:
        """
        Get comprehensive system status.

        Returns:
            System status information
        """
        if not self._initialized:
            return {
                'status': 'not_initialized',
                'initialized': False,
                'startup_time': None,
                'uptime': None
            }

        uptime = datetime.now() - self._startup_time if self._startup_time else None

        return {
            'status': 'operational',
            'initialized': True,
            'startup_time': self._startup_time.isoformat() if self._startup_time else None,
            'uptime': str(uptime) if uptime else None,
            'components': {
                'auth_bridge': {
                    'status': 'operational',
                    'cache_stats': self.auth_bridge.get_cache_stats()
                },
                'isolation_manager': {
                    'status': 'operational',
                    'active_contexts': len(self.isolation_manager._active_contexts)
                },
                'security_monitor': {
                    'status': 'operational',
                    'recent_events': len(self.security_monitor._security_events)
                },
                'session_manager': {
                    'status': 'operational',
                    'isolated_sessions': len(self.session_manager._isolated_sessions)
                }
            }
        }

    def is_initialized(self) -> bool:
        """Check if system is initialized."""
        return self._initialized


class WorkspaceIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that integrates workspace isolation into FastAPI requests.
    """

    def __init__(self, isolation_system: WorkspaceIsolationSystem):
        super().__init__(None)  # FastAPI will set the app
        self.isolation_system = isolation_system

    async def dispatch(self, request: Request, call_next):
        """Process request through workspace isolation system."""
        if not self.isolation_system.is_initialized():
            logger.error("Workspace isolation system not initialized")
            # Let request proceed but log warning
            return await call_next(request)

        # Apply security middleware first
        security_middleware = SecurityMiddleware(self.isolation_system.security_monitor)

        try:
            # Apply workspace isolation if session and workspace are available
            if hasattr(request.state, 'session') and hasattr(request.state, 'workspace_id'):
                session = request.state.session
                workspace_id = request.state.workspace_id

                # Create workspace context
                try:
                    workspace_context = await self.isolation_system.create_workspace_context(
                        session, workspace_id
                    )
                    request.state.workspace_context = workspace_context
                except Exception as e:
                    logger.error(f"Failed to create workspace context: {e}")
                    # Continue without context rather than failing

            # Process request
            response = await security_middleware(request, call_next)
            return response

        except Exception as e:
            logger.error(f"Workspace isolation middleware error: {e}")
            # Fail gracefully - allow request to proceed
            return await call_next(request)


# Convenience function for FastAPI integration
def setup_workspace_isolation(app: FastAPI, db_session: Session, settings: Any) -> WorkspaceIsolationSystem:
    """
    Set up workspace isolation for a FastAPI application.

    Args:
        app: FastAPI application instance
        db_session: Database session
        settings: Application settings

    Returns:
        Initialized WorkspaceIsolationSystem
    """
    isolation_system = WorkspaceIsolationSystem(db_session, settings)

    # Add startup and shutdown event handlers
    @app.on_event("startup")
    async def startup():
        await isolation_system.initialize()

    @app.on_event("shutdown")
    async def shutdown():
        await isolation_system.shutdown()

    # Add middleware
    app.add_middleware(WorkspaceIsolationMiddleware, isolation_system=isolation_system)

    # Add health check endpoint
    @app.get("/health/workspace-isolation")
    async def workspace_isolation_health():
        """Health check endpoint for workspace isolation system."""
        return await isolation_system.get_system_status()

    logger.info("Workspace isolation system configured for FastAPI application")
    return isolation_system


# Dependencies for FastAPI routes
from .workspace_context import get_operation_context, require_operation_context
from .workspace_isolation import require_workspace_permission

# Version and metadata
__version__ = "2.0.0"
__description__ = "Workspace Isolation Authentication System for Parlant"

# Export main components for direct access
__all__ = [
    # New Workspace Isolation System (Primary)
    'WorkspaceIsolationSystem',
    'WorkspaceIsolationMiddleware',
    'setup_workspace_isolation',

    # Core isolation components
    'WorkspaceIsolationManager',
    'AgentAccessController',
    'PermissionValidator',
    'WorkspaceContextManager',
    'SessionIsolationManager',
    'SecurityMonitor',
    'WorkspaceIsolationValidator',

    # Data classes
    'WorkspaceContext',
    'AccessRequest',
    'AccessResult',
    'PermissionResult',
    'OperationContext',
    'IsolatedSession',
    'ValidationReport',

    # Dependencies
    'get_workspace_context',
    'require_operation_context',
    'require_workspace_permission',

    # Legacy components (maintained for compatibility)
    "SimAuthBridge",
    "SimSession",
    "SimUser",
    "AuthenticationMiddleware",
    "SimParlantAuthorizationPolicy",
    "AuthConfig",
    "AuthManager",

    # Legacy middleware and dependencies
    "auth_middleware",
    "get_current_session",
    "get_current_user",
    "require_workspace_access",
    "get_user_context",
    "require_subscription_plan",

    # Legacy lifecycle management
    "initialize_auth_system",
    "configure_fastapi_auth",
    "cleanup_auth_system",
    "auth_health_check",

    # Legacy configuration helpers
    "create_development_config",
    "create_production_config",

    # Legacy utilities
    "get_auth_bridge",
    "set_auth_bridge",
    "get_auth_manager",
]