"""
Enhanced Authentication Middleware for Parlant Server
Includes rate limiting, audit logging, and advanced security features
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
import json

from fastapi import Request, Response, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware

from auth.sim_auth_bridge import SimAuthBridge, SimSession
from auth.rate_limiter import get_rate_limiter, RateLimiter
from auth.audit_logger import (
    get_audit_logger, AuditEventType, AuditSeverity,
    audit_auth_attempt, audit_session_event, audit_workspace_access,
    audit_security_alert
)

logger = logging.getLogger(__name__)

# Security scheme for FastAPI docs
security = HTTPBearer(auto_error=False)

# Global instances
_auth_bridge: Optional[SimAuthBridge] = None
_rate_limiter: Optional[RateLimiter] = None


def set_auth_bridge(auth_bridge: SimAuthBridge):
    """Set the global auth bridge instance."""
    global _auth_bridge
    _auth_bridge = auth_bridge


def get_auth_bridge() -> SimAuthBridge:
    """Get the global auth bridge instance."""
    if _auth_bridge is None:
        raise RuntimeError("Auth bridge not initialized")
    return _auth_bridge


class EnhancedAuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Enhanced middleware with comprehensive security features:

    - Rate limiting per IP and per user
    - Comprehensive audit logging
    - Threat detection and security alerts
    - Session validation with caching
    - Workspace isolation enforcement
    - Request fingerprinting for anomaly detection
    """

    # Endpoints that don't require authentication
    PUBLIC_ENDPOINTS = {
        "/",
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc"
    }

    # Sensitive endpoints that require stricter rate limiting
    SENSITIVE_ENDPOINTS = {
        "/api/v1/auth/",
        "/api/v1/sessions/",
        "/api/v1/agents/",
        "/api/v1/workspaces/"
    }

    def __init__(self, app, auth_bridge: SimAuthBridge):
        super().__init__(app)
        self.auth_bridge = auth_bridge
        self.rate_limiter = get_rate_limiter()
        self.audit_logger = get_audit_logger()

        # Security tracking
        self.failed_attempts = {}  # Track failed attempts per IP
        self.suspicious_patterns = {}  # Track suspicious activity patterns

        logger.info("Enhanced authentication middleware initialized")

    async def dispatch(self, request: Request, call_next):
        """Process request through enhanced authentication middleware."""
        start_time = datetime.now()
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")

        # Create request context for logging
        request_context = {
            "ip_address": ip_address,
            "user_agent": user_agent,
            "endpoint": request.url.path,
            "method": request.method,
            "timestamp": start_time.isoformat()
        }

        try:
            # Skip authentication for public endpoints
            if self._is_public_endpoint(request.url.path):
                response = await call_next(request)
                await self._log_public_access(request, response, request_context)
                return response

            # Skip authentication for OPTIONS requests (CORS preflight)
            if request.method == "OPTIONS":
                return await call_next(request)

            # Check rate limits before authentication
            rate_limit_check = await self._check_rate_limits(request, request_context)
            if not rate_limit_check[0]:
                return self._create_rate_limit_response(rate_limit_check[1])

            # Authenticate the request
            auth_result = await self._authenticate_request_enhanced(request, request_context)

            if not auth_result["success"]:
                await self._handle_auth_failure(request, request_context, auth_result)
                return Response(
                    content=json.dumps({"detail": auth_result["error"]}),
                    status_code=auth_result["status_code"],
                    media_type="application/json",
                    headers=auth_result.get("headers", {})
                )

            session = auth_result["session"]

            # Add session to request state
            request.state.session = session
            request.state.user = session.user
            request.state.request_context = request_context

            # Validate workspace access if required
            workspace_validation = await self._validate_workspace_access_enhanced(
                request, session, request_context
            )

            if not workspace_validation["success"]:
                return Response(
                    content=json.dumps({"detail": workspace_validation["error"]}),
                    status_code=workspace_validation["status_code"],
                    media_type="application/json"
                )

            # Log successful authentication
            await self._log_successful_auth(session, request_context)

            # Process the request
            response = await call_next(request)

            # Log successful request completion
            processing_time = (datetime.now() - start_time).total_seconds()
            await self._log_request_completion(session, request_context, response, processing_time)

            return response

        except Exception as e:
            logger.error(f"Error in authentication middleware: {e}")

            # Log the error for security monitoring
            await audit_security_alert(
                "middleware_error",
                ip_address=ip_address,
                details={
                    "error": str(e),
                    "endpoint": request.url.path,
                    "method": request.method
                }
            )

            return Response(
                content='{"detail": "Internal authentication error"}',
                status_code=500,
                media_type="application/json"
            )

    async def _check_rate_limits(self, request: Request, context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Check rate limits for the request."""
        ip_address = context["ip_address"]
        endpoint = context["endpoint"]

        # Determine rate limit rule based on endpoint sensitivity
        if any(endpoint.startswith(sensitive) for sensitive in self.SENSITIVE_ENDPOINTS):
            rule_name = "auth_attempts"
        else:
            rule_name = "api_requests"

        # Check IP-based rate limiting
        ip_allowed, ip_info = await self.rate_limiter.check_rate_limit(ip_address, rule_name)

        if not ip_allowed:
            # Log rate limit violation
            await self.audit_logger.log_rate_limit_event(
                ip_address, rule_name, blocked=True,
                ip_address=ip_address,
                metadata={
                    "endpoint": endpoint,
                    "rate_limit_info": ip_info
                }
            )

            # Check for potential brute force
            if ip_info.get("total_blocked", 0) > 5:
                await audit_security_alert(
                    "potential_brute_force",
                    ip_address=ip_address,
                    details={
                        "blocked_requests": ip_info.get("total_blocked"),
                        "rule": rule_name,
                        "endpoint": endpoint
                    }
                )

            return False, ip_info

        return True, ip_info

    def _create_rate_limit_response(self, rate_limit_info: Dict[str, Any]) -> Response:
        """Create a rate limit exceeded response."""
        headers = {
            "X-RateLimit-Limit": str(rate_limit_info.get("limit", "unknown")),
            "X-RateLimit-Remaining": str(max(0, rate_limit_info.get("remaining_requests", 0))),
            "X-RateLimit-Reset": rate_limit_info.get("reset_time", ""),
            "Retry-After": str(rate_limit_info.get("remaining_block_seconds", 60))
        }

        if rate_limit_info.get("blocked_until"):
            headers["X-RateLimit-Blocked-Until"] = rate_limit_info["blocked_until"]

        return Response(
            content=json.dumps({
                "detail": "Rate limit exceeded",
                "type": "rate_limit_exceeded",
                "retry_after": rate_limit_info.get("remaining_block_seconds", 60)
            }),
            status_code=429,
            media_type="application/json",
            headers=headers
        )

    async def _authenticate_request_enhanced(self, request: Request, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced authentication with security monitoring."""
        ip_address = context["ip_address"]

        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization:
            # Try cookie fallback
            session_token = request.cookies.get("better-auth.session_token")
            if session_token:
                authorization = f"Bearer {session_token}"

        if not authorization:
            return {
                "success": False,
                "error": "Authentication required",
                "status_code": 401,
                "reason": "missing_authorization"
            }

        try:
            # Attempt authentication
            session = await self.auth_bridge.authenticate_request(authorization)

            if session is None:
                # Track failed authentication attempt
                await self._track_failed_attempt(ip_address, "invalid_token", context)

                return {
                    "success": False,
                    "error": "Invalid or expired authentication token",
                    "status_code": 401,
                    "reason": "invalid_token"
                }

            # Enrich session with user context if available
            if request.headers.get("X-User-Context"):
                session = await self._enrich_session_with_context(session, request, context)

            # Check session validity and expiration
            if session.expires_at <= datetime.now():
                await self._track_failed_attempt(ip_address, "expired_session", context)

                return {
                    "success": False,
                    "error": "Session expired",
                    "status_code": 401,
                    "reason": "expired_session"
                }

            # Success
            await self._track_successful_attempt(ip_address, session.user.id, context)

            return {
                "success": True,
                "session": session
            }

        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await self._track_failed_attempt(ip_address, "authentication_error", context)

            return {
                "success": False,
                "error": "Authentication failed",
                "status_code": 401,
                "reason": "authentication_error"
            }

    async def _validate_workspace_access_enhanced(self, request: Request,
                                                session: SimSession,
                                                context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced workspace access validation with audit logging."""
        workspace_id = request.headers.get("X-Workspace-Id")

        if not workspace_id:
            return {"success": True}  # No workspace validation needed

        try:
            has_access = await self.auth_bridge.validate_workspace_access(session, workspace_id)

            # Log workspace access attempt
            await audit_workspace_access(
                session.user.id, workspace_id, has_access,
                ip_address=context["ip_address"],
                metadata={
                    "endpoint": context["endpoint"],
                    "user_workspaces": [w["id"] for w in session.user.workspaces]
                }
            )

            if not has_access:
                # Log security alert for unauthorized workspace access
                await audit_security_alert(
                    "unauthorized_workspace_access",
                    user_id=session.user.id,
                    ip_address=context["ip_address"],
                    details={
                        "requested_workspace": workspace_id,
                        "user_workspaces": [w["id"] for w in session.user.workspaces],
                        "endpoint": context["endpoint"]
                    }
                )

                return {
                    "success": False,
                    "error": f"Access denied to workspace {workspace_id}",
                    "status_code": 403
                }

            # Store validated workspace in request state
            request.state.workspace_id = workspace_id

            return {"success": True}

        except Exception as e:
            logger.error(f"Workspace validation error: {e}")
            return {
                "success": False,
                "error": "Workspace validation failed",
                "status_code": 403
            }

    async def _track_failed_attempt(self, ip_address: str, reason: str, context: Dict[str, Any]):
        """Track failed authentication attempts for security monitoring."""
        current_time = datetime.now()

        # Initialize tracking for IP if not exists
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []

        # Add failed attempt
        self.failed_attempts[ip_address].append({
            "timestamp": current_time,
            "reason": reason,
            "endpoint": context["endpoint"],
            "user_agent": context["user_agent"]
        })

        # Clean old attempts (keep last hour only)
        one_hour_ago = current_time - timedelta(hours=1)
        self.failed_attempts[ip_address] = [
            attempt for attempt in self.failed_attempts[ip_address]
            if attempt["timestamp"] > one_hour_ago
        ]

        # Check for suspicious patterns
        recent_attempts = len(self.failed_attempts[ip_address])

        if recent_attempts >= 5:
            # Multiple failed attempts from same IP
            await audit_security_alert(
                "multiple_auth_failures",
                ip_address=ip_address,
                details={
                    "failure_count": recent_attempts,
                    "time_window": "1_hour",
                    "latest_reason": reason,
                    "endpoint": context["endpoint"]
                }
            )

        # Log the authentication failure
        await audit_auth_attempt(
            ip_address, False,
            ip_address=ip_address,
            user_agent=context["user_agent"],
            error_message=f"Authentication failed: {reason}",
            metadata={
                "failure_count": recent_attempts,
                "endpoint": context["endpoint"]
            }
        )

    async def _track_successful_attempt(self, ip_address: str, user_id: str, context: Dict[str, Any]):
        """Track successful authentication attempts."""
        # Clear failed attempts for this IP on successful auth
        if ip_address in self.failed_attempts:
            del self.failed_attempts[ip_address]

        # Log successful authentication
        await audit_auth_attempt(
            user_id, True,
            ip_address=ip_address,
            user_agent=context["user_agent"],
            metadata={
                "endpoint": context["endpoint"]
            }
        )

    async def _enrich_session_with_context(self, session: SimSession, request: Request,
                                         context: Dict[str, Any]) -> SimSession:
        """Enrich session with additional context from request headers."""
        try:
            import base64

            context_header = request.headers.get("X-User-Context")
            if not context_header:
                return session

            # Decode user context
            decoded_context = base64.b64decode(context_header).decode('utf-8')
            user_context = json.loads(decoded_context)

            # Validate context matches session user
            if user_context.get("user_id") != session.user.id:
                await audit_security_alert(
                    "user_context_mismatch",
                    user_id=session.user.id,
                    ip_address=context["ip_address"],
                    details={
                        "session_user": session.user.id,
                        "context_user": user_context.get("user_id"),
                        "endpoint": context["endpoint"]
                    }
                )
                return session

            # Enrich session with workspace information
            if "workspaces" in user_context:
                session.user.workspaces = user_context["workspaces"]

            if user_context.get("active_organization_id"):
                session.active_organization_id = user_context["active_organization_id"]

            logger.debug(f"Enriched session with context for user {session.user.email}")
            return session

        except Exception as e:
            logger.error(f"Error enriching session with context: {e}")

            # Log security alert for context enrichment failure
            await audit_security_alert(
                "session_enrichment_error",
                user_id=session.user.id,
                ip_address=context["ip_address"],
                details={
                    "error": str(e),
                    "endpoint": context["endpoint"]
                }
            )

            return session

    async def _handle_auth_failure(self, request: Request, context: Dict[str, Any], auth_result: Dict[str, Any]):
        """Handle authentication failure with appropriate response."""
        reason = auth_result.get("reason", "unknown")

        # Add security headers
        auth_result["headers"] = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block"
        }

    async def _log_public_access(self, request: Request, response: Response, context: Dict[str, Any]):
        """Log access to public endpoints."""
        if request.url.path in ["/health"]:
            return  # Don't log health checks

        # Log public endpoint access
        logger.debug(f"Public endpoint access: {context['ip_address']} -> {context['endpoint']}")

    async def _log_successful_auth(self, session: SimSession, context: Dict[str, Any]):
        """Log successful authentication."""
        await audit_session_event(
            AuditEventType.SESSION_VALIDATED,
            session.id,
            user_id=session.user.id,
            metadata={
                "endpoint": context["endpoint"],
                "ip_address": context["ip_address"],
                "user_agent": context["user_agent"]
            }
        )

    async def _log_request_completion(self, session: SimSession, context: Dict[str, Any],
                                    response: Response, processing_time: float):
        """Log successful request completion."""
        # Only log for sensitive endpoints or long-running requests
        if (any(context["endpoint"].startswith(sensitive) for sensitive in self.SENSITIVE_ENDPOINTS) or
            processing_time > 5.0):  # Log requests taking more than 5 seconds

            logger.info(f"Request completed: {session.user.email} -> {context['endpoint']} "
                       f"({processing_time:.3f}s, status: {response.status_code})")

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers (load balancer, proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()

        forwarded = request.headers.get("X-Forwarded")
        if forwarded:
            return forwarded.split(',')[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        # Fallback to direct connection
        if request.client:
            return request.client.host

        return "unknown"

    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (doesn't require authentication)."""
        # Exact match for known public endpoints
        if path in self.PUBLIC_ENDPOINTS:
            return True

        # Static file serving (if any)
        if path.startswith("/static/"):
            return True

        return False

    async def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics from middleware."""
        rate_limiter_stats = self.rate_limiter.get_stats()
        audit_stats = self.audit_logger.get_stats()

        # Count current failed attempts by IP
        active_failed_attempts = {
            ip: len(attempts) for ip, attempts in self.failed_attempts.items()
        }

        return {
            "rate_limiting": rate_limiter_stats,
            "audit_logging": audit_stats,
            "failed_attempts": {
                "total_ips_with_failures": len(active_failed_attempts),
                "ips_with_multiple_failures": len([ip for ip, count in active_failed_attempts.items() if count >= 3]),
                "total_recent_failures": sum(active_failed_attempts.values())
            },
            "middleware_status": "active"
        }


# Simplified middleware function for FastAPI middleware decorator
async def enhanced_auth_middleware(request: Request, call_next):
    """
    Simplified enhanced middleware function for use with FastAPI middleware decorator.
    """
    auth_bridge = get_auth_bridge()
    middleware = EnhancedAuthenticationMiddleware(None, auth_bridge)
    return await middleware.dispatch(request, call_next)


# Dependencies for route handlers
async def get_current_session(request: Request) -> SimSession:
    """FastAPI dependency to get current authenticated session."""
    if not hasattr(request.state, "session"):
        raise HTTPException(status_code=401, detail="Authentication required")
    return request.state.session


async def get_current_user(request: Request):
    """FastAPI dependency to get current authenticated user."""
    session = await get_current_session(request)
    return session.user


async def get_request_context(request: Request) -> Dict[str, Any]:
    """FastAPI dependency to get request context for logging."""
    if not hasattr(request.state, "request_context"):
        return {}
    return request.state.request_context


async def require_workspace_access(workspace_id: str, request: Request) -> SimSession:
    """FastAPI dependency to require access to specific workspace."""
    session = await get_current_session(request)
    auth_bridge = get_auth_bridge()

    has_access = await auth_bridge.validate_workspace_access(session, workspace_id)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to workspace {workspace_id}"
        )

    return session