"""
Parlant Agent Management
========================

This module provides agent management functionality for the Parlant server,
integrating with Sim's database infrastructure and workspace isolation.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import uuid4, UUID

from sqlalchemy import select, and_, or_, func, update, delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from database.connection import get_async_session_context
from auth.sim_auth_bridge import SimSession

logger = logging.getLogger(__name__)


class ParlantAgent:
    """
    Parlant agent management with workspace isolation and Sim integration.

    Provides comprehensive agent lifecycle management including creation,
    configuration, workspace isolation, and integration with Sim's
    permission and authentication systems.
    """

    def __init__(self, agent_data: Optional[Dict[str, Any]] = None):
        """
        Initialize ParlantAgent instance.

        Args:
            agent_data: Optional existing agent data
        """
        if agent_data:
            self.id = agent_data.get('id')
            self.workspace_id = agent_data.get('workspace_id')
            self.name = agent_data.get('name')
            self.description = agent_data.get('description')
            self.configuration = agent_data.get('configuration', {})
            self.metadata = agent_data.get('metadata', {})
            self.status = agent_data.get('status', 'active')
            self.created_at = agent_data.get('created_at')
            self.updated_at = agent_data.get('updated_at')
        else:
            self.id = None
            self.workspace_id = None
            self.name = None
            self.description = None
            self.configuration = {}
            self.metadata = {}
            self.status = 'active'
            self.created_at = None
            self.updated_at = None

        logger.debug(f"Initialized ParlantAgent: {self.id}")

    @classmethod
    async def create(
        cls,
        workspace_id: str,
        name: str,
        sim_session: SimSession,
        description: Optional[str] = None,
        configuration: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> 'ParlantAgent':
        """
        Create a new Parlant agent with workspace isolation.

        Args:
            workspace_id: Target workspace ID
            name: Agent name
            sim_session: Authenticated Sim session
            description: Optional agent description
            configuration: Optional agent configuration
            metadata: Optional agent metadata

        Returns:
            Created ParlantAgent instance

        Raises:
            PermissionError: If user lacks agent creation permissions
            ValueError: If workspace or data validation fails
        """
        logger.info(f"Creating agent '{name}' in workspace {workspace_id}")

        try:
            # 1. Validate workspace access
            await cls._validate_workspace_access(workspace_id, sim_session, 'agent_create')

            # 2. Create agent data
            agent_id = str(uuid4())
            agent_data = {
                'id': agent_id,
                'workspaceId': workspace_id,
                'name': name,
                'description': description,
                'configuration': configuration or {},
                'metadata': {
                    **(metadata or {}),
                    'created_by': sim_session.user.id,
                    'created_via': 'parlant_server',
                    'workspace_isolation': True
                },
                'status': 'active',
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }

            # 3. Insert into database
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                new_agent = parlantAgent(**agent_data)
                db_session.add(new_agent)
                await db_session.commit()

                # 4. Create agent instance
                agent_instance = cls(cls._db_to_dict(new_agent))

                logger.info(f"Created agent {agent_id} in workspace {workspace_id}")
                return agent_instance

        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise

    @classmethod
    async def get_by_id(
        cls,
        agent_id: str,
        workspace_id: str,
        sim_session: Optional[SimSession] = None
    ) -> Optional['ParlantAgent']:
        """
        Retrieve agent by ID with workspace isolation.

        Args:
            agent_id: Target agent ID
            workspace_id: Workspace ID for isolation
            sim_session: Optional Sim session for access validation

        Returns:
            ParlantAgent instance or None if not found
        """
        try:
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                # Query with workspace isolation
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
                    return None

                # Validate access if session provided
                if sim_session:
                    has_access = await cls._validate_agent_access(agent, sim_session, 'agent_read')
                    if not has_access:
                        return None

                return cls(cls._db_to_dict(agent))

        except Exception as e:
            logger.error(f"Error retrieving agent {agent_id}: {e}")
            return None

    @classmethod
    async def list_workspace_agents(
        cls,
        workspace_id: str,
        sim_session: SimSession,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List['ParlantAgent']:
        """
        List agents in workspace with access control.

        Args:
            workspace_id: Target workspace ID
            sim_session: Authenticated Sim session
            filters: Optional filters to apply
            limit: Maximum agents to return
            offset: Number of agents to skip

        Returns:
            List of ParlantAgent instances
        """
        try:
            # Validate workspace access
            await cls._validate_workspace_access(workspace_id, sim_session, 'agent_list')

            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                # Build query with workspace isolation
                query = select(parlantAgent).where(
                    and_(
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.deletedAt.is_(None)
                    )
                )

                # Apply filters
                if filters:
                    query = cls._apply_agent_filters(query, filters)

                # Apply pagination
                query = query.limit(limit).offset(offset)
                query = query.order_by(parlantAgent.createdAt.desc())

                # Execute query
                agents_result = await db_session.execute(query)
                agents = agents_result.scalars().all()

                # Convert to agent instances
                agent_list = []
                for agent in agents:
                    agent_instance = cls(cls._db_to_dict(agent))
                    agent_list.append(agent_instance)

                logger.debug(f"Retrieved {len(agent_list)} agents from workspace {workspace_id}")
                return agent_list

        except Exception as e:
            logger.error(f"Error listing workspace agents: {e}")
            return []

    async def update(
        self,
        updates: Dict[str, Any],
        sim_session: SimSession
    ) -> bool:
        """
        Update agent with access validation.

        Args:
            updates: Data updates to apply
            sim_session: Authenticated Sim session

        Returns:
            True if update successful, False otherwise
        """
        try:
            # Validate update permissions
            has_access = await self._validate_update_permissions(sim_session)
            if not has_access:
                return False

            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                # Get current agent
                agent_query = select(parlantAgent).where(
                    and_(
                        parlantAgent.id == self.id,
                        parlantAgent.workspaceId == self.workspace_id
                    )
                )

                agent_result = await db_session.execute(agent_query)
                agent = agent_result.scalar_one_or_none()

                if not agent:
                    return False

                # Apply updates
                validated_updates = self._validate_updates(updates)
                for field, value in validated_updates.items():
                    if hasattr(agent, field) and field not in ['id', 'workspaceId', 'createdAt']:
                        setattr(agent, field, value)

                agent.updatedAt = datetime.now()
                await db_session.commit()

                # Update instance attributes
                for field, value in validated_updates.items():
                    if hasattr(self, field.lower()):
                        setattr(self, field.lower(), value)

                self.updated_at = datetime.now()

                logger.info(f"Updated agent {self.id}")
                return True

        except Exception as e:
            logger.error(f"Error updating agent {self.id}: {e}")
            return False

    async def delete(
        self,
        sim_session: SimSession,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete agent with access validation.

        Args:
            sim_session: Authenticated Sim session
            soft_delete: Whether to perform soft delete

        Returns:
            True if deletion successful, False otherwise
        """
        try:
            # Validate deletion permissions
            has_access = await self._validate_deletion_permissions(sim_session)
            if not has_access:
                return False

            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                agent_query = select(parlantAgent).where(
                    and_(
                        parlantAgent.id == self.id,
                        parlantAgent.workspaceId == self.workspace_id
                    )
                )

                agent_result = await db_session.execute(agent_query)
                agent = agent_result.scalar_one_or_none()

                if not agent:
                    return False

                if soft_delete:
                    agent.deletedAt = datetime.now()
                    agent.status = 'deleted'
                else:
                    await db_session.delete(agent)

                await db_session.commit()

                logger.info(f"Deleted agent {self.id}")
                return True

        except Exception as e:
            logger.error(f"Error deleting agent {self.id}: {e}")
            return False

    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary format."""
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'name': self.name,
            'description': self.description,
            'configuration': self.configuration,
            'metadata': self.metadata,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    # Private helper methods

    @staticmethod
    async def _validate_workspace_access(
        workspace_id: str,
        sim_session: SimSession,
        action: str
    ) -> bool:
        """Validate user access to workspace for specific action."""
        try:
            # Import here to avoid circular imports
            from auth.workspace_access_control import validate_workspace_access

            return await validate_workspace_access(sim_session, action, workspace_id)

        except Exception as e:
            logger.error(f"Workspace access validation failed: {e}")
            return False

    @staticmethod
    async def _validate_agent_access(
        agent: Any,
        sim_session: SimSession,
        action: str
    ) -> bool:
        """Validate user access to specific agent."""
        try:
            # Import here to avoid circular imports
            from auth.workspace_access_control import validate_workspace_agent_access

            return await validate_workspace_agent_access(
                sim_session, action, agent.workspaceId, agent.id
            )

        except Exception as e:
            logger.error(f"Agent access validation failed: {e}")
            return False

    @staticmethod
    def _db_to_dict(agent: Any) -> Dict[str, Any]:
        """Convert database agent object to dictionary."""
        return {
            'id': str(agent.id),
            'workspace_id': agent.workspaceId,
            'name': agent.name,
            'description': agent.description,
            'configuration': agent.configuration or {},
            'metadata': agent.metadata or {},
            'status': agent.status,
            'created_at': agent.createdAt,
            'updated_at': agent.updatedAt
        }

    @staticmethod
    def _apply_agent_filters(query, filters: Dict[str, Any]):
        """Apply filters to agent query."""
        from packages.db.parlant_schema import parlantAgent

        if 'status' in filters:
            query = query.where(parlantAgent.status == filters['status'])

        if 'name_contains' in filters:
            query = query.where(parlantAgent.name.contains(filters['name_contains']))

        return query

    def _validate_updates(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize update data."""
        allowed_fields = ['name', 'description', 'configuration', 'metadata', 'status']

        validated = {}
        for field, value in updates.items():
            if field in allowed_fields:
                validated[field] = value

        return validated

    async def _validate_update_permissions(self, sim_session: SimSession) -> bool:
        """Validate user permissions for agent updates."""
        return await self._validate_workspace_access(
            self.workspace_id, sim_session, 'agent_update'
        )

    async def _validate_deletion_permissions(self, sim_session: SimSession) -> bool:
        """Validate user permissions for agent deletion."""
        return await self._validate_workspace_access(
            self.workspace_id, sim_session, 'agent_delete'
        )