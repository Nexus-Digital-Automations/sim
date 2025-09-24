"""
Error Handlers for Parlant Integration

Comprehensive error handling functions that process different types of errors
and create appropriate HTTP responses following Sim's patterns.
"""

import logging
import traceback
from typing import Dict, Any, Optional, Union, Tuple
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

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
    ParlantSystemError,
    ErrorContext,
    ErrorSeverity,
    ErrorCategory
)


logger = logging.getLogger(__name__)


class ErrorHandler:
    """
    Central error handler for all Parlant integration errors.

    Provides consistent error processing, logging, monitoring, and response formatting
    while maintaining security by not leaking sensitive information.
    """

    def __init__(self, debug_mode: bool = False, include_stack_traces: bool = False):
        self.debug_mode = debug_mode
        self.include_stack_traces = include_stack_traces

    def handle_error(
        self,
        error: Exception,
        request: Optional[Request] = None,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """
        Handle any exception and return appropriate JSON response.

        Args:
            error: The exception to handle
            request: FastAPI request object (if available)
            context: Additional error context

        Returns:
            JSONResponse with appropriate status code and error details
        """
        # Create error context from request if not provided
        if context is None and request is not None:
            context = self._create_context_from_request(request)

        # Handle Parlant integration errors
        if isinstance(error, ParlantIntegrationError):
            return self._handle_parlant_error(error, context)

        # Handle FastAPI HTTPException
        if isinstance(error, HTTPException):
            return self._handle_http_exception(error, context)

        # Handle unexpected errors
        return self._handle_unexpected_error(error, context)

    def _create_context_from_request(self, request: Request) -> ErrorContext:
        """Create error context from FastAPI request"""
        return ErrorContext(
            request_id=request.headers.get('x-request-id'),
            user_id=getattr(request.state, 'user', {}).get('id') if hasattr(request.state, 'user') else None,
            workspace_id=getattr(request.state, 'workspace_id', None) if hasattr(request.state, 'workspace_id') else None,
            endpoint=str(request.url.path),
            method=request.method,
            user_agent=request.headers.get('user-agent'),
            ip_address=request.client.host if request.client else None,
            additional_data={
                'headers': dict(request.headers),
                'query_params': dict(request.query_params)
            }
        )

    def _handle_parlant_error(
        self,
        error: ParlantIntegrationError,
        context: Optional[ErrorContext]
    ) -> JSONResponse:
        """Handle Parlant integration errors"""
        # Update error context if provided
        if context and not error.context.request_id:
            error.context.request_id = context.request_id
            error.context.endpoint = context.endpoint
            error.context.method = context.method
            error.context.user_agent = context.user_agent
            error.context.ip_address = context.ip_address

        # Create response
        response_data = error.to_response_dict(include_debug=self.debug_mode)

        # Add stack trace in debug mode
        if self.debug_mode and self.include_stack_traces:
            response_data['stack_trace'] = traceback.format_exc()

        # Set appropriate headers for specific error types
        headers = self._get_response_headers(error)

        return JSONResponse(
            status_code=error.http_status,
            content=response_data,
            headers=headers
        )

    def _handle_http_exception(
        self,
        error: HTTPException,
        context: Optional[ErrorContext]
    ) -> JSONResponse:
        """Handle FastAPI HTTPException"""
        logger.warning(f"HTTP Exception: {error.status_code} - {error.detail}")

        response_data = {
            'error': True,
            'error_code': f'HTTP_{error.status_code}',
            'message': error.detail,
            'category': 'http_error',
            'timestamp': datetime.now().isoformat()
        }

        if self.debug_mode and context:
            response_data['context'] = context.to_dict()

        return JSONResponse(
            status_code=error.status_code,
            content=response_data,
            headers=getattr(error, 'headers', None)
        )

    def _handle_unexpected_error(
        self,
        error: Exception,
        context: Optional[ErrorContext]
    ) -> JSONResponse:
        """Handle unexpected errors"""
        logger.error(f"Unexpected error: {type(error).__name__}: {str(error)}")
        logger.error(traceback.format_exc())

        response_data = {
            'error': True,
            'error_code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred. Please contact support if the problem persists.',
            'category': 'system_error',
            'timestamp': datetime.now().isoformat()
        }

        if self.debug_mode:
            response_data.update({
                'debug_message': str(error),
                'error_type': type(error).__name__
            })

            if context:
                response_data['context'] = context.to_dict()

            if self.include_stack_traces:
                response_data['stack_trace'] = traceback.format_exc()

        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content=response_data
        )

    def _get_response_headers(self, error: ParlantIntegrationError) -> Dict[str, str]:
        """Get appropriate response headers for specific error types"""
        headers = {}

        # Rate limiting headers
        if isinstance(error, ParlantRateLimitError):
            headers.update({
                'X-RateLimit-Limit': str(error.limit),
                'X-RateLimit-Remaining': str(error.remaining),
                'X-RateLimit-Reset': error.reset_at.isoformat(),
                'Retry-After': str(int((error.reset_at - datetime.now()).total_seconds()))
            })

        # Connectivity error headers
        if isinstance(error, ParlantConnectivityError) and error.retry_after_seconds:
            headers['Retry-After'] = str(error.retry_after_seconds)

        # Circuit breaker headers
        if isinstance(error, ParlantCircuitBreakerError) and error.next_attempt_at:
            retry_seconds = int((error.next_attempt_at - datetime.now()).total_seconds())
            if retry_seconds > 0:
                headers['Retry-After'] = str(retry_seconds)

        return headers


# Global error handler instance
_error_handler = ErrorHandler()


def set_error_handler_config(debug_mode: bool = False, include_stack_traces: bool = False):
    """Configure global error handler settings"""
    global _error_handler
    _error_handler = ErrorHandler(debug_mode, include_stack_traces)


def create_error_response(
    error: Exception,
    request: Optional[Request] = None,
    context: Optional[ErrorContext] = None
) -> JSONResponse:
    """
    Create standardized error response.

    Args:
        error: The exception to handle
        request: FastAPI request object (if available)
        context: Additional error context

    Returns:
        JSONResponse with appropriate error details
    """
    return _error_handler.handle_error(error, request, context)


# Specific error handling functions

def handle_validation_error(
    message: str,
    field_errors: Optional[Dict[str, list]] = None,
    error_code: str = "VALIDATION_FAILED",
    context: Optional[ErrorContext] = None
) -> ParlantValidationError:
    """Handle validation errors with field-specific details"""
    return ParlantValidationError(
        message=message,
        error_code=error_code,
        field_errors=field_errors,
        context=context
    )


def handle_authentication_error(
    message: str = "Authentication required",
    error_code: str = "AUTHENTICATION_REQUIRED",
    context: Optional[ErrorContext] = None
) -> ParlantAuthenticationError:
    """Handle authentication errors"""
    return ParlantAuthenticationError(
        message=message,
        error_code=error_code,
        context=context
    )


def handle_authorization_error(
    message: str = "Access denied",
    error_code: str = "ACCESS_DENIED",
    required_permissions: Optional[list] = None,
    context: Optional[ErrorContext] = None
) -> ParlantAuthorizationError:
    """Handle authorization errors"""
    return ParlantAuthorizationError(
        message=message,
        error_code=error_code,
        required_permissions=required_permissions,
        context=context
    )


def handle_connectivity_error(
    service_name: str,
    message: Optional[str] = None,
    error_code: str = "SERVICE_UNAVAILABLE",
    retry_after_seconds: Optional[int] = None,
    context: Optional[ErrorContext] = None
) -> ParlantConnectivityError:
    """Handle connectivity errors with retry logic"""
    if not message:
        message = f"Unable to connect to {service_name}"

    return ParlantConnectivityError(
        message=message,
        error_code=error_code,
        service_name=service_name,
        retry_after_seconds=retry_after_seconds,
        context=context
    )


def handle_workspace_isolation_error(
    attempted_workspace: str,
    authorized_workspaces: Optional[list] = None,
    message: Optional[str] = None,
    error_code: str = "WORKSPACE_ACCESS_DENIED",
    context: Optional[ErrorContext] = None
) -> ParlantWorkspaceIsolationError:
    """Handle workspace isolation violations"""
    if not message:
        message = f"Access denied to workspace {attempted_workspace}"

    return ParlantWorkspaceIsolationError(
        message=message,
        error_code=error_code,
        attempted_workspace=attempted_workspace,
        authorized_workspaces=authorized_workspaces,
        context=context
    )


def handle_rate_limit_error(
    limit: int,
    remaining: int,
    reset_at: datetime,
    message: Optional[str] = None,
    error_code: str = "RATE_LIMIT_EXCEEDED",
    context: Optional[ErrorContext] = None
) -> ParlantRateLimitError:
    """Handle rate limiting errors"""
    if not message:
        seconds_until_reset = int((reset_at - datetime.now()).total_seconds())
        message = f"Rate limit exceeded. Try again in {seconds_until_reset} seconds."

    return ParlantRateLimitError(
        message=message,
        error_code=error_code,
        limit=limit,
        remaining=remaining,
        reset_at=reset_at,
        context=context
    )


def handle_circuit_breaker_error(
    service_name: str,
    failure_count: int,
    next_attempt_at: Optional[datetime] = None,
    message: Optional[str] = None,
    error_code: str = "CIRCUIT_BREAKER_OPEN",
    context: Optional[ErrorContext] = None
) -> ParlantCircuitBreakerError:
    """Handle circuit breaker errors"""
    if not message:
        if next_attempt_at:
            retry_seconds = int((next_attempt_at - datetime.now()).total_seconds())
            message = f"Service {service_name} temporarily unavailable. Try again in {retry_seconds} seconds."
        else:
            message = f"Service {service_name} temporarily unavailable due to repeated failures."

    return ParlantCircuitBreakerError(
        message=message,
        error_code=error_code,
        service_name=service_name,
        failure_count=failure_count,
        next_attempt_at=next_attempt_at,
        context=context
    )


def handle_agent_error(
    message: str,
    agent_id: Optional[str] = None,
    operation: Optional[str] = None,
    error_code: str = "AGENT_OPERATION_FAILED",
    context: Optional[ErrorContext] = None
) -> ParlantAgentError:
    """Handle agent management errors"""
    return ParlantAgentError(
        message=message,
        error_code=error_code,
        agent_id=agent_id,
        operation=operation,
        context=context
    )


def handle_session_error(
    message: str,
    session_id: Optional[str] = None,
    error_code: str = "SESSION_ERROR",
    context: Optional[ErrorContext] = None
) -> ParlantSessionError:
    """Handle session management errors"""
    return ParlantSessionError(
        message=message,
        error_code=error_code,
        session_id=session_id,
        context=context
    )


def handle_system_error(
    message: str,
    component: Optional[str] = None,
    error_code: str = "SYSTEM_ERROR",
    context: Optional[ErrorContext] = None
) -> ParlantSystemError:
    """Handle system-level errors"""
    return ParlantSystemError(
        message=message,
        error_code=error_code,
        component=component,
        context=context
    )


# Helper functions for common error scenarios

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """
    Validate that required fields are present in data.

    Args:
        data: Data dictionary to validate
        required_fields: List of required field names

    Raises:
        ParlantValidationError: If any required fields are missing
    """
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]

    if missing_fields:
        field_errors = {field: ['This field is required'] for field in missing_fields}
        raise handle_validation_error(
            message=f"Missing required fields: {', '.join(missing_fields)}",
            field_errors=field_errors
        )


def validate_field_types(data: Dict[str, Any], field_types: Dict[str, type]) -> None:
    """
    Validate that fields have correct types.

    Args:
        data: Data dictionary to validate
        field_types: Dictionary mapping field names to expected types

    Raises:
        ParlantValidationError: If any fields have incorrect types
    """
    field_errors = {}

    for field_name, expected_type in field_types.items():
        if field_name in data and data[field_name] is not None:
            if not isinstance(data[field_name], expected_type):
                field_errors[field_name] = [f'Expected {expected_type.__name__}, got {type(data[field_name]).__name__}']

    if field_errors:
        raise handle_validation_error(
            message="Field type validation failed",
            field_errors=field_errors
        )


def check_workspace_access(
    user_workspaces: list,
    required_workspace: str,
    user_id: Optional[str] = None
) -> None:
    """
    Check if user has access to required workspace.

    Args:
        user_workspaces: List of user's authorized workspaces
        required_workspace: Workspace ID that user needs access to
        user_id: User ID for logging purposes

    Raises:
        ParlantWorkspaceIsolationError: If user doesn't have access
    """
    authorized_workspace_ids = [ws.get('id') for ws in user_workspaces if ws.get('id')]

    if required_workspace not in authorized_workspace_ids:
        logger.warning(f"User {user_id} denied access to workspace {required_workspace}")
        raise handle_workspace_isolation_error(
            attempted_workspace=required_workspace,
            authorized_workspaces=authorized_workspace_ids
        )


def ensure_authenticated(session) -> None:
    """
    Ensure user is authenticated.

    Args:
        session: User session object

    Raises:
        ParlantAuthenticationError: If session is invalid
    """
    if not session:
        raise handle_authentication_error()

    if hasattr(session, 'expires_at') and session.expires_at < datetime.now():
        raise handle_authentication_error(
            message="Session has expired",
            error_code="SESSION_EXPIRED"
        )


def create_error_context_from_dict(data: Dict[str, Any]) -> ErrorContext:
    """Create ErrorContext from dictionary data"""
    return ErrorContext(
        request_id=data.get('request_id'),
        user_id=data.get('user_id'),
        workspace_id=data.get('workspace_id'),
        agent_id=data.get('agent_id'),
        session_id=data.get('session_id'),
        endpoint=data.get('endpoint'),
        method=data.get('method'),
        user_agent=data.get('user_agent'),
        ip_address=data.get('ip_address'),
        additional_data=data.get('additional_data', {})
    )