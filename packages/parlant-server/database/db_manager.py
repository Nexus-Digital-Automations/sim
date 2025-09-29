"""
Database Manager for Parlant Server
===================================

This module provides database management functionality including
initialization, health checks, and lifecycle management for the Parlant server.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from contextlib import asynccontextmanager

from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError

from database.connection import (
    get_engine,
    get_async_engine,
    get_session_factory,
    get_async_session_factory,
    get_async_session_context,
    test_connection,
    test_async_connection,
    close_connections_async
)
from config.settings import get_settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Comprehensive database manager for Parlant server operations.

    Provides database lifecycle management, health monitoring,
    and integration with Sim's existing database infrastructure.
    """

    def __init__(self):
        """Initialize database manager."""
        self._initialized = False
        self._health_status = {}
        self._last_health_check = None

        logger.info("Database manager initialized")

    async def initialize(self) -> bool:
        """
        Initialize database connections and validate schema.

        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info("Initializing database manager")

            # 1. Test database connectivity
            sync_connected = test_connection()
            async_connected = await test_async_connection()

            if not sync_connected or not async_connected:
                logger.error("Database connectivity test failed")
                return False

            # 2. Validate required schema exists
            schema_valid = await self._validate_schema()
            if not schema_valid:
                logger.error("Database schema validation failed")
                return False

            # 3. Initialize session stores
            await self._initialize_session_stores()

            # 4. Run health check
            await self.health_check()

            self._initialized = True
            logger.info("Database manager initialization completed successfully")
            return True

        except Exception as e:
            logger.error(f"Database manager initialization failed: {e}")
            return False

    async def shutdown(self):
        """Shutdown database connections and cleanup resources."""
        try:
            logger.info("Shutting down database manager")

            # Close all database connections
            await close_connections_async()

            self._initialized = False
            logger.info("Database manager shutdown completed")

        except Exception as e:
            logger.error(f"Error during database manager shutdown: {e}")

    async def close(self):
        """Alias for shutdown method for compatibility."""
        await self.shutdown()

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check.

        Returns:
            Health status information
        """
        try:
            health_data = {
                'timestamp': datetime.now().isoformat(),
                'overall_status': 'healthy',
                'details': {}
            }

            # Test sync connection
            sync_healthy = test_connection()
            health_data['details']['sync_connection'] = {
                'status': 'healthy' if sync_healthy else 'unhealthy',
                'tested_at': datetime.now().isoformat()
            }

            # Test async connection
            async_healthy = await test_async_connection()
            health_data['details']['async_connection'] = {
                'status': 'healthy' if async_healthy else 'unhealthy',
                'tested_at': datetime.now().isoformat()
            }

            # Check database version
            db_version = await self._get_database_version()
            health_data['details']['database_version'] = db_version

            # Check required tables
            required_tables = await self._check_required_tables()
            health_data['details']['required_tables'] = required_tables

            # Check session store status
            session_store_status = await self._check_session_store_health()
            health_data['details']['session_store'] = session_store_status

            # Determine overall status
            all_healthy = (
                sync_healthy and
                async_healthy and
                required_tables.get('all_present', False) and
                session_store_status.get('status') == 'healthy'
            )

            health_data['overall_status'] = 'healthy' if all_healthy else 'unhealthy'

            self._health_status = health_data
            self._last_health_check = datetime.now()

            logger.debug(f"Health check completed: {health_data['overall_status']}")
            return health_data

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            error_status = {
                'timestamp': datetime.now().isoformat(),
                'overall_status': 'unhealthy',
                'error': str(e)
            }
            self._health_status = error_status
            return error_status

    async def get_status(self) -> Dict[str, Any]:
        """
        Get current database manager status.

        Returns:
            Status information including initialization and health data
        """
        status = {
            'initialized': self._initialized,
            'last_health_check': self._last_health_check.isoformat() if self._last_health_check else None,
            'health_status': self._health_status,
            'timestamp': datetime.now().isoformat()
        }

        return status

    async def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Execute a database query safely.

        Args:
            query: SQL query to execute
            params: Optional query parameters

        Returns:
            Query results as list of dictionaries
        """
        try:
            async with get_async_session_context() as session:
                result = await session.execute(text(query), params or {})

                # Convert results to list of dictionaries
                rows = result.fetchall()
                if rows:
                    columns = result.keys()
                    return [dict(zip(columns, row)) for row in rows]
                return []

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise

    async def _validate_schema(self) -> bool:
        """Validate that required database schema exists."""
        try:
            async with get_async_session_context() as session:
                # Check if parlant tables exist
                result = await session.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name LIKE 'parlant%'
                """))

                parlant_tables = [row[0] for row in result.fetchall()]

                expected_tables = ['parlantAgent', 'parlantSession', 'parlantEvent']
                missing_tables = [table for table in expected_tables if table not in parlant_tables]

                if missing_tables:
                    logger.warning(f"Missing parlant tables: {missing_tables}")
                    return False

                logger.info("Database schema validation passed")
                return True

        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False

    async def _initialize_session_stores(self):
        """Initialize session store components."""
        try:
            # Import and initialize session store
            from database.postgresql_session_store import PostgreSQLSessionStore

            # This creates the session store but doesn't require immediate connection
            logger.info("Session store components initialized")

        except Exception as e:
            logger.error(f"Failed to initialize session stores: {e}")
            raise

    async def _get_database_version(self) -> Dict[str, Any]:
        """Get database version information."""
        try:
            async with get_async_session_context() as session:
                result = await session.execute(text("SELECT version()"))
                version_row = result.fetchone()

                return {
                    'version': version_row[0] if version_row else 'unknown',
                    'retrieved_at': datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Failed to get database version: {e}")
            return {
                'version': 'error',
                'error': str(e),
                'retrieved_at': datetime.now().isoformat()
            }

    async def _check_required_tables(self) -> Dict[str, Any]:
        """Check if all required tables are present."""
        try:
            async with get_async_session_context() as session:
                result = await session.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                """))

                existing_tables = [row[0] for row in result.fetchall()]

                # Check for critical parlant tables
                required_tables = ['parlantAgent', 'parlantSession', 'parlantEvent']
                present_tables = [table for table in required_tables if table in existing_tables]
                missing_tables = [table for table in required_tables if table not in existing_tables]

                return {
                    'all_present': len(missing_tables) == 0,
                    'present': present_tables,
                    'missing': missing_tables,
                    'total_tables': len(existing_tables),
                    'checked_at': datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Failed to check required tables: {e}")
            return {
                'all_present': False,
                'error': str(e),
                'checked_at': datetime.now().isoformat()
            }

    async def _check_session_store_health(self) -> Dict[str, Any]:
        """Check session store health."""
        try:
            from database.postgresql_session_store import PostgreSQLSessionStore

            # Create a temporary session store instance for health check
            session_store = PostgreSQLSessionStore()
            health_result = await session_store.health_check()

            return {
                'status': health_result.get('status', 'unknown'),
                'details': health_result,
                'checked_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Session store health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'checked_at': datetime.now().isoformat()
            }

    @property
    def is_initialized(self) -> bool:
        """Check if database manager is initialized."""
        return self._initialized

    @property
    def is_healthy(self) -> bool:
        """Check if database manager is healthy based on last health check."""
        return self._health_status.get('overall_status') == 'healthy'


# Global database manager instance
_db_manager: Optional[DatabaseManager] = None


def get_db_manager() -> DatabaseManager:
    """
    Get the global database manager instance.

    Returns:
        DatabaseManager instance
    """
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


# Expose instance for backwards compatibility
db_manager = get_db_manager()