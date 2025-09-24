"""
Permission Validation System for Workspace Isolation

This module provides a comprehensive permission validation system that integrates
with Sim's existing permission model while enforcing workspace boundaries for
Parlant agents and operations.

Features:
- Integration with Sim's permission system
- Real-time permission validation
- Permission caching for performance
- Workspace-scoped permission checks
- Role-based access control (RBAC)
- Audit logging for permission checks
"""

import logging
from typing import Dict, Any, Optional, List, Set, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from auth.sim_auth_bridge import SimSession, SimUser
from auth.workspace_isolation import WorkspaceContext


logger = logging.getLogger(__name__)


class PermissionType(Enum):
    """Permission types aligned with Sim's permission system."""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class EntityType(Enum):
    """Entity types for permission validation."""
    WORKSPACE = "workspace"
    WORKFLOW = "workflow"
    ORGANIZATION = "organization"
    AGENT = "agent"
    SESSION = "session"
    TOOL = "tool"


@dataclass
class Permission:
    """Represents a permission with expiration and metadata."""
    user_id: str
    entity_type: str
    entity_id: str
    permission_type: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_valid(self) -> bool:
        """Check if permission is still valid."""
        if self.expires_at:
            return datetime.now() < self.expires_at
        return True

    @property
    def is_admin(self) -> bool:
        """Check if this is an admin permission."""
        return self.permission_type == PermissionType.ADMIN.value

    @property
    def is_write(self) -> bool:
        """Check if this allows write access."""
        return self.permission_type in [PermissionType.WRITE.value, PermissionType.ADMIN.value]

    @property
    def is_read(self) -> bool:
        """Check if this allows read access."""
        return self.permission_type in [PermissionType.READ.value, PermissionType.WRITE.value, PermissionType.ADMIN.value]


@dataclass
class PermissionCheck:
    """Represents a permission check request."""
    user_id: str
    entity_type: str
    entity_id: str
    required_permission: str
    context: Dict[str, Any] = field(default_factory=dict)
    check_inheritance: bool = True  # Check parent entity permissions


@dataclass
class PermissionResult:
    """Result of a permission validation check."""
    granted: bool
    permission_type: Optional[str] = None
    source: str = ""  # Where the permission came from
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    audit_info: Dict[str, Any] = field(default_factory=dict)


class PermissionValidator:
    """
    Comprehensive permission validation system for workspace isolation.

    Integrates with Sim's existing permission model while adding workspace-specific
    validation and caching for optimal performance.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self._permission_cache: Dict[str, List[Permission]] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self._cache_ttl = timedelta(minutes=5)

        # Permission hierarchy mapping
        self._permission_hierarchy = {
            PermissionType.READ.value: [PermissionType.READ.value],
            PermissionType.WRITE.value: [PermissionType.READ.value, PermissionType.WRITE.value],
            PermissionType.ADMIN.value: [PermissionType.READ.value, PermissionType.WRITE.value, PermissionType.ADMIN.value]
        }

    async def validate_permission(
        self,
        check: PermissionCheck,
        session: SimSession
    ) -> PermissionResult:
        """
        Validate a permission check against Sim's permission system.

        Args:
            check: Permission check request
            session: Authenticated session

        Returns:
            PermissionResult with validation outcome
        """
        # Get user permissions for the entity
        permissions = await self._get_user_permissions(check.user_id, check.entity_type, check.entity_id)

        # Check direct permissions first
        direct_permission = self._find_matching_permission(permissions, check.required_permission)
        if direct_permission and direct_permission.is_valid:
            return PermissionResult(
                granted=True,
                permission_type=direct_permission.permission_type,
                source="direct",
                expires_at=direct_permission.expires_at,
                metadata=direct_permission.metadata
            )

        # Check inherited permissions if enabled
        if check.check_inheritance:
            inherited_result = await self._check_inherited_permissions(check, session)
            if inherited_result.granted:
                return inherited_result

        # Check workspace owner permissions (special case)
        if check.entity_type == EntityType.WORKSPACE.value:
            owner_result = await self._check_workspace_owner_permissions(check, session)
            if owner_result.granted:
                return owner_result

        return PermissionResult(
            granted=False,
            audit_info={
                'reason': 'no_matching_permissions',
                'user_id': check.user_id,
                'entity_type': check.entity_type,
                'entity_id': check.entity_id,
                'required_permission': check.required_permission
            }
        )

    async def validate_workspace_permission(
        self,
        user_id: str,
        workspace_id: str,
        required_permission: str,
        session: SimSession
    ) -> PermissionResult:
        """
        Validate workspace-specific permission.

        Args:
            user_id: User requesting access
            workspace_id: Workspace ID
            required_permission: Required permission level
            session: Authenticated session

        Returns:
            PermissionResult for workspace access
        """
        check = PermissionCheck(
            user_id=user_id,
            entity_type=EntityType.WORKSPACE.value,
            entity_id=workspace_id,
            required_permission=required_permission
        )

        result = await self.validate_permission(check, session)

        # Additional workspace-specific validation
        if result.granted:
            # Verify workspace is active
            workspace_active = await self._is_workspace_active(workspace_id)
            if not workspace_active:
                return PermissionResult(
                    granted=False,
                    audit_info={
                        'reason': 'workspace_inactive',
                        'workspace_id': workspace_id
                    }
                )

        return result

    async def get_user_workspace_permissions(
        self,
        user_id: str,
        workspace_id: str
    ) -> List[Permission]:
        """
        Get all permissions for a user within a specific workspace.

        Args:
            user_id: User ID
            workspace_id: Workspace ID

        Returns:
            List of user's permissions in the workspace
        """
        return await self._get_user_permissions(user_id, EntityType.WORKSPACE.value, workspace_id)

    async def get_user_accessible_workspaces(
        self,
        user_id: str,
        minimum_permission: str = PermissionType.READ.value
    ) -> List[Dict[str, Any]]:
        """
        Get all workspaces accessible to a user with minimum permission level.

        Args:
            user_id: User ID
            minimum_permission: Minimum required permission level

        Returns:
            List of accessible workspace information
        """
        try:
            # Query user's workspace permissions
            query = text("""
                SELECT DISTINCT w.id, w.name, w.owner_id, w.created_at, w.updated_at,
                       p.permission_type, p.created_at as permission_granted_at
                FROM workspace w
                JOIN permissions p ON w.id = p.entity_id
                WHERE p.user_id = :user_id
                AND p.entity_type = 'workspace'
                AND p.permission_type IN :allowed_permissions
                ORDER BY w.name
            """)

            # Get allowed permissions based on minimum requirement
            allowed_permissions = self._permission_hierarchy.get(minimum_permission, [minimum_permission])

            results = self.db_session.execute(query, {
                'user_id': user_id,
                'allowed_permissions': tuple(allowed_permissions)
            }).fetchall()

            workspaces = []
            for row in results:
                workspace_info = {
                    'id': row.id,
                    'name': row.name,
                    'owner_id': row.owner_id,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None,
                    'permission_type': row.permission_type,
                    'permission_granted_at': row.permission_granted_at.isoformat() if row.permission_granted_at else None,
                    'is_owner': row.owner_id == user_id
                }
                workspaces.append(workspace_info)

            return workspaces

        except Exception as e:
            logger.error(f"Error getting accessible workspaces for user {user_id}: {e}")
            return []

    async def check_agent_permission(
        self,
        user_id: str,
        agent_id: str,
        required_permission: str,
        session: SimSession
    ) -> PermissionResult:
        """
        Check permission for agent access with workspace validation.

        Args:
            user_id: User requesting access
            agent_id: Agent ID
            required_permission: Required permission level
            session: Authenticated session

        Returns:
            PermissionResult for agent access
        """
        try:
            # Get agent's workspace
            agent_workspace = await self._get_agent_workspace(agent_id)
            if not agent_workspace:
                return PermissionResult(
                    granted=False,
                    audit_info={'reason': 'agent_not_found', 'agent_id': agent_id}
                )

            # Check workspace permission (agents inherit workspace permissions)
            workspace_result = await self.validate_workspace_permission(
                user_id, agent_workspace, required_permission, session
            )

            if workspace_result.granted:
                workspace_result.audit_info.update({
                    'agent_id': agent_id,
                    'agent_workspace': agent_workspace,
                    'permission_source': 'workspace_inheritance'
                })

            return workspace_result

        except Exception as e:
            logger.error(f"Error checking agent permission: {e}")
            return PermissionResult(
                granted=False,
                audit_info={'reason': 'validation_error', 'error': str(e)}
            )

    async def validate_bulk_permissions(
        self,
        checks: List[PermissionCheck],
        session: SimSession
    ) -> List[PermissionResult]:
        """
        Validate multiple permission checks efficiently.

        Args:
            checks: List of permission checks
            session: Authenticated session

        Returns:
            List of permission results in same order as checks
        """
        results = []

        # Group checks by user to optimize cache usage
        user_checks = {}
        for i, check in enumerate(checks):
            if check.user_id not in user_checks:
                user_checks[check.user_id] = []
            user_checks[check.user_id].append((i, check))

        # Process checks by user
        indexed_results = {}
        for user_id, user_check_list in user_checks.items():
            # Pre-load permissions for this user
            await self._preload_user_permissions(user_id)

            # Validate each check
            for index, check in user_check_list:
                result = await self.validate_permission(check, session)
                indexed_results[index] = result

        # Return results in original order
        for i in range(len(checks)):
            results.append(indexed_results[i])

        return results

    async def invalidate_user_permissions_cache(self, user_id: str):
        """Invalidate cached permissions for a user."""
        keys_to_remove = [key for key in self._permission_cache.keys() if key.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del self._permission_cache[key]
            if key in self._cache_timestamps:
                del self._cache_timestamps[key]

        logger.info(f"Invalidated permission cache for user {user_id}")

    # Private helper methods

    async def _get_user_permissions(
        self,
        user_id: str,
        entity_type: str,
        entity_id: str
    ) -> List[Permission]:
        """Get user permissions for a specific entity."""
        cache_key = f"{user_id}:{entity_type}:{entity_id}"

        # Check cache first
        if cache_key in self._permission_cache:
            cache_time = self._cache_timestamps.get(cache_key)
            if cache_time and datetime.now() - cache_time < self._cache_ttl:
                return self._permission_cache[cache_key]

        # Query database
        query = text("""
            SELECT user_id, entity_type, entity_id, permission_type, created_at, updated_at
            FROM permissions
            WHERE user_id = :user_id
            AND entity_type = :entity_type
            AND entity_id = :entity_id
        """)

        results = self.db_session.execute(query, {
            'user_id': user_id,
            'entity_type': entity_type,
            'entity_id': entity_id
        }).fetchall()

        permissions = []
        for row in results:
            permission = Permission(
                user_id=row.user_id,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                permission_type=row.permission_type,
                granted_at=row.created_at
            )
            permissions.append(permission)

        # Cache the results
        self._permission_cache[cache_key] = permissions
        self._cache_timestamps[cache_key] = datetime.now()

        return permissions

    def _find_matching_permission(
        self,
        permissions: List[Permission],
        required_permission: str
    ) -> Optional[Permission]:
        """Find a permission that satisfies the requirement."""
        allowed_permissions = self._permission_hierarchy.get(required_permission, [required_permission])

        for permission in permissions:
            if permission.permission_type in allowed_permissions and permission.is_valid:
                return permission

        return None

    async def _check_inherited_permissions(
        self,
        check: PermissionCheck,
        session: SimSession
    ) -> PermissionResult:
        """Check for inherited permissions from parent entities."""
        # For agents, check workspace permissions
        if check.entity_type == EntityType.AGENT.value:
            agent_workspace = await self._get_agent_workspace(check.entity_id)
            if agent_workspace:
                workspace_check = PermissionCheck(
                    user_id=check.user_id,
                    entity_type=EntityType.WORKSPACE.value,
                    entity_id=agent_workspace,
                    required_permission=check.required_permission,
                    check_inheritance=False  # Prevent infinite recursion
                )
                workspace_result = await self.validate_permission(workspace_check, session)
                if workspace_result.granted:
                    workspace_result.source = "workspace_inheritance"
                    workspace_result.audit_info['inherited_from'] = agent_workspace
                    return workspace_result

        # For sessions, check agent permissions
        if check.entity_type == EntityType.SESSION.value:
            session_agent = await self._get_session_agent(check.entity_id)
            if session_agent:
                agent_check = PermissionCheck(
                    user_id=check.user_id,
                    entity_type=EntityType.AGENT.value,
                    entity_id=session_agent,
                    required_permission=check.required_permission,
                    check_inheritance=True
                )
                agent_result = await self.validate_permission(agent_check, session)
                if agent_result.granted:
                    agent_result.source = "agent_inheritance"
                    agent_result.audit_info['inherited_from'] = session_agent
                    return agent_result

        return PermissionResult(granted=False)

    async def _check_workspace_owner_permissions(
        self,
        check: PermissionCheck,
        session: SimSession
    ) -> PermissionResult:
        """Check if user is workspace owner (implicit admin permissions)."""
        if check.entity_type != EntityType.WORKSPACE.value:
            return PermissionResult(granted=False)

        query = text("SELECT owner_id FROM workspace WHERE id = :workspace_id")
        result = self.db_session.execute(query, {'workspace_id': check.entity_id}).fetchone()

        if result and result.owner_id == check.user_id:
            return PermissionResult(
                granted=True,
                permission_type=PermissionType.ADMIN.value,
                source="workspace_owner",
                audit_info={'ownership_type': 'workspace_owner'}
            )

        return PermissionResult(granted=False)

    async def _preload_user_permissions(self, user_id: str):
        """Pre-load all permissions for a user to optimize batch operations."""
        query = text("""
            SELECT user_id, entity_type, entity_id, permission_type, created_at, updated_at
            FROM permissions
            WHERE user_id = :user_id
        """)

        results = self.db_session.execute(query, {'user_id': user_id}).fetchall()

        # Group by entity
        entity_permissions = {}
        for row in results:
            entity_key = f"{row.entity_type}:{row.entity_id}"
            if entity_key not in entity_permissions:
                entity_permissions[entity_key] = []

            permission = Permission(
                user_id=row.user_id,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                permission_type=row.permission_type,
                granted_at=row.created_at
            )
            entity_permissions[entity_key].append(permission)

        # Cache all permissions
        current_time = datetime.now()
        for entity_key, permissions in entity_permissions.items():
            cache_key = f"{user_id}:{entity_key}"
            self._permission_cache[cache_key] = permissions
            self._cache_timestamps[cache_key] = current_time

    async def _is_workspace_active(self, workspace_id: str) -> bool:
        """Check if workspace is active."""
        # For now, assume all workspaces are active
        # In production, there might be workspace status checks
        return True

    async def _get_agent_workspace(self, agent_id: str) -> Optional[str]:
        """Get workspace ID for an agent."""
        query = text("SELECT workspace_id FROM parlant_agent WHERE id = :agent_id AND deleted_at IS NULL")
        result = self.db_session.execute(query, {'agent_id': agent_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_session_agent(self, session_id: str) -> Optional[str]:
        """Get agent ID for a session."""
        query = text("SELECT agent_id FROM parlant_session WHERE id = :session_id")
        result = self.db_session.execute(query, {'session_id': session_id}).fetchone()
        return result.agent_id if result else None