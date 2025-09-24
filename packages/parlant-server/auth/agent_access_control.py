"""
Agent Access Control System for Workspace Isolation

This module provides fine-grained access control for Parlant agents within
workspace boundaries, ensuring proper isolation and security.

Features:
- Agent-specific permission validation
- Session-level access control
- Conversation boundary enforcement
- Tool usage permission checking
- Audit logging for access attempts
"""

import logging
from typing import Dict, Any, Optional, List, Set, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from fastapi import HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth.workspace_isolation import WorkspaceContext, WorkspaceIsolationManager
from auth.sim_auth_bridge import SimSession


logger = logging.getLogger(__name__)


class AccessLevel(Enum):
    """Access levels for agent operations."""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class ResourceType(Enum):
    """Types of resources that can be accessed."""
    AGENT = "agent"
    SESSION = "session"
    CONVERSATION = "conversation"
    TOOL = "tool"
    VARIABLE = "variable"
    GUIDELINE = "guideline"
    JOURNEY = "journey"


@dataclass
class AccessRequest:
    """Represents an access request for validation."""
    user_id: str
    workspace_id: str
    resource_type: ResourceType
    resource_id: str
    action: str  # 'create', 'read', 'update', 'delete', 'execute'
    required_access_level: AccessLevel
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AccessResult:
    """Result of an access validation check."""
    granted: bool
    access_level: AccessLevel
    reason: str
    restrictions: Dict[str, Any] = field(default_factory=dict)
    audit_info: Dict[str, Any] = field(default_factory=dict)


class AgentAccessController:
    """
    Central access controller for agent-related operations.

    Provides comprehensive access control for agents, sessions, conversations,
    and related resources within workspace boundaries.
    """

    def __init__(self, isolation_manager: WorkspaceIsolationManager, db_session: Session):
        self.isolation_manager = isolation_manager
        self.db_session = db_session
        self._access_cache: Dict[str, AccessResult] = {}
        self._cache_ttl = timedelta(minutes=2)  # Short TTL for security

    async def validate_agent_access(
        self,
        request: AccessRequest,
        session: SimSession
    ) -> AccessResult:
        """
        Validate access to agent-related operations.

        Args:
            request: Access request details
            session: Authenticated session

        Returns:
            AccessResult with validation outcome
        """
        # Check cache first (for performance)
        cache_key = self._create_cache_key(request)
        if cache_key in self._access_cache:
            cached_result = self._access_cache[cache_key]
            if datetime.now() - request.timestamp < self._cache_ttl:
                return cached_result

        # Validate workspace context
        workspace_context = await self.isolation_manager.get_workspace_context(
            request.user_id, request.workspace_id
        )

        if not workspace_context:
            return AccessResult(
                granted=False,
                access_level=AccessLevel.NONE,
                reason="No workspace context found",
                audit_info={'security_violation': 'no_workspace_context'}
            )

        # Perform resource-specific validation
        if request.resource_type == ResourceType.AGENT:
            result = await self._validate_agent_resource_access(request, workspace_context)
        elif request.resource_type == ResourceType.SESSION:
            result = await self._validate_session_resource_access(request, workspace_context)
        elif request.resource_type == ResourceType.CONVERSATION:
            result = await self._validate_conversation_resource_access(request, workspace_context)
        elif request.resource_type == ResourceType.TOOL:
            result = await self._validate_tool_resource_access(request, workspace_context)
        elif request.resource_type == ResourceType.VARIABLE:
            result = await self._validate_variable_resource_access(request, workspace_context)
        else:
            result = await self._validate_generic_resource_access(request, workspace_context)

        # Cache the result
        self._access_cache[cache_key] = result

        # Audit the access attempt
        await self._audit_access_attempt(request, result, session)

        return result

    async def validate_agent_creation(
        self,
        user_id: str,
        workspace_id: str,
        agent_config: Dict[str, Any],
        session: SimSession
    ) -> AccessResult:
        """
        Validate agent creation within workspace.

        Args:
            user_id: User creating the agent
            workspace_id: Target workspace
            agent_config: Agent configuration data
            session: Authenticated session

        Returns:
            AccessResult for agent creation
        """
        request = AccessRequest(
            user_id=user_id,
            workspace_id=workspace_id,
            resource_type=ResourceType.AGENT,
            resource_id="new",
            action="create",
            required_access_level=AccessLevel.WRITE,
            context={'agent_config': agent_config}
        )

        result = await self.validate_agent_access(request, session)

        # Additional validation for agent creation
        if result.granted:
            # Check agent limits for workspace
            agent_count = await self._get_workspace_agent_count(workspace_id)
            max_agents = await self._get_workspace_agent_limit(workspace_id)

            if agent_count >= max_agents:
                return AccessResult(
                    granted=False,
                    access_level=result.access_level,
                    reason=f"Workspace agent limit exceeded ({agent_count}/{max_agents})",
                    restrictions={'current_count': agent_count, 'max_allowed': max_agents}
                )

        return result

    async def validate_session_creation(
        self,
        user_id: str,
        agent_id: str,
        workspace_id: str,
        session_config: Dict[str, Any],
        sim_session: SimSession
    ) -> AccessResult:
        """
        Validate session creation for agent within workspace.

        Args:
            user_id: User creating the session
            agent_id: Target agent ID
            workspace_id: Workspace scope
            session_config: Session configuration
            sim_session: Authenticated session

        Returns:
            AccessResult for session creation
        """
        # First validate agent access
        agent_request = AccessRequest(
            user_id=user_id,
            workspace_id=workspace_id,
            resource_type=ResourceType.AGENT,
            resource_id=agent_id,
            action="read",
            required_access_level=AccessLevel.READ
        )

        agent_result = await self.validate_agent_access(agent_request, sim_session)
        if not agent_result.granted:
            return agent_result

        # Now validate session creation
        session_request = AccessRequest(
            user_id=user_id,
            workspace_id=workspace_id,
            resource_type=ResourceType.SESSION,
            resource_id="new",
            action="create",
            required_access_level=AccessLevel.WRITE,
            context={'agent_id': agent_id, 'session_config': session_config}
        )

        return await self.validate_agent_access(session_request, sim_session)

    async def validate_tool_execution(
        self,
        user_id: str,
        agent_id: str,
        tool_id: str,
        workspace_id: str,
        tool_params: Dict[str, Any],
        session: SimSession
    ) -> AccessResult:
        """
        Validate tool execution within agent session.

        Args:
            user_id: User executing the tool
            agent_id: Agent executing the tool
            tool_id: Tool being executed
            workspace_id: Workspace scope
            tool_params: Tool execution parameters
            session: Authenticated session

        Returns:
            AccessResult for tool execution
        """
        request = AccessRequest(
            user_id=user_id,
            workspace_id=workspace_id,
            resource_type=ResourceType.TOOL,
            resource_id=tool_id,
            action="execute",
            required_access_level=AccessLevel.WRITE,
            context={
                'agent_id': agent_id,
                'tool_params': tool_params
            }
        )

        result = await self.validate_agent_access(request, session)

        # Additional tool-specific validation
        if result.granted:
            # Check if tool is enabled for the workspace
            tool_enabled = await self._is_tool_enabled_for_workspace(tool_id, workspace_id)
            if not tool_enabled:
                return AccessResult(
                    granted=False,
                    access_level=result.access_level,
                    reason=f"Tool {tool_id} is not enabled for workspace {workspace_id}",
                    restrictions={'tool_id': tool_id, 'workspace_id': workspace_id}
                )

            # Check tool usage limits
            usage_allowed = await self._check_tool_usage_limits(
                user_id, tool_id, workspace_id
            )
            if not usage_allowed:
                return AccessResult(
                    granted=False,
                    access_level=result.access_level,
                    reason=f"Tool usage limit exceeded for {tool_id}",
                    restrictions={'tool_id': tool_id, 'limit_exceeded': True}
                )

        return result

    async def get_user_accessible_agents(
        self,
        user_id: str,
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get list of agents accessible to user within workspace.

        Args:
            user_id: User ID
            workspace_id: Workspace scope

        Returns:
            List of accessible agent information
        """
        try:
            # Get workspace context
            context = await self.isolation_manager.get_workspace_context(user_id, workspace_id)
            if not context:
                return []

            # Query agents in workspace based on user permissions
            if context.can_admin:
                # Admin can see all agents
                query = text("""
                    SELECT id, name, description, status, created_by,
                           created_at, updated_at, last_active_at
                    FROM parlant_agent
                    WHERE workspace_id = :workspace_id AND deleted_at IS NULL
                    ORDER BY created_at DESC
                """)
            elif context.can_read:
                # Read access can see active agents and their own agents
                query = text("""
                    SELECT id, name, description, status, created_by,
                           created_at, updated_at, last_active_at
                    FROM parlant_agent
                    WHERE workspace_id = :workspace_id
                    AND deleted_at IS NULL
                    AND (status = 'active' OR created_by = :user_id)
                    ORDER BY created_at DESC
                """)
            else:
                return []

            results = self.db_session.execute(query, {
                'workspace_id': workspace_id,
                'user_id': user_id
            }).fetchall()

            agents = []
            for row in results:
                agent_info = {
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'status': row.status,
                    'created_by': row.created_by,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None,
                    'last_active_at': row.last_active_at.isoformat() if row.last_active_at else None,
                    'workspace_id': workspace_id,
                    'access_level': 'admin' if context.can_admin else 'read'
                }
                agents.append(agent_info)

            return agents

        except Exception as e:
            logger.error(f"Error getting accessible agents for user {user_id}: {e}")
            return []

    # Private helper methods

    async def _validate_agent_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to agent resources."""
        # Check if agent exists and belongs to workspace
        if request.resource_id != "new":
            agent_workspace = await self._get_agent_workspace(request.resource_id)
            if not agent_workspace:
                return AccessResult(
                    granted=False,
                    access_level=AccessLevel.NONE,
                    reason=f"Agent {request.resource_id} not found"
                )

            if agent_workspace != request.workspace_id:
                await self.isolation_manager.audit_cross_workspace_attempt(
                    request.user_id,
                    request.workspace_id,
                    agent_workspace,
                    'agent',
                    request.resource_id
                )
                return AccessResult(
                    granted=False,
                    access_level=AccessLevel.NONE,
                    reason="Cross-workspace access denied",
                    audit_info={'security_violation': 'cross_workspace_attempt'}
                )

        # Check permission level
        if request.required_access_level == AccessLevel.READ and context.can_read:
            return AccessResult(granted=True, access_level=AccessLevel.READ, reason="Read access granted")
        elif request.required_access_level == AccessLevel.WRITE and context.can_write:
            return AccessResult(granted=True, access_level=AccessLevel.WRITE, reason="Write access granted")
        elif request.required_access_level == AccessLevel.ADMIN and context.can_admin:
            return AccessResult(granted=True, access_level=AccessLevel.ADMIN, reason="Admin access granted")

        return AccessResult(
            granted=False,
            access_level=AccessLevel.NONE,
            reason=f"Insufficient permissions: required {request.required_access_level.value}"
        )

    async def _validate_session_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to session resources."""
        # Similar validation logic as agent resources
        # but with session-specific checks

        if request.resource_id != "new":
            session_workspace = await self._get_session_workspace(request.resource_id)
            if session_workspace != request.workspace_id:
                return AccessResult(
                    granted=False,
                    access_level=AccessLevel.NONE,
                    reason="Session not in requested workspace"
                )

        # Check permissions
        if request.action in ['create', 'update', 'delete'] and not context.can_write:
            return AccessResult(
                granted=False,
                access_level=AccessLevel.READ if context.can_read else AccessLevel.NONE,
                reason="Write permission required for session modification"
            )

        return AccessResult(
            granted=True,
            access_level=AccessLevel.WRITE if context.can_write else AccessLevel.READ,
            reason="Session access granted"
        )

    async def _validate_conversation_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to conversation resources."""
        # Check if conversation belongs to workspace
        conversation_valid = await self.isolation_manager.validate_conversation_access(
            request.user_id,
            request.resource_id,
            request.workspace_id
        )

        if not conversation_valid:
            return AccessResult(
                granted=False,
                access_level=AccessLevel.NONE,
                reason="Conversation access denied or not in workspace"
            )

        return AccessResult(
            granted=context.can_read,
            access_level=AccessLevel.READ if context.can_read else AccessLevel.NONE,
            reason="Conversation access validated"
        )

    async def _validate_tool_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to tool resources."""
        # Check if tool is available in workspace
        tool_available = await self._is_tool_available_in_workspace(
            request.resource_id,
            request.workspace_id
        )

        if not tool_available:
            return AccessResult(
                granted=False,
                access_level=AccessLevel.NONE,
                reason=f"Tool {request.resource_id} not available in workspace"
            )

        # Tool execution requires write permission
        if request.action == "execute" and not context.can_write:
            return AccessResult(
                granted=False,
                access_level=AccessLevel.READ if context.can_read else AccessLevel.NONE,
                reason="Write permission required for tool execution"
            )

        return AccessResult(
            granted=True,
            access_level=AccessLevel.WRITE if context.can_write else AccessLevel.READ,
            reason="Tool access granted"
        )

    async def _validate_variable_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to variable resources."""
        # Variables are workspace-scoped, so basic context validation is sufficient
        return AccessResult(
            granted=context.can_read,
            access_level=AccessLevel.WRITE if context.can_write else AccessLevel.READ,
            reason="Variable access granted"
        )

    async def _validate_generic_resource_access(
        self,
        request: AccessRequest,
        context: WorkspaceContext
    ) -> AccessResult:
        """Validate access to generic resources."""
        # Default validation based on workspace permissions
        if request.required_access_level == AccessLevel.ADMIN and context.can_admin:
            return AccessResult(granted=True, access_level=AccessLevel.ADMIN, reason="Admin access granted")
        elif request.required_access_level == AccessLevel.WRITE and context.can_write:
            return AccessResult(granted=True, access_level=AccessLevel.WRITE, reason="Write access granted")
        elif request.required_access_level == AccessLevel.READ and context.can_read:
            return AccessResult(granted=True, access_level=AccessLevel.READ, reason="Read access granted")

        return AccessResult(
            granted=False,
            access_level=AccessLevel.NONE,
            reason="Insufficient permissions"
        )

    async def _audit_access_attempt(
        self,
        request: AccessRequest,
        result: AccessResult,
        session: SimSession
    ):
        """Audit access attempts for security monitoring."""
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'user_id': request.user_id,
            'user_email': session.user.email,
            'workspace_id': request.workspace_id,
            'resource_type': request.resource_type.value,
            'resource_id': request.resource_id,
            'action': request.action,
            'required_access_level': request.required_access_level.value,
            'granted': result.granted,
            'actual_access_level': result.access_level.value,
            'reason': result.reason,
            'session_id': session.id
        }

        # Include security violations in audit info
        if result.audit_info:
            audit_entry.update(result.audit_info)

        # Log the access attempt
        if result.granted:
            logger.info(f"Access granted: {audit_entry}")
        else:
            logger.warning(f"Access denied: {audit_entry}")

        # In production, send to audit system or database

    def _create_cache_key(self, request: AccessRequest) -> str:
        """Create cache key for access request."""
        return f"{request.user_id}:{request.workspace_id}:{request.resource_type.value}:{request.resource_id}:{request.action}"

    # Database query helpers

    async def _get_agent_workspace(self, agent_id: str) -> Optional[str]:
        """Get workspace ID for an agent."""
        query = text("SELECT workspace_id FROM parlant_agent WHERE id = :agent_id AND deleted_at IS NULL")
        result = self.db_session.execute(query, {'agent_id': agent_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_session_workspace(self, session_id: str) -> Optional[str]:
        """Get workspace ID for a session."""
        query = text("SELECT workspace_id FROM parlant_session WHERE id = :session_id")
        result = self.db_session.execute(query, {'session_id': session_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_workspace_agent_count(self, workspace_id: str) -> int:
        """Get current agent count for workspace."""
        query = text("""
            SELECT COUNT(*) as count
            FROM parlant_agent
            WHERE workspace_id = :workspace_id AND deleted_at IS NULL
        """)
        result = self.db_session.execute(query, {'workspace_id': workspace_id}).fetchone()
        return result.count if result else 0

    async def _get_workspace_agent_limit(self, workspace_id: str) -> int:
        """Get agent limit for workspace (could be configurable)."""
        # For now, return a default limit
        # In production, this could be based on subscription tiers
        return 50

    async def _is_tool_enabled_for_workspace(self, tool_id: str, workspace_id: str) -> bool:
        """Check if tool is enabled for workspace."""
        query = text("""
            SELECT enabled
            FROM parlant_tool
            WHERE id = :tool_id AND workspace_id = :workspace_id
        """)
        result = self.db_session.execute(query, {
            'tool_id': tool_id,
            'workspace_id': workspace_id
        }).fetchone()
        return result.enabled if result else False

    async def _is_tool_available_in_workspace(self, tool_id: str, workspace_id: str) -> bool:
        """Check if tool is available in workspace."""
        query = text("""
            SELECT COUNT(*) as count
            FROM parlant_tool
            WHERE id = :tool_id AND workspace_id = :workspace_id AND enabled = true
        """)
        result = self.db_session.execute(query, {
            'tool_id': tool_id,
            'workspace_id': workspace_id
        }).fetchone()
        return result.count > 0 if result else False

    async def _check_tool_usage_limits(self, user_id: str, tool_id: str, workspace_id: str) -> bool:
        """Check if user has exceeded tool usage limits."""
        # For now, return True (no limits)
        # In production, implement usage tracking and limits
        return True