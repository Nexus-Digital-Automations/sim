"""
Authentication System Initialization
Integrates all authentication components for Parlant server
"""

import asyncio
import logging
import os
from typing import Optional

from config.settings import Settings
from auth.sim_auth_bridge import SimAuthBridge
from auth.enhanced_middleware import set_auth_bridge, EnhancedAuthenticationMiddleware
from auth.rate_limiter import get_rate_limiter, RateLimiter
from auth.audit_logger import get_audit_logger, AuditLogger
from auth.security_utils import get_session_manager, SessionManager, WorkspaceTokenManager

logger = logging.getLogger(__name__)


class AuthenticationSystem:
    """
    Centralized authentication system manager.

    Coordinates all authentication components:
    - Sim authentication bridge
    - Rate limiting
    - Audit logging
    - Session management
    - Security utilities
    """

    def __init__(self, settings: Settings):
        self.settings = settings

        # Core components
        self.auth_bridge: Optional[SimAuthBridge] = None
        self.rate_limiter: Optional[RateLimiter] = None
        self.audit_logger: Optional[AuditLogger] = None
        self.session_manager: Optional[SessionManager] = None
        self.workspace_token_manager: Optional[WorkspaceTokenManager] = None

        # Component status
        self.is_initialized = False
        self.initialization_errors = []

    async def initialize(self) -> bool:
        """
        Initialize all authentication components.

        Returns:
            True if initialization successful, False otherwise
        """
        logger.info("🔒 Initializing Enhanced Authentication System")

        try:
            # 1. Initialize Sim Authentication Bridge
            await self._init_auth_bridge()

            # 2. Initialize Rate Limiter
            await self._init_rate_limiter()

            # 3. Initialize Audit Logger
            await self._init_audit_logger()

            # 4. Initialize Session Manager
            await self._init_session_manager()

            # 5. Initialize Workspace Token Manager
            await self._init_workspace_token_manager()

            # 6. Set global instances
            self._set_global_instances()

            # 7. Start background tasks
            await self._start_background_tasks()

            if not self.initialization_errors:
                self.is_initialized = True
                logger.info("✅ Authentication system initialized successfully")
                await self._log_system_startup()
                return True
            else:
                logger.error(f"❌ Authentication system initialization failed with {len(self.initialization_errors)} errors")
                for error in self.initialization_errors:
                    logger.error(f"   - {error}")
                return False

        except Exception as e:
            logger.error(f"❌ Critical error during authentication system initialization: {e}")
            self.initialization_errors.append(f"Critical initialization error: {e}")
            return False

    async def _init_auth_bridge(self):
        """Initialize Sim authentication bridge."""
        try:
            logger.info("Initializing Sim Authentication Bridge...")
            self.auth_bridge = SimAuthBridge(self.settings)
            await self.auth_bridge.initialize()
            logger.info("✅ Sim Authentication Bridge initialized")
        except Exception as e:
            error_msg = f"Failed to initialize Sim Authentication Bridge: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    async def _init_rate_limiter(self):
        """Initialize rate limiter."""
        try:
            logger.info("Initializing Rate Limiter...")
            self.rate_limiter = get_rate_limiter()

            # Configure custom rules if specified in settings
            if hasattr(self.settings, 'rate_limit_rules'):
                for rule_name, rule_config in self.settings.rate_limit_rules.items():
                    from auth.rate_limiter import RateLimitRule
                    rule = RateLimitRule(
                        requests_per_window=rule_config['requests_per_window'],
                        window_seconds=rule_config['window_seconds'],
                        block_duration_seconds=rule_config.get('block_duration_seconds', 0),
                        rule_name=rule_name
                    )
                    self.rate_limiter.add_rule(rule_name, rule)

            logger.info("✅ Rate Limiter initialized")
        except Exception as e:
            error_msg = f"Failed to initialize Rate Limiter: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    async def _init_audit_logger(self):
        """Initialize audit logger."""
        try:
            logger.info("Initializing Audit Logger...")

            # Configure audit log file path
            log_dir = getattr(self.settings, 'audit_log_dir', '/tmp/parlant/audit')
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, 'parlant_audit.jsonl')

            self.audit_logger = AuditLogger(
                log_file_path=log_file,
                enable_console_output=getattr(self.settings, 'audit_console_output', True),
                batch_size=getattr(self.settings, 'audit_batch_size', 100),
                flush_interval_seconds=getattr(self.settings, 'audit_flush_interval', 60)
            )

            logger.info(f"✅ Audit Logger initialized (log file: {log_file})")
        except Exception as e:
            error_msg = f"Failed to initialize Audit Logger: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    async def _init_session_manager(self):
        """Initialize session manager."""
        try:
            logger.info("Initializing Session Manager...")

            secret_key = self.settings.jwt_secret_key
            if not secret_key:
                raise ValueError("JWT secret key not configured")

            self.session_manager = get_session_manager(secret_key)
            logger.info("✅ Session Manager initialized")
        except Exception as e:
            error_msg = f"Failed to initialize Session Manager: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    async def _init_workspace_token_manager(self):
        """Initialize workspace token manager."""
        try:
            logger.info("Initializing Workspace Token Manager...")

            secret_key = self.settings.jwt_secret_key
            if not secret_key:
                raise ValueError("JWT secret key not configured")

            self.workspace_token_manager = WorkspaceTokenManager(secret_key)
            logger.info("✅ Workspace Token Manager initialized")
        except Exception as e:
            error_msg = f"Failed to initialize Workspace Token Manager: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    def _set_global_instances(self):
        """Set global instances for middleware and dependencies."""
        if self.auth_bridge:
            set_auth_bridge(self.auth_bridge)
            logger.debug("Set global auth bridge instance")

    async def _start_background_tasks(self):
        """Start background tasks for maintenance."""
        try:
            # Start session cleanup task
            if self.session_manager:
                asyncio.create_task(self._session_cleanup_worker())
                logger.debug("Started session cleanup background task")

        except Exception as e:
            error_msg = f"Failed to start background tasks: {e}"
            logger.error(error_msg)
            self.initialization_errors.append(error_msg)

    async def _session_cleanup_worker(self):
        """Background worker for session cleanup."""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                if self.session_manager:
                    await self.session_manager.cleanup_expired_tokens()
                    logger.debug("Completed session cleanup")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in session cleanup worker: {e}")

    async def _log_system_startup(self):
        """Log system startup event."""
        if self.audit_logger:
            from auth.audit_logger import AuditEvent, AuditEventType, AuditSeverity
            from datetime import datetime
            import uuid

            startup_event = AuditEvent(
                event_id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                event_type=AuditEventType.SESSION_CREATED,  # Closest available type
                severity=AuditSeverity.LOW,
                metadata={
                    "system_startup": True,
                    "components": {
                        "auth_bridge": self.auth_bridge is not None,
                        "rate_limiter": self.rate_limiter is not None,
                        "audit_logger": self.audit_logger is not None,
                        "session_manager": self.session_manager is not None,
                        "workspace_token_manager": self.workspace_token_manager is not None
                    }
                }
            )

            await self.audit_logger.log_event(startup_event)

    async def shutdown(self):
        """Shutdown all authentication components gracefully."""
        logger.info("🔒 Shutting down Authentication System")

        shutdown_errors = []

        try:
            # Shutdown components in reverse order
            if self.workspace_token_manager:
                # Workspace token manager doesn't need explicit shutdown
                pass

            if self.session_manager:
                # Session manager doesn't need explicit shutdown
                logger.info("Session manager shut down")

            if self.audit_logger:
                await self.audit_logger.shutdown()
                logger.info("Audit logger shut down")

            if self.rate_limiter:
                await self.rate_limiter.shutdown()
                logger.info("Rate limiter shut down")

            if self.auth_bridge:
                await self.auth_bridge.cleanup()
                logger.info("Sim auth bridge shut down")

        except Exception as e:
            error_msg = f"Error during shutdown: {e}"
            logger.error(error_msg)
            shutdown_errors.append(error_msg)

        if shutdown_errors:
            logger.warning(f"Authentication system shutdown completed with {len(shutdown_errors)} errors")
        else:
            logger.info("✅ Authentication system shutdown completed successfully")

    def get_system_status(self) -> dict:
        """Get status of all authentication components."""
        return {
            "system_initialized": self.is_initialized,
            "initialization_errors": self.initialization_errors,
            "components": {
                "auth_bridge": {
                    "initialized": self.auth_bridge is not None,
                    "status": "healthy" if self.auth_bridge else "not_initialized"
                },
                "rate_limiter": {
                    "initialized": self.rate_limiter is not None,
                    "stats": self.rate_limiter.get_stats() if self.rate_limiter else None
                },
                "audit_logger": {
                    "initialized": self.audit_logger is not None,
                    "stats": self.audit_logger.get_stats() if self.audit_logger else None
                },
                "session_manager": {
                    "initialized": self.session_manager is not None,
                    "stats": self.session_manager.get_session_stats() if self.session_manager else None
                },
                "workspace_token_manager": {
                    "initialized": self.workspace_token_manager is not None
                }
            }
        }

    def get_health_check(self) -> dict:
        """Get health check information for monitoring."""
        status = self.get_system_status()

        # Determine overall health
        healthy = (
            self.is_initialized and
            not self.initialization_errors and
            all(comp["initialized"] for comp in status["components"].values())
        )

        return {
            "healthy": healthy,
            "status": "healthy" if healthy else "unhealthy",
            "components": {
                name: {
                    "status": "healthy" if comp["initialized"] else "unhealthy"
                }
                for name, comp in status["components"].items()
            },
            "errors": self.initialization_errors if not healthy else []
        }


# Global authentication system instance
_auth_system: Optional[AuthenticationSystem] = None


async def initialize_auth_system(settings: Settings) -> AuthenticationSystem:
    """
    Initialize the global authentication system.

    Args:
        settings: Application settings

    Returns:
        Initialized authentication system
    """
    global _auth_system

    if _auth_system is None:
        _auth_system = AuthenticationSystem(settings)
        success = await _auth_system.initialize()

        if not success:
            raise RuntimeError("Failed to initialize authentication system")

    return _auth_system


def get_auth_system() -> Optional[AuthenticationSystem]:
    """Get the global authentication system instance."""
    return _auth_system


async def shutdown_auth_system():
    """Shutdown the global authentication system."""
    global _auth_system

    if _auth_system:
        await _auth_system.shutdown()
        _auth_system = None


# FastAPI integration helpers
def create_auth_middleware(settings: Settings):
    """
    Create authentication middleware for FastAPI application.

    Args:
        settings: Application settings

    Returns:
        Middleware function for FastAPI
    """
    async def auth_middleware_wrapper(request, call_next):
        auth_system = get_auth_system()
        if not auth_system or not auth_system.is_initialized:
            # Fallback to basic auth if enhanced system not available
            logger.warning("Enhanced auth system not available, using basic auth")
            from auth.middleware import auth_middleware
            return await auth_middleware(request, call_next)

        # Use enhanced middleware
        from auth.enhanced_middleware import enhanced_auth_middleware
        return await enhanced_auth_middleware(request, call_next)

    return auth_middleware_wrapper


def get_auth_dependencies():
    """
    Get FastAPI dependencies for authentication.

    Returns:
        Dictionary of dependency functions
    """
    from auth.enhanced_middleware import (
        get_current_session, get_current_user,
        get_request_context, require_workspace_access
    )

    return {
        "current_session": get_current_session,
        "current_user": get_current_user,
        "request_context": get_request_context,
        "require_workspace_access": require_workspace_access
    }


# Configuration validation
def validate_auth_config(settings: Settings) -> list:
    """
    Validate authentication configuration.

    Args:
        settings: Application settings

    Returns:
        List of configuration errors (empty if valid)
    """
    errors = []

    # Check required settings
    if not hasattr(settings, 'jwt_secret_key') or not settings.jwt_secret_key:
        errors.append("JWT secret key not configured")

    if not hasattr(settings, 'sim_base_url') or not settings.get_sim_base_url():
        errors.append("Sim base URL not configured")

    # Check JWT secret key strength
    if hasattr(settings, 'jwt_secret_key') and settings.jwt_secret_key:
        if len(settings.jwt_secret_key) < 32:
            errors.append("JWT secret key should be at least 32 characters long")

    # Validate audit log configuration
    if hasattr(settings, 'audit_log_dir'):
        try:
            os.makedirs(settings.audit_log_dir, exist_ok=True)
        except Exception as e:
            errors.append(f"Cannot create audit log directory: {e}")

    return errors