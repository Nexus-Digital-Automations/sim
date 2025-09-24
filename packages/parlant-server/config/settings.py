"""
Parlant Server Settings
Configuration management for Sim integration
"""

import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Server configuration
    app_name: str = "Parlant Server - Sim Integration"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8001, env="PORT")

    # Database configuration
    database_url: str = Field(..., env="DATABASE_URL")
    db_pool_size: int = Field(default=10, env="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, env="DB_MAX_OVERFLOW")

    # Sim authentication configuration
    sim_app_url: str = Field(..., env="NEXT_PUBLIC_APP_URL")
    sim_auth_secret: str = Field(..., env="BETTER_AUTH_SECRET")
    better_auth_url: Optional[str] = Field(default=None, env="BETTER_AUTH_URL")

    # JWT configuration for Sim integration
    jwt_secret_key: str = Field(..., env="BETTER_AUTH_SECRET")  # Reuse Better Auth secret
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expire_hours: int = Field(default=24, env="JWT_EXPIRE_HOURS")

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

    # Parlant-specific configuration
    parlant_log_level: str = Field(default="INFO", env="PARLANT_LOG_LEVEL")
    parlant_max_agents: int = Field(default=100, env="PARLANT_MAX_AGENTS")
    parlant_session_timeout: int = Field(default=3600, env="PARLANT_SESSION_TIMEOUT")  # 1 hour

    # Workspace isolation configuration
    enable_workspace_isolation: bool = Field(default=True, env="ENABLE_WORKSPACE_ISOLATION")
    max_agents_per_workspace: int = Field(default=10, env="MAX_AGENTS_PER_WORKSPACE")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

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