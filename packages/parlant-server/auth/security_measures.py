"""
Security Measures for Cross-Workspace Access Prevention

This module implements comprehensive security measures to prevent unauthorized
cross-workspace access in the Parlant system, ensuring complete data isolation
and security boundary enforcement.

Features:
- Real-time security monitoring
- Cross-workspace access detection
- Automatic threat response
- Security audit logging
- Anomaly detection
- Rate limiting and throttling
- IP-based access control
- Session hijacking prevention
"""

import logging
from typing import Dict, Any, Optional, List, Set, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import ipaddress
from collections import defaultdict, deque
import asyncio
import uuid

from fastapi import HTTPException, Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth.sim_auth_bridge import SimSession
from auth.workspace_isolation import WorkspaceContext


logger = logging.getLogger(__name__)


class SecurityLevel(Enum):
    """Security threat levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatType(Enum):
    """Types of security threats."""
    CROSS_WORKSPACE_ACCESS = "cross_workspace_access"
    SESSION_HIJACKING = "session_hijacking"
    RATE_LIMIT_VIOLATION = "rate_limit_violation"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_EXFILTRATION = "data_exfiltration"
    UNAUTHORIZED_TOOL_ACCESS = "unauthorized_tool_access"


class ResponseAction(Enum):
    """Security response actions."""
    LOG_ONLY = "log_only"
    THROTTLE = "throttle"
    TEMPORARY_BLOCK = "temporary_block"
    PERMANENT_BLOCK = "permanent_block"
    INVALIDATE_SESSION = "invalidate_session"
    ALERT_ADMIN = "alert_admin"


@dataclass
class SecurityEvent:
    """Represents a security event."""
    event_id: str
    timestamp: datetime
    threat_type: ThreatType
    security_level: SecurityLevel
    user_id: Optional[str]
    session_id: Optional[str]
    workspace_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    response_actions: List[ResponseAction] = field(default_factory=list)

    def __post_init__(self):
        if not self.event_id:
            self.event_id = f"sec_{uuid.uuid4().hex[:12]}"


@dataclass
class AccessPattern:
    """Represents user access patterns for anomaly detection."""
    user_id: str
    workspace_accesses: Dict[str, int] = field(default_factory=dict)
    resource_accesses: Dict[str, int] = field(default_factory=dict)
    time_patterns: List[datetime] = field(default_factory=list)
    ip_addresses: Set[str] = field(default_factory=set)
    user_agents: Set[str] = field(default_factory=set)
    last_updated: datetime = field(default_factory=datetime.now)

    @property
    def is_suspicious(self) -> bool:
        """Check if access pattern is suspicious."""
        # Multiple workspace access in short time
        if len(self.workspace_accesses) > 5 and len(self.time_patterns) > 20:
            recent_accesses = [t for t in self.time_patterns if datetime.now() - t < timedelta(minutes=10)]
            if len(recent_accesses) > 15:
                return True

        # Multiple IP addresses
        if len(self.ip_addresses) > 3:
            return True

        # Multiple user agents (potential bot)
        if len(self.user_agents) > 2:
            return True

        return False


class SecurityMonitor:
    """
    Comprehensive security monitoring system for workspace isolation.

    Provides real-time monitoring, threat detection, and automated response
    to security events and cross-workspace access attempts.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session

        # Security event storage
        self._security_events: deque = deque(maxlen=10000)  # Keep last 10k events
        self._event_counts: Dict[ThreatType, int] = defaultdict(int)

        # User access patterns for anomaly detection
        self._access_patterns: Dict[str, AccessPattern] = {}

        # Rate limiting
        self._rate_limits: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self._blocked_ips: Dict[str, datetime] = {}
        self._blocked_users: Dict[str, datetime] = {}

        # Session security tracking
        self._session_security: Dict[str, Dict[str, Any]] = {}

        # Configuration
        self.rate_limit_requests_per_minute = 60
        self.rate_limit_window = timedelta(minutes=1)
        self.block_duration = timedelta(minutes=15)
        self.max_cross_workspace_attempts = 5

    async def validate_workspace_access_security(
        self,
        request: Request,
        user_id: str,
        workspace_id: str,
        resource_type: str,
        resource_id: str,
        session: SimSession
    ) -> bool:
        """
        Comprehensive security validation for workspace access.

        Args:
            request: HTTP request object
            user_id: User requesting access
            workspace_id: Target workspace
            resource_type: Type of resource being accessed
            resource_id: Resource identifier
            session: Authenticated session

        Returns:
            True if access is secure, False if blocked

        Raises:
            HTTPException: For security violations
        """
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        try:
            # Check if IP or user is blocked
            if self._is_blocked(client_ip, user_id):
                await self._log_security_event(
                    ThreatType.RATE_LIMIT_VIOLATION,
                    SecurityLevel.HIGH,
                    user_id=user_id,
                    session_id=session.id,
                    workspace_id=workspace_id,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    details={
                        'reason': 'blocked_access_attempt',
                        'resource_type': resource_type,
                        'resource_id': resource_id
                    }
                )
                raise HTTPException(status_code=429, detail="Access temporarily blocked")

            # Rate limiting check
            if not await self._check_rate_limits(user_id, client_ip):
                await self._apply_temporary_block(user_id, client_ip)
                raise HTTPException(status_code=429, detail="Rate limit exceeded")

            # Validate session security
            if not await self._validate_session_security(session, client_ip, user_agent):
                await self._log_security_event(
                    ThreatType.SESSION_HIJACKING,
                    SecurityLevel.CRITICAL,
                    user_id=user_id,
                    session_id=session.id,
                    workspace_id=workspace_id,
                    ip_address=client_ip,
                    details={'reason': 'session_security_violation'}
                )
                raise HTTPException(status_code=401, detail="Session security violation")

            # Check for cross-workspace access patterns
            if await self._detect_cross_workspace_anomaly(
                user_id, workspace_id, resource_type, resource_id
            ):
                await self._log_security_event(
                    ThreatType.CROSS_WORKSPACE_ACCESS,
                    SecurityLevel.HIGH,
                    user_id=user_id,
                    session_id=session.id,
                    workspace_id=workspace_id,
                    ip_address=client_ip,
                    details={
                        'reason': 'suspicious_cross_workspace_pattern',
                        'resource_type': resource_type,
                        'resource_id': resource_id
                    }
                )
                # Don't block immediately, but monitor closely
                await self._increase_monitoring_level(user_id)

            # Update access patterns
            await self._update_access_patterns(
                user_id, workspace_id, resource_type, client_ip, user_agent
            )

            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Security validation error: {e}")
            # Fail secure - deny access on unexpected errors
            return False

    async def detect_and_prevent_data_exfiltration(
        self,
        user_id: str,
        workspace_id: str,
        operation: str,
        data_size: int,
        session: SimSession
    ) -> bool:
        """
        Detect and prevent potential data exfiltration attempts.

        Args:
            user_id: User performing operation
            workspace_id: Source workspace
            operation: Type of operation
            data_size: Size of data being accessed
            session: Authenticated session

        Returns:
            True if operation is allowed, False if blocked
        """
        try:
            # Check for large data access patterns
            if data_size > 10 * 1024 * 1024:  # 10MB threshold
                recent_large_accesses = await self._count_recent_large_accesses(user_id)
                if recent_large_accesses > 5:
                    await self._log_security_event(
                        ThreatType.DATA_EXFILTRATION,
                        SecurityLevel.HIGH,
                        user_id=user_id,
                        session_id=session.id,
                        workspace_id=workspace_id,
                        details={
                            'operation': operation,
                            'data_size': data_size,
                            'recent_large_accesses': recent_large_accesses
                        }
                    )
                    return False

            # Check for bulk export patterns
            if operation in ['export', 'download', 'bulk_retrieve']:
                recent_exports = await self._count_recent_exports(user_id)
                if recent_exports > 10:
                    await self._log_security_event(
                        ThreatType.DATA_EXFILTRATION,
                        SecurityLevel.MEDIUM,
                        user_id=user_id,
                        session_id=session.id,
                        workspace_id=workspace_id,
                        details={
                            'operation': operation,
                            'recent_exports': recent_exports
                        }
                    )
                    # Throttle but don't block completely
                    await asyncio.sleep(2)  # Add delay

            return True

        except Exception as e:
            logger.error(f"Data exfiltration detection error: {e}")
            return True  # Don't block on detection errors

    async def validate_tool_execution_security(
        self,
        user_id: str,
        workspace_id: str,
        tool_id: str,
        tool_params: Dict[str, Any],
        session: SimSession
    ) -> bool:
        """
        Validate security for tool execution requests.

        Args:
            user_id: User executing tool
            workspace_id: Workspace context
            tool_id: Tool being executed
            tool_params: Tool parameters
            session: Authenticated session

        Returns:
            True if execution is secure, False if blocked
        """
        try:
            # Check for dangerous parameter patterns
            if self._contains_dangerous_patterns(tool_params):
                await self._log_security_event(
                    ThreatType.UNAUTHORIZED_TOOL_ACCESS,
                    SecurityLevel.HIGH,
                    user_id=user_id,
                    session_id=session.id,
                    workspace_id=workspace_id,
                    details={
                        'tool_id': tool_id,
                        'reason': 'dangerous_parameters',
                        'params': self._sanitize_params_for_logging(tool_params)
                    }
                )
                return False

            # Check for rapid tool execution (potential automation)
            recent_executions = await self._count_recent_tool_executions(user_id, tool_id)
            if recent_executions > 20:  # More than 20 executions of same tool in short time
                await self._log_security_event(
                    ThreatType.SUSPICIOUS_PATTERN,
                    SecurityLevel.MEDIUM,
                    user_id=user_id,
                    session_id=session.id,
                    workspace_id=workspace_id,
                    details={
                        'tool_id': tool_id,
                        'recent_executions': recent_executions,
                        'reason': 'rapid_tool_execution'
                    }
                )
                # Throttle execution
                await asyncio.sleep(1)

            return True

        except Exception as e:
            logger.error(f"Tool execution security validation error: {e}")
            return True  # Don't block on validation errors

    async def get_security_dashboard(
        self,
        workspace_id: Optional[str] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get security dashboard data for monitoring.

        Args:
            workspace_id: Optional workspace filter
            hours: Time window in hours

        Returns:
            Dictionary containing security metrics and events
        """
        try:
            since = datetime.now() - timedelta(hours=hours)

            # Filter events by time and workspace
            filtered_events = [
                event for event in self._security_events
                if event.timestamp > since and
                (not workspace_id or event.workspace_id == workspace_id)
            ]

            # Aggregate statistics
            threat_counts = defaultdict(int)
            severity_counts = defaultdict(int)
            user_counts = defaultdict(int)

            for event in filtered_events:
                threat_counts[event.threat_type.value] += 1
                severity_counts[event.security_level.value] += 1
                if event.user_id:
                    user_counts[event.user_id] += 1

            # Get active blocks
            current_time = datetime.now()
            active_ip_blocks = {
                ip: block_time for ip, block_time in self._blocked_ips.items()
                if current_time < block_time + self.block_duration
            }
            active_user_blocks = {
                user: block_time for user, block_time in self._blocked_users.items()
                if current_time < block_time + self.block_duration
            }

            return {
                'time_window': f"{hours} hours",
                'total_events': len(filtered_events),
                'threat_distribution': dict(threat_counts),
                'severity_distribution': dict(severity_counts),
                'top_users_by_events': dict(sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
                'active_ip_blocks': len(active_ip_blocks),
                'active_user_blocks': len(active_user_blocks),
                'recent_critical_events': [
                    {
                        'event_id': event.event_id,
                        'timestamp': event.timestamp.isoformat(),
                        'threat_type': event.threat_type.value,
                        'user_id': event.user_id,
                        'details': event.details
                    }
                    for event in filtered_events
                    if event.security_level == SecurityLevel.CRITICAL
                ][-10:]  # Last 10 critical events
            }

        except Exception as e:
            logger.error(f"Error generating security dashboard: {e}")
            return {'error': str(e)}

    async def cleanup_security_data(self):
        """Clean up old security data and expired blocks."""
        current_time = datetime.now()

        # Remove expired IP blocks
        expired_ip_blocks = [
            ip for ip, block_time in self._blocked_ips.items()
            if current_time > block_time + self.block_duration
        ]
        for ip in expired_ip_blocks:
            del self._blocked_ips[ip]

        # Remove expired user blocks
        expired_user_blocks = [
            user for user, block_time in self._blocked_users.items()
            if current_time > block_time + self.block_duration
        ]
        for user in expired_user_blocks:
            del self._blocked_users[user]

        # Clean up old access patterns
        expired_patterns = [
            user_id for user_id, pattern in self._access_patterns.items()
            if current_time - pattern.last_updated > timedelta(hours=24)
        ]
        for user_id in expired_patterns:
            del self._access_patterns[user_id]

        # Clean up old session security data
        expired_sessions = [
            session_id for session_id, data in self._session_security.items()
            if current_time - data.get('last_seen', current_time) > timedelta(hours=2)
        ]
        for session_id in expired_sessions:
            del self._session_security[session_id]

        if expired_ip_blocks or expired_user_blocks or expired_patterns or expired_sessions:
            logger.info(
                f"Security cleanup: {len(expired_ip_blocks)} IP blocks, "
                f"{len(expired_user_blocks)} user blocks, {len(expired_patterns)} patterns, "
                f"{len(expired_sessions)} session data entries"
            )

    # Private helper methods

    async def _log_security_event(
        self,
        threat_type: ThreatType,
        security_level: SecurityLevel,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log a security event."""
        event = SecurityEvent(
            event_id=f"sec_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(),
            threat_type=threat_type,
            security_level=security_level,
            user_id=user_id,
            session_id=session_id,
            workspace_id=workspace_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )

        self._security_events.append(event)
        self._event_counts[threat_type] += 1

        # Determine response actions
        response_actions = await self._determine_response_actions(event)
        event.response_actions = response_actions

        # Execute response actions
        await self._execute_response_actions(event)

        # Log to system logger
        log_level = {
            SecurityLevel.LOW: logging.INFO,
            SecurityLevel.MEDIUM: logging.WARNING,
            SecurityLevel.HIGH: logging.ERROR,
            SecurityLevel.CRITICAL: logging.CRITICAL
        }.get(security_level, logging.WARNING)

        logger.log(log_level, f"Security Event: {event.threat_type.value} - {event.details}")

    async def _determine_response_actions(self, event: SecurityEvent) -> List[ResponseAction]:
        """Determine appropriate response actions for a security event."""
        actions = [ResponseAction.LOG_ONLY]

        if event.security_level == SecurityLevel.CRITICAL:
            actions.extend([
                ResponseAction.INVALIDATE_SESSION,
                ResponseAction.TEMPORARY_BLOCK,
                ResponseAction.ALERT_ADMIN
            ])
        elif event.security_level == SecurityLevel.HIGH:
            actions.extend([
                ResponseAction.THROTTLE,
                ResponseAction.ALERT_ADMIN
            ])
            # Check for repeated violations
            recent_events = [
                e for e in self._security_events
                if e.user_id == event.user_id and
                e.timestamp > datetime.now() - timedelta(hours=1) and
                e.security_level in [SecurityLevel.HIGH, SecurityLevel.CRITICAL]
            ]
            if len(recent_events) > 3:
                actions.append(ResponseAction.TEMPORARY_BLOCK)
        elif event.security_level == SecurityLevel.MEDIUM:
            actions.append(ResponseAction.THROTTLE)

        return actions

    async def _execute_response_actions(self, event: SecurityEvent):
        """Execute response actions for a security event."""
        for action in event.response_actions:
            if action == ResponseAction.TEMPORARY_BLOCK:
                if event.user_id:
                    self._blocked_users[event.user_id] = event.timestamp
                if event.ip_address:
                    self._blocked_ips[event.ip_address] = event.timestamp
            elif action == ResponseAction.INVALIDATE_SESSION:
                if event.session_id:
                    # Mark session for invalidation
                    await self._invalidate_session(event.session_id)
            elif action == ResponseAction.ALERT_ADMIN:
                # Send alert to administrators
                await self._send_security_alert(event)

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to client host
        if request.client:
            return request.client.host

        return "unknown"

    def _is_blocked(self, ip_address: str, user_id: str) -> bool:
        """Check if IP or user is currently blocked."""
        current_time = datetime.now()

        # Check IP block
        if ip_address in self._blocked_ips:
            block_time = self._blocked_ips[ip_address]
            if current_time < block_time + self.block_duration:
                return True
            else:
                del self._blocked_ips[ip_address]

        # Check user block
        if user_id in self._blocked_users:
            block_time = self._blocked_users[user_id]
            if current_time < block_time + self.block_duration:
                return True
            else:
                del self._blocked_users[user_id]

        return False

    async def _check_rate_limits(self, user_id: str, ip_address: str) -> bool:
        """Check rate limits for user and IP."""
        current_time = datetime.now()
        window_start = current_time - self.rate_limit_window

        # Check user rate limit
        user_key = f"user:{user_id}"
        user_requests = self._rate_limits[user_key]

        # Remove old requests
        while user_requests and user_requests[0] < window_start:
            user_requests.popleft()

        if len(user_requests) >= self.rate_limit_requests_per_minute:
            return False

        # Check IP rate limit
        ip_key = f"ip:{ip_address}"
        ip_requests = self._rate_limits[ip_key]

        # Remove old requests
        while ip_requests and ip_requests[0] < window_start:
            ip_requests.popleft()

        if len(ip_requests) >= self.rate_limit_requests_per_minute * 2:  # Higher limit for IP
            return False

        # Add current request
        user_requests.append(current_time)
        ip_requests.append(current_time)

        return True

    async def _apply_temporary_block(self, user_id: str, ip_address: str):
        """Apply temporary block to user and IP."""
        current_time = datetime.now()
        self._blocked_users[user_id] = current_time
        self._blocked_ips[ip_address] = current_time

        logger.warning(f"Applied temporary block to user {user_id} and IP {ip_address}")

    async def _validate_session_security(
        self,
        session: SimSession,
        ip_address: str,
        user_agent: str
    ) -> bool:
        """Validate session security properties."""
        session_id = session.id

        if session_id not in self._session_security:
            # First time seeing this session
            self._session_security[session_id] = {
                'first_ip': ip_address,
                'first_user_agent': user_agent,
                'ip_addresses': {ip_address},
                'user_agents': {user_agent},
                'last_seen': datetime.now()
            }
            return True

        session_data = self._session_security[session_id]
        session_data['last_seen'] = datetime.now()

        # Check for IP address changes
        if ip_address not in session_data['ip_addresses']:
            session_data['ip_addresses'].add(ip_address)
            # Allow up to 2 different IPs (mobile switching)
            if len(session_data['ip_addresses']) > 2:
                return False

        # Check for user agent changes
        if user_agent != session_data['first_user_agent']:
            session_data['user_agents'].add(user_agent)
            # Don't allow user agent changes (potential hijacking)
            if len(session_data['user_agents']) > 1:
                return False

        return True

    async def _detect_cross_workspace_anomaly(
        self,
        user_id: str,
        workspace_id: str,
        resource_type: str,
        resource_id: str
    ) -> bool:
        """Detect anomalous cross-workspace access patterns."""
        if user_id not in self._access_patterns:
            return False

        pattern = self._access_patterns[user_id]

        # Check for rapid workspace switching
        if len(pattern.workspace_accesses) > 3:
            recent_workspaces = set()
            recent_time = datetime.now() - timedelta(minutes=5)
            for timestamp in pattern.time_patterns:
                if timestamp > recent_time:
                    recent_workspaces.add(workspace_id)

            if len(recent_workspaces) > 3:
                return True

        return pattern.is_suspicious

    async def _update_access_patterns(
        self,
        user_id: str,
        workspace_id: str,
        resource_type: str,
        ip_address: str,
        user_agent: str
    ):
        """Update user access patterns for anomaly detection."""
        if user_id not in self._access_patterns:
            self._access_patterns[user_id] = AccessPattern(user_id=user_id)

        pattern = self._access_patterns[user_id]
        pattern.workspace_accesses[workspace_id] = pattern.workspace_accesses.get(workspace_id, 0) + 1
        pattern.resource_accesses[resource_type] = pattern.resource_accesses.get(resource_type, 0) + 1
        pattern.time_patterns.append(datetime.now())
        pattern.ip_addresses.add(ip_address)
        pattern.user_agents.add(user_agent)
        pattern.last_updated = datetime.now()

        # Keep only recent time patterns
        recent_time = datetime.now() - timedelta(hours=1)
        pattern.time_patterns = [t for t in pattern.time_patterns if t > recent_time]

    async def _increase_monitoring_level(self, user_id: str):
        """Increase monitoring level for a user."""
        # This could implement more sophisticated monitoring
        logger.info(f"Increased monitoring level for user {user_id}")

    async def _count_recent_large_accesses(self, user_id: str) -> int:
        """Count recent large data accesses by user."""
        # This would query access logs or use in-memory tracking
        return 0  # Placeholder implementation

    async def _count_recent_exports(self, user_id: str) -> int:
        """Count recent export operations by user."""
        # This would query operation logs
        return 0  # Placeholder implementation

    async def _count_recent_tool_executions(self, user_id: str, tool_id: str) -> int:
        """Count recent tool executions by user."""
        # This would query execution logs
        return 0  # Placeholder implementation

    def _contains_dangerous_patterns(self, tool_params: Dict[str, Any]) -> bool:
        """Check if tool parameters contain dangerous patterns."""
        dangerous_patterns = [
            "rm -rf", "DROP TABLE", "DELETE FROM", "../", "cmd.exe",
            "powershell", "bash", "sh", "/etc/passwd", "sudo"
        ]

        param_str = str(tool_params).lower()
        return any(pattern.lower() in param_str for pattern in dangerous_patterns)

    def _sanitize_params_for_logging(self, tool_params: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize parameters for safe logging."""
        # Remove sensitive data and truncate long values
        sanitized = {}
        for key, value in tool_params.items():
            if key.lower() in ['password', 'token', 'secret', 'key']:
                sanitized[key] = "***REDACTED***"
            elif isinstance(value, str) and len(value) > 100:
                sanitized[key] = value[:97] + "..."
            else:
                sanitized[key] = value
        return sanitized

    async def _invalidate_session(self, session_id: str):
        """Mark session for invalidation."""
        # This would integrate with the session management system
        logger.warning(f"Session {session_id} marked for invalidation due to security violation")

    async def _send_security_alert(self, event: SecurityEvent):
        """Send security alert to administrators."""
        # This would integrate with alerting systems (email, Slack, etc.)
        logger.critical(f"Security Alert: {event.threat_type.value} - {event.details}")


# Middleware for automatic security monitoring
class SecurityMiddleware:
    """Middleware for automatic security monitoring of all requests."""

    def __init__(self, security_monitor: SecurityMonitor):
        self.security_monitor = security_monitor

    async def __call__(self, request: Request, call_next):
        """Process request with security monitoring."""
        start_time = datetime.now()

        # Extract request information
        client_ip = self.security_monitor._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        # Get user information if available
        user_id = None
        session_id = None
        workspace_id = None

        if hasattr(request.state, 'session'):
            session = request.state.session
            user_id = session.user.id
            session_id = session.id

        if hasattr(request.state, 'workspace_id'):
            workspace_id = request.state.workspace_id

        try:
            response = await call_next(request)

            # Log successful request for pattern analysis
            if user_id:
                await self.security_monitor._update_access_patterns(
                    user_id, workspace_id or "unknown", "api_request", client_ip, user_agent
                )

            return response

        except Exception as e:
            # Log security-relevant errors
            if "403" in str(e) or "401" in str(e):
                await self.security_monitor._log_security_event(
                    ThreatType.SUSPICIOUS_PATTERN,
                    SecurityLevel.MEDIUM,
                    user_id=user_id,
                    session_id=session_id,
                    workspace_id=workspace_id,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    details={
                        'error': str(e),
                        'path': str(request.url.path),
                        'method': request.method
                    }
                )
            raise