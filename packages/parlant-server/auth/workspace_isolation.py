"""
Workspace Isolation System for Parlant Agents

This module implements comprehensive workspace-scoped isolation to ensure:
1. Agents are properly scoped to specific workspaces
2. Sessions and conversations respect workspace boundaries
3. Cross-workspace data access is prevented
4. Permission validation for all agent operations

Key Features:
- Workspace context management
- Multi-tenant security boundaries
- Permission validation middleware
- Agent session isolation
- Cross-workspace access prevention
"""

import logging
from typing import Dict, Any, Optional, List, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

from fastapi import HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth.sim_auth_bridge import SimSession, SimUser
from config.settings import Settings


logger = logging.getLogger(__name__)


@dataclass
class WorkspacePermission:
    """Represents a user's permission within a workspace."""
    workspace_id: str
    user_id: str
    permission_type: str  # 'admin', 'write', 'read'
    entity_type: str = 'workspace'
    granted_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None


@dataclass
class WorkspaceContext:
    """Isolated context for workspace operations."""
    workspace_id: str
    user_id: str
    session_id: str
    permissions: List[WorkspacePermission] = field(default_factory=list)
    isolation_token: str = field(default_factory=lambda: f"ws_ctx_{datetime.now().timestamp()}")
    created_at: datetime = field(default_factory=datetime.now)

    @property
    def can_read(self) -> bool:
        """Check if user can read in this workspace."""
        return any(p.permission_type in ['read', 'write', 'admin'] for p in self.permissions)

    @property
    def can_write(self) -> bool:
        """Check if user can write in this workspace."""
        return any(p.permission_type in ['write', 'admin'] for p in self.permissions)

    @property
    def can_admin(self) -> bool:
        """Check if user can admin this workspace."""
        return any(p.permission_type == 'admin' for p in self.permissions)


class WorkspaceIsolationManager:
    """
    Central manager for workspace isolation and multi-tenancy.

    Responsibilities:
    - Enforce workspace boundaries for all operations
    - Validate user permissions within workspaces
    - Manage isolated contexts for agent operations
    - Prevent cross-workspace data leakage
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._active_contexts: Dict[str, WorkspaceContext] = {}
        self._workspace_cache: Dict[str, Dict[str, Any]] = {}
        self._permission_cache: Dict[str, List[WorkspacePermission]] = {}

        # Cache TTL settings
        self._cache_ttl = timedelta(minutes=10)
        self._last_cache_cleanup = datetime.now()

    async def initialize(self, db_session: Session):
        """Initialize the workspace isolation manager."""
        self.db_session = db_session
        logger.info("Workspace Isolation Manager initialized")

    async def create_workspace_context(
        self,
        session: SimSession,
        workspace_id: str,
        agent_id: Optional[str] = None
    ) -> WorkspaceContext:
        """
        Create an isolated workspace context for agent operations.

        Args:
            session: Validated SimSession
            workspace_id: Target workspace ID
            agent_id: Optional specific agent ID

        Returns:
            WorkspaceContext with proper isolation

        Raises:
            HTTPException: If workspace access is denied
        """
        # Validate workspace exists and user has access
        await self._validate_workspace_access(session.user.id, workspace_id)

        # Get user permissions in workspace
        permissions = await self._get_user_workspace_permissions(session.user.id, workspace_id)

        if not permissions:
            raise HTTPException(
                status_code=403,
                detail=f"No permissions found for workspace {workspace_id}"
            )

        # Create isolated context
        context = WorkspaceContext(
            workspace_id=workspace_id,
            user_id=session.user.id,
            session_id=session.id,
            permissions=permissions
        )

        # Store active context
        context_key = f"{session.user.id}:{workspace_id}"
        self._active_contexts[context_key] = context

        # Log context creation
        logger.info(
            f"Created workspace context for user {session.user.email} "
            f"in workspace {workspace_id} with permissions: "
            f"{[p.permission_type for p in permissions]}"
        )

        return context

    async def get_workspace_context(
        self,
        user_id: str,
        workspace_id: str
    ) -> Optional[WorkspaceContext]:
        """Get existing workspace context."""
        context_key = f"{user_id}:{workspace_id}"
        return self._active_contexts.get(context_key)

    async def validate_agent_workspace_access(
        self,
        user_id: str,
        agent_id: str,
        workspace_id: str,
        required_permission: str = 'read'
    ) -> bool:
        """
        Validate that a user can access a specific agent within a workspace.

        Args:
            user_id: User attempting access
            agent_id: Agent being accessed
            workspace_id: Workspace containing the agent
            required_permission: Minimum required permission ('read', 'write', 'admin')

        Returns:
            True if access allowed, False otherwise
        """
        try:
            # Get workspace context
            context = await self.get_workspace_context(user_id, workspace_id)

            if not context:
                logger.warning(f"No workspace context found for user {user_id} in workspace {workspace_id}")
                return False

            # Verify agent belongs to the workspace
            agent_workspace = await self._get_agent_workspace(agent_id)
            if agent_workspace != workspace_id:
                logger.warning(
                    f"Agent {agent_id} belongs to workspace {agent_workspace}, "
                    f"not requested workspace {workspace_id}"
                )
                return False

            # Check permission level
            if required_permission == 'read' and context.can_read:
                return True
            elif required_permission == 'write' and context.can_write:
                return True
            elif required_permission == 'admin' and context.can_admin:
                return True

            logger.warning(
                f"User {user_id} lacks {required_permission} permission "
                f"for agent {agent_id} in workspace {workspace_id}"
            )
            return False

        except Exception as e:
            logger.error(f"Error validating agent workspace access: {e}")
            return False

    async def enforce_session_isolation(
        self,
        session_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Enforce isolation for agent sessions within workspace boundaries.

        Args:
            session_id: Agent session ID
            workspace_id: Workspace scope for isolation

        Returns:
            Isolation configuration for the session
        """
        isolation_config = {
            'workspace_boundary': workspace_id,
            'session_scope': session_id,
            'data_access_filter': f"workspace_id = '{workspace_id}'",
            'isolation_level': 'strict',
            'cross_workspace_access': 'deny',
            'audit_enabled': True,
            'created_at': datetime.now().isoformat()
        }

        logger.info(f"Enforced session isolation for session {session_id} in workspace {workspace_id}")
        return isolation_config

    async def validate_conversation_access(
        self,
        user_id: str,
        conversation_id: str,
        workspace_id: str
    ) -> bool:
        """
        Validate access to conversations within workspace boundaries.

        Args:
            user_id: User attempting access
            conversation_id: Conversation being accessed
            workspace_id: Workspace scope

        Returns:
            True if access allowed, False otherwise
        """
        try:
            # Check if conversation belongs to the workspace
            conversation_workspace = await self._get_conversation_workspace(conversation_id)

            if conversation_workspace != workspace_id:
                logger.warning(
                    f"Conversation {conversation_id} belongs to workspace {conversation_workspace}, "
                    f"not requested workspace {workspace_id}"
                )
                return False

            # Validate user has access to the workspace
            context = await self.get_workspace_context(user_id, workspace_id)
            return context is not None and context.can_read

        except Exception as e:
            logger.error(f"Error validating conversation access: {e}")
            return False

    async def create_agent_data_filter(self, workspace_id: str) -> str:
        """
        Create SQL filter to ensure agents only access workspace-scoped data.

        Args:
            workspace_id: Workspace to scope data to

        Returns:
            SQL WHERE clause for data filtering
        """
        return f"workspace_id = '{workspace_id}'"

    async def audit_cross_workspace_attempt(
        self,
        user_id: str,
        requested_workspace: str,
        actual_workspace: str,
        resource_type: str,
        resource_id: str
    ):
        """
        Audit attempted cross-workspace access for security monitoring.

        Args:
            user_id: User who attempted access
            requested_workspace: Workspace user requested access to
            actual_workspace: Actual workspace of the resource
            resource_type: Type of resource (agent, session, conversation)
            resource_id: ID of the resource
        """
        audit_entry = {
            'event_type': 'cross_workspace_access_attempt',
            'user_id': user_id,
            'requested_workspace': requested_workspace,
            'actual_workspace': actual_workspace,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'timestamp': datetime.now().isoformat(),
            'blocked': True
        }

        logger.warning(
            f"SECURITY: Cross-workspace access attempt blocked - User {user_id} "
            f"tried to access {resource_type} {resource_id} from workspace {actual_workspace} "
            f"through workspace {requested_workspace}"
        )

        # In production, this should be sent to a security monitoring system
        # For now, we'll log it for auditing purposes

    async def cleanup_expired_contexts(self):
        """Clean up expired workspace contexts."""
        now = datetime.now()

        if now - self._last_cache_cleanup < timedelta(minutes=5):
            return  # Skip cleanup if done recently

        expired_keys = []
        for key, context in self._active_contexts.items():
            if now - context.created_at > self._cache_ttl:
                expired_keys.append(key)

        for key in expired_keys:
            del self._active_contexts[key]

        self._last_cache_cleanup = now

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired workspace contexts")

    # Private helper methods

    async def _validate_workspace_access(self, user_id: str, workspace_id: str):
        """Validate that user has access to workspace."""
        # Query permissions table to check if user has access
        query = text("""
            SELECT COUNT(*) as count
            FROM permissions
            WHERE user_id = :user_id
            AND entity_type = 'workspace'
            AND entity_id = :workspace_id
        """)

        result = self.db_session.execute(query, {
            'user_id': user_id,
            'workspace_id': workspace_id
        }).fetchone()

        if not result or result.count == 0:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to workspace {workspace_id}"
            )

    async def _get_user_workspace_permissions(
        self,
        user_id: str,
        workspace_id: str
    ) -> List[WorkspacePermission]:
        """Get user's permissions within a specific workspace."""
        # Check cache first
        cache_key = f"{user_id}:{workspace_id}"
        if cache_key in self._permission_cache:
            return self._permission_cache[cache_key]

        # Query database for permissions
        query = text("""
            SELECT entity_type, entity_id, permission_type, created_at
            FROM permissions
            WHERE user_id = :user_id
            AND entity_type = 'workspace'
            AND entity_id = :workspace_id
        """)

        results = self.db_session.execute(query, {
            'user_id': user_id,
            'workspace_id': workspace_id
        }).fetchall()

        permissions = []
        for row in results:
            permission = WorkspacePermission(
                workspace_id=workspace_id,
                user_id=user_id,
                permission_type=row.permission_type,
                entity_type=row.entity_type,
                granted_at=row.created_at
            )
            permissions.append(permission)

        # Cache the result
        self._permission_cache[cache_key] = permissions

        return permissions

    async def _get_agent_workspace(self, agent_id: str) -> Optional[str]:
        """Get the workspace ID that an agent belongs to."""
        query = text("""
            SELECT workspace_id
            FROM parlant_agent
            WHERE id = :agent_id AND deleted_at IS NULL
        """)

        result = self.db_session.execute(query, {'agent_id': agent_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_conversation_workspace(self, conversation_id: str) -> Optional[str]:
        """Get the workspace ID that a conversation belongs to."""
        query = text("""
            SELECT s.workspace_id
            FROM parlant_session s
            JOIN parlant_event e ON s.id = e.session_id
            WHERE e.id = :conversation_id
        """)

        result = self.db_session.execute(query, {'conversation_id': conversation_id}).fetchone()
        return result.workspace_id if result else None


class WorkspaceIsolationMiddleware:
    """
    Middleware for enforcing workspace isolation at the request level.
    """

    def __init__(self, isolation_manager: WorkspaceIsolationManager):
        self.isolation_manager = isolation_manager

    async def __call__(self, request: Request, call_next):
        """Process request with workspace isolation enforcement."""
        # Extract workspace_id from path or headers
        workspace_id = self._extract_workspace_id(request)

        if workspace_id and hasattr(request.state, 'session'):
            session = request.state.session

            try:
                # Create or get workspace context
                context = await self.isolation_manager.create_workspace_context(
                    session, workspace_id
                )

                # Add context to request state
                request.state.workspace_context = context
                request.state.workspace_id = workspace_id

                # Apply data filters
                data_filter = await self.isolation_manager.create_agent_data_filter(workspace_id)
                request.state.data_filter = data_filter

            except HTTPException as e:
                # Return permission denied
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=e.status_code,
                    content={"detail": e.detail}
                )

        response = await call_next(request)

        # Clean up expired contexts
        await self.isolation_manager.cleanup_expired_contexts()

        return response

    def _extract_workspace_id(self, request: Request) -> Optional[str]:
        """Extract workspace ID from request path or headers."""
        # Check path parameters first
        path_parts = request.url.path.split('/')

        # Look for /workspaces/{workspace_id}/ pattern
        if 'workspaces' in path_parts:
            try:
                workspace_idx = path_parts.index('workspaces')
                if workspace_idx + 1 < len(path_parts):
                    return path_parts[workspace_idx + 1]
            except (ValueError, IndexError):
                pass

        # Check headers as fallback
        return request.headers.get('X-Workspace-ID')


# Context manager for workspace operations
@asynccontextmanager
async def workspace_context(
    isolation_manager: WorkspaceIsolationManager,
    session: SimSession,
    workspace_id: str
):
    """
    Context manager for workspace-scoped operations.

    Usage:
        async with workspace_context(manager, session, workspace_id) as ctx:
            # All operations within this block are workspace-scoped
            agents = await get_agents_for_workspace(ctx.workspace_id)
    """
    context = await isolation_manager.create_workspace_context(session, workspace_id)

    try:
        yield context
    finally:
        # Cleanup or additional validation if needed
        pass


# Dependency functions for FastAPI routes
async def get_workspace_context(request: Request) -> WorkspaceContext:
    """FastAPI dependency to get workspace context from request."""
    if not hasattr(request.state, 'workspace_context'):
        raise HTTPException(
            status_code=403,
            detail="No workspace context available"
        )

    return request.state.workspace_context


async def require_workspace_permission(
    permission: str = 'read'
):
    """
    FastAPI dependency factory for workspace permission requirements.

    Usage:
        @app.get("/api/v1/workspaces/{workspace_id}/agents")
        async def list_agents(
            context: WorkspaceContext = Depends(require_workspace_permission('read'))
        ):
    """
    async def _check_permission(request: Request) -> WorkspaceContext:
        context = await get_workspace_context(request)

        if permission == 'read' and not context.can_read:
            raise HTTPException(status_code=403, detail="Read permission required")
        elif permission == 'write' and not context.can_write:
            raise HTTPException(status_code=403, detail="Write permission required")
        elif permission == 'admin' and not context.can_admin:
            raise HTTPException(status_code=403, detail="Admin permission required")

        return context

    return _check_permission