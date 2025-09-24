"""
Parlant Integration Error Handling System

Comprehensive error handling for all Sim-Parlant integration points including:
- Validation and input handling errors
- Authentication and authorization failures
- Parlant connectivity and communication errors
- Workspace isolation violations
- Rate limiting and abuse prevention
- Integration and circuit breaker failures
"""

from .base import (
    ParlantIntegrationError,
    ParlantValidationError,
    ParlantAuthenticationError,
    ParlantAuthorizationError,
    ParlantConnectivityError,
    ParlantWorkspaceIsolationError,
    ParlantRateLimitError,
    ParlantCircuitBreakerError,
    ParlantAgentError,
    ParlantSessionError,
    ParlantSystemError
)

from .handlers import (
    ErrorHandler,
    create_error_response,
    handle_validation_error,
    handle_authentication_error,
    handle_connectivity_error,
    handle_workspace_isolation_error,
    handle_rate_limit_error,
    handle_circuit_breaker_error
)

from .middleware import (
    ErrorHandlingMiddleware,
    global_error_handler,
    api_error_handler
)

from .validation import (
    ValidationError,
    InputValidator,
    AgentValidator,
    SessionValidator,
    WorkspaceValidator
)

from .monitoring import (
    ErrorMetrics,
    ErrorLogger,
    setup_error_monitoring,
    get_error_metrics,
    get_error_logger
)

from .connectivity import (
    ConnectivityManager,
    get_connectivity_manager,
    make_request,
    check_service_health,
    check_all_services_health
)

from .rate_limiting import (
    RateLimiter,
    RateLimitScope,
    RateLimit,
    RateLimitResult,
    get_rate_limiter,
    check_user_rate_limit,
    check_ip_rate_limit,
    check_workspace_rate_limit
)

from .auth_errors import (
    AuthenticationErrorHandler,
    AuthorizationErrorHandler,
    get_authentication_handler,
    get_authorization_handler,
    validate_authentication,
    validate_workspace_authorization,
    validate_permissions
)

from .workspace_errors import (
    WorkspaceIsolationValidator,
    get_workspace_validator,
    validate_agent_workspace_access,
    validate_session_workspace_access,
    validate_workspace_data_export
)

from .config import (
    ErrorHandlingConfig,
    ParlantErrorHandlingSystem,
    get_error_system,
    initialize_error_handling,
    get_error_handling_health,
    get_comprehensive_error_stats,
    setup_fastapi_error_handling,
    create_development_config,
    create_production_config,
    create_testing_config
)

__all__ = [
    # Base error classes
    'ParlantIntegrationError',
    'ParlantValidationError',
    'ParlantAuthenticationError',
    'ParlantAuthorizationError',
    'ParlantConnectivityError',
    'ParlantWorkspaceIsolationError',
    'ParlantRateLimitError',
    'ParlantCircuitBreakerError',
    'ParlantAgentError',
    'ParlantSessionError',
    'ParlantSystemError',

    # Error handlers
    'ErrorHandler',
    'create_error_response',
    'handle_validation_error',
    'handle_authentication_error',
    'handle_connectivity_error',
    'handle_workspace_isolation_error',
    'handle_rate_limit_error',
    'handle_circuit_breaker_error',

    # Middleware
    'ErrorHandlingMiddleware',
    'global_error_handler',
    'api_error_handler',

    # Validation
    'ValidationError',
    'InputValidator',
    'AgentValidator',
    'SessionValidator',
    'WorkspaceValidator',

    # Monitoring
    'ErrorMetrics',
    'ErrorLogger',
    'setup_error_monitoring',
    'get_error_metrics',
    'get_error_logger',

    # Connectivity and Circuit Breakers
    'ConnectivityManager',
    'get_connectivity_manager',
    'make_request',
    'check_service_health',
    'check_all_services_health',

    # Rate Limiting
    'RateLimiter',
    'RateLimitScope',
    'RateLimit',
    'RateLimitResult',
    'get_rate_limiter',
    'check_user_rate_limit',
    'check_ip_rate_limit',
    'check_workspace_rate_limit',

    # Authentication and Authorization
    'AuthenticationErrorHandler',
    'AuthorizationErrorHandler',
    'get_authentication_handler',
    'get_authorization_handler',
    'validate_authentication',
    'validate_workspace_authorization',
    'validate_permissions',

    # Workspace Isolation
    'WorkspaceIsolationValidator',
    'get_workspace_validator',
    'validate_agent_workspace_access',
    'validate_session_workspace_access',
    'validate_workspace_data_export',

    # Configuration and Setup
    'ErrorHandlingConfig',
    'ParlantErrorHandlingSystem',
    'get_error_system',
    'initialize_error_handling',
    'get_error_handling_health',
    'get_comprehensive_error_stats',
    'setup_fastapi_error_handling',
    'create_development_config',
    'create_production_config',
    'create_testing_config'
]