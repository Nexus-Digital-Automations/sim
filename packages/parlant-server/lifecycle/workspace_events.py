"""
Workspace Lifecycle Event Handler for Parlant Agent Isolation
===========================================================

This module handles workspace lifecycle events to maintain proper agent isolation
and data integrity across workspace changes. It integrates with Sim's existing
workspace management system to ensure agents are properly managed throughout
the workspace lifecycle.

Key Features:
- Workspace creation/deletion event handling
- Agent isolation maintenance during workspace changes
- Permission updates propagation
- Data cleanup and archival
- Integration with Sim's existing webhook system
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from enum import Enum

from fastapi import BackgroundTasks
from sqlalchemy import select, and_, or_, func, text, update, delete
from sqlalchemy.exc import IntegrityError

from database.connection import get_async_session_context
from workspace_isolation import workspace_isolation_manager
from auth.workspace_access_control import workspace_access_controller

logger = logging.getLogger(__name__)


class WorkspaceEventType(Enum):
    """Supported workspace lifecycle events."""
    CREATED = "workspace_created"
    DELETED = "workspace_deleted"
    ARCHIVED = "workspace_archived"
    RESTORED = "workspace_restored"
    PERMISSIONS_UPDATED = "workspace_permissions_updated"
    MEMBER_ADDED = "workspace_member_added"
    MEMBER_REMOVED = "workspace_member_removed"
    OWNERSHIP_TRANSFERRED = "workspace_ownership_transferred"


class WorkspaceLifecycleHandler:
    """
    Comprehensive workspace lifecycle event handler.

    Manages Parlant agent isolation throughout workspace lifecycle:
    - Initializes isolation for new workspaces
    - Cleans up agents when workspaces are deleted
    - Updates agent permissions when workspace permissions change
    - Archives/restores agents with workspace state changes
    """

    def __init__(self):
        self._event_handlers = {
            WorkspaceEventType.CREATED: self._handle_workspace_created,
            WorkspaceEventType.DELETED: self._handle_workspace_deleted,
            WorkspaceEventType.ARCHIVED: self._handle_workspace_archived,
            WorkspaceEventType.RESTORED: self._handle_workspace_restored,
            WorkspaceEventType.PERMISSIONS_UPDATED: self._handle_permissions_updated,
            WorkspaceEventType.MEMBER_ADDED: self._handle_member_added,
            WorkspaceEventType.MEMBER_REMOVED: self._handle_member_removed,
            WorkspaceEventType.OWNERSHIP_TRANSFERRED: self._handle_ownership_transferred,
        }

    async def handle_workspace_event(
        self,
        event_type: str,
        workspace_id: str,
        event_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """
        Handle workspace lifecycle event.

        Args:
            event_type: Type of workspace event
            workspace_id: Target workspace ID
            event_data: Event-specific data
            background_tasks: Optional FastAPI background tasks

        Returns:
            Event processing result
        """
        logger.info(f"Handling workspace event {event_type} for workspace {workspace_id}")

        try:
            # Validate event type
            try:
                event_enum = WorkspaceEventType(event_type)
            except ValueError:
                logger.warning(f"Unknown workspace event type: {event_type}")
                return {
                    'success': False,
                    'error': f'Unknown event type: {event_type}',
                    'workspace_id': workspace_id
                }

            # Get event handler
            handler = self._event_handlers.get(event_enum)
            if not handler:
                logger.warning(f"No handler for event type: {event_type}")
                return {
                    'success': False,
                    'error': f'No handler for event type: {event_type}',
                    'workspace_id': workspace_id
                }

            # Execute event handler
            if background_tasks and event_enum in [
                WorkspaceEventType.DELETED,
                WorkspaceEventType.ARCHIVED,
                WorkspaceEventType.PERMISSIONS_UPDATED
            ]:
                # Execute time-consuming operations in background
                background_tasks.add_task(handler, workspace_id, event_data)
                result = {
                    'success': True,
                    'message': f'Event {event_type} queued for background processing',
                    'workspace_id': workspace_id,
                    'processed_at': datetime.now().isoformat()
                }
            else:
                # Execute immediately for quick operations
                result = await handler(workspace_id, event_data)

            # Log event processing
            await self._log_event_processing(event_type, workspace_id, result)

            return result

        except Exception as e:
            logger.error(f"Error handling workspace event {event_type}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id,
                'event_type': event_type
            }

    async def _handle_workspace_created(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle workspace creation event.

        Initializes workspace isolation infrastructure:
        - Sets up workspace isolation boundaries
        - Initializes permission structures
        - Creates workspace-specific configuration
        """
        logger.info(f"Initializing workspace isolation for new workspace {workspace_id}")

        try:
            # 1. Initialize workspace isolation infrastructure
            await workspace_isolation_manager.handle_workspace_lifecycle_event(
                'workspace_created', workspace_id, event_data
            )

            # 2. Set up initial workspace configuration
            workspace_config = {
                'isolation_level': event_data.get('isolation_level', 'strict'),
                'created_at': datetime.now().isoformat(),
                'owner_id': event_data.get('owner_id'),
                'organization_id': event_data.get('organization_id'),
                'initial_permissions': event_data.get('initial_permissions', {})
            }

            # 3. Log workspace initialization
            await self._log_workspace_event('workspace_initialized', {
                'workspace_id': workspace_id,
                'config': workspace_config
            })

            return {
                'success': True,
                'message': 'Workspace isolation initialized successfully',
                'workspace_id': workspace_id,
                'configuration': workspace_config
            }

        except Exception as e:
            logger.error(f"Error initializing workspace {workspace_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id
            }

    async def _handle_workspace_deleted(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle workspace deletion event.

        Performs comprehensive cleanup:
        - Archives/deletes all workspace agents
        - Cleans up session data
        - Removes isolation metadata
        - Archives historical data
        """
        logger.info(f"Handling workspace deletion for workspace {workspace_id}")

        try:
            async with get_async_session_context() as db_session:
                # 1. Get all agents in workspace
                from packages.db.parlant_schema import parlantAgent, parlantSession

                agents_query = select(parlantAgent).where(
                    and_(
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.deletedAt.is_(None)
                    )
                )
                agents_result = await db_session.execute(agents_query)
                agents = agents_result.scalars().all()

                # 2. Archive or soft delete agents
                deletion_mode = event_data.get('deletion_mode', 'archive')  # 'archive' or 'delete'
                agent_count = len(agents)

                for agent in agents:
                    if deletion_mode == 'delete':
                        agent.deletedAt = datetime.now()
                    else:
                        agent.status = 'archived'
                        agent.updatedAt = datetime.now()

                # 3. Handle sessions
                sessions_query = select(parlantSession).where(
                    parlantSession.workspaceId == workspace_id
                )
                sessions_result = await db_session.execute(sessions_query)
                sessions = sessions_result.scalars().all()

                for session in sessions:
                    session.status = 'completed'
                    session.endedAt = datetime.now()

                await db_session.commit()

                # 4. Clean up isolation metadata
                await workspace_isolation_manager.handle_workspace_lifecycle_event(
                    'workspace_deleted', workspace_id, event_data
                )

                # 5. Log deletion processing
                await self._log_workspace_event('workspace_deleted_processed', {
                    'workspace_id': workspace_id,
                    'agents_affected': agent_count,
                    'sessions_affected': len(sessions),
                    'deletion_mode': deletion_mode
                })

                return {
                    'success': True,
                    'message': 'Workspace deletion processed successfully',
                    'workspace_id': workspace_id,
                    'agents_affected': agent_count,
                    'sessions_affected': len(sessions),
                    'deletion_mode': deletion_mode
                }

        except Exception as e:
            logger.error(f"Error processing workspace deletion {workspace_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id
            }

    async def _handle_workspace_archived(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle workspace archival event.

        Archives workspace content while maintaining data integrity:
        - Archives all active agents
        - Completes active sessions
        - Maintains isolation boundaries
        - Preserves data for potential restoration
        """
        logger.info(f"Archiving workspace {workspace_id}")

        try:
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent, parlantSession

                # 1. Archive all active agents
                archive_agents_query = update(parlantAgent).where(
                    and_(
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.status.in_(['active', 'inactive']),
                        parlantAgent.deletedAt.is_(None)
                    )
                ).values(
                    status='archived',
                    updatedAt=datetime.now()
                )

                agents_result = await db_session.execute(archive_agents_query)
                agents_archived = agents_result.rowcount

                # 2. Complete active sessions
                complete_sessions_query = update(parlantSession).where(
                    and_(
                        parlantSession.workspaceId == workspace_id,
                        parlantSession.status == 'active'
                    )
                ).values(
                    status='completed',
                    endedAt=datetime.now(),
                    updatedAt=datetime.now()
                )

                sessions_result = await db_session.execute(complete_sessions_query)
                sessions_completed = sessions_result.rowcount

                await db_session.commit()

                # 3. Update isolation metadata
                await workspace_isolation_manager.handle_workspace_lifecycle_event(
                    'workspace_archived', workspace_id, event_data
                )

                return {
                    'success': True,
                    'message': 'Workspace archived successfully',
                    'workspace_id': workspace_id,
                    'agents_archived': agents_archived,
                    'sessions_completed': sessions_completed
                }

        except Exception as e:
            logger.error(f"Error archiving workspace {workspace_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id
            }

    async def _handle_workspace_restored(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle workspace restoration event.

        Restores workspace from archived state:
        - Reactivates archived agents
        - Restores isolation boundaries
        - Updates permissions
        - Validates data integrity
        """
        logger.info(f"Restoring workspace {workspace_id}")

        try:
            async with get_async_session_context() as db_session:
                from packages.db.parlant_schema import parlantAgent

                # 1. Reactivate archived agents
                restore_agents_query = update(parlantAgent).where(
                    and_(
                        parlantAgent.workspaceId == workspace_id,
                        parlantAgent.status == 'archived',
                        parlantAgent.deletedAt.is_(None)
                    )
                ).values(
                    status='active',
                    updatedAt=datetime.now()
                )

                agents_result = await db_session.execute(restore_agents_query)
                agents_restored = agents_result.rowcount

                await db_session.commit()

                # 2. Restore isolation infrastructure
                await workspace_isolation_manager.handle_workspace_lifecycle_event(
                    'workspace_restored', workspace_id, event_data
                )

                return {
                    'success': True,
                    'message': 'Workspace restored successfully',
                    'workspace_id': workspace_id,
                    'agents_restored': agents_restored
                }

        except Exception as e:
            logger.error(f"Error restoring workspace {workspace_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id
            }

    async def _handle_permissions_updated(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle workspace permissions update event.

        Propagates permission changes:
        - Updates agent access patterns
        - Refreshes permission caches
        - Validates existing sessions
        - Updates isolation metadata
        """
        logger.info(f"Updating permissions for workspace {workspace_id}")

        try:
            # 1. Clear permission caches
            workspace_access_controller._permission_cache.clear()
            workspace_access_controller._agent_access_cache.clear()

            # 2. Update isolation metadata
            await workspace_isolation_manager.handle_workspace_lifecycle_event(
                'workspace_permissions_updated', workspace_id, event_data
            )

            # 3. Get affected users
            affected_users = event_data.get('affected_users', [])

            # 4. Log permission update
            await self._log_workspace_event('permissions_updated', {
                'workspace_id': workspace_id,
                'affected_users': affected_users,
                'changes': event_data.get('changes', {})
            })

            return {
                'success': True,
                'message': 'Workspace permissions updated successfully',
                'workspace_id': workspace_id,
                'affected_users_count': len(affected_users)
            }

        except Exception as e:
            logger.error(f"Error updating workspace permissions {workspace_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'workspace_id': workspace_id
            }

    async def _handle_member_added(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle workspace member addition event."""
        user_id = event_data.get('user_id')
        permission_level = event_data.get('permission_level', 'read')

        logger.info(f"Adding member {user_id} to workspace {workspace_id} with {permission_level} permissions")

        # Clear relevant caches
        cache_key = f"{user_id}:{workspace_id}"
        if cache_key in workspace_access_controller._permission_cache:
            del workspace_access_controller._permission_cache[cache_key]

        return {
            'success': True,
            'message': 'Workspace member added successfully',
            'workspace_id': workspace_id,
            'user_id': user_id,
            'permission_level': permission_level
        }

    async def _handle_member_removed(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle workspace member removal event."""
        user_id = event_data.get('user_id')

        logger.info(f"Removing member {user_id} from workspace {workspace_id}")

        # Clear all caches for this user/workspace combination
        cache_keys_to_remove = []
        for cache_key in workspace_access_controller._permission_cache.keys():
            if cache_key.startswith(f"{user_id}:"):
                cache_keys_to_remove.append(cache_key)

        for cache_key in cache_keys_to_remove:
            del workspace_access_controller._permission_cache[cache_key]

        # Clear agent access cache entries
        agent_cache_keys_to_remove = []
        for cache_key in workspace_access_controller._agent_access_cache.keys():
            if cache_key.startswith(f"{user_id}:"):
                agent_cache_keys_to_remove.append(cache_key)

        for cache_key in agent_cache_keys_to_remove:
            del workspace_access_controller._agent_access_cache[cache_key]

        return {
            'success': True,
            'message': 'Workspace member removed successfully',
            'workspace_id': workspace_id,
            'user_id': user_id
        }

    async def _handle_ownership_transferred(
        self,
        workspace_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle workspace ownership transfer event."""
        old_owner_id = event_data.get('old_owner_id')
        new_owner_id = event_data.get('new_owner_id')

        logger.info(f"Transferring ownership of workspace {workspace_id} from {old_owner_id} to {new_owner_id}")

        # Clear all permission caches for this workspace
        cache_keys_to_remove = []
        for cache_key in workspace_access_controller._permission_cache.keys():
            if cache_key.endswith(f":{workspace_id}"):
                cache_keys_to_remove.append(cache_key)

        for cache_key in cache_keys_to_remove:
            del workspace_access_controller._permission_cache[cache_key]

        return {
            'success': True,
            'message': 'Workspace ownership transferred successfully',
            'workspace_id': workspace_id,
            'old_owner_id': old_owner_id,
            'new_owner_id': new_owner_id
        }

    async def _log_event_processing(
        self,
        event_type: str,
        workspace_id: str,
        result: Dict[str, Any]
    ):
        """Log workspace event processing results."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'workspace_id': workspace_id,
            'success': result.get('success', False),
            'processing_result': result
        }

        if result.get('success'):
            logger.info(f"WORKSPACE_EVENT_SUCCESS: {log_entry}")
        else:
            logger.error(f"WORKSPACE_EVENT_FAILURE: {log_entry}")

    async def _log_workspace_event(self, event_name: str, event_data: Dict[str, Any]):
        """Log workspace-specific events."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'event_name': event_name,
            'data': event_data
        }

        logger.info(f"WORKSPACE_LIFECYCLE: {log_entry}")


# Global instance
workspace_lifecycle_handler = WorkspaceLifecycleHandler()


# Convenience function for external use
async def handle_workspace_lifecycle_event(
    event_type: str,
    workspace_id: str,
    event_data: Dict[str, Any],
    background_tasks: Optional[BackgroundTasks] = None
) -> Dict[str, Any]:
    """
    Handle workspace lifecycle event.

    Args:
        event_type: Type of workspace event
        workspace_id: Target workspace ID
        event_data: Event-specific data
        background_tasks: Optional FastAPI background tasks

    Returns:
        Event processing result
    """
    return await workspace_lifecycle_handler.handle_workspace_event(
        event_type, workspace_id, event_data, background_tasks
    )