"""
Session and Conversation Isolation for Workspace Boundaries

This module implements comprehensive isolation for Parlant agent sessions
and conversations to ensure strict workspace boundaries are maintained.

Features:
- Session-level workspace isolation
- Conversation boundary enforcement
- Cross-session access prevention
- Event stream filtering
- Message history scoping
- Real-time validation
"""

import logging
from typing import Dict, Any, Optional, List, Set, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
import json

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from auth.workspace_isolation import WorkspaceContext
from auth.workspace_context import OperationContext, WorkspaceContextManager


logger = logging.getLogger(__name__)


class SessionIsolationLevel(Enum):
    """Levels of session isolation."""
    STRICT = "strict"  # Complete isolation, no cross-workspace data
    MODERATE = "moderate"  # Some shared resources allowed
    PERMISSIVE = "permissive"  # User-level isolation only


class ConversationScope(Enum):
    """Scope of conversation visibility."""
    WORKSPACE_PRIVATE = "workspace_private"  # Only workspace members
    WORKSPACE_SHARED = "workspace_shared"  # Shared within workspace
    USER_PRIVATE = "user_private"  # Only creating user
    ORGANIZATION_SHARED = "organization_shared"  # Shared within organization


@dataclass
class SessionIsolationConfig:
    """Configuration for session isolation."""
    isolation_level: SessionIsolationLevel = SessionIsolationLevel.STRICT
    conversation_scope: ConversationScope = ConversationScope.WORKSPACE_PRIVATE
    allow_cross_workspace_tools: bool = False
    enable_audit_logging: bool = True
    max_session_duration: timedelta = field(default_factory=lambda: timedelta(hours=24))
    event_retention_days: int = 30


@dataclass
class IsolatedSession:
    """Represents an isolated agent session."""
    session_id: str
    agent_id: str
    workspace_id: str
    user_id: str
    customer_id: Optional[str]
    isolation_config: SessionIsolationConfig
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        """Check if session has expired."""
        if not self.is_active:
            return True
        return datetime.now() - self.created_at > self.isolation_config.max_session_duration

    @property
    def isolation_token(self) -> str:
        """Generate isolation token for this session."""
        return f"ws_{self.workspace_id}_sess_{self.session_id[:12]}"


class SessionIsolationManager:
    """
    Manager for session and conversation isolation within workspace boundaries.

    Ensures that all agent sessions and their conversations are properly
    isolated and cannot access data from other workspaces.
    """

    def __init__(self, db_session: Session, context_manager: WorkspaceContextManager):
        self.db_session = db_session
        self.context_manager = context_manager

        # Active isolated sessions
        self._isolated_sessions: Dict[str, IsolatedSession] = {}

        # Session to workspace mapping for quick lookup
        self._session_workspace_map: Dict[str, str] = {}

        # Event filtering cache
        self._event_filter_cache: Dict[str, str] = {}

    async def create_isolated_session(
        self,
        agent_id: str,
        workspace_id: str,
        user_id: str,
        customer_id: Optional[str] = None,
        isolation_config: Optional[SessionIsolationConfig] = None,
        session_metadata: Optional[Dict[str, Any]] = None
    ) -> IsolatedSession:
        """
        Create a new isolated session within workspace boundaries.

        Args:
            agent_id: Agent ID for the session
            workspace_id: Workspace scope
            user_id: User creating the session
            customer_id: Optional customer identifier
            isolation_config: Session isolation configuration
            session_metadata: Optional session metadata

        Returns:
            IsolatedSession object

        Raises:
            HTTPException: If workspace access is denied or agent not found
        """
        # Validate agent belongs to workspace
        agent_workspace = await self._get_agent_workspace(agent_id)
        if agent_workspace != workspace_id:
            raise HTTPException(
                status_code=403,
                detail=f"Agent {agent_id} does not belong to workspace {workspace_id}"
            )

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Use default isolation config if not provided
        if isolation_config is None:
            isolation_config = SessionIsolationConfig()

        # Create isolated session
        isolated_session = IsolatedSession(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace_id,
            user_id=user_id,
            customer_id=customer_id,
            isolation_config=isolation_config,
            metadata=session_metadata or {}
        )

        # Store in memory for quick access
        self._isolated_sessions[session_id] = isolated_session
        self._session_workspace_map[session_id] = workspace_id

        # Create database record
        await self._create_session_record(isolated_session)

        logger.info(
            f"Created isolated session {session_id} for agent {agent_id} "
            f"in workspace {workspace_id} (user: {user_id})"
        )

        return isolated_session

    async def validate_session_access(
        self,
        session_id: str,
        requesting_user_id: str,
        required_permission: str = 'read'
    ) -> bool:
        """
        Validate user access to a specific session.

        Args:
            session_id: Session ID to validate
            requesting_user_id: User requesting access
            required_permission: Required permission level

        Returns:
            True if access is allowed, False otherwise
        """
        try:
            # Get session from memory or database
            isolated_session = await self._get_isolated_session(session_id)
            if not isolated_session:
                return False

            # Check if session is expired
            if isolated_session.is_expired:
                logger.warning(f"Access denied to expired session {session_id}")
                return False

            # Get workspace context for the requesting user
            workspace_context = await self.context_manager.isolation_manager.get_workspace_context(
                requesting_user_id, isolated_session.workspace_id
            )

            if not workspace_context:
                return False

            # Check permission based on conversation scope
            if isolated_session.isolation_config.conversation_scope == ConversationScope.USER_PRIVATE:
                # Only the creating user can access
                return requesting_user_id == isolated_session.user_id
            elif isolated_session.isolation_config.conversation_scope == ConversationScope.WORKSPACE_PRIVATE:
                # Workspace members with appropriate permissions
                if required_permission == 'read' and workspace_context.can_read:
                    return True
                elif required_permission == 'write' and workspace_context.can_write:
                    return True
                elif required_permission == 'admin' and workspace_context.can_admin:
                    return True
            elif isolated_session.isolation_config.conversation_scope == ConversationScope.WORKSPACE_SHARED:
                # Any workspace member can access
                return workspace_context.can_read

            return False

        except Exception as e:
            logger.error(f"Error validating session access: {e}")
            return False

    async def get_session_event_filter(
        self,
        session_id: str,
        user_id: str
    ) -> str:
        """
        Get SQL filter for session events based on user permissions.

        Args:
            session_id: Session ID
            user_id: User requesting events

        Returns:
            SQL WHERE clause for event filtering
        """
        # Check cache first
        cache_key = f"{session_id}:{user_id}"
        if cache_key in self._event_filter_cache:
            return self._event_filter_cache[cache_key]

        # Validate session access
        has_access = await self.validate_session_access(session_id, user_id)
        if not has_access:
            filter_clause = "1=0"  # No access - return impossible condition
        else:
            # Get workspace for additional filtering
            workspace_id = self._session_workspace_map.get(session_id)
            if workspace_id:
                filter_clause = (
                    f"e.session_id = '{session_id}' AND "
                    f"s.workspace_id = '{workspace_id}' AND "
                    f"s.id = e.session_id"
                )
            else:
                filter_clause = f"e.session_id = '{session_id}'"

        # Cache the filter
        self._event_filter_cache[cache_key] = filter_clause

        return filter_clause

    async def get_filtered_conversation_history(
        self,
        session_id: str,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        event_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get filtered conversation history for a session.

        Args:
            session_id: Session ID
            user_id: User requesting history
            limit: Maximum number of events
            offset: Offset for pagination
            event_types: Optional filter by event types

        Returns:
            List of filtered conversation events
        """
        try:
            # Get event filter
            event_filter = await self.get_session_event_filter(session_id, user_id)

            # Build query with filters
            query_parts = [
                "SELECT e.id, e.event_type, e.content, e.metadata, e.created_at,",
                "       e.tool_call_id, e.journey_id, e.state_id",
                "FROM parlant_event e",
                "JOIN parlant_session s ON e.session_id = s.id",
                f"WHERE {event_filter}"
            ]

            # Add event type filter if specified
            if event_types:
                type_filter = "(" + " OR ".join([f"e.event_type = '{et}'" for et in event_types]) + ")"
                query_parts.append(f"AND {type_filter}")

            # Add ordering and pagination
            query_parts.extend([
                "ORDER BY e.created_at DESC",
                f"LIMIT {limit} OFFSET {offset}"
            ])

            query = text(" ".join(query_parts))
            results = self.db_session.execute(query).fetchall()

            # Convert to dictionaries
            events = []
            for row in results:
                event = {
                    'id': row.id,
                    'event_type': row.event_type,
                    'content': row.content,
                    'metadata': row.metadata,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'tool_call_id': row.tool_call_id,
                    'journey_id': row.journey_id,
                    'state_id': row.state_id
                }
                events.append(event)

            return events

        except Exception as e:
            logger.error(f"Error getting filtered conversation history: {e}")
            return []

    async def validate_event_creation(
        self,
        session_id: str,
        event_type: str,
        user_id: str,
        event_content: Dict[str, Any]
    ) -> bool:
        """
        Validate that an event can be created in a session.

        Args:
            session_id: Target session ID
            event_type: Type of event being created
            user_id: User creating the event
            event_content: Event content/data

        Returns:
            True if event creation is allowed, False otherwise
        """
        try:
            # Validate session access with write permission
            has_write_access = await self.validate_session_access(session_id, user_id, 'write')
            if not has_write_access:
                logger.warning(f"User {user_id} lacks write access to session {session_id}")
                return False

            # Get isolated session for additional validation
            isolated_session = await self._get_isolated_session(session_id)
            if not isolated_session:
                return False

            # Validate workspace-specific constraints
            if isolated_session.isolation_config.isolation_level == SessionIsolationLevel.STRICT:
                # In strict mode, validate all content references are workspace-scoped
                if not await self._validate_event_content_isolation(
                    event_content, isolated_session.workspace_id
                ):
                    return False

            # Check for tool calls in cross-workspace scenarios
            if event_type == 'tool_call' and not isolated_session.isolation_config.allow_cross_workspace_tools:
                tool_id = event_content.get('tool_id')
                if tool_id:
                    tool_workspace = await self._get_tool_workspace(tool_id)
                    if tool_workspace != isolated_session.workspace_id:
                        logger.warning(
                            f"Cross-workspace tool call denied: {tool_id} not in workspace {isolated_session.workspace_id}"
                        )
                        return False

            return True

        except Exception as e:
            logger.error(f"Error validating event creation: {e}")
            return False

    async def get_user_accessible_sessions(
        self,
        user_id: str,
        workspace_id: Optional[str] = None,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all sessions accessible to a user.

        Args:
            user_id: User ID
            workspace_id: Optional workspace filter
            include_inactive: Include inactive sessions

        Returns:
            List of accessible session information
        """
        try:
            # Build base query
            query_parts = [
                "SELECT s.id, s.agent_id, s.workspace_id, s.user_id, s.customer_id,",
                "       s.title, s.status, s.mode, s.started_at, s.last_activity_at,",
                "       s.message_count, s.event_count,",
                "       a.name as agent_name, a.description as agent_description",
                "FROM parlant_session s",
                "JOIN parlant_agent a ON s.agent_id = a.id",
                "WHERE 1=1"
            ]

            params = {'user_id': user_id}

            # Add workspace filter
            if workspace_id:
                query_parts.append("AND s.workspace_id = :workspace_id")
                params['workspace_id'] = workspace_id

            # Add status filter
            if not include_inactive:
                query_parts.append("AND s.status = 'active'")

            # Add user access conditions based on isolation rules
            query_parts.append("""
                AND (
                    s.user_id = :user_id OR
                    EXISTS (
                        SELECT 1 FROM permissions p
                        WHERE p.user_id = :user_id
                        AND p.entity_type = 'workspace'
                        AND p.entity_id = s.workspace_id
                        AND p.permission_type IN ('read', 'write', 'admin')
                    )
                )
            """)

            query_parts.append("ORDER BY s.last_activity_at DESC")

            query = text(" ".join(query_parts))
            results = self.db_session.execute(query, params).fetchall()

            # Convert to dictionaries and add isolation info
            sessions = []
            for row in results:
                session_info = {
                    'id': row.id,
                    'agent_id': row.agent_id,
                    'workspace_id': row.workspace_id,
                    'user_id': row.user_id,
                    'customer_id': row.customer_id,
                    'title': row.title,
                    'status': row.status,
                    'mode': row.mode,
                    'started_at': row.started_at.isoformat() if row.started_at else None,
                    'last_activity_at': row.last_activity_at.isoformat() if row.last_activity_at else None,
                    'message_count': row.message_count,
                    'event_count': row.event_count,
                    'agent_name': row.agent_name,
                    'agent_description': row.agent_description,
                    'is_owner': row.user_id == user_id
                }

                # Add isolation info if session is in memory
                if row.id in self._isolated_sessions:
                    isolated_session = self._isolated_sessions[row.id]
                    session_info.update({
                        'isolation_level': isolated_session.isolation_config.isolation_level.value,
                        'conversation_scope': isolated_session.isolation_config.conversation_scope.value,
                        'isolation_token': isolated_session.isolation_token
                    })

                sessions.append(session_info)

            return sessions

        except Exception as e:
            logger.error(f"Error getting accessible sessions for user {user_id}: {e}")
            return []

    async def enforce_conversation_boundaries(
        self,
        session_id: str,
        requesting_user_id: str,
        operation: str,
        resource_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Enforce conversation boundaries for operations.

        Args:
            session_id: Session ID
            requesting_user_id: User performing operation
            operation: Operation being performed
            resource_data: Optional resource data for validation

        Returns:
            True if operation is allowed within boundaries, False otherwise
        """
        try:
            # Get isolated session
            isolated_session = await self._get_isolated_session(session_id)
            if not isolated_session:
                return False

            # Validate basic session access
            if not await self.validate_session_access(session_id, requesting_user_id):
                return False

            # Check operation-specific boundaries
            if operation in ['create_message', 'update_message']:
                # Message operations require write access
                return await self.validate_session_access(session_id, requesting_user_id, 'write')

            elif operation == 'execute_tool':
                # Tool execution validation
                if resource_data and 'tool_id' in resource_data:
                    return await self._validate_tool_execution_boundaries(
                        isolated_session, resource_data['tool_id']
                    )

            elif operation == 'access_variables':
                # Variable access is workspace-scoped
                return True  # Already validated by session access

            elif operation == 'update_journey_state':
                # Journey updates require write access
                return await self.validate_session_access(session_id, requesting_user_id, 'write')

            return True

        except Exception as e:
            logger.error(f"Error enforcing conversation boundaries: {e}")
            return False

    async def cleanup_expired_sessions(self):
        """Clean up expired sessions and related data."""
        current_time = datetime.now()
        expired_sessions = []

        # Find expired sessions
        for session_id, isolated_session in self._isolated_sessions.items():
            if isolated_session.is_expired:
                expired_sessions.append(session_id)

        # Clean up expired sessions
        for session_id in expired_sessions:
            await self._cleanup_expired_session(session_id)

        # Clear expired cache entries
        expired_cache_keys = []
        for key in list(self._event_filter_cache.keys()):
            # Remove cache entries for expired sessions
            if any(key.startswith(f"{sess_id}:") for sess_id in expired_sessions):
                expired_cache_keys.append(key)

        for key in expired_cache_keys:
            del self._event_filter_cache[key]

        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired isolated sessions")

    # Private helper methods

    async def _get_isolated_session(self, session_id: str) -> Optional[IsolatedSession]:
        """Get isolated session from memory or recreate from database."""
        if session_id in self._isolated_sessions:
            return self._isolated_sessions[session_id]

        # Try to load from database
        return await self._load_session_from_database(session_id)

    async def _create_session_record(self, isolated_session: IsolatedSession):
        """Create database record for isolated session."""
        # Note: This would integrate with the actual parlant_session table
        # For now, we'll just log the creation
        logger.debug(f"Created database record for session {isolated_session.session_id}")

    async def _load_session_from_database(self, session_id: str) -> Optional[IsolatedSession]:
        """Load session from database and recreate isolated session."""
        try:
            query = text("""
                SELECT id, agent_id, workspace_id, user_id, customer_id,
                       mode, status, started_at, last_activity_at, metadata
                FROM parlant_session
                WHERE id = :session_id
            """)

            result = self.db_session.execute(query, {'session_id': session_id}).fetchone()
            if not result:
                return None

            # Recreate isolated session with default config
            isolated_session = IsolatedSession(
                session_id=result.id,
                agent_id=result.agent_id,
                workspace_id=result.workspace_id,
                user_id=result.user_id,
                customer_id=result.customer_id,
                isolation_config=SessionIsolationConfig(),
                created_at=result.started_at,
                last_activity=result.last_activity_at or result.started_at,
                is_active=(result.status == 'active'),
                metadata=result.metadata or {}
            )

            # Store in memory
            self._isolated_sessions[session_id] = isolated_session
            self._session_workspace_map[session_id] = result.workspace_id

            return isolated_session

        except Exception as e:
            logger.error(f"Error loading session from database: {e}")
            return None

    async def _validate_event_content_isolation(
        self,
        event_content: Dict[str, Any],
        workspace_id: str
    ) -> bool:
        """Validate that event content doesn't reference cross-workspace resources."""
        # Check for tool references
        if 'tool_id' in event_content:
            tool_workspace = await self._get_tool_workspace(event_content['tool_id'])
            if tool_workspace and tool_workspace != workspace_id:
                return False

        # Check for journey references
        if 'journey_id' in event_content:
            journey_workspace = await self._get_journey_workspace(event_content['journey_id'])
            if journey_workspace and journey_workspace != workspace_id:
                return False

        return True

    async def _validate_tool_execution_boundaries(
        self,
        isolated_session: IsolatedSession,
        tool_id: str
    ) -> bool:
        """Validate tool execution within session boundaries."""
        if isolated_session.isolation_config.allow_cross_workspace_tools:
            return True

        tool_workspace = await self._get_tool_workspace(tool_id)
        return tool_workspace == isolated_session.workspace_id

    async def _cleanup_expired_session(self, session_id: str):
        """Clean up an expired session."""
        if session_id in self._isolated_sessions:
            del self._isolated_sessions[session_id]
        if session_id in self._session_workspace_map:
            del self._session_workspace_map[session_id]

        logger.debug(f"Cleaned up expired session {session_id}")

    # Database query helpers

    async def _get_agent_workspace(self, agent_id: str) -> Optional[str]:
        """Get workspace ID for an agent."""
        query = text("SELECT workspace_id FROM parlant_agent WHERE id = :agent_id AND deleted_at IS NULL")
        result = self.db_session.execute(query, {'agent_id': agent_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_tool_workspace(self, tool_id: str) -> Optional[str]:
        """Get workspace ID for a tool."""
        query = text("SELECT workspace_id FROM parlant_tool WHERE id = :tool_id")
        result = self.db_session.execute(query, {'tool_id': tool_id}).fetchone()
        return result.workspace_id if result else None

    async def _get_journey_workspace(self, journey_id: str) -> Optional[str]:
        """Get workspace ID for a journey."""
        query = text("""
            SELECT a.workspace_id
            FROM parlant_journey j
            JOIN parlant_agent a ON j.agent_id = a.id
            WHERE j.id = :journey_id
        """)
        result = self.db_session.execute(query, {'journey_id': journey_id}).fetchone()
        return result.workspace_id if result else None