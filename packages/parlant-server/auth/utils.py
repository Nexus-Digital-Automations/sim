"""
Authentication utilities for Parlant server
Provides helper functions for session management and security
"""

import logging
import secrets
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass

from fastapi import Request, HTTPException
from jose import JWTError, jwt

from auth.sim_auth_bridge import SimSession, SimUser
from config.settings import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class WorkspacePermissions:
    """Represents user permissions within a workspace."""
    workspace_id: str
    permissions: List[str]
    role: str
    is_owner: bool = False


@dataclass
class AgentPermissions:
    """Represents user permissions for specific agents."""
    agent_id: str
    workspace_id: str
    can_read: bool = False
    can_write: bool = False
    can_delete: bool = False
    can_manage: bool = False


class AuthenticationUtils:
    """Utility class for authentication operations."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def generate_session_id(self) -> str:
        """Generate a unique session identifier."""
        return secrets.token_urlsafe(32)

    def generate_api_key(self) -> str:
        """Generate a secure API key."""
        return secrets.token_urlsafe(64)

    def hash_api_key(self, api_key: str) -> str:
        """Hash an API key for secure storage."""
        return hashlib.sha256(api_key.encode()).hexdigest()

    def verify_api_key(self, api_key: str, hashed_key: str) -> bool:
        """Verify an API key against its hash."""
        return hashlib.sha256(api_key.encode()).hexdigest() == hashed_key

    def create_workspace_token(
        self,
        user_id: str,
        workspace_id: str,
        permissions: List[str],
        expires_hours: int = 24
    ) -> str:
        """Create a workspace-scoped token for API access."""
        now = datetime.utcnow()
        payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "permissions": permissions,
            "iat": now,
            "exp": now + timedelta(hours=expires_hours),
            "type": "workspace_token"
        }

        return jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )

    def verify_workspace_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a workspace token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm]
            )

            if payload.get("type") != "workspace_token":
                return None

            return payload

        except JWTError as e:
            logger.warning(f"Invalid workspace token: {e}")
            return None

    def extract_permissions_from_session(self, session: SimSession) -> List[WorkspacePermissions]:
        """Extract workspace permissions from a session."""
        permissions = []

        for workspace in session.user.workspaces:
            workspace_perms = WorkspacePermissions(
                workspace_id=workspace["id"],
                permissions=workspace.get("permissions", []),
                role=workspace.get("role", "member"),
                is_owner=workspace.get("owner_id") == session.user.id
            )
            permissions.append(workspace_perms)

        return permissions

    def check_workspace_permission(
        self,
        session: SimSession,
        workspace_id: str,
        required_permission: str
    ) -> bool:
        """Check if user has specific permission in workspace."""
        workspace_permissions = self.extract_permissions_from_session(session)

        for workspace_perm in workspace_permissions:
            if workspace_perm.workspace_id == workspace_id:
                return (
                    required_permission in workspace_perm.permissions or
                    workspace_perm.is_owner or
                    workspace_perm.role == "admin"
                )

        return False

    def get_accessible_workspaces(self, session: SimSession) -> List[str]:
        """Get list of workspace IDs that user has access to."""
        return [workspace["id"] for workspace in session.user.workspaces]

    def create_agent_permissions(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str
    ) -> AgentPermissions:
        """Create agent permissions based on workspace access."""
        workspace_perms = None

        for workspace in session.user.workspaces:
            if workspace["id"] == workspace_id:
                workspace_perms = workspace
                break

        if not workspace_perms:
            return AgentPermissions(
                agent_id=agent_id,
                workspace_id=workspace_id
            )

        permissions = workspace_perms.get("permissions", [])
        role = workspace_perms.get("role", "member")
        is_owner = workspace_perms.get("owner_id") == session.user.id

        return AgentPermissions(
            agent_id=agent_id,
            workspace_id=workspace_id,
            can_read="read" in permissions or is_owner or role == "admin",
            can_write="write" in permissions or is_owner or role == "admin",
            can_delete="admin" in permissions or is_owner,
            can_manage=is_owner or role == "admin"
        )


class SessionManager:
    """Manages Parlant session lifecycle and state."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.auth_utils = AuthenticationUtils(settings)

    def create_parlant_session_context(
        self,
        session: SimSession,
        workspace_id: str,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create Parlant-specific session context."""
        workspace_permissions = self.auth_utils.extract_permissions_from_session(session)

        # Find workspace permissions
        workspace_perm = None
        for perm in workspace_permissions:
            if perm.workspace_id == workspace_id:
                workspace_perm = perm
                break

        if not workspace_perm:
            raise HTTPException(
                status_code=403,
                detail=f"No access to workspace {workspace_id}"
            )

        context = {
            "session_id": f"parlant_{session.id}_{workspace_id}",
            "user": {
                "id": session.user.id,
                "email": session.user.email,
                "name": session.user.name,
                "email_verified": session.user.email_verified,
            },
            "workspace": {
                "id": workspace_id,
                "permissions": workspace_perm.permissions,
                "role": workspace_perm.role,
                "is_owner": workspace_perm.is_owner
            },
            "session_metadata": {
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": session.expires_at.isoformat(),
                "ip_address": session.ip_address,
                "user_agent": session.user_agent
            }
        }

        if agent_id:
            context["agent"] = {
                "id": agent_id,
                "permissions": self.auth_utils.create_agent_permissions(
                    session, agent_id, workspace_id
                ).__dict__
            }

        return context

    def validate_session_expiry(self, session: SimSession) -> bool:
        """Check if session is still valid."""
        return datetime.utcnow() < session.expires_at

    def get_session_time_remaining(self, session: SimSession) -> timedelta:
        """Get remaining time for session."""
        return max(timedelta(0), session.expires_at - datetime.utcnow())


def get_current_workspace_id(request: Request) -> Optional[str]:
    """Extract workspace ID from request state or headers."""
    # Check request state first (set by middleware)
    workspace_id = getattr(request.state, 'workspace_id', None)

    if not workspace_id:
        # Fallback to header
        workspace_id = request.headers.get('X-Workspace-Id')

    return workspace_id


def require_workspace_permission(permission: str):
    """Decorator to require specific workspace permission."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # This would be implemented as a FastAPI dependency
            # For now, it's a placeholder for the pattern
            pass
        return wrapper
    return decorator


def get_auth_utils() -> AuthenticationUtils:
    """Get authentication utilities instance."""
    return AuthenticationUtils()


def get_session_manager() -> SessionManager:
    """Get session manager instance."""
    return SessionManager()


class SecurityValidator:
    """Validates security aspects of requests and sessions."""

    @staticmethod
    def validate_request_origin(request: Request, allowed_origins: List[str]) -> bool:
        """Validate request origin for CORS security."""
        origin = request.headers.get('Origin')

        if not origin:
            return True  # Allow requests without origin header (server-to-server)

        return origin in allowed_origins

    @staticmethod
    def validate_user_agent(request: Request) -> bool:
        """Validate user agent to detect suspicious requests."""
        user_agent = request.headers.get('User-Agent', '')

        # Basic validation - not empty and not suspicious patterns
        if not user_agent or len(user_agent) < 10:
            return False

        # Check for common bot/scanner patterns
        suspicious_patterns = ['bot', 'crawler', 'scanner', 'sqlmap', 'nmap']
        user_agent_lower = user_agent.lower()

        for pattern in suspicious_patterns:
            if pattern in user_agent_lower:
                return False

        return True

    @staticmethod
    def validate_rate_limit(user_id: str, endpoint: str, max_requests: int = 100) -> bool:
        """Validate rate limiting for user and endpoint."""
        # This would integrate with Redis or another rate limiting store
        # For now, it's a placeholder
        return True

    @staticmethod
    def log_security_event(
        event_type: str,
        user_id: Optional[str],
        request: Request,
        details: Dict[str, Any]
    ):
        """Log security-related events for monitoring."""
        security_logger = logging.getLogger('security')

        event_data = {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": request.headers.get('X-Forwarded-For') or 'unknown',
            "user_agent": request.headers.get('User-Agent', ''),
            "path": request.url.path,
            "method": request.method,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        }

        security_logger.warning(f"Security event: {event_type}", extra=event_data)