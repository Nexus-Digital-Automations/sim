"""
Authentication and Authorization Error Handling

Specialized error handling for authentication and authorization failures
in the Parlant integration, with secure error responses and detailed logging.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from .base import (
    ParlantAuthenticationError,
    ParlantAuthorizationError,
    ErrorContext,
    ErrorSeverity
)
from .handlers import (
    handle_authentication_error,
    handle_authorization_error,
    check_workspace_access,
    ensure_authenticated
)
from .monitoring import get_error_metrics


logger = logging.getLogger(__name__)


class AuthenticationErrorHandler:
    """
    Handles authentication-related errors with security best practices.

    Features:
    - Rate limiting for failed authentication attempts
    - Detailed logging for security monitoring
    - Secure error responses that don't leak information
    - Session validation and cleanup
    """

    def __init__(self):
        self.failed_attempts: Dict[str, List[datetime]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        self.max_attempts_per_ip = 10  # Max attempts per IP per hour
        self.block_duration_minutes = 30

    def handle_invalid_token(
        self,
        token: Optional[str] = None,
        ip_address: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthenticationError:
        """Handle invalid or expired token errors"""
        # Log security event
        self._log_authentication_failure("invalid_token", ip_address, context)

        # Track failed attempts
        if ip_address:
            self._track_failed_attempt(ip_address)

        # Create secure error response
        return handle_authentication_error(
            message="Authentication failed",
            error_code="INVALID_TOKEN",
            context=context
        )

    def handle_missing_token(
        self,
        ip_address: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthenticationError:
        """Handle missing authentication token"""
        self._log_authentication_failure("missing_token", ip_address, context)

        return handle_authentication_error(
            message="Authentication token required",
            error_code="MISSING_TOKEN",
            context=context
        )

    def handle_expired_session(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthenticationError:
        """Handle expired session errors"""
        self._log_authentication_failure(
            "expired_session",
            context.ip_address if context else None,
            context,
            additional_data={'session_id': session_id, 'user_id': user_id}
        )

        return handle_authentication_error(
            message="Session has expired",
            error_code="SESSION_EXPIRED",
            context=context
        )

    def handle_session_validation_error(
        self,
        session_id: Optional[str] = None,
        validation_error: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthenticationError:
        """Handle session validation failures"""
        self._log_authentication_failure(
            "session_validation_failed",
            context.ip_address if context else None,
            context,
            additional_data={
                'session_id': session_id,
                'validation_error': validation_error
            }
        )

        return handle_authentication_error(
            message="Session validation failed",
            error_code="SESSION_VALIDATION_FAILED",
            context=context
        )

    def check_rate_limit(self, ip_address: str) -> bool:
        """Check if IP address is rate limited for authentication attempts"""
        if not ip_address:
            return True  # Allow if no IP available

        # Check if IP is currently blocked
        if ip_address in self.blocked_ips:
            block_expiry = self.blocked_ips[ip_address] + timedelta(minutes=self.block_duration_minutes)
            if datetime.now() < block_expiry:
                return False  # Still blocked
            else:
                # Block expired, remove from blocked list
                del self.blocked_ips[ip_address]

        # Check failed attempts in last hour
        cutoff_time = datetime.now() - timedelta(hours=1)
        if ip_address in self.failed_attempts:
            recent_attempts = [
                attempt for attempt in self.failed_attempts[ip_address]
                if attempt >= cutoff_time
            ]
            self.failed_attempts[ip_address] = recent_attempts

            if len(recent_attempts) >= self.max_attempts_per_ip:
                # Block the IP
                self.blocked_ips[ip_address] = datetime.now()
                logger.warning(f"IP {ip_address} blocked due to too many failed authentication attempts")
                return False

        return True

    def _track_failed_attempt(self, ip_address: str):
        """Track failed authentication attempt for rate limiting"""
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []

        self.failed_attempts[ip_address].append(datetime.now())

        # Record metric
        metrics = get_error_metrics()
        metrics.increment_counter('auth_failed_attempts', {'ip_address': ip_address})

    def _log_authentication_failure(
        self,
        failure_type: str,
        ip_address: Optional[str],
        context: Optional[ErrorContext],
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Log authentication failure for security monitoring"""
        log_data = {
            'failure_type': failure_type,
            'ip_address': ip_address,
            'timestamp': datetime.now().isoformat(),
            'endpoint': context.endpoint if context else None,
            'user_agent': context.user_agent if context else None,
            'request_id': context.request_id if context else None,
        }

        if additional_data:
            log_data.update(additional_data)

        logger.warning(f"Authentication failure: {failure_type}", extra=log_data)

        # Record security metric
        metrics = get_error_metrics()
        metrics.increment_counter('security_events', {
            'type': 'authentication_failure',
            'subtype': failure_type
        })


class AuthorizationErrorHandler:
    """
    Handles authorization-related errors with workspace isolation and permissions.

    Features:
    - Workspace access validation
    - Permission-based authorization
    - Detailed audit logging
    - Secure error responses
    """

    def __init__(self):
        self.access_violations: Dict[str, List[Dict[str, Any]]] = {}

    def handle_workspace_access_denied(
        self,
        user_id: str,
        workspace_id: str,
        user_workspaces: Optional[List[Dict[str, Any]]] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthorizationError:
        """Handle workspace access denial"""
        self._log_authorization_failure(
            "workspace_access_denied",
            user_id,
            context,
            additional_data={
                'requested_workspace': workspace_id,
                'authorized_workspaces': [w.get('id') for w in user_workspaces or []]
            }
        )

        from .base import create_workspace_isolation_error
        raise create_workspace_isolation_error(
            attempted_workspace=workspace_id,
            authorized_workspaces=[w.get('id') for w in user_workspaces or []],
            context=context
        )

    def handle_insufficient_permissions(
        self,
        user_id: str,
        required_permissions: List[str],
        user_permissions: Optional[List[str]] = None,
        resource: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthorizationError:
        """Handle insufficient permission errors"""
        self._log_authorization_failure(
            "insufficient_permissions",
            user_id,
            context,
            additional_data={
                'required_permissions': required_permissions,
                'user_permissions': user_permissions or [],
                'resource': resource
            }
        )

        return handle_authorization_error(
            message="Insufficient permissions for this operation",
            error_code="INSUFFICIENT_PERMISSIONS",
            required_permissions=required_permissions,
            context=context
        )

    def handle_agent_access_denied(
        self,
        user_id: str,
        agent_id: str,
        workspace_id: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthorizationError:
        """Handle agent access denial"""
        self._log_authorization_failure(
            "agent_access_denied",
            user_id,
            context,
            additional_data={
                'agent_id': agent_id,
                'workspace_id': workspace_id
            }
        )

        return handle_authorization_error(
            message="Access denied to agent",
            error_code="AGENT_ACCESS_DENIED",
            context=context
        )

    def handle_session_access_denied(
        self,
        user_id: str,
        session_id: str,
        session_owner: Optional[str] = None,
        workspace_id: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ) -> ParlantAuthorizationError:
        """Handle session access denial"""
        self._log_authorization_failure(
            "session_access_denied",
            user_id,
            context,
            additional_data={
                'session_id': session_id,
                'session_owner': session_owner,
                'workspace_id': workspace_id
            }
        )

        return handle_authorization_error(
            message="Access denied to session",
            error_code="SESSION_ACCESS_DENIED",
            context=context
        )

    def validate_workspace_access(
        self,
        user_id: str,
        workspace_id: str,
        user_workspaces: List[Dict[str, Any]],
        context: Optional[ErrorContext] = None
    ):
        """Validate user has access to workspace"""
        try:
            check_workspace_access(user_workspaces, workspace_id, user_id)
        except Exception as e:
            # Re-raise with proper context
            raise self.handle_workspace_access_denied(
                user_id=user_id,
                workspace_id=workspace_id,
                user_workspaces=user_workspaces,
                context=context
            )

    def validate_permissions(
        self,
        user_id: str,
        required_permissions: List[str],
        user_permissions: List[str],
        resource: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ):
        """Validate user has required permissions"""
        missing_permissions = [
            perm for perm in required_permissions
            if perm not in user_permissions
        ]

        if missing_permissions:
            raise self.handle_insufficient_permissions(
                user_id=user_id,
                required_permissions=missing_permissions,
                user_permissions=user_permissions,
                resource=resource,
                context=context
            )

    def _log_authorization_failure(
        self,
        failure_type: str,
        user_id: str,
        context: Optional[ErrorContext],
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Log authorization failure for audit trail"""
        log_data = {
            'failure_type': failure_type,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'endpoint': context.endpoint if context else None,
            'method': context.method if context else None,
            'ip_address': context.ip_address if context else None,
            'user_agent': context.user_agent if context else None,
            'request_id': context.request_id if context else None,
        }

        if additional_data:
            log_data.update(additional_data)

        # Log as security event
        logger.warning(f"Authorization failure: {failure_type}", extra=log_data)

        # Track access violations per user
        if user_id not in self.access_violations:
            self.access_violations[user_id] = []

        self.access_violations[user_id].append(log_data)

        # Keep only recent violations (last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.access_violations[user_id] = [
            violation for violation in self.access_violations[user_id]
            if datetime.fromisoformat(violation['timestamp']) >= cutoff_time
        ]

        # Record security metric
        metrics = get_error_metrics()
        metrics.increment_counter('security_events', {
            'type': 'authorization_failure',
            'subtype': failure_type
        })


# Global handlers
_auth_handler: Optional[AuthenticationErrorHandler] = None
_authz_handler: Optional[AuthorizationErrorHandler] = None


def get_authentication_handler() -> AuthenticationErrorHandler:
    """Get global authentication error handler"""
    global _auth_handler
    if _auth_handler is None:
        _auth_handler = AuthenticationErrorHandler()
    return _auth_handler


def get_authorization_handler() -> AuthorizationErrorHandler:
    """Get global authorization error handler"""
    global _authz_handler
    if _authz_handler is None:
        _authz_handler = AuthorizationErrorHandler()
    return _authz_handler


# Convenience functions for common authentication/authorization operations

def validate_authentication(
    session,
    ip_address: Optional[str] = None,
    context: Optional[ErrorContext] = None
):
    """Validate authentication with rate limiting and security checks"""
    auth_handler = get_authentication_handler()

    # Check rate limiting
    if ip_address and not auth_handler.check_rate_limit(ip_address):
        raise handle_authentication_error(
            message="Too many failed authentication attempts. Please try again later.",
            error_code="RATE_LIMITED",
            context=context
        )

    # Validate session
    ensure_authenticated(session)


def validate_workspace_authorization(
    user_id: str,
    workspace_id: str,
    user_workspaces: List[Dict[str, Any]],
    context: Optional[ErrorContext] = None
):
    """Validate user has access to workspace"""
    authz_handler = get_authorization_handler()
    authz_handler.validate_workspace_access(
        user_id=user_id,
        workspace_id=workspace_id,
        user_workspaces=user_workspaces,
        context=context
    )


def validate_permissions(
    user_id: str,
    required_permissions: List[str],
    user_permissions: List[str],
    resource: Optional[str] = None,
    context: Optional[ErrorContext] = None
):
    """Validate user has required permissions"""
    authz_handler = get_authorization_handler()
    authz_handler.validate_permissions(
        user_id=user_id,
        required_permissions=required_permissions,
        user_permissions=user_permissions,
        resource=resource,
        context=context
    )


def get_security_stats() -> Dict[str, Any]:
    """Get security statistics for monitoring"""
    auth_handler = get_authentication_handler()
    authz_handler = get_authorization_handler()

    return {
        'authentication': {
            'blocked_ips': len(auth_handler.blocked_ips),
            'failed_attempts_ips': len(auth_handler.failed_attempts),
            'total_failed_attempts': sum(
                len(attempts) for attempts in auth_handler.failed_attempts.values()
            )
        },
        'authorization': {
            'users_with_violations': len(authz_handler.access_violations),
            'total_violations': sum(
                len(violations) for violations in authz_handler.access_violations.values()
            )
        }
    }


def cleanup_security_data():
    """Cleanup old security data"""
    auth_handler = get_authentication_handler()
    authz_handler = get_authorization_handler()

    # Cleanup old blocked IPs
    current_time = datetime.now()
    expired_blocks = [
        ip for ip, block_time in auth_handler.blocked_ips.items()
        if current_time >= block_time + timedelta(minutes=auth_handler.block_duration_minutes)
    ]

    for ip in expired_blocks:
        del auth_handler.blocked_ips[ip]

    # Cleanup old failed attempts
    cutoff_time = current_time - timedelta(hours=1)
    for ip in list(auth_handler.failed_attempts.keys()):
        auth_handler.failed_attempts[ip] = [
            attempt for attempt in auth_handler.failed_attempts[ip]
            if attempt >= cutoff_time
        ]
        if not auth_handler.failed_attempts[ip]:
            del auth_handler.failed_attempts[ip]

    logger.info("Security data cleanup completed")