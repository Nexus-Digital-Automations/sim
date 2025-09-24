#!/usr/bin/env python3
"""
Authentication Configuration for Sim-Parlant Integration
=======================================================

This module provides configuration utilities for setting up the complete
authentication and authorization system for the Parlant server integration
with Sim's existing infrastructure.

Key Features:
- Centralized configuration management
- Environment-based settings
- Authentication component initialization
- Integration with FastAPI applications
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.sim_auth_bridge import SimAuthBridge
from auth.middleware import AuthenticationMiddleware, set_auth_bridge
from auth.parlant_authorization import (
    SimParlantAuthorizationPolicy,
    EnhancedAuthorizationMiddleware,
    create_sim_parlant_authorization,
)

# Configure logging
logger = logging.getLogger(__name__)


class AuthConfig:
    """
    Configuration class for authentication and authorization settings.

    This class centralizes all authentication-related configuration and
    provides sensible defaults for different deployment environments.
    """

    def __init__(self):
        """Initialize authentication configuration from environment variables."""
        # Sim integration settings
        self.sim_base_url = os.getenv("SIM_BASE_URL", "http://localhost:3000")
        self.sim_api_timeout = float(os.getenv("SIM_API_TIMEOUT", "30.0"))

        # JWT settings (for potential JWT validation)
        self.jwt_secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_token_expire_minutes = int(os.getenv("JWT_TOKEN_EXPIRE_MINUTES", "30"))

        # Session caching
        self.session_cache_ttl_minutes = int(os.getenv("SESSION_CACHE_TTL_MINUTES", "5"))

        # Rate limiting settings
        self.rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
        self.rate_limit_storage = os.getenv("RATE_LIMIT_STORAGE", "memory")  # "memory" or "redis"
        self.redis_url = os.getenv("REDIS_URL")  # For distributed rate limiting

        # Security settings
        self.security_headers_enabled = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"
        self.cors_enabled = os.getenv("CORS_ENABLED", "true").lower() == "true"
        self.cors_origins = self._parse_cors_origins()

        # Development/production mode
        self.development_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
        self.debug_headers = os.getenv("DEBUG_HEADERS_ENABLED", "false").lower() == "true"

        # Logging
        self.auth_log_level = os.getenv("AUTH_LOG_LEVEL", "INFO")

        # Database settings (for subscription lookups)
        self.database_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

        # Subscription plan defaults
        self.default_subscription_plan = os.getenv("DEFAULT_SUBSCRIPTION_PLAN", "free")

    def _parse_cors_origins(self) -> list:
        """Parse CORS origins from environment variable."""
        cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
        if not cors_origins_str:
            return []

        origins = []
        for origin in cors_origins_str.split(","):
            origin = origin.strip()
            if origin:
                origins.append(origin)

        return origins

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary for logging/debugging."""
        return {
            "sim_base_url": self.sim_base_url,
            "sim_api_timeout": self.sim_api_timeout,
            "jwt_algorithm": self.jwt_algorithm,
            "jwt_token_expire_minutes": self.jwt_token_expire_minutes,
            "session_cache_ttl_minutes": self.session_cache_ttl_minutes,
            "rate_limit_enabled": self.rate_limit_enabled,
            "rate_limit_storage": self.rate_limit_storage,
            "security_headers_enabled": self.security_headers_enabled,
            "cors_enabled": self.cors_enabled,
            "cors_origins": self.cors_origins,
            "development_mode": self.development_mode,
            "debug_headers": self.debug_headers,
            "auth_log_level": self.auth_log_level,
            "default_subscription_plan": self.default_subscription_plan,
            # Redact sensitive values
            "jwt_secret_key": "***REDACTED***",
            "database_url": "***REDACTED***" if self.database_url else None,
            "redis_url": "***REDACTED***" if self.redis_url else None,
        }


class AuthManager:
    """
    Manager class for authentication and authorization components.

    This class handles the initialization, configuration, and lifecycle
    management of all authentication-related components.
    """

    def __init__(self, config: Optional[AuthConfig] = None):
        """
        Initialize authentication manager.

        Args:
            config: Authentication configuration (will create default if not provided)
        """
        self.config = config or AuthConfig()
        self.auth_bridge: Optional[SimAuthBridge] = None
        self.authorization_policy: Optional[SimParlantAuthorizationPolicy] = None
        self.initialized = False

    async def initialize(self) -> None:
        """Initialize all authentication components."""
        if self.initialized:
            logger.warning("AuthManager already initialized")
            return

        logger.info("Initializing Sim-Parlant authentication system")
        logger.debug(f"Auth configuration: {self.config.to_dict()}")

        try:
            # Initialize Sim authentication bridge
            settings = self._create_sim_settings()
            self.auth_bridge = SimAuthBridge(settings)
            await self.auth_bridge.initialize()

            # Set global auth bridge for middleware
            set_auth_bridge(self.auth_bridge)

            # Initialize authorization policy
            self.authorization_policy = create_sim_parlant_authorization(self.auth_bridge)

            self.initialized = True
            logger.info("✅ Sim-Parlant authentication system initialized successfully")

        except Exception as e:
            logger.error(f"❌ Failed to initialize authentication system: {e}")
            await self.cleanup()
            raise

    async def cleanup(self) -> None:
        """Cleanup authentication components."""
        logger.info("Cleaning up Sim-Parlant authentication system")

        if self.auth_bridge:
            await self.auth_bridge.cleanup()
            self.auth_bridge = None

        self.authorization_policy = None
        self.initialized = False

        logger.info("Authentication system cleanup completed")

    def configure_fastapi_app(self, app: FastAPI) -> None:
        """
        Configure FastAPI application with authentication and authorization.

        Args:
            app: FastAPI application instance
        """
        if not self.initialized:
            raise RuntimeError("AuthManager must be initialized before configuring FastAPI app")

        logger.info("Configuring FastAPI app with Sim-Parlant authentication")

        # Configure CORS if enabled
        if self.config.cors_enabled:
            app.add_middleware(
                CORSMiddleware,
                allow_origins=self.config.cors_origins,
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            logger.info(f"CORS enabled for origins: {self.config.cors_origins}")

        # Add authentication middleware
        app.add_middleware(AuthenticationMiddleware, auth_bridge=self.auth_bridge)
        logger.info("Authentication middleware added")

        # Add enhanced authorization middleware if security headers are enabled
        if self.config.security_headers_enabled:
            enhanced_middleware = EnhancedAuthorizationMiddleware(app, self.authorization_policy)
            app.middleware("http")(enhanced_middleware)
            logger.info("Enhanced authorization middleware added")

        # Configure for Parlant integration
        if hasattr(app, "authorization_policy"):
            app.authorization_policy = self.authorization_policy
            logger.info("Parlant authorization policy configured")

    def _create_sim_settings(self):
        """Create settings object for SimAuthBridge."""
        # This creates a simple settings object that SimAuthBridge expects
        # In a real implementation, this would be your actual Settings class
        class Settings:
            def __init__(self, config: AuthConfig):
                self.jwt_secret_key = config.jwt_secret_key
                self.jwt_algorithm = config.jwt_algorithm
                self.sim_base_url = config.sim_base_url
                self.sim_api_timeout = config.sim_api_timeout
                self.database_url = config.database_url

            def get_sim_base_url(self) -> str:
                return self.sim_base_url

        return Settings(self.config)

    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of authentication system."""
        if not self.initialized:
            return {
                "status": "not_initialized",
                "components": {
                    "auth_bridge": "not_initialized",
                    "authorization_policy": "not_initialized",
                }
            }

        # Get auth bridge cache stats
        cache_stats = {}
        if self.auth_bridge:
            try:
                cache_stats = self.auth_bridge.get_cache_stats()
            except Exception as e:
                logger.warning(f"Failed to get cache stats: {e}")
                cache_stats = {"error": str(e)}

        return {
            "status": "healthy",
            "components": {
                "auth_bridge": "healthy" if self.auth_bridge else "error",
                "authorization_policy": "healthy" if self.authorization_policy else "error",
            },
            "cache_stats": cache_stats,
            "config": {
                "development_mode": self.config.development_mode,
                "rate_limit_enabled": self.config.rate_limit_enabled,
                "security_headers_enabled": self.config.security_headers_enabled,
            }
        }


# Global auth manager instance
_auth_manager: Optional[AuthManager] = None


async def initialize_auth_system(config: Optional[AuthConfig] = None) -> AuthManager:
    """
    Initialize the global authentication system.

    Args:
        config: Authentication configuration

    Returns:
        AuthManager: Initialized authentication manager
    """
    global _auth_manager

    if _auth_manager is not None:
        logger.warning("Authentication system already initialized")
        return _auth_manager

    _auth_manager = AuthManager(config)
    await _auth_manager.initialize()

    return _auth_manager


def get_auth_manager() -> Optional[AuthManager]:
    """Get the global authentication manager."""
    return _auth_manager


async def cleanup_auth_system():
    """Cleanup the global authentication system."""
    global _auth_manager

    if _auth_manager:
        await _auth_manager.cleanup()
        _auth_manager = None


def configure_fastapi_auth(app: FastAPI, config: Optional[AuthConfig] = None) -> None:
    """
    One-liner to configure FastAPI app with Sim-Parlant authentication.

    Args:
        app: FastAPI application
        config: Optional authentication configuration

    Example:
        from auth.config import configure_fastapi_auth

        app = FastAPI()

        @app.on_event("startup")
        async def startup():
            configure_fastapi_auth(app)
    """
    if not _auth_manager:
        raise RuntimeError(
            "Authentication system not initialized. Call initialize_auth_system() first."
        )

    _auth_manager.configure_fastapi_app(app)


# Convenience functions for common use cases
def create_development_config() -> AuthConfig:
    """Create development-friendly authentication configuration."""
    config = AuthConfig()
    config.development_mode = True
    config.debug_headers = True
    config.auth_log_level = "DEBUG"
    config.rate_limit_enabled = False  # Disable rate limiting in development
    config.security_headers_enabled = False  # Relaxed security for development

    return config


def create_production_config() -> AuthConfig:
    """Create production-ready authentication configuration."""
    config = AuthConfig()
    config.development_mode = False
    config.debug_headers = False
    config.auth_log_level = "WARNING"
    config.rate_limit_enabled = True
    config.security_headers_enabled = True

    # Ensure critical settings are configured for production
    if not config.database_url:
        raise ValueError("DATABASE_URL is required for production")

    if config.jwt_secret_key == "your-secret-key":
        raise ValueError("JWT_SECRET_KEY must be set to a secure value for production")

    return config


# Health check endpoint helper
async def auth_health_check() -> Dict[str, Any]:
    """
    Convenience function for health check endpoints.

    Returns:
        Dict containing health status of authentication system
    """
    auth_manager = get_auth_manager()
    if not auth_manager:
        return {
            "status": "unhealthy",
            "error": "Authentication system not initialized"
        }

    return auth_manager.get_health_status()