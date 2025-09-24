"""
Workspace-Scoped Agent API Routes
===============================

This module provides comprehensive API endpoints for managing Parlant agents
with complete workspace isolation and multi-tenant security. All operations
are scoped to workspaces and integrate with Sim's existing permission system.

Key Features:
- Workspace-scoped agent CRUD operations
- Multi-tenant data isolation
- Permission-based access control
- Cross-workspace access prevention
- Integration with Sim's existing APIs
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from auth.middleware import get_current_session, require_workspace_access
from auth.sim_auth_bridge import SimSession
from auth.workspace_access_control import (
    workspace_access_controller,
    validate_workspace_agent_access,
    get_user_accessible_agents
)
from workspace_isolation import (
    workspace_isolation_manager,
    ensure_workspace_agent_isolation,
    get_isolated_workspace_agents,
    create_isolated_workspace_agent
)
from database.connection import get_async_session_context

logger = logging.getLogger(__name__)

# Create router for workspace agent endpoints
router = APIRouter(prefix="/api/v1/workspaces", tags=["workspace-agents"])


# Pydantic models for request/response validation

class AgentCreateRequest(BaseModel):
    """Request model for creating workspace-scoped agents."""
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    description: Optional[str] = Field(None, max_length=500, description="Agent description")
    system_prompt: Optional[str] = Field(None, description="System prompt for agent behavior")
    model_provider: str = Field("openai", description="AI model provider")
    model_name: str = Field("gpt-4", description="AI model name")
    temperature: Optional[int] = Field(70, ge=0, le=100, description="Model temperature (0-100)")
    max_tokens: Optional[int] = Field(2000, gt=0, description="Maximum tokens per response")
    composition_mode: str = Field("fluid", description="Agent composition mode")
    isolation_level: str = Field("strict", description="Workspace isolation level")

    class Config:
        schema_extra = {
            "example": {
                "name": "Customer Support Agent",
                "description": "AI agent for handling customer support inquiries",
                "system_prompt": "You are a helpful customer support agent...",
                "model_provider": "openai",
                "model_name": "gpt-4",
                "temperature": 70,
                "max_tokens": 2000,
                "composition_mode": "fluid",
                "isolation_level": "strict"
            }
        }


class AgentUpdateRequest(BaseModel):
    """Request model for updating workspace-scoped agents."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    system_prompt: Optional[str] = None
    temperature: Optional[int] = Field(None, ge=0, le=100)
    max_tokens: Optional[int] = Field(None, gt=0)
    status: Optional[str] = Field(None, description="Agent status")


class AgentResponse(BaseModel):
    """Response model for agent data."""
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    status: str
    created_by: str
    created_at: str
    updated_at: str
    model_provider: str
    model_name: str
    temperature: int
    max_tokens: int
    total_sessions: int
    total_messages: int
    last_active_at: Optional[str]
    isolation_metadata: Dict[str, Any]


class WorkspaceAgentListResponse(BaseModel):
    """Response model for workspace agent lists."""
    agents: List[AgentResponse]
    total_count: int
    workspace_id: str
    user_access_level: str
    filters_applied: Dict[str, Any]


class WorkspaceAnalyticsResponse(BaseModel):
    """Response model for workspace agent analytics."""
    workspace_id: str
    total_agents: int
    active_agents: int
    total_sessions: int
    total_messages: int
    analytics_period: str
    generated_at: str


# API Routes

@router.post("/{workspace_id}/agents", response_model=AgentResponse)
async def create_workspace_agent(
    workspace_id: str = Path(..., description="Workspace ID"),
    agent_data: AgentCreateRequest = Body(...),
    session: SimSession = Depends(get_current_session)
) -> AgentResponse:
    """
    Create a new agent in specified workspace with complete isolation.

    This endpoint:
    - Validates workspace access and permissions
    - Creates agent with workspace-scoped isolation
    - Applies permission-based access control
    - Registers isolation metadata
    - Integrates with Sim's existing systems
    """
    logger.info(f"Creating workspace agent in workspace {workspace_id}")

    try:
        # 1. Validate workspace access and agent creation permissions
        can_create = await validate_workspace_agent_access(
            session, 'agent_creation', workspace_id
        )

        if not can_create:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to create agents in this workspace"
            )

        # 2. Convert request to agent configuration
        agent_config = {
            'name': agent_data.name,
            'description': agent_data.description,
            'system_prompt': agent_data.system_prompt,
            'model_provider': agent_data.model_provider,
            'model_name': agent_data.model_name,
            'temperature': agent_data.temperature,
            'max_tokens': agent_data.max_tokens,
            'composition_mode': agent_data.composition_mode,
        }

        # 3. Create workspace-isolated agent
        agent_result = await create_isolated_workspace_agent(
            session, workspace_id, agent_config, agent_data.isolation_level
        )

        # 4. Transform to response model
        return AgentResponse(
            id=agent_result['id'],
            workspace_id=workspace_id,
            name=agent_result['name'],
            description=agent_result.get('description'),
            status=agent_result['status'],
            created_by=agent_result['created_by'],
            created_at=agent_result['created_at'],
            updated_at=agent_result['updated_at'],
            model_provider=agent_result['model_provider'],
            model_name=agent_result['model_name'],
            temperature=agent_result['temperature'],
            max_tokens=agent_result['max_tokens'],
            total_sessions=agent_result.get('total_sessions', 0),
            total_messages=agent_result.get('total_messages', 0),
            last_active_at=agent_result.get('last_active_at'),
            isolation_metadata=agent_result['isolation_metadata']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating workspace agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workspace agent: {str(e)}"
        )


@router.get("/{workspace_id}/agents", response_model=WorkspaceAgentListResponse)
async def list_workspace_agents(
    workspace_id: str = Path(..., description="Workspace ID"),
    status: Optional[str] = Query(None, description="Filter by agent status"),
    created_by: Optional[str] = Query(None, description="Filter by creator"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of agents to return"),
    offset: int = Query(0, ge=0, description="Number of agents to skip"),
    session: SimSession = Depends(get_current_session)
) -> WorkspaceAgentListResponse:
    """
    List all agents in workspace with complete isolation.

    This endpoint:
    - Validates workspace access
    - Returns only agents user has permission to view
    - Applies workspace-scoped filtering
    - Includes isolation metadata
    - Prevents cross-workspace data access
    """
    logger.info(f"Listing workspace agents for workspace {workspace_id}")

    try:
        # 1. Validate workspace access
        can_view = await validate_workspace_agent_access(
            session, 'agent_interaction', workspace_id
        )

        if not can_view:
            raise HTTPException(
                status_code=403,
                detail="Access denied to workspace agents"
            )

        # 2. Build filters
        filters = {}
        if status:
            filters['status'] = status
        if created_by:
            filters['created_by'] = created_by

        filters['limit'] = limit
        filters['offset'] = offset

        # 3. Get workspace-isolated agents
        agents_data = await get_isolated_workspace_agents(
            session, workspace_id, filters
        )

        # 4. Get user's access level for workspace
        permission_context = await workspace_access_controller.get_workspace_permission_context(
            session, workspace_id
        )

        # 5. Transform agents to response format
        agent_responses = []
        for agent in agents_data:
            agent_response = AgentResponse(
                id=agent['id'],
                workspace_id=workspace_id,
                name=agent['name'],
                description=agent.get('description'),
                status=agent['status'],
                created_by=agent['created_by'],
                created_at=agent['created_at'],
                updated_at=agent['updated_at'],
                model_provider=agent['model_provider'],
                model_name=agent['model_name'],
                temperature=agent['temperature'],
                max_tokens=agent['max_tokens'],
                total_sessions=agent.get('total_sessions', 0),
                total_messages=agent.get('total_messages', 0),
                last_active_at=agent.get('last_active_at'),
                isolation_metadata=agent.get('isolation_metadata', {})
            )
            agent_responses.append(agent_response)

        return WorkspaceAgentListResponse(
            agents=agent_responses,
            total_count=len(agent_responses),
            workspace_id=workspace_id,
            user_access_level=permission_context.permission_level.value,
            filters_applied=filters
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing workspace agents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workspace agents: {str(e)}"
        )


@router.get("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def get_workspace_agent(
    workspace_id: str = Path(..., description="Workspace ID"),
    agent_id: str = Path(..., description="Agent ID"),
    session: SimSession = Depends(get_current_session)
) -> AgentResponse:
    """
    Get specific agent details with workspace isolation validation.

    This endpoint:
    - Validates workspace and agent access
    - Prevents cross-workspace agent access
    - Returns agent with isolation metadata
    - Applies permission-based filtering
    """
    logger.info(f"Getting agent {agent_id} from workspace {workspace_id}")

    try:
        # 1. Validate workspace and agent access
        has_access = await ensure_workspace_agent_isolation(
            session, agent_id, workspace_id
        )

        if not has_access:
            raise HTTPException(
                status_code=404,
                detail="Agent not found or access denied"
            )

        # 2. Get agent details with isolation
        async with get_async_session_context() as db_session:
            from packages.db.parlant_schema import parlantAgent

            agent_query = select(parlantAgent).where(
                and_(
                    parlantAgent.id == agent_id,
                    parlantAgent.workspaceId == workspace_id,
                    parlantAgent.deletedAt.is_(None)
                )
            )

            agent_result = await db_session.execute(agent_query)
            agent = agent_result.scalar_one_or_none()

            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")

            # 3. Get isolation metadata
            isolation_metadata = await workspace_isolation_manager._get_agent_isolation_metadata(
                agent_id
            )

            # 4. Transform to response
            return AgentResponse(
                id=str(agent.id),
                workspace_id=workspace_id,
                name=agent.name,
                description=agent.description,
                status=agent.status,
                created_by=agent.createdBy,
                created_at=agent.createdAt.isoformat(),
                updated_at=agent.updatedAt.isoformat(),
                model_provider=agent.modelProvider,
                model_name=agent.modelName,
                temperature=agent.temperature or 70,
                max_tokens=agent.maxTokens or 2000,
                total_sessions=agent.totalSessions,
                total_messages=agent.totalMessages,
                last_active_at=agent.lastActiveAt.isoformat() if agent.lastActiveAt else None,
                isolation_metadata=isolation_metadata or {}
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workspace agent: {str(e)}"
        )


@router.put("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def update_workspace_agent(
    workspace_id: str = Path(..., description="Workspace ID"),
    agent_id: str = Path(..., description="Agent ID"),
    agent_updates: AgentUpdateRequest = Body(...),
    session: SimSession = Depends(get_current_session)
) -> AgentResponse:
    """
    Update agent configuration with workspace isolation validation.

    This endpoint:
    - Validates configuration permissions
    - Applies workspace-scoped updates
    - Maintains isolation integrity
    - Logs configuration changes
    """
    logger.info(f"Updating agent {agent_id} in workspace {workspace_id}")

    try:
        # 1. Validate configuration access
        can_configure = await validate_workspace_agent_access(
            session, 'agent_configuration', workspace_id, agent_id
        )

        if not can_configure:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to configure this agent"
            )

        # 2. Update agent with workspace isolation
        async with get_async_session_context() as db_session:
            from packages.db.parlant_schema import parlantAgent

            # Get current agent
            agent_query = select(parlantAgent).where(
                and_(
                    parlantAgent.id == agent_id,
                    parlantAgent.workspaceId == workspace_id,
                    parlantAgent.deletedAt.is_(None)
                )
            )

            agent_result = await db_session.execute(agent_query)
            agent = agent_result.scalar_one_or_none()

            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")

            # 3. Apply updates
            update_data = agent_updates.dict(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(agent, field):
                    setattr(agent, field, value)

            agent.updatedAt = datetime.now()

            # 4. Commit changes
            await db_session.commit()

            # 5. Get updated isolation metadata
            isolation_metadata = await workspace_isolation_manager._get_agent_isolation_metadata(
                agent_id
            ) or {}

            return AgentResponse(
                id=str(agent.id),
                workspace_id=workspace_id,
                name=agent.name,
                description=agent.description,
                status=agent.status,
                created_by=agent.createdBy,
                created_at=agent.createdAt.isoformat(),
                updated_at=agent.updatedAt.isoformat(),
                model_provider=agent.modelProvider,
                model_name=agent.modelName,
                temperature=agent.temperature or 70,
                max_tokens=agent.maxTokens or 2000,
                total_sessions=agent.totalSessions,
                total_messages=agent.totalMessages,
                last_active_at=agent.lastActiveAt.isoformat() if agent.lastActiveAt else None,
                isolation_metadata=isolation_metadata
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workspace agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update workspace agent: {str(e)}"
        )


@router.delete("/{workspace_id}/agents/{agent_id}")
async def delete_workspace_agent(
    workspace_id: str = Path(..., description="Workspace ID"),
    agent_id: str = Path(..., description="Agent ID"),
    session: SimSession = Depends(get_current_session)
) -> JSONResponse:
    """
    Delete agent with workspace isolation validation and cleanup.

    This endpoint:
    - Validates deletion permissions
    - Performs soft delete with workspace scope
    - Cleans up isolation metadata
    - Maintains referential integrity
    """
    logger.info(f"Deleting agent {agent_id} from workspace {workspace_id}")

    try:
        # 1. Validate deletion access
        can_delete = await validate_workspace_agent_access(
            session, 'agent_deletion', workspace_id, agent_id
        )

        if not can_delete:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to delete this agent"
            )

        # 2. Perform soft delete with workspace isolation
        async with get_async_session_context() as db_session:
            from packages.db.parlant_schema import parlantAgent

            # Get and validate agent
            agent_query = select(parlantAgent).where(
                and_(
                    parlantAgent.id == agent_id,
                    parlantAgent.workspaceId == workspace_id,
                    parlantAgent.deletedAt.is_(None)
                )
            )

            agent_result = await db_session.execute(agent_query)
            agent = agent_result.scalar_one_or_none()

            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")

            # 3. Soft delete agent
            agent.deletedAt = datetime.now()
            agent.updatedAt = datetime.now()

            await db_session.commit()

            # 4. Clean up isolation metadata
            await workspace_isolation_manager._cleanup_agent_isolation_metadata(agent_id)

            logger.info(f"Successfully deleted agent {agent_id} from workspace {workspace_id}")

            return JSONResponse(
                content={
                    "message": "Agent deleted successfully",
                    "agent_id": agent_id,
                    "workspace_id": workspace_id,
                    "deleted_at": datetime.now().isoformat()
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspace agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete workspace agent: {str(e)}"
        )


@router.get("/{workspace_id}/analytics", response_model=WorkspaceAnalyticsResponse)
async def get_workspace_agent_analytics(
    workspace_id: str = Path(..., description="Workspace ID"),
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d)"),
    session: SimSession = Depends(get_current_session)
) -> WorkspaceAnalyticsResponse:
    """
    Get workspace-scoped agent analytics and usage statistics.

    This endpoint:
    - Validates workspace access
    - Returns isolated analytics data
    - Prevents cross-workspace data leakage
    - Provides usage insights
    """
    logger.info(f"Getting agent analytics for workspace {workspace_id}")

    try:
        # 1. Validate workspace access
        can_view = await validate_workspace_agent_access(
            session, 'agent_interaction', workspace_id
        )

        if not can_view:
            raise HTTPException(
                status_code=403,
                detail="Access denied to workspace analytics"
            )

        # 2. Generate workspace isolation report
        analytics_report = await workspace_isolation_manager.generate_workspace_isolation_report(
            session, workspace_id
        )

        # 3. Extract analytics data
        metrics = analytics_report.get('metrics', {})

        return WorkspaceAnalyticsResponse(
            workspace_id=workspace_id,
            total_agents=metrics.get('total_agents', 0),
            active_agents=metrics.get('active_agents', 0),
            total_sessions=metrics.get('total_sessions', 0),
            total_messages=metrics.get('total_messages', 0),
            analytics_period=period,
            generated_at=analytics_report['generated_at']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workspace analytics: {str(e)}"
        )


# Health check endpoint for workspace isolation
@router.get("/{workspace_id}/isolation/health")
async def check_workspace_isolation_health(
    workspace_id: str = Path(..., description="Workspace ID"),
    session: SimSession = Depends(get_current_session)
) -> JSONResponse:
    """
    Health check for workspace isolation system.

    Returns:
    - Isolation system status
    - Workspace-specific health metrics
    - Security validation results
    """
    try:
        # Validate workspace access
        can_view = await validate_workspace_agent_access(
            session, 'agent_interaction', workspace_id
        )

        if not can_view:
            raise HTTPException(status_code=403, detail="Access denied")

        # Generate health report
        health_report = await workspace_isolation_manager.generate_workspace_isolation_report(
            session, workspace_id
        )

        return JSONResponse(content={
            "status": "healthy",
            "workspace_id": workspace_id,
            "isolation_system": "operational",
            "security_validation": health_report.get('security_analysis', {}),
            "checked_at": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Workspace isolation health check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "error": str(e),
                "checked_at": datetime.now().isoformat()
            }
        )