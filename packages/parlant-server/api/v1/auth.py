"""
Authentication API endpoints for Parlant Server
Handles authentication status, session validation, and token exchange
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from auth.middleware import get_current_session, get_auth_bridge
from auth.sim_auth_bridge import SimSession


logger = logging.getLogger(__name__)

router = APIRouter()


class AuthStatusResponse(BaseModel):
    """Response model for authentication status."""
    authenticated: bool
    user: Dict[str, Any] = None
    session: Dict[str, Any] = None
    cache_stats: Dict[str, Any] = None


class TokenValidationRequest(BaseModel):
    """Request model for token validation."""
    token: str


class TokenValidationResponse(BaseModel):
    """Response model for token validation."""
    valid: bool
    user: Dict[str, Any] = None
    workspace_id: str = None
    expires_at: str = None


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(request: Request):
    """
    Get current authentication status.

    Returns authenticated user information if session is valid,
    otherwise returns unauthenticated status.
    """
    try:
        # Try to get current session (won't raise exception, returns None if unauthenticated)
        auth_bridge = get_auth_bridge()
        authorization = request.headers.get("Authorization")

        if not authorization:
            # Try cookie fallback
            session_token = request.cookies.get("better-auth.session_token")
            if session_token:
                authorization = f"Bearer {session_token}"

        if authorization:
            session = await auth_bridge.authenticate_request(authorization)
            if session:
                return AuthStatusResponse(
                    authenticated=True,
                    user={
                        "id": session.user.id,
                        "email": session.user.email,
                        "name": session.user.name,
                        "email_verified": session.user.email_verified,
                        "image": session.user.image,
                        "workspaces": session.user.workspaces,
                    },
                    session={
                        "id": session.id,
                        "expires_at": session.expires_at.isoformat(),
                        "active_organization_id": session.active_organization_id,
                    },
                    cache_stats=auth_bridge.get_cache_stats()
                )

        return AuthStatusResponse(
            authenticated=False,
            cache_stats=auth_bridge.get_cache_stats()
        )

    except Exception as e:
        logger.error(f"Error getting auth status: {e}")
        return AuthStatusResponse(
            authenticated=False,
            cache_stats={}
        )


@router.post("/validate", response_model=TokenValidationResponse)
async def validate_token(request: TokenValidationRequest):
    """
    Validate a session token.

    Useful for other services to validate tokens without going through
    the full authentication middleware.
    """
    try:
        auth_bridge = get_auth_bridge()
        session = await auth_bridge.validate_session_token(request.token)

        if session:
            return TokenValidationResponse(
                valid=True,
                user={
                    "id": session.user.id,
                    "email": session.user.email,
                    "name": session.user.name,
                    "email_verified": session.user.email_verified,
                    "workspaces": session.user.workspaces,
                },
                expires_at=session.expires_at.isoformat()
            )
        else:
            return TokenValidationResponse(valid=False)

    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise HTTPException(status_code=500, detail="Token validation failed")


@router.get("/me")
async def get_current_user_info(session: SimSession = Depends(get_current_session)):
    """
    Get current authenticated user information.

    Requires authentication. Returns detailed user profile and workspace access.
    """
    return {
        "user": {
            "id": session.user.id,
            "email": session.user.email,
            "name": session.user.name,
            "email_verified": session.user.email_verified,
            "image": session.user.image,
            "created_at": session.user.created_at.isoformat(),
            "updated_at": session.user.updated_at.isoformat(),
        },
        "session": {
            "id": session.id,
            "expires_at": session.expires_at.isoformat(),
            "ip_address": session.ip_address,
            "user_agent": session.user_agent,
            "active_organization_id": session.active_organization_id,
        },
        "workspaces": session.user.workspaces,
    }


@router.get("/workspaces")
async def list_user_workspaces(session: SimSession = Depends(get_current_session)):
    """
    List all workspaces accessible to the current user.

    Returns workspace information with user's role and permissions in each workspace.
    """
    return {
        "workspaces": session.user.workspaces,
        "active_organization_id": session.active_organization_id,
    }


@router.get("/workspaces/{workspace_id}/access")
async def check_workspace_access(
    workspace_id: str,
    session: SimSession = Depends(get_current_session)
):
    """
    Check if current user has access to a specific workspace.

    Returns access information and user's role in the workspace.
    """
    auth_bridge = get_auth_bridge()
    has_access = await auth_bridge.validate_workspace_access(session, workspace_id)

    if not has_access:
        return {
            "workspace_id": workspace_id,
            "has_access": False,
            "role": None,
            "permissions": []
        }

    # Find workspace info
    workspace_info = None
    for workspace in session.user.workspaces:
        if workspace["id"] == workspace_id:
            workspace_info = workspace
            break

    return {
        "workspace_id": workspace_id,
        "has_access": True,
        "role": workspace_info["role"] if workspace_info else "unknown",
        "permissions": workspace_info["permissions"] if workspace_info else [],
        "workspace_name": workspace_info["name"] if workspace_info else "Unknown Workspace"
    }


@router.post("/workspaces/{workspace_id}/context")
async def create_agent_context(
    workspace_id: str,
    agent_id: str = None,
    session: SimSession = Depends(get_current_session)
):
    """
    Create isolated agent context for workspace.

    Returns context object that can be used to initialize Parlant agents
    with proper workspace isolation.
    """
    try:
        auth_bridge = get_auth_bridge()
        context = await auth_bridge.create_agent_session_context(
            session, workspace_id, agent_id
        )

        return {
            "context": context,
            "workspace_id": workspace_id,
            "agent_id": agent_id,
            "user_id": session.user.id
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions (like 403 Forbidden)
    except Exception as e:
        logger.error(f"Error creating agent context: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent context")


@router.get("/cache/stats")
async def get_cache_statistics():
    """
    Get authentication cache statistics.

    Useful for monitoring and debugging authentication performance.
    """
    try:
        auth_bridge = get_auth_bridge()
        return auth_bridge.get_cache_stats()
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache statistics")


@router.post("/cache/clear")
async def clear_auth_cache():
    """
    Clear authentication cache.

    Forces re-validation of all sessions on next request.
    Useful for debugging or security purposes.
    """
    try:
        auth_bridge = get_auth_bridge()
        # Clear the cache
        auth_bridge._session_cache.clear()

        return {
            "message": "Authentication cache cleared successfully",
            "cache_stats": auth_bridge.get_cache_stats()
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")