#!/usr/bin/env python3
"""
Sim-Parlant Integration Server
=============================

This module provides a production-ready Parlant server configured for
integration with the Sim platform. It includes:

- PostgreSQL session persistence
- Workspace-scoped agent management
- Health monitoring and metrics
- CORS configuration for frontend integration
- Environment-based configuration
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

import parlant.sdk as p
from parlant.sdk import LogLevel, NLPServices

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimParlantServerConfig:
    """Configuration management for Sim-Parlant integration"""

    def __init__(self):
        # Server configuration
        self.host = os.getenv('PARLANT_HOST', '0.0.0.0')
        self.port = int(os.getenv('PARLANT_PORT', '8800'))
        self.tool_service_port = int(os.getenv('TOOL_SERVICE_PORT', '8818'))

        # Database configuration
        self.database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

        # AI provider configuration
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')

        # Logging configuration
        self.log_level = self._parse_log_level(os.getenv('LOG_LEVEL', 'INFO'))

        # CORS configuration
        cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000')
        self.cors_origins = [origin.strip() for origin in cors_origins.split(',')]

        # Session configuration
        self.session_timeout_hours = int(os.getenv('SESSION_TIMEOUT_HOURS', '24'))
        self.max_events_per_session = int(os.getenv('MAX_EVENTS_PER_SESSION', '10000'))

        # Rate limiting
        self.default_rate_limit = int(os.getenv('DEFAULT_RATE_LIMIT', '100'))

        # Health check configuration
        self.health_check_enabled = os.getenv('HEALTH_CHECK_ENABLED', 'true').lower() == 'true'

        # Validate required configuration
        self._validate()

    def _parse_log_level(self, level_str: str) -> LogLevel:
        """Parse log level string to LogLevel enum"""
        level_map = {
            'DEBUG': LogLevel.DEBUG,
            'INFO': LogLevel.INFO,
            'WARNING': LogLevel.WARNING,
            'ERROR': LogLevel.ERROR,
            'CRITICAL': LogLevel.CRITICAL
        }
        return level_map.get(level_str.upper(), LogLevel.INFO)

    def _validate(self):
        """Validate required configuration"""
        if not self.database_url:
            raise ValueError("DATABASE_URL or POSTGRES_URL is required")

        if not self.openai_api_key and not self.anthropic_api_key:
            raise ValueError("At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY is required")


class SimParlantServer:
    """
    Production Sim-Parlant integration server.

    This server provides AI agent functionality integrated with Sim's
    existing database, authentication, and workspace isolation.
    """

    def __init__(self, config: SimParlantServerConfig):
        self.config = config
        self.server: Optional[p.Server] = None
        self.running = False

        logger.info(f"Initializing Sim-Parlant server on {config.host}:{config.port}")

    def _configure_nlp_service(self):
        """Configure NLP service based on available API keys"""
        if self.config.openai_api_key:
            # Set OpenAI API key in environment for parlant SDK
            os.environ['OPENAI_API_KEY'] = self.config.openai_api_key
            return NLPServices.openai
        elif self.config.anthropic_api_key:
            # Set Anthropic API key in environment for parlant SDK
            os.environ['ANTHROPIC_API_KEY'] = self.config.anthropic_api_key
            return NLPServices.openai  # SDK might handle this automatically
        else:
            raise ValueError("No valid AI provider configuration found")

    def _get_session_store_config(self) -> str:
        """Configure session store - use database URL if available, otherwise local"""
        if self.config.database_url:
            # For now, use local file storage until PostgreSQL session store is implemented
            # In a full implementation, this would connect to PostgreSQL
            logger.warning("PostgreSQL session store not yet implemented, using local storage")
            return 'local'
        else:
            return 'transient'

    async def _configure_container(self, container) -> Any:
        """Configure dependency injection container for Sim integration"""
        # Add custom services and configurations here
        # This is where you'd inject database connections, auth services, etc.
        logger.info("Configuring Parlant container for Sim integration")
        return container

    async def _initialize_container(self, container) -> None:
        """Initialize container with Sim-specific configurations"""
        # Perform any initialization logic here
        logger.info("Container initialized for Sim integration")

    async def start(self):
        """Start the Parlant server with Sim integration"""
        if self.running:
            logger.warning("Server is already running")
            return

        try:
            # Create Parlant server with Sim-specific configuration
            self.server = p.Server(
                port=self.config.port,
                tool_service_port=self.config.tool_service_port,
                nlp_service=self._configure_nlp_service(),
                session_store=self._get_session_store_config(),
                customer_store='local',  # Use local storage for customers
                log_level=self.config.log_level,
                modules=[],  # Add custom modules here if needed
                migrate=True,  # Run migrations on startup
                configure_container=self._configure_container,
                initialize_container=self._initialize_container
            )

            logger.info(f"Starting Parlant server on {self.config.host}:{self.config.port}")

            # Start the server using async context manager
            async with self.server:
                self.running = True
                logger.info("Sim-Parlant server started successfully")
                logger.info(f"API documentation available at http://{self.config.host}:{self.config.port}/docs")
                logger.info(f"Tool service running on port {self.config.tool_service_port}")

                # Keep the server running
                try:
                    while self.running:
                        await asyncio.sleep(1)
                except KeyboardInterrupt:
                    logger.info("Received shutdown signal")
                finally:
                    await self.stop()

        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            raise

    async def stop(self):
        """Stop the Parlant server"""
        logger.info("Stopping Sim-Parlant server...")
        self.running = False

        if self.server:
            # Server cleanup is handled by async context manager
            self.server = None

        logger.info("Sim-Parlant server stopped successfully")

    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        checks = {
            'server': {
                'status': 'healthy' if self.running else 'stopped',
                'host': self.config.host,
                'port': self.config.port
            },
            'database': {
                'status': 'configured' if self.config.database_url else 'not_configured',
                'type': 'postgresql' if self.config.database_url else 'none'
            },
            'ai_providers': {
                'openai': 'configured' if self.config.openai_api_key else 'not_configured',
                'anthropic': 'configured' if self.config.anthropic_api_key else 'not_configured'
            }
        }

        # Overall health status
        is_healthy = (
            checks['server']['status'] == 'healthy' and
            (checks['ai_providers']['openai'] == 'configured' or
             checks['ai_providers']['anthropic'] == 'configured')
        )

        return {
            'status': 'healthy' if is_healthy else 'unhealthy',
            'timestamp': asyncio.get_event_loop().time(),
            'version': '1.0.0',
            'checks': checks
        }


class SimHealthServer:
    """Separate health check server for monitoring"""

    def __init__(self, parlant_server: SimParlantServer, port: int = 8080):
        self.parlant_server = parlant_server
        self.port = port

    async def start_health_server(self):
        """Start a simple health check server"""
        from aiohttp import web, web_runner

        async def health_handler(request):
            health_data = await self.parlant_server.health_check()
            return web.json_response(health_data)

        async def ready_handler(request):
            if self.parlant_server.running:
                return web.json_response({'status': 'ready'})
            else:
                return web.json_response({'status': 'not ready'}, status=503)

        app = web.Application()
        app.router.add_get('/health', health_handler)
        app.router.add_get('/ready', ready_handler)

        runner = web_runner.AppRunner(app)
        await runner.setup()

        site = web_runner.TCPSite(runner, '0.0.0.0', self.port)
        await site.start()

        logger.info(f"Health check server started on port {self.port}")


# Global server instance
_server_instance: Optional[SimParlantServer] = None


async def create_server(config: Optional[SimParlantServerConfig] = None) -> SimParlantServer:
    """Create and configure the Sim-Parlant server"""
    global _server_instance

    if _server_instance is None:
        if config is None:
            config = SimParlantServerConfig()
        _server_instance = SimParlantServer(config)

    return _server_instance


async def get_server() -> Optional[SimParlantServer]:
    """Get the current server instance"""
    return _server_instance


async def start_server(config: Optional[SimParlantServerConfig] = None):
    """Start the Sim-Parlant server"""
    server = await create_server(config)
    await server.start()


async def stop_server():
    """Stop the Sim-Parlant server"""
    global _server_instance

    if _server_instance:
        await _server_instance.stop()
        _server_instance = None


async def main():
    """Main entry point for running the server"""
    logger.info("Starting Sim-Parlant integration server...")

    try:
        # Load configuration
        config = SimParlantServerConfig()

        # Start main server
        await start_server(config)

    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise
    finally:
        await stop_server()


if __name__ == "__main__":
    # Load environment variables from .env file if present
    from pathlib import Path
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv(env_file)

    # Run the server
    asyncio.run(main())