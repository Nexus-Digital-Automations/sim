"""
Parlant Server Settings
Configuration management for Sim integration
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Server configuration
    app_name: str = "Parlant Server - Sim Integration"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8001, env="PORT")

    # Database configuration - inherits from Sim's existing setup
    database_url: str = Field(..., env="DATABASE_URL")  # Primary database URL
    postgres_url: Optional[str] = Field(default=None, env="POSTGRES_URL")  # Alternative URL (Vercel)
    db_pool_size: int = Field(default=10, env="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=15, env="DB_MAX_OVERFLOW")  # Conservative for shared DB
    db_pool_timeout: int = Field(default=30, env="DB_POOL_TIMEOUT")
    db_connection_timeout: int = Field(default=10, env="DB_CONNECTION_TIMEOUT")

    # Sim authentication configuration
    sim_app_url: str = Field(default="http://localhost:3000", env="NEXT_PUBLIC_APP_URL")
    sim_auth_secret: str = Field(default="dev-secret-key-123", env="BETTER_AUTH_SECRET")
    better_auth_url: Optional[str] = Field(default=None, env="BETTER_AUTH_URL")

    # JWT configuration for Sim integration
    jwt_secret_key: str = Field(default="dev-secret-key-123", env="BETTER_AUTH_SECRET")  # Reuse Better Auth secret
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expire_hours: int = Field(default=24, env="JWT_EXPIRE_HOURS")

    # Webhook configuration for Sim integration
    sim_webhook_secret: Optional[str] = Field(default=None, env="SIM_WEBHOOK_SECRET")
    webhook_timeout: int = Field(default=30, env="WEBHOOK_TIMEOUT")
    webhook_retry_attempts: int = Field(default=3, env="WEBHOOK_RETRY_ATTEMPTS")

    # Redis configuration for session storage
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    redis_key_prefix: str = Field(default="parlant:", env="REDIS_KEY_PREFIX")

    # CORS configuration
    allowed_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3000",
            "https://localhost:3001"
        ],
        env="ALLOWED_ORIGINS"
    )

    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from comma-separated string or JSON."""
        if isinstance(v, str):
            # Handle comma-separated string format
            if v.strip():
                return [origin.strip() for origin in v.split(',') if origin.strip()]
            else:
                # Empty string - return default
                return [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://localhost:3000",
                    "https://localhost:3001"
                ]
        elif isinstance(v, list):
            return v
        else:
            # Use default
            return [
                "http://localhost:3000",
                "http://localhost:3001",
                "https://localhost:3000",
                "https://localhost:3001"
            ]

    # Parlant-specific configuration
    parlant_log_level: str = Field(default="INFO", env="PARLANT_LOG_LEVEL")
    parlant_max_agents: int = Field(default=100, env="PARLANT_MAX_AGENTS")
    parlant_session_timeout: int = Field(default=3600, env="PARLANT_SESSION_TIMEOUT")  # 1 hour

    # Workspace isolation configuration
    enable_workspace_isolation: bool = Field(default=True, env="ENABLE_WORKSPACE_ISOLATION")
    max_agents_per_workspace: int = Field(default=10, env="MAX_AGENTS_PER_WORKSPACE")

    class Config:
        env_file = Path(__file__).parent.parent / ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    def get_database_url(self) -> str:
        """Get the database URL, preferring POSTGRES_URL (Vercel) over DATABASE_URL."""
        return self.postgres_url or self.database_url

    def get_sim_base_url(self) -> str:
        """Get the base URL for Sim application."""
        return self.better_auth_url or self.sim_app_url

    def get_cors_origins(self) -> List[str]:
        """Get CORS origins including Sim app URL."""
        origins = self.allowed_origins.copy()

        # Add Sim app URLs to CORS origins
        sim_url = self.sim_app_url
        if sim_url and sim_url not in origins:
            origins.append(sim_url)

        if self.better_auth_url and self.better_auth_url not in origins:
            origins.append(self.better_auth_url)

        return origins


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get or create the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Reload settings (useful for testing or config changes)."""
    global _settings
    _settings = Settings()
    return _settings