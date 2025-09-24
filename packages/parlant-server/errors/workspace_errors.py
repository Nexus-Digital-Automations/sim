"""
Workspace Isolation Error Handling

Specialized error handling for workspace isolation violations and security boundaries
in the Parlant integration system.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from .base import (
    ParlantWorkspaceIsolationError,
    ErrorContext,
    ErrorSeverity
)
from .handlers import handle_workspace_isolation_error
from .monitoring import get_error_metrics


logger = logging.getLogger(__name__)


@dataclass
class WorkspaceSecurityEvent:
    """Security event related to workspace isolation"""
    timestamp: datetime
    event_type: str
    user_id: str
    attempted_workspace: str
    authorized_workspaces: List[str]
    resource_type: str
    resource_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)


class WorkspaceIsolationValidator:
    """
    Validates and enforces workspace isolation boundaries.

    Features:
    - Strict workspace access validation
    - Cross-workspace access prevention
    - Resource ownership verification
    - Security event logging and monitoring
    """

    def __init__(self):
        self.security_events: List[WorkspaceSecurityEvent] = []
        self.max_events = 10000  # Keep last 10k events
        self.violation_thresholds = {
            'per_user_per_hour': 20,
            'per_ip_per_hour': 100
        }

    def validate_agent_access(
        self,
        user_id: str,
        agent_id: str,
        user_workspaces: List[Dict[str, Any]],
        agent_workspace: str,
        context: Optional[ErrorContext] = None
    ):
        """Validate user can access agent in specific workspace"""
        user_workspace_ids = [ws.get('id') for ws in user_workspaces if ws.get('id')]

        if agent_workspace not in user_workspace_ids:
            self._record_security_event(
                event_type="agent_access_violation",
                user_id=user_id,
                attempted_workspace=agent_workspace,
                authorized_workspaces=user_workspace_ids,
                resource_type="agent",
                resource_id=agent_id,
                context=context
            )

            raise handle_workspace_isolation_error(
                attempted_workspace=agent_workspace,
                authorized_workspaces=user_workspace_ids,
                message=f"Agent {agent_id} belongs to workspace {agent_workspace} which you don't have access to",
                error_code="AGENT_WORKSPACE_ISOLATION_VIOLATION",
                context=context
            )

    def validate_session_access(
        self,
        user_id: str,
        session_id: str,
        user_workspaces: List[Dict[str, Any]],
        session_workspace: str,
        session_owner: Optional[str] = None,
        context: Optional[ErrorContext] = None
    ):
        """Validate user can access session in specific workspace"""
        user_workspace_ids = [ws.get('id') for ws in user_workspaces if ws.get('id')]

        # Check workspace access
        if session_workspace not in user_workspace_ids:
            self._record_security_event(
                event_type="session_workspace_violation",
                user_id=user_id,
                attempted_workspace=session_workspace,
                authorized_workspaces=user_workspace_ids,
                resource_type="session",
                resource_id=session_id,
                context=context
            )

            raise handle_workspace_isolation_error(
                attempted_workspace=session_workspace,
                authorized_workspaces=user_workspace_ids,
                message=f"Session {session_id} belongs to workspace {session_workspace} which you don't have access to",
                error_code="SESSION_WORKSPACE_ISOLATION_VIOLATION",
                context=context
            )

        # Additional check for session ownership (if required)
        if session_owner and session_owner != user_id:
            # Check if user has admin privileges in the workspace
            user_workspace = next(
                (ws for ws in user_workspaces if ws.get('id') == session_workspace),
                None
            )

            if not user_workspace or user_workspace.get('role') not in ['admin', 'owner']:
                self._record_security_event(
                    event_type="session_ownership_violation",
                    user_id=user_id,
                    attempted_workspace=session_workspace,
                    authorized_workspaces=user_workspace_ids,
                    resource_type="session",
                    resource_id=session_id,
                    context=context,
                    additional_data={
                        'session_owner': session_owner,
                        'user_role': user_workspace.get('role') if user_workspace else None
                    }
                )

                raise handle_workspace_isolation_error(
                    attempted_workspace=session_workspace,
                    authorized_workspaces=user_workspace_ids,
                    message="Access denied to session owned by another user",
                    error_code="SESSION_OWNERSHIP_VIOLATION",
                    context=context
                )

    def validate_cross_workspace_operation(
        self,
        user_id: str,
        source_workspace: str,
        target_workspace: str,
        operation: str,
        user_workspaces: List[Dict[str, Any]],
        context: Optional[ErrorContext] = None
    ):
        """Validate cross-workspace operations (usually prohibited)"""
        user_workspace_ids = [ws.get('id') for ws in user_workspaces if ws.get('id')]

        # Check access to both workspaces
        if source_workspace not in user_workspace_ids or target_workspace not in user_workspace_ids:
            missing_access = []
            if source_workspace not in user_workspace_ids:
                missing_access.append(source_workspace)
            if target_workspace not in user_workspace_ids:
                missing_access.append(target_workspace)

            self._record_security_event(
                event_type="cross_workspace_violation",
                user_id=user_id,
                attempted_workspace=target_workspace,
                authorized_workspaces=user_workspace_ids,
                resource_type="operation",
                resource_id=operation,
                context=context,
                additional_data={
                    'source_workspace': source_workspace,
                    'operation': operation,
                    'missing_access': missing_access
                }
            )

            raise handle_workspace_isolation_error(
                attempted_workspace=target_workspace,
                authorized_workspaces=user_workspace_ids,
                message=f"Cross-workspace operation '{operation}' denied. Missing access to workspace(s): {', '.join(missing_access)}",
                error_code="CROSS_WORKSPACE_OPERATION_DENIED",
                context=context
            )

    def validate_data_export(
        self,
        user_id: str,
        workspace_id: str,
        data_type: str,
        user_workspaces: List[Dict[str, Any]],
        context: Optional[ErrorContext] = None
    ):
        """Validate data export operations with enhanced security"""
        user_workspace_ids = [ws.get('id') for ws in user_workspaces if ws.get('id')]

        if workspace_id not in user_workspace_ids:
            self._record_security_event(
                event_type="data_export_violation",
                user_id=user_id,
                attempted_workspace=workspace_id,
                authorized_workspaces=user_workspace_ids,
                resource_type="data_export",
                resource_id=data_type,
                context=context
            )

            raise handle_workspace_isolation_error(
                attempted_workspace=workspace_id,
                authorized_workspaces=user_workspace_ids,
                message=f"Data export denied for {data_type} from workspace {workspace_id}",
                error_code="DATA_EXPORT_ISOLATION_VIOLATION",
                context=context
            )

        # Additional validation for sensitive data types
        sensitive_data_types = ['sessions', 'messages', 'user_data', 'configuration']
        if data_type in sensitive_data_types:
            user_workspace = next(
                (ws for ws in user_workspaces if ws.get('id') == workspace_id),
                None
            )

            if not user_workspace or user_workspace.get('role') not in ['admin', 'owner']:
                self._record_security_event(
                    event_type="sensitive_data_export_violation",
                    user_id=user_id,
                    attempted_workspace=workspace_id,
                    authorized_workspaces=user_workspace_ids,
                    resource_type="sensitive_data_export",
                    resource_id=data_type,
                    context=context,
                    additional_data={
                        'user_role': user_workspace.get('role') if user_workspace else None
                    }
                )

                raise handle_workspace_isolation_error(
                    attempted_workspace=workspace_id,
                    authorized_workspaces=user_workspace_ids,
                    message=f"Insufficient privileges to export {data_type} data",
                    error_code="INSUFFICIENT_PRIVILEGES_DATA_EXPORT",
                    context=context
                )

    def check_violation_patterns(self, user_id: str) -> Dict[str, Any]:
        """Check for suspicious violation patterns"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)

        # Get recent violations for user
        user_violations = [
            event for event in self.security_events
            if event.user_id == user_id and event.timestamp >= hour_ago
        ]

        # Analyze patterns
        violation_analysis = {
            'total_violations': len(user_violations),
            'unique_workspaces_attempted': len(set(
                event.attempted_workspace for event in user_violations
            )),
            'violation_types': {},
            'time_pattern': {},
            'risk_level': 'low'
        }

        # Count violation types
        for event in user_violations:
            violation_analysis['violation_types'][event.event_type] = (
                violation_analysis['violation_types'].get(event.event_type, 0) + 1
            )

        # Analyze time distribution
        for event in user_violations:
            hour_key = event.timestamp.strftime('%H')
            violation_analysis['time_pattern'][hour_key] = (
                violation_analysis['time_pattern'].get(hour_key, 0) + 1
            )

        # Determine risk level
        if len(user_violations) >= self.violation_thresholds['per_user_per_hour']:
            violation_analysis['risk_level'] = 'critical'
        elif len(user_violations) >= self.violation_thresholds['per_user_per_hour'] * 0.5:
            violation_analysis['risk_level'] = 'high'
        elif len(user_violations) >= self.violation_thresholds['per_user_per_hour'] * 0.25:
            violation_analysis['risk_level'] = 'medium'

        return violation_analysis

    def _record_security_event(
        self,
        event_type: str,
        user_id: str,
        attempted_workspace: str,
        authorized_workspaces: List[str],
        resource_type: str,
        resource_id: str,
        context: Optional[ErrorContext] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Record workspace security event"""
        event = WorkspaceSecurityEvent(
            timestamp=datetime.now(),
            event_type=event_type,
            user_id=user_id,
            attempted_workspace=attempted_workspace,
            authorized_workspaces=authorized_workspaces.copy(),
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=context.ip_address if context else None,
            user_agent=context.user_agent if context else None,
            context=context.to_dict() if context else {}
        )

        if additional_data:
            event.context.update(additional_data)

        # Add to events list
        self.security_events.append(event)

        # Maintain size limit
        if len(self.security_events) > self.max_events:
            self.security_events = self.security_events[-self.max_events:]

        # Log security event
        logger.error(f"Workspace isolation violation: {event_type}", extra={
            'user_id': user_id,
            'attempted_workspace': attempted_workspace,
            'authorized_workspaces': authorized_workspaces,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'event_type': event_type,
            'ip_address': event.ip_address,
            'timestamp': event.timestamp.isoformat()
        })

        # Record metrics
        metrics = get_error_metrics()
        metrics.increment_counter('workspace_violations', {
            'event_type': event_type,
            'resource_type': resource_type
        })

        # Check for suspicious patterns
        violation_analysis = self.check_violation_patterns(user_id)
        if violation_analysis['risk_level'] in ['high', 'critical']:
            logger.critical(f"HIGH RISK: Suspicious workspace violation pattern detected", extra={
                'user_id': user_id,
                'risk_level': violation_analysis['risk_level'],
                'violation_count': violation_analysis['total_violations'],
                'unique_workspaces': violation_analysis['unique_workspaces_attempted']
            })

    def get_security_stats(self) -> Dict[str, Any]:
        """Get workspace security statistics"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)

        recent_events = [e for e in self.security_events if e.timestamp >= hour_ago]
        daily_events = [e for e in self.security_events if e.timestamp >= day_ago]

        return {
            'total_events': len(self.security_events),
            'recent_events_1h': len(recent_events),
            'daily_events_24h': len(daily_events),
            'event_types': {
                event_type: sum(1 for e in recent_events if e.event_type == event_type)
                for event_type in set(e.event_type for e in recent_events)
            },
            'top_violating_users': self._get_top_violating_users(recent_events),
            'high_risk_users': self._get_high_risk_users()
        }

    def _get_top_violating_users(self, events: List[WorkspaceSecurityEvent], limit: int = 5) -> List[Dict[str, Any]]:
        """Get users with most violations"""
        user_counts = {}
        for event in events:
            user_counts[event.user_id] = user_counts.get(event.user_id, 0) + 1

        top_users = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{'user_id': user_id, 'violation_count': count} for user_id, count in top_users]

    def _get_high_risk_users(self) -> List[str]:
        """Get users with high-risk violation patterns"""
        high_risk_users = []
        user_ids = set(event.user_id for event in self.security_events)

        for user_id in user_ids:
            analysis = self.check_violation_patterns(user_id)
            if analysis['risk_level'] in ['high', 'critical']:
                high_risk_users.append(user_id)

        return high_risk_users


# Global validator instance
_workspace_validator: Optional[WorkspaceIsolationValidator] = None


def get_workspace_validator() -> WorkspaceIsolationValidator:
    """Get global workspace isolation validator"""
    global _workspace_validator
    if _workspace_validator is None:
        _workspace_validator = WorkspaceIsolationValidator()
    return _workspace_validator


# Convenience functions
def validate_agent_workspace_access(
    user_id: str,
    agent_id: str,
    user_workspaces: List[Dict[str, Any]],
    agent_workspace: str,
    context: Optional[ErrorContext] = None
):
    """Validate user can access agent in workspace"""
    validator = get_workspace_validator()
    validator.validate_agent_access(user_id, agent_id, user_workspaces, agent_workspace, context)


def validate_session_workspace_access(
    user_id: str,
    session_id: str,
    user_workspaces: List[Dict[str, Any]],
    session_workspace: str,
    session_owner: Optional[str] = None,
    context: Optional[ErrorContext] = None
):
    """Validate user can access session in workspace"""
    validator = get_workspace_validator()
    validator.validate_session_access(
        user_id, session_id, user_workspaces, session_workspace, session_owner, context
    )


def validate_workspace_data_export(
    user_id: str,
    workspace_id: str,
    data_type: str,
    user_workspaces: List[Dict[str, Any]],
    context: Optional[ErrorContext] = None
):
    """Validate data export from workspace"""
    validator = get_workspace_validator()
    validator.validate_data_export(user_id, workspace_id, data_type, user_workspaces, context)


def get_workspace_security_stats() -> Dict[str, Any]:
    """Get workspace security statistics"""
    validator = get_workspace_validator()
    return validator.get_security_stats()


def check_user_violation_pattern(user_id: str) -> Dict[str, Any]:
    """Check violation patterns for specific user"""
    validator = get_workspace_validator()
    return validator.check_violation_patterns(user_id)