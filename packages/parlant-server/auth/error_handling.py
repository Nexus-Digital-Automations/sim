"""
Authentication Error Handling and Validation
Provides comprehensive error handling and validation for authentication flows
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass

from fastapi import HTTPException, status
from pydantic import BaseModel, validator

logger = logging.getLogger(__name__)


class AuthErrorCode(Enum):
    """Authentication error codes."""
    INVALID_TOKEN = "INVALID_TOKEN"
    EXPIRED_TOKEN = "EXPIRED_TOKEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    WORKSPACE_ACCESS_DENIED = "WORKSPACE_ACCESS_DENIED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_REVOKED = "TOKEN_REVOKED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    MALFORMED_REQUEST = "MALFORMED_REQUEST"
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_SIGNATURE = "INVALID_SIGNATURE"
    WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"


@dataclass
class AuthError:
    """Authentication error with context."""
    code: AuthErrorCode
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None


class AuthenticationValidator:
    """Validates authentication-related inputs and requests."""

    @staticmethod
    def validate_session_token(token: str) -> bool:
        """Validate session token format."""
        if not token:
            return False

        # Basic format validation
        if not isinstance(token, str) or len(token) < 10:
            return False

        # Check for suspicious patterns
        if any(char in token for char in [' ', '\n', '\r', '\t']):
            return False

        return True

    @staticmethod
    def validate_workspace_id(workspace_id: str) -> bool:
        """Validate workspace ID format."""
        if not workspace_id or not isinstance(workspace_id, str):
            return False

        # Basic validation - adjust based on your ID format
        if len(workspace_id) < 3 or len(workspace_id) > 128:
            return False

        return True

    @staticmethod
    def validate_agent_id(agent_id: str) -> bool:
        """Validate agent ID format."""
        if not agent_id or not isinstance(agent_id, str):
            return False

        # UUID format validation (assuming UUIDs)
        import uuid
        try:
            uuid.UUID(agent_id)
            return True
        except ValueError:
            return False

    @staticmethod
    def validate_permissions(permissions: List[str]) -> bool:
        """Validate permissions list."""
        if not isinstance(permissions, list):
            return False

        valid_permissions = {
            'read', 'write', 'admin', 'delete', 'manage',
            'create_agent', 'delete_agent', 'manage_workspace'
        }

        for perm in permissions:
            if not isinstance(perm, str) or perm not in valid_permissions:
                return False

        return True

    @staticmethod
    def validate_user_context(context: Dict[str, Any]) -> bool:
        """Validate user context structure."""
        required_fields = ['user_id', 'email', 'name']

        for field in required_fields:
            if field not in context:
                return False

        # Validate email format
        email = context.get('email', '')
        if not email or '@' not in email:
            return False

        return True


class AuthExceptionHandler:
    """Handles authentication exceptions and creates appropriate responses."""

    def __init__(self):
        self.error_logger = logging.getLogger('auth_errors')

    def create_auth_exception(
        self,
        error_code: AuthErrorCode,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        status_code: int = status.HTTP_401_UNAUTHORIZED
    ) -> HTTPException:
        """Create an authentication exception."""

        if message is None:
            message = self._get_default_message(error_code)

        error = AuthError(
            code=error_code,
            message=message,
            details=details or {},
            timestamp=datetime.utcnow(),
            user_id=user_id,
        )

        # Log the error
        self._log_auth_error(error)

        # Create HTTPException
        return HTTPException(
            status_code=status_code,
            detail={
                "error": error_code.value,
                "message": message,
                "details": details or {},
                "timestamp": error.timestamp.isoformat()
            }
        )

    def handle_invalid_token(
        self,
        token: str,
        reason: str = "Token is invalid or malformed",
        user_id: Optional[str] = None
    ) -> HTTPException:
        """Handle invalid token error."""
        return self.create_auth_exception(
            AuthErrorCode.INVALID_TOKEN,
            reason,
            {"token_length": len(token) if token else 0},
            user_id,
            status.HTTP_401_UNAUTHORIZED
        )

    def handle_expired_token(
        self,
        expired_at: datetime,
        user_id: Optional[str] = None
    ) -> HTTPException:
        """Handle expired token error."""
        return self.create_auth_exception(
            AuthErrorCode.EXPIRED_TOKEN,
            "Token has expired",
            {"expired_at": expired_at.isoformat()},
            user_id,
            status.HTTP_401_UNAUTHORIZED
        )

    def handle_insufficient_permissions(
        self,
        required_permissions: List[str],
        user_permissions: List[str],
        user_id: Optional[str] = None
    ) -> HTTPException:
        """Handle insufficient permissions error."""
        return self.create_auth_exception(
            AuthErrorCode.INSUFFICIENT_PERMISSIONS,
            "Insufficient permissions to perform this action",
            {
                "required_permissions": required_permissions,
                "user_permissions": user_permissions
            },
            user_id,
            status.HTTP_403_FORBIDDEN
        )

    def handle_workspace_access_denied(
        self,
        workspace_id: str,
        user_id: str
    ) -> HTTPException:
        """Handle workspace access denied error."""
        return self.create_auth_exception(
            AuthErrorCode.WORKSPACE_ACCESS_DENIED,
            f"Access denied to workspace {workspace_id}",
            {"workspace_id": workspace_id},
            user_id,
            status.HTTP_403_FORBIDDEN
        )

    def handle_session_expired(
        self,
        session_id: str,
        expired_at: datetime,
        user_id: Optional[str] = None
    ) -> HTTPException:
        """Handle session expired error."""
        return self.create_auth_exception(
            AuthErrorCode.SESSION_EXPIRED,
            "Session has expired",
            {
                "session_id": session_id,
                "expired_at": expired_at.isoformat()
            },
            user_id,
            status.HTTP_401_UNAUTHORIZED
        )

    def handle_rate_limit_exceeded(
        self,
        user_id: str,
        limit: int,
        window_seconds: int,
        reset_at: datetime
    ) -> HTTPException:
        """Handle rate limit exceeded error."""
        return self.create_auth_exception(
            AuthErrorCode.RATE_LIMIT_EXCEEDED,
            "Rate limit exceeded",
            {
                "limit": limit,
                "window_seconds": window_seconds,
                "reset_at": reset_at.isoformat()
            },
            user_id,
            status.HTTP_429_TOO_MANY_REQUESTS
        )

    def handle_malformed_request(
        self,
        field: str,
        expected_format: str,
        received_value: Any
    ) -> HTTPException:
        """Handle malformed request error."""
        return self.create_auth_exception(
            AuthErrorCode.MALFORMED_REQUEST,
            f"Malformed request: invalid {field}",
            {
                "field": field,
                "expected_format": expected_format,
                "received_type": type(received_value).__name__
            },
            None,
            status.HTTP_400_BAD_REQUEST
        )

    def _get_default_message(self, error_code: AuthErrorCode) -> str:
        """Get default message for error code."""
        messages = {
            AuthErrorCode.INVALID_TOKEN: "Invalid authentication token",
            AuthErrorCode.EXPIRED_TOKEN: "Authentication token has expired",
            AuthErrorCode.INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
            AuthErrorCode.WORKSPACE_ACCESS_DENIED: "Access denied to workspace",
            AuthErrorCode.SESSION_EXPIRED: "Session has expired",
            AuthErrorCode.USER_NOT_FOUND: "User not found",
            AuthErrorCode.INVALID_CREDENTIALS: "Invalid credentials",
            AuthErrorCode.TOKEN_REVOKED: "Token has been revoked",
            AuthErrorCode.RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
            AuthErrorCode.MALFORMED_REQUEST: "Malformed request",
            AuthErrorCode.AUTHENTICATION_REQUIRED: "Authentication required",
            AuthErrorCode.FORBIDDEN: "Access forbidden",
            AuthErrorCode.INVALID_SIGNATURE: "Invalid token signature",
            AuthErrorCode.WORKSPACE_NOT_FOUND: "Workspace not found",
            AuthErrorCode.AGENT_NOT_FOUND: "Agent not found"
        }
        return messages.get(error_code, "Authentication error")

    def _log_auth_error(self, error: AuthError):
        """Log authentication error for monitoring."""
        log_data = {
            "error_code": error.code.value,
            "message": error.message,
            "user_id": error.user_id,
            "timestamp": error.timestamp.isoformat(),
            "details": error.details
        }

        if error.code in [AuthErrorCode.INVALID_TOKEN, AuthErrorCode.EXPIRED_TOKEN]:
            self.error_logger.warning("Authentication error", extra=log_data)
        elif error.code in [AuthErrorCode.INSUFFICIENT_PERMISSIONS, AuthErrorCode.WORKSPACE_ACCESS_DENIED]:
            self.error_logger.warning("Authorization error", extra=log_data)
        else:
            self.error_logger.error("Authentication system error", extra=log_data)


class RequestValidator(BaseModel):
    """Validates incoming authentication requests."""

    @validator('workspace_id', allow_reuse=True)
    def validate_workspace_id(cls, v):
        if v is not None and not AuthenticationValidator.validate_workspace_id(v):
            raise ValueError("Invalid workspace ID format")
        return v

    @validator('agent_id', allow_reuse=True)
    def validate_agent_id(cls, v):
        if v is not None and not AuthenticationValidator.validate_agent_id(v):
            raise ValueError("Invalid agent ID format")
        return v


class SessionRequest(RequestValidator):
    """Validates session creation requests."""
    agent_id: str
    workspace_id: str
    metadata: Optional[Dict[str, Any]] = {}


class TokenRequest(RequestValidator):
    """Validates token requests."""
    workspace_id: str
    permissions: List[str] = []

    @validator('permissions')
    def validate_permissions(cls, v):
        if not AuthenticationValidator.validate_permissions(v):
            raise ValueError("Invalid permissions")
        return v


class SecurityMonitor:
    """Monitors security events and potential threats."""

    def __init__(self):
        self.security_logger = logging.getLogger('security')
        self.failed_attempts = {}  # In production, use Redis
        self.max_failed_attempts = 5
        self.lockout_duration = timedelta(minutes=15)

    def record_failed_authentication(
        self,
        user_id: Optional[str],
        ip_address: str,
        error_code: AuthErrorCode
    ):
        """Record failed authentication attempt."""
        key = user_id or ip_address
        now = datetime.utcnow()

        if key not in self.failed_attempts:
            self.failed_attempts[key] = []

        self.failed_attempts[key].append({
            "timestamp": now,
            "error_code": error_code.value,
            "ip_address": ip_address
        })

        # Clean old attempts
        cutoff = now - self.lockout_duration
        self.failed_attempts[key] = [
            attempt for attempt in self.failed_attempts[key]
            if attempt["timestamp"] > cutoff
        ]

        # Log security event
        self.security_logger.warning(
            f"Failed authentication attempt: {error_code.value}",
            extra={
                "user_id": user_id,
                "ip_address": ip_address,
                "error_code": error_code.value,
                "attempt_count": len(self.failed_attempts[key])
            }
        )

    def is_locked_out(self, user_id: Optional[str], ip_address: str) -> bool:
        """Check if user/IP is locked out due to failed attempts."""
        key = user_id or ip_address

        if key not in self.failed_attempts:
            return False

        recent_attempts = len(self.failed_attempts[key])
        return recent_attempts >= self.max_failed_attempts

    def record_suspicious_activity(
        self,
        user_id: Optional[str],
        ip_address: str,
        activity_type: str,
        details: Dict[str, Any]
    ):
        """Record suspicious activity for investigation."""
        self.security_logger.error(
            f"Suspicious activity detected: {activity_type}",
            extra={
                "user_id": user_id,
                "ip_address": ip_address,
                "activity_type": activity_type,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


# Global instances
_exception_handler: Optional[AuthExceptionHandler] = None
_security_monitor: Optional[SecurityMonitor] = None


def get_exception_handler() -> AuthExceptionHandler:
    """Get global exception handler."""
    global _exception_handler
    if _exception_handler is None:
        _exception_handler = AuthExceptionHandler()
    return _exception_handler


def get_security_monitor() -> SecurityMonitor:
    """Get global security monitor."""
    global _security_monitor
    if _security_monitor is None:
        _security_monitor = SecurityMonitor()
    return _security_monitor


# Utility functions for common error scenarios

def require_authentication(user_id: Optional[str] = None) -> HTTPException:
    """Create authentication required exception."""
    return get_exception_handler().create_auth_exception(
        AuthErrorCode.AUTHENTICATION_REQUIRED,
        "Authentication is required to access this resource",
        user_id=user_id
    )


def require_permissions(
    required: List[str],
    actual: List[str],
    user_id: Optional[str] = None
) -> HTTPException:
    """Create insufficient permissions exception."""
    return get_exception_handler().handle_insufficient_permissions(
        required, actual, user_id
    )


def workspace_not_found(workspace_id: str, user_id: Optional[str] = None) -> HTTPException:
    """Create workspace not found exception."""
    return get_exception_handler().create_auth_exception(
        AuthErrorCode.WORKSPACE_NOT_FOUND,
        f"Workspace {workspace_id} not found or access denied",
        {"workspace_id": workspace_id},
        user_id,
        status.HTTP_404_NOT_FOUND
    )


def agent_not_found(agent_id: str, user_id: Optional[str] = None) -> HTTPException:
    """Create agent not found exception."""
    return get_exception_handler().create_auth_exception(
        AuthErrorCode.AGENT_NOT_FOUND,
        f"Agent {agent_id} not found or access denied",
        {"agent_id": agent_id},
        user_id,
        status.HTTP_404_NOT_FOUND
    )