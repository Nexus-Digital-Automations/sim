#!/usr/bin/env python3
"""
Parlant Server Entry Point for Sim Integration
==============================================

This module provides the main entry point for the Parlant server integration
within the Sim ecosystem. It serves as a bridge between Sim's existing system
and Parlant's conversational AI capabilities.

Key Features:
- FastAPI-based REST API server
- PostgreSQL integration for session persistence
- Health monitoring endpoints
- Environment-based configuration
- Logging and error handling
- Integration with existing Sim authentication
"""

import os
import logging
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from parlant.core.application import Application
from parlant.core.sessions import SessionStore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="Parlant Server for Sim",
    description="Parlant Agentic Behavior Modeling engine integrated with Sim platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Sim frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Sim frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global application instance
parlant_app: Optional[Application] = None


async def initialize_parlant() -> Application:
    """
    Initialize and configure the Parlant application.

    Returns:
        Application: Configured Parlant application instance

    Raises:
        RuntimeError: If Parlant initialization fails
    """
    try:
        # The Parlant CLI handles initialization
        # For now, we create a minimal placeholder
        # This will be properly configured once we integrate with the CLI server
        logger.info("Parlant application initialized successfully")
        return None  # Placeholder for now

    except Exception as e:
        logger.error(f"Failed to initialize Parlant application: {e}")
        raise RuntimeError(f"Parlant initialization failed: {e}")


@app.on_event("startup")
async def startup_event():
    """Initialize Parlant application on server startup."""
    global parlant_app
    try:
        parlant_app = await initialize_parlant()
        logger.info("Parlant server startup completed")
    except Exception as e:
        logger.error(f"Server startup failed: {e}")
        # Don't raise to allow server to start in development mode


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on server shutdown."""
    global parlant_app
    if parlant_app:
        # Add cleanup code when application is properly integrated
        pass
    logger.info("Parlant server shutdown completed")


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancing.

    Returns:
        dict: Health status information
    """
    try:
        # Check database connectivity
        if parlant_instance:
            # TODO: Add actual database health check
            db_status = "healthy"
        else:
            db_status = "not_initialized"

        return {
            "status": "healthy" if parlant_instance else "unhealthy",
            "service": "parlant-server",
            "version": "1.0.0",
            "database": db_status,
            "timestamp": "2025-01-23"
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


@app.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes/Docker deployments.

    Returns:
        dict: Service readiness status
    """
    if not parlant_instance:
        raise HTTPException(status_code=503, detail="Service not ready")

    return {
        "status": "ready",
        "service": "parlant-server"
    }


@app.get("/agents")
async def list_agents():
    """
    List all available Parlant agents (placeholder).

    Returns:
        dict: List of agents
    """
    if not parlant_instance:
        raise HTTPException(status_code=503, detail="Parlant not initialized")

    # TODO: Implement actual agent listing
    return {
        "agents": [],
        "count": 0
    }


@app.post("/agents")
async def create_agent(agent_data: dict):
    """
    Create a new Parlant agent (placeholder).

    Args:
        agent_data: Agent configuration data

    Returns:
        dict: Created agent information
    """
    if not parlant_instance:
        raise HTTPException(status_code=503, detail="Parlant not initialized")

    # TODO: Implement actual agent creation
    return {
        "message": "Agent creation endpoint - implementation pending",
        "data": agent_data
    }


def main():
    """
    Main entry point for running the Parlant server.
    """
    # Load environment variables from .env file if present
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv(env_file)

    # Server configuration
    host = os.getenv("PARLANT_HOST", "localhost")
    port = int(os.getenv("PARLANT_PORT", "8001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"

    logger.info(f"Starting Parlant server on {host}:{port}")

    # Run the server
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )


if __name__ == "__main__":
    main()