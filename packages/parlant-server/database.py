"""
Parlant PostgreSQL Database Integration

This module provides PostgreSQL-based session storage and data persistence
for Parlant server using Sim's existing database connection and schema.

Key features:
- Reuses Sim's PostgreSQL connection and credentials
- Workspace-scoped data isolation
- Session persistence with event sourcing
- Agent lifecycle management
- Tool integration support
"""

import os
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import asyncpg
import asyncio
from contextlib import asynccontextmanager

# Set up logging for database operations
logger = logging.getLogger(__name__)

# Database configuration from environment
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL or POSTGRES_URL environment variable is required")


@dataclass
class ParlantAgent:
    """Represents a Parlant agent configuration"""
    id: str
    workspace_id: str
    created_by: str
    name: str
    description: Optional[str] = None
    status: str = 'active'
    composition_mode: str = 'fluid'
    system_prompt: Optional[str] = None
    model_provider: str = 'openai'
    model_name: str = 'gpt-4'
    temperature: int = 70
    max_tokens: int = 2000
    total_sessions: int = 0
    total_messages: int = 0
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


@dataclass
class ParlantSession:
    """Represents a Parlant conversation session"""
    id: str
    agent_id: str
    workspace_id: str
    user_id: Optional[str] = None
    customer_id: Optional[str] = None
    mode: str = 'auto'
    status: str = 'active'
    title: Optional[str] = None
    metadata: Dict[str, Any] = None
    current_journey_id: Optional[str] = None
    current_state_id: Optional[str] = None
    variables: Dict[str, Any] = None
    event_count: int = 0
    message_count: int = 0
    started_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.variables is None:
            self.variables = {}


@dataclass
class ParlantEvent:
    """Represents an event within a Parlant session"""
    id: str
    session_id: str
    offset: int
    event_type: str
    content: Dict[str, Any]
    metadata: Dict[str, Any] = None
    tool_call_id: Optional[str] = None
    journey_id: Optional[str] = None
    state_id: Optional[str] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class ParlantDatabaseManager:
    """
    Database manager for Parlant integration with PostgreSQL.

    Provides session storage, agent management, and event tracking
    with workspace isolation and integration with Sim's existing schema.
    """

    def __init__(self, database_url: str = None):
        self.database_url = database_url or DATABASE_URL
        self._pool: Optional[asyncpg.Pool] = None

    async def _connection_setup(self, connection):
        """Setup callback for new database connections"""
        try:
            # Set connection parameters for optimal performance
            await connection.execute("SET timezone='UTC'")
            await connection.execute("SET application_name='parlant-server'")
            logger.debug("Database connection setup completed")
        except Exception as e:
            logger.error(f"Connection setup failed: {e}")
            raise

    async def initialize(self) -> None:
        """Initialize the database connection pool with enhanced configuration"""
        if not self._pool:
            # Enhanced connection pool configuration optimized for Parlant server
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,  # Minimum connections to maintain
                max_size=15,  # Reduced from 20 to be conservative with Sim's 60 connection limit
                command_timeout=60,  # Query timeout
                max_inactive_connection_lifetime=300,  # 5 minutes
                setup=self._connection_setup,  # Connection setup callback
                server_settings={
                    'application_name': 'parlant-server',
                    'timezone': 'UTC'
                }
            )
            logger.info("Parlant PostgreSQL connection pool initialized")

    async def close(self) -> None:
        """Close the database connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None

    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool with error handling"""
        if not self._pool:
            await self.initialize()

        connection = None
        try:
            connection = await self._pool.acquire()
            # Test connection before yielding
            await connection.execute("SELECT 1")
            yield connection
        except asyncpg.exceptions.ConnectionDoesNotExistError:
            logger.error("Database connection lost, attempting to reconnect")
            # Reinitialize pool and retry
            await self.close()
            await self.initialize()
            async with self._pool.acquire() as new_connection:
                yield new_connection
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if connection:
                await self._pool.release(connection)

    # Agent Management
    async def create_agent(self, agent: ParlantAgent) -> str:
        """Create a new Parlant agent"""
        async with self.get_connection() as conn:
            agent_id = str(uuid.uuid4()) if not agent.id else agent.id
            now = datetime.utcnow()

            await conn.execute("""
                INSERT INTO parlant_agent (
                    id, workspace_id, created_by, name, description, status,
                    composition_mode, system_prompt, model_provider, model_name,
                    temperature, max_tokens, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """, agent_id, agent.workspace_id, agent.created_by, agent.name,
                agent.description, agent.status, agent.composition_mode,
                agent.system_prompt, agent.model_provider, agent.model_name,
                agent.temperature, agent.max_tokens, now, now
            )

            return agent_id

    async def get_agent(self, agent_id: str, workspace_id: str = None) -> Optional[ParlantAgent]:
        """Get an agent by ID with workspace isolation"""
        async with self.get_connection() as conn:
            query = "SELECT * FROM parlant_agent WHERE id = $1 AND deleted_at IS NULL"
            params = [agent_id]

            if workspace_id:
                query += " AND workspace_id = $2"
                params.append(workspace_id)

            row = await conn.fetchrow(query, *params)

            if not row:
                return None

            return ParlantAgent(
                id=row['id'],
                workspace_id=row['workspace_id'],
                created_by=row['created_by'],
                name=row['name'],
                description=row['description'],
                status=row['status'],
                composition_mode=row['composition_mode'],
                system_prompt=row['system_prompt'],
                model_provider=row['model_provider'],
                model_name=row['model_name'],
                temperature=row['temperature'],
                max_tokens=row['max_tokens'],
                total_sessions=row['total_sessions'],
                total_messages=row['total_messages'],
                last_active_at=row['last_active_at'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                deleted_at=row['deleted_at']
            )

    async def list_agents(self, workspace_id: str, status: str = None) -> List[ParlantAgent]:
        """List agents in a workspace with optional status filtering"""
        async with self.get_connection() as conn:
            query = """
                SELECT * FROM parlant_agent
                WHERE workspace_id = $1 AND deleted_at IS NULL
            """
            params = [workspace_id]

            if status:
                query += " AND status = $2"
                params.append(status)

            query += " ORDER BY created_at DESC"

            rows = await conn.fetch(query, *params)

            return [ParlantAgent(
                id=row['id'],
                workspace_id=row['workspace_id'],
                created_by=row['created_by'],
                name=row['name'],
                description=row['description'],
                status=row['status'],
                composition_mode=row['composition_mode'],
                system_prompt=row['system_prompt'],
                model_provider=row['model_provider'],
                model_name=row['model_name'],
                temperature=row['temperature'],
                max_tokens=row['max_tokens'],
                total_sessions=row['total_sessions'],
                total_messages=row['total_messages'],
                last_active_at=row['last_active_at'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                deleted_at=row['deleted_at']
            ) for row in rows]

    async def update_agent(self, agent: ParlantAgent) -> bool:
        """Update an existing agent"""
        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE parlant_agent SET
                    name = $2, description = $3, status = $4, composition_mode = $5,
                    system_prompt = $6, model_provider = $7, model_name = $8,
                    temperature = $9, max_tokens = $10, updated_at = $11
                WHERE id = $1 AND deleted_at IS NULL
            """, agent.id, agent.name, agent.description, agent.status,
                agent.composition_mode, agent.system_prompt, agent.model_provider,
                agent.model_name, agent.temperature, agent.max_tokens,
                datetime.utcnow()
            )

            return result == 'UPDATE 1'

    async def delete_agent(self, agent_id: str, workspace_id: str) -> bool:
        """Soft delete an agent (workspace-scoped)"""
        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE parlant_agent SET deleted_at = $3, updated_at = $3
                WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            """, agent_id, workspace_id, datetime.utcnow())

            return result == 'UPDATE 1'

    # Session Management
    async def create_session(self, session: ParlantSession) -> str:
        """Create a new conversation session"""
        async with self.get_connection() as conn:
            session_id = str(uuid.uuid4()) if not session.id else session.id
            now = datetime.utcnow()

            await conn.execute("""
                INSERT INTO parlant_session (
                    id, agent_id, workspace_id, user_id, customer_id, mode, status,
                    title, metadata, variables, started_at, last_activity_at,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """, session_id, session.agent_id, session.workspace_id, session.user_id,
                session.customer_id, session.mode, session.status, session.title,
                json.dumps(session.metadata), json.dumps(session.variables),
                now, now, now, now
            )

            return session_id

    async def get_session(self, session_id: str, workspace_id: str = None) -> Optional[ParlantSession]:
        """Get a session by ID with workspace isolation"""
        async with self.get_connection() as conn:
            query = "SELECT * FROM parlant_session WHERE id = $1"
            params = [session_id]

            if workspace_id:
                query += " AND workspace_id = $2"
                params.append(workspace_id)

            row = await conn.fetchrow(query, *params)

            if not row:
                return None

            return ParlantSession(
                id=row['id'],
                agent_id=row['agent_id'],
                workspace_id=row['workspace_id'],
                user_id=row['user_id'],
                customer_id=row['customer_id'],
                mode=row['mode'],
                status=row['status'],
                title=row['title'],
                metadata=json.loads(row['metadata'] or '{}'),
                current_journey_id=row['current_journey_id'],
                current_state_id=row['current_state_id'],
                variables=json.loads(row['variables'] or '{}'),
                event_count=row['event_count'],
                message_count=row['message_count'],
                started_at=row['started_at'],
                last_activity_at=row['last_activity_at'],
                ended_at=row['ended_at'],
                created_at=row['created_at'],
                updated_at=row['updated_at']
            )

    async def update_session(self, session: ParlantSession) -> bool:
        """Update an existing session"""
        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE parlant_session SET
                    mode = $2, status = $3, title = $4, metadata = $5, variables = $6,
                    current_journey_id = $7, current_state_id = $8, event_count = $9,
                    message_count = $10, last_activity_at = $11, ended_at = $12,
                    updated_at = $13
                WHERE id = $1
            """, session.id, session.mode, session.status, session.title,
                json.dumps(session.metadata), json.dumps(session.variables),
                session.current_journey_id, session.current_state_id,
                session.event_count, session.message_count,
                session.last_activity_at, session.ended_at, datetime.utcnow()
            )

            return result == 'UPDATE 1'

    async def list_sessions(
        self,
        workspace_id: str,
        agent_id: str = None,
        user_id: str = None,
        status: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ParlantSession]:
        """List sessions with filtering and pagination"""
        async with self.get_connection() as conn:
            query = "SELECT * FROM parlant_session WHERE workspace_id = $1"
            params = [workspace_id]
            param_count = 1

            if agent_id:
                param_count += 1
                query += f" AND agent_id = ${param_count}"
                params.append(agent_id)

            if user_id:
                param_count += 1
                query += f" AND user_id = ${param_count}"
                params.append(user_id)

            if status:
                param_count += 1
                query += f" AND status = ${param_count}"
                params.append(status)

            query += " ORDER BY last_activity_at DESC"

            if limit:
                param_count += 1
                query += f" LIMIT ${param_count}"
                params.append(limit)

            if offset:
                param_count += 1
                query += f" OFFSET ${param_count}"
                params.append(offset)

            rows = await conn.fetch(query, *params)

            return [ParlantSession(
                id=row['id'],
                agent_id=row['agent_id'],
                workspace_id=row['workspace_id'],
                user_id=row['user_id'],
                customer_id=row['customer_id'],
                mode=row['mode'],
                status=row['status'],
                title=row['title'],
                metadata=json.loads(row['metadata'] or '{}'),
                current_journey_id=row['current_journey_id'],
                current_state_id=row['current_state_id'],
                variables=json.loads(row['variables'] or '{}'),
                event_count=row['event_count'],
                message_count=row['message_count'],
                started_at=row['started_at'],
                last_activity_at=row['last_activity_at'],
                ended_at=row['ended_at'],
                created_at=row['created_at'],
                updated_at=row['updated_at']
            ) for row in rows]

    # Event Management
    async def create_event(self, event: ParlantEvent) -> str:
        """Create a new event in a session"""
        async with self.get_connection() as conn:
            event_id = str(uuid.uuid4()) if not event.id else event.id

            await conn.execute("""
                INSERT INTO parlant_event (
                    id, session_id, offset, event_type, content, metadata,
                    tool_call_id, journey_id, state_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, event_id, event.session_id, event.offset, event.event_type,
                json.dumps(event.content), json.dumps(event.metadata),
                event.tool_call_id, event.journey_id, event.state_id,
                datetime.utcnow()
            )

            # Update session event count
            await conn.execute("""
                UPDATE parlant_session SET
                    event_count = event_count + 1,
                    message_count = CASE
                        WHEN $2 IN ('customer_message', 'agent_message')
                        THEN message_count + 1
                        ELSE message_count
                    END,
                    last_activity_at = $3,
                    updated_at = $3
                WHERE id = $1
            """, event.session_id, event.event_type, datetime.utcnow())

            return event_id

    async def get_events(
        self,
        session_id: str,
        from_offset: int = 0,
        event_types: List[str] = None,
        limit: int = None
    ) -> List[ParlantEvent]:
        """Get events from a session with filtering"""
        async with self.get_connection() as conn:
            query = "SELECT * FROM parlant_event WHERE session_id = $1"
            params = [session_id]
            param_count = 1

            if from_offset > 0:
                param_count += 1
                query += f" AND offset >= ${param_count}"
                params.append(from_offset)

            if event_types:
                param_count += 1
                query += f" AND event_type = ANY(${param_count})"
                params.append(event_types)

            query += " ORDER BY offset ASC"

            if limit:
                param_count += 1
                query += f" LIMIT ${param_count}"
                params.append(limit)

            rows = await conn.fetch(query, *params)

            return [ParlantEvent(
                id=row['id'],
                session_id=row['session_id'],
                offset=row['offset'],
                event_type=row['event_type'],
                content=json.loads(row['content']),
                metadata=json.loads(row['metadata'] or '{}'),
                tool_call_id=row['tool_call_id'],
                journey_id=row['journey_id'],
                state_id=row['state_id'],
                created_at=row['created_at']
            ) for row in rows]

    async def get_next_event_offset(self, session_id: str) -> int:
        """Get the next event offset for a session"""
        async with self.get_connection() as conn:
            result = await conn.fetchval("""
                SELECT COALESCE(MAX(offset), -1) + 1 FROM parlant_event WHERE session_id = $1
            """, session_id)

            return result or 0

    # Workspace isolation helpers
    async def verify_workspace_access(self, resource_id: str, workspace_id: str, resource_type: str) -> bool:
        """Verify that a resource belongs to the specified workspace"""
        async with self.get_connection() as conn:
            if resource_type == 'agent':
                count = await conn.fetchval("""
                    SELECT COUNT(*) FROM parlant_agent
                    WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
                """, resource_id, workspace_id)
            elif resource_type == 'session':
                count = await conn.fetchval("""
                    SELECT COUNT(*) FROM parlant_session
                    WHERE id = $1 AND workspace_id = $2
                """, resource_id, workspace_id)
            else:
                return False

            return count > 0

    # Health check and utilities
    async def health_check(self) -> Dict[str, Any]:
        """Perform a comprehensive database health check"""
        start_time = datetime.utcnow()

        try:
            async with self.get_connection() as conn:
                # Test basic connectivity
                result = await conn.fetchval("SELECT 1")

                # Get database version and connection info
                db_version = await conn.fetchval("SELECT version()")
                connection_count = await conn.fetchval("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE application_name = 'parlant-server'
                """)

                # Get some basic stats
                agent_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM parlant_agent WHERE deleted_at IS NULL
                """)

                session_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM parlant_session WHERE status = 'active'
                """)

                total_events = await conn.fetchval("""
                    SELECT COUNT(*) FROM parlant_event
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                """)

                # Calculate response time
                response_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

                return {
                    'status': 'healthy',
                    'connected': result == 1,
                    'database_version': db_version.split()[0] if db_version else 'unknown',
                    'connection_count': connection_count,
                    'pool_size': f"{self._pool.get_size()}/{self._pool.get_max_size()}" if self._pool else 'not initialized',
                    'response_time_ms': round(response_time_ms, 2),
                    'stats': {
                        'total_agents': agent_count,
                        'active_sessions': session_count,
                        'events_24h': total_events
                    },
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'error_type': type(e).__name__,
                'pool_status': 'closed' if not self._pool else 'error',
                'timestamp': datetime.utcnow().isoformat()
            }


# Global database manager instance
db_manager = ParlantDatabaseManager()


# Parlant session storage adapter
class PostgreSQLSessionStore:
    """
    PostgreSQL-based session storage adapter for Parlant.

    This adapter provides Parlant with persistent session storage
    using Sim's PostgreSQL database and schema.
    """

    def __init__(self, workspace_id: str = None):
        self.workspace_id = workspace_id
        self.db = db_manager

    async def initialize(self):
        """Initialize the session store"""
        await self.db.initialize()

    async def create_session(self, agent_id: str, session_data: Dict[str, Any]) -> str:
        """Create a new session"""
        session = ParlantSession(
            id=session_data.get('id') or str(uuid.uuid4()),
            agent_id=agent_id,
            workspace_id=self.workspace_id or session_data.get('workspace_id'),
            user_id=session_data.get('user_id'),
            customer_id=session_data.get('customer_id'),
            title=session_data.get('title'),
            metadata=session_data.get('metadata', {}),
            variables=session_data.get('variables', {})
        )

        return await self.db.create_session(session)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        session = await self.db.get_session(session_id, self.workspace_id)

        if not session:
            return None

        return asdict(session)

    async def update_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """Update session data"""
        session = await self.db.get_session(session_id, self.workspace_id)

        if not session:
            return False

        # Update fields from session_data
        for key, value in session_data.items():
            if hasattr(session, key):
                setattr(session, key, value)

        return await self.db.update_session(session)

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session (mark as completed)"""
        session = await self.db.get_session(session_id, self.workspace_id)

        if not session:
            return False

        session.status = 'completed'
        session.ended_at = datetime.utcnow()

        return await self.db.update_session(session)

    async def create_event(self, session_id: str, event_data: Dict[str, Any]) -> str:
        """Create a new event in a session"""
        offset = await self.db.get_next_event_offset(session_id)

        event = ParlantEvent(
            id=event_data.get('id') or str(uuid.uuid4()),
            session_id=session_id,
            offset=offset,
            event_type=event_data['event_type'],
            content=event_data['content'],
            metadata=event_data.get('metadata', {}),
            tool_call_id=event_data.get('tool_call_id'),
            journey_id=event_data.get('journey_id'),
            state_id=event_data.get('state_id')
        )

        return await self.db.create_event(event)

    async def get_events(
        self,
        session_id: str,
        from_offset: int = 0,
        event_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Get events from a session"""
        events = await self.db.get_events(session_id, from_offset, event_types)

        return [asdict(event) for event in events]

    async def close(self):
        """Close the session store"""
        await self.db.close()


# Export key classes and functions
__all__ = [
    'ParlantDatabaseManager',
    'PostgreSQLSessionStore',
    'ParlantAgent',
    'ParlantSession',
    'ParlantEvent',
    'db_manager'
]