"""
User-to-Agent Mapping Service
Handles context passing and permission management between Sim users and Parlant agents
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException

from auth.sim_auth_bridge import SimSession, SimUser
from auth.utils import AuthenticationUtils, AgentPermissions, WorkspacePermissions
from config.settings import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class AgentContextMapping:
    """Maps user context to agent execution context."""
    user_id: str
    agent_id: str
    workspace_id: str
    session_id: str

    # User context
    user_email: str
    user_name: str
    user_permissions: List[str]
    user_role: str

    # Agent context
    agent_permissions: AgentPermissions
    context_variables: Dict[str, Any]

    # Metadata
    created_at: datetime
    last_accessed: datetime
    expires_at: datetime


@dataclass
class ConversationContext:
    """Represents the context for a conversation between user and agent."""
    session_id: str
    user_id: str
    agent_id: str
    workspace_id: str

    # Conversation state
    message_count: int
    last_message_at: datetime
    conversation_variables: Dict[str, Any]

    # User preferences and history
    user_preferences: Dict[str, Any]
    conversation_history: List[Dict[str, Any]]

    # Agent configuration for this user
    personalized_system_prompt: Optional[str]
    allowed_tools: List[str]
    restricted_actions: List[str]


class UserAgentMapper:
    """Manages mapping between users and agents with context preservation."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.auth_utils = AuthenticationUtils(settings)
        self._context_cache: Dict[str, AgentContextMapping] = {}
        self._conversation_cache: Dict[str, ConversationContext] = {}

    async def create_agent_mapping(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str,
        context_variables: Optional[Dict[str, Any]] = None
    ) -> AgentContextMapping:
        """Create a new user-to-agent mapping with context."""

        # Validate workspace access
        if not await self._validate_agent_access(session, agent_id, workspace_id):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to agent {agent_id} in workspace {workspace_id}"
            )

        # Get user's workspace permissions
        workspace_perms = self._get_workspace_permissions(session, workspace_id)
        if not workspace_perms:
            raise HTTPException(
                status_code=403,
                detail=f"No permissions in workspace {workspace_id}"
            )

        # Create agent permissions
        agent_permissions = self.auth_utils.create_agent_permissions(
            session, agent_id, workspace_id
        )

        # Create mapping
        mapping = AgentContextMapping(
            user_id=session.user.id,
            agent_id=agent_id,
            workspace_id=workspace_id,
            session_id=session.id,
            user_email=session.user.email,
            user_name=session.user.name,
            user_permissions=workspace_perms.permissions,
            user_role=workspace_perms.role,
            agent_permissions=agent_permissions,
            context_variables=context_variables or {},
            created_at=datetime.utcnow(),
            last_accessed=datetime.utcnow(),
            expires_at=session.expires_at
        )

        # Cache the mapping
        cache_key = f"{session.user.id}:{agent_id}:{workspace_id}"
        self._context_cache[cache_key] = mapping

        logger.info(f"Created agent mapping for user {session.user.email} to agent {agent_id}")
        return mapping

    async def get_agent_mapping(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str
    ) -> Optional[AgentContextMapping]:
        """Get existing agent mapping for user."""

        cache_key = f"{session.user.id}:{agent_id}:{workspace_id}"

        # Check cache first
        if cache_key in self._context_cache:
            mapping = self._context_cache[cache_key]

            # Validate mapping is still valid
            if mapping.expires_at > datetime.utcnow():
                mapping.last_accessed = datetime.utcnow()
                return mapping
            else:
                # Remove expired mapping
                del self._context_cache[cache_key]

        # Create new mapping if none exists
        return await self.create_agent_mapping(session, agent_id, workspace_id)

    async def update_context_variables(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str,
        variables: Dict[str, Any]
    ) -> AgentContextMapping:
        """Update context variables for user-agent mapping."""

        mapping = await self.get_agent_mapping(session, agent_id, workspace_id)
        if not mapping:
            raise HTTPException(
                status_code=404,
                detail="Agent mapping not found"
            )

        # Merge variables
        mapping.context_variables.update(variables)
        mapping.last_accessed = datetime.utcnow()

        # Update cache
        cache_key = f"{session.user.id}:{agent_id}:{workspace_id}"
        self._context_cache[cache_key] = mapping

        logger.debug(f"Updated context variables for user {session.user.email}")
        return mapping

    async def create_conversation_context(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str,
        initial_message: Optional[str] = None
    ) -> ConversationContext:
        """Create conversation context for user-agent interaction."""

        # Get or create agent mapping
        mapping = await self.get_agent_mapping(session, agent_id, workspace_id)

        # Load user preferences (would typically come from database)
        user_preferences = await self._load_user_preferences(session.user.id, workspace_id)

        # Create conversation context
        context = ConversationContext(
            session_id=f"conv_{session.id}_{agent_id}",
            user_id=session.user.id,
            agent_id=agent_id,
            workspace_id=workspace_id,
            message_count=1 if initial_message else 0,
            last_message_at=datetime.utcnow(),
            conversation_variables={},
            user_preferences=user_preferences,
            conversation_history=[],
            personalized_system_prompt=None,
            allowed_tools=await self._get_allowed_tools(mapping),
            restricted_actions=await self._get_restricted_actions(mapping)
        )

        # Add initial message to history if provided
        if initial_message:
            context.conversation_history.append({
                "type": "user_message",
                "content": initial_message,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {}
            })

        # Cache conversation context
        self._conversation_cache[context.session_id] = context

        logger.info(f"Created conversation context for user {session.user.email}")
        return context

    async def get_user_context_for_agent(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive user context for agent execution."""

        mapping = await self.get_agent_mapping(session, agent_id, workspace_id)
        if not mapping:
            raise HTTPException(
                status_code=404,
                detail="Agent mapping not found"
            )

        # Build comprehensive context
        context = {
            "user": {
                "id": mapping.user_id,
                "email": mapping.user_email,
                "name": mapping.user_name,
                "permissions": mapping.user_permissions,
                "role": mapping.user_role,
            },
            "workspace": {
                "id": mapping.workspace_id,
            },
            "agent": {
                "id": mapping.agent_id,
                "permissions": asdict(mapping.agent_permissions),
            },
            "session": {
                "id": mapping.session_id,
                "created_at": mapping.created_at.isoformat(),
                "last_accessed": mapping.last_accessed.isoformat(),
                "expires_at": mapping.expires_at.isoformat(),
            },
            "context_variables": mapping.context_variables,
            "user_preferences": await self._load_user_preferences(
                mapping.user_id, mapping.workspace_id
            )
        }

        return context

    async def validate_tool_access(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str,
        tool_name: str
    ) -> bool:
        """Validate if user can access specific tool through agent."""

        mapping = await self.get_agent_mapping(session, agent_id, workspace_id)
        if not mapping:
            return False

        # Check agent permissions
        if not mapping.agent_permissions.can_write and tool_name in self._write_tools:
            return False

        if not mapping.agent_permissions.can_delete and tool_name in self._delete_tools:
            return False

        # Check workspace-specific tool permissions
        workspace_tools = await self._get_workspace_allowed_tools(workspace_id)
        if workspace_tools and tool_name not in workspace_tools:
            return False

        return True

    async def log_user_agent_interaction(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str,
        interaction_type: str,
        details: Dict[str, Any]
    ):
        """Log user-agent interactions for audit and analytics."""

        log_data = {
            "user_id": session.user.id,
            "user_email": session.user.email,
            "agent_id": agent_id,
            "workspace_id": workspace_id,
            "session_id": session.id,
            "interaction_type": interaction_type,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        }

        # Log to audit logger
        audit_logger = logging.getLogger('audit')
        audit_logger.info(f"User-agent interaction: {interaction_type}", extra=log_data)

    # Private helper methods

    async def _validate_agent_access(
        self,
        session: SimSession,
        agent_id: str,
        workspace_id: str
    ) -> bool:
        """Validate user has access to agent in workspace."""

        # Check workspace access
        workspace_perms = self._get_workspace_permissions(session, workspace_id)
        if not workspace_perms:
            return False

        # For now, any workspace access grants agent access
        # In production, you might have agent-specific permissions
        return True

    def _get_workspace_permissions(
        self,
        session: SimSession,
        workspace_id: str
    ) -> Optional[WorkspacePermissions]:
        """Get user's permissions for specific workspace."""

        for workspace in session.user.workspaces:
            if workspace["id"] == workspace_id:
                return WorkspacePermissions(
                    workspace_id=workspace_id,
                    permissions=workspace.get("permissions", []),
                    role=workspace.get("role", "member"),
                    is_owner=workspace.get("owner_id") == session.user.id
                )

        return None

    async def _load_user_preferences(
        self,
        user_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """Load user preferences for workspace."""

        # In production, this would load from database
        # For now, return default preferences
        return {
            "language": "en",
            "timezone": "UTC",
            "notification_preferences": {
                "email": True,
                "in_app": True
            },
            "agent_preferences": {
                "response_style": "professional",
                "verbosity": "medium"
            }
        }

    async def _get_allowed_tools(self, mapping: AgentContextMapping) -> List[str]:
        """Get list of tools allowed for this user-agent mapping."""

        allowed_tools = []

        if mapping.agent_permissions.can_read:
            allowed_tools.extend(self._read_tools)

        if mapping.agent_permissions.can_write:
            allowed_tools.extend(self._write_tools)

        if mapping.agent_permissions.can_delete:
            allowed_tools.extend(self._delete_tools)

        return allowed_tools

    async def _get_restricted_actions(self, mapping: AgentContextMapping) -> List[str]:
        """Get list of restricted actions for this user-agent mapping."""

        restricted = []

        if not mapping.agent_permissions.can_delete:
            restricted.append("delete_files")
            restricted.append("delete_resources")

        if not mapping.agent_permissions.can_manage:
            restricted.append("modify_agent_config")
            restricted.append("invite_users")

        return restricted

    async def _get_workspace_allowed_tools(self, workspace_id: str) -> Optional[List[str]]:
        """Get workspace-specific allowed tools."""

        # In production, this would query workspace configuration
        # For now, return None (no restrictions)
        return None

    # Tool categories for permission checking
    _read_tools = [
        "search_knowledge_base",
        "get_user_info",
        "list_files",
        "read_document"
    ]

    _write_tools = [
        "create_document",
        "update_document",
        "send_email",
        "create_task"
    ]

    _delete_tools = [
        "delete_document",
        "delete_task",
        "remove_user"
    ]


# Global instance
_user_agent_mapper: Optional[UserAgentMapper] = None


def get_user_agent_mapper() -> UserAgentMapper:
    """Get or create global user-agent mapper instance."""
    global _user_agent_mapper
    if _user_agent_mapper is None:
        _user_agent_mapper = UserAgentMapper()
    return _user_agent_mapper