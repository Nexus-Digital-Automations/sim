"""
Error Handling Configuration and Integration Setup

Central configuration for all error handling components in the Parlant integration.
Provides easy setup and configuration of the comprehensive error handling system.
"""

import logging
import os
from typing import Dict, Any, List, Optional
from datetime import timedelta

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware

from .middleware import (
    ErrorHandlingMiddleware,
    APIErrorHandlerMiddleware,
    configure_error_handling
)
from .monitoring import setup_error_monitoring, get_error_metrics, get_error_logger
from .connectivity import get_connectivity_manager
from .rate_limiting import get_rate_limiter, RateLimitScope, RateLimit
from .auth_errors import get_authentication_handler, get_authorization_handler
from .workspace_errors import get_workspace_validator


logger = logging.getLogger(__name__)


class ErrorHandlingConfig:
    """Configuration class for error handling system"""

    def __init__(
        self,
        debug_mode: bool = None,
        include_stack_traces: bool = None,
        enable_metrics: bool = True,
        enable_detailed_logging: bool = True,
        enable_rate_limiting: bool = True,
        enable_circuit_breakers: bool = True,
        enable_abuse_detection: bool = True,
        monitoring_retention_hours: int = 24,
        webhook_urls: Optional[List[str]] = None
    ):
        # Environment-based defaults
        self.debug_mode = debug_mode if debug_mode is not None else self._get_debug_mode()
        self.include_stack_traces = include_stack_traces if include_stack_traces is not None else self.debug_mode
        self.enable_metrics = enable_metrics
        self.enable_detailed_logging = enable_detailed_logging
        self.enable_rate_limiting = enable_rate_limiting
        self.enable_circuit_breakers = enable_circuit_breakers
        self.enable_abuse_detection = enable_abuse_detection
        self.monitoring_retention_hours = monitoring_retention_hours
        self.webhook_urls = webhook_urls or []

    def _get_debug_mode(self) -> bool:
        """Determine debug mode from environment"""
        return os.getenv('DEBUG', '').lower() in ('true', '1', 'yes', 'on')

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            'debug_mode': self.debug_mode,
            'include_stack_traces': self.include_stack_traces,
            'enable_metrics': self.enable_metrics,
            'enable_detailed_logging': self.enable_detailed_logging,
            'enable_rate_limiting': self.enable_rate_limiting,
            'enable_circuit_breakers': self.enable_circuit_breakers,
            'enable_abuse_detection': self.enable_abuse_detection,
            'monitoring_retention_hours': self.monitoring_retention_hours,
            'webhook_count': len(self.webhook_urls)
        }


class ParlantErrorHandlingSystem:
    """
    Comprehensive error handling system for Parlant integration.

    Provides centralized setup, configuration, and management of all
    error handling components including middleware, monitoring, rate limiting,
    and security features.
    """

    def __init__(self, config: Optional[ErrorHandlingConfig] = None):
        self.config = config or ErrorHandlingConfig()
        self.initialized = False
        self._components = {}

    async def initialize(self, app: Optional[FastAPI] = None) -> Dict[str, Any]:
        """
        Initialize the complete error handling system.

        Args:
            app: Optional FastAPI app to configure middleware

        Returns:
            Initialization status and component information
        """
        if self.initialized:
            return {'status': 'already_initialized'}

        logger.info("Initializing Parlant Error Handling System...")

        try:
            # Configure global error handling
            configure_error_handling(
                debug_mode=self.config.debug_mode,
                include_stack_traces=self.config.include_stack_traces,
                enable_metrics=self.config.enable_metrics,
                enable_detailed_logging=self.config.enable_detailed_logging
            )

            # Initialize monitoring system
            if self.config.enable_metrics or self.config.enable_detailed_logging:
                monitoring_result = setup_error_monitoring(
                    retention_hours=self.config.monitoring_retention_hours,
                    webhook_urls=self.config.webhook_urls
                )
                self._components['monitoring'] = monitoring_result

            # Initialize connectivity manager with circuit breakers
            if self.config.enable_circuit_breakers:
                connectivity_manager = await get_connectivity_manager()
                self._components['connectivity'] = {
                    'status': 'initialized',
                    'services_registered': len(connectivity_manager.service_configs)
                }

            # Initialize rate limiting
            if self.config.enable_rate_limiting:
                rate_limiter = get_rate_limiter()
                self._configure_rate_limits(rate_limiter)
                self._components['rate_limiting'] = {
                    'status': 'initialized',
                    'strategies_available': ['sliding_window', 'token_bucket', 'adaptive']
                }

            # Initialize authentication and authorization handlers
            auth_handler = get_authentication_handler()
            authz_handler = get_authorization_handler()
            self._components['security'] = {
                'authentication': 'initialized',
                'authorization': 'initialized',
                'abuse_detection': self.config.enable_abuse_detection
            }

            # Initialize workspace isolation validator
            workspace_validator = get_workspace_validator()
            self._components['workspace_isolation'] = {
                'status': 'initialized',
                'security_monitoring': True
            }

            # Configure FastAPI app if provided
            if app:
                self._configure_fastapi_middleware(app)
                self._components['fastapi_integration'] = 'configured'

            self.initialized = True

            initialization_result = {
                'status': 'success',
                'config': self.config.to_dict(),
                'components': self._components,
                'initialization_time': None  # Could add timing
            }

            logger.info("Parlant Error Handling System initialized successfully")
            return initialization_result

        except Exception as e:
            logger.error(f"Failed to initialize error handling system: {e}")
            raise

    def _configure_rate_limits(self, rate_limiter):
        """Configure custom rate limits based on environment"""
        # Production vs development limits
        if not self.config.debug_mode:
            # Production limits - more restrictive
            rate_limiter.set_rate_limit(
                RateLimitScope.USER,
                "default",
                RateLimit(
                    requests_per_minute=60,
                    requests_per_hour=1000,
                    requests_per_day=10000,
                    burst_allowance=10
                )
            )

            rate_limiter.set_rate_limit(
                RateLimitScope.IP,
                "default",
                RateLimit(
                    requests_per_minute=100,
                    requests_per_hour=1500,
                    requests_per_day=15000,
                    burst_allowance=20
                )
            )

        else:
            # Development limits - more permissive
            rate_limiter.set_rate_limit(
                RateLimitScope.USER,
                "default",
                RateLimit(
                    requests_per_minute=1000,
                    requests_per_hour=10000,
                    requests_per_day=100000,
                    burst_allowance=200
                )
            )

    def _configure_fastapi_middleware(self, app: FastAPI):
        """Configure FastAPI middleware for error handling"""
        # Add error handling middleware
        app.add_middleware(
            ErrorHandlingMiddleware,
            debug_mode=self.config.debug_mode,
            include_stack_traces=self.config.include_stack_traces,
            enable_metrics=self.config.enable_metrics,
            enable_detailed_logging=self.config.enable_detailed_logging
        )

        # Add API-specific error handling middleware
        app.add_middleware(
            APIErrorHandlerMiddleware,
            api_prefix="/api",
            enable_security_headers=True,
            enable_cors_headers=True
        )

        logger.info("FastAPI middleware configured for error handling")

    async def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        if not self.initialized:
            return {'status': 'not_initialized'}

        health_data = {
            'status': 'healthy',
            'system': {
                'initialized': self.initialized,
                'config': self.config.to_dict(),
                'components': self._components
            }
        }

        # Add monitoring health if available
        try:
            from .monitoring import get_monitoring_health
            monitoring_health = await get_monitoring_health()
            health_data['monitoring'] = monitoring_health
        except Exception as e:
            health_data['monitoring'] = {'status': 'error', 'error': str(e)}

        # Add connectivity health if available
        try:
            connectivity_manager = await get_connectivity_manager()
            connectivity_health = await connectivity_manager.health_check_all()
            health_data['connectivity'] = connectivity_health
        except Exception as e:
            health_data['connectivity'] = {'status': 'error', 'error': str(e)}

        # Add rate limiting stats
        try:
            from .rate_limiting import get_rate_limiting_stats
            rate_limiting_stats = get_rate_limiting_stats()
            health_data['rate_limiting'] = rate_limiting_stats
        except Exception as e:
            health_data['rate_limiting'] = {'status': 'error', 'error': str(e)}

        # Add security stats
        try:
            from .auth_errors import get_security_stats
            from .workspace_errors import get_workspace_security_stats

            security_stats = get_security_stats()
            workspace_stats = get_workspace_security_stats()

            health_data['security'] = {
                'auth_stats': security_stats,
                'workspace_stats': workspace_stats
            }
        except Exception as e:
            health_data['security'] = {'status': 'error', 'error': str(e)}

        return health_data

    async def get_error_stats(self) -> Dict[str, Any]:
        """Get comprehensive error statistics"""
        if not self.initialized:
            return {'error': 'System not initialized'}

        try:
            metrics = get_error_metrics()
            return metrics.get_stats()
        except Exception as e:
            return {'error': f'Failed to get error stats: {str(e)}'}

    async def cleanup(self):
        """Cleanup system resources"""
        logger.info("Cleaning up error handling system...")

        try:
            # Cleanup connectivity manager
            from .connectivity import cleanup_connectivity
            await cleanup_connectivity()

            # Cleanup security data
            from .auth_errors import cleanup_security_data
            cleanup_security_data()

            self.initialized = False
            logger.info("Error handling system cleanup completed")

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Global system instance
_error_system: Optional[ParlantErrorHandlingSystem] = None


def get_error_system(config: Optional[ErrorHandlingConfig] = None) -> ParlantErrorHandlingSystem:
    """Get global error handling system instance"""
    global _error_system
    if _error_system is None:
        _error_system = ParlantErrorHandlingSystem(config)
    return _error_system


async def initialize_error_handling(
    app: Optional[FastAPI] = None,
    config: Optional[ErrorHandlingConfig] = None
) -> Dict[str, Any]:
    """
    Initialize the complete Parlant error handling system.

    Args:
        app: FastAPI application to configure
        config: Error handling configuration

    Returns:
        Initialization result
    """
    system = get_error_system(config)
    return await system.initialize(app)


async def get_error_handling_health() -> Dict[str, Any]:
    """Get error handling system health"""
    system = get_error_system()
    return await system.get_system_health()


async def get_comprehensive_error_stats() -> Dict[str, Any]:
    """Get comprehensive error statistics"""
    system = get_error_system()
    return await system.get_error_stats()


# Configuration presets
def create_development_config() -> ErrorHandlingConfig:
    """Create development environment configuration"""
    return ErrorHandlingConfig(
        debug_mode=True,
        include_stack_traces=True,
        enable_metrics=True,
        enable_detailed_logging=True,
        enable_rate_limiting=True,
        enable_circuit_breakers=True,
        enable_abuse_detection=False,  # Disabled for dev
        monitoring_retention_hours=6
    )


def create_production_config(webhook_urls: Optional[List[str]] = None) -> ErrorHandlingConfig:
    """Create production environment configuration"""
    return ErrorHandlingConfig(
        debug_mode=False,
        include_stack_traces=False,
        enable_metrics=True,
        enable_detailed_logging=True,
        enable_rate_limiting=True,
        enable_circuit_breakers=True,
        enable_abuse_detection=True,
        monitoring_retention_hours=24,
        webhook_urls=webhook_urls
    )


def create_testing_config() -> ErrorHandlingConfig:
    """Create testing environment configuration"""
    return ErrorHandlingConfig(
        debug_mode=True,
        include_stack_traces=True,
        enable_metrics=False,  # Disabled for performance
        enable_detailed_logging=False,  # Reduced noise
        enable_rate_limiting=False,  # Disabled for testing
        enable_circuit_breakers=False,  # Disabled for testing
        enable_abuse_detection=False,  # Disabled for testing
        monitoring_retention_hours=1
    )


# Convenience function for FastAPI integration
async def setup_fastapi_error_handling(
    app: FastAPI,
    environment: str = "development",
    webhook_urls: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Setup error handling for FastAPI application.

    Args:
        app: FastAPI application
        environment: Environment name (development, production, testing)
        webhook_urls: Webhook URLs for error notifications

    Returns:
        Setup result
    """
    if environment == "production":
        config = create_production_config(webhook_urls)
    elif environment == "testing":
        config = create_testing_config()
    else:
        config = create_development_config()

    return await initialize_error_handling(app, config)


# Export comprehensive error handling interface
__all__ = [
    'ErrorHandlingConfig',
    'ParlantErrorHandlingSystem',
    'get_error_system',
    'initialize_error_handling',
    'get_error_handling_health',
    'get_comprehensive_error_stats',
    'create_development_config',
    'create_production_config',
    'create_testing_config',
    'setup_fastapi_error_handling'
]