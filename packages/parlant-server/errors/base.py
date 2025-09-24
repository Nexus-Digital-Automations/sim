"""
Base Error Classes for Parlant Integration

Defines the comprehensive error classification system for all integration points
between Sim and Parlant, following Sim's existing error handling patterns.
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field


logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for classification and handling"""
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    CONNECTIVITY = "connectivity"
    WORKSPACE_ISOLATION = "workspace_isolation"
    RATE_LIMITING = "rate_limiting"
    CIRCUIT_BREAKER = "circuit_breaker"
    AGENT_MANAGEMENT = "agent_management"
    SESSION_MANAGEMENT = "session_management"
    SYSTEM = "system"


@dataclass
class ErrorContext:
    """Context information for error tracking and debugging"""
    timestamp: datetime = field(default_factory=datetime.now)
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None
    agent_id: Optional[str] = None
    session_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    additional_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for logging"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'request_id': self.request_id,
            'user_id': self.user_id,
            'workspace_id': self.workspace_id,
            'agent_id': self.agent_id,
            'session_id': self.session_id,
            'endpoint': self.endpoint,
            'method': self.method,
            'user_agent': self.user_agent,
            'ip_address': self.ip_address,
            'additional_data': self.additional_data
        }


class ParlantIntegrationError(Exception):
    """
    Base exception class for all Parlant integration errors.

    Follows Sim's error handling patterns with enhanced context tracking
    and security-focused error responses.
    """

    def __init__(
        self,
        message: str,
        error_code: str,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[ErrorContext] = None,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
        user_message: Optional[str] = None,
        http_status: int = 500
    ):
        super().__init__(message)

        self.message = message
        self.error_code = error_code
        self.category = category
        self.severity = severity
        self.context = context or ErrorContext()
        self.details = details or {}
        self.cause = cause
        self.user_message = user_message or self._get_safe_user_message()
        self.http_status = http_status

        # Log the error immediately for monitoring
        self._log_error()

    def _get_safe_user_message(self) -> str:
        """Get a safe user-facing error message that doesn't leak sensitive information"""
        safe_messages = {
            ErrorCategory.VALIDATION: "Invalid input provided. Please check your request and try again.",
            ErrorCategory.AUTHENTICATION: "Authentication required. Please log in and try again.",
            ErrorCategory.AUTHORIZATION: "Access denied. You don't have permission to perform this action.",
            ErrorCategory.CONNECTIVITY: "Service temporarily unavailable. Please try again later.",
            ErrorCategory.WORKSPACE_ISOLATION: "Access denied. You can only access resources in your workspace.",
            ErrorCategory.RATE_LIMITING: "Rate limit exceeded. Please wait before making more requests.",
            ErrorCategory.CIRCUIT_BREAKER: "Service temporarily unavailable due to high error rate.",
            ErrorCategory.AGENT_MANAGEMENT: "Agent operation failed. Please check your configuration.",
            ErrorCategory.SESSION_MANAGEMENT: "Session error occurred. Please refresh and try again.",
            ErrorCategory.SYSTEM: "Internal server error. Please contact support if the problem persists."
        }
        return safe_messages.get(self.category, "An error occurred. Please try again.")

    def _log_error(self):
        """Log error with appropriate level based on severity"""
        log_data = {
            'error_code': self.error_code,
            'category': self.category.value,
            'severity': self.severity.value,
            'message': self.message,
            'context': self.context.to_dict() if self.context else {},
            'details': self.details,
            'cause': str(self.cause) if self.cause else None
        }

        if self.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"CRITICAL ERROR: {self.error_code}", extra=log_data)
        elif self.severity == ErrorSeverity.HIGH:
            logger.error(f"HIGH SEVERITY: {self.error_code}", extra=log_data)
        elif self.severity == ErrorSeverity.MEDIUM:
            logger.warning(f"MEDIUM SEVERITY: {self.error_code}", extra=log_data)
        else:
            logger.info(f"LOW SEVERITY: {self.error_code}", extra=log_data)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        """
        Convert error to response dictionary.

        Args:
            include_debug: Whether to include debug information (only in development)
        """
        response = {
            'error': True,
            'error_code': self.error_code,
            'message': self.user_message,
            'category': self.category.value,
            'timestamp': self.context.timestamp.isoformat() if self.context else datetime.now().isoformat()
        }

        if include_debug:
            response.update({
                'debug_message': self.message,
                'details': self.details,
                'severity': self.severity.value,
                'context': self.context.to_dict() if self.context else {},
                'cause': str(self.cause) if self.cause else None
            })

        return response


class ParlantValidationError(ParlantIntegrationError):
    """Validation and input handling errors"""

    def __init__(
        self,
        message: str,
        field_errors: Optional[Dict[str, List[str]]] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.VALIDATION)
        kwargs.setdefault('severity', ErrorSeverity.LOW)
        kwargs.setdefault('http_status', 400)

        self.field_errors = field_errors or {}

        super().__init__(message, **kwargs)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        response = super().to_response_dict(include_debug)
        if self.field_errors:
            response['field_errors'] = self.field_errors
        return response


class ParlantAuthenticationError(ParlantIntegrationError):
    """Authentication-related errors"""

    def __init__(self, message: str, **kwargs):
        kwargs.setdefault('category', ErrorCategory.AUTHENTICATION)
        kwargs.setdefault('severity', ErrorSeverity.MEDIUM)
        kwargs.setdefault('http_status', 401)

        super().__init__(message, **kwargs)


class ParlantAuthorizationError(ParlantIntegrationError):
    """Authorization and permissions errors"""

    def __init__(
        self,
        message: str,
        required_permissions: Optional[List[str]] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.AUTHORIZATION)
        kwargs.setdefault('severity', ErrorSeverity.MEDIUM)
        kwargs.setdefault('http_status', 403)

        self.required_permissions = required_permissions or []

        super().__init__(message, **kwargs)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        response = super().to_response_dict(include_debug)
        if include_debug and self.required_permissions:
            response['required_permissions'] = self.required_permissions
        return response


class ParlantConnectivityError(ParlantIntegrationError):
    """Parlant server connectivity and communication errors"""

    def __init__(
        self,
        message: str,
        service_name: str,
        retry_after_seconds: Optional[int] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.CONNECTIVITY)
        kwargs.setdefault('severity', ErrorSeverity.HIGH)
        kwargs.setdefault('http_status', 503)

        self.service_name = service_name
        self.retry_after_seconds = retry_after_seconds

        super().__init__(message, **kwargs)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        response = super().to_response_dict(include_debug)
        if self.retry_after_seconds:
            response['retry_after_seconds'] = self.retry_after_seconds
        return response


class ParlantWorkspaceIsolationError(ParlantIntegrationError):
    """Workspace isolation and security boundary violations"""

    def __init__(
        self,
        message: str,
        attempted_workspace: str,
        authorized_workspaces: Optional[List[str]] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.WORKSPACE_ISOLATION)
        kwargs.setdefault('severity', ErrorSeverity.HIGH)
        kwargs.setdefault('http_status', 403)

        self.attempted_workspace = attempted_workspace
        self.authorized_workspaces = authorized_workspaces or []

        super().__init__(message, **kwargs)


class ParlantRateLimitError(ParlantIntegrationError):
    """Rate limiting and abuse prevention errors"""

    def __init__(
        self,
        message: str,
        limit: int,
        remaining: int,
        reset_at: datetime,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.RATE_LIMITING)
        kwargs.setdefault('severity', ErrorSeverity.MEDIUM)
        kwargs.setdefault('http_status', 429)

        self.limit = limit
        self.remaining = remaining
        self.reset_at = reset_at

        super().__init__(message, **kwargs)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        response = super().to_response_dict(include_debug)
        response.update({
            'rate_limit': {
                'limit': self.limit,
                'remaining': self.remaining,
                'reset_at': self.reset_at.isoformat()
            }
        })
        return response


class ParlantCircuitBreakerError(ParlantIntegrationError):
    """Circuit breaker pattern errors for external service calls"""

    def __init__(
        self,
        message: str,
        service_name: str,
        failure_count: int,
        next_attempt_at: Optional[datetime] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.CIRCUIT_BREAKER)
        kwargs.setdefault('severity', ErrorSeverity.HIGH)
        kwargs.setdefault('http_status', 503)

        self.service_name = service_name
        self.failure_count = failure_count
        self.next_attempt_at = next_attempt_at

        super().__init__(message, **kwargs)

    def to_response_dict(self, include_debug: bool = False) -> Dict[str, Any]:
        response = super().to_response_dict(include_debug)
        if include_debug:
            response.update({
                'service_name': self.service_name,
                'failure_count': self.failure_count,
                'next_attempt_at': self.next_attempt_at.isoformat() if self.next_attempt_at else None
            })
        return response


class ParlantAgentError(ParlantIntegrationError):
    """Agent management and lifecycle errors"""

    def __init__(
        self,
        message: str,
        agent_id: Optional[str] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.AGENT_MANAGEMENT)
        kwargs.setdefault('severity', ErrorSeverity.MEDIUM)
        kwargs.setdefault('http_status', 400)

        self.agent_id = agent_id
        self.operation = operation

        super().__init__(message, **kwargs)


class ParlantSessionError(ParlantIntegrationError):
    """Session management and state errors"""

    def __init__(
        self,
        message: str,
        session_id: Optional[str] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.SESSION_MANAGEMENT)
        kwargs.setdefault('severity', ErrorSeverity.MEDIUM)
        kwargs.setdefault('http_status', 400)

        self.session_id = session_id

        super().__init__(message, **kwargs)


class ParlantSystemError(ParlantIntegrationError):
    """System-level errors and infrastructure failures"""

    def __init__(
        self,
        message: str,
        component: Optional[str] = None,
        **kwargs
    ):
        kwargs.setdefault('category', ErrorCategory.SYSTEM)
        kwargs.setdefault('severity', ErrorSeverity.CRITICAL)
        kwargs.setdefault('http_status', 500)

        self.component = component

        super().__init__(message, **kwargs)


# Convenience functions for creating common errors
def create_validation_error(
    message: str,
    error_code: str = "VALIDATION_FAILED",
    field_errors: Optional[Dict[str, List[str]]] = None,
    **kwargs
) -> ParlantValidationError:
    """Create a validation error with standard formatting"""
    return ParlantValidationError(
        message=message,
        error_code=error_code,
        field_errors=field_errors,
        **kwargs
    )


def create_authentication_error(
    message: str = "Authentication required",
    error_code: str = "AUTHENTICATION_REQUIRED",
    **kwargs
) -> ParlantAuthenticationError:
    """Create an authentication error with standard formatting"""
    return ParlantAuthenticationError(
        message=message,
        error_code=error_code,
        **kwargs
    )


def create_authorization_error(
    message: str = "Access denied",
    error_code: str = "ACCESS_DENIED",
    required_permissions: Optional[List[str]] = None,
    **kwargs
) -> ParlantAuthorizationError:
    """Create an authorization error with standard formatting"""
    return ParlantAuthorizationError(
        message=message,
        error_code=error_code,
        required_permissions=required_permissions,
        **kwargs
    )


def create_connectivity_error(
    service_name: str,
    message: Optional[str] = None,
    error_code: str = "SERVICE_UNAVAILABLE",
    retry_after_seconds: Optional[int] = None,
    **kwargs
) -> ParlantConnectivityError:
    """Create a connectivity error with standard formatting"""
    if not message:
        message = f"Unable to connect to {service_name}"

    return ParlantConnectivityError(
        message=message,
        error_code=error_code,
        service_name=service_name,
        retry_after_seconds=retry_after_seconds,
        **kwargs
    )


def create_workspace_isolation_error(
    attempted_workspace: str,
    authorized_workspaces: Optional[List[str]] = None,
    message: Optional[str] = None,
    error_code: str = "WORKSPACE_ACCESS_DENIED",
    **kwargs
) -> ParlantWorkspaceIsolationError:
    """Create a workspace isolation error with standard formatting"""
    if not message:
        message = f"Access denied to workspace {attempted_workspace}"

    return ParlantWorkspaceIsolationError(
        message=message,
        error_code=error_code,
        attempted_workspace=attempted_workspace,
        authorized_workspaces=authorized_workspaces,
        **kwargs
    )


def create_rate_limit_error(
    limit: int,
    remaining: int,
    reset_at: datetime,
    message: Optional[str] = None,
    error_code: str = "RATE_LIMIT_EXCEEDED",
    **kwargs
) -> ParlantRateLimitError:
    """Create a rate limit error with standard formatting"""
    if not message:
        message = f"Rate limit exceeded. Limit: {limit}, Reset at: {reset_at.isoformat()}"

    return ParlantRateLimitError(
        message=message,
        error_code=error_code,
        limit=limit,
        remaining=remaining,
        reset_at=reset_at,
        **kwargs
    )