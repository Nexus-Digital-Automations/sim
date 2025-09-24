"""
Parlant Agents API endpoints
Handles agent lifecycle, sessions, and workspace isolation
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from auth.middleware import get_current_session, get_auth_bridge
from auth.sim_auth_bridge import SimSession


logger = logging.getLogger(__name__)

router = APIRouter()


class CreateAgentRequest(BaseModel):
    """Request model for creating a new agent."""
    name: str
    description: Optional[str] = None
    guidelines: List[str] = []
    tools: List[str] = []
    model: str = "claude-3-sonnet-20240229"
    temperature: float = 0.7
    workspace_id: str


class AgentResponse(BaseModel):
    """Response model for agent information."""
    id: str
    name: str
    description: Optional[str]
    guidelines: List[str]
    tools: List[str]
    model: str
    temperature: float
    workspace_id: str
    user_id: str
    created_at: str
    updated_at: str
    status: str


class AgentSessionRequest(BaseModel):
    """Request model for starting an agent session."""
    agent_id: str
    workspace_id: str
    context: Optional[Dict[str, Any]] = None


class AgentSessionResponse(BaseModel):
    """Response model for agent session."""
    session_id: str
    agent_id: str
    workspace_id: str
    user_id: str
    status: str
    created_at: str
    context: Dict[str, Any]


class MessageRequest(BaseModel):
    """Request model for sending a message to an agent."""
    content: str
    session_id: str
    message_type: str = "user"
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    """Response model for agent message."""
    id: str
    session_id: str
    content: str
    message_type: str
    timestamp: str
    metadata: Dict[str, Any]


# Mock storage for demonstration (in production, use database)
_agents_storage = {}
_sessions_storage = {}
_messages_storage = {}


@router.post("/", response_model=AgentResponse)
async def create_agent(
    request: CreateAgentRequest,
    session: SimSession = Depends(get_current_session)
):
    """
    Create a new Parlant agent in the specified workspace.

    The agent will be isolated to the workspace and only accessible
    by users with appropriate permissions.
    """
    # Validate workspace access
    auth_bridge = get_auth_bridge()
    has_access = await auth_bridge.validate_workspace_access(session, request.workspace_id)

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to workspace {request.workspace_id}"
        )

    # Generate agent ID
    agent_id = f"agent_{len(_agents_storage) + 1}_{request.workspace_id}"

    # Create agent record
    agent_data = {
        "id": agent_id,
        "name": request.name,
        "description": request.description,
        "guidelines": request.guidelines,
        "tools": request.tools,
        "model": request.model,
        "temperature": request.temperature,
        "workspace_id": request.workspace_id,
        "user_id": session.user.id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": "active"
    }

    _agents_storage[agent_id] = agent_data

    logger.info(f"Created agent {agent_id} in workspace {request.workspace_id} by user {session.user.email}")

    return AgentResponse(**agent_data)


@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    workspace_id: Optional[str] = Query(None, description="Filter by workspace ID"),
    session: SimSession = Depends(get_current_session)
):
    """
    List all agents accessible to the current user.

    If workspace_id is provided, only returns agents from that workspace.
    """
    agents = []

    for agent_data in _agents_storage.values():
        agent_workspace_id = agent_data["workspace_id"]

        # Skip if workspace filter provided and doesn't match
        if workspace_id and agent_workspace_id != workspace_id:
            continue

        # Check if user has access to the agent's workspace
        auth_bridge = get_auth_bridge()
        has_access = await auth_bridge.validate_workspace_access(session, agent_workspace_id)

        if has_access:
            agents.append(AgentResponse(**agent_data))

    return agents


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    session: SimSession = Depends(get_current_session)
):
    """
    Get detailed information about a specific agent.

    Requires access to the agent's workspace.
    """
    if agent_id not in _agents_storage:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_data = _agents_storage[agent_id]

    # Validate workspace access
    auth_bridge = get_auth_bridge()
    has_access = await auth_bridge.validate_workspace_access(session, agent_data["workspace_id"])

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to agent in workspace {agent_data['workspace_id']}"
        )

    return AgentResponse(**agent_data)


@router.post("/sessions", response_model=AgentSessionResponse)
async def start_agent_session(
    request: AgentSessionRequest,
    session: SimSession = Depends(get_current_session)
):
    """
    Start a new session with a Parlant agent.

    Creates an isolated session context with workspace boundaries.
    """
    # Validate agent exists and user has access
    if request.agent_id not in _agents_storage:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_data = _agents_storage[request.agent_id]

    # Validate workspace access
    auth_bridge = get_auth_bridge()
    has_access = await auth_bridge.validate_workspace_access(session, request.workspace_id)

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to workspace {request.workspace_id}"
        )

    # Ensure agent belongs to requested workspace
    if agent_data["workspace_id"] != request.workspace_id:
        raise HTTPException(
            status_code=400,
            detail="Agent does not belong to specified workspace"
        )

    # Create agent session context
    agent_context = await auth_bridge.create_agent_session_context(
        session, request.workspace_id, request.agent_id
    )

    # Generate session ID
    session_id = f"session_{len(_sessions_storage) + 1}_{request.agent_id}"

    # Create session record
    session_data = {
        "session_id": session_id,
        "agent_id": request.agent_id,
        "workspace_id": request.workspace_id,
        "user_id": session.user.id,
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "context": {
            **agent_context,
            **(request.context or {})
        }
    }

    _sessions_storage[session_id] = session_data

    logger.info(f"Started session {session_id} with agent {request.agent_id} for user {session.user.email}")

    return AgentSessionResponse(**session_data)


@router.get("/sessions/{session_id}")
async def get_agent_session(
    session_id: str,
    user_session: SimSession = Depends(get_current_session)
):
    """
    Get information about a specific agent session.
    """
    if session_id not in _sessions_storage:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = _sessions_storage[session_id]

    # Validate user owns the session or has workspace access
    if session_data["user_id"] != user_session.user.id:
        # Check workspace access as fallback
        auth_bridge = get_auth_bridge()
        has_access = await auth_bridge.validate_workspace_access(
            user_session, session_data["workspace_id"]
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to session")

    return session_data


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
async def send_message(
    session_id: str,
    request: MessageRequest,
    user_session: SimSession = Depends(get_current_session)
):
    """
    Send a message to an agent session.

    This would typically integrate with the actual Parlant agent to process
    the message and return a response.
    """
    if session_id not in _sessions_storage:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = _sessions_storage[session_id]

    # Validate user owns the session
    if session_data["user_id"] != user_session.user.id:
        raise HTTPException(status_code=403, detail="Access denied to session")

    # Generate message ID
    message_id = f"msg_{len(_messages_storage) + 1}_{session_id}"

    # Create message record
    message_data = {
        "id": message_id,
        "session_id": session_id,
        "content": request.content,
        "message_type": request.message_type,
        "timestamp": datetime.now().isoformat(),
        "metadata": request.metadata or {}
    }

    _messages_storage[message_id] = message_data

    # TODO: Integrate with actual Parlant agent to process the message
    # For now, return a mock response
    logger.info(f"Received message in session {session_id}: {request.content[:50]}...")

    return MessageResponse(**message_data)


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = Query(50, description="Maximum number of messages to return"),
    offset: int = Query(0, description="Number of messages to skip"),
    user_session: SimSession = Depends(get_current_session)
):
    """
    Get messages from an agent session.
    """
    if session_id not in _sessions_storage:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = _sessions_storage[session_id]

    # Validate user owns the session
    if session_data["user_id"] != user_session.user.id:
        raise HTTPException(status_code=403, detail="Access denied to session")

    # Filter messages for this session
    session_messages = [
        msg for msg in _messages_storage.values()
        if msg["session_id"] == session_id
    ]

    # Sort by timestamp and apply pagination
    session_messages.sort(key=lambda x: x["timestamp"])
    paginated_messages = session_messages[offset:offset + limit]

    return {
        "messages": paginated_messages,
        "total": len(session_messages),
        "offset": offset,
        "limit": limit
    }


@router.delete("/sessions/{session_id}")
async def end_agent_session(
    session_id: str,
    user_session: SimSession = Depends(get_current_session)
):
    """
    End an agent session and clean up resources.
    """
    if session_id not in _sessions_storage:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = _sessions_storage[session_id]

    # Validate user owns the session
    if session_data["user_id"] != user_session.user.id:
        raise HTTPException(status_code=403, detail="Access denied to session")

    # Update session status
    _sessions_storage[session_id]["status"] = "ended"

    logger.info(f"Ended session {session_id} for user {user_session.user.email}")

    return {"message": f"Session {session_id} ended successfully"}


@router.get("/workspaces/{workspace_id}/agents", response_model=List[AgentResponse])
async def list_workspace_agents(
    workspace_id: str,
    session: SimSession = Depends(get_current_session)
):
    """
    List all agents in a specific workspace.

    Requires access to the workspace.
    """
    # Validate workspace access
    auth_bridge = get_auth_bridge()
    has_access = await auth_bridge.validate_workspace_access(session, workspace_id)

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to workspace {workspace_id}"
        )

    # Filter agents by workspace
    workspace_agents = [
        AgentResponse(**agent_data)
        for agent_data in _agents_storage.values()
        if agent_data["workspace_id"] == workspace_id
    ]

    return workspace_agents