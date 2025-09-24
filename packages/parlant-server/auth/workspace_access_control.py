"""
Workspace Access Control System for Parlant Agents
============================================

This module implements comprehensive access control for Parlant agents based on
Sim's existing workspace membership and permission system. It provides fine-grained
access control with multi-tenant isolation and security validation.

Key Features:
- Integration with Sim's existing permission patterns
- Fine-grained agent access control based on workspace membership
- Permission caching and optimization
- Security audit logging
- Cross-workspace access prevention
"""

import logging
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field

from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from auth.sim_auth_bridge import SimSession, SimUser
from database.connection import get_async_session_context
from config.settings import get_settings

logger = logging.getLogger(__name__)


class PermissionLevel(Enum):
    """Permission levels matching Sim's permission system."""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class AgentAccessLevel(Enum):
    """Agent-specific access levels."""
    NONE = "none"          # No access
    VIEW = "view"          # Can view agent details
    INTERACT = "interact"  # Can chat with agent
    CONFIGURE = "configure" # Can modify agent settings
    MANAGE = "manage"      # Full agent management


@dataclass
class WorkspacePermissionContext:
    """Comprehensive workspace permission context."""
    workspace_id: str
    user_id: str
    permission_level: PermissionLevel
    workspace_name: str
    organization_id: Optional[str]
    is_owner: bool = False
    cached_at: datetime = field(default_factory=datetime.now)
    access_patterns: Set[str] = field(default_factory=set)

    def has_minimum_permission(self, required_level: PermissionLevel) -> bool:
        """Check if user has at least the required permission level."""
        permission_hierarchy = {
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.ADMIN: 3
        }
        return permission_hierarchy[self.permission_level] >= permission_hierarchy[required_level]

    def can_create_agents(self) -> bool:
        """Check if user can create agents in workspace."""
        return self.has_minimum_permission(PermissionLevel.WRITE) or self.is_owner

    def can_manage_agents(self) -> bool:
        """Check if user can manage existing agents."""
        return self.has_minimum_permission(PermissionLevel.ADMIN) or self.is_owner

    def can_configure_agents(self) -> bool:
        """Check if user can configure agent settings."""
        return self.has_minimum_permission(PermissionLevel.WRITE) or self.is_owner


@dataclass
class AgentAccessContext:
    """Agent-specific access context."""
    agent_id: str
    workspace_id: str
    created_by: str
    access_level: AgentAccessLevel
    permission_context: WorkspacePermissionContext
    restrictions: List[str] = field(default_factory=list)
    last_accessed: Optional[datetime] = None


class WorkspaceAccessController:
    """
    Comprehensive workspace access control system for Parlant agents.

    Integrates with Sim's existing permission system to provide:
    - Workspace-based agent access control
    - Permission validation and caching
    - Security audit and monitoring
    - Cross-workspace access prevention
    """

    def __init__(self):
        self.settings = get_settings()
        self._permission_cache: Dict[str, WorkspacePermissionContext] = {}
        self._agent_access_cache: Dict[str, AgentAccessContext] = {}
        self._cache_ttl = timedelta(minutes=10)

        # Access control policies
        self._access_policies = {
            'agent_creation': self._validate_agent_creation_access,
            'agent_interaction': self._validate_agent_interaction_access,
            'agent_configuration': self._validate_agent_configuration_access,
            'agent_management': self._validate_agent_management_access,
            'agent_deletion': self._validate_agent_deletion_access,
        }

    async def get_workspace_permission_context(
        self,
        session: SimSession,
        workspace_id: str
    ) -> WorkspacePermissionContext:
        """
        Get comprehensive workspace permission context for user.

        Integrates with Sim's existing permission system to determine:
        - User's permission level in workspace
        - Workspace ownership status
        - Organization context
        - Access patterns and restrictions
        """
        cache_key = f"{session.user.id}:{workspace_id}"

        # Check cache first
        if cache_key in self._permission_cache:
            cached_context = self._permission_cache[cache_key]
            if datetime.now() - cached_context.cached_at < self._cache_ttl:
                return cached_context

        try:
            # Get workspace from user's workspace list (already validated by auth middleware)
            workspace_found = None
            for workspace in session.user.workspaces or []:
                if workspace.get('id') == workspace_id:
                    workspace_found = workspace
                    break

            if not workspace_found:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied to workspace {workspace_id}"
                )

            # Create permission context using Sim's permission patterns
            async with get_async_session_context() as db_session:
                # Check if user is workspace owner
                from packages.db.schema import workspace as workspace_table
                workspace_query = select(workspace_table).where(workspace_table.id == workspace_id)
                workspace_result = await db_session.execute(workspace_query)
                workspace_data = workspace_result.scalar_one_or_none()

                is_owner = workspace_data and workspace_data.ownerId == session.user.id

                # Get user's permission level from Sim's permission system
                from packages.db.schema import permissions
                permission_query = select(permissions.permissionType).where(
                    and_(
                        permissions.userId == session.user.id,
                        permissions.entityType == 'workspace',
                        permissions.entityId == workspace_id
                    )
                )
                permission_result = await db_session.execute(permission_query)
                user_permission = permission_result.scalar_one_or_none()

                # Determine effective permission level
                if is_owner:
                    effective_permission = PermissionLevel.ADMIN
                elif user_permission:
                    effective_permission = PermissionLevel(user_permission)
                else:
                    effective_permission = PermissionLevel.READ  # Default fallback

                # Create comprehensive permission context
                permission_context = WorkspacePermissionContext(
                    workspace_id=workspace_id,
                    user_id=session.user.id,
                    permission_level=effective_permission,
                    workspace_name=workspace_found.get('name', 'Unknown'),
                    organization_id=session.active_organization_id,
                    is_owner=is_owner
                )

                # Cache the context
                self._permission_cache[cache_key] = permission_context

                logger.debug(
                    f"Created permission context for user {session.user.id} "
                    f"in workspace {workspace_id}: {effective_permission.value}"
                )

                return permission_context

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting workspace permission context: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to validate workspace permissions"
            )

    async def get_agent_access_context(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str
    ) -> AgentAccessContext:
        """
        Get agent-specific access context for user.

        Determines user's access level to specific agent based on:
        - Workspace permissions
        - Agent creation ownership
        - Organization policies
        - Access restrictions
        """
        cache_key = f"{session.user.id}:{agent_id}:{workspace_id}"

        # Check cache first
        if cache_key in self._agent_access_cache:
            cached_context = self._agent_access_cache[cache_key]
            if cached_context.last_accessed and \
               datetime.now() - cached_context.last_accessed < self._cache_ttl:
                return cached_context

        try:
            # Get workspace permission context first
            permission_context = await self.get_workspace_permission_context(session, workspace_id)

            # Get agent information
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                agent_query = select(parlantAgent).where(
                    and_(
                        parlantAgent.id == agent_id,
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.deletedAt.is_(None)
                    )
                )
                agent_result = await db_session.execute(agent_query)
                agent = agent_result.scalar_one_or_none()

                if not agent:
                    raise HTTPException(
                        status_code=404,
                        detail="Agent not found or access denied"
                    )

                # Determine agent access level based on permissions
                access_level = await self._determine_agent_access_level(
                    permission_context, agent, session.user.id
                )

                # Check for any access restrictions
                restrictions = await self._get_agent_access_restrictions(
                    permission_context, agent
                )

                # Create agent access context
                agent_access_context = AgentAccessContext(
                    agent_id=agent_id,
                    workspace_id=workspace_id,
                    created_by=agent.createdBy,
                    access_level=access_level,
                    permission_context=permission_context,
                    restrictions=restrictions,
                    last_accessed=datetime.now()
                )

                # Cache the context
                self._agent_access_cache[cache_key] = agent_access_context

                logger.debug(
                    f"Created agent access context for user {session.user.id} "
                    f"on agent {agent_id}: {access_level.value}"
                )

                return agent_access_context

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting agent access context: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to validate agent access"
            )

    async def validate_operation_access(
        self,
        session: SimSession,
        operation: str,
        workspace_id: str,
        agent_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Validate if user has access to perform specific operation.

        Operations include:
        - agent_creation: Creating new agents
        - agent_interaction: Chatting with agents
        - agent_configuration: Modifying agent settings
        - agent_management: Full agent management
        - agent_deletion: Deleting agents
        """
        try:
            logger.debug(f"Validating {operation} access for user {session.user.id}")

            # Get workspace permission context
            permission_context = await self.get_workspace_permission_context(session, workspace_id)

            # For agent-specific operations, get agent access context
            agent_access_context = None
            if agent_id:
                agent_access_context = await self.get_agent_access_context(
                    session, agent_id, workspace_id
                )

            # Apply operation-specific access policy
            if operation in self._access_policies:
                policy_validator = self._access_policies[operation]
                is_allowed = await policy_validator(
                    permission_context, agent_access_context, additional_context
                )
            else:
                logger.warning(f"Unknown operation: {operation}")
                is_allowed = False

            # Log access decision
            await self._log_access_decision(
                session.user.id, operation, workspace_id, agent_id, is_allowed
            )

            return is_allowed

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating operation access: {e}")
            return False

    async def get_accessible_agents(
        self,
        session: SimSession,
        workspace_id: str,
        operation: str = 'agent_interaction'
    ) -> List[str]:
        """
        Get list of agent IDs that user can access for specific operation.

        This is used for filtering agent lists and ensuring users only see
        agents they have permission to interact with.
        """
        try:
            # Get workspace permission context
            permission_context = await self.get_workspace_permission_context(session, workspace_id)

            # Get all agents in workspace
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                agents_query = select(parlantAgent.id, parlantAgent.createdBy).where(
                    and_(
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.deletedAt.is_(None)
                    )
                )
                agents_result = await db_session.execute(agents_query)
                agents = agents_result.all()

                # Filter agents based on access level
                accessible_agent_ids = []

                for agent_id, created_by in agents:
                    try:
                        # Create mock agent context for access validation
                        mock_agent_context = AgentAccessContext(
                            agent_id=agent_id,
                            workspace_id=workspace_id,
                            created_by=created_by,
                            access_level=AgentAccessLevel.NONE,  # Will be determined
                            permission_context=permission_context
                        )

                        # Determine access level for this agent
                        access_level = await self._determine_agent_access_level(
                            permission_context, type('MockAgent', (), {
                                'id': agent_id,
                                'createdBy': created_by,
                                'workspaceId': workspace_id
                            })(), session.user.id
                        )

                        mock_agent_context.access_level = access_level

                        # Check if user has required access for operation
                        if await self._has_required_access_for_operation(
                            operation, mock_agent_context
                        ):
                            accessible_agent_ids.append(agent_id)

                    except Exception as e:
                        logger.warning(f"Error checking access for agent {agent_id}: {e}")
                        continue

                logger.debug(
                    f"User {session.user.id} has access to {len(accessible_agent_ids)} agents "
                    f"in workspace {workspace_id} for operation {operation}"
                )

                return accessible_agent_ids

        except Exception as e:
            logger.error(f"Error getting accessible agents: {e}")
            return []

    # Private access policy validators

    async def _validate_agent_creation_access(
        self,
        permission_context: WorkspacePermissionContext,
        agent_context: Optional[AgentAccessContext],
        additional_context: Optional[Dict[str, Any]]
    ) -> bool:
        """Validate access to create agents in workspace."""
        return permission_context.can_create_agents()

    async def _validate_agent_interaction_access(
        self,
        permission_context: WorkspacePermissionContext,
        agent_context: Optional[AgentAccessContext],
        additional_context: Optional[Dict[str, Any]]
    ) -> bool:
        """Validate access to interact with specific agent."""
        if not agent_context:
            return False

        # Users can interact with agents if they have at least VIEW access
        return agent_context.access_level in [
            AgentAccessLevel.VIEW,
            AgentAccessLevel.INTERACT,
            AgentAccessLevel.CONFIGURE,
            AgentAccessLevel.MANAGE
        ]

    async def _validate_agent_configuration_access(
        self,
        permission_context: WorkspacePermissionContext,
        agent_context: Optional[AgentAccessContext],
        additional_context: Optional[Dict[str, Any]]
    ) -> bool:
        """Validate access to configure agent settings."""
        if not agent_context:
            return False

        return agent_context.access_level in [
            AgentAccessLevel.CONFIGURE,
            AgentAccessLevel.MANAGE
        ]

    async def _validate_agent_management_access(
        self,
        permission_context: WorkspacePermissionContext,
        agent_context: Optional[AgentAccessContext],
        additional_context: Optional[Dict[str, Any]]
    ) -> bool:
        """Validate access to manage agent (full access)."""
        if not agent_context:
            return False

        return agent_context.access_level == AgentAccessLevel.MANAGE

    async def _validate_agent_deletion_access(
        self,
        permission_context: WorkspacePermissionContext,
        agent_context: Optional[AgentAccessContext],
        additional_context: Optional[Dict[str, Any]]
    ) -> bool:
        """Validate access to delete agent."""
        if not agent_context:
            return False

        # Only workspace admins or agent creators can delete agents
        return (permission_context.has_minimum_permission(PermissionLevel.ADMIN) or
                agent_context.created_by == permission_context.user_id)

    async def _determine_agent_access_level(
        self,
        permission_context: WorkspacePermissionContext,
        agent: Any,
        user_id: str
    ) -> AgentAccessLevel:
        """Determine user's access level to specific agent."""
        # Workspace owners and admins have full management access
        if permission_context.is_owner or \
           permission_context.has_minimum_permission(PermissionLevel.ADMIN):
            return AgentAccessLevel.MANAGE

        # Agent creators have configuration access
        if agent.createdBy == user_id:
            return AgentAccessLevel.CONFIGURE

        # Users with write permission have interaction access
        if permission_context.has_minimum_permission(PermissionLevel.WRITE):
            return AgentAccessLevel.INTERACT

        # Users with read permission have view access
        if permission_context.has_minimum_permission(PermissionLevel.READ):
            return AgentAccessLevel.VIEW

        return AgentAccessLevel.NONE

    async def _get_agent_access_restrictions(
        self,
        permission_context: WorkspacePermissionContext,
        agent: Any
    ) -> List[str]:
        """Get list of access restrictions for agent."""
        restrictions = []

        # Add organization-level restrictions
        if permission_context.organization_id:
            # Could add organization-specific restrictions here
            pass

        # Add agent-specific restrictions
        if hasattr(agent, 'status') and agent.status == 'archived':
            restrictions.append('agent_archived')

        return restrictions

    async def _has_required_access_for_operation(
        self,
        operation: str,
        agent_context: AgentAccessContext
    ) -> bool:
        """Check if agent context has required access for operation."""
        operation_requirements = {
            'agent_interaction': [
                AgentAccessLevel.VIEW,
                AgentAccessLevel.INTERACT,
                AgentAccessLevel.CONFIGURE,
                AgentAccessLevel.MANAGE
            ],
            'agent_configuration': [
                AgentAccessLevel.CONFIGURE,
                AgentAccessLevel.MANAGE
            ],
            'agent_management': [AgentAccessLevel.MANAGE],
            'agent_deletion': [AgentAccessLevel.MANAGE]
        }

        required_levels = operation_requirements.get(operation, [])
        return agent_context.access_level in required_levels

    async def _log_access_decision(
        self,
        user_id: str,
        operation: str,
        workspace_id: str,
        agent_id: Optional[str],
        is_allowed: bool
    ):
        """Log access control decisions for audit purposes."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'operation': operation,
            'workspace_id': workspace_id,
            'agent_id': agent_id,
            'access_granted': is_allowed
        }

        if is_allowed:
            logger.debug(f"ACCESS_GRANTED: {log_entry}")
        else:
            logger.warning(f"ACCESS_DENIED: {log_entry}")


# Global instance
workspace_access_controller = WorkspaceAccessController()


# Convenience functions for use in route handlers

async def validate_workspace_agent_access(
    session: SimSession,
    operation: str,
    workspace_id: str,
    agent_id: Optional[str] = None
) -> bool:
    """Convenience function to validate workspace agent access."""
    return await workspace_access_controller.validate_operation_access(
        session, operation, workspace_id, agent_id
    )


async def get_user_accessible_agents(
    session: SimSession,
    workspace_id: str,
    operation: str = 'agent_interaction'
) -> List[str]:
    """Convenience function to get user's accessible agents."""
    return await workspace_access_controller.get_accessible_agents(
        session, workspace_id, operation
    )