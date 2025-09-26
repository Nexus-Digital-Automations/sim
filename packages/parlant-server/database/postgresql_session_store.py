"""
PostgreSQL Session Store for Parlant Server
==========================================

This module provides a PostgreSQL-based session store implementation
that integrates with Sim's existing database infrastructure.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import parlant.sdk as p

from database.connection import get_async_session_context, get_session_factory
from database.workspace_session_store import WorkspaceSessionStore, create_workspace_session_store

logger = logging.getLogger(__name__)


class PostgreSQLSessionStore(p.SessionStore):
    """
    PostgreSQL-based session store implementation for Parlant SDK.

    Provides session persistence using PostgreSQL database with workspace isolation.
    Integrates with Sim's existing database infrastructure and session management.
    """

    def __init__(self, default_workspace_id: str = "default"):
        """
        Initialize PostgreSQL session store.

        Args:
            default_workspace_id: Default workspace ID for session isolation
        """
        self.default_workspace_id = default_workspace_id
        self._workspace_stores: Dict[str, WorkspaceSessionStore] = {}

        logger.info(f"Initialized PostgreSQL session store with default workspace: {default_workspace_id}")

    def _get_workspace_store(self, workspace_id: str) -> WorkspaceSessionStore:
        """Get or create workspace-specific session store."""
        if workspace_id not in self._workspace_stores:
            self._workspace_stores[workspace_id] = create_workspace_session_store(workspace_id)
        return self._workspace_stores[workspace_id]

    async def create_session(
        self,
        agent_id: str,
        customer_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Create a new agent session.

        Args:
            agent_id: Target agent ID
            customer_id: Optional customer ID
            workspace_id: Workspace ID (uses default if not provided)
            **kwargs: Additional session configuration

        Returns:
            Session ID for the created session
        """
        workspace_id = workspace_id or self.default_workspace_id
        workspace_store = self._get_workspace_store(workspace_id)

        # Create a mock SimSession for workspace compatibility
        # In production, this would come from the actual authentication system
        mock_sim_session = self._create_mock_sim_session(customer_id, kwargs)

        session_config = {
            'customer_id': customer_id,
            'mode': kwargs.get('mode', 'auto'),
            'title': kwargs.get('title'),
            'metadata': kwargs.get('metadata', {}),
            'variables': kwargs.get('variables', {})
        }

        try:
            session_id = await workspace_store.create_session(
                agent_id=agent_id,
                sim_session=mock_sim_session,
                session_config=session_config
            )

            logger.info(f"Created session {session_id} for agent {agent_id} in workspace {workspace_id}")
            return session_id

        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise

    async def get_session(self, session_id: str, workspace_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data.

        Args:
            session_id: Target session ID
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            Session data dict or None if not found
        """
        workspace_id = workspace_id or self.default_workspace_id
        workspace_store = self._get_workspace_store(workspace_id)

        # Create mock SimSession for access validation
        mock_sim_session = self._create_mock_sim_session()

        try:
            session_data = await workspace_store.get_session(
                session_id=session_id,
                sim_session=mock_sim_session,
                validate_access=False  # Skip access validation for SDK compatibility
            )

            return session_data

        except Exception as e:
            logger.error(f"Failed to retrieve session {session_id}: {e}")
            return None

    async def update_session(
        self,
        session_id: str,
        updates: Dict[str, Any],
        workspace_id: Optional[str] = None
    ) -> bool:
        """
        Update session data.

        Args:
            session_id: Target session ID
            updates: Data updates to apply
            workspace_id: Workspace ID (uses default if not provided)

        Returns:
            True if update successful, False otherwise
        """
        workspace_id = workspace_id or self.default_workspace_id
        workspace_store = self._get_workspace_store(workspace_id)

        # Create mock SimSession for access validation
        mock_sim_session = self._create_mock_sim_session()

        try:
            success = await workspace_store.update_session(
                session_id=session_id,
                updates=updates,
                sim_session=mock_sim_session
            )

            if success:
                logger.debug(f"Updated session {session_id}")
            else:
                logger.warning(f"Failed to update session {session_id}")

            return success

        except Exception as e:
            logger.error(f"Error updating session {session_id}: {e}")
            return False

    async def delete_session(
        self,
        session_id: str,
        workspace_id: Optional[str] = None,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete session.

        Args:
            session_id: Target session ID
            workspace_id: Workspace ID (uses default if not provided)
            soft_delete: Whether to perform soft delete

        Returns:
            True if deletion successful, False otherwise
        """
        workspace_id = workspace_id or self.default_workspace_id
        workspace_store = self._get_workspace_store(workspace_id)

        # Create mock SimSession for access validation
        mock_sim_session = self._create_mock_sim_session()

        try:
            success = await workspace_store.delete_session(
                session_id=session_id,
                sim_session=mock_sim_session,
                soft_delete=soft_delete
            )

            if success:
                logger.info(f"Deleted session {session_id}")
            else:
                logger.warning(f"Failed to delete session {session_id}")

            return success

        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            return False

    async def list_sessions(
        self,
        workspace_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List sessions with optional filtering.

        Args:
            workspace_id: Workspace ID (uses default if not provided)
            filters: Optional filters to apply
            limit: Maximum sessions to return
            offset: Number of sessions to skip

        Returns:
            List of session data dictionaries
        """
        workspace_id = workspace_id or self.default_workspace_id
        workspace_store = self._get_workspace_store(workspace_id)

        # Create mock SimSession for access validation
        mock_sim_session = self._create_mock_sim_session()

        try:
            sessions = await workspace_store.list_workspace_sessions(
                sim_session=mock_sim_session,
                filters=filters,
                limit=limit,
                offset=offset
            )

            logger.debug(f"Listed {len(sessions)} sessions from workspace {workspace_id}")
            return sessions

        except Exception as e:
            logger.error(f"Error listing sessions: {e}")
            return []

    def _create_mock_sim_session(self, customer_id: Optional[str] = None, kwargs: Optional[Dict] = None):
        """Create mock SimSession for compatibility with workspace store."""
        class MockUser:
            def __init__(self):
                self.id = customer_id or "system_user"

        class MockSimSession:
            def __init__(self):
                self.id = f"session_{datetime.now().timestamp()}"
                self.user = MockUser()

        return MockSimSession()

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on the session store.

        Returns:
            Health status information
        """
        try:
            # Test database connectivity
            from database.connection import test_async_connection
            db_healthy = await test_async_connection()

            return {
                'status': 'healthy' if db_healthy else 'unhealthy',
                'database_connection': db_healthy,
                'workspace_stores': len(self._workspace_stores),
                'default_workspace': self.default_workspace_id,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }