"""
Parlant Server Package for Sim Integration
==========================================

This package provides the Parlant conversational AI server integration
for the Sim platform, enabling agentic behavior modeling and natural
language processing capabilities.

Key Components:
- Server: FastAPI-based REST API server
- Configuration: Environment-based configuration management
- Database: PostgreSQL integration for session persistence
- Authentication: Integration with Sim's user authentication system
- API: RESTful endpoints for agent management and interactions

Usage:
    python -m parlant-server
    # or
    python server.py
    # or
    python main.py
"""

__version__ = "1.0.0"
__author__ = "Sim Development Team"
__description__ = "Parlant conversational AI server for Sim platform integration"

# Package imports for convenience
from .server import app as fastapi_app
from .config import get_settings

__all__ = [
    "fastapi_app",
    "get_settings",
    "__version__",
    "__author__",
    "__description__"
]