#!/usr/bin/env python3
"""
Example: Integrating Sim Authentication with Parlant Server
==========================================================

This example demonstrates how to integrate the Sim authentication system
with a Parlant server, including user context mapping, workspace isolation,
and subscription-based authorization.
"""

import asyncio
import logging
from typing import Dict, Any, List

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

# Sim-Parlant authentication imports
from auth import (
    initialize_auth_system,
    configure_fastapi_auth,
    get_current_session,
    get_current_user,
    require_workspace_access,
    get_user_context,
    require_subscription_plan,
    auth_health_check,
    AuthConfig,
    SimSession,
    SimUser,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Sim-Parlant Integration Example",
    description="Example of Sim authentication integration with Parlant server",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Initialize authentication system on startup."""
    try:
        # Create authentication configuration
        config = AuthConfig()
        config.development_mode = True  # Enable for development
        config.debug_headers = True    # Add debug headers

        logger.info("Initializing Sim-Parlant authentication system...")

        # Initialize the authentication system
        await initialize_auth_system(config)

        # Configure FastAPI app with authentication
        configure_fastapi_auth(app)

        logger.info("✅ Authentication system initialized successfully")

    except Exception as e:
        logger.error(f"❌ Failed to initialize authentication: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup authentication system on shutdown."""
    from auth.config import cleanup_auth_system
    await cleanup_auth_system()
    logger.info("Authentication system cleanup completed")


# Health and status endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint with authentication status."""
    try:
        auth_status = await auth_health_check()
        return {
            "status": "healthy",
            "service": "sim-parlant-server",
            "authentication": auth_status,
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


# Public endpoints (no authentication required)
@app.get("/")
async def root():
    """Root endpoint - publicly accessible."""
    return {
        "service": "Sim-Parlant Server",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


# Authenticated endpoints
@app.get("/api/v1/profile")
async def get_profile(user: SimUser = Depends(get_current_user)):
    """Get current user profile - requires authentication."""
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "email_verified": user.email_verified,
            "image": user.image,
            "workspaces": user.workspaces,
        }
    }


@app.get("/api/v1/session")
async def get_session_info(session: SimSession = Depends(get_current_session)):
    """Get current session information - requires authentication."""
    return {
        "session": {
            "id": session.id,
            "expires_at": session.expires_at.isoformat(),
            "ip_address": session.ip_address,
            "user_agent": session.user_agent,
            "active_organization_id": session.active_organization_id,
        },
        "user": {
            "id": session.user.id,
            "email": session.user.email,
            "name": session.user.name,
        }
    }


@app.get("/api/v1/user-context")
async def get_full_user_context(request: Request):
    """Get full user context for Parlant agents - requires authentication."""
    user_context = await get_user_context(request)
    if not user_context:
        raise HTTPException(status_code=401, detail="Authentication required")

    return {"user_context": user_context}


# Workspace-scoped endpoints
@app.get("/api/v1/workspaces/{workspace_id}/agents")
async def list_workspace_agents(
    workspace_id: str,
    session: SimSession = Depends(
        lambda request: require_workspace_access(workspace_id, request)
    )
):
    """
    List agents for a specific workspace - requires workspace access.

    This endpoint demonstrates workspace isolation - users can only access
    agents in workspaces they have permission to access.
    """
    return {
        "workspace_id": workspace_id,
        "user": session.user.email,
        "agents": [
            {
                "id": "agent-1",
                "name": "Customer Service Agent",
                "description": "Handles customer inquiries and support",
                "workspace_id": workspace_id,
            },
            {
                "id": "agent-2",
                "name": "Sales Assistant",
                "description": "Helps with sales inquiries and lead qualification",
                "workspace_id": workspace_id,
            }
        ]
    }


@app.post("/api/v1/workspaces/{workspace_id}/sessions")
async def create_agent_session(
    workspace_id: str,
    request: Request,
    session: SimSession = Depends(
        lambda request: require_workspace_access(workspace_id, request)
    )
):
    """
    Create a new agent session in a workspace - requires workspace access.

    This endpoint shows how to create isolated agent sessions with proper
    user context for Parlant agents.
    """
    from auth import get_auth_bridge

    auth_bridge = get_auth_bridge()

    # Create agent session context with workspace isolation
    agent_context = await auth_bridge.create_agent_session_context(
        session, workspace_id
    )

    return {
        "message": "Agent session created successfully",
        "session_context": agent_context,
        "workspace_id": workspace_id,
    }


# Subscription-based endpoints
@app.get("/api/v1/premium-features")
async def get_premium_features(
    request: Request,
    _check_plan = Depends(require_subscription_plan("team"))
):
    """
    Get premium features - requires team subscription or higher.

    This endpoint demonstrates subscription-based access control.
    """
    return {
        "premium_features": [
            "Advanced analytics",
            "Custom integrations",
            "Priority support",
            "Advanced agent configurations",
        ],
        "message": "These features are available with team subscription or higher"
    }


@app.get("/api/v1/enterprise-features")
async def get_enterprise_features(
    request: Request,
    _check_plan = Depends(require_subscription_plan("enterprise"))
):
    """
    Get enterprise features - requires enterprise subscription.
    """
    return {
        "enterprise_features": [
            "SSO integration",
            "Advanced security controls",
            "Dedicated support",
            "Custom deployments",
            "Advanced compliance features",
        ],
        "message": "These features are available with enterprise subscription"
    }


# Agent interaction endpoints
@app.post("/api/v1/chat")
async def chat_with_agent(
    request: Request,
    message: Dict[str, Any],
    session: SimSession = Depends(get_current_session)
):
    """
    Chat with an agent - demonstrates user context passing to agents.

    This endpoint shows how user context is passed to Parlant agents
    for personalized interactions.
    """
    # Extract user context for the agent
    user_context = await get_user_context(request)

    # In a real implementation, this would interact with Parlant agents
    agent_response = {
        "agent_id": message.get("agent_id", "default-agent"),
        "user_message": message.get("text", ""),
        "agent_response": f"Hello {user_context.get('name', 'there')}! I received your message: '{message.get('text', '')}'",
        "context_used": {
            "user_id": user_context.get("user_id"),
            "user_name": user_context.get("name"),
            "workspace_count": len(user_context.get("workspaces", [])),
            "authenticated": True,
        }
    }

    return {
        "conversation": agent_response,
        "timestamp": "2025-01-23T10:30:00Z",
        "session_id": session.id,
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path,
        }
    )


# Development helper endpoints
if __name__ == "__main__":
    import uvicorn

    # Development server configuration
    uvicorn.run(
        "integration_example:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )