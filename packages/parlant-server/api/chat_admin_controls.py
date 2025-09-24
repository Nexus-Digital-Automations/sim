"""
Chat Admin Control APIs for Enterprise Multitenant Messaging
===========================================================

This module provides comprehensive admin control APIs for managing
enterprise chat messaging policies, security controls, and governance
features in the Parlant React Chat Interface.

Key Features:
- Workspace-level messaging policy management
- Security control configuration and monitoring
- User and agent access management
- Compliance and audit controls
- Emergency response capabilities
- Real-time analytics and reporting
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_async_session
from auth.sim_auth_bridge import get_current_session, SimSession
from workspace_isolation import workspace_isolation_manager
from messaging.enterprise_multitenant_chat_system import (
    get_enterprise_chat_system,
    EnterpriseMultitenantChatSystem,
    ChatSecurityPolicy,
    ChatAuditEvent,
    SecurityThreatLevel,
    ChatGovernanceAction,
    ComplianceFramework
)
from messaging.secure_socketio_integration import get_secure_socketio

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/chat-admin", tags=["Chat Administration"])


# Pydantic models for request/response

class SecurityPolicyRequest(BaseModel):
    """Request model for creating/updating security policies."""
    content_filters: List[str] = Field(default=[], description="Regex patterns for content filtering")
    blocked_domains: List[str] = Field(default=[], description="Blocked domains list")
    allowed_file_types: List[str] = Field(default=["txt", "pdf", "docx", "xlsx", "png", "jpg"])
    max_message_length: int = Field(default=10000, ge=100, le=50000)

    require_encryption: bool = Field(default=True)
    enable_dlp_scanning: bool = Field(default=True)
    block_sensitive_data: bool = Field(default=True)
    quarantine_suspicious: bool = Field(default=True)

    messages_per_minute: int = Field(default=60, ge=1, le=1000)
    burst_limit: int = Field(default=10, ge=1, le=100)
    cooldown_period: int = Field(default=300, ge=60, le=3600)

    require_moderation: bool = Field(default=False)
    auto_compliance_check: bool = Field(default=True)
    audit_all_messages: bool = Field(default=True)
    retention_days: int = Field(default=365, ge=30, le=2555)  # Max 7 years

    enable_threat_detection: bool = Field(default=True)
    threat_threshold: float = Field(default=0.7, ge=0.1, le=1.0)
    auto_escalation: bool = Field(default=True)

    @validator('content_filters')
    def validate_content_filters(cls, v):
        """Validate regex patterns."""
        import re
        for pattern in v:
            try:
                re.compile(pattern)
            except re.error:
                raise ValueError(f"Invalid regex pattern: {pattern}")
        return v


class SecurityPolicyResponse(BaseModel):
    """Response model for security policy."""
    policy_id: str
    workspace_id: str
    content_filters: List[str]
    blocked_domains: List[str]
    allowed_file_types: List[str]
    max_message_length: int

    require_encryption: bool
    enable_dlp_scanning: bool
    block_sensitive_data: bool
    quarantine_suspicious: bool

    messages_per_minute: int
    burst_limit: int
    cooldown_period: int

    require_moderation: bool
    auto_compliance_check: bool
    audit_all_messages: bool
    retention_days: int

    enable_threat_detection: bool
    threat_threshold: float
    auto_escalation: bool

    created_at: datetime
    updated_at: Optional[datetime] = None


class UserQuarantineRequest(BaseModel):
    """Request model for user quarantine."""
    user_id: str = Field(..., description="User ID to quarantine")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for quarantine")
    duration_minutes: Optional[int] = Field(None, ge=1, le=10080, description="Duration in minutes (max 1 week)")


class EmergencyLockdownRequest(BaseModel):
    """Request model for emergency lockdown."""
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for lockdown")
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Duration in minutes (max 24 hours)")


class SecurityAnalyticsResponse(BaseModel):
    """Response model for security analytics."""
    workspace_id: str
    generated_at: str
    generated_by: str
    date_range: Dict[str, Optional[str]]

    security_metrics: Dict[str, Any]
    threat_analysis: Dict[str, Any]
    compliance_summary: Dict[str, Any]
    governance_actions: Dict[str, Any]
    policy_effectiveness: Dict[str, Any]
    recommendations: List[Dict[str, Any]]


class AuditEventResponse(BaseModel):
    """Response model for audit events."""
    event_id: str
    workspace_id: str
    user_id: str
    agent_id: Optional[str] = None
    session_id: Optional[str] = None

    event_type: str
    event_category: str
    threat_level: str
    governance_action: str

    timestamp: str
    security_labels: List[str]
    policy_violations: List[str]
    action_reason: Optional[str] = None


# API Endpoints

@router.post(
    "/workspaces/{workspace_id}/security-policy",
    response_model=SecurityPolicyResponse,
    summary="Create or update workspace security policy"
)
async def create_security_policy(
    workspace_id: str = Path(..., description="Workspace ID"),
    policy_request: SecurityPolicyRequest = Body(...),
    session: SimSession = Depends(get_current_session)
):
    """Create or update comprehensive security policy for workspace."""
    logger.info(f"Creating security policy for workspace {workspace_id}")

    try:
        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Create policy
        policy = await chat_system.create_workspace_security_policy(
            session=session,
            workspace_id=workspace_id,
            policy_config=policy_request.dict()
        )

        return SecurityPolicyResponse(
            policy_id=policy.policy_id,
            workspace_id=policy.workspace_id,
            content_filters=policy.content_filters,
            blocked_domains=list(policy.blocked_domains),
            allowed_file_types=list(policy.allowed_file_types),
            max_message_length=policy.max_message_length,
            require_encryption=policy.require_encryption,
            enable_dlp_scanning=policy.enable_dlp_scanning,
            block_sensitive_data=policy.block_sensitive_data,
            quarantine_suspicious=policy.quarantine_suspicious,
            messages_per_minute=policy.messages_per_minute,
            burst_limit=policy.burst_limit,
            cooldown_period=policy.cooldown_period,
            require_moderation=policy.require_moderation,
            auto_compliance_check=policy.auto_compliance_check,
            audit_all_messages=policy.audit_all_messages,
            retention_days=policy.retention_days,
            enable_threat_detection=policy.enable_threat_detection,
            threat_threshold=policy.threat_threshold,
            auto_escalation=policy.auto_escalation,
            created_at=policy.created_at,
            updated_at=policy.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create security policy: {e}")
        raise HTTPException(status_code=500, detail="Failed to create security policy")


@router.get(
    "/workspaces/{workspace_id}/security-policy",
    response_model=SecurityPolicyResponse,
    summary="Get workspace security policy"
)
async def get_security_policy(
    workspace_id: str = Path(..., description="Workspace ID"),
    session: SimSession = Depends(get_current_session)
):
    """Get current security policy for workspace."""
    logger.info(f"Getting security policy for workspace {workspace_id}")

    try:
        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to view security policies"
            )

        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Get policy
        policy = await chat_system._get_workspace_policy(workspace_id)

        return SecurityPolicyResponse(
            policy_id=policy.policy_id,
            workspace_id=policy.workspace_id,
            content_filters=policy.content_filters,
            blocked_domains=list(policy.blocked_domains),
            allowed_file_types=list(policy.allowed_file_types),
            max_message_length=policy.max_message_length,
            require_encryption=policy.require_encryption,
            enable_dlp_scanning=policy.enable_dlp_scanning,
            block_sensitive_data=policy.block_sensitive_data,
            quarantine_suspicious=policy.quarantine_suspicious,
            messages_per_minute=policy.messages_per_minute,
            burst_limit=policy.burst_limit,
            cooldown_period=policy.cooldown_period,
            require_moderation=policy.require_moderation,
            auto_compliance_check=policy.auto_compliance_check,
            audit_all_messages=policy.audit_all_messages,
            retention_days=policy.retention_days,
            enable_threat_detection=policy.enable_threat_detection,
            threat_threshold=policy.threat_threshold,
            auto_escalation=policy.auto_escalation,
            created_at=policy.created_at,
            updated_at=policy.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get security policy: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security policy")


@router.get(
    "/workspaces/{workspace_id}/analytics",
    response_model=SecurityAnalyticsResponse,
    summary="Get comprehensive security analytics"
)
async def get_security_analytics(
    workspace_id: str = Path(..., description="Workspace ID"),
    days_back: int = Query(default=30, ge=1, le=365, description="Days of data to analyze"),
    session: SimSession = Depends(get_current_session)
):
    """Get comprehensive security analytics for workspace."""
    logger.info(f"Generating security analytics for workspace {workspace_id}")

    try:
        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Generate analytics
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        analytics = await chat_system.get_workspace_security_analytics(
            session=session,
            workspace_id=workspace_id,
            date_range=(start_date, end_date)
        )

        return SecurityAnalyticsResponse(**analytics)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate security analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate security analytics")


@router.post(
    "/workspaces/{workspace_id}/quarantine-user",
    summary="Quarantine user in workspace"
)
async def quarantine_user(
    workspace_id: str = Path(..., description="Workspace ID"),
    quarantine_request: UserQuarantineRequest = Body(...),
    session: SimSession = Depends(get_current_session)
):
    """Quarantine user in workspace chat."""
    logger.warning(f"Quarantine request for user {quarantine_request.user_id} in workspace {workspace_id}")

    try:
        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Quarantine user
        await chat_system.quarantine_user(
            session=session,
            workspace_id=workspace_id,
            target_user_id=quarantine_request.user_id,
            reason=quarantine_request.reason,
            duration_minutes=quarantine_request.duration_minutes
        )

        # Also quarantine Socket.IO connections
        socketio_integration = await get_secure_socketio()
        if socketio_integration:
            await socketio_integration.quarantine_user_connections(
                workspace_id=workspace_id,
                user_id=quarantine_request.user_id,
                reason=quarantine_request.reason
            )

        return {
            "status": "success",
            "message": f"User {quarantine_request.user_id} quarantined successfully",
            "workspace_id": workspace_id,
            "duration_minutes": quarantine_request.duration_minutes
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to quarantine user: {e}")
        raise HTTPException(status_code=500, detail="Failed to quarantine user")


@router.post(
    "/workspaces/{workspace_id}/emergency-lockdown",
    summary="Emergency lockdown workspace chat"
)
async def emergency_lockdown(
    workspace_id: str = Path(..., description="Workspace ID"),
    lockdown_request: EmergencyLockdownRequest = Body(...),
    session: SimSession = Depends(get_current_session)
):
    """Emergency lockdown of workspace chat."""
    logger.critical(f"Emergency lockdown request for workspace {workspace_id}: {lockdown_request.reason}")

    try:
        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Initiate emergency lockdown
        await chat_system.emergency_lockdown_workspace(
            session=session,
            workspace_id=workspace_id,
            reason=lockdown_request.reason
        )

        # Also lockdown Socket.IO connections
        socketio_integration = await get_secure_socketio()
        if socketio_integration:
            await socketio_integration.emergency_lockdown_workspace(
                workspace_id=workspace_id,
                reason=lockdown_request.reason
            )

        return {
            "status": "success",
            "message": "Emergency lockdown activated",
            "workspace_id": workspace_id,
            "reason": lockdown_request.reason,
            "duration_minutes": lockdown_request.duration_minutes
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to initiate emergency lockdown: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate emergency lockdown")


@router.get(
    "/workspaces/{workspace_id}/audit-events",
    response_model=List[AuditEventResponse],
    summary="Get audit events for workspace"
)
async def get_audit_events(
    workspace_id: str = Path(..., description="Workspace ID"),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of events"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    threat_level: Optional[str] = Query(None, description="Filter by threat level"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    session: SimSession = Depends(get_current_session)
):
    """Get audit events for workspace with filtering options."""
    logger.info(f"Getting audit events for workspace {workspace_id}")

    try:
        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to view audit events"
            )

        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Build date range filter
        date_range = None
        if start_date or end_date:
            start = start_date or datetime.now() - timedelta(days=30)
            end = end_date or datetime.now()
            date_range = (start, end)

        # Get audit events
        audit_events = await chat_system._get_audit_events(workspace_id, date_range)

        # Apply filters
        if event_type:
            audit_events = [e for e in audit_events if e.event_type == event_type]

        if threat_level:
            audit_events = [e for e in audit_events if e.threat_level.value == threat_level]

        # Apply pagination
        total_events = len(audit_events)
        paginated_events = audit_events[offset:offset + limit]

        # Convert to response models
        response_events = [
            AuditEventResponse(
                event_id=event.event_id,
                workspace_id=event.workspace_id,
                user_id=event.user_id,
                agent_id=event.agent_id,
                session_id=event.session_id,
                event_type=event.event_type,
                event_category=event.event_category,
                threat_level=event.threat_level.value,
                governance_action=event.governance_action.value,
                timestamp=event.timestamp.isoformat(),
                security_labels=list(event.security_labels),
                policy_violations=event.policy_violations,
                action_reason=event.action_reason
            )
            for event in paginated_events
        ]

        return response_events

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit events")


@router.get(
    "/workspaces/{workspace_id}/active-connections",
    summary="Get active chat connections"
)
async def get_active_connections(
    workspace_id: str = Path(..., description="Workspace ID"),
    session: SimSession = Depends(get_current_session)
):
    """Get active chat connections for workspace monitoring."""
    logger.info(f"Getting active connections for workspace {workspace_id}")

    try:
        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to view active connections"
            )

        # Get Socket.IO integration
        socketio_integration = await get_secure_socketio()

        if not socketio_integration:
            return {
                "workspace_id": workspace_id,
                "active_connections": 0,
                "connections": []
            }

        # Get workspace connections
        workspace_connections = socketio_integration._workspace_connections.get(workspace_id, {})

        # Format connection data
        connections = []
        for sid, connection in workspace_connections.items():
            connections.append({
                "socket_id": connection.socket_id,
                "user_id": connection.user_id,
                "agent_id": connection.agent_id,
                "connected_at": connection.connected_at.isoformat(),
                "last_activity": connection.last_activity.isoformat(),
                "message_count": connection.message_count,
                "security_level": connection.security_level,
                "is_quarantined": connection.is_quarantined,
                "threat_score": connection.threat_score,
                "ip_address": connection.ip_address  # Only for admin viewing
            })

        return {
            "workspace_id": workspace_id,
            "active_connections": len(connections),
            "connections": connections,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get active connections: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active connections")


@router.delete(
    "/workspaces/{workspace_id}/emergency-lockdown",
    summary="Lift emergency lockdown"
)
async def lift_emergency_lockdown(
    workspace_id: str = Path(..., description="Workspace ID"),
    session: SimSession = Depends(get_current_session)
):
    """Lift emergency lockdown from workspace."""
    logger.info(f"Lifting emergency lockdown for workspace {workspace_id}")

    try:
        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to lift emergency lockdown"
            )

        # Get Socket.IO integration
        socketio_integration = await get_secure_socketio()

        if socketio_integration:
            # Remove from locked workspaces
            socketio_integration._locked_workspaces.discard(workspace_id)

        # Get enterprise chat system
        chat_system = await get_enterprise_chat_system()

        # Remove from emergency lockdowns
        chat_system._emergency_lockdowns.discard(workspace_id)

        # Create audit event
        audit_event = await chat_system._create_audit_event(
            workspace_id=workspace_id,
            user_id=session.user.id,
            event_type="emergency_lockdown_lifted",
            event_category="security",
            threat_level=SecurityThreatLevel.MEDIUM,
            governance_action=ChatGovernanceAction.ALLOW,
            action_reason="Admin lifted emergency lockdown"
        )
        await chat_system._store_audit_event(audit_event)

        return {
            "status": "success",
            "message": "Emergency lockdown lifted",
            "workspace_id": workspace_id,
            "lifted_by": session.user.id,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to lift emergency lockdown: {e}")
        raise HTTPException(status_code=500, detail="Failed to lift emergency lockdown")


# Health and status endpoints

@router.get(
    "/workspaces/{workspace_id}/health",
    summary="Get chat system health status"
)
async def get_chat_health(
    workspace_id: str = Path(..., description="Workspace ID"),
    session: SimSession = Depends(get_current_session)
):
    """Get health status of chat system for workspace."""
    try:
        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Get systems status
        chat_system = await get_enterprise_chat_system()
        socketio_integration = await get_secure_socketio()

        return {
            "workspace_id": workspace_id,
            "chat_system_status": "healthy" if chat_system else "unavailable",
            "socketio_status": "healthy" if socketio_integration else "unavailable",
            "redis_status": "healthy" if chat_system and chat_system.redis_client else "unavailable",
            "emergency_lockdown": workspace_id in chat_system._emergency_lockdowns if chat_system else False,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chat health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat health status")