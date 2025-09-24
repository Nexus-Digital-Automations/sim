"""
Parlant Server - Authentication Bridge for Sim Integration
Main server entry point with Better Auth integration
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn

from auth.sim_auth_bridge import SimAuthBridge
from auth.middleware import auth_middleware
from database.connection import get_database_url, create_engine, get_db_session
from api.v1 import agents, auth as auth_router
from config.settings import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize settings and auth bridge
settings = get_settings()
auth_bridge = SimAuthBridge(settings)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan management."""
    logger.info("Starting Parlant Server with Sim Auth Bridge")

    # Initialize database connection
    try:
        engine = create_engine(get_database_url())
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

    # Initialize auth bridge
    try:
        await auth_bridge.initialize()
        logger.info("Sim Auth Bridge initialized")
    except Exception as e:
        logger.error(f"Failed to initialize auth bridge: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down Parlant Server")


# Create FastAPI application
app = FastAPI(
    title="Parlant Server - Sim Integration",
    description="Parlant agent server with Sim authentication bridge",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware
app.middleware("http")(auth_middleware)

# Include routers
app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "parlant-server",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Parlant Server - Sim Integration",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )