"""
Database connection and session management
Integrates with existing Sim PostgreSQL database
"""

import os
import logging
from typing import AsyncIterator, Generator
from contextlib import asynccontextmanager

from sqlalchemy import create_engine, Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from config.settings import get_settings

logger = logging.getLogger(__name__)

# Global engine instances
_engine: Engine | None = None
_async_engine = None
_session_factory = None
_async_session_factory = None


def get_database_url() -> str:
    """Get database URL from settings or environment."""
    settings = get_settings()
    return settings.database_url


def get_async_database_url() -> str:
    """Get async database URL by converting the sync URL."""
    sync_url = get_database_url()
    # Convert postgresql:// to postgresql+asyncpg://
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif sync_url.startswith("postgres://"):
        return sync_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return sync_url


def create_engine_instance() -> Engine:
    """Create a SQLAlchemy engine instance."""
    settings = get_settings()
    database_url = get_database_url()

    logger.info(f"Creating database engine for URL: {database_url.split('@')[0]}@***")

    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,  # Validate connections before use
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=settings.debug,  # Log SQL queries in debug mode
    )

    return engine


def get_engine() -> Engine:
    """Get or create the global engine instance."""
    global _engine
    if _engine is None:
        _engine = create_engine_instance()
    return _engine


def get_session_factory() -> sessionmaker:
    """Get or create the global session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return _session_factory


def get_db_session() -> Generator[Session, None, None]:
    """Get a database session (dependency for FastAPI)."""
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def create_async_engine_instance():
    """Create an async SQLAlchemy engine instance."""
    settings = get_settings()
    async_url = get_async_database_url()

    logger.info(f"Creating async database engine for URL: {async_url.split('@')[0]}@***")

    engine = create_async_engine(
        async_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=settings.debug,
    )

    return engine


def get_async_engine():
    """Get or create the global async engine instance."""
    global _async_engine
    if _async_engine is None:
        _async_engine = create_async_engine_instance()
    return _async_engine


def get_async_session_factory() -> async_sessionmaker:
    """Get or create the global async session factory."""
    global _async_session_factory
    if _async_session_factory is None:
        engine = get_async_engine()
        _async_session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    return _async_session_factory


async def get_async_db_session() -> AsyncIterator[AsyncSession]:
    """Get an async database session (dependency for FastAPI)."""
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        yield session


@asynccontextmanager
async def get_async_session_context() -> AsyncIterator[AsyncSession]:
    """Get an async database session context manager."""
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        yield session


def test_connection() -> bool:
    """Test database connectivity."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False


async def test_async_connection() -> bool:
    """Test async database connectivity."""
    try:
        engine = get_async_engine()
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        logger.info("Async database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Async database connection test failed: {e}")
        return False


def close_connections():
    """Close all database connections."""
    global _engine, _async_engine

    if _engine:
        _engine.dispose()
        _engine = None
        logger.info("Sync database engine disposed")

    if _async_engine:
        _async_engine.dispose()
        _async_engine = None
        logger.info("Async database engine disposed")