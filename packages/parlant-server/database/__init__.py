# Database package

"""
Database package for Parlant Server
===================================

This package provides database integration, session management,
and agent management for the Parlant server.
"""

# Import core classes and instances
from database.postgresql_session_store import PostgreSQLSessionStore
from database.db_manager import db_manager, DatabaseManager
from database.parlant_agent import ParlantAgent

# Import additional utilities
from database.connection import (
    get_engine,
    get_async_engine,
    get_session_factory,
    get_async_session_factory,
    get_async_session_context,
    test_connection,
    test_async_connection
)

from database.workspace_session_store import (
    WorkspaceSessionStore,
    create_workspace_session_store
)

# Export public API
__all__ = [
    # Core classes required by server.py
    'PostgreSQLSessionStore',
    'db_manager',
    'ParlantAgent',

    # Additional classes
    'DatabaseManager',
    'WorkspaceSessionStore',
    'create_workspace_session_store',

    # Connection utilities
    'get_engine',
    'get_async_engine',
    'get_session_factory',
    'get_async_session_factory',
    'get_async_session_context',
    'test_connection',
    'test_async_connection'
]