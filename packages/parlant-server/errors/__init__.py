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
    setup_error_monitoring
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
    'setup_error_monitoring'
]