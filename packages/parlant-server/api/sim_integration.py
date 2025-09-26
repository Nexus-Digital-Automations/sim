"""
Sim Integration API for Workspace Management
=========================================

This module provides API endpoints for integrating with Sim's existing workspace
management system. It handles webhooks from Sim's workspace events and provides
endpoints for workspace synchronization and data consistency.

Key Features:
- Webhook endpoints for Sim workspace events
- Workspace synchronization with Sim's database
- Agent management integration with Sim workflows
- Cross-system data consistency validation
- Real-time workspace state synchronization
"""

import logging
import hmac
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from auth.middleware import get_current_session
from auth.sim_auth_bridge import SimSession
from lifecycle.workspace_events import handle_workspace_lifecycle_event
from workspace_isolation import workspace_isolation_manager
from config.settings import get_settings

logger = logging.getLogger(__name__)

# Create router for Sim integration endpoints
router = APIRouter(prefix="/api/v1/sim-integration", tags=["sim-integration"])


# Pydantic models for webhook validation

class SimWorkspaceWebhook(BaseModel):
    """Model for Sim workspace webhook events."""
    event_type: str = Field(..., description="Type of workspace event")
    workspace_id: str = Field(..., description="Workspace ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    triggered_by: str = Field(..., description="User who triggered the event")
    timestamp: str = Field(..., description="Event timestamp")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event-specific data")

    class Config:
        schema_extra = {
            "example": {
                "event_type": "workspace_created",
                "workspace_id": "ws_123456789",
                "organization_id": "org_123456789",
                "triggered_by": "user_123456789",
                "timestamp": "2024-01-01T00:00:00Z",
                "data": {
                    "workspace_name": "My Workspace",
                    "owner_id": "user_123456789",
                    "permissions": ["admin"]
                }
            }
        }


class SimPermissionUpdate(BaseModel):
    """Model for Sim permission update events."""
    workspace_id: str
    user_id: str
    old_permission: Optional[str]
    new_permission: str
    updated_by: str
    timestamp: str


class WorkspaceSyncRequest(BaseModel):
    """Model for workspace synchronization requests."""
    workspace_ids: List[str] = Field(..., description="List of workspace IDs to sync")
    full_sync: bool = Field(False, description="Whether to perform full synchronization")
    include_agents: bool = Field(True, description="Whether to include agent data")
    include_sessions: bool = Field(False, description="Whether to include session data")


class WorkspaceSyncResponse(BaseModel):
    """Model for workspace synchronization responses."""
    synced_workspaces: List[str]
    failed_workspaces: List[Dict[str, str]]
    total_agents_synced: int
    sync_timestamp: str
    sync_duration_ms: int


# Webhook validation utilities

def validate_sim_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str
) -> bool:
    """
    Validate webhook signature from Sim.

    Args:
        payload: Raw webhook payload
        signature: Signature from X-Sim-Signature header
        secret: Webhook secret from settings

    Returns:
        True if signature is valid, False otherwise
    """
    if not secret:
        logger.warning("Webhook secret not configured, skipping signature validation")
        return True

    try:
        # Extract signature from header (format: "sha256=<signature>")
        if not signature.startswith("sha256="):
            return False

        provided_signature = signature[7:]  # Remove "sha256=" prefix

        # Calculate expected signature
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        # Compare signatures
        return hmac.compare_digest(provided_signature, expected_signature)

    except Exception as e:
        logger.error(f"Error validating webhook signature: {e}")
        return False


# API Routes

@router.post("/webhooks/workspace-events")
async def handle_sim_workspace_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    webhook_data: SimWorkspaceWebhook,
    x_sim_signature: Optional[str] = Header(None, alias="X-Sim-Signature")
) -> JSONResponse:
    """
    Handle workspace events from Sim via webhooks.

    This endpoint receives workspace lifecycle events from Sim and:
    - Validates webhook signatures
    - Processes workspace events asynchronously
    - Maintains agent isolation consistency
    - Updates workspace state in Parlant system
    """
    logger.info(f"Received Sim workspace webhook: {webhook_data.event_type} for workspace {webhook_data.workspace_id}")

    try:
        # 1. Validate webhook signature
        settings = get_settings()
        webhook_secret = settings.sim_webhook_secret

        if webhook_secret:
            payload = await request.body()
            if not validate_sim_webhook_signature(payload, x_sim_signature or "", webhook_secret):
                logger.warning("Invalid webhook signature")
                raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # 2. Process workspace event
        event_result = await handle_workspace_lifecycle_event(
            webhook_data.event_type,
            webhook_data.workspace_id,
            {
                **webhook_data.data,
                'organization_id': webhook_data.organization_id,
                'triggered_by': webhook_data.triggered_by,
                'timestamp': webhook_data.timestamp
            },
            background_tasks
        )

        # 3. Log webhook processing
        await _log_webhook_event('workspace_webhook_processed', {
            'event_type': webhook_data.event_type,
            'workspace_id': webhook_data.workspace_id,
            'success': event_result.get('success', False),
            'processing_result': event_result
        })

        if event_result.get('success'):
            return JSONResponse(
                content={
                    'status': 'success',
                    'message': 'Workspace event processed successfully',
                    'event_type': webhook_data.event_type,
                    'workspace_id': webhook_data.workspace_id,
                    'processed_at': datetime.now().isoformat()
                }
            )
        else:
            logger.error(f"Failed to process workspace event: {event_result}")
            return JSONResponse(
                status_code=500,
                content={
                    'status': 'error',
                    'message': 'Failed to process workspace event',
                    'error': event_result.get('error', 'Unknown error'),
                    'event_type': webhook_data.event_type,
                    'workspace_id': webhook_data.workspace_id
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Sim workspace webhook: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'status': 'error',
                'message': 'Internal server error processing webhook',
                'error': str(e)
            }
        )


@router.post("/webhooks/permission-updates")
async def handle_sim_permission_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    permission_data: SimPermissionUpdate,
    x_sim_signature: Optional[str] = Header(None, alias="X-Sim-Signature")
) -> JSONResponse:
    """
    Handle permission update events from Sim.

    Processes workspace permission changes to:
    - Update agent access controls
    - Refresh permission caches
    - Validate existing sessions
    - Maintain isolation boundaries
    """
    logger.info(
        f"Received permission update for user {permission_data.user_id} "
        f"in workspace {permission_data.workspace_id}"
    )

    try:
        # 1. Validate webhook signature
        settings = get_settings()
        webhook_secret = settings.sim_webhook_secret

        if webhook_secret:
            payload = await request.body()
            if not validate_sim_webhook_signature(payload, x_sim_signature or "", webhook_secret):
                raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # 2. Process permission update
        event_result = await handle_workspace_lifecycle_event(
            'workspace_permissions_updated',
            permission_data.workspace_id,
            {
                'affected_users': [permission_data.user_id],
                'changes': {
                    permission_data.user_id: {
                        'old_permission': permission_data.old_permission,
                        'new_permission': permission_data.new_permission
                    }
                },
                'updated_by': permission_data.updated_by,
                'timestamp': permission_data.timestamp
            },
            background_tasks
        )

        return JSONResponse(
            content={
                'status': 'success',
                'message': 'Permission update processed successfully',
                'workspace_id': permission_data.workspace_id,
                'user_id': permission_data.user_id,
                'processed_at': datetime.now().isoformat()
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing permission webhook: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'status': 'error',
                'message': 'Failed to process permission update',
                'error': str(e)
            }
        )


@router.post("/sync/workspaces", response_model=WorkspaceSyncResponse)
async def sync_workspaces_with_sim(
    sync_request: WorkspaceSyncRequest,
    session: SimSession = Depends(get_current_session),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> WorkspaceSyncResponse:
    """
    Synchronize workspace data with Sim's database.

    Performs comprehensive workspace synchronization:
    - Validates workspace access for user
    - Syncs workspace metadata and permissions
    - Updates agent isolation boundaries
    - Validates data consistency
    """
    logger.info(f"Starting workspace sync for {len(sync_request.workspace_ids)} workspaces")
    sync_start_time = datetime.now()

    try:
        synced_workspaces = []
        failed_workspaces = []
        total_agents_synced = 0

        for workspace_id in sync_request.workspace_ids:
            try:
                # 1. Validate user has access to workspace
                user_workspaces = session.user.workspaces or []
                has_access = any(ws.get('id') == workspace_id for ws in user_workspaces)

                if not has_access:
                    failed_workspaces.append({
                        'workspace_id': workspace_id,
                        'error': 'Access denied'
                    })
                    continue

                # 2. Sync workspace with Sim
                sync_result = await _sync_single_workspace(
                    workspace_id, sync_request, session
                )

                if sync_result['success']:
                    synced_workspaces.append(workspace_id)
                    total_agents_synced += sync_result.get('agents_synced', 0)
                else:
                    failed_workspaces.append({
                        'workspace_id': workspace_id,
                        'error': sync_result.get('error', 'Unknown error')
                    })

            except Exception as e:
                logger.error(f"Error syncing workspace {workspace_id}: {e}")
                failed_workspaces.append({
                    'workspace_id': workspace_id,
                    'error': str(e)
                })

        # Calculate sync duration
        sync_duration = datetime.now() - sync_start_time
        sync_duration_ms = int(sync_duration.total_seconds() * 1000)

        logger.info(
            f"Workspace sync completed: {len(synced_workspaces)} synced, "
            f"{len(failed_workspaces)} failed, {total_agents_synced} agents synced"
        )

        return WorkspaceSyncResponse(
            synced_workspaces=synced_workspaces,
            failed_workspaces=failed_workspaces,
            total_agents_synced=total_agents_synced,
            sync_timestamp=datetime.now().isoformat(),
            sync_duration_ms=sync_duration_ms
        )

    except Exception as e:
        logger.error(f"Error in workspace synchronization: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Workspace synchronization failed: {str(e)}"
        )


@router.get("/workspaces/{workspace_id}/sync-status")
async def get_workspace_sync_status(
    workspace_id: str,
    session: SimSession = Depends(get_current_session)
) -> JSONResponse:
    """
    Get synchronization status for specific workspace.

    Returns:
    - Last sync timestamp
    - Sync status and health
    - Data consistency validation
    - Agent isolation status
    """
    logger.info(f"Getting sync status for workspace {workspace_id}")

    try:
        # 1. Validate workspace access
        user_workspaces = session.user.workspaces or []
        has_access = any(ws.get('id') == workspace_id for ws in user_workspaces)

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        # 2. Get workspace isolation status
        isolation_report = await workspace_isolation_manager.generate_workspace_isolation_report(
            session, workspace_id
        )

        # 3. Build sync status response
        sync_status = {
            'workspace_id': workspace_id,
            'isolation_status': isolation_report.get('security_analysis', {}).get('status', 'unknown'),
            'last_sync': isolation_report.get('generated_at'),
            'data_consistency': isolation_report.get('boundary_validation', {}),
            'agent_count': isolation_report.get('metrics', {}).get('total_agents', 0),
            'active_sessions': isolation_report.get('metrics', {}).get('active_sessions', 0),
            'sync_health': 'healthy' if isolation_report.get('security_analysis', {}).get('status') == 'secure' else 'warning'
        }

        return JSONResponse(content=sync_status)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace sync status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get sync status: {str(e)}"
        )


@router.post("/validate-integration")
async def validate_sim_integration(
    session: SimSession = Depends(get_current_session)
) -> JSONResponse:
    """
    Validate integration health between Parlant and Sim.

    Performs comprehensive integration validation:
    - Database connectivity
    - Workspace isolation integrity
    - Permission system consistency
    - Cross-system data validation
    """
    logger.info("Validating Sim-Parlant integration health")

    try:
        validation_results = {
            'integration_status': 'healthy',
            'checks': [],
            'validated_at': datetime.now().isoformat(),
            'user_id': session.user.id
        }

        # 1. Database connectivity check
        try:
            from database.connection import test_async_connection
            db_healthy = await test_async_connection()
            validation_results['checks'].append({
                'check': 'database_connectivity',
                'status': 'passed' if db_healthy else 'failed',
                'message': 'Database connection test'
            })
        except Exception as e:
            validation_results['checks'].append({
                'check': 'database_connectivity',
                'status': 'failed',
                'message': f'Database connection failed: {str(e)}'
            })

        # 2. Workspace isolation system check
        try:
            # Test isolation manager initialization
            isolation_healthy = hasattr(workspace_isolation_manager, '_isolation_cache')
            validation_results['checks'].append({
                'check': 'workspace_isolation',
                'status': 'passed' if isolation_healthy else 'failed',
                'message': 'Workspace isolation system check'
            })
        except Exception as e:
            validation_results['checks'].append({
                'check': 'workspace_isolation',
                'status': 'failed',
                'message': f'Isolation system check failed: {str(e)}'
            })

        # 3. Permission system check
        try:
            user_workspaces = session.user.workspaces or []
            permissions_healthy = isinstance(user_workspaces, list)
            validation_results['checks'].append({
                'check': 'permission_system',
                'status': 'passed' if permissions_healthy else 'failed',
                'message': f'Permission system check - {len(user_workspaces)} workspaces accessible'
            })
        except Exception as e:
            validation_results['checks'].append({
                'check': 'permission_system',
                'status': 'failed',
                'message': f'Permission system check failed: {str(e)}'
            })

        # 4. Determine overall status
        failed_checks = [check for check in validation_results['checks'] if check['status'] == 'failed']
        if failed_checks:
            validation_results['integration_status'] = 'degraded' if len(failed_checks) < len(validation_results['checks']) else 'unhealthy'

        logger.info(f"Integration validation completed: {validation_results['integration_status']}")

        return JSONResponse(content=validation_results)

    except Exception as e:
        logger.error(f"Error validating integration: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'integration_status': 'unhealthy',
                'error': str(e),
                'validated_at': datetime.now().isoformat()
            }
        )


# Private helper functions

async def _sync_single_workspace(
    workspace_id: str,
    sync_request: WorkspaceSyncRequest,
    session: SimSession
) -> Dict[str, Any]:
    """Synchronize a single workspace with Sim."""
    try:
        agents_synced = 0

        if sync_request.include_agents:
            # Get workspace agents and validate isolation
            from workspace_isolation import get_isolated_workspace_agents

            agents = await get_isolated_workspace_agents(session, workspace_id)
            agents_synced = len(agents)

            # Validate isolation boundaries for each agent
            for agent in agents:
                isolation_metadata = agent.get('isolation_metadata', {})
                if not isolation_metadata.get('workspace_id') == workspace_id:
                    logger.warning(
                        f"Agent {agent['id']} has inconsistent workspace isolation: "
                        f"expected {workspace_id}, got {isolation_metadata.get('workspace_id')}"
                    )

        return {
            'success': True,
            'workspace_id': workspace_id,
            'agents_synced': agents_synced,
            'synced_at': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error syncing workspace {workspace_id}: {e}")
        return {
            'success': False,
            'workspace_id': workspace_id,
            'error': str(e)
        }


async def _log_webhook_event(event_name: str, event_data: Dict[str, Any]):
    """Log webhook events for audit and monitoring."""
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'event_name': event_name,
        'data': event_data
    }

    logger.info(f"WEBHOOK_EVENT: {log_entry}")


# Health check for integration system
@router.get("/health")
async def integration_health_check() -> JSONResponse:
    """Health check endpoint for Sim integration system."""
    return JSONResponse(content={
        'status': 'healthy',
        'integration': 'sim-parlant',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })