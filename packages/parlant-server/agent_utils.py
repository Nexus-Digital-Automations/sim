#!/usr/bin/env python3
"""
Agent Management Utilities for Sim-Parlant Integration
======================================================

This module provides utilities for creating, managing, and interacting with
Parlant agents in the context of Sim workspaces and user authentication.

Key Features:
- Agent creation and configuration
- Workspace-scoped agent management
- Session management for agent interactions
- Integration with Sim's authentication system
"""

import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

import parlant.sdk as p

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"


class ModelProvider(Enum):
    """Supported AI model providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


@dataclass
class AgentConfig:
    """Configuration for creating a Parlant agent"""
    name: str
    description: str
    workspace_id: str
    user_id: str
    model_provider: ModelProvider = ModelProvider.OPENAI
    model_name: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 1000
    system_prompt: Optional[str] = None
    status: AgentStatus = AgentStatus.DRAFT
    composition_mode: str = "STANDARD"  # STANDARD, CREATIVE, TECHNICAL, etc.

    # Metadata
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        """Validate configuration after initialization"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Agent name is required")

        if not self.workspace_id or len(self.workspace_id.strip()) == 0:
            raise ValueError("Workspace ID is required")

        if not self.user_id or len(self.user_id.strip()) == 0:
            raise ValueError("User ID is required")

        if self.temperature < 0.0 or self.temperature > 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")

        if self.max_tokens < 1 or self.max_tokens > 8192:
            raise ValueError("Max tokens must be between 1 and 8192")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'name': self.name,
            'description': self.description,
            'workspace_id': self.workspace_id,
            'user_id': self.user_id,
            'model_provider': self.model_provider.value,
            'model_name': self.model_name,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'system_prompt': self.system_prompt,
            'status': self.status.value,
            'composition_mode': self.composition_mode,
            'tags': self.tags or [],
            'metadata': self.metadata or {}
        }


class AgentManager:
    """
    Manager for Parlant agents with Sim integration.

    This class provides high-level operations for managing agents
    within the context of Sim workspaces and user authentication.
    """

    def __init__(self, server: Optional[p.Server] = None):
        self.server = server
        self._agents_cache: Dict[str, p.Agent] = {}

    def set_server(self, server: p.Server):
        """Set the Parlant server instance"""
        self.server = server
        logger.info("Agent manager connected to Parlant server")

    async def create_agent(self, config: AgentConfig) -> Optional[p.Agent]:
        """
        Create a new Parlant agent from configuration.

        Args:
            config: Agent configuration

        Returns:
            Created Parlant Agent instance or None if creation fails
        """
        if not self.server:
            logger.error("No Parlant server available for agent creation")
            return None

        try:
            logger.info(f"Creating agent '{config.name}' for workspace {config.workspace_id}")

            # Create agent using Parlant SDK
            # Note: The actual agent creation API might differ - this is a conceptual implementation
            agent = await self._create_parlant_agent(config)

            if agent:
                # Cache the agent for quick access
                agent_key = f"{config.workspace_id}:{config.name}"
                self._agents_cache[agent_key] = agent

                logger.info(f"✅ Agent '{config.name}' created successfully")
                return agent
            else:
                logger.error(f"❌ Failed to create agent '{config.name}'")
                return None

        except Exception as e:
            logger.error(f"❌ Error creating agent '{config.name}': {e}")
            return None

    async def _create_parlant_agent(self, config: AgentConfig) -> Optional[p.Agent]:
        """
        Internal method to create Parlant agent using SDK.

        Note: This is a placeholder implementation. The actual Parlant SDK
        agent creation API might be different.
        """
        try:
            # For now, return a placeholder since we need to understand the exact API
            # In the actual implementation, this would use the Parlant SDK to create an agent
            logger.info(f"Parlant agent creation placeholder for {config.name}")

            # This would be something like:
            # agent = await self.server.create_agent(
            #     name=config.name,
            #     description=config.description,
            #     model_provider=config.model_provider.value,
            #     model_name=config.model_name,
            #     temperature=config.temperature,
            #     max_tokens=config.max_tokens,
            #     composition_mode=config.composition_mode
            # )
            #
            # if config.system_prompt:
            #     await agent.set_system_prompt(config.system_prompt)

            return None  # Placeholder - would return actual agent

        except Exception as e:
            logger.error(f"Failed to create Parlant agent: {e}")
            return None

    async def get_agent(self, workspace_id: str, agent_name: str) -> Optional[p.Agent]:
        """
        Retrieve an agent by workspace and name.

        Args:
            workspace_id: Workspace identifier
            agent_name: Agent name

        Returns:
            Agent instance or None if not found
        """
        agent_key = f"{workspace_id}:{agent_name}"

        # Check cache first
        if agent_key in self._agents_cache:
            return self._agents_cache[agent_key]

        # In a full implementation, this would query the database or server
        logger.warning(f"Agent '{agent_name}' not found in workspace '{workspace_id}'")
        return None

    async def list_agents(self, workspace_id: str, status: Optional[AgentStatus] = None) -> List[Dict[str, Any]]:
        """
        List all agents in a workspace.

        Args:
            workspace_id: Workspace identifier
            status: Optional status filter

        Returns:
            List of agent information dictionaries
        """
        # In a full implementation, this would query the database
        # For now, return agents from cache that match the workspace
        matching_agents = []

        for agent_key, agent in self._agents_cache.items():
            key_workspace_id, agent_name = agent_key.split(':', 1)
            if key_workspace_id == workspace_id:
                matching_agents.append({
                    'name': agent_name,
                    'workspace_id': workspace_id,
                    'status': 'active',  # Placeholder
                    'created_at': None,  # Placeholder
                    'updated_at': None   # Placeholder
                })

        logger.info(f"Found {len(matching_agents)} agents in workspace '{workspace_id}'")
        return matching_agents

    async def delete_agent(self, workspace_id: str, agent_name: str) -> bool:
        """
        Delete an agent.

        Args:
            workspace_id: Workspace identifier
            agent_name: Agent name

        Returns:
            True if deleted successfully, False otherwise
        """
        agent_key = f"{workspace_id}:{agent_name}"

        try:
            # Remove from cache
            if agent_key in self._agents_cache:
                del self._agents_cache[agent_key]
                logger.info(f"✅ Agent '{agent_name}' deleted from workspace '{workspace_id}'")
                return True
            else:
                logger.warning(f"Agent '{agent_name}' not found in workspace '{workspace_id}'")
                return False

        except Exception as e:
            logger.error(f"❌ Error deleting agent '{agent_name}': {e}")
            return False

    async def update_agent_status(self, workspace_id: str, agent_name: str, status: AgentStatus) -> bool:
        """
        Update an agent's status.

        Args:
            workspace_id: Workspace identifier
            agent_name: Agent name
            status: New status

        Returns:
            True if updated successfully, False otherwise
        """
        # In a full implementation, this would update the database
        logger.info(f"Agent '{agent_name}' status updated to '{status.value}' in workspace '{workspace_id}'")
        return True

    async def create_session(self, workspace_id: str, agent_name: str, user_id: str) -> Optional[str]:
        """
        Create a new session for agent interaction.

        Args:
            workspace_id: Workspace identifier
            agent_name: Agent name
            user_id: User identifier

        Returns:
            Session ID or None if creation fails
        """
        try:
            agent = await self.get_agent(workspace_id, agent_name)
            if not agent:
                logger.error(f"Cannot create session: agent '{agent_name}' not found")
                return None

            # In a full implementation, this would create a Parlant session
            # session_id = await agent.create_session()
            session_id = f"session_{workspace_id}_{agent_name}_{user_id}"  # Placeholder

            logger.info(f"✅ Session '{session_id}' created for agent '{agent_name}'")
            return session_id

        except Exception as e:
            logger.error(f"❌ Error creating session for agent '{agent_name}': {e}")
            return None

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        return {
            'cached_agents': len(self._agents_cache),
            'agent_keys': list(self._agents_cache.keys())
        }


# Factory functions for easy usage
def create_agent_config(
    name: str,
    description: str,
    workspace_id: str,
    user_id: str,
    **kwargs
) -> AgentConfig:
    """
    Factory function to create agent configuration with defaults.

    Args:
        name: Agent name
        description: Agent description
        workspace_id: Workspace identifier
        user_id: User identifier
        **kwargs: Additional configuration options

    Returns:
        AgentConfig instance
    """
    return AgentConfig(
        name=name,
        description=description,
        workspace_id=workspace_id,
        user_id=user_id,
        **kwargs
    )


# Global agent manager instance
_agent_manager: Optional[AgentManager] = None


def get_agent_manager() -> Optional[AgentManager]:
    """Get the global agent manager instance"""
    return _agent_manager


def initialize_agent_manager(server: Optional[p.Server] = None) -> AgentManager:
    """Initialize the global agent manager"""
    global _agent_manager

    if _agent_manager is None:
        _agent_manager = AgentManager(server)
        logger.info("Agent manager initialized")
    elif server and not _agent_manager.server:
        _agent_manager.set_server(server)

    return _agent_manager