"""
Authentication Health Check API
Provides health monitoring endpoints for the authentication system
"""

import logging
from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from auth.init import get_auth_system
from auth.enhanced_middleware import get_current_session, get_request_context
from auth.sim_auth_bridge import SimSession
from auth.audit_logger import audit_security_alert

logger = logging.getLogger(__name__)

# Create router for auth health endpoints
router = APIRouter(prefix="/health/auth", tags=["Authentication Health"])


@router.get("/status")
async def get_auth_system_status():
    """
    Get overall authentication system status.

    Returns comprehensive status information for all auth components.
    """
    try:
        auth_system = get_auth_system()

        if not auth_system:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unavailable",
                    "message": "Authentication system not initialized",
                    "timestamp": datetime.now().isoformat()
                }
            )

        status = auth_system.get_system_status()
        health_check = auth_system.get_health_check()

        return {
            "status": "healthy" if health_check["healthy"] else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "system": status,
            "health": health_check
        }

    except Exception as e:
        logger.error(f"Error getting auth system status: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Failed to get authentication system status",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/components")
async def get_auth_components_status():
    """
    Get detailed status of individual authentication components.
    """
    try:
        auth_system = get_auth_system()

        if not auth_system:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unavailable",
                    "message": "Authentication system not initialized"
                }
            )

        components_status = {}

        # Auth Bridge Status
        if auth_system.auth_bridge:
            try:
                # Test auth bridge connectivity
                cache_stats = auth_system.auth_bridge.get_cache_stats()
                components_status["auth_bridge"] = {
                    "status": "healthy",
                    "cache_stats": cache_stats,
                    "sim_connection": "connected"  # In real implementation, test connectivity
                }
            except Exception as e:
                components_status["auth_bridge"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }

        # Rate Limiter Status
        if auth_system.rate_limiter:
            try:
                rate_stats = auth_system.rate_limiter.get_stats()
                components_status["rate_limiter"] = {
                    "status": "healthy",
                    "stats": rate_stats
                }
            except Exception as e:
                components_status["rate_limiter"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }

        # Audit Logger Status
        if auth_system.audit_logger:
            try:
                audit_stats = auth_system.audit_logger.get_stats()
                components_status["audit_logger"] = {
                    "status": "healthy",
                    "stats": audit_stats
                }
            except Exception as e:
                components_status["audit_logger"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }

        # Session Manager Status
        if auth_system.session_manager:
            try:
                session_stats = auth_system.session_manager.get_session_stats()
                components_status["session_manager"] = {
                    "status": "healthy",
                    "stats": session_stats
                }
            except Exception as e:
                components_status["session_manager"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }

        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "components": components_status
        }

    except Exception as e:
        logger.error(f"Error getting auth components status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get authentication components status"
        )


@router.get("/metrics")
async def get_auth_metrics():
    """
    Get authentication system metrics for monitoring.
    """
    try:
        auth_system = get_auth_system()

        if not auth_system:
            raise HTTPException(
                status_code=503,
                detail="Authentication system not initialized"
            )

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "auth_bridge": {},
            "rate_limiter": {},
            "audit_logger": {},
            "session_manager": {}
        }

        # Collect metrics from each component
        if auth_system.auth_bridge:
            metrics["auth_bridge"] = auth_system.auth_bridge.get_cache_stats()

        if auth_system.rate_limiter:
            rate_stats = auth_system.rate_limiter.get_stats()
            metrics["rate_limiter"] = {
                "active_buckets": rate_stats.get("total_buckets", 0),
                "active_blocks": rate_stats.get("active_blocks", 0),
                "rules_configured": len(rate_stats.get("rules", {}))
            }

        if auth_system.audit_logger:
            audit_stats = auth_system.audit_logger.get_stats()
            metrics["audit_logger"] = {
                "total_events": audit_stats.get("total_events", 0),
                "security_alerts": audit_stats.get("security_alerts", 0),
                "high_risk_events": audit_stats.get("high_risk_events", 0),
                "events_by_severity": audit_stats.get("events_by_severity", {}),
                "queue_size": audit_stats.get("queue_size", 0)
            }

        if auth_system.session_manager:
            session_stats = auth_system.session_manager.get_session_stats()
            metrics["session_manager"] = {
                "active_sessions": session_stats.get("active_sessions", 0),
                "total_tokens": session_stats.get("total_tokens", 0),
                "expired_sessions": session_stats.get("expired_sessions", 0),
                "revoked_sessions": session_stats.get("revoked_sessions", 0)
            }

        return metrics

    except Exception as e:
        logger.error(f"Error getting auth metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get authentication metrics"
        )


@router.post("/test-auth")
async def test_authentication(
    session: SimSession = Depends(get_current_session),
    request_context: Dict[str, Any] = Depends(get_request_context)
):
    """
    Test authentication with current session.

    This endpoint requires authentication and returns session information.
    Useful for testing auth middleware functionality.
    """
    return {
        "status": "authenticated",
        "timestamp": datetime.now().isoformat(),
        "session": {
            "session_id": session.id,
            "user_id": session.user.id,
            "user_email": session.user.email,
            "expires_at": session.expires_at.isoformat(),
            "active_organization_id": session.active_organization_id
        },
        "request_context": {
            "ip_address": request_context.get("ip_address"),
            "endpoint": request_context.get("endpoint"),
            "method": request_context.get("method")
        },
        "workspaces": [
            {
                "id": workspace["id"],
                "name": workspace["name"],
                "permissions": workspace["permissions"]
            }
            for workspace in session.user.workspaces
        ]
    }


@router.get("/rate-limits")
async def get_rate_limit_status(request: Request):
    """
    Check rate limit status for current request.
    """
    try:
        auth_system = get_auth_system()

        if not auth_system or not auth_system.rate_limiter:
            raise HTTPException(
                status_code=503,
                detail="Rate limiter not available"
            )

        # Get client IP
        ip_address = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(',')[0].strip()

        # Check current rate limit status for different rules
        rate_status = {}

        for rule_name in ["auth_attempts", "api_requests", "session_validation"]:
            try:
                allowed, info = await auth_system.rate_limiter.check_rate_limit(
                    ip_address, rule_name
                )

                # Don't count this check against the limit
                if not allowed:
                    # Remove the request we just added
                    bucket_key = f"{rule_name}:{ip_address}"
                    bucket = auth_system.rate_limiter.buckets.get(bucket_key)
                    if bucket and bucket.requests:
                        bucket.requests.pop()

                rate_status[rule_name] = {
                    "allowed": allowed,
                    "info": info
                }
            except Exception as e:
                rate_status[rule_name] = {
                    "error": str(e)
                }

        return {
            "ip_address": ip_address,
            "timestamp": datetime.now().isoformat(),
            "rate_limits": rate_status
        }

    except Exception as e:
        logger.error(f"Error checking rate limit status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check rate limit status"
        )


@router.post("/security/alert")
async def trigger_security_alert(
    alert_data: Dict[str, Any],
    session: SimSession = Depends(get_current_session),
    request_context: Dict[str, Any] = Depends(get_request_context)
):
    """
    Manually trigger a security alert (for testing purposes).

    Requires authentication and logs a security alert with provided data.
    """
    try:
        alert_type = alert_data.get("type", "manual_test_alert")
        details = alert_data.get("details", {})

        # Add context information
        details.update({
            "triggered_by": session.user.id,
            "trigger_endpoint": "/health/auth/security/alert",
            "timestamp": datetime.now().isoformat()
        })

        # Log security alert
        await audit_security_alert(
            alert_type,
            user_id=session.user.id,
            ip_address=request_context.get("ip_address"),
            details=details
        )

        return {
            "status": "alert_triggered",
            "alert_type": alert_type,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }

    except Exception as e:
        logger.error(f"Error triggering security alert: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to trigger security alert"
        )


@router.get("/session/info")
async def get_session_info(
    session: SimSession = Depends(get_current_session)
):
    """
    Get detailed information about the current session.
    """
    try:
        auth_system = get_auth_system()

        session_info = {
            "session_id": session.id,
            "user": {
                "id": session.user.id,
                "email": session.user.email,
                "name": session.user.name,
                "email_verified": session.user.email_verified,
                "created_at": session.user.created_at.isoformat(),
                "updated_at": session.user.updated_at.isoformat()
            },
            "session_details": {
                "expires_at": session.expires_at.isoformat(),
                "token": session.token[:8] + "..." if session.token else None,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "active_organization_id": session.active_organization_id
            },
            "workspaces": session.user.workspaces,
            "timestamp": datetime.now().isoformat()
        }

        # Add session manager stats if available
        if auth_system and auth_system.session_manager:
            # Get token info if available (simplified for demo)
            session_info["session_manager"] = {
                "status": "active",
                "total_active_sessions": auth_system.session_manager.get_session_stats().get("active_sessions", 0)
            }

        return session_info

    except Exception as e:
        logger.error(f"Error getting session info: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get session information"
        )


@router.post("/cleanup")
async def trigger_cleanup():
    """
    Manually trigger cleanup operations (for maintenance).

    This endpoint is useful for maintenance and testing.
    """
    try:
        auth_system = get_auth_system()

        if not auth_system:
            raise HTTPException(
                status_code=503,
                detail="Authentication system not available"
            )

        cleanup_results = {}

        # Cleanup rate limiter buckets
        if auth_system.rate_limiter:
            await auth_system.rate_limiter.cleanup_expired_buckets()
            cleanup_results["rate_limiter"] = "expired_buckets_cleaned"

        # Cleanup session manager tokens
        if auth_system.session_manager:
            await auth_system.session_manager.cleanup_expired_tokens()
            cleanup_results["session_manager"] = "expired_tokens_cleaned"

        # Flush audit logs
        if auth_system.audit_logger:
            await auth_system.audit_logger.flush_events()
            cleanup_results["audit_logger"] = "events_flushed"

        return {
            "status": "cleanup_completed",
            "timestamp": datetime.now().isoformat(),
            "results": cleanup_results
        }

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to perform cleanup operations"
        )