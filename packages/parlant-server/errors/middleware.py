"""
Error Handling Middleware for Parlant Integration

Comprehensive middleware that integrates all error handling components including
validation, authentication, authorization, rate limiting, and connectivity errors.
"""

import logging
import traceback
import uuid
from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .base import (
    ParlantIntegrationError,
    ErrorContext,
    ErrorSeverity,
    ErrorCategory
)
from .handlers import ErrorHandler, create_error_response, set_error_handler_config
from .monitoring import ErrorMetrics, ErrorLogger


logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive error handling middleware for all Parlant integration endpoints.

    Features:
    - Automatic error classification and response formatting
    - Request/response logging with correlation IDs
    - Error metrics collection
    - Security-focused error responses
    - Integration with monitoring systems
    """

    def __init__(
        self,
        app: ASGIApp,
        debug_mode: bool = False,
        include_stack_traces: bool = False,
        enable_metrics: bool = True,
        enable_detailed_logging: bool = True
    ):
        super().__init__(app)

        self.debug_mode = debug_mode
        self.include_stack_traces = include_stack_traces
        self.enable_metrics = enable_metrics
        self.enable_detailed_logging = enable_detailed_logging

        # Configure global error handler
        set_error_handler_config(debug_mode, include_stack_traces)

        # Initialize error metrics if enabled
        if self.enable_metrics:
            self.error_metrics = ErrorMetrics()
        else:
            self.error_metrics = None

        # Initialize error logger
        self.error_logger = ErrorLogger()

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Process request with comprehensive error handling"""
        # Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        # Create error context
        context = self._create_error_context(request, correlation_id)

        # Log request start
        if self.enable_detailed_logging:
            await self._log_request_start(request, context)

        start_time = datetime.now()

        try:
            # Process request
            response = await call_next(request)

            # Log successful response
            if self.enable_detailed_logging:
                await self._log_request_success(request, response, context, start_time)

            # Add correlation ID header
            response.headers["X-Correlation-ID"] = correlation_id

            return response

        except Exception as error:
            # Handle error and create response
            error_response = await self._handle_request_error(error, request, context, start_time)
            return error_response

    def _create_error_context(self, request: Request, correlation_id: str) -> ErrorContext:
        """Create comprehensive error context from request"""
        return ErrorContext(
            request_id=correlation_id,
            user_id=getattr(request.state, 'user', {}).get('id') if hasattr(request.state, 'user') else None,
            workspace_id=getattr(request.state, 'workspace_id', None),
            agent_id=request.path_params.get('agent_id'),
            session_id=request.path_params.get('session_id'),
            endpoint=request.url.path,
            method=request.method,
            user_agent=request.headers.get('user-agent'),
            ip_address=self._get_client_ip(request),
            additional_data={
                'url': str(request.url),
                'headers': dict(request.headers),
                'query_params': dict(request.query_params) if request.query_params else {},
            }
        )

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Extract client IP address from request"""
        # Check forwarded headers first (for load balancers/proxies)
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()

        forwarded = request.headers.get('x-forwarded')
        if forwarded:
            return forwarded

        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip

        # Fall back to client host
        if request.client:
            return request.client.host

        return None

    async def _log_request_start(self, request: Request, context: ErrorContext):
        """Log request start with details"""
        logger.info(f"Request started: {request.method} {request.url.path}", extra={
            'correlation_id': context.request_id,
            'method': request.method,
            'path': request.url.path,
            'user_id': context.user_id,
            'workspace_id': context.workspace_id,
            'ip_address': context.ip_address,
            'user_agent': context.user_agent
        })

    async def _log_request_success(
        self,
        request: Request,
        response: Response,
        context: ErrorContext,
        start_time: datetime
    ):
        """Log successful request completion"""
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(f"Request completed: {request.method} {request.url.path} -> {response.status_code}", extra={
            'correlation_id': context.request_id,
            'status_code': response.status_code,
            'duration_ms': duration_ms,
            'method': request.method,
            'path': request.url.path,
            'user_id': context.user_id,
            'workspace_id': context.workspace_id
        })

        # Record success metrics
        if self.error_metrics:
            self.error_metrics.record_request_success(
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms
            )

    async def _handle_request_error(
        self,
        error: Exception,
        request: Request,
        context: ErrorContext,
        start_time: datetime
    ) -> JSONResponse:
        """Handle request error and create appropriate response"""
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000

        # Create error response
        error_response = create_error_response(error, request, context)

        # Log error details
        await self._log_request_error(error, request, context, duration_ms, error_response.status_code)

        # Record error metrics
        if self.error_metrics:
            error_category = None
            error_code = None

            if isinstance(error, ParlantIntegrationError):
                error_category = error.category.value
                error_code = error.error_code
            elif isinstance(error, HTTPException):
                error_code = f"HTTP_{error.status_code}"

            self.error_metrics.record_request_error(
                endpoint=request.url.path,
                method=request.method,
                status_code=error_response.status_code,
                error_category=error_category,
                error_code=error_code,
                duration_ms=duration_ms
            )

        # Add correlation ID header
        error_response.headers["X-Correlation-ID"] = context.request_id

        return error_response

    async def _log_request_error(
        self,
        error: Exception,
        request: Request,
        context: ErrorContext,
        duration_ms: float,
        status_code: int
    ):
        """Log request error with comprehensive details"""
        error_details = {
            'correlation_id': context.request_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'status_code': status_code,
            'duration_ms': duration_ms,
            'method': request.method,
            'path': request.url.path,
            'user_id': context.user_id,
            'workspace_id': context.workspace_id,
            'ip_address': context.ip_address,
            'user_agent': context.user_agent
        }

        if isinstance(error, ParlantIntegrationError):
            error_details.update({
                'error_category': error.category.value,
                'error_code': error.error_code,
                'error_severity': error.severity.value
            })

            # Log at appropriate level based on severity
            if error.severity == ErrorSeverity.CRITICAL:
                logger.critical(f"CRITICAL ERROR: {request.method} {request.url.path}", extra=error_details)
            elif error.severity == ErrorSeverity.HIGH:
                logger.error(f"HIGH SEVERITY ERROR: {request.method} {request.url.path}", extra=error_details)
            elif error.severity == ErrorSeverity.MEDIUM:
                logger.warning(f"MEDIUM SEVERITY ERROR: {request.method} {request.url.path}", extra=error_details)
            else:
                logger.info(f"LOW SEVERITY ERROR: {request.method} {request.url.path}", extra=error_details)

        else:
            logger.error(f"Unhandled error: {request.method} {request.url.path}", extra=error_details)

        # Include stack trace in debug mode
        if self.debug_mode and self.include_stack_traces:
            error_details['stack_trace'] = traceback.format_exc()

        # Send to error logger for additional processing
        await self.error_logger.log_error(error, context, error_details)


class APIErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Specialized middleware for API endpoints with enhanced security and rate limiting.
    """

    def __init__(
        self,
        app: ASGIApp,
        api_prefix: str = "/api",
        enable_security_headers: bool = True,
        enable_cors_headers: bool = True
    ):
        super().__init__(app)
        self.api_prefix = api_prefix
        self.enable_security_headers = enable_security_headers
        self.enable_cors_headers = enable_cors_headers

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Process API request with enhanced security"""
        # Only process API requests
        if not request.url.path.startswith(self.api_prefix):
            return await call_next(request)

        try:
            response = await call_next(request)

            # Add security headers
            if self.enable_security_headers:
                self._add_security_headers(response)

            # Add CORS headers if enabled
            if self.enable_cors_headers:
                self._add_cors_headers(response, request)

            return response

        except Exception as error:
            # Create secure error response for API endpoints
            error_response = self._create_secure_api_error_response(error, request)

            # Add security headers to error response
            if self.enable_security_headers:
                self._add_security_headers(error_response)

            return error_response

    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'",
        }

        for header, value in security_headers.items():
            response.headers[header] = value

    def _add_cors_headers(self, response: Response, request: Request):
        """Add CORS headers to response"""
        origin = request.headers.get("origin")

        # Allow specific origins (configure based on environment)
        allowed_origins = [
            "http://localhost:3000",
            "https://app.sim.ai",
            "https://staging.sim.ai"
        ]

        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Workspace-ID, X-Request-ID"
            response.headers["Access-Control-Max-Age"] = "86400"

    def _create_secure_api_error_response(self, error: Exception, request: Request) -> JSONResponse:
        """Create secure error response for API endpoints"""
        context = ErrorContext(
            endpoint=request.url.path,
            method=request.method,
            user_agent=request.headers.get('user-agent'),
            ip_address=request.client.host if request.client else None
        )

        # Use the global error handler but ensure no sensitive data leaks
        error_response = create_error_response(error, request, context)

        # Remove sensitive debug information for API responses
        if hasattr(error_response, 'body'):
            try:
                import json
                response_data = json.loads(error_response.body)

                # Remove debug information that might leak sensitive data
                sensitive_keys = ['debug_message', 'context', 'stack_trace', 'details']
                for key in sensitive_keys:
                    response_data.pop(key, None)

                error_response.body = json.dumps(response_data).encode()
            except:
                # If parsing fails, keep original response
                pass

        return error_response


# Global middleware instances
async def global_error_handler(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """
    Global error handler function for use with FastAPI middleware decorator.

    Usage:
        from fastapi import FastAPI
        from errors.middleware import global_error_handler

        app = FastAPI()
        app.middleware("http")(global_error_handler)
    """
    middleware = ErrorHandlingMiddleware(None)
    return await middleware.dispatch(request, call_next)


async def api_error_handler(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """
    API-specific error handler function with enhanced security.

    Usage:
        from fastapi import FastAPI
        from errors.middleware import api_error_handler

        app = FastAPI()
        app.middleware("http")(api_error_handler)
    """
    middleware = APIErrorHandlerMiddleware(None)
    return await middleware.dispatch(request, call_next)


# Error handling decorators for route handlers
def handle_errors(
    error_category: Optional[ErrorCategory] = None,
    log_level: str = "error",
    include_request_data: bool = False
):
    """
    Decorator for route handlers to provide consistent error handling.

    Args:
        error_category: Default error category for unhandled errors
        log_level: Logging level for errors
        include_request_data: Whether to include request data in error logs

    Usage:
        @app.get("/api/v1/agents")
        @handle_errors(error_category=ErrorCategory.AGENT_MANAGEMENT)
        async def list_agents():
            # Route implementation
    """
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except ParlantIntegrationError:
                # Re-raise Parlant errors (already handled)
                raise
            except Exception as e:
                # Convert unexpected errors to Parlant errors
                from .handlers import handle_system_error

                context = None
                if 'request' in kwargs:
                    request = kwargs['request']
                    context = ErrorContext(
                        endpoint=request.url.path,
                        method=request.method,
                        user_agent=request.headers.get('user-agent'),
                        ip_address=request.client.host if request.client else None
                    )

                raise handle_system_error(
                    message=f"Unexpected error in {func.__name__}: {str(e)}",
                    component=func.__name__,
                    context=context
                )
        return wrapper
    return decorator


# Configuration functions
def configure_error_handling(
    debug_mode: bool = False,
    include_stack_traces: bool = False,
    enable_metrics: bool = True,
    enable_detailed_logging: bool = True
):
    """Configure global error handling settings"""
    set_error_handler_config(debug_mode, include_stack_traces)

    # Store configuration for middleware initialization
    ErrorHandlingMiddleware._default_config = {
        'debug_mode': debug_mode,
        'include_stack_traces': include_stack_traces,
        'enable_metrics': enable_metrics,
        'enable_detailed_logging': enable_detailed_logging
    }


def get_error_handling_stats() -> Dict[str, Any]:
    """Get error handling statistics"""
    stats = {
        'timestamp': datetime.now().isoformat(),
        'configuration': getattr(ErrorHandlingMiddleware, '_default_config', {}),
    }

    # Add metrics if available
    try:
        error_metrics = ErrorMetrics()
        stats['metrics'] = error_metrics.get_stats()
    except:
        stats['metrics'] = None

    return stats