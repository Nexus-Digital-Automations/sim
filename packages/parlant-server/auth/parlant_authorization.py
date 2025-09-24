#!/usr/bin/env python3
"""
Parlant Authorization Policy Integration with Sim
=================================================

This module provides a Parlant-compatible authorization policy that integrates
with Sim's authentication system, providing fine-grained access control for
Parlant operations based on user context, workspace access, and subscription plans.

Key Features:
- Integration with Parlant's Authorization framework
- Sim user context and workspace isolation
- Subscription plan-based operation authorization
- Rate limiting based on user/organization tiers
- Security headers and enhanced protection
"""

import logging
from typing import Dict, Any, Optional, Set
from datetime import datetime, timezone

from fastapi import Request
from parlant.api.authorization import (
    AuthorizationPolicy,
    AuthorizationException,
    RateLimitExceededException,
    Operation,
    BasicRateLimiter,
)
from limits import RateLimitItemPerMinute

from auth.sim_auth_bridge import SimAuthBridge, SimSession, SimUser

# Configure logging
logger = logging.getLogger(__name__)


class SimParlantAuthorizationPolicy(AuthorizationPolicy):
    """
    Authorization policy that integrates Sim's user context with Parlant's operations.

    This policy validates permissions based on Sim's user context, workspace access,
    subscription plans, and organizational boundaries while providing appropriate
    rate limiting based on user subscription tiers.
    """

    def __init__(self, auth_bridge: SimAuthBridge):
        """
        Initialize authorization policy.

        Args:
            auth_bridge: Sim authentication bridge for user context validation
        """
        self.auth_bridge = auth_bridge

        # Operation permissions based on subscription plans
        self._plan_operations = {
            "free": {
                # Basic operations for free tier users
                Operation.CREATE_GUEST_SESSION,
                Operation.READ_SESSION,
                Operation.READ_AGENT,
                Operation.READ_AGENT_DESCRIPTION,
                Operation.READ_EVENT,
                Operation.LIST_EVENTS,
                Operation.CREATE_CUSTOMER_EVENT,
                Operation.READ_CUSTOMER,
            },
            "team": {
                # Team tier gets free operations plus advanced features
                Operation.CREATE_AGENT,
                Operation.UPDATE_AGENT,
                Operation.DELETE_AGENT,
                Operation.LIST_AGENTS,
                Operation.CREATE_CUSTOMER_SESSION,
                Operation.UPDATE_SESSION,
                Operation.DELETE_SESSION,
                Operation.CREATE_CUSTOMER,
                Operation.UPDATE_CUSTOMER,
                Operation.DELETE_CUSTOMER,
                Operation.LIST_CUSTOMERS,
                Operation.CREATE_CAPABILITY,
                Operation.READ_CAPABILITY,
                Operation.LIST_CAPABILITIES,
                Operation.UPDATE_CAPABILITY,
                Operation.DELETE_CAPABILITY,
            },
            "enterprise": {
                # Enterprise tier gets access to all operations
                *[op for op in Operation]
            }
        }

        # Rate limits based on subscription plans (requests per minute)
        self._plan_rate_limits = {
            "free": {
                Operation.CREATE_CUSTOMER_EVENT: RateLimitItemPerMinute(30),
                Operation.READ_SESSION: RateLimitItemPerMinute(50),
                Operation.LIST_EVENTS: RateLimitItemPerMinute(100),
                Operation.CREATE_GUEST_SESSION: RateLimitItemPerMinute(10),
            },
            "team": {
                Operation.CREATE_CUSTOMER_EVENT: RateLimitItemPerMinute(200),
                Operation.READ_SESSION: RateLimitItemPerMinute(300),
                Operation.LIST_EVENTS: RateLimitItemPerMinute(500),
                Operation.CREATE_GUEST_SESSION: RateLimitItemPerMinute(50),
                Operation.CREATE_AGENT: RateLimitItemPerMinute(20),
                Operation.UPDATE_AGENT: RateLimitItemPerMinute(50),
            },
            "enterprise": {
                # Enterprise gets higher limits across all operations
                Operation.CREATE_CUSTOMER_EVENT: RateLimitItemPerMinute(1000),
                Operation.READ_SESSION: RateLimitItemPerMinute(2000),
                Operation.LIST_EVENTS: RateLimitItemPerMinute(3000),
                Operation.CREATE_GUEST_SESSION: RateLimitItemPerMinute(200),
                Operation.CREATE_AGENT: RateLimitItemPerMinute(100),
                Operation.UPDATE_AGENT: RateLimitItemPerMinute(200),
            }
        }

        # Initialize rate limiters for each plan
        self._rate_limiters = {}
        for plan, limits in self._plan_rate_limits.items():
            self._rate_limiters[plan] = BasicRateLimiter(
                rate_limit_item_per_operation=limits
            )

    @property
    def name(self) -> str:
        return "sim_parlant_integration"

    async def check_permission(self, request: Request, operation: Operation) -> bool:
        """
        Check if the user has permission to perform the operation.

        Args:
            request: FastAPI request object
            operation: Parlant operation being requested

        Returns:
            bool: True if authorized, False otherwise
        """
        try:
            # Get authenticated session from request
            session = await self._get_authenticated_session(request)
            if not session:
                logger.warning("No authenticated session found for permission check")
                return False

            # Get user's subscription plan
            subscription_plan = await self._get_user_subscription_plan(session.user.id)

            # Check if operation is allowed for user's subscription plan
            allowed_operations = self._get_allowed_operations(subscription_plan)

            if operation not in allowed_operations:
                logger.warning(
                    f"Operation {operation.value} not allowed for plan {subscription_plan} "
                    f"(user: {session.user.email})"
                )
                return False

            # Check workspace-specific permissions for workspace-scoped operations
            if await self._requires_workspace_permission(operation, request):
                workspace_id = await self._extract_workspace_id(request)
                if workspace_id and not await self.auth_bridge.validate_workspace_access(session, workspace_id):
                    logger.warning(
                        f"User {session.user.email} denied workspace access to {workspace_id} "
                        f"for operation {operation.value}"
                    )
                    return False

            # Store session in request state for use in rate limiting
            request.state.sim_session = session
            request.state.subscription_plan = subscription_plan

            logger.debug(
                f"Permission granted: {operation.value} for user {session.user.email} "
                f"(plan: {subscription_plan})"
            )

            return True

        except Exception as e:
            logger.error(f"Permission check failed for operation {operation.value}: {e}")
            return False

    async def check_rate_limit(self, request: Request, operation: Operation) -> bool:
        """
        Check rate limit for the operation based on user's subscription plan.

        Args:
            request: FastAPI request object
            operation: Parlant operation being requested

        Returns:
            bool: True if within rate limit, False if exceeded
        """
        try:
            # Get session and subscription plan from request state
            session = getattr(request.state, "sim_session", None)
            subscription_plan = getattr(request.state, "subscription_plan", None)

            if not session or not subscription_plan:
                logger.warning("Rate limit check: missing session or subscription plan")
                return False

            # Get appropriate rate limiter for user's plan
            rate_limiter = self._rate_limiters.get(subscription_plan)
            if not rate_limiter:
                logger.warning(f"No rate limiter found for plan: {subscription_plan}")
                return True  # Allow if no specific limiter configured

            # Use organization-level rate limiting for team/enterprise plans
            rate_limit_key = self._get_rate_limit_key(session, subscription_plan)

            # Check rate limit using Parlant's rate limiter
            is_allowed = await rate_limiter.check(request, operation)

            if not is_allowed:
                logger.warning(
                    f"Rate limit exceeded for {operation.value}: "
                    f"user={session.user.email}, plan={subscription_plan}, key={rate_limit_key}"
                )

            return is_allowed

        except Exception as e:
            logger.error(f"Rate limit check failed for operation {operation.value}: {e}")
            # Allow request on error to avoid blocking legitimate traffic
            return True

    async def _get_authenticated_session(self, request: Request) -> Optional[SimSession]:
        """Extract authenticated session from request."""
        # Try to get from request state (set by middleware)
        if hasattr(request.state, "session"):
            return request.state.session

        # Fallback: authenticate request directly
        authorization = request.headers.get("authorization")
        if authorization:
            return await self.auth_bridge.authenticate_request(authorization)

        return None

    async def _get_user_subscription_plan(self, user_id: str) -> str:
        """
        Get user's subscription plan from Sim database.

        Args:
            user_id: User ID to lookup

        Returns:
            str: Subscription plan ('free', 'team', 'enterprise')
        """
        try:
            # TODO: Query Sim database for user's subscription plan
            # For now, return default 'free' plan
            # In production, this should query the subscription table

            # This would be something like:
            # subscription = await db.get_user_subscription(user_id)
            # return subscription.plan if subscription else "free"

            return "free"

        except Exception as e:
            logger.error(f"Error getting subscription plan for user {user_id}: {e}")
            return "free"  # Default to free plan on error

    def _get_allowed_operations(self, subscription_plan: str) -> Set[Operation]:
        """Get set of allowed operations for subscription plan."""
        allowed_operations = set()

        # Build cumulative permissions (free ⊆ team ⊆ enterprise)
        if subscription_plan in ["free", "team", "enterprise"]:
            allowed_operations.update(self._plan_operations.get("free", set()))

        if subscription_plan in ["team", "enterprise"]:
            allowed_operations.update(self._plan_operations.get("team", set()))

        if subscription_plan == "enterprise":
            allowed_operations.update(self._plan_operations.get("enterprise", set()))

        return allowed_operations

    async def _requires_workspace_permission(
        self, operation: Operation, request: Request
    ) -> bool:
        """Check if operation requires workspace-specific permission."""
        workspace_scoped_operations = {
            Operation.CREATE_AGENT,
            Operation.UPDATE_AGENT,
            Operation.DELETE_AGENT,
            Operation.LIST_AGENTS,
            Operation.CREATE_CUSTOMER_SESSION,
            Operation.UPDATE_SESSION,
            Operation.DELETE_SESSION,
            Operation.LIST_SESSIONS,
        }

        return operation in workspace_scoped_operations

    async def _extract_workspace_id(self, request: Request) -> Optional[str]:
        """Extract workspace ID from request path or query parameters."""
        # Try path parameters first
        workspace_id = request.path_params.get("workspace_id")
        if workspace_id:
            return workspace_id

        # Try query parameters
        workspace_id = request.query_params.get("workspace_id")
        if workspace_id:
            return workspace_id

        # Try to extract from URL path pattern
        path_parts = request.url.path.split("/")
        if "workspaces" in path_parts:
            try:
                workspace_index = path_parts.index("workspaces")
                if workspace_index + 1 < len(path_parts):
                    return path_parts[workspace_index + 1]
            except (ValueError, IndexError):
                pass

        return None

    def _get_rate_limit_key(self, session: SimSession, subscription_plan: str) -> str:
        """Get appropriate rate limiting key based on subscription plan."""
        if subscription_plan in ["team", "enterprise"] and session.active_organization_id:
            # Use organization-level rate limiting for team/enterprise plans
            return f"org:{session.active_organization_id}"
        else:
            # Use user-level rate limiting for free plans
            return f"user:{session.user.id}"

    async def get_user_context_for_agent(self, request: Request) -> Dict[str, Any]:
        """
        Extract user context for Parlant agent interactions.

        This method provides the user context that will be available to
        Parlant agents during conversations and operations.

        Args:
            request: FastAPI request object

        Returns:
            Dict containing user context for agent use
        """
        session = await self._get_authenticated_session(request)
        if not session:
            return {}

        # Get workspace context
        workspace_id = await self._extract_workspace_id(request)
        subscription_plan = await self._get_user_subscription_plan(session.user.id)

        # Build comprehensive user context
        context = {
            "user": {
                "id": session.user.id,
                "name": session.user.name,
                "email": session.user.email,
                "email_verified": session.user.email_verified,
                "image": session.user.image,
            },
            "session": {
                "id": session.id,
                "expires_at": session.expires_at.isoformat(),
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
            },
            "organization": {
                "id": session.active_organization_id,
                "workspaces": session.user.workspaces,
            },
            "subscription": {
                "plan": subscription_plan,
                "features": list(self._get_allowed_operations(subscription_plan)),
            },
            "request_context": {
                "workspace_id": workspace_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "rate_limit_key": self._get_rate_limit_key(session, subscription_plan),
            }
        }

        return context


class EnhancedAuthorizationMiddleware:
    """
    Enhanced middleware that adds additional security features.

    This middleware works in conjunction with the existing AuthenticationMiddleware
    to provide enhanced security features like security headers, request logging,
    and monitoring.
    """

    def __init__(self, app, authorization_policy: SimParlantAuthorizationPolicy):
        """
        Initialize enhanced authorization middleware.

        Args:
            app: FastAPI application
            authorization_policy: Sim-Parlant authorization policy
        """
        self.app = app
        self.authorization_policy = authorization_policy

    async def __call__(self, request: Request, call_next):
        """Process request with enhanced security features."""
        start_time = datetime.now(timezone.utc)

        try:
            # Add security headers to all responses
            response = await call_next(request)
            response = self._add_security_headers(response)

            # Add user context headers for debugging (non-production only)
            if hasattr(request.state, "session"):
                response = await self._add_user_context_headers(
                    response, request.state.session
                )

            # Log request completion
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self._log_request_completion(request, response, duration)

            return response

        except Exception as e:
            logger.error(f"Enhanced authorization middleware error: {e}")
            # Return error response but don't crash
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"},
                headers=self._get_security_headers()
            )

    def _add_security_headers(self, response) -> any:
        """Add security headers to response."""
        security_headers = self._get_security_headers()
        for header, value in security_headers.items():
            response.headers[header] = value
        return response

    def _get_security_headers(self) -> Dict[str, str]:
        """Get standard security headers."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }

    async def _add_user_context_headers(self, response, session: SimSession) -> any:
        """Add user context headers for debugging and monitoring."""
        response.headers["X-User-ID"] = session.user.id
        response.headers["X-User-Email"] = session.user.email
        if session.active_organization_id:
            response.headers["X-Organization-ID"] = session.active_organization_id
        response.headers["X-Session-ID"] = session.id
        return response

    def _log_request_completion(self, request: Request, response, duration: float):
        """Log request completion with metrics."""
        user_id = "anonymous"
        if hasattr(request.state, "session"):
            user_id = request.state.session.user.id

        logger.info(
            f"Request completed: {request.method} {request.url.path} "
            f"[{response.status_code}] user={user_id} duration={duration:.3f}s"
        )


# Factory functions for creating authorization components
def create_sim_parlant_authorization(auth_bridge: SimAuthBridge) -> SimParlantAuthorizationPolicy:
    """
    Factory function to create Sim-Parlant authorization policy.

    Args:
        auth_bridge: Initialized Sim authentication bridge

    Returns:
        SimParlantAuthorizationPolicy: Configured authorization policy
    """
    return SimParlantAuthorizationPolicy(auth_bridge)


def create_enhanced_middleware(
    app, authorization_policy: SimParlantAuthorizationPolicy
) -> EnhancedAuthorizationMiddleware:
    """
    Factory function to create enhanced authorization middleware.

    Args:
        app: FastAPI application
        authorization_policy: Authorization policy instance

    Returns:
        EnhancedAuthorizationMiddleware: Configured middleware
    """
    return EnhancedAuthorizationMiddleware(app, authorization_policy)


# Utility functions for integration
async def get_user_context(request: Request) -> Dict[str, Any]:
    """
    Utility function to get user context from request.

    Args:
        request: FastAPI request object

    Returns:
        Dict containing user context, empty dict if not authenticated
    """
    if hasattr(request.state, "session"):
        session = request.state.session
        return {
            "user_id": session.user.id,
            "email": session.user.email,
            "name": session.user.name,
            "organization_id": session.active_organization_id,
            "workspaces": session.user.workspaces,
        }
    return {}


def require_subscription_plan(required_plan: str):
    """
    FastAPI dependency to require specific subscription plan.

    Args:
        required_plan: Required subscription plan

    Returns:
        Dependency function for FastAPI
    """
    async def check_plan(request: Request):
        subscription_plan = getattr(request.state, "subscription_plan", "free")
        plan_hierarchy = {"free": 0, "team": 1, "enterprise": 2}

        if plan_hierarchy.get(subscription_plan, 0) < plan_hierarchy.get(required_plan, 0):
            raise HTTPException(
                status_code=403,
                detail=f"This operation requires {required_plan} subscription or higher"
            )

    return check_plan