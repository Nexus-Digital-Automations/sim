"""
Authentication Middleware for Parlant Server
Handles authentication and authorization for all incoming requests
"""

import logging
from typing import Optional

from fastapi import Request, Response, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware

from auth.sim_auth_bridge import SimAuthBridge, SimSession


logger = logging.getLogger(__name__)

# Security scheme for FastAPI docs
security = HTTPBearer(auto_error=False)

# Global auth bridge instance (will be set during app startup)
_auth_bridge: Optional[SimAuthBridge] = None


def set_auth_bridge(auth_bridge: SimAuthBridge):
    """Set the global auth bridge instance."""
    global _auth_bridge
    _auth_bridge = auth_bridge


def get_auth_bridge() -> SimAuthBridge:
    """Get the global auth bridge instance."""
    if _auth_bridge is None:
        raise RuntimeError("Auth bridge not initialized")
    return _auth_bridge


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle authentication for all requests.

    - Public endpoints: /health, /, /docs, /openapi.json
    - Protected endpoints: Everything under /api/v1/
    """

    # Endpoints that don't require authentication
    PUBLIC_ENDPOINTS = {
        "/",
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc"
    }

    def __init__(self, app, auth_bridge: SimAuthBridge):
        super().__init__(app)
        self.auth_bridge = auth_bridge

    async def dispatch(self, request: Request, call_next):
        """Process request through authentication middleware."""

        # Skip authentication for public endpoints
        if self._is_public_endpoint(request.url.path):
            return await call_next(request)

        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Authenticate the request
        session = await self._authenticate_request(request)

        if session is None:
            logger.warning(f"Unauthenticated request to {request.url.path}")
            return Response(
                content='{"detail": "Authentication required"}',
                status_code=401,
                media_type="application/json"
            )

        # Add session to request state for use in route handlers
        request.state.session = session
        request.state.user = session.user

        logger.debug(f"Authenticated request for user {session.user.email}")

        return await call_next(request)

    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (doesn't require authentication)."""
        # Exact match for known public endpoints
        if path in self.PUBLIC_ENDPOINTS:
            return True

        # Static file serving (if any)
        if path.startswith("/static/"):
            return True

        return False

    async def _authenticate_request(self, request: Request) -> Optional[SimSession]:
        """Authenticate the incoming request."""
        # Get Authorization header
        authorization = request.headers.get("Authorization")

        if not authorization:
            # Try to get token from cookie as fallback
            session_token = request.cookies.get("better-auth.session_token")
            if session_token:
                authorization = f"Bearer {session_token}"

        if not authorization:
            return None

        # Validate session token
        try:
            session = await self.auth_bridge.authenticate_request(authorization)
            return session
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None


async def auth_middleware(request: Request, call_next):
    """
    Simplified middleware function for use with FastAPI middleware decorator.
    """
    auth_bridge = get_auth_bridge()
    middleware = AuthenticationMiddleware(None, auth_bridge)

    # Use the middleware logic
    if middleware._is_public_endpoint(request.url.path) or request.method == "OPTIONS":
        return await call_next(request)

    session = await middleware._authenticate_request(request)

    if session is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Add session to request state
    request.state.session = session
    request.state.user = session.user

    return await call_next(request)


# Dependency for route handlers
async def get_current_session(request: Request) -> SimSession:
    """
    FastAPI dependency to get current authenticated session.

    Usage:
        @app.get("/api/v1/agents")
        async def list_agents(session: SimSession = Depends(get_current_session)):
            # Use session.user, session.user.workspaces, etc.
    """
    if not hasattr(request.state, "session"):
        raise HTTPException(status_code=401, detail="Authentication required")

    return request.state.session


async def get_current_user(request: Request):
    """
    FastAPI dependency to get current authenticated user.

    Usage:
        @app.get("/api/v1/profile")
        async def get_profile(user = Depends(get_current_user)):
            # Use user.id, user.email, etc.
    """
    session = await get_current_session(request)
    return session.user


async def require_workspace_access(workspace_id: str, request: Request) -> SimSession:
    """
    FastAPI dependency to require access to specific workspace.

    Usage:
        @app.get("/api/v1/workspaces/{workspace_id}/agents")
        async def list_workspace_agents(
            workspace_id: str,
            session: SimSession = Depends(lambda req: require_workspace_access(workspace_id, req))
        ):
            # User has been validated to have access to workspace_id
    """
    session = await get_current_session(request)
    auth_bridge = get_auth_bridge()

    # Validate workspace access
    has_access = await auth_bridge.validate_workspace_access(session, workspace_id)

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to workspace {workspace_id}"
        )

    return session