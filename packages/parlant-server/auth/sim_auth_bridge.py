"""
Sim Authentication Bridge
Integrates with Better Auth system to validate Sim users for Parlant agents
"""

import asyncio
import logging
import httpx
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass

import jwt
from fastapi import HTTPException
from jose import JWTError
from sqlalchemy.orm import Session
from sqlalchemy import text

from config.settings import Settings


logger = logging.getLogger(__name__)


@dataclass
class SimUser:
    """Represents a Sim user with workspace context."""
    id: str
    name: str
    email: str
    email_verified: bool
    image: Optional[str]
    created_at: datetime
    updated_at: datetime
    active_organization_id: Optional[str] = None
    workspaces: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.workspaces is None:
            self.workspaces = []


@dataclass
class SimSession:
    """Represents a Sim user session with Better Auth data."""
    id: str
    user: SimUser
    expires_at: datetime
    token: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    active_organization_id: Optional[str]


class SimAuthBridge:
    """
    Authentication bridge between Sim's Better Auth and Parlant server.

    Handles:
    - Token validation against Sim's Better Auth system
    - User context mapping from Sim to Parlant
    - Workspace isolation enforcement
    - Session management and persistence
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.http_client: Optional[httpx.AsyncClient] = None
        self._jwt_secret = settings.jwt_secret_key
        self._jwt_algorithm = settings.jwt_algorithm

        # Cache for validated sessions (in-memory cache)
        self._session_cache: Dict[str, SimSession] = {}
        self._cache_ttl = timedelta(minutes=5)  # Cache sessions for 5 minutes

    async def initialize(self):
        """Initialize the authentication bridge."""
        logger.info("Initializing Sim Authentication Bridge")

        # Create HTTP client for Sim API calls
        timeout_config = httpx.Timeout(
            connect=10.0,
            read=30.0,
            write=10.0,
            pool=10.0
        )

        self.http_client = httpx.AsyncClient(
            base_url=self.settings.get_sim_base_url(),
            timeout=timeout_config,
            headers={
                "User-Agent": "Parlant-Server/1.0.0",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        )

        # Test connection to Sim API
        await self._test_sim_connection()
        logger.info("Sim Authentication Bridge initialized successfully")

    async def cleanup(self):
        """Cleanup resources."""
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    async def _test_sim_connection(self) -> bool:
        """Test connectivity to Sim's authentication endpoints."""
        try:
            # Test the health endpoint or a basic API call
            response = await self.http_client.get("/health")
            if response.status_code == 200:
                logger.info("✅ Successfully connected to Sim API")
                return True
            else:
                logger.warning(f"⚠️ Sim API returned status {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to connect to Sim API: {e}")
            # Don't fail initialization, but log the error
            return False

    async def validate_session_token(self, token: str) -> Optional[SimSession]:
        """
        Validate a session token against Sim's Better Auth system.

        Args:
            token: Session token from Sim's Better Auth

        Returns:
            SimSession if valid, None otherwise
        """
        # Check cache first
        if token in self._session_cache:
            cached_session = self._session_cache[token]
            if cached_session.expires_at > datetime.now():
                logger.debug(f"Session cache hit for token: {token[:8]}...")
                return cached_session
            else:
                # Remove expired session from cache
                del self._session_cache[token]

        try:
            # Call Sim's session validation endpoint
            response = await self.http_client.get(
                "/api/auth/session",
                headers={"Authorization": f"Bearer {token}"}
            )

            if response.status_code == 200:
                session_data = response.json()
                return await self._parse_sim_session(session_data, token)
            elif response.status_code == 401:
                logger.debug("Invalid or expired session token")
                return None
            else:
                logger.error(f"Unexpected response from Sim auth API: {response.status_code}")
                return None

        except httpx.RequestError as e:
            logger.error(f"Network error validating session: {e}")
            return None
        except Exception as e:
            logger.error(f"Error validating session token: {e}")
            return None

    async def _parse_sim_session(self, session_data: Dict[str, Any], token: str) -> SimSession:
        """Parse Sim session data into SimSession object."""
        user_data = session_data.get("user", {})
        session_info = session_data.get("session", {})

        # Parse user data
        user = SimUser(
            id=user_data.get("id"),
            name=user_data.get("name", ""),
            email=user_data.get("email", ""),
            email_verified=user_data.get("emailVerified", False),
            image=user_data.get("image"),
            created_at=datetime.fromisoformat(user_data.get("createdAt").replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(user_data.get("updatedAt").replace("Z", "+00:00")),
        )

        # Get user's workspaces
        user.workspaces = await self._get_user_workspaces(user.id)

        # Parse session info
        expires_at = datetime.fromisoformat(session_info.get("expiresAt").replace("Z", "+00:00"))

        session = SimSession(
            id=session_info.get("id"),
            user=user,
            expires_at=expires_at,
            token=token,
            ip_address=session_info.get("ipAddress"),
            user_agent=session_info.get("userAgent"),
            active_organization_id=session_info.get("activeOrganizationId")
        )

        # Cache the session
        self._session_cache[token] = session

        logger.info(f"Validated session for user {user.email} (ID: {user.id})")
        return session

    async def _get_user_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        """Get list of workspaces for a user from Sim database."""
        try:
            # Call Sim API to get user's workspaces with permissions
            response = await self.http_client.get(
                f"/api/v1/users/{user_id}/workspaces",
                headers={"Authorization": f"Bearer {self._jwt_secret}"}  # Internal auth
            )

            if response.status_code == 200:
                workspaces_data = response.json()

                # Transform the workspace data to include permissions
                workspaces = []
                for workspace in workspaces_data.get("workspaces", []):
                    workspace_info = {
                        "id": workspace["id"],
                        "name": workspace["name"],
                        "role": workspace.get("role", "member"),
                        "permissions": workspace.get("permissions", ["read"]),
                        "owner_id": workspace.get("owner_id"),
                        "created_at": workspace.get("created_at"),
                    }
                    workspaces.append(workspace_info)

                logger.debug(f"Found {len(workspaces)} workspaces for user {user_id}")
                return workspaces

            elif response.status_code == 404:
                logger.info(f"No workspaces found for user {user_id}")
                return []
            else:
                logger.error(f"Failed to fetch workspaces: {response.status_code}")
                return []

        except httpx.RequestError as e:
            logger.error(f"Network error fetching workspaces for user {user_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching workspaces for user {user_id}: {e}")
            return []

    async def validate_workspace_access(
        self,
        session: SimSession,
        workspace_id: str
    ) -> bool:
        """
        Validate that a user has access to a specific workspace.

        Args:
            session: Validated SimSession
            workspace_id: ID of workspace to check access for

        Returns:
            True if user has access, False otherwise
        """
        user_workspaces = session.user.workspaces

        for workspace in user_workspaces:
            if workspace["id"] == workspace_id:
                logger.debug(f"User {session.user.email} has access to workspace {workspace_id}")
                return True

        logger.warning(f"User {session.user.email} denied access to workspace {workspace_id}")
        return False

    def create_parlant_user_context(self, session: SimSession) -> Dict[str, Any]:
        """
        Create Parlant user context from Sim session.

        Args:
            session: Validated SimSession

        Returns:
            User context dictionary for Parlant agents
        """
        return {
            "user_id": session.user.id,
            "email": session.user.email,
            "name": session.user.name,
            "email_verified": session.user.email_verified,
            "image": session.user.image,
            "active_organization_id": session.active_organization_id,
            "workspaces": session.user.workspaces,
            "session_id": session.id,
            "expires_at": session.expires_at.isoformat(),
        }

    async def create_agent_session_context(
        self,
        session: SimSession,
        workspace_id: str,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create isolated agent session context for workspace.

        Args:
            session: Validated SimSession
            workspace_id: Target workspace ID
            agent_id: Optional specific agent ID

        Returns:
            Agent session context with workspace isolation
        """
        # Validate workspace access first
        if not await self.validate_workspace_access(session, workspace_id):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to workspace {workspace_id}"
            )

        context = {
            "session_id": f"parlant_{session.id}_{workspace_id}",
            "user_context": self.create_parlant_user_context(session),
            "workspace_id": workspace_id,
            "agent_id": agent_id,
            "created_at": datetime.now().isoformat(),
            "isolation_boundary": workspace_id,  # Enforce workspace isolation
        }

        logger.info(
            f"Created agent session context for user {session.user.email} "
            f"in workspace {workspace_id}"
        )

        return context

    def extract_token_from_header(self, authorization: str) -> Optional[str]:
        """
        Extract token from Authorization header.

        Args:
            authorization: Authorization header value

        Returns:
            Extracted token or None
        """
        if not authorization:
            return None

        # Handle "Bearer <token>" format
        if authorization.startswith("Bearer "):
            return authorization[7:]

        # Handle direct token
        return authorization

    async def authenticate_request(self, authorization: Optional[str]) -> Optional[SimSession]:
        """
        Authenticate an incoming request.

        Args:
            authorization: Authorization header value

        Returns:
            SimSession if authenticated, None otherwise
        """
        if not authorization:
            return None

        token = self.extract_token_from_header(authorization)
        if not token:
            return None

        return await self.validate_session_token(token)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get session cache statistics."""
        active_sessions = 0
        expired_sessions = 0
        now = datetime.now()

        for session in self._session_cache.values():
            if session.expires_at > now:
                active_sessions += 1
            else:
                expired_sessions += 1

        return {
            "total_cached_sessions": len(self._session_cache),
            "active_sessions": active_sessions,
            "expired_sessions": expired_sessions,
            "cache_ttl_minutes": self._cache_ttl.total_seconds() / 60
        }